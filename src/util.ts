import { createHash } from "crypto";
import { pathToFileURL } from "url";
import { mkdirSync } from "fs";
import type { PathLike } from "fs";

export function slugify(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const replaced = trimmed.replace(/[^a-z0-9]+/g, "-");
  const collapsed = replaced.replace(/-+/g, "-");
  return collapsed.replace(/^-+|-+$/g, "") || "item";
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortValue(obj[key]);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function hashKey(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function safePrefix(hash: string, length = 12): string {
  return hash.slice(0, length);
}

export function toFileUrl(path: string): string {
  return pathToFileURL(path).href;
}

export function ensureDir(path: PathLike): void {
  mkdirSync(path, { recursive: true });
}
