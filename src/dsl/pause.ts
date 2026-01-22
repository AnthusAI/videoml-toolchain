import type { PauseSpec } from "./types.js";

export type PauseClamp = { min?: number; max?: number };

/**
 * Create a pause spec in seconds.
 *
 * - `pause(0.4)` is a fixed 0.4s pause.
 * - `pause(0.4, 0.1, { min: 0.1, max: 0.8 })` samples a Gaussian pause
 *   with mean 0.4s and std 0.1s, optionally clamped.
 *
 * Gaussian pauses are sampled at generate time. If no `voiceover.seed` is set,
 * each generation will pick new values.
 */
export function pause(seconds: number): PauseSpec;
export function pause(mean: number, std: number, clamp?: PauseClamp): PauseSpec;
export function pause(first: number, second?: number, clamp?: PauseClamp): PauseSpec {
  if (typeof second === "number") {
    return {
      kind: "pause",
      mode: "gaussian",
      mean: first,
      std: second,
      min: clamp?.min,
      max: clamp?.max,
    };
  }
  return { kind: "pause", mode: "fixed", seconds: first };
}

export function normalizePause(value: PauseSpec | number): PauseSpec {
  if (typeof value === "number") {
    return pause(value);
  }
  return value;
}

export function isPauseSpec(value: unknown): value is PauseSpec {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as PauseSpec;
  return v.kind === "pause" && (v.mode === "fixed" || v.mode === "gaussian");
}
