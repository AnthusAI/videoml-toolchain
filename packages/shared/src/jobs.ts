import type { JobEvent } from "./index.ts";

export type JobEventSummary = {
  jobId: string;
  status?: JobEvent | null;
  progress?: JobEvent | null;
  log?: JobEvent | null;
  latest?: JobEvent | null;
};

export const summarizeJobEvents = (events: JobEvent[]): Map<string, JobEventSummary> => {
  const summaries = new Map<string, JobEventSummary>();
  const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const event of ordered) {
    const summary = summaries.get(event.jobId) ?? { jobId: event.jobId };
    summary.latest = event;
    if (event.type === "status") {
      summary.status = event;
    } else if (event.type === "progress") {
      summary.progress = event;
    } else if (event.type === "log") {
      summary.log = event;
    }
    summaries.set(event.jobId, summary);
  }
  return summaries;
};
