import { ParseError } from "./errors.js";
import type { Config } from "./config.js";
import type { UsageEntry } from "./telemetry.js";

export type UnitRateMap = Record<string, number>;

export type RateGroup = {
  units?: UnitRateMap;
  kinds?: Record<string, { units?: UnitRateMap }>;
};

export type RateCard = RateGroup & {
  providers?: Record<string, RateGroup>;
};

export type UsageCostInput = Omit<UsageEntry, "timestamp">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseUnitRates = (value: unknown, label: string): UnitRateMap | undefined => {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new ParseError(`${label} must be a mapping`);
  }
  const out: UnitRateMap = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new ParseError(`${label}.${key} must be a finite number`);
    }
    if (raw < 0) {
      throw new ParseError(`${label}.${key} must be >= 0`);
    }
    out[key] = raw;
  }
  return out;
};

const parseKinds = (value: unknown, label: string): Record<string, { units?: UnitRateMap }> | undefined => {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new ParseError(`${label} must be a mapping`);
  }
  const out: Record<string, { units?: UnitRateMap }> = {};
  for (const [kind, raw] of Object.entries(value)) {
    if (!isRecord(raw)) {
      throw new ParseError(`${label}.${kind} must be a mapping`);
    }
    out[kind] = {
      units: parseUnitRates(raw.units, `${label}.${kind}.units`),
    };
  }
  return out;
};

const parseRateGroup = (value: unknown, label: string): RateGroup => {
  if (!isRecord(value)) {
    throw new ParseError(`${label} must be a mapping`);
  }
  return {
    units: parseUnitRates(value.units, `${label}.units`),
    kinds: parseKinds(value.kinds, `${label}.kinds`),
  };
};

export function getRateCard(config: Config): RateCard | null {
  const raw = (config as Record<string, unknown>).pricing;
  if (raw == null) {
    return null;
  }
  const base = parseRateGroup(raw, "pricing");
  const providersRaw = (raw as Record<string, unknown>).providers;
  let providers: RateCard["providers"];
  if (providersRaw != null) {
    if (!isRecord(providersRaw)) {
      throw new ParseError("pricing.providers must be a mapping");
    }
    providers = {};
    for (const [provider, value] of Object.entries(providersRaw)) {
      providers[provider] = parseRateGroup(value, `pricing.providers.${provider}`);
    }
  }
  const result: RateCard = { ...base, providers };
  if (!result.units && !result.kinds && !result.providers) {
    return null;
  }
  return result;
}

export function estimateUsageCost(entry: UsageCostInput, rateCard: RateCard | null): number | null {
  if (!rateCard) {
    return null;
  }
  const unit = entry.unitType;
  const kind = entry.kind;
  const provider = entry.provider ?? undefined;

  const providerGroup = provider ? rateCard.providers?.[provider] : undefined;
  const providerKindRate = providerGroup?.kinds?.[kind]?.units?.[unit];
  const providerRate = providerGroup?.units?.[unit];
  const kindRate = rateCard.kinds?.[kind]?.units?.[unit];
  const baseRate = rateCard.units?.[unit];

  const rate = providerKindRate ?? providerRate ?? kindRate ?? baseRate;
  if (rate == null) {
    return null;
  }
  return rate * entry.quantity;
}
