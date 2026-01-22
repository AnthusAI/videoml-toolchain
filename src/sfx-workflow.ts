import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, renameSync } from "fs";
import { join, dirname } from "path";
import { getEnvironment, resolveEnvCacheDir } from "./env.js";
import { BabulusError } from "./errors.js";

export type SfxSelectionState = { picks: Record<string, number> };

export function selectionPath(outDir: string, env?: string | null): string {
  const envName = env ?? getEnvironment();
  return join(resolveEnvCacheDir(outDir, envName), "selections.json");
}

export function loadSelections(outDir: string, env?: string | null): SfxSelectionState {
  const path = selectionPath(outDir, env);
  if (!existsSync(path)) {
    return { picks: {} };
  }
  try {
    const obj = JSON.parse(readFileSync(path, "utf-8"));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new Error("Invalid selections file");
    }
    const picksRaw = (obj as Record<string, unknown>).sfx_picks;
    if (!picksRaw || typeof picksRaw !== "object" || Array.isArray(picksRaw)) {
      return { picks: {} };
    }
    const picks: Record<string, number> = {};
    for (const [key, value] of Object.entries(picksRaw as Record<string, unknown>)) {
      if (typeof value === "number") {
        picks[key] = value;
      }
    }
    return { picks };
  } catch (err) {
    throw new BabulusError(`Invalid selections file: ${path}`);
  }
}

export function saveSelections(outDir: string, state: SfxSelectionState, env?: string | null): void {
  const path = selectionPath(outDir, env);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify({ version: 1, sfx_picks: state.picks }, null, 2) + "\n");
  renameSync(tmp, path);
}

export function setPick(outDir: string, clipId: string, pick: number, env?: string | null): number {
  if (pick < 0) {
    throw new BabulusError("--pick must be >= 0");
  }
  const state = loadSelections(outDir, env);
  const picks = { ...state.picks, [clipId]: pick };
  saveSelections(outDir, { picks }, env);
  return pick;
}

export function bumpPick(outDir: string, clipId: string, delta: number, variants: number, env?: string | null): number {
  if (variants <= 0) {
    throw new BabulusError("variants must be > 0");
  }
  const state = loadSelections(outDir, env);
  const cur = state.picks[clipId] ?? 0;
  const next = (cur + delta + variants) % variants;
  return setPick(outDir, clipId, next, env);
}

export function archiveVariants(outDir: string, clipId: string, keepVariant?: number | null, env?: string | null): number {
  const envName = env ?? getEnvironment();
  const envDir = resolveEnvCacheDir(outDir, envName);
  const liveDir = join(envDir, "sfx");
  if (!existsSync(liveDir)) {
    return 0;
  }
  const archivedDir = join(envDir, "sfx_archived", clipId);
  mkdirSync(archivedDir, { recursive: true });
  let moved = 0;
  for (const entry of readdirSync(liveDir)) {
    if (!entry.startsWith(`${clipId}--v`)) {
      continue;
    }
    const parts = entry.split("--");
    if (parts.length < 3) {
      continue;
    }
    const vpart = parts[1];
    if (!vpart.startsWith("v")) {
      continue;
    }
    const vIndex = Number(vpart.slice(1)) - 1;
    if (!Number.isFinite(vIndex)) {
      continue;
    }
    if (keepVariant != null && vIndex === keepVariant) {
      continue;
    }
    const src = join(liveDir, entry);
    const dest = join(archivedDir, entry);
    renameSync(src, dest);
    moved += 1;
  }
  return moved;
}

export function restoreVariants(outDir: string, clipId: string, env?: string | null): number {
  const envName = env ?? getEnvironment();
  const envDir = resolveEnvCacheDir(outDir, envName);
  const archivedDir = join(envDir, "sfx_archived", clipId);
  const liveDir = join(envDir, "sfx");
  if (!existsSync(archivedDir)) {
    return 0;
  }
  mkdirSync(liveDir, { recursive: true });
  let moved = 0;
  for (const entry of readdirSync(archivedDir)) {
    if (!entry) {
      continue;
    }
    const src = join(archivedDir, entry);
    const dest = join(liveDir, entry);
    renameSync(src, dest);
    moved += 1;
  }
  return moved;
}

export function clearLiveVariants(outDir: string, clipId: string, env?: string | null): number {
  const envName = env ?? getEnvironment();
  const envDir = resolveEnvCacheDir(outDir, envName);
  const liveDir = join(envDir, "sfx");
  if (!existsSync(liveDir)) {
    return 0;
  }
  let deleted = 0;
  for (const entry of readdirSync(liveDir)) {
    if (!entry.startsWith(`${clipId}--v`)) {
      continue;
    }
    rmSync(join(liveDir, entry), { force: true });
    deleted += 1;
  }
  return deleted;
}
