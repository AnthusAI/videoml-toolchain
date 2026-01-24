import type React from "react";
import { encodeVideo, type EncodeRunner, type EncodeVideoOptions } from "./encode.js";
import {
  renderFramesToPng,
  type RenderFramesPngOptions,
  type RenderFramesResult,
  type RenderFrameOptions,
} from "./render.js";
import type { VideoConfig } from "./context.js";

export type RenderVideoOptions = {
  component: React.ComponentType<Record<string, unknown>>;
  config: VideoConfig;
  outputPath: string;
  framesDir: string;
  inputProps?: Record<string, unknown>;
  audioPath?: string | null;
  framePattern?: string;
  startFrame?: number;
  endFrame?: number;
  deviceScaleFactor?: number;
  workers?: number;
  ffmpegPath?: string;
  ffmpegArgs?: string[];
  browser?: RenderFramesPngOptions["browser"];
  onFrame?: RenderFramesPngOptions["onFrame"];
  renderFrames?: (options: RenderFramesPngOptions) => Promise<RenderFramesResult>;
  encode?: (options: EncodeVideoOptions, runner?: EncodeRunner) => Promise<void>;
  encodeRunner?: EncodeRunner;
};

export type RenderVideoResult = {
  frames: RenderFramesResult["frames"];
  outputPath: string;
};

export const renderVideo = async ({
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
  onFrame,
  renderFrames,
  encode,
  encodeRunner,
}: RenderVideoOptions): Promise<RenderVideoResult> => {
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
    onFrame,
  };
  const framesResult = await render(frameOptions);
  if (!framesResult.frames.length) {
    throw new Error("No frames rendered.");
  }
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
  return { frames: framesResult.frames, outputPath };
};
