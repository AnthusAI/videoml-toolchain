import type {
  ExecutionMode,
  GenerationRun,
  Job,
  JobEvent,
  JobEventType,
  JobStatus,
  Project,
  RenderRun,
  RunStatus,
  StoryboardVersion,
  Asset,
  Org,
  OrgMember,
  OrgMemberRole,
  UserProfile,
  BillingAccount,
  Conversation,
  Message,
  Approval,
  UsageEvent,
  RenderAgent,
  Video,
  VideoStatus,
  PublishedVideo, // Add this
} from "./index.js";
import { applyOrgScope } from "./org-scope.js";
import { buildAssetKey, buildGenerationArtifactKeys, buildRenderArtifactKeys } from "./storage.js";

export type CreateProjectInput = {
  orgId?: string | null;
  name: string;
  templateId?: string | null;
};

export type CreateOrgInput = {
  name: string;
  planTier?: string | null;
};

export type CreateOrgMemberInput = {
  orgId?: string | null;
  userId: string;
  role?: OrgMemberRole | null;
};

export type CreateUserProfileInput = {
  email?: string | null;
  displayName?: string | null;
};

export type CreateBillingAccountInput = {
  orgId?: string | null;
  planId?: string | null;
  billingMode: BillingAccount["billingMode"];
  usageVisibilityMode?: BillingAccount["usageVisibilityMode"] | null;
};

export type CreateVideoInput = {
  orgId?: string | null;
  projectId: string;
  title: string;
  status?: VideoStatus | null;
  activeStoryboardVersionId?: string | null;
};

export type CreatePublishedVideoInput = {
  orgId?: string | null;
  videoId: string;
  renderRunId: string;
  slug: string;
  accessPolicy: PublishedVideo["accessPolicy"];
  passwordHash?: string | null;
  viewCount?: number | null;
  publishedAt?: string | null;
};

export type CreateConversationInput = {
  orgId?: string | null;
  videoId?: string | null;
};

export type CreateMessageInput = {
  orgId?: string | null;
  conversationId: string;
  role: Message["role"];
  content: string;
};

export type CreateApprovalInput = {
  orgId?: string | null;
  videoId: string;
  kind: string;
  status?: Approval["status"] | null;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
};

export type CreateUsageEventInput = {
  orgId?: string | null;
  videoId?: string | null;
  runId?: string | null;
  provider?: string | null;
  unitType: UsageEvent["unitType"];
  quantity: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
};

export type CreateRenderAgentInput = {
  orgId?: string | null;
  label?: string | null;
  status?: RenderAgent["status"] | null;
  lastSeenAt?: string | null;
};

export type CreateStoryboardVersionInput = {
  orgId?: string | null;
  videoId: string;
  sourceText: string;
  parentVersionId?: string | null;
  createdBy?: string | null;
};

export type CreateGenerationRunInput = {
  orgId?: string | null;
  videoId: string;
  storyboardVersionId: string;
  status?: RunStatus | null;
  scriptArtifactKey?: string | null;
  timelineArtifactKey?: string | null;
  audioArtifactKey?: string | null;
  logsArtifactKey?: string | null;
};

export type CreateRenderRunInput = {
  orgId?: string | null;
  videoId: string;
  generationRunId: string;
  status?: RunStatus | null;
  mp4ArtifactKey?: string | null;
  stillsArtifactPrefix?: string | null;
  logsArtifactKey?: string | null;
};

