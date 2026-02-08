import type {
  ControlPlaneStore,
  Job,
  GenerationRun,
  RenderRun,
  JobStatus,
} from "./index.js";
import { assertSameOrg } from "./tenancy.js";
import {
  claimJobWithEvent,
  createGenerationRun,
  createJobEvent,
  createRenderRun,
  createUsageEvent,
  listJobs,
  setRenderAgentStatus,
  setGenerationRunStatus,
  setJobStatus,
  setRenderRunStatus,
} from "./control-plane.js";
import type {
  CreateGenerationRunInput,
  CreateJobEventInput,
  CreateRenderRunInput,
  CreateUsageEventInput,
  RecordContext,
} from "./records.js";

export type ExecutionResult = {
  job: Job;
  generationRun?: GenerationRun;
  renderRun?: RenderRun;
};

export const claimNextJob = (
  store: ControlPlaneStore,
  agentId: string,
  activeOrgId: string,
  kind?: Job["kind"] | null,
  context?: Partial<RecordContext>,
): Job | null => {
  const queued = listJobs(store, activeOrgId, "queued")
    .filter((job) => (kind ? job.kind === kind : true))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const next = queued[0];
  if (!next) {
    return null;
  }
  const claimed = claimJobWithEvent(store, next.id, agentId, activeOrgId, undefined, context);
  updateAgentStatusIfExists(store, agentId, "busy", activeOrgId, context);
  return claimed;
};

const requireJob = (store: ControlPlaneStore, jobId: string, activeOrgId: string): Job => {
  const job = store.jobs.find((entry) => entry.id === jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  assertSameOrg(job.orgId, activeOrgId);
  return job;
};

const parseJobInput = (job: Job): Record<string, unknown> => {
  if (!job.inputJson) {
    return {};
  }
  try {
    const parsed = JSON.parse(job.inputJson);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Invalid job input: ${job.id}`);
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid job input: ${job.id}`);
  }
};

