import type { ScriptCue } from '@babulus/shared';
import { cueStartFrame } from './timing.js';

export type TextEffectUnit = 'chars' | 'words' | 'lines';

export type TextEffectName =
  | 'fade'
  | 'fade_up'
  | 'fade_down'
  | 'slide_left'
  | 'slide_right'
  | 'pop'
  | 'scale_in';

export type TextEffectConfig = {
  effect: TextEffectName;
  unit?: TextEffectUnit;
  start?: { kind: 'frame'; frame: number } | { kind: 'cue'; offsetFrames?: number };
  durationFrames?: number;
  delayFrames?: number;
  staggerFrames?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
};

export const resolveEffectStartFrame = (effect: TextEffectConfig | undefined, cue: ScriptCue | null | undefined, fps: number): number => {
  if (!effect?.start) {
    return cue ? cueStartFrame(cue, fps) : 0;
  }
  if (effect.start.kind === 'frame') {
    return Math.max(0, Math.floor(effect.start.frame));
  }
  const offset = effect.start.offsetFrames ?? 0;
  return cueStartFrame(cue, fps) + Math.floor(offset);
};

export const resolveEffectEasing = (effect: TextEffectConfig | undefined): string => {
  const easing = effect?.easing ?? 'easeOut';
  if (easing === 'linear') return 'linear';
  if (easing === 'easeInOut') return 'easeInOutQuad';
  return 'easeOutQuad';
};

export const effectToAnimeProps = (name: TextEffectName): Record<string, any> => {
  // Keep these mappings stable; they are our named-effects vocabulary.
  switch (name) {
    case 'fade':
      return { opacity: [0, 1] };
    case 'fade_up':
      return { opacity: [0, 1], translateY: [24, 0] };
    case 'fade_down':
      return { opacity: [0, 1], translateY: [-24, 0] };
    case 'slide_left':
      return { opacity: [0, 1], translateX: [40, 0] };
    case 'slide_right':
      return { opacity: [0, 1], translateX: [-40, 0] };
    case 'pop':
      return { opacity: [0, 1], scale: [0.9, 1] };
    case 'scale_in':
      return { opacity: [0, 1], scale: [0.8, 1] };
    default:
      return { opacity: [0, 1] };
  }
};
