import { appendFileSync, existsSync, readFileSync } from "fs";
import { dirname } from "path";
import { summarizeUsage, type UsageEvent, type UsageSummary } from "../packages/telemetry/src/index.js";
import { ensureDir } from "./util.js";

export type UsageEntry = UsageEvent & {
  timestamp: string;
  kind: "tts" | "sfx" | "music" | "resolve" | "render" | "other";
  compositionId?: string;
  sceneId?: string;
  cueId?: string;
  clipId?: string;
  segmentIndex?: number;
  model?: string | null;
  voice?: string | null;
  env?: string;
  promptChars?: number;
};

export type UsageLedger = {
  path: string;
  entries: UsageEntry[];
};

export type UsageBreakdown = {
  total: UsageSummary;
  byKind: Record<string, UsageSummary>;
  byProvider: Record<string, UsageSummary>;
};

export function createUsageLedger(path: string): UsageLedger {
  ensureDir(dirname(path));
  return { path, entries: [] };
}

export function recordUsage(
  ledger: UsageLedger,
  entry: Omit<UsageEntry, "timestamp"> & { timestamp?: string },
): UsageEntry {
  const full: UsageEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    ...entry,
  };
  ledger.entries.push(full);
  appendFileSync(ledger.path, JSON.stringify(full) + "\n", "utf-8");
  return full;
}

export function loadUsageEntries(path: string): UsageEntry[] {
  if (!existsSync(path)) {
    return [];
  }
  const text = readFileSync(path, "utf-8").trim();
  if (!text) {
    return [];
  }
  return text
    .split("\n")
    .map((line) => JSON.parse(line) as UsageEntry);
}

export function summarizeUsageEntries(entries: UsageEntry[]): UsageSummary {
  return summarizeUsage(entries);
}

export function summarizeUsageEntriesDetailed(entries: UsageEntry[]): UsageBreakdown {
  const byKindEntries: Record<string, UsageEntry[]> = {};
  const byProviderEntries: Record<string, UsageEntry[]> = {};

  for (const entry of entries) {
    const kind = entry.kind ?? "unknown";
    const provider = entry.provider ?? "unknown";
    (byKindEntries[kind] ??= []).push(entry);
    (byProviderEntries[provider] ??= []).push(entry);
  }

  const byKind: UsageBreakdown["byKind"] = {};
  for (const [kind, group] of Object.entries(byKindEntries)) {
    byKind[kind] = summarizeUsage(group);
  }

  const byProvider: UsageBreakdown["byProvider"] = {};
  for (const [provider, group] of Object.entries(byProviderEntries)) {
    byProvider[provider] = summarizeUsage(group);
  }

  return { total: summarizeUsage(entries), byKind, byProvider };
}

export function summarizeUsageFile(path: string): UsageSummary {
  return summarizeUsageEntries(loadUsageEntries(path));
}

export function summarizeUsageFileDetailed(path: string): UsageBreakdown {
  return summarizeUsageEntriesDetailed(loadUsageEntries(path));
}
