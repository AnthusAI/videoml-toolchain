import type { EasingFn } from '../math.js';
import { easeOutCubic, interpolate, spring as springUtil, clamp } from '../math.js';

// ============================================
// Types
// ============================================

export type Direction = 'left' | 'right' | 'up' | 'down';
export type Origin =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

type BaseTransitionConfig = {
  durationFrames: number;
  easing?: EasingFn;
  delayFrames?: number;
};

export type FadeTransitionConfig = BaseTransitionConfig & {
  type: 'fade';
  from?: number;
  to?: number;
};

export type SlideTransitionConfig = BaseTransitionConfig & {
  type: 'slide';
  direction: Direction;
  distance?: number;
};

export type PushTransitionConfig = BaseTransitionConfig & {
  type: 'push';
  direction: Direction;
};

export type ScaleTransitionConfig = BaseTransitionConfig & {
  type: 'scale';
  from?: number;
  to?: number;
  origin?: Origin;
};

export type WipeTransitionConfig = BaseTransitionConfig & {
  type: 'wipe';
  direction: Direction;
  softEdge?: number;
};

export type TypewriterTransitionConfig = BaseTransitionConfig & {
  type: 'typewriter';
  cursor?: boolean;
  cursorChar?: string;
  cursorBlinkFrames?: number;
  charsPerFrame?: number;
};

export type SpringTransitionConfig = BaseTransitionConfig & {
  type: 'spring';
  mass?: number;
  stiffness?: number;
  damping?: number;
};

export type TransitionConfig =
  | FadeTransitionConfig
  | SlideTransitionConfig
  | PushTransitionConfig
  | ScaleTransitionConfig
  | WipeTransitionConfig
  | TypewriterTransitionConfig
  | SpringTransitionConfig;

export type TransitionResult = {
  opacity?: number;
  transform?: string;
  clipPath?: string;
  visibleText?: string;
  showCursor?: boolean;
};

type TransitionContext = {
  fps: number;
  width: number;
  height: number;
  text?: string;
};

// ============================================
// Main Function
// ============================================

/**
 * Apply a transition configuration at a given frame.
 */
export function applyTransition(
  config: TransitionConfig,
  frame: number,
  context: TransitionContext
): TransitionResult {
  const delayFrames = config.delayFrames ?? 0;
  const adjustedFrame = frame - delayFrames;

  // Before delay
  if (adjustedFrame < 0) {
    return getInitialState(config);
  }

  // After completion
  if (adjustedFrame >= config.durationFrames) {
    return getFinalState(config);
  }

  // Calculate progress with easing
  const rawProgress = adjustedFrame / config.durationFrames;
  const easing = config.easing ?? easeOutCubic;
  const progress = easing(rawProgress);

  // Apply transition type
  switch (config.type) {
    case 'fade':
      return applyFade(config, progress);
    case 'slide':
      return applySlide(config, progress, context);
    case 'push':
      return applyPush(config, progress, context);
    case 'scale':
      return applyScale(config, progress);
    case 'wipe':
      return applyWipe(config, progress);
    case 'typewriter':
      return applyTypewriter(config, adjustedFrame, context);
    case 'spring':
      return applySpring(config, adjustedFrame, context);
  }
}

// ============================================
// Individual Transition Implementations
// ============================================

function applyFade(config: FadeTransitionConfig, progress: number): TransitionResult {
  const from = config.from ?? 0;
  const to = config.to ?? 1;
  const opacity = from + (to - from) * progress;
  return { opacity };
}

function applySlide(
  config: SlideTransitionConfig,
  progress: number,
  context: TransitionContext
): TransitionResult {
  const distance = config.distance ?? 100;
  const currentDistance = distance * (1 - progress);

  let transform = '';
  switch (config.direction) {
    case 'left':
      transform = `translateX(-${currentDistance}px)`;
      break;
    case 'right':
      transform = `translateX(${currentDistance}px)`;
      break;
    case 'up':
      transform = `translateY(-${currentDistance}px)`;
      break;
    case 'down':
      transform = `translateY(${currentDistance}px)`;
      break;
  }

  return { transform };
}

function applyPush(
  config: PushTransitionConfig,
  progress: number,
  context: TransitionContext
): TransitionResult {
  // Push is same as slide - the "push out" behavior is handled by having
  // two elements: one sliding in, one sliding out opposite direction
  const distance = config.direction === 'left' || config.direction === 'right' ? context.width : context.height;
  const currentDistance = distance * (1 - progress);

  let transform = '';
  switch (config.direction) {
    case 'left':
      transform = `translateX(-${currentDistance}px)`;
      break;
    case 'right':
      transform = `translateX(${currentDistance}px)`;
      break;
    case 'up':
      transform = `translateY(-${currentDistance}px)`;
      break;
    case 'down':
      transform = `translateY(${currentDistance}px)`;
      break;
  }

  return { transform };
}

