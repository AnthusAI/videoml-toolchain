#!/usr/bin/env tsx

import { Command } from "commander";
import { existsSync, statSync, rmSync, readdirSync } from "fs";
import { dirname, join, resolve, sep } from "path";
import { loadVideoFile } from "./dsl/load.js";
import { generateComposition } from "./generate.js";
import { loadConfig, findProjectRoot } from "./config.js";
import { BabulusError } from "./errors.js";
import { loadSelections, bumpPick, setPick, archiveVariants, restoreVariants, clearLiveVariants } from "./sfx-workflow.js";
import { getEnvironment } from "./env.js";
import { probeDurationSec, probeVolumeDb, isAudioAllSilence } from "./media.js";
import chokidar from "chokidar";
import type { CompositionSpec } from "./dsl/types.js";

const program = new Command();
program.name("babulus").description("Babulus TypeScript CLI");

program
  .command("generate")
  .argument("[dsl]", "Path to .babulus.ts file or directory")
  .option("--script-out <path>", "Output script JSON path")
  .option("--timeline-out <path>", "Output timeline JSON path")
  .option("--audio-out <path>", "Output audio path")
  .option("--out-dir <path>", "Intermediate output dir")
  .option("--env <name>", "Set environment for provider selection")
  .option("--environment <name>", "Alias for --env")
  .option("--provider <name>", "Override voiceover.provider")
  .option("--sfx-provider <name>", "Override SFX provider")
  .option("--music-provider <name>", "Override music provider")
  .option("--seed <number>", "Override voiceover.seed", (v) => Number(v))
  .option("--fresh", "Force regeneration of all audio", false)
  .option("--watch", "Watch DSL file(s) and re-run generation", false)
  .option("--quiet", "Suppress normal progress output", false)
  .option("--project-dir <path>", "Project root directory (prefix for outputs)")
  .action(async (dslArg: string | undefined, opts) => {
    const envArg = opts.env ?? opts.environment;
    if (envArg) {
      process.env.BABULUS_ENV = envArg;
    }

    const cwd = process.cwd();
    const projectDir = opts.projectDir ? resolve(cwd, opts.projectDir) : undefined;

    const dslPaths = resolveDslPaths(dslArg, cwd);
    if (opts.watch && (opts.scriptOut || opts.timelineOut || opts.audioOut || opts.outDir) && dslPaths.length !== 1) {
      throw new BabulusError("When using --watch with multiple DSLs, omit explicit output overrides.");
    }

    const runs = await loadCompositions(dslPaths);
    const totalComps = runs.reduce((sum, r) => sum + r.compositions.length, 0);
    if ((opts.scriptOut || opts.timelineOut || opts.audioOut || opts.outDir) && totalComps !== 1) {
      throw new BabulusError("Output overrides require a single composition.");
    }

    const config = loadConfig(projectDir, dslPaths[0]);

    const runOnce = async (dslSubset?: string[]) => {
      for (const run of runs) {
        if (dslSubset && !dslSubset.includes(run.path)) {
          continue;
        }
        for (const comp of run.compositions) {
          const { scriptOut, timelineOut, audioOut, outDir } = defaultsForComposition(comp.id, run.path, projectDir, opts);
          const logger = opts.quiet ? undefined : (msg: string) => {
            const ts = new Date().toLocaleTimeString();
            console.error(`[${ts}] ${comp.id}: ${msg}`);
          };
          await generateComposition({
            composition: comp,
            dslPath: run.path,
            scriptOut,
            timelineOut,
            audioOut,
            outDir,
            config,
            providerOverride: opts.provider ?? null,
            sfxProviderOverride: opts.sfxProvider ?? null,
            musicProviderOverride: opts.musicProvider ?? null,
            seedOverride: opts.seed ?? null,
            fresh: Boolean(opts.fresh),
            log: logger,
            verboseLogs: !opts.quiet,
          });
        }
      }
    };

    if (!opts.watch) {
      await runOnce();
      return;
    }

    const configPath = findConfigPathForWatch(projectDir, dslPaths[0]);
    
    // Instead of watching specific files, we watch the directories containing them.
    // This is more robust against atomic writes and editors that replace files.
    const dslDirs = Array.from(new Set(dslPaths.map((p) => dirname(p))));
    const watchDirs = [...dslDirs];
    if (configPath) {
      watchDirs.push(dirname(configPath));
    }

    const watcher = chokidar.watch(watchDirs, { 
      ignoreInitial: true,
      usePolling: true, // Force polling to ensure changes are detected in all environments
      interval: 500,    // Poll every 500ms
      binaryInterval: 1000,
      // Ensure we don't watch node_modules or output directories if they happen to be in the same tree
      ignored: ["**/node_modules/**", "**/.git/**", "**/.babulus/out/**", "**/dist/**"] 
    });
    
    console.error("Watching for changes... (Ctrl+C to stop)\n");
    if (!opts.quiet) {
      console.error(`Watching directories:\n${watchDirs.map(d => `  - ${d}`).join('\n')}\n`);
    }

    watcher.on("all", async (_event, changedPath) => {
      // Resolve absolute path to ensure matching works
      const absChanged = resolve(cwd, changedPath);
      const rel = absChanged.startsWith(cwd) ? absChanged.slice(cwd.length + 1) : absChanged;

      // Filter: Only care about .ts files, .yml/.yaml (config), or specific known files
      if (!absChanged.endsWith(".ts") && !absChanged.endsWith(".yml") && !absChanged.endsWith(".yaml")) {
        return;
      }

      // Check if it's the config file
      if (configPath && absChanged === configPath) {
        console.error(`\nCHANGE DETECTED (Config): ${rel}`);
        console.error("Regenerating all compositions...");
        await runOnce();
        console.error("\nWaiting for changes... (Ctrl+C to stop)\n");
        return;
      }

      // Check if it's one of our DSL files
      const dslMatch = dslPaths.find((p) => p === absChanged);
      if (dslMatch) {
        console.error(`\nCHANGE DETECTED (DSL): ${rel}`);
        await runOnce([dslMatch]);
        console.error("\nWaiting for changes... (Ctrl+C to stop)\n");
        return;
      }

      // Check if it's a shared/imported file in one of our DSL directories
      // We assume any other .ts file in these directories is a potential dependency
      const isInDslDir = dslDirs.some(dir => absChanged.startsWith(dir + sep)); // Use path.sep for cross-platform safety
      if (isInDslDir && absChanged.endsWith(".ts")) {
        console.error(`\nCHANGE DETECTED (Shared): ${rel}`);
        console.error("Shared file changed; regenerating all compositions...");
        await runOnce();
        console.error("\nWaiting for changes... (Ctrl+C to stop)\n");
        return;
      }
    });
  });

