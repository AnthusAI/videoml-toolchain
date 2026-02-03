import type { EasingFn } from '../math.js';
import { easeLinear, clamp } from '../math.js';

// ============================================
// Types
// ============================================

export type KeyframeValue = number | { x: number; y: number } | string;

export type Keyframe<T extends KeyframeValue = number> = {
  frame: number;
  value: T;
  easing?: EasingFn;
};

export type PropertyTimeline<T extends KeyframeValue = number> = {
  property: string;
  keyframes: Keyframe<T>[];
};

export type AnimationTimeline = {
  properties: PropertyTimeline<any>[];
};

// ============================================
// Main Functions
// ============================================

/**
 * Evaluate all properties at a given frame.
 */
export function evaluateTimeline(timeline: AnimationTimeline, frame: number): Record<string, KeyframeValue> {
  const result: Record<string, KeyframeValue> = {};

  for (const prop of timeline.properties) {
    result[prop.property] = evaluateProperty(prop, frame);
  }

  return result;
}

/**
 * Evaluate a single property timeline.
 */
export function evaluateProperty<T extends KeyframeValue>(timeline: PropertyTimeline<T>, frame: number): T {
  const { keyframes } = timeline;

  if (keyframes.length === 0) {
    throw new Error('Property timeline must have at least one keyframe');
  }

  // Before first keyframe
  if (frame <= keyframes[0].frame) {
    return keyframes[0].value;
  }

  // After last keyframe
  if (frame >= keyframes[keyframes.length - 1].frame) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find surrounding keyframes
  let prevKeyframe = keyframes[0];
  let nextKeyframe = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].frame <= frame && keyframes[i + 1].frame >= frame) {
      prevKeyframe = keyframes[i];
      nextKeyframe = keyframes[i + 1];
      break;
    }
  }

  // Interpolate
  const frameDiff = nextKeyframe.frame - prevKeyframe.frame;
  if (frameDiff === 0) {
    return nextKeyframe.value;
  }

  const progress = (frame - prevKeyframe.frame) / frameDiff;
  const easing = nextKeyframe.easing ?? easeLinear;
  const easedProgress = easing(clamp(progress, 0, 1));

  return interpolateValue(prevKeyframe.value, nextKeyframe.value, easedProgress);
}

/**
 * Get the total duration of a timeline (frame of last keyframe).
 */
export function getTimelineDuration(timeline: AnimationTimeline): number {
  let maxFrame = 0;
  for (const prop of timeline.properties) {
    for (const keyframe of prop.keyframes) {
      if (keyframe.frame > maxFrame) {
        maxFrame = keyframe.frame;
      }
    }
  }
  return maxFrame;
}

// ============================================
// Value Interpolation
// ============================================

function interpolateValue<T extends KeyframeValue>(from: T, to: T, progress: number): T {
  // Number interpolation
  if (typeof from === 'number' && typeof to === 'number') {
    return (from + (to - from) * progress) as T;
  }

  // Point interpolation
  if (typeof from === 'object' && typeof to === 'object' && 'x' in from && 'x' in to && 'y' in from && 'y' in to) {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    } as T;
  }

  // String - no interpolation, snap to target at 50%
  if (typeof from === 'string' && typeof to === 'string') {
    return (progress < 0.5 ? from : to) as T;
  }

  return to;
}

// ============================================
// Builder (Optional Convenience)
// ============================================

class TimelineBuilder {
  private timeline: AnimationTimeline = { properties: [] };
  private currentProperty: PropertyTimeline | null = null;

  property(name: string): this {
    this.currentProperty = {
      property: name,
      keyframes: [],
    };
    this.timeline.properties.push(this.currentProperty);
    return this;
  }

  keyframe<T extends KeyframeValue>(frame: number, value: T, easing?: EasingFn): this {
    if (!this.currentProperty) {
      throw new Error('Must call property() before keyframe()');
    }
    this.currentProperty.keyframes.push({ frame, value, easing } as any);
    return this;
  }

  build(): AnimationTimeline {
    return this.timeline;
  }
}

/**
 * Create a timeline using builder pattern.
 *
 * @example
 * const timeline = createTimeline()
 *   .property('x')
 *     .keyframe(0, 0)
 *     .keyframe(30, 100, easeOutCubic)
 *   .property('y')
 *     .keyframe(0, 200)
 *     .keyframe(30, 50, easeOutBounce)
 *   .build();
 */
export function createTimeline(): TimelineBuilder {
  return new TimelineBuilder();
}
