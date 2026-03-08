import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "path";

export type EncodeVideoOptions = {
  framesDir: string;
  fps: number;
  outputPath: string;
  audioPath?: string | null;
  framePattern?: string;
  startNumber?: number; // For preview mode: which frame number to start from
  frameCount?: number; // Total number of frames to encode (for preview mode)
  ffmpegPath?: string;
  ffmpegArgs?: string[];
};

export type EncodeRunnerResult = {
  code: number | null;
};

export type EncodeRunner = (command: string, args: string[]) => Promise<EncodeRunnerResult>;

type AudioValidationOptions = {
  ffmpegPath: string;
  requireAudioStream: boolean;
  minBytes: number;
  minDurationSec: number;
  probeSeconds: number;
  sampleRateHz: number;
  minActivityRatio: number;
  checkSilence: boolean;
};

type AudioValidationResult = {
  path: string;
  exists: boolean;
  bytes: number;
  durationSec: number;
  audioStreamCount: number;
  isAllSilence: boolean | null;
  activityRatio: number | null;
  valid: boolean;
  failures: string[];
};

const AUDIO_VALIDATION_PREFIX = "AUDIO_VALIDATION_FAILED";
const defaultFramePattern = "frame-%06d.png";

const runProcess = (command: string, args: string[], text = false): Buffer => {
  const res = spawnSync(command, args, {
    encoding: text ? "utf-8" : "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (res.error) {
    const err = res.error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error(`${command} not found at ${command}`);
    }
    throw new Error(`${command} failed to run`);
  }
  if (res.status !== 0) {
    const stderr = res.stderr instanceof Buffer ? res.stderr.toString("utf-8") : String(res.stderr ?? "");
    throw new Error(`${command} failed: ${stderr.slice(0, 800)}`);
  }
  return res.stdout instanceof Buffer ? res.stdout : Buffer.from(String(res.stdout ?? ""));
};

const probeDurationSec = (path: string): number => {
  const stdout = runProcess("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    path,
  ], true);
  const text = stdout.toString("utf-8");
  const parsed = JSON.parse(text);
  const dur = Number(parsed?.format?.duration ?? 0);
  return Math.max(0, dur);
};

const probeAudioStreamCount = (path: string): number => {
  const stdout = runProcess("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a",
    "-show_entries",
    "stream=index",
    "-of",
    "csv=p=0",
    path,
  ], true);
  const text = stdout.toString("utf-8").trim();
  if (!text) {
    return 0;
  }
  return text.split("\n").map((line) => line.trim()).filter(Boolean).length;
};

