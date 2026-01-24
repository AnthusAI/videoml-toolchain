import { spawn } from "node:child_process";
import { join } from "path";

export type EncodeVideoOptions = {
  framesDir: string;
  fps: number;
  outputPath: string;
  audioPath?: string | null;
  framePattern?: string;
  ffmpegPath?: string;
  ffmpegArgs?: string[];
};

export type EncodeRunnerResult = {
  code: number | null;
};

export type EncodeRunner = (command: string, args: string[]) => Promise<EncodeRunnerResult>;

const defaultFramePattern = "frame-%06d.png";

export const buildFfmpegArgs = ({
  framesDir,
  fps,
  outputPath,
  audioPath,
  framePattern = defaultFramePattern,
  ffmpegArgs,
}: EncodeVideoOptions): string[] => {
  const args = ["-y", "-framerate", String(fps), "-i", join(framesDir, framePattern)];
  if (audioPath) {
    args.push("-i", audioPath, "-shortest");
  }
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
  if (audioPath) {
    args.push("-c:a", "aac", "-b:a", "192k");
  }
  args.push("-r", String(fps));
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
};