program
  .command("clean")
  .argument("[dsl]", "Path to .babulus.ts file or directory")
  .option("--env <name>", "Environment to clean")
  .option("--only-voice", "Only clean voice/TTS segments", false)
  .option("--only-sfx", "Only clean SFX", false)
  .option("--only-music", "Only clean music", false)
  .option("--yes", "Actually delete files", false)
  .option("--project-dir <path>", "Project root directory (prefix for outputs)")
  .action(async (dslArg: string | undefined, opts) => {
    const cwd = process.cwd();
    const projectDir = opts.projectDir ? resolve(cwd, opts.projectDir) : undefined;
    const dslPaths = resolveDslPaths(dslArg, cwd);
    const env = opts.env ?? getEnvironment();

    const runs = await loadCompositions(dslPaths);
    const toDelete: string[] = [];
    for (const run of runs) {
      for (const comp of run.compositions) {
        const { scriptOut, timelineOut, audioOut, outDir } = defaultsForComposition(comp.id, run.path, projectDir, {});
        const envDir = join(outDir, "env", env);
        if (opts.onlyVoice) {
          toDelete.push(join(envDir, "segments"));
          toDelete.push(join(envDir, "segments_trimmed"));
          toDelete.push(join(publicRoot(projectDir), "babulus", comp.id, "segments"));
        } else if (opts.onlySfx || opts.onlyMusic) {
          if (opts.onlySfx) {
            toDelete.push(join(envDir, "sfx"));
            toDelete.push(join(envDir, "sfx_archived"));
            toDelete.push(join(publicRoot(projectDir), "babulus", "sfx"));
          }
          if (opts.onlyMusic) {
            toDelete.push(join(envDir, "music"));
            toDelete.push(join(publicRoot(projectDir), "babulus", "music"));
          }
        } else {
          toDelete.push(scriptOut, timelineOut, audioOut, envDir, join(publicRoot(projectDir), "babulus", comp.id));
        }
      }
    }

    const unique = Array.from(new Set(toDelete.filter(Boolean)));
    if (!opts.yes) {
      console.error(`babulus clean (dry-run, env=${env}): would delete:`);
      for (const p of unique) {
        console.error(`- ${p}`);
      }
      console.error("Run again with --yes to delete.");
      return;
    }

    for (const p of unique) {
      if (!p || !existsSync(p)) {
        continue;
      }
      const stat = statSync(p);
      if (stat.isDirectory()) {
        rmSync(p, { recursive: true, force: true });
      } else {
        rmSync(p, { force: true });
      }
    }
    console.error(`Deleted ${unique.length} path(s) from env=${env}.`);
  });

