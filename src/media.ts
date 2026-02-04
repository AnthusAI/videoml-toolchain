import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { join, basename, dirname } from "path";
import { CompileError } from "./errors.js";
import { ensureDir } from "./util.js";
import { concatWavFiles } from "./audio/wav.js";

type SpawnFn = typeof spawnSync;
let spawn = spawnSync;

export function setMediaSpawn(fn?: SpawnFn): void {
  spawn = fn ?? spawnSync;
}

function run(cmd: string, args: string[], opts?: { text?: boolean }): { stdout: Buffer; stderr: Buffer } {
  const res = spawn(cmd, args, {
    encoding: opts?.text ? "utf-8" : "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CompileError(`${cmd} is required but was not found in PATH`);
    }
    throw new CompileError(`${cmd} failed to run`);
  }
  if (res.status !== 0) {
    const stderr = res.stderr instanceof Buffer ? res.stderr.toString("utf-8") : String(res.stderr ?? "");
    throw new CompileError(`${cmd} failed: ${stderr.slice(0, 800)}`);
  }
  return {
    stdout: res.stdout instanceof Buffer ? res.stdout : Buffer.from(String(res.stdout ?? "")),
    stderr: res.stderr instanceof Buffer ? res.stderr : Buffer.from(String(res.stderr ?? "")),
  };
}

export function probeDurationSec(path: string): number {
  const { stdout } = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    path,
  ], { text: true });
  const text = stdout.toString("utf-8");
  try {
    const parsed = JSON.parse(text);
    const dur = Number(parsed?.format?.duration ?? 0);
    return Math.max(0, dur);
  } catch (err) {
    throw new CompileError(`Could not probe duration for: ${path}`);
  }
}

export function probeVolumeDb(path: string, seconds = 3.0): { mean_volume_db: number | null; max_volume_db: number | null } {
  const res = spawn("ffmpeg", [
    "-hide_banner",
    "-v",
    "info",
    "-t",
    String(seconds),
    "-i",
    path,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ], { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CompileError("ffmpeg is required to probe audio volume");
    }
    throw new CompileError("ffmpeg volumedetect failed");
  }
  const stderr = res.stderr ?? "";
  let mean: number | null = null;
  let max: number | null = null;
  for (const line of String(stderr).split("\n")) {
    if (line.includes("mean_volume:")) {
      const match = line.split("mean_volume:")[1]?.split(" dB")[0]?.trim();
      if (match) {
        const v = Number(match);
        if (!Number.isNaN(v)) {
          mean = v;
        }
      }
    }
    if (line.includes("max_volume:")) {
      const match = line.split("max_volume:")[1]?.split(" dB")[0]?.trim();
      if (match) {
        const v = Number(match);
        if (!Number.isNaN(v)) {
          max = v;
        }
      }
    }
  }
  return { mean_volume_db: mean, max_volume_db: max };
}

export function isAudioAllSilence(path: string, seconds = 3.0, sampleRateHz = 44100): boolean {
  const res = spawn("ffmpeg", [
    "-v",
    "error",
    "-t",
    String(seconds),
    "-i",
    path,
    "-ac",
    "1",
    "-ar",
    String(sampleRateHz),
    "-f",
    "s16le",
    "pipe:1",
  ], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CompileError("ffmpeg is required to decode audio");
    }
    throw new CompileError("ffmpeg decode failed");
  }
  const data = res.stdout as Buffer;
  if (!data || data.length === 0) {
    return true;
  }
  for (const byte of data) {
    if (byte !== 0) {
      return false;
    }
  }
  return true;
}

export function audioActivityRatio(
  path: string,
  seconds = 3.0,
  sampleRateHz = 44100,
  amplitudeThreshold = 200,
): number {
  const res = spawn("ffmpeg", [
    "-v",
    "error",
    "-t",
    String(seconds),
    "-i",
    path,
    "-ac",
    "1",
    "-ar",
    String(sampleRateHz),
    "-f",
    "s16le",
    "pipe:1",
  ], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CompileError("ffmpeg is required to decode audio");
    }
    throw new CompileError("ffmpeg decode failed");
  }
  const data = res.stdout as Buffer;
  if (!data || data.length < 2) {
    return 0;
  }
  const total = Math.floor(data.length / 2);
  let active = 0;
  for (let i = 0; i < total; i += 1) {
    const sample = data.readInt16LE(i * 2);
    if (sample >= amplitudeThreshold || sample <= -amplitudeThreshold) {
      active += 1;
    }
  }
  return total ? active / total : 0;
}

