import { spawn } from "node:child_process";
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

const defaultFramePattern = "frame-%06d.png";

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
