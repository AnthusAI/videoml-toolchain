import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from '../context.tsx';
import { clamp, interpolate, spring, type SpringConfig, type EasingFn } from '../math.ts';
import { clamp01 } from './utils.js';

export type FrameProgressOptions = {
  startFrame?: number;
  durationFrames?: number;
  easing?: EasingFn;
  clamp?: boolean;
};

export const useFrameProgress = (options: FrameProgressOptions = {}): number => {
  const frame = useCurrentFrame();
  return useMemo(() => {
    const start = options.startFrame ?? 0;
    const duration = Math.max(1, options.durationFrames ?? 30);
    const raw = (frame - start) / duration;
    const eased = options.easing ? options.easing(raw) : raw;
    if (options.clamp === false) return eased;
    return clamp01(eased);
  }, [frame, options.startFrame, options.durationFrames, options.easing, options.clamp]);
};

export const useFrameSpring = (config?: SpringConfig): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return useMemo(() => spring({ frame, fps, config }), [frame, fps, config]);
};

export const useFrameInterpolate = (
  inputRange: [number, number],
  outputRange: [number, number],
  options?: { clamp?: boolean; easing?: EasingFn },
): number => {
  const frame = useCurrentFrame();
  return useMemo(() => interpolate(frame, inputRange, outputRange, options), [frame, inputRange, outputRange, options]);
};

export const frameProgress = (frame: number, options: FrameProgressOptions = {}): number => {
  const start = options.startFrame ?? 0;
  const duration = Math.max(1, options.durationFrames ?? 30);
  const raw = (frame - start) / duration;
  const eased = options.easing ? options.easing(raw) : raw;
  if (options.clamp === false) return eased;
  return clamp01(eased);
};

export const frameInterpolate = (
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options?: { clamp?: boolean; easing?: EasingFn },
): number => interpolate(frame, inputRange, outputRange, options);

export const frameClamp = (value: number, min = 0, max = 1): number => clamp(value, min, max);
