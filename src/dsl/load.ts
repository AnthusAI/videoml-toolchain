import { toFileUrl } from "../util.js";
import { ParseError } from "../errors.js";
import type { CompositionSpec, VideoFileSpec } from "./types.js";

export async function loadVideoFile(path: string): Promise<VideoFileSpec> {
  const url = toFileUrl(path);
  const cacheBust = Date.now().toString(36);
  const mod = await import(`${url}?babulus=${cacheBust}`);
  const exported = mod.default ?? mod.video ?? mod.compositions;
  if (!exported) {
    throw new ParseError(`No default export found in ${path}`);
  }
  const value = await resolveMaybePromise(exported);
  return normalizeVideoSpec(value, path);
}

async function resolveMaybePromise<T>(value: T | Promise<T>): Promise<T> {
  if (value && typeof (value as Promise<T>).then === "function") {
    return await (value as Promise<T>);
  }
  return value as T;
}

function normalizeVideoSpec(value: unknown, path: string): VideoFileSpec {
  if (isVideoFileSpec(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.every(isCompositionSpec)) {
      throw new ParseError(`Invalid composition array export in ${path}`);
    }
    return { compositions: value };
  }
  if (isCompositionSpec(value)) {
    return { compositions: [value] };
  }
  throw new ParseError(`Invalid DSL export in ${path}`);
}

function isVideoFileSpec(value: unknown): value is VideoFileSpec {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as VideoFileSpec;
  return Array.isArray(obj.compositions) && obj.compositions.every(isCompositionSpec);
}

function isCompositionSpec(value: unknown): value is CompositionSpec {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as CompositionSpec;
  return typeof obj.id === "string" && Array.isArray(obj.scenes);
}