const audioActivityRatio = (
  path: string,
  ffmpegPath: string,
  seconds: number,
  sampleRateHz: number,
  amplitudeThreshold = 200,
): number => {
  const res = spawnSync(ffmpegPath, [
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
    const err = res.error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error(`ffmpeg not found at ${ffmpegPath}`);
    }
    throw new Error("ffmpeg decode failed");
  }
  if (res.status !== 0) {
    const stderr = (res.stderr as Buffer)?.toString("utf-8") ?? "";
    throw new Error(`ffmpeg decode failed: ${stderr.slice(0, 800)}`);
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
};

const isAudioAllSilence = (path: string, ffmpegPath: string, seconds: number, sampleRateHz: number): boolean => {
  const res = spawnSync(ffmpegPath, [
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
    const err = res.error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error(`ffmpeg not found at ${ffmpegPath}`);
    }
    throw new Error("ffmpeg decode failed");
  }
  if (res.status !== 0) {
    const stderr = (res.stderr as Buffer)?.toString("utf-8") ?? "";
    throw new Error(`ffmpeg decode failed: ${stderr.slice(0, 800)}`);
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
};

const formatValidationError = (label: string, result: AudioValidationResult): string => {
  return (
    `${AUDIO_VALIDATION_PREFIX}: ${label} ${result.path} :: ${result.failures.join(", ")} ` +
    `(bytes=${result.bytes}, duration=${result.durationSec.toFixed(3)}s, ` +
    `streams=${result.audioStreamCount}, activity=${(result.activityRatio ?? 0).toFixed(4)})`
  );
};

const validateAudioFile = (path: string, opts: AudioValidationOptions): AudioValidationResult => {
  const result: AudioValidationResult = {
    path,
    exists: false,
    bytes: 0,
    durationSec: 0,
    audioStreamCount: 0,
    isAllSilence: null,
    activityRatio: null,
    valid: false,
    failures: [],
  };

  if (!existsSync(path)) {
    result.failures.push("missing-file");
    return result;
  }
  result.exists = true;

  try {
    result.bytes = statSync(path).size;
  } catch {
    result.failures.push("stat-failed");
  }
  if (result.bytes < opts.minBytes) {
    result.failures.push(`bytes-below-min(${result.bytes}<${opts.minBytes})`);
  }

  try {
    result.durationSec = probeDurationSec(path);
  } catch {
    result.failures.push("probe-duration-failed");
  }
  if (result.durationSec < opts.minDurationSec) {
    result.failures.push(`duration-below-min(${result.durationSec.toFixed(3)}<${opts.minDurationSec})`);
  }

  try {
    result.audioStreamCount = probeAudioStreamCount(path);
  } catch {
    result.failures.push("probe-streams-failed");
  }
  if (opts.requireAudioStream && result.audioStreamCount < 1) {
    result.failures.push("missing-audio-stream");
  }

  const shouldInspectWaveform = opts.checkSilence || opts.minActivityRatio > 0;
  if (shouldInspectWaveform && (!opts.requireAudioStream || result.audioStreamCount > 0)) {
    const probeFor = Math.max(0.25, Math.min(opts.probeSeconds, result.durationSec || opts.probeSeconds));
    try {
      result.isAllSilence = isAudioAllSilence(path, opts.ffmpegPath, probeFor, opts.sampleRateHz);
    } catch {
      result.failures.push("silence-check-failed");
    }
    try {
      result.activityRatio = audioActivityRatio(path, opts.ffmpegPath, probeFor, opts.sampleRateHz);
    } catch {
      result.failures.push("activity-check-failed");
    }
    if (opts.checkSilence && result.isAllSilence === true) {
      result.failures.push("all-silence");
    }
    if (opts.minActivityRatio > 0 && result.activityRatio != null && result.activityRatio < opts.minActivityRatio) {
      result.failures.push(`activity-below-min(${result.activityRatio.toFixed(4)}<${opts.minActivityRatio})`);
    }
  }

  result.valid = result.failures.length === 0;
  return result;
};

export const buildFfmpegArgs = ({
  framesDir,
  fps,
  outputPath,
  audioPath,
  framePattern = defaultFramePattern,
  startNumber,
  frameCount,
  ffmpegArgs,
}: EncodeVideoOptions): string[] => {
  const args = ["-y", "-framerate", String(fps)];

  // If preview mode with non-zero start, tell ffmpeg which frame to start from
  if (startNumber !== undefined && startNumber > 0) {
    args.push("-start_number", String(startNumber));
  }

  args.push("-i", join(framesDir, framePattern));
  if (audioPath) {
    // Calculate audio offset from start frame number
    // If we're starting from frame N, we need to skip N/fps seconds in the audio
    // Place -ss BEFORE the audio input for input seeking (faster and more accurate)
    if (startNumber !== undefined && startNumber > 0) {
      const audioOffsetSec = startNumber / fps;
      args.push("-ss", String(audioOffsetSec));
    }
    args.push("-i", audioPath);
    // Only use -shortest if we're NOT specifying exact frame count
    // When frameCount is specified, we're in preview mode and explicitly control video length
    if (frameCount === undefined) {
      args.push("-shortest");
    }
  }

  // Output options come after all inputs
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
  // Add keyframe interval for better compatibility with video players
  args.push("-g", String(Math.max(1, Math.floor(fps))));
  if (audioPath) {
    args.push("-c:a", "aac", "-b:a", "192k");
  }
  args.push("-r", String(fps));

  // If frameCount is specified, limit the number of video frames to encode
  // This is crucial for preview mode to only encode the frames we rendered
  if (frameCount !== undefined) {
    args.push("-frames:v", String(frameCount));
  }
  if (ffmpegArgs && ffmpegArgs.length) {
    args.push(...ffmpegArgs);
  }
  args.push(outputPath);
  return args;
};

const spawnRunner: EncodeRunner = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code }));
  });

export const encodeVideo = async (options: EncodeVideoOptions, runner: EncodeRunner = spawnRunner): Promise<void> => {
  const command = options.ffmpegPath ?? "ffmpeg";

  if (options.audioPath) {
    const inputAudioValidation = validateAudioFile(options.audioPath, {
      ffmpegPath: command,
      requireAudioStream: true,
      minBytes: 256,
      minDurationSec: 0.2,
      probeSeconds: 6,
      sampleRateHz: 44100,
      minActivityRatio: 0.001,
      checkSilence: true,
    });
    if (!inputAudioValidation.valid) {
      throw new Error(formatValidationError("input-audio", inputAudioValidation));
    }
  }

  const args = buildFfmpegArgs(options);
  let result: EncodeRunnerResult;
  try {
    result = await runner(command, args);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      throw new Error(`ffmpeg not found at ${command}`);
    }
    throw error;
  }
  if (!result || result.code !== 0) {
    throw new Error(`ffmpeg failed with code ${result?.code ?? "unknown"}`);
  }

  const outputValidation = validateAudioFile(options.outputPath, {
    ffmpegPath: command,
    requireAudioStream: Boolean(options.audioPath),
    minBytes: 1024,
    minDurationSec: 0.2,
    probeSeconds: 6,
    sampleRateHz: 44100,
    minActivityRatio: options.audioPath ? 0.001 : 0,
    checkSilence: Boolean(options.audioPath),
  });
  if (!outputValidation.valid) {
    throw new Error(formatValidationError("output-video", outputValidation));
  }
};
