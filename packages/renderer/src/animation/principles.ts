import { clamp, easeOutQuad, spring as springUtil } from '../math.js';

// ============================================
// PRINCIPLE 1: Squash and Stretch
// ============================================

export type SquashStretchConfig = {
  velocity: number;
  squashRatio?: number;
  stretchRatio?: number;
  preserveVolume?: boolean;
};

/**
 * Calculate squash/stretch deformation based on velocity.
 */
export function squashStretch(config: SquashStretchConfig): { scaleX: number; scaleY: number } {
  const { velocity, squashRatio = 0.6, stretchRatio = 1.4, preserveVolume = true } = config;

  // Clamp velocity to [-1, 1]
  const t = clamp(velocity, -1, 1);

  let scaleY: number;
  if (t >= 0) {
    // Positive velocity = stretching (moving)
    scaleY = lerp01(1, stretchRatio, t);
  } else {
    // Negative velocity = squashing (impact)
    scaleY = lerp01(1, squashRatio, -t);
  }

  // Preserve volume: area stays constant
  const scaleX = preserveVolume ? 1 / scaleY : 1;

  return { scaleX, scaleY };
}

// ============================================
// PRINCIPLE 2: Anticipation
// ============================================

export type AnticipationConfig = {
  anticipationFrames: number;
  actionFrames: number;
  pullbackAmount: number;
  target: number;
  from?: number;
};

/**
 * Calculate position with anticipation (pull back before action).
 */
export function anticipation(frame: number, config: AnticipationConfig): number {
  const { anticipationFrames, actionFrames, pullbackAmount, target, from = 0 } = config;
  const totalFrames = anticipationFrames + actionFrames;

  if (frame < 0) return from;
  if (frame >= totalFrames) return target;

  if (frame < anticipationFrames) {
    // Anticipation phase: ease out to pullback position
    const t = frame / anticipationFrames;
    const eased = easeOutQuad(t);
    return from + pullbackAmount * eased;
  }

  // Action phase: spring from anticipation to target
  const actionFrame = frame - anticipationFrames;
  return springUtil({
    frame: actionFrame,
    fps: 30, // Normalized to 30fps
    config: {
      from: from + pullbackAmount,
      to: target,
      stiffness: 300,
      damping: 15,
    },
  });
}

// ============================================
// PRINCIPLE 5: Follow Through & Overlapping Action
// ============================================

export type FollowThroughConfig = {
  primaryProgress: number;
  lagFrames: number;
  drag?: number;
  overshoot?: number;
};

/**
 * Calculate secondary element motion that follows the primary with lag.
 */
export function followThrough(config: FollowThroughConfig): number {
  const { primaryProgress, lagFrames, drag = 0.3, overshoot = 0.1 } = config;

  // Normalize lag to 0-1 progress delay
  const lagProgress = lagFrames / 30; // Assuming 30fps as base

  // Secondary element follows primary with delay and drag
  const delayedProgress = Math.max(0, primaryProgress - lagProgress);
  const draggedProgress = delayedProgress * (1 - drag) + primaryProgress * drag;

  // Add overshoot using damped sine wave
  if (draggedProgress >= 1) {
    const excess = draggedProgress - 1;
    const overshootValue = overshoot * Math.sin(excess * Math.PI * 4) * Math.exp(-excess * 5);
    return 1 + overshootValue;
  }

  return draggedProgress;
}

// ============================================
// PRINCIPLE 7: Arcs
// ============================================

export type Point = { x: number; y: number };

export type ArcConfig = {
  from: Point;
  to: Point;
  arcHeight?: number;
  progress: number;
};

/**
 * Calculate position along a parabolic arc.
 */
export function arcPath(config: ArcConfig): Point {
  const { from, to, arcHeight = 100, progress } = config;

  // Linear interpolation for x
  const x = lerp01(from.x, to.x, progress);

  // Parabolic arc for y: y = -4 * height * t * (t - 1)
  // This creates a parabola that peaks at t=0.5
  const arcOffset = -4 * arcHeight * progress * (progress - 1);
  const linearY = lerp01(from.y, to.y, progress);
  const y = linearY - arcOffset;

  return { x, y };
}

/**
 * Calculate position along a cubic bezier curve.
 */
export function bezierPath(points: [Point, Point, Point, Point], progress: number): Point {
  // De Casteljau's algorithm for cubic bezier
  const t = clamp(progress, 0, 1);

  // First reduction
  const ab = lerpPoint(points[0], points[1], t);
  const bc = lerpPoint(points[1], points[2], t);
  const cd = lerpPoint(points[2], points[3], t);

  // Second reduction
  const abc = lerpPoint(ab, bc, t);
  const bcd = lerpPoint(bc, cd, t);

  // Final point
  return lerpPoint(abc, bcd, t);
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp01(a.x, b.x, t),
    y: lerp01(a.y, b.y, t),
  };
}

function lerp01(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// ============================================
// PRINCIPLE 9: Timing
// ============================================

/**
 * Convert beats to frames.
 * Animators often think in beats (roughly 1/4 second each).
 */
export function beatsToFrames(beats: number, fps: number, beatsPerSecond: number = 4): number {
  const secondsPerBeat = 1 / beatsPerSecond;
  const seconds = beats * secondsPerBeat;
  return Math.round(seconds * fps);
}

/**
 * Generate timing for a sequence of actions.
 */
export function actionTiming(
  actions: Array<{ action: string; beats: number }>,
  fps: number
): Array<{ action: string; startFrame: number; endFrame: number }> {
  const result: Array<{ action: string; startFrame: number; endFrame: number }> = [];
  let currentFrame = 0;

  for (const action of actions) {
    const durationFrames = beatsToFrames(action.beats, fps);
    result.push({
      action: action.action,
      startFrame: currentFrame,
      endFrame: currentFrame + durationFrames,
    });
    currentFrame += durationFrames;
  }

  return result;
}

// ============================================
// PRINCIPLE 10: Exaggeration
// ============================================

/**
 * Amplify a value by an exaggeration factor.
 */
export function exaggerate(value: number, factor: number, center: number = 0): number {
  // Distance from center
  const offset = value - center;
  // Amplify the offset
  return center + offset * factor;
}
