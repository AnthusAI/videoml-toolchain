import { slugify } from "./util.js";
import type { SemanticMarkup } from "./dsl/types.js";

export type Bullet = { id: string; text: string };
export type CuePoint = {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  text: string;
  bullets: Bullet[];
  markup?: SemanticMarkup;
};

export type Scene = {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  cues: CuePoint[];
  markup?: SemanticMarkup;
};

export type ScriptMeta = {
  fps?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type Script = {
  scenes: Scene[];
  posterTimeSec?: number | null;
  fps?: number;
  meta?: ScriptMeta;
};

export function makeBullet(text: string): Bullet {
  return { id: slugify(text), text };
}

export function scriptToJson(script: Script): Record<string, unknown> {
  const out: Record<string, unknown> = {
    scenes: script.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      startSec: scene.startSec,
      endSec: scene.endSec,
      ...(scene.markup ? { markup: scene.markup } : {}),
      cues: scene.cues.map((cue) => ({
        id: cue.id,
        label: cue.label,
        startSec: cue.startSec,
        endSec: cue.endSec,
        text: cue.text,
        ...(cue.markup ? { markup: cue.markup } : {}),
        bullets: cue.bullets.map((b) => ({ id: b.id, text: b.text })),
      })),
    })),
  };
  if (script.posterTimeSec != null) {
    out.posterTimeSec = script.posterTimeSec;
  }
  if (script.fps != null) {
    out.fps = script.fps;
  }
  if (script.meta) {
    out.meta = script.meta;
  }
  return out;
}