export function trimAudioToDuration(
  inputPath: string,
  outputPath: string,
  durationSec: number,
  sampleRateHz = 44100,
): void {
  ensureDir(dirname(outputPath));
  const tmp = outputPath.replace(/(\.[^.]+)$/i, ".tmp$1");
  const ext = outputPath.split(".").pop()?.toLowerCase();
  const codecArgs: string[] = [];
  if (ext === "wav") {
    codecArgs.push("-ac", "1", "-ar", String(sampleRateHz), "-c:a", "pcm_s16le");
  } else if (ext === "mp3") {
    codecArgs.push("-ac", "1", "-ar", String(sampleRateHz), "-c:a", "libmp3lame", "-b:a", "128k");
  } else {
    codecArgs.push("-ac", "1", "-ar", String(sampleRateHz));
  }
  const res = spawn("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    inputPath,
    "-t",
    String(Math.max(0, durationSec)),
    ...codecArgs,
    tmp,
  ], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CompileError("ffmpeg is required to trim audio");
    }
    throw new CompileError("ffmpeg trim failed");
  }
  if (res.status !== 0) {
    const stderr = (res.stderr as Buffer)?.toString("utf-8") ?? "";
    throw new CompileError(`ffmpeg trim failed: ${stderr.slice(0, 800)}`);
  }
  ensureDir(dirname(outputPath));
  if (existsSync(tmp)) {
    writeFileSync(outputPath, readFileSync(tmp));
    unlinkSync(tmp);
  }
}

export function estimateTrailingSilenceSec(
  path: string,
  sampleRateHz = 44100,
  amplitudeThreshold = 200,
  maxAnalyzeSec = 6.0,
): number {
  const duration = probeDurationSec(path);
  if (duration <= 0) {
    return 0;
  }
  const analyze = Math.min(maxAnalyzeSec, duration);
  const start = Math.max(0, duration - analyze);
  const res = spawn("ffmpeg", [
    "-v",
    "error",
    "-ss",
    String(start),
    "-i",
    path,
    "-t",
    String(analyze),
    "-ac",
    "1",
    "-ar",
    String(sampleRateHz),
    "-f",
    "s16le",
    "pipe:1",
  ], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });
  if (res.error) {
    if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CompileError("ffmpeg is required to decode audio");
    }
    throw new CompileError("ffmpeg decode failed");
  }
  const data = res.stdout as Buffer;
  if (!data || data.length < 2) {
    return 0;
  }
  const total = Math.floor(data.length / 2);
  let lastActive = -1;
  for (let i = total - 1; i >= 0; i -= 1) {
    const sample = data.readInt16LE(i * 2);
    if (sample >= amplitudeThreshold || sample <= -amplitudeThreshold) {
      lastActive = i;
      break;
    }
  }
  if (lastActive < 0) {
    return analyze;
  }
  const trailingSamples = (total - 1) - lastActive;
  return trailingSamples / sampleRateHz;
}

export function concatAudioFiles(outPath: string, segmentPaths: string[]): void {
  if (!segmentPaths.length) {
    throw new CompileError("No audio segments to concatenate");
  }
  ensureDir(dirname(outPath));
  const listPath = join(dirname(outPath), `.concat-${basename(outPath, "." + outPath.split(".").pop())}.txt`);
  const lines = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  writeFileSync(listPath, `${lines}\n`, "utf-8");
  try {
    const res = spawn("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      outPath,
    ], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });
    if (res.error) {
      if ((res.error as NodeJS.ErrnoException).code === "ENOENT") {
        try {
          if (segmentPaths.every((p) => p.toLowerCase().endsWith(".wav"))) {
            concatWavFiles(outPath, segmentPaths);
            return;
          }
        } catch (err) {
          throw new CompileError(`ffmpeg missing and WAV concat failed: ${(err as Error).message}`);
        }
        throw new CompileError("ffmpeg is required to concatenate audio files");
      }
      throw new CompileError("ffmpeg concat failed");
    }
    if (res.status !== 0) {
      const stderr = (res.stderr as Buffer)?.toString("utf-8") ?? "";
      throw new CompileError(`ffmpeg concat failed: ${stderr.slice(0, 800)}`);
    }
  } finally {
    if (existsSync(listPath)) {
      unlinkSync(listPath);
    }
  }
}
