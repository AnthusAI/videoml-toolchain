import { clamp } from '../math.js';

// ============================================
// Types
// ============================================

export type StaggerPattern = 'linear' | 'reverse' | 'from-center' | 'from-edges' | 'random' | 'row' | 'column' | 'diagonal' | 'spiral';

export type StaggerConfig = {
  count: number;
  delayFrames: number;
  pattern?: StaggerPattern;
  seed?: number;
};

// ============================================
// Main Functions
// ============================================

/**
 * Get the start frame offset for each item in a staggered sequence.
 *
 * @example
 * const delays = stagger({ count: 4, delayFrames: 10, pattern: 'linear' });
 * // delays = [0, 10, 20, 30]
 */
export function stagger(config: StaggerConfig): number[] {
  const { count, delayFrames, pattern = 'linear', seed } = config;
  const delays: number[] = [];

  switch (pattern) {
    case 'linear':
      for (let i = 0; i < count; i++) {
        delays.push(i * delayFrames);
      }
      break;

    case 'reverse':
      for (let i = 0; i < count; i++) {
        delays.push((count - 1 - i) * delayFrames);
      }
      break;

    case 'from-center': {
      const center = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        delays.push(Math.abs(i - center) * delayFrames);
      }
      break;
    }

    case 'from-edges': {
      const center = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const distanceFromCenter = Math.abs(i - center);
        delays.push((center - distanceFromCenter) * delayFrames);
      }
      break;
    }

    case 'random': {
      const rng = seededRandom(seed ?? 42);
      const indices = Array.from({ length: count }, (_, i) => i);

      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      // Map original index to delay
      for (let i = 0; i < count; i++) {
        delays[i] = indices.indexOf(i) * delayFrames;
      }
      break;
    }
  }

  return delays;
}

/**
 * Calculate animation progress for a specific item in a staggered group.
 * Returns 0 before item starts, 0-1 during animation, 1 after completion.
 *
 * @param itemIndex - Which item (0-based)
 * @param frame - Current frame
 * @param config - Stagger config plus animation duration
 */
export function staggeredProgress(
  itemIndex: number,
  frame: number,
  config: StaggerConfig & { durationFrames: number }
): number {
  const delays = stagger(config);
  const itemStartFrame = delays[itemIndex];
  const itemFrame = frame - itemStartFrame;

  if (itemFrame < 0) return 0;
  if (itemFrame >= config.durationFrames) return 1;

  return itemFrame / config.durationFrames;
}

/**
 * Helper to determine which items are currently animating/visible.
 *
 * @returns Array of { index, progress, state } for each item
 */
export function staggerState(
  frame: number,
  config: StaggerConfig & { durationFrames: number }
): Array<{ index: number; progress: number; state: 'waiting' | 'animating' | 'complete' }> {
  const delays = stagger(config);
  const results: Array<{ index: number; progress: number; state: 'waiting' | 'animating' | 'complete' }> = [];

  for (let i = 0; i < config.count; i++) {
    const itemStartFrame = delays[i];
    const itemEndFrame = itemStartFrame + config.durationFrames;

    let state: 'waiting' | 'animating' | 'complete';
    let progress: number;

    if (frame < itemStartFrame) {
      state = 'waiting';
      progress = 0;
    } else if (frame >= itemEndFrame) {
      state = 'complete';
      progress = 1;
    } else {
      state = 'animating';
      progress = (frame - itemStartFrame) / config.durationFrames;
    }

    results.push({ index: i, progress, state });
  }

  return results;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Seeded pseudo-random number generator (mulberry32)
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
