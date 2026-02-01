import { summarizeTimeline, type TimelineData, type TimelineSummary } from "./timeline.ts";

export type MarkupValue =
  | string
  | number
  | boolean
  | null
  | MarkupValue[]
  | { [key: string]: MarkupValue };

export type SemanticMarkup = Record<string, MarkupValue>;

/**
 * Segment-level timing for individual voice.say() calls within a cue.
 * This enables components to animate elements in sync with specific
 * parts of the voiceover.
 */
export type ScriptSegment = {
  type: "tts" | "pause";
  startSec: number;
  endSec: number;
  text?: string;        // For TTS segments
  durationSec?: number; // For pause segments
};

export type ScriptCue = {
  id?: string | null;
  label?: string | null;
  text?: string | null;
  startSec?: number;
  endSec?: number;
  segments?: ScriptSegment[];  // Segment-level timing for each voice.say()
  markup?: SemanticMarkup;
};

export type ScriptScene = {
  id?: string | null;
  title?: string | null;
  startSec?: number;
  endSec?: number;
  cues?: ScriptCue[];
  styles?: Record<string, unknown>;
  layers?: unknown[];
  components?: unknown[];
  markup?: SemanticMarkup;
};

export type ScriptMeta = {
  fps?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type ScriptData = {
  scenes?: ScriptScene[];
  fps?: number;
  meta?: ScriptMeta;
  styles?: Record<string, unknown>; // Composition-level styles
  markup?: SemanticMarkup; // Composition-level markup
};

export type VideoConfigDefaults = {
  fps?: number;
  width?: number;
  height?: number;
};

export type DerivedVideoConfig = {
  fps: number;
  width: number;
  height: number;
  durationSec: number;
  durationFrames: number;
};

export type VideoConfigInput = {
  script?: ScriptData | null;
  timeline?: TimelineData | null;
  timelineSummary?: TimelineSummary | null;
  defaults?: VideoConfigDefaults;
};

const getSceneEndSec = (scenes?: ScriptScene[]): number => {
  let maxEnd = 0;
  for (const scene of scenes ?? []) {
    const end = scene.endSec ?? 0;
    if (end > maxEnd) {
      maxEnd = end;
    }
  }
  return maxEnd;
};

export const deriveVideoConfig = ({
  script,
  timeline,
  timelineSummary,
  defaults,
}: VideoConfigInput = {}): DerivedVideoConfig => {
  const summary = timelineSummary ?? summarizeTimeline(timeline);
  const meta = script?.meta;
  const fps = script?.fps ?? meta?.fps ?? defaults?.fps ?? 30;
  const width = meta?.width ?? defaults?.width ?? 1280;
  const height = meta?.height ?? defaults?.height ?? 720;
  const durationSec = Math.max(meta?.durationSeconds ?? 0, getSceneEndSec(script?.scenes), summary.durationSec);
  const durationFrames = Math.max(1, Math.ceil(durationSec * fps));
  return { fps, width, height, durationSec, durationFrames };
};

const isActiveRange = (timeSec: number, startSec?: number, endSec?: number): boolean => {
  if (!Number.isFinite(timeSec)) {
    return false;
  }
  const start = startSec ?? 0;
  const end = endSec ?? start;
  return timeSec >= start && timeSec < end;
};

export const getActiveScene = (script?: ScriptData | null, timeSec = 0): ScriptScene | null => {
  const scenes = script?.scenes ?? [];
  for (const scene of scenes) {
    if (isActiveRange(timeSec, scene.startSec, scene.endSec)) {
      console.log(`[getActiveScene] timeSec=${timeSec}, found scene=${scene.id} (${scene.startSec}-${scene.endSec}), markup=`, JSON.stringify(scene.markup));
      return scene;
    }
  }
  console.log(`[getActiveScene] timeSec=${timeSec}, NO SCENE FOUND`);
  return null;
};

export const getActiveCue = (script?: ScriptData | null, timeSec = 0): ScriptCue | null => {
  const scene = getActiveScene(script, timeSec);
  if (!scene) {
    return null;
  }
  for (const cue of scene.cues ?? []) {
    if (isActiveRange(timeSec, cue.startSec, cue.endSec)) {
      return cue;
    }
  }
  return null;
};
