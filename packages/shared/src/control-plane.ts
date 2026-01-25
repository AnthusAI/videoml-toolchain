import type {
  GenerationRun,
  Job,
  JobStatus,
  JobEvent,
  Asset,
  Org,
  OrgMember,
  BillingAccount,
  UserProfile,
  Conversation,
  Message,
  Approval,
  UsageEvent,
  RenderAgent,
  Project,
  RenderRun,
  RunStatus,
  StoryboardVersion,
  Video,
  PublishedVideo, // Add this
} from "./index.ts";
import { assertOrgScope } from "./org-scope.ts";
import {
  buildGenerationRunRecord,
  buildAssetRecord,
  buildJobInput,
  buildJobRecord,
  buildJobEventRecord,
  buildOrgRecord,
  buildOrgMemberRecord,
  buildBillingAccountRecord,
  buildUserProfileRecord,
  buildConversationRecord,
  buildMessageRecord,
  buildApprovalRecord,
  buildUsageEventRecord,
  buildRenderAgentRecord,
  buildProjectRecord,
  buildRenderRunRecord,
  buildStoryboardVersionRecord,
  buildVideoRecord,
  buildPublishedVideoRecord, // Add this
  type CreateGenerationRunInput,
  type CreateAssetInput,
  type CreateJobInput,
  type CreateJobEventInput,
  type CreateOrgInput,
  type CreateOrgMemberInput,
  type CreateBillingAccountInput,
  type CreateUserProfileInput,
  type CreateConversationInput,
  type CreateMessageInput,
  type CreateApprovalInput,
  type CreateUsageEventInput,
  type CreateRenderAgentInput,
  type CreateProjectInput,
  type CreateRenderRunInput,
  type CreateStoryboardVersionInput,
  type CreateVideoInput,
  type CreatePublishedVideoInput, // Add this
  type RecordContext,
} from "./records.ts";
import { updateVideoStatus, type VideoStatus } from "./video-status.ts";

export type ControlPlaneStore = {
  orgs: Org[];
  orgMembers: OrgMember[];
  billingAccounts: BillingAccount[];
  users: UserProfile[];
  conversations: Conversation[];
  messages: Message[];
  approvals: Approval[];
  usageEvents: UsageEvent[];
  renderAgents: RenderAgent[];
  assets: Asset[];
  jobs: Job[];
  jobEvents: JobEvent[];
  projects: Project[];
  videos: Video[];
  storyboardVersions: StoryboardVersion[];
  generationRuns: GenerationRun[];
  renderRuns: RenderRun[];
  publishedVideos: PublishedVideo[]; // Add this
};

export const createControlPlaneStore = (seed?: Partial<ControlPlaneStore>): ControlPlaneStore => {
  return {
    orgs: seed?.orgs ? [...seed.orgs] : [],
    orgMembers: seed?.orgMembers ? [...seed.orgMembers] : [],
    billingAccounts: seed?.billingAccounts ? [...seed.billingAccounts] : [],
    users: seed?.users ? [...seed.users] : [],
    conversations: seed?.conversations ? [...seed.conversations] : [],
    messages: seed?.messages ? [...seed.messages] : [],
    approvals: seed?.approvals ? [...seed.approvals] : [],
    usageEvents: seed?.usageEvents ? [...seed.usageEvents] : [],
    renderAgents: seed?.renderAgents ? [...seed.renderAgents] : [],
    assets: seed?.assets ? [...seed.assets] : [],
    jobs: seed?.jobs ? [...seed.jobs] : [],
    jobEvents: seed?.jobEvents ? [...seed.jobEvents] : [],
    projects: seed?.projects ? [...seed.projects] : [],
    videos: seed?.videos ? [...seed.videos] : [],
    storyboardVersions: seed?.storyboardVersions ? [...seed.storyboardVersions] : [],
    generationRuns: seed?.generationRuns ? [...seed.generationRuns] : [],
    renderRuns: seed?.renderRuns ? [...seed.renderRuns] : [],
    publishedVideos: seed?.publishedVideos ? [...seed.publishedVideos] : [], // Add this
  };
};