const sfx = program.command("sfx").description("Manage SFX variants and picks");

sfx
  .command("list")
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { dslPath, outDir } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const state = loadSelections(outDir);
    if (!Object.keys(state.picks).length) {
      console.error(`No SFX picks set yet (out-dir: ${outDir}).`);
      return;
    }
    for (const [clipId, pick] of Object.entries(state.picks)) {
      console.error(`${clipId}: pick=${pick}`);
    }
  });

sfx
  .command("next")
  .requiredOption("--clip <id>", "SFX clip id")
  .requiredOption("--variants <n>", "Number of variants", (v) => Number(v))
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--apply", "Run generate after changing pick", false)
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { outDir, dslPath } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const newPick = bumpPick(outDir, opts.clip, 1, opts.variants);
    console.error(`${opts.clip}: pick=${newPick}`);
    if (opts.apply) {
      await runGenerateForDsl(dslPath, opts.projectDir);
    }
  });

sfx
  .command("prev")
  .requiredOption("--clip <id>", "SFX clip id")
  .requiredOption("--variants <n>", "Number of variants", (v) => Number(v))
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--apply", "Run generate after changing pick", false)
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { outDir, dslPath } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const newPick = bumpPick(outDir, opts.clip, -1, opts.variants);
    console.error(`${opts.clip}: pick=${newPick}`);
    if (opts.apply) {
      await runGenerateForDsl(dslPath, opts.projectDir);
    }
  });

sfx
  .command("set")
  .requiredOption("--clip <id>", "SFX clip id")
  .requiredOption("--pick <n>", "Variant index", (v) => Number(v))
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--apply", "Run generate after changing pick", false)
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { outDir, dslPath } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const newPick = setPick(outDir, opts.clip, opts.pick);
    console.error(`${opts.clip}: pick=${newPick}`);
    if (opts.apply) {
      await runGenerateForDsl(dslPath, opts.projectDir);
    }
  });

sfx
  .command("archive")
  .requiredOption("--clip <id>", "SFX clip id")
  .option("--keep-pick", "Keep the currently-selected pick", false)
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { outDir } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const state = loadSelections(outDir);
    const keepVariant = opts.keepPick ? state.picks[opts.clip] ?? 0 : null;
    const moved = archiveVariants(outDir, opts.clip, keepVariant);
    console.error(`${opts.clip}: archived_files=${moved}`);
  });

sfx
  .command("restore")
  .requiredOption("--clip <id>", "SFX clip id")
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { outDir } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const moved = restoreVariants(outDir, opts.clip);
    console.error(`${opts.clip}: restored_files=${moved}`);
  });

sfx
  .command("clear")
  .requiredOption("--clip <id>", "SFX clip id")
  .option("--dsl <path>", "Path to .babulus.ts file")
  .option("--out-dir <path>", "Override output dir")
  .option("--project-dir <path>", "Project root directory")
  .action(async (opts) => {
    const { outDir } = await resolveSingleDsl(opts.dsl, opts.outDir, opts.projectDir);
    const deleted = clearLiveVariants(outDir, opts.clip);
    console.error(`${opts.clip}: deleted_files=${deleted}`);
  });

program
  .command("inspect-audio")
  .requiredOption("--path <path>", "Path to an audio file")
  .option("--sample-rate-hz <n>", "Decode sample rate", (v) => Number(v), 44100)
  .action((opts) => {
    const path = resolve(opts.path);
    if (!existsSync(path)) {
      throw new BabulusError(`Audio file not found: ${opts.path}`);
    }
    const dur = probeDurationSec(path);
    const vol = probeVolumeDb(path, Math.min(3, Math.max(0.25, dur)));
    const silence = isAudioAllSilence(path, Math.min(3, Math.max(0.25, dur)), opts.sampleRateHz);
    console.log(JSON.stringify({ path, durationSec: dur, allSilence: silence, ...vol }, null, 2));
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof BabulusError) {
    console.error(err.message);
    process.exit(2);
  }
  console.error(err);
  process.exit(1);
});

