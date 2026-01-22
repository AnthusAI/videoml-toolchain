import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getEnvironmentFallbackChain, resolveEnvCacheDir } from "./env.js";

export function loadManifest(manifestPath: string): Record<string, unknown> {
  if (!existsSync(manifestPath)) {
    return {};
  }
  try {
    const text = readFileSync(manifestPath, "utf-8");
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return {};
    }
    return obj as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getManifestDuration(
  manifest: Record<string, unknown>,
  section: string,
  path: string,
  expectedKey: string,
): number | null {
  const sec = manifest[section];
  if (!sec || typeof sec !== "object" || Array.isArray(sec)) {
    return null;
  }
  const map = sec as Record<string, unknown>;
  let entry = map[path];
  if (!entry) {
    const targetName = path.split("/").pop();
    if (targetName) {
      for (const [key, val] of Object.entries(map)) {
        if (key.split("/").pop() === targetName) {
          entry = val;
          break;
        }
      }
    }
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }
  const entryObj = entry as Record<string, unknown>;
  if (entryObj.key !== expectedKey) {
    return null;
  }
  const dur = entryObj.durationSec;
  if (typeof dur !== "number") {
    return null;
  }
  return dur;
}

export function resolveCachedAudio(
  outDir: string,
  currentEnv: string,
  cacheKey: string,
  kind: "segments" | "sfx" | "music",
  filePattern: string,
  log?: (msg: string) => void,
): { path: string | null; env: string | null } {
  const _log = log ?? (() => {});
  const chain = getEnvironmentFallbackChain(currentEnv);
  for (const env of chain) {
    const envDir = resolveEnvCacheDir(outDir, env);
    const manifestPath = join(envDir, "manifest.json");
    const manifest = loadManifest(manifestPath);
    const kindDir = join(envDir, kind);
    if (!existsSync(kindDir)) {
      continue;
    }
    const matches = globSync(kindDir, filePattern);
    for (const candidate of matches) {
      const duration = getManifestDuration(manifest, kind, candidate, cacheKey);
      if (duration != null) {
        if (env !== currentEnv) {
          _log(`cache: fallback ${kind}=${candidate.split("/").pop()} from env=${env}`);
        }
        return { path: candidate, env };
      }
    }
  }
  return { path: null, env: null };
}

export function resolveCachedSegment(
  outDir: string,
  currentEnv: string,
  cacheKey: string,
  sceneId: string,
  cueId: string,
  occurrence: number,
  extension: string,
  log?: (msg: string) => void,
): { path: string | null; env: string | null } {
  const hashPrefix = cacheKey.slice(0, 12);
  const pattern = `${sceneId}--${cueId}--tts--${hashPrefix}--${occurrence}${extension}`;
  return resolveCachedAudio(outDir, currentEnv, cacheKey, "segments", pattern, log);
}

export function resolveCachedSfx(
  outDir: string,
  currentEnv: string,
  cacheKey: string,
  clipId: string,
  variant: number,
  extension: string,
  log?: (msg: string) => void,
): { path: string | null; env: string | null } {
  const hashPrefix = cacheKey.slice(0, 12);
  const pattern = `${clipId}--v${variant + 1}--${hashPrefix}${extension}`;
  return resolveCachedAudio(outDir, currentEnv, cacheKey, "sfx", pattern, log);
}

export function resolveCachedMusic(
  outDir: string,
  currentEnv: string,
  cacheKey: string,
  clipId: string,
  variant: number,
  extension: string,
  log?: (msg: string) => void,
): { path: string | null; env: string | null } {
  const hashPrefix = cacheKey.slice(0, 12);
  const pattern = `${clipId}--v${variant + 1}--${hashPrefix}${extension}`;
  return resolveCachedAudio(outDir, currentEnv, cacheKey, "music", pattern, log);
}

function globSync(dir: string, pattern: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const regex = globToRegex(pattern);
  return entries
    .filter((ent) => ent.isFile() && regex.test(ent.name))
    .map((ent) => join(dir, ent.name));
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  const regex = "^" + escaped.replace(/\*/g, ".*") + "$";
  return new RegExp(regex);
}
