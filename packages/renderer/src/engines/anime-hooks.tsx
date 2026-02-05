import type { RefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from '../context.js';
import { clamp, frameToTimeMs } from '../math.js';

type TimelineLike = {
  duration: number;
  seek: (timeMs: number) => void;
  pause?: () => void;
};

export const useAnimeTimeline = (args: {
  rootRef: RefObject<HTMLElement>;
  buildTimeline: (anime: any, root: HTMLElement, ctx: { fps: number; width: number; height: number }) => TimelineLike;
  startFrame?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timelineRef = useRef<TimelineLike | null>(null);
  const animeRef = useRef<any | null>(null);
  const startFrame = args.startFrame ?? 0;

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (typeof window === 'undefined') return;
      const root = args.rootRef.current;
      if (!root) return;
      const module = await import('animejs');
      const anime = (module as any).default ?? module;
      if (!isMounted) return;
      animeRef.current = anime;
      timelineRef.current = args.buildTimeline(anime, root, { fps, width, height });
      const timeMs = frameToTimeMs(frame - startFrame, fps);
      const clamped = clamp(timeMs, 0, Math.max(0, timelineRef.current.duration ?? 0));
      timelineRef.current.seek(clamped);
    };
    void init();
    return () => {
      isMounted = false;
      timelineRef.current?.pause?.();
      timelineRef.current = null;
      animeRef.current = null;
    };
  }, [args, fps, height, width]);

  const seekMs = useMemo(() => frameToTimeMs(frame - startFrame, fps), [frame, fps, startFrame]);

  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const clamped = clamp(seekMs, 0, Math.max(0, tl.duration ?? 0));
    tl.seek(clamped);
  }, [seekMs]);

  return { timeline: timelineRef.current, anime: animeRef.current };
};