function resolveDslPaths(dslArg: string | undefined, cwd: string): string[] {
  if (dslArg) {
    const candidate = resolve(cwd, dslArg);
    if (!existsSync(candidate)) {
      throw new BabulusError(`Path does not exist: ${candidate}`);
    }
    if (statSync(candidate).isFile()) {
      return [candidate];
    }
    return findDslFiles(candidate);
  }
  const auto = discoverProjectDsls(cwd);
  if (auto.length === 0) {
    throw new BabulusError("No .babulus.ts files found. Pass a file or directory path, or create one under ./content/");
  }
  if (auto.length > 1) {
    throw new BabulusError(`Multiple .babulus.ts files found (${auto.length}). Pass a specific file or directory path.`);
  }
  return [auto[0]];
}

function discoverProjectDsls(cwd: string): string[] {
  const contentDir = join(cwd, "content");
  if (existsSync(contentDir)) {
    return findDslFiles(contentDir);
  }
  return findDslFiles(cwd, false);
}

function findDslFiles(root: string, recursive = true): string[] {
  const out: string[] = [];
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        out.push(...findDslFiles(full, true));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".babulus.ts")) {
      out.push(full);
    }
  }
  return out.sort();
}

async function loadCompositions(dslPaths: string[]): Promise<Array<{ path: string; compositions: CompositionSpec[] }>> {
  const runs: Array<{ path: string; compositions: CompositionSpec[] }> = [];
  for (const dslPath of dslPaths) {
    const spec = await loadVideoFile(dslPath);
    runs.push({ path: dslPath, compositions: spec.compositions });
  }
  return runs;
}

function defaultsForComposition(
  compId: string,
  dslPath: string,
  projectDir: string | undefined,
  opts: Record<string, unknown>,
): { scriptOut: string; timelineOut: string; audioOut: string; outDir: string } {
  const root = projectDir ?? findProjectRoot(dslPath);
  const scriptOut = typeof opts.scriptOut === "string"
    ? opts.scriptOut
    : join(root, `src/videos/${compId}/${compId}.script.json`);
  const timelineOut = typeof opts.timelineOut === "string"
    ? opts.timelineOut
    : join(root, `src/videos/${compId}/${compId}.timeline.json`);
  const audioOut = typeof opts.audioOut === "string"
    ? opts.audioOut
    : join(root, `public/babulus/${compId}.wav`);
  const outDir = typeof opts.outDir === "string"
    ? opts.outDir
    : join(root, `.babulus/out/${compId}`);
  return { scriptOut, timelineOut, audioOut, outDir };
}

function publicRoot(projectDir?: string): string {
  return projectDir ? join(projectDir, "public") : join(process.cwd(), "public");
}

async function resolveSingleDsl(dslArg?: string, outDirOverride?: string, projectDirArg?: string): Promise<{ dslPath: string; outDir: string }> {
  const cwd = process.cwd();
  const projectDir = projectDirArg ? resolve(cwd, projectDirArg) : undefined;
  const dslPaths = resolveDslPaths(dslArg, cwd);
  if (dslPaths.length !== 1) {
    throw new BabulusError("Multiple DSL files found. Pass --dsl <path>.");
  }
  const dslPath = dslPaths[0];
  const spec = await loadVideoFile(dslPath);
  if (spec.compositions.length !== 1) {
    throw new BabulusError("SFX commands require a single composition per DSL file.");
  }
  const comp = spec.compositions[0];
  const defaults = defaultsForComposition(comp.id, dslPath, projectDir, {});
  const outDir = outDirOverride ?? defaults.outDir;
  return { dslPath, outDir };
}

async function runGenerateForDsl(dslPath: string, projectDirArg?: string): Promise<void> {
  const cwd = process.cwd();
  const projectDir = projectDirArg ? resolve(cwd, projectDirArg) : undefined;
  const spec = await loadVideoFile(dslPath);
  const config = loadConfig(projectDir, dslPath);
  for (const comp of spec.compositions) {
    const { scriptOut, timelineOut, audioOut, outDir } = defaultsForComposition(comp.id, dslPath, projectDir, {});
    await generateComposition({
      composition: comp,
      dslPath,
      scriptOut,
      timelineOut,
      audioOut,
      outDir,
      config,
      fresh: false,
      verboseLogs: true,
    });
  }
}

function findConfigPathForWatch(projectDir: string | undefined, dslPath: string): string | null {
  try {
    const root = projectDir ?? findProjectRoot(dslPath);
    const local = join(root, ".babulus", "config.yml");
    if (existsSync(local)) {
      return local;
    }
  } catch {
    return null;
  }
  return null;
}
