import { slugify } from "./util.js";

export type Bullet = { id: string; text: string };
export type CuePoint = {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  text: string;
  bullets: Bullet[];
};

export type Scene = {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  cues: CuePoint[];
};

export type Script = {
  scenes: Scene[];
  posterTimeSec?: number | null;
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
      cues: scene.cues.map((cue) => ({
        id: cue.id,
        label: cue.label,
        startSec: cue.startSec,
        endSec: cue.endSec,
        text: cue.text,
        bullets: cue.bullets.map((b) => ({ id: b.id, text: b.text })),
      })),
    })),
  };
  if (script.posterTimeSec != null) {
    out.posterTimeSec = script.posterTimeSec;
  }
  return out;
}
