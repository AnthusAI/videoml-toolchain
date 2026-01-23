import type { ScriptData } from "@babulus/shared";
import { deriveVideoConfig, type TimelineData } from "@babulus/shared";
import { renderFramesToHtml, type RenderFramesHtmlOptions, type RenderFramesResult } from "./render.js";
import { StoryboardRenderer } from "./storyboard.js";

export type RenderStoryboardFramesOptions = Omit<
  RenderFramesHtmlOptions,
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
  renderFrames?: (options: RenderFramesHtmlOptions) => RenderFramesResult;
};

export const renderStoryboardFramesHtml = ({
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
}: RenderStoryboardFramesOptions): RenderFramesResult => {
  const derived = deriveVideoConfig({ script, timeline });
  const resolvedFps = fps ?? derived.fps;
  const resolvedWidth = width ?? derived.width;
  const resolvedHeight = height ?? derived.height;
  const resolvedDurationFrames =
    durationFrames ?? Math.max(1, Math.ceil(derived.durationSec * resolvedFps));

  const renderer = renderFrames ?? renderFramesToHtml;
  return renderer({
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
    frame: 0,
  });
};
