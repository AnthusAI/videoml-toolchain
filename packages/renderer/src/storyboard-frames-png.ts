import type { ScriptData } from "@babulus/shared";
import { deriveVideoConfig, type TimelineData } from "@babulus/shared";
import { renderFramesToPng, type RenderFramesPngOptions, type RenderFramesResult } from "./render.js";
import { StoryboardRenderer } from "./storyboard.js";

export type RenderStoryboardFramesPngOptions = Omit<
  RenderFramesPngOptions,
  "component" | "config" | "inputProps" | "frame"
> & {
  script: ScriptData;
  timeline?: TimelineData | null;
  title?: string | null;
  subtitle?: string | null;
  fps?: number;
  width?: number;
  height?: number;
  durationFrames?: number;
  renderFrames?: (options: RenderFramesPngOptions) => Promise<RenderFramesResult>;
};

export const renderStoryboardFramesPng = async ({
  script,
  timeline,
  title,
  subtitle,
  fps,
  width,
  height,
  durationFrames,
  renderFrames,
  ...options
}: RenderStoryboardFramesPngOptions): Promise<RenderFramesResult> => {
  const derived = deriveVideoConfig({ script, timeline });
  const resolvedFps = fps ?? derived.fps;
  const resolvedWidth = width ?? derived.width;
  const resolvedHeight = height ?? derived.height;
  const resolvedDurationFrames =
    durationFrames ?? Math.max(1, Math.ceil(derived.durationSec * resolvedFps));

  const renderer = renderFrames ?? renderFramesToPng;
  return await renderer({
    ...options,
    component: StoryboardRenderer,
    config: {
      fps: resolvedFps,
      width: resolvedWidth,
      height: resolvedHeight,
      durationFrames: resolvedDurationFrames,
    },
    inputProps: {
      script,
      title: title ?? undefined,
      subtitle: subtitle ?? undefined,
    },
  });
};
