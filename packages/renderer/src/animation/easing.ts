import type { EasingFn } from '../math.js';

// ============================================
// Cubic Bezier Implementation
// ============================================

/**
 * Create a cubic bezier easing function from control points.
 * Uses Newton-Raphson iteration to solve for t given x.
 *
 * @param x1 - First control point x (0-1)
 * @param y1 - First control point y
 * @param x2 - Second control point x (0-1)
 * @param y2 - Second control point y
 * @returns Easing function
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  // Sample values for fast lookup
  const NEWTON_ITERATIONS = 4;
  const NEWTON_MIN_SLOPE = 0.001;
  const SUBDIVISION_PRECISION = 0.0000001;
  const SUBDIVISION_MAX_ITERATIONS = 10;
  const SPLINE_TABLE_SIZE = 11;
  const SAMPLE_STEP_SIZE = 1.0 / (SPLINE_TABLE_SIZE - 1.0);

  const sampleValues = new Float32Array(SPLINE_TABLE_SIZE);

  function A(aA1: number, aA2: number) {
    return 1.0 - 3.0 * aA2 + 3.0 * aA1;
  }
  function B(aA1: number, aA2: number) {
    return 3.0 * aA2 - 6.0 * aA1;
  }
  function C(aA1: number) {
    return 3.0 * aA1;
  }

  function calcBezier(aT: number, aA1: number, aA2: number) {
    return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
  }

  function getSlope(aT: number, aA1: number, aA2: number) {
    return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
  }

  function binarySubdivide(aX: number, aA: number, aB: number): number {
    let currentX: number;
    let currentT: number;
    let i = 0;
    do {
      currentT = aA + (aB - aA) / 2.0;
      currentX = calcBezier(currentT, x1, x2) - aX;
      if (currentX > 0.0) {
        aB = currentT;
      } else {
        aA = currentT;
      }
    } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
    return currentT;
  }

  function newtonRaphsonIterate(aX: number, aGuessT: number): number {
    for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
      const currentSlope = getSlope(aGuessT, x1, x2);
      if (currentSlope === 0.0) {
        return aGuessT;
      }
      const currentX = calcBezier(aGuessT, x1, x2) - aX;
      aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
  }

  function getTForX(aX: number): number {
    let intervalStart = 0.0;
    let currentSample = 1;
    const lastSample = SPLINE_TABLE_SIZE - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += SAMPLE_STEP_SIZE;
    }
    --currentSample;

    const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    const guessForT = intervalStart + dist * SAMPLE_STEP_SIZE;
    const initialSlope = getSlope(guessForT, x1, x2);

    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + SAMPLE_STEP_SIZE);
    }
  }

  // Precompute samples
  for (let i = 0; i < SPLINE_TABLE_SIZE; ++i) {
    sampleValues[i] = calcBezier(i * SAMPLE_STEP_SIZE, x1, x2);
  }

  return function bezierEasing(t: number): number {
    // Linear case
    if (x1 === y1 && x2 === y2) {
      return t;
    }
    // Edge cases
    if (t === 0) {
      return 0;
    }
    if (t === 1) {
      return 1;
    }
    return calcBezier(getTForX(t), y1, y2);
  };
}

// ============================================
// Penner Easing Functions
// ============================================

// Quartic (t^4)
export const easeInQuart: EasingFn = (t: number) => t * t * t * t;
export const easeOutQuart: EasingFn = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeInOutQuart: EasingFn = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

// Quintic (t^5)
export const easeInQuint: EasingFn = (t: number) => t * t * t * t * t;
export const easeOutQuint: EasingFn = (t: number) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuint: EasingFn = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// Exponential
export const easeInExpo: EasingFn = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutExpo: EasingFn = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutExpo: EasingFn = (t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// Circular
export const easeInCirc: EasingFn = (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2));
export const easeOutCirc: EasingFn = (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc: EasingFn = (t: number) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// Back (overshoot)
export const easeInBack: EasingFn = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

export const easeOutBack: EasingFn = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeInOutBack: EasingFn = (t: number) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

// Elastic
export const easeInElastic: EasingFn = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

export const easeOutElastic: EasingFn = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeInOutElastic: EasingFn = (t: number) => {
  const c5 = (2 * Math.PI) / 4.5;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
};

// Bounce
export const easeInBounce: EasingFn = (t: number) => 1 - easeOutBounce(1 - t);

export const easeOutBounce: EasingFn = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const easeInOutBounce: EasingFn = (t: number) =>
  t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2;

// ============================================
// Named Presets
// ============================================

export const easingPresets = {
  // Quick start, smooth end - good for UI elements appearing
  snappy: cubicBezier(0.5, 0, 0.1, 1),

  // Overshoot and settle - good for playful animations
  bouncy: cubicBezier(0.68, -0.55, 0.265, 1.55),

  // Material Design standard curve
  smooth: cubicBezier(0.4, 0, 0.2, 1),

  // Quick in and out
  sharp: cubicBezier(0.4, 0, 0.6, 1),

  // Dramatic slowdown
  dramatic: cubicBezier(0.7, 0, 0.3, 1),
} as const;