export type CreateAssetInput = {
  orgId?: string | null;
  projectId?: string | null;
  kind: Asset["kind"];
  sha256?: string | null;
  fileName?: string | null;
  storageKey?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export type RecordContext = {
  now: () => Date;
  id: () => string;
};

export type CreateJobInput = {
  orgId?: string | null;
  kind: Job["kind"];
  status?: JobStatus | null;
  idempotencyKey?: string | null;
  claimedByAgentId?: string | null;
  executionMode?: ExecutionMode | null;
  inputJson?: string | null;
};

export type CreateJobEventInput = {
  orgId?: string | null;
  jobId: string;
  type: JobEventType;
  message?: string | null;
  progress?: number | null;
};

const requireText = (label: string, value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
};

const requireNumber = (label: string, value: number): number => {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a number`);
  }
  return value;
};

const resolveStatus = <T extends string>(value: T | null | undefined, fallback: T): T => {
  return value ?? fallback;
};

const resolveRole = (value: OrgMemberRole | null | undefined): OrgMemberRole => {
  return value ?? "viewer";
};

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
};

const normalizeOptionalNumber = (label: string, value: number | null | undefined): number | null => {
  if (value == null) {
    return null;
  }
  return requireNumber(label, value);
};

const resolveContext = (context?: Partial<RecordContext>): RecordContext => {
  const generateId = () => {
    if (typeof globalThis === "object") {
      const maybeCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
      if (maybeCrypto?.randomUUID) {
        return maybeCrypto.randomUUID();
      }
    }
    return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  };
  return {
    now: context?.now ?? (() => new Date()),
    id: context?.id ?? generateId,
  };
};

const resolveAssetStorageKey = (
  input: CreateAssetInput & { orgId: string },
  resolvedKind: Asset["kind"],
): string => {
  if (input.storageKey) {
    return requireText("Asset storage key", input.storageKey);
  }
  const sha256 = requireText("Asset sha256", input.sha256 ?? "");
  const fileName = requireText("Asset file name", input.fileName ?? "");
  return buildAssetKey({
    orgId: input.orgId,
    projectId: input.projectId ?? null,
    kind: resolvedKind,
    sha256,
    fileName,
  });
};

export const buildOrgInput = (input: CreateOrgInput): CreateOrgInput => {
  return {
    name: requireText("Org name", input.name),
    planTier: normalizeOptionalText(input.planTier ?? null),
  };
};

export const buildOrgRecord = (input: CreateOrgInput, context?: Partial<RecordContext>): Org => {
  const resolved = buildOrgInput(input);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    name: resolved.name,
    planTier: resolved.planTier ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildOrgMemberInput = (
  input: CreateOrgMemberInput,
  activeOrgId: string,
): CreateOrgMemberInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    userId: requireText("User id", scoped.userId),
    role: resolveRole(scoped.role),
  };
};

export const buildOrgMemberRecord = (
  input: CreateOrgMemberInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): OrgMember => {
  const resolved = buildOrgMemberInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    orgId: resolved.orgId,
    userId: resolved.userId,
    role: resolveRole(resolved.role),
    createdAt: ctx.now().toISOString(),
  };
};

export const buildUserProfileInput = (input: CreateUserProfileInput): CreateUserProfileInput => {
  return {
    email: normalizeOptionalText(input.email ?? null),
    displayName: normalizeOptionalText(input.displayName ?? null),
  };
};

export const buildUserProfileRecord = (
  input: CreateUserProfileInput,
  context?: Partial<RecordContext>,
): UserProfile => {
  const resolved = buildUserProfileInput(input);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    email: resolved.email ?? null,
    displayName: resolved.displayName ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildBillingAccountInput = (
  input: CreateBillingAccountInput,
  activeOrgId: string,
): CreateBillingAccountInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  const billingMode = requireText("Billing mode", scoped.billingMode) as BillingAccount["billingMode"];
  return {
    ...scoped,
    billingMode,
    usageVisibilityMode: scoped.usageVisibilityMode ?? "redacted",
    planId: normalizeOptionalText(scoped.planId ?? null),
  };
};

export const buildBillingAccountRecord = (
  input: CreateBillingAccountInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): BillingAccount => {
  const resolved = buildBillingAccountInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    planId: resolved.planId ?? null,
    billingMode: resolved.billingMode,
    usageVisibilityMode: resolved.usageVisibilityMode ?? "redacted",
    createdAt: ctx.now().toISOString(),
  };
};

export const buildConversationInput = (
  input: CreateConversationInput,
  activeOrgId: string,
): CreateConversationInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: normalizeOptionalText(scoped.videoId ?? null),
  };
};

export const buildConversationRecord = (
  input: CreateConversationInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Conversation => {
  const resolved = buildConversationInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    videoId: resolved.videoId ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildMessageInput = (
  input: CreateMessageInput,
  activeOrgId: string,
): CreateMessageInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    conversationId: requireText("Conversation id", scoped.conversationId),
    role: requireText("Message role", scoped.role) as Message["role"],
    content: requireText("Message content", scoped.content),
  };
};

export const buildMessageRecord = (
  input: CreateMessageInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Message => {
  const resolved = buildMessageInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    conversationId: resolved.conversationId,
    role: resolved.role,
    content: resolved.content,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildApprovalInput = (
  input: CreateApprovalInput,
  activeOrgId: string,
): CreateApprovalInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: requireText("Video id", scoped.videoId),
    kind: requireText("Approval kind", scoped.kind),
    status: resolveStatus(scoped.status, "pending"),
    requestedBy: normalizeOptionalText(scoped.requestedBy ?? null),
    decidedBy: normalizeOptionalText(scoped.decidedBy ?? null),
    decidedAt: normalizeOptionalText(scoped.decidedAt ?? null),
  };
};

export const buildApprovalRecord = (
  input: CreateApprovalInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Approval => {
  const resolved = buildApprovalInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    kind: resolved.kind,
    status: resolveStatus(resolved.status, "pending"),
    requestedBy: resolved.requestedBy ?? null,
    decidedBy: resolved.decidedBy ?? null,
    decidedAt: resolved.decidedAt ?? null,
  };
};

export const buildUsageEventInput = (
  input: CreateUsageEventInput,
  activeOrgId: string,
): CreateUsageEventInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: normalizeOptionalText(scoped.videoId ?? null),
    runId: normalizeOptionalText(scoped.runId ?? null),
    provider: normalizeOptionalText(scoped.provider ?? null),
    unitType: requireText("Usage unit type", scoped.unitType) as UsageEvent["unitType"],
    quantity: requireNumber("Usage quantity", scoped.quantity),
    estimatedCost: scoped.estimatedCost ?? null,
    actualCost: scoped.actualCost ?? null,
  };
};

export const buildUsageEventRecord = (
  input: CreateUsageEventInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): UsageEvent => {
  const resolved = buildUsageEventInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    videoId: resolved.videoId ?? null,
    runId: resolved.runId ?? null,
    provider: resolved.provider ?? null,
    unitType: resolved.unitType,
    quantity: resolved.quantity,
    estimatedCost: resolved.estimatedCost ?? null,
    actualCost: resolved.actualCost ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildRenderAgentInput = (
  input: CreateRenderAgentInput,
  activeOrgId: string,
): CreateRenderAgentInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    label: normalizeOptionalText(scoped.label ?? null),
    status: resolveStatus(scoped.status, "offline"),
    lastSeenAt: normalizeOptionalText(scoped.lastSeenAt ?? null),
  };
};

export const buildRenderAgentRecord = (
  input: CreateRenderAgentInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): RenderAgent => {
  const resolved = buildRenderAgentInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    label: resolved.label ?? null,
    status: resolveStatus(resolved.status, "offline"),
    lastSeenAt: resolved.lastSeenAt ?? null,
  };
};

export const buildProjectInput = (input: CreateProjectInput, activeOrgId: string): CreateProjectInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    name: requireText("Project name", scoped.name),
  };
};

export const buildProjectRecord = (
  input: CreateProjectInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Project => {
  const resolved = buildProjectInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    name: resolved.name,
    templateId: resolved.templateId ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildVideoInput = (input: CreateVideoInput, activeOrgId: string): CreateVideoInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    projectId: requireText("Project id", scoped.projectId),
    title: requireText("Video title", scoped.title),
    status: resolveStatus(scoped.status, "draft"),
  };
};

export const buildVideoRecord = (
  input: CreateVideoInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Video => {
  const resolved = buildVideoInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    projectId: resolved.projectId,
    title: resolved.title,
    status: resolveStatus(resolved.status, "draft"),
    activeStoryboardVersionId: resolved.activeStoryboardVersionId ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildPublishedVideoInput = (
  input: CreatePublishedVideoInput,
  activeOrgId: string,
): CreatePublishedVideoInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: requireText("Video id", scoped.videoId),
    renderRunId: requireText("Render run id", scoped.renderRunId),
    slug: requireText("Slug", scoped.slug),
    accessPolicy: requireText("Access policy", scoped.accessPolicy) as PublishedVideo["accessPolicy"],
    passwordHash: normalizeOptionalText(scoped.passwordHash ?? null),
    viewCount: normalizeOptionalNumber("View count", scoped.viewCount ?? 0),
    publishedAt: normalizeOptionalText(scoped.publishedAt ?? null),
  };
};

export const buildPublishedVideoRecord = (
  input: CreatePublishedVideoInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): PublishedVideo => {
  const resolved = buildPublishedVideoInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    renderRunId: resolved.renderRunId,
    slug: resolved.slug,
    accessPolicy: resolved.accessPolicy,
    passwordHash: resolved.passwordHash ?? null,
    viewCount: resolved.viewCount ?? 0,
    publishedAt: resolved.publishedAt ?? ctx.now().toISOString(),
  };
};

export const buildStoryboardVersionInput = (
  input: CreateStoryboardVersionInput,
  activeOrgId: string,
): CreateStoryboardVersionInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: requireText("Video id", scoped.videoId),
    sourceText: requireText("Storyboard source", scoped.sourceText),
  };
};

export const buildStoryboardVersionRecord = (
  input: CreateStoryboardVersionInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): StoryboardVersion => {
  const resolved = buildStoryboardVersionInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    sourceText: resolved.sourceText,
    parentVersionId: resolved.parentVersionId ?? null,
    createdBy: resolved.createdBy ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildGenerationRunInput = (
  input: CreateGenerationRunInput,
  activeOrgId: string,
): CreateGenerationRunInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: requireText("Video id", scoped.videoId),
    storyboardVersionId: requireText("Storyboard version id", scoped.storyboardVersionId),
    status: resolveStatus(scoped.status, "queued"),
  };
};

export const buildGenerationRunRecord = (
  input: CreateGenerationRunInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): GenerationRun => {
  const resolved = buildGenerationRunInput(input, activeOrgId);
  const ctx = resolveContext(context);
  const id = ctx.id();
  const defaults = buildGenerationArtifactKeys({
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    runId: id,
  });
  return {
    id,
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    storyboardVersionId: resolved.storyboardVersionId,
    status: resolveStatus(resolved.status, "queued"),
    scriptArtifactKey: resolved.scriptArtifactKey ?? defaults.scriptArtifactKey,
    timelineArtifactKey: resolved.timelineArtifactKey ?? defaults.timelineArtifactKey,
    audioArtifactKey: resolved.audioArtifactKey ?? defaults.audioArtifactKey,
    logsArtifactKey: resolved.logsArtifactKey ?? defaults.logsArtifactKey,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildRenderRunInput = (
  input: CreateRenderRunInput,
  activeOrgId: string,
): CreateRenderRunInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    videoId: requireText("Video id", scoped.videoId),
    generationRunId: requireText("Generation run id", scoped.generationRunId),
    status: resolveStatus(scoped.status, "queued"),
  };
};

export const buildRenderRunRecord = (
  input: CreateRenderRunInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): RenderRun => {
  const resolved = buildRenderRunInput(input, activeOrgId);
  const ctx = resolveContext(context);
  const id = ctx.id();
  const defaults = buildRenderArtifactKeys({
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    runId: id,
  });
  return {
    id,
    orgId: resolved.orgId,
    videoId: resolved.videoId,
    generationRunId: resolved.generationRunId,
    status: resolveStatus(resolved.status, "queued"),
    mp4ArtifactKey: resolved.mp4ArtifactKey ?? defaults.mp4ArtifactKey,
    stillsArtifactPrefix: resolved.stillsArtifactPrefix ?? defaults.stillsArtifactPrefix,
    logsArtifactKey: resolved.logsArtifactKey ?? defaults.logsArtifactKey,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildAssetInput = (
  input: CreateAssetInput,
  activeOrgId: string,
): CreateAssetInput & { orgId: string; storageKey: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  const kind = requireText("Asset kind", scoped.kind);
  const resolvedKind = kind as Asset["kind"];
  const projectId = normalizeOptionalText(scoped.projectId ?? null);
  const scopedInput = {
    ...scoped,
    projectId,
  };
  const storageKey = resolveAssetStorageKey(scopedInput, resolvedKind);
  return {
    ...scopedInput,
    kind: resolvedKind,
    sha256: normalizeOptionalText(scoped.sha256 ?? null),
    fileName: normalizeOptionalText(scoped.fileName ?? null),
    storageKey,
    metadataJson: scoped.metadataJson ?? null,
  };
};

export const buildAssetRecord = (
  input: CreateAssetInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Asset => {
  const resolved = buildAssetInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    projectId: resolved.projectId ?? null,
    kind: resolved.kind,
    sha256: resolved.sha256 ?? null,
    storageKey: resolved.storageKey,
    metadataJson: resolved.metadataJson ?? null,
    createdAt: ctx.now().toISOString(),
  };
};

export const buildJobInput = (input: CreateJobInput, activeOrgId: string): CreateJobInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  requireText("Job kind", scoped.kind);
  return {
    ...scoped,
    status: resolveStatus(scoped.status, "queued"),
    idempotencyKey: normalizeOptionalText(scoped.idempotencyKey ?? null),
  };
};

export const buildJobRecord = (
  input: CreateJobInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): Job => {
  const resolved = buildJobInput(input, activeOrgId);
  const ctx = resolveContext(context);
  const now = ctx.now().toISOString();
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    kind: resolved.kind,
    status: resolveStatus(resolved.status, "queued"),
    idempotencyKey: resolved.idempotencyKey ?? null,
    claimedByAgentId: resolved.claimedByAgentId ?? null,
    executionMode: resolved.executionMode ?? null,
    inputJson: resolved.inputJson ?? null,
    createdAt: now,
    updatedAt: now,
  };
};

export const buildJobEventInput = (
  input: CreateJobEventInput,
  activeOrgId: string,
): CreateJobEventInput & { orgId: string } => {
  const scoped = applyOrgScope(input, activeOrgId);
  return {
    ...scoped,
    jobId: requireText("Job id", scoped.jobId),
    type: requireText("Job event type", scoped.type) as JobEventType,
    message: normalizeOptionalText(scoped.message ?? null),
    progress: normalizeOptionalNumber("Job event progress", scoped.progress ?? null),
  };
};

export const buildJobEventRecord = (
  input: CreateJobEventInput,
  activeOrgId: string,
  context?: Partial<RecordContext>,
): JobEvent => {
  const resolved = buildJobEventInput(input, activeOrgId);
  const ctx = resolveContext(context);
  return {
    id: ctx.id(),
    orgId: resolved.orgId,
    jobId: resolved.jobId,
    type: resolved.type,
    message: resolved.message ?? null,
    progress: resolved.progress ?? null,
    createdAt: ctx.now().toISOString(),
  };
};
