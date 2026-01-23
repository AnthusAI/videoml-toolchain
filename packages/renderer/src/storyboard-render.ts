import type { ScriptData } from "@babulus/shared";
import { deriveVideoConfig, type TimelineData } from "@babulus/shared";
import { renderVideo, type RenderVideoOptions, type RenderVideoResult } from "./pipeline.js";
import { StoryboardRenderer } from "./storyboard.js";

export type RenderStoryboardOptions = Omit<RenderVideoOptions, "component" | "config" | "inputProps"> & {
  script: ScriptData;
  timeline?: TimelineData | null;
  title?: string | null;
  subtitle?: string | null;
  fps?: number;
  width?: number;
  height?: number;
  durationFrames?: number;
};

export const renderStoryboardVideo = async ({
  script,
  timeline,
  title,
  subtitle,
  fps,
  width,
  height,
  durationFrames,
  ...options
}: RenderStoryboardOptions): Promise<RenderVideoResult> => {
  const derived = deriveVideoConfig({ script, timeline });
  const resolvedFps = fps ?? derived.fps;
  const resolvedWidth = width ?? derived.width;
  const resolvedHeight = height ?? derived.height;
  const resolvedDurationFrames =
    durationFrames ?? Math.max(1, Math.ceil(derived.durationSec * resolvedFps));

  return renderVideo({
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