function applyScale(config: ScaleTransitionConfig, progress: number): TransitionResult {
  const from = config.from ?? 0;
  const to = config.to ?? 1;
  const scale = from + (to - from) * progress;

  const origin = config.origin ?? 'center';
  let transformOrigin = '';
  switch (origin) {
    case 'center':
      transformOrigin = 'center center';
      break;
    case 'top-left':
      transformOrigin = 'top left';
      break;
    case 'top-right':
      transformOrigin = 'top right';
      break;
    case 'bottom-left':
      transformOrigin = 'bottom left';
      break;
    case 'bottom-right':
      transformOrigin = 'bottom right';
      break;
    case 'top':
      transformOrigin = 'top center';
      break;
    case 'bottom':
      transformOrigin = 'bottom center';
      break;
    case 'left':
      transformOrigin = 'center left';
      break;
    case 'right':
      transformOrigin = 'center right';
      break;
  }

  return {
    transform: `scale(${scale})`,
  };
}

function applyWipe(config: WipeTransitionConfig, progress: number): TransitionResult {
  const percentage = (1 - progress) * 100;

  let clipPath = '';
  switch (config.direction) {
    case 'left':
      clipPath = `inset(0 ${percentage}% 0 0)`;
      break;
    case 'right':
      clipPath = `inset(0 0 0 ${percentage}%)`;
      break;
    case 'up':
      clipPath = `inset(${percentage}% 0 0 0)`;
      break;
    case 'down':
      clipPath = `inset(0 0 ${percentage}% 0)`;
      break;
  }

  return { clipPath };
}

function applyTypewriter(
  config: TypewriterTransitionConfig,
  frame: number,
  context: TransitionContext
): TransitionResult {
  const text = context.text ?? '';
  const charsPerFrame = config.charsPerFrame ?? 0.5;
  const visibleChars = Math.min(Math.floor(frame * charsPerFrame), text.length);
  const visibleText = text.slice(0, visibleChars);

  const showCursor = config.cursor !== false;
  const cursorBlinkFrames = config.cursorBlinkFrames ?? 15;
  const isCursorVisible = showCursor && Math.floor(frame / cursorBlinkFrames) % 2 === 0;

  return {
    visibleText,
    showCursor: isCursorVisible && visibleChars < text.length,
  };
}

function applySpring(
  config: SpringTransitionConfig,
  frame: number,
  context: TransitionContext
): TransitionResult {
  const value = springUtil({
    frame,
    fps: context.fps,
    config: {
      from: 0,
      to: 1,
      mass: config.mass ?? 1,
      stiffness: config.stiffness ?? 100,
      damping: config.damping ?? 10,
    },
  });

  return {
    opacity: value,
    transform: `translateY(${(1 - value) * 40}px)`,
  };
}

// ============================================
// Helper Functions
// ============================================

function getInitialState(config: TransitionConfig): TransitionResult {
  switch (config.type) {
    case 'fade':
      return { opacity: config.from ?? 0 };
    case 'slide':
    case 'push':
      return { opacity: 1 };
    case 'scale':
      return { transform: `scale(${config.from ?? 0})` };
    case 'wipe':
      return { clipPath: 'inset(0 100% 0 0)' };
    case 'typewriter':
      return { visibleText: '', showCursor: config.cursor !== false };
    case 'spring':
      return { opacity: 0, transform: 'translateY(40px)' };
  }
}

function getFinalState(config: TransitionConfig): TransitionResult {
  switch (config.type) {
    case 'fade':
      return { opacity: config.to ?? 1 };
    case 'slide':
    case 'push':
      return { transform: 'translateX(0) translateY(0)' };
    case 'scale':
      return { transform: `scale(${config.to ?? 1})` };
    case 'wipe':
      return { clipPath: 'inset(0 0 0 0)' };
    case 'typewriter':
      return { visibleText: '', showCursor: false };
    case 'spring':
      return { opacity: 1, transform: 'translateY(0)' };
  }
}

/**
 * Convenience: create an entrance transition (0 -> 1)
 */
export function entranceTransition(config: Omit<TransitionConfig, 'from' | 'to'>): TransitionConfig {
  if (config.type === 'fade') {
    return { ...config, from: 0, to: 1 } as FadeTransitionConfig;
  }
  if (config.type === 'scale') {
    return { ...config, from: 0, to: 1 } as ScaleTransitionConfig;
  }
  return config as TransitionConfig;
}

/**
 * Convenience: create an exit transition (1 -> 0)
 */
export function exitTransition(config: Omit<TransitionConfig, 'from' | 'to'>): TransitionConfig {
  if (config.type === 'fade') {
    return { ...config, from: 1, to: 0 } as FadeTransitionConfig;
  }
  if (config.type === 'scale') {
    return { ...config, from: 1, to: 0 } as ScaleTransitionConfig;
  }
  return config as TransitionConfig;
}
