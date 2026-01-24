import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { ensureDir } from "./util.js";
import { renderStoryboardVideo } from "../packages/renderer/src/storyboard-render.js";
import type { ScriptData } from "../packages/shared/src/video.js";
import type { TimelineData } from "../packages/shared/src/timeline.js";

type WorkerJobVersion = 1;
export type WorkerJobKind = "render-storyboard";

export type WorkerJob = {
  version: WorkerJobVersion;
  kind: WorkerJobKind;
  meta?: {
    jobId?: string;
    createdAt?: string;
    source?: string;
  };
  input: WorkerRenderInput;
};

export type WorkerRenderInput = {
  scriptPath: string;
  timelinePath?: string | null;
  audioPath?: string | null;
  framesDir: string;
  outputPath: string;
  options?: WorkerRenderOptions;
};

export type WorkerRenderOptions = {
  title?: string | null;
  subtitle?: string | null;
  fps?: number;
  width?: number;
  height?: number;
  durationFrames?: number;
  startFrame?: number;
  endFrame?: number;
  framePattern?: string;
  deviceScaleFactor?: number;
  workers?: number;
  ffmpegPath?: string;
  ffmpegArgs?: string[];
};

export type WorkerJobResult = {
  jobId?: string;
  kind: WorkerJobKind;
  status: "succeeded" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  outputPath?: string;
  framesDir?: string;
  error?: string;
};

type ResolvedRenderInput = {
  scriptPath: string;
  timelinePath?: string | null;
  audioPath?: string | null;
  framesDir: string;
  outputPath: string;
  options: WorkerRenderOptions;
};

type RunWorkerOptions = {
  baseDir: string;
  dryRun?: boolean;
  log?: (message: string) => void;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
};

const parseJob = (value: unknown): WorkerJob => {
  if (!isObject(value)) {
    throw new Error("Worker job must be a JSON object");
  }
  const version = value.version;
  if (version !== 1) {
    throw new Error(`Worker job version must be 1`);
  }
  const kind = value.kind;
  if (kind !== "render-storyboard") {
    throw new Error(`Unsupported worker job kind: ${String(kind)}`);
  }
  const input = value.input;
  if (!isObject(input)) {
    throw new Error("Worker job input must be an object");
  }
  const meta = isObject(value.meta) ? (value.meta as WorkerJob["meta"]) : undefined;
  return {
    version: 1,
    kind,
    meta,
    input: {
      scriptPath: requireString(input.scriptPath, "input.scriptPath"),
      timelinePath: typeof input.timelinePath === "string" ? input.timelinePath : input.timelinePath ?? null,
      audioPath: typeof input.audioPath === "string" ? input.audioPath : input.audioPath ?? null,
      framesDir: requireString(input.framesDir, "input.framesDir"),
      outputPath: requireString(input.outputPath, "input.outputPath"),
      options: isObject(input.options) ? (input.options as WorkerRenderOptions) : undefined,
    },
  };
};

export const readWorkerJob = (jobPath: string): WorkerJob => {
  const raw = readFileSync(jobPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Invalid worker job JSON: ${message}`);
  }
  return parseJob(parsed);
};

const resolveRenderInput = (input: WorkerRenderInput, baseDir: string): ResolvedRenderInput => {
  const resolvePath = (value: string) => resolve(baseDir, value);
  return {
    scriptPath: resolvePath(input.scriptPath),
    timelinePath: input.timelinePath ? resolvePath(input.timelinePath) : null,
    audioPath: input.audioPath ? resolvePath(input.audioPath) : null,
    framesDir: resolvePath(input.framesDir),
    outputPath: resolvePath(input.outputPath),
    options: input.options ?? {},
  };
};

const readJsonFile = <T>(path: string, label: string): T => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
};

const ensureInputExists = (path: string, label: string) => {
  if (!existsSync(path)) {
    throw new Error(`${label} not found: ${path}`);
  }
};

export const runWorkerJob = async (job: WorkerJob, opts: RunWorkerOptions): Promise<WorkerJobResult> => {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const log = opts.log;
  const resolved = resolveRenderInput(job.input, opts.baseDir);

  const finish = (status: WorkerJobResult["status"], error?: string): WorkerJobResult => {
    const finishedAt = new Date().toISOString();
    return {
      jobId: job.meta?.jobId,
      kind: job.kind,
      status,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedAtMs,
      outputPath: resolved.outputPath,
      framesDir: resolved.framesDir,
      ...(error ? { error } : {}),
    };
  };

  try {
    ensureInputExists(resolved.scriptPath, "scriptPath");
    if (resolved.timelinePath) {
      ensureInputExists(resolved.timelinePath, "timelinePath");
    }
    if (resolved.audioPath) {
      ensureInputExists(resolved.audioPath, "audioPath");
    }

    if (opts.dryRun) {
      log?.("dry-run: validated inputs");
      return finish("skipped");
    }

    ensureDir(dirname(resolved.outputPath));
    ensureDir(resolved.framesDir);

    const script = readJsonFile<ScriptData>(resolved.scriptPath, "scriptPath");
    const timeline = resolved.timelinePath
      ? readJsonFile<TimelineData>(resolved.timelinePath, "timelinePath")
      : null;

    log?.("render: storyboard video");
    await renderStoryboardVideo({
      script,
      timeline,
      title: resolved.options.title ?? undefined,
      subtitle: resolved.options.subtitle ?? undefined,
      framesDir: resolved.framesDir,
      outputPath: resolved.outputPath,
      audioPath: resolved.audioPath,
      framePattern: resolved.options.framePattern,
      startFrame: resolved.options.startFrame,
      endFrame: resolved.options.endFrame,
      deviceScaleFactor: resolved.options.deviceScaleFactor,
      workers: resolved.options.workers,
      ffmpegPath: resolved.options.ffmpegPath,
      ffmpegArgs: resolved.options.ffmpegArgs,
      fps: resolved.options.fps,
      width: resolved.options.width,
      height: resolved.options.height,
      durationFrames: resolved.options.durationFrames,
    });

    return finish("succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return finish("failed", message);
  }
};