const requireProject = (store: ControlPlaneStore, projectId: string, activeOrgId: string): Project => {
  const project = store.projects.find((entry) => entry.id === projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  return assertOrgScope(project, activeOrgId);
};

const requireOrg = (store: ControlPlaneStore, orgId: string): Org => {
  const org = store.orgs.find((entry) => entry.id === orgId);
  if (!org) {
    throw new Error(`Org not found: ${orgId}`);
  }
  return org;
};

const requireVideo = (store: ControlPlaneStore, videoId: string, activeOrgId: string): Video => {
  const video = store.videos.find((entry) => entry.id === videoId);
  if (!video) {
    throw new Error(`Video not found: ${videoId}`);
  }
  return assertOrgScope(video, activeOrgId);
};

const requireConversation = (
  store: ControlPlaneStore,
  conversationId: string,
  activeOrgId: string,
): Conversation => {
  const conversation = store.conversations.find((entry) => entry.id === conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  return assertOrgScope(conversation, activeOrgId);
};

const requireApproval = (store: ControlPlaneStore, approvalId: string, activeOrgId: string): Approval => {
  const approval = store.approvals.find((entry) => entry.id === approvalId);
  if (!approval) {
    throw new Error(`Approval not found: ${approvalId}`);
  }
  return assertOrgScope(approval, activeOrgId);
};

const requireStoryboardVersion = (
  store: ControlPlaneStore,
  storyboardVersionId: string,
  activeOrgId: string,
): StoryboardVersion => {
  const version = store.storyboardVersions.find((entry) => entry.id === storyboardVersionId);
  if (!version) {
    throw new Error(`Storyboard version not found: ${storyboardVersionId}`);
  }
  return assertOrgScope(version, activeOrgId);
};

const requireGenerationRun = (
  store: ControlPlaneStore,
  runId: string,
  activeOrgId: string,
): GenerationRun => {
  const run = store.generationRuns.find((entry) => entry.id === runId);
  if (!run) {
    throw new Error(`Generation run not found: ${runId}`);
  }
  return assertOrgScope(run, activeOrgId);
};

const requireRenderRun = (store: ControlPlaneStore, runId: string, activeOrgId: string): RenderRun => {
  const run = store.renderRuns.find((entry) => entry.id === runId);
  if (!run) {
    throw new Error(`Render run not found: ${runId}`);
  }
  return assertOrgScope(run, activeOrgId);
};

const requireJob = (store: ControlPlaneStore, jobId: string, activeOrgId: string): Job => {
  const job = store.jobs.find((entry) => entry.id === jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  return assertOrgScope(job, activeOrgId);
};

const resolveJobTimestamp = (context?: Partial<RecordContext>): string => {
  return (context?.now ?? (() => new Date()))().toISOString();
};

export const createProject = (
  store: ControlPlaneStore,
  input: CreateProjectInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Project => {
  const record = buildProjectRecord(input, activeOrgId, context);
  store.projects.push(record);
  return record;
};

export const createConversation = (
  store: ControlPlaneStore,
  input: CreateConversationInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Conversation => {
  if (input.videoId) {
    requireVideo(store, input.videoId, activeOrgId);
  }
  const record = buildConversationRecord(input, activeOrgId, context);
  store.conversations.push(record);
  return record;
};

export const createMessage = (
  store: ControlPlaneStore,
  input: CreateMessageInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Message => {
  const conversation = requireConversation(store, input.conversationId, activeOrgId);
  const record = buildMessageRecord(input, activeOrgId, context);
  store.messages.push(record);
  return record;
};

export const createApproval = (
  store: ControlPlaneStore,
  input: CreateApprovalInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Approval => {
  requireVideo(store, input.videoId, activeOrgId);
  const record = buildApprovalRecord(input, activeOrgId, context);
  store.approvals.push(record);
  return record;
};

export const createUsageEvent = (
  store: ControlPlaneStore,
  input: CreateUsageEventInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): UsageEvent => {
  const record = buildUsageEventRecord(input, activeOrgId, context);
  store.usageEvents.push(record);
  return record;
};

export const createRenderAgent = (
  store: ControlPlaneStore,
  input: CreateRenderAgentInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): RenderAgent => {
  const record = buildRenderAgentRecord(input, activeOrgId, context);
  store.renderAgents.push(record);
  return record;
};

export const createOrg = (
  store: ControlPlaneStore,
  input: CreateOrgInput,
  context?: Partial<RecordContext>,
): Org => {
  const record = buildOrgRecord(input, context);
  store.orgs.push(record);
  return record;
};

export const createUserProfile = (
  store: ControlPlaneStore,
  input: CreateUserProfileInput,
  context?: Partial<RecordContext>,
) => {
  const record = buildUserProfileRecord(input, context);
  store.users.push(record);
  return record;
};

export const createBillingAccount = (
  store: ControlPlaneStore,
  input: CreateBillingAccountInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): BillingAccount => {
  requireOrg(store, activeOrgId);
  const record = buildBillingAccountRecord(input, activeOrgId, context);
  store.billingAccounts.push(record);
  return record;
};

export const createOrgMember = (
  store: ControlPlaneStore,
  input: CreateOrgMemberInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): OrgMember => {
  const record = buildOrgMemberRecord(input, activeOrgId, context);
  requireOrg(store, record.orgId);
  store.orgMembers.push(record);
  return record;
};

export const createAsset = (
  store: ControlPlaneStore,
  input: CreateAssetInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Asset => {
  if (input.projectId) {
    requireProject(store, input.projectId, activeOrgId);
  }
  const record = buildAssetRecord(input, activeOrgId, context);
  store.assets.push(record);
  return record;
};

export const createJob = (
  store: ControlPlaneStore,
  input: CreateJobInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Job => {
  const resolved = buildJobInput(input, activeOrgId);
  if (resolved.idempotencyKey) {
    const existing = store.jobs.find(
      (job) => job.orgId === resolved.orgId && job.idempotencyKey === resolved.idempotencyKey,
    );
    if (existing) {
      if (existing.kind !== resolved.kind) {
        throw new Error(`Job idempotency key conflict: ${resolved.idempotencyKey}`);
      }
      return existing;
    }
  }
  const record = buildJobRecord(resolved, activeOrgId, context);
  store.jobs.push(record);
  return record;
};

export const createJobEvent = (
  store: ControlPlaneStore,
  input: CreateJobEventInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): JobEvent => {
  requireJob(store, input.jobId, activeOrgId);
  const record = buildJobEventRecord(input, activeOrgId, context);
  store.jobEvents.push(record);
  return record;
};

export const listOrgs = (store: ControlPlaneStore, userId: string): Org[] => {
  const orgIds = new Set(
    store.orgMembers.filter((membership) => membership.userId === userId).map((membership) => membership.orgId),
  );
  return store.orgs.filter((org) => orgIds.has(org.id));
};

export const listOrgMembers = (store: ControlPlaneStore, activeOrgId: string): OrgMember[] => {
  return store.orgMembers.filter((membership) => membership.orgId === activeOrgId);
};

export const listUserMemberships = (store: ControlPlaneStore, userId: string): OrgMember[] => {
  return store.orgMembers.filter((membership) => membership.userId === userId);
};

export const listConversations = (
  store: ControlPlaneStore,
  activeOrgId: string,
  videoId?: string | null,
): Conversation[] => {
  return store.conversations.filter((conversation) => {
    if (conversation.orgId !== activeOrgId) {
      return false;
    }
    if (videoId) {
      return conversation.videoId === videoId;
    }
    return true;
  });
};

export const listApprovals = (
  store: ControlPlaneStore,
  activeOrgId: string,
  videoId?: string | null,
): Approval[] => {
  return store.approvals.filter((approval) => {
    if (approval.orgId !== activeOrgId) {
      return false;
    }
    if (videoId) {
      return approval.videoId === videoId;
    }
    return true;
  });
};

export const listUsageEvents = (
  store: ControlPlaneStore,
  activeOrgId: string,
  videoId?: string | null,
  runId?: string | null,
): UsageEvent[] => {
  return store.usageEvents.filter((event) => {
    if (event.orgId !== activeOrgId) {
      return false;
    }
    if (videoId && event.videoId !== videoId) {
      return false;
    }
    if (runId && event.runId !== runId) {
      return false;
    }
    return true;
  });
};

export const listRenderAgents = (store: ControlPlaneStore, activeOrgId: string): RenderAgent[] => {
  return store.renderAgents.filter((agent) => agent.orgId === activeOrgId);
};

export const listMessages = (
  store: ControlPlaneStore,
  activeOrgId: string,
  conversationId?: string | null,
): Message[] => {
  return store.messages.filter((message) => {
    if (message.orgId !== activeOrgId) {
      return false;
    }
    if (conversationId) {
      return message.conversationId === conversationId;
    }
    return true;
  });
};

export const listUsers = (store: ControlPlaneStore, orgId?: string | null): UserProfile[] => {
  if (!orgId) {
    return [...store.users];
  }
  const memberIds = new Set(
    store.orgMembers.filter((membership) => membership.orgId === orgId).map((membership) => membership.userId),
  );
  return store.users.filter((user) => memberIds.has(user.id));
};

export const setApprovalStatus = (
  store: ControlPlaneStore,
  approvalId: string,
  status: Approval["status"],
  activeOrgId: string,
  decidedBy?: string | null,
  decidedAt?: string | null,
): Approval => {
  const approval = requireApproval(store, approvalId, activeOrgId);
  const updated: Approval = {
    ...approval,
    status,
    decidedBy: decidedBy ?? approval.decidedBy ?? null,
    decidedAt: decidedAt ?? approval.decidedAt ?? null,
  };
  store.approvals = store.approvals.map((entry) => (entry.id === approvalId ? updated : entry));
  return updated;
};

export const setRenderAgentStatus = (
  store: ControlPlaneStore,
  agentId: string,
  status: RenderAgent["status"],
  activeOrgId: string,
  lastSeenAt?: string | null,
): RenderAgent => {
  const agent = store.renderAgents.find((entry) => entry.id === agentId);
  if (!agent) {
    throw new Error(`Render agent not found: ${agentId}`);
  }
  assertOrgScope(agent, activeOrgId);
  const updated: RenderAgent = {
    ...agent,
    status,
    lastSeenAt: lastSeenAt ?? agent.lastSeenAt ?? null,
  };
  store.renderAgents = store.renderAgents.map((entry) => (entry.id === agentId ? updated : entry));
  return updated;
};

export const listBillingAccounts = (
  store: ControlPlaneStore,
  activeOrgId: string,
): BillingAccount[] => {
  return store.billingAccounts.filter((account) => account.orgId === activeOrgId);
};

export const setBillingVisibility = (
  store: ControlPlaneStore,
  accountId: string,
  usageVisibilityMode: BillingAccount["usageVisibilityMode"],
  activeOrgId: string,
): BillingAccount => {
  const account = store.billingAccounts.find((entry) => entry.id === accountId);
  if (!account) {
    throw new Error(`Billing account not found: ${accountId}`);
  }
  assertOrgScope(account, activeOrgId);
  const updated: BillingAccount = {
    ...account,
    usageVisibilityMode,
  };
  store.billingAccounts = store.billingAccounts.map((entry) => (entry.id === accountId ? updated : entry));
  return updated;
};

export const setOrgMemberRole = (
  store: ControlPlaneStore,
  userId: string,
  role: OrgMember["role"],
  activeOrgId: string,
): OrgMember => {
  const membership = store.orgMembers.find(
    (entry) => entry.orgId === activeOrgId && entry.userId === userId,
  );
  if (!membership) {
    throw new Error(`Org member not found: ${userId}`);
  }
  const updated: OrgMember = { ...membership, role };
  store.orgMembers = store.orgMembers.map((entry) =>
    entry.orgId === activeOrgId && entry.userId === userId ? updated : entry,
  );
  return updated;
};

export const listJobs = (
  store: ControlPlaneStore,
  activeOrgId: string,
  status?: JobStatus | null,
): Job[] => {
  return store.jobs.filter((job) => {
    if (job.orgId !== activeOrgId) {
      return false;
    }
    if (status) {
      return job.status === status;
    }
    return true;
  });
};

export const listJobEvents = (
  store: ControlPlaneStore,
  activeOrgId: string,
  jobId?: string | null,
): JobEvent[] => {
  return store.jobEvents.filter((event) => {
    if (event.orgId !== activeOrgId) {
      return false;
    }
    if (jobId) {
      return event.jobId === jobId;
    }
    return true;
  });
};

export const listAssets = (
  store: ControlPlaneStore,
  activeOrgId: string,
  projectId?: string | null,
): Asset[] => {
  return store.assets.filter((asset) => {
    if (asset.orgId !== activeOrgId) {
      return false;
    }
    if (!projectId) {
      return true;
    }
    return asset.projectId === projectId || asset.projectId == null;
  });
};

export const claimJob = (
  store: ControlPlaneStore,
  jobId: string,
  agentId: string,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Job => {
  const job = requireJob(store, jobId, activeOrgId);
  if (job.status !== "queued") {
    throw new Error(`Job not available: ${jobId}`);
  }
  const updated: Job = {
    ...job,
    status: "claimed",
    claimedByAgentId: agentId,
    updatedAt: resolveJobTimestamp(context),
  };
  store.jobs = store.jobs.map((entry) => (entry.id === jobId ? updated : entry));
  return updated;
};

export const claimJobWithEvent = (
  store: ControlPlaneStore,
  jobId: string,
  agentId: string,
  activeOrgId: string,
  options?: { message?: string | null },
  context?: Partial<RecordContext>,
): Job => {
  const updated = claimJob(store, jobId, agentId, activeOrgId, context);
  createJobEvent(
    store,
    {
      jobId: updated.id,
      type: "status",
      message: options?.message ?? "claimed",
    },
    activeOrgId,
    context,
  );
  return updated;
};

export const setJobStatus = (
  store: ControlPlaneStore,
  jobId: string,
  status: JobStatus,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Job => {
  const job = requireJob(store, jobId, activeOrgId);
  const updated: Job = {
    ...job,
    status,
    updatedAt: resolveJobTimestamp(context),
  };
  store.jobs = store.jobs.map((entry) => (entry.id === jobId ? updated : entry));
  return updated;
};

export const setJobStatusWithEvent = (
  store: ControlPlaneStore,
  jobId: string,
  status: JobStatus,
  activeOrgId: string,
  options?: { message?: string | null; progress?: number | null },
  context?: Partial<RecordContext>,
): Job => {
  const updated = setJobStatus(store, jobId, status, activeOrgId, context);
  const message = options?.message ?? status;
  const progress =
    options?.progress ??
    (status === "succeeded" ? 1 : status === "failed" ? 0 : null);
  createJobEvent(
    store,
    {
      jobId: updated.id,
      type: "status",
      message,
      progress,
    },
    activeOrgId,
    context,
  );
  return updated;
};

export const listProjects = (store: ControlPlaneStore, activeOrgId: string): Project[] => {
  return store.projects.filter((project) => project.orgId === activeOrgId);
};

export const createVideo = (
  store: ControlPlaneStore,
  input: CreateVideoInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Video => {
  requireProject(store, input.projectId, activeOrgId);
  const record = buildVideoRecord(input, activeOrgId, context);
  store.videos.push(record);
  return record;
};

export const listVideos = (
  store: ControlPlaneStore,
  activeOrgId: string,
  projectId?: string | null,
): Video[] => {
  return store.videos.filter((video) => {
    if (video.orgId !== activeOrgId) {
      return false;
    }
    if (projectId) {
      return video.projectId === projectId;
    }
    return true;
  });
};

export const setVideoStatus = (
  store: ControlPlaneStore,
  videoId: string,
  status: VideoStatus,
  activeOrgId: string,
): Video => {
  const current = requireVideo(store, videoId, activeOrgId);
  const updated = updateVideoStatus(current, status);
  store.videos = store.videos.map((video) => (video.id === videoId ? updated : video));
  return updated;
};

export const setActiveStoryboardVersion = (
  store: ControlPlaneStore,
  videoId: string,
  storyboardVersionId: string,
  activeOrgId: string,
): Video => {
  const video = requireVideo(store, videoId, activeOrgId);
  const version = requireStoryboardVersion(store, storyboardVersionId, activeOrgId);
  if (version.videoId !== video.id) {
    throw new Error(`Storyboard version ${storyboardVersionId} does not belong to video ${videoId}`);
  }
  const updated: Video = {
    ...video,
    activeStoryboardVersionId: storyboardVersionId,
  };
  store.videos = store.videos.map((entry) => (entry.id === videoId ? updated : entry));
  return updated;
};

export const createStoryboardVersion = (
  store: ControlPlaneStore,
  input: CreateStoryboardVersionInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): StoryboardVersion => {
  requireVideo(store, input.videoId, activeOrgId);
  const record = buildStoryboardVersionRecord(input, activeOrgId, context);
  store.storyboardVersions.push(record);
  return record;
};

export const listStoryboardVersions = (
  store: ControlPlaneStore,
  activeOrgId: string,
  videoId?: string | null,
): StoryboardVersion[] => {
  return store.storyboardVersions.filter((version) => {
    if (version.orgId !== activeOrgId) {
      return false;
    }
    if (videoId) {
      return version.videoId === videoId;
    }
    return true;
  });
};

export const createGenerationRun = (
  store: ControlPlaneStore,
  input: CreateGenerationRunInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): GenerationRun => {
  requireVideo(store, input.videoId, activeOrgId);
  const record = buildGenerationRunRecord(input, activeOrgId, context);
  store.generationRuns.push(record);
  return record;
};

export const listGenerationRuns = (
  store: ControlPlaneStore,
  activeOrgId: string,
  videoId?: string | null,
): GenerationRun[] => {
  return store.generationRuns.filter((run) => {
    if (run.orgId !== activeOrgId) {
      return false;
    }
    if (videoId) {
      return run.videoId === videoId;
    }
    return true;
  });
};

export const createRenderRun = (
  store: ControlPlaneStore,
  input: CreateRenderRunInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): RenderRun => {
  requireGenerationRun(store, input.generationRunId, activeOrgId);
  const record = buildRenderRunRecord(input, activeOrgId, context);
  store.renderRuns.push(record);
  return record;
};

export const setGenerationRunStatus = (
  store: ControlPlaneStore,
  runId: string,
  status: RunStatus,
  activeOrgId: string,
): GenerationRun => {
  const run = requireGenerationRun(store, runId, activeOrgId);
  const updated: GenerationRun = { ...run, status };
  store.generationRuns = store.generationRuns.map((entry) => (entry.id === runId ? updated : entry));
  return updated;
};

export const setRenderRunStatus = (
  store: ControlPlaneStore,
  runId: string,
  status: RunStatus,
  activeOrgId: string,
): RenderRun => {
  const run = requireRenderRun(store, runId, activeOrgId);
  const updated: RenderRun = { ...run, status };
  store.renderRuns = store.renderRuns.map((entry) => (entry.id === runId ? updated : entry));
  return updated;
};

export const createPublishedVideo = (
  store: ControlPlaneStore,
  input: CreatePublishedVideoInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): PublishedVideo => {
  requireVideo(store, input.videoId, activeOrgId);
  requireRenderRun(store, input.renderRunId, activeOrgId);
  const record = buildPublishedVideoRecord(input, activeOrgId, context);
  store.publishedVideos.push(record);
  return record;
};

export const listPublishedVideos = (
  store: ControlPlaneStore,
  activeOrgId: string,
  videoId?: string | null,
): PublishedVideo[] => {
  return store.publishedVideos.filter((video) => {
    if (video.orgId !== activeOrgId) {
      return false;
    }
    if (videoId) {
      return video.videoId === videoId;
    }
    return true;
  });
};

export const getPublishedVideo = (
  store: ControlPlaneStore,
  publishedVideoId: string,
  activeOrgId: string,
): PublishedVideo | null => {
  const video = store.publishedVideos.find(v => v.id === publishedVideoId);
  if (!video || video.orgId !== activeOrgId) {
    return null;
  }
  return video;
};

export const updatePublishedVideo = (
  store: ControlPlaneStore,
  publishedVideoId: string,
  updates: Partial<PublishedVideo>,
  activeOrgId: string,
): PublishedVideo => {
  const video = getPublishedVideo(store, publishedVideoId, activeOrgId);
  if (!video) {
    throw new Error(`Published video ${publishedVideoId} not found or access denied`);
  }

  const updated: PublishedVideo = { ...video, ...updates, id: video.id, orgId: video.orgId };
  store.publishedVideos = store.publishedVideos.map((v) => (v.id === publishedVideoId ? updated : v));
  return updated;
};

export const listRenderRuns = (
  store: ControlPlaneStore,
  activeOrgId: string,
  generationRunId?: string | null,
): RenderRun[] => {
  return store.renderRuns.filter((run) => {
    if (run.orgId !== activeOrgId) {
      return false;
    }
    if (generationRunId) {
      return run.generationRunId === generationRunId;
    }
    return true;
  });
};
