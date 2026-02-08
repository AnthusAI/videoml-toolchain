import { appendFileSync, existsSync, readFileSync } from "fs";
import { dirname } from "path";
import { ensureDir } from "./util.js";

export type UsageUnitType = "chars" | "tokens" | "seconds" | "frames" | "bytes" | "gb-seconds";

export type UsageEvent = {
  unitType: UsageUnitType;
  quantity: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  provider?: string | null;
};

export type UsageSummary = {
  totalQuantity: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  byUnit: Record<UsageUnitType, { quantity: number; estimatedCost: number; actualCost: number }>;
};

const emptyUnitSummary = () => ({ quantity: 0, estimatedCost: 0, actualCost: 0 });

function summarizeUsage(events: UsageEvent[]): UsageSummary {
  const byUnit: UsageSummary["byUnit"] = {
    chars: emptyUnitSummary(),
    tokens: emptyUnitSummary(),
    seconds: emptyUnitSummary(),
    frames: emptyUnitSummary(),
    bytes: emptyUnitSummary(),
    "gb-seconds": emptyUnitSummary(),
  };
  let totalQuantity = 0;
  let totalEstimatedCost = 0;
  let totalActualCost = 0;
  for (const event of events) {
    const unit = byUnit[event.unitType] ?? emptyUnitSummary();
    unit.quantity += event.quantity;
    unit.estimatedCost += event.estimatedCost ?? 0;
    unit.actualCost += event.actualCost ?? 0;
    byUnit[event.unitType] = unit;
    totalQuantity += event.quantity;
    totalEstimatedCost += event.estimatedCost ?? 0;
    totalActualCost += event.actualCost ?? 0;
  }
  return { totalQuantity, totalEstimatedCost, totalActualCost, byUnit };
}

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
