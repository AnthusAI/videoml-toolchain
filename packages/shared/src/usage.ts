import type { UsageEvent } from "./index.js";

export type UsageSummary = {
  tokens: number;
  chars: number;
  seconds: number;
  frames: number;
  bytes: number;
  estimatedCost: number;
  actualCost: number;
};

export const summarizeUsageEvents = (events: UsageEvent[]): UsageSummary => {
  return events.reduce<UsageSummary>(
    (summary, event) => {
      switch (event.unitType) {
        case "tokens":
          summary.tokens += event.quantity;
          break;
        case "chars":
          summary.chars += event.quantity;
          break;
        case "seconds":
          summary.seconds += event.quantity;
          break;
        case "frames":
          summary.frames += event.quantity;
          break;
        case "bytes":
          summary.bytes += event.quantity;
          break;
      }
      if (event.estimatedCost) {
        summary.estimatedCost += event.estimatedCost;
      }
      if (event.actualCost) {
        summary.actualCost += event.actualCost;
      }
      return summary;
    },
    { tokens: 0, chars: 0, seconds: 0, frames: 0, bytes: 0, estimatedCost: 0, actualCost: 0 },
  );
};