const requireField = (jobId: string, input: Record<string, unknown>, field: string): string => {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Job ${jobId} missing ${field}`);
  }
  return value;
};

const ensureClaimed = (
  store: ControlPlaneStore,
  job: Job,
  agentId: string,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Job => {
  if (job.status === "queued") {
    const claimed = claimJobWithEvent(store, job.id, agentId, activeOrgId, undefined, context);
    updateAgentStatusIfExists(store, agentId, "busy", activeOrgId, context);
    return claimed;
  }
  if (job.status === "claimed" && job.claimedByAgentId === agentId) {
    return job;
  }
  throw new Error(`Job ${job.id} not claimable`);
};

const finalizeJob = (
  store: ControlPlaneStore,
  jobId: string,
  status: JobStatus,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Job => {
  return setJobStatus(store, jobId, status, activeOrgId, context);
};

const updateAgentStatusIfExists = (
  store: ControlPlaneStore,
  agentId: string,
  status: "online" | "offline" | "busy",
  activeOrgId: string,
  context?: Partial<RecordContext>,
) => {
  const agent = store.renderAgents.find((entry) => entry.id === agentId);
  if (!agent) {
    return;
  }
  const now = (context?.now ?? (() => new Date()))().toISOString();
  setRenderAgentStatus(store, agentId, status, activeOrgId, now);
};

const recordJobEvent = (
  store: ControlPlaneStore,
  input: CreateJobEventInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
) => {
  createJobEvent(store, input, activeOrgId, context);
};

const recordJobLog = (
  store: ControlPlaneStore,
  jobId: string,
  message: string,
  activeOrgId: string,
  context?: Partial<RecordContext>,
) => {
  recordJobEvent(
    store,
    {
      jobId,
      type: "log",
      message,
    },
    activeOrgId,
    context,
  );
};

const recordJobProgress = (
  store: ControlPlaneStore,
  jobId: string,
  progress: number,
  message: string,
  activeOrgId: string,
  context?: Partial<RecordContext>,
) => {
  recordJobEvent(
    store,
    {
      jobId,
      type: "progress",
      message,
      progress,
    },
    activeOrgId,
    context,
  );
};

const recordUsageEvent = (
  store: ControlPlaneStore,
  input: CreateUsageEventInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
) => {
  createUsageEvent(store, input, activeOrgId, context);
};

export const executeJob = (
  store: ControlPlaneStore,
  jobId: string,
  agentId: string,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): ExecutionResult => {
  const job = requireJob(store, jobId, activeOrgId);
  const claimed = ensureClaimed(store, job, agentId, activeOrgId, context);
  const running = finalizeJob(store, claimed.id, "running", activeOrgId, context);
  recordJobEvent(
    store,
    {
      jobId: running.id,
      type: "status",
      message: "running",
      progress: 0,
    },
    activeOrgId,
    context,
  );
  recordJobLog(store, running.id, "execution started", activeOrgId, context);
  recordJobProgress(store, running.id, 0.1, "started", activeOrgId, context);
  try {
    const input = parseJobInput(running);
    switch (running.kind) {
      case "generate": {
        const videoId = requireField(running.id, input, "videoId");
        const storyboardVersionId = requireField(running.id, input, "storyboardVersionId");
        const generationInput: CreateGenerationRunInput = {
          videoId,
          storyboardVersionId,
          status: "running",
        };
        const generationRun = createGenerationRun(store, generationInput, activeOrgId, context);
        recordJobLog(store, running.id, "generation run created", activeOrgId, context);
        const updatedRun = setGenerationRunStatus(store, generationRun.id, "succeeded", activeOrgId);
        recordJobProgress(store, running.id, 0.7, "generation complete", activeOrgId, context);
        recordUsageEvent(
          store,
          {
            videoId,
            runId: updatedRun.id,
            provider: "openai",
            unitType: "tokens",
            quantity: 1200,
            estimatedCost: 1.2,
          },
          activeOrgId,
          context,
        );
        const succeeded = finalizeJob(store, running.id, "succeeded", activeOrgId, context);
        recordJobEvent(
          store,
          {
            jobId: running.id,
            type: "status",
            message: "succeeded",
            progress: 1,
          },
          activeOrgId,
          context,
        );
        updateAgentStatusIfExists(store, agentId, "online", activeOrgId, context);
        return { job: succeeded, generationRun: updatedRun };
      }
      case "render": {
        const videoId = requireField(running.id, input, "videoId");
        const generationRunId = requireField(running.id, input, "generationRunId");
        const renderInput: CreateRenderRunInput = {
          videoId,
          generationRunId,
          status: "running",
        };
        const renderRun = createRenderRun(store, renderInput, activeOrgId, context);
        recordJobLog(store, running.id, "render run created", activeOrgId, context);
        const updatedRun = setRenderRunStatus(store, renderRun.id, "succeeded", activeOrgId);
        recordJobProgress(store, running.id, 0.7, "render complete", activeOrgId, context);
        recordUsageEvent(
          store,
          {
            videoId,
            runId: updatedRun.id,
            provider: "ffmpeg",
            unitType: "seconds",
            quantity: 30,
            estimatedCost: 0.6,
          },
          activeOrgId,
          context,
        );
        const succeeded = finalizeJob(store, running.id, "succeeded", activeOrgId, context);
        recordJobEvent(
          store,
          {
            jobId: running.id,
            type: "status",
            message: "succeeded",
            progress: 1,
          },
          activeOrgId,
          context,
        );
        updateAgentStatusIfExists(store, agentId, "online", activeOrgId, context);
        return { job: succeeded, renderRun: updatedRun };
      }
      case "resolve":
      case "publish": {
        const succeeded = finalizeJob(store, running.id, "succeeded", activeOrgId, context);
        recordJobEvent(
          store,
          {
            jobId: running.id,
            type: "status",
            message: "succeeded",
            progress: 1,
          },
          activeOrgId,
          context,
        );
        updateAgentStatusIfExists(store, agentId, "online", activeOrgId, context);
        return { job: succeeded };
      }
      default: {
        const succeeded = finalizeJob(store, running.id, "succeeded", activeOrgId, context);
        recordJobEvent(
          store,
          {
            jobId: running.id,
            type: "status",
            message: "succeeded",
            progress: 1,
          },
          activeOrgId,
          context,
        );
        updateAgentStatusIfExists(store, agentId, "online", activeOrgId, context);
        return { job: succeeded };
      }
    }
  } catch (error) {
    finalizeJob(store, running.id, "failed", activeOrgId, context);
    recordJobEvent(
      store,
      {
        jobId: running.id,
        type: "status",
        message: error instanceof Error ? error.message : String(error),
        progress: 0,
      },
      activeOrgId,
      context,
    );
    updateAgentStatusIfExists(store, agentId, "online", activeOrgId, context);
    throw error;
  }
};
