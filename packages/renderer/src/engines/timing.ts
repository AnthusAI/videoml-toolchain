import type { ScriptCue } from '../shared.ts';

export const cueStartFrame = (cue: ScriptCue | null | undefined, fps: number): number => {
  if (!cue) return 0;
  const startSec = (cue as any).startSec;
  if (typeof startSec !== 'number' || !Number.isFinite(startSec)) return 0;
  return Math.round(startSec * fps);
};

