import type React from "react";
import { encodeVideo, type EncodeRunner, type EncodeVideoOptions } from "./encode.js";
import {
  renderFramesToPng,
  type RenderFramesPngOptions,
  type RenderFramesResult,
  type RenderFrameOptions,
} from "./render.js";
import type { VideoConfig } from "./context.js";

export type RenderVideoOptions<TInputProps extends Record<string, unknown> = Record<string, unknown>> = {
  component: React.ComponentType<TInputProps>;
  config: VideoConfig;
  outputPath: string;
  framesDir: string;
  inputProps?: TInputProps;
  audioPath?: string | null;
  framePattern?: string;
  startFrame?: number;
  endFrame?: number;
  deviceScaleFactor?: number;
  workers?: number;
  ffmpegPath?: string;
  ffmpegArgs?: string[];
  browser?: RenderFramesPngOptions["browser"];
  browserBundlePath?: RenderFramesPngOptions["browserBundlePath"];
  onFrame?: RenderFramesPngOptions["onFrame"];
  cleanFrames?: boolean; // If true, delete existing frames before rendering (default: true)
  renderFrames?: (options: RenderFramesPngOptions) => Promise<RenderFramesResult>;
  encode?: (options: EncodeVideoOptions, runner?: EncodeRunner) => Promise<void>;
  encodeRunner?: EncodeRunner;
};

export type RenderVideoResult = {
  frames: RenderFramesResult["frames"];
  outputPath: string;
};

export const renderVideo = async <TInputProps extends Record<string, unknown> = Record<string, unknown>>({
  component,
  config,
  outputPath,
  framesDir,
  inputProps,
  audioPath,
  framePattern = "frame-%06d.png",
  startFrame,
  endFrame,
  deviceScaleFactor,
  workers,
  ffmpegPath,
  ffmpegArgs,
  browser,
  browserBundlePath,
  onFrame,
  cleanFrames,
  renderFrames,
  encode,
  encodeRunner,
}: RenderVideoOptions<TInputProps>): Promise<RenderVideoResult> => {
  const render = renderFrames ?? renderFramesToPng;
  const encoder = encode ?? encodeVideo;
  const frameOptions: RenderFramesPngOptions = {
    component,
    config,
    inputProps,
    outDir: framesDir,
    startFrame,
    endFrame,
    framePattern,
    deviceScaleFactor,
    workers,
    browser,
    browserBundlePath,
    onFrame,
    cleanFrames,
  };
  const framesResult = await render(frameOptions);
  if (!framesResult.frames.length) {
    throw new Error("No frames rendered.");
  }

  // Skip encoding if we're only rendering a small number of frames for preview
  // or if the frame range doesn't start at 0 (which would cause ffmpeg to fail)
  const shouldSkipEncoding =
    (startFrame !== undefined && startFrame > 0) ||
    (startFrame !== undefined && endFrame !== undefined && (endFrame - startFrame) < 10);

  if (!shouldSkipEncoding) {
    await encoder(
      {
        framesDir,
        fps: config.fps,
        outputPath,
        audioPath,
        framePattern,
        ffmpegPath,
        ffmpegArgs,
      },
      encodeRunner,
    );
  } else {
    console.error(`[Pipeline] Skipping video encoding (rendering frames ${startFrame ?? 0}-${endFrame ?? config.durationFrames} for preview)`);
  }

  return { frames: framesResult.frames, outputPath };
};
