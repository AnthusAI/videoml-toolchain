export type ID = string;
export type ISODateString = string;

export type OrgMemberRole = "owner" | "admin" | "editor" | "viewer";
export type VideoStatus = "draft" | "generating" | "ready" | "rendering" | "published" | "error";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";
export type JobStatus = "queued" | "claimed" | "running" | "succeeded" | "failed" | "canceled";
export type ExecutionMode = "cloud" | "local";

export type Org = {
  id: ID;
  name: string;
  createdAt: ISODateString;
  planTier?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean | null;
};

export type OrgMember = {
  orgId: ID;
  userId: ID;
  role: OrgMemberRole;
  createdAt: ISODateString;
};

export type UserProfile = {
  id: ID;
  email?: string | null;
  displayName?: string | null;
  createdAt: ISODateString;
};

export type Project = {
  id: ID;
  orgId: ID;
  name: string;
  templateId?: string | null;
  createdAt: ISODateString;
};

export type Video = {
  id: ID;
  orgId: ID;
  projectId: ID;
  title: string;
  status: VideoStatus;
  activeStoryboardVersionId?: ID | null;
  createdAt: ISODateString;
};

export type StoryboardVersion = {
  id: ID;
  orgId: ID;
  videoId: ID;
  sourceText: string;
  parentVersionId?: ID | null;
  createdBy?: ID | null;
  createdAt: ISODateString;
};

export type GenerationRun = {
  id: ID;
  orgId: ID;
  videoId: ID;
  storyboardVersionId: ID;
  status: RunStatus;
  scriptArtifactKey?: string | null;
  timelineArtifactKey?: string | null;
  audioArtifactKey?: string | null;
  logsArtifactKey?: string | null;
  createdAt: ISODateString;
};

export type RenderRun = {
  id: ID;
  orgId: ID;
  videoId: ID;
  generationRunId: ID;
  status: RunStatus;
  mp4ArtifactKey?: string | null;
  stillsArtifactPrefix?: string | null;
  logsArtifactKey?: string | null;
  createdAt: ISODateString;
};

export type Asset = {
  id: ID;
  orgId: ID;
  projectId?: ID | null;
  kind: "image" | "audio" | "video" | "font" | "data";
  sha256?: string | null;
  storageKey: string;
  metadataJson?: Record<string, unknown> | null;
  createdAt: ISODateString;
};

export type Conversation = {
  id: ID;
  orgId: ID;
  videoId?: ID | null;
  createdAt: ISODateString;
};

export type Message = {
  id: ID;
  orgId: ID;
  conversationId: ID;
  role: "system" | "assistant" | "user";
  content: string;
  createdAt: ISODateString;
};

export type Approval = {
  id: ID;
  orgId: ID;
  videoId: ID;
  kind: string;
  status: "pending" | "approved" | "rejected";
  requestedBy?: ID | null;
  decidedBy?: ID | null;
  decidedAt?: ISODateString | null;
};

export type RenderAgent = {
  id: ID;
  orgId: ID;
  label?: string | null;
  status: "online" | "offline" | "busy";
  lastSeenAt?: ISODateString | null;
};

export type Job = {
  id: ID;
  orgId: ID;
  kind: "resolve" | "generate" | "render" | "publish";
  status: JobStatus;
  idempotencyKey?: string | null;
  claimedByAgentId?: ID | null;
  executionMode?: ExecutionMode | null;
  inputJson?: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type JobEventType = "status" | "progress" | "log";

export type JobEvent = {
  id: ID;
  orgId: ID;
  jobId: ID;
  type: JobEventType;
  message?: string | null;
  progress?: number | null;
  createdAt: ISODateString;
};

export type BillingMode = "byok" | "markup" | "flat" | "credits";
export type UsageVisibilityMode = "full" | "redacted";
export type UsageUnitType = "chars" | "tokens" | "seconds" | "frames" | "bytes" | "gb-seconds";

export type UsageEvent = {
  id: ID;
  orgId: ID;
  videoId?: ID | null;
  runId?: ID | null;
  provider?: string | null;
  unitType: UsageUnitType;
  quantity: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  createdAt: ISODateString;
};

export type BillingAccount = {
  id: ID;
  orgId: ID;
  planId?: string | null;
  billingMode: BillingMode;
  usageVisibilityMode: UsageVisibilityMode;
  createdAt: ISODateString;
};

export type PublishedVideo = {
  id: ID;
  orgId: ID;
  videoId: ID;
  renderRunId: ID;
  slug: string;
  accessPolicy: "public" | "password" | "org_only";
  passwordHash?: string | null;
  viewCount: number;
  publishedAt: ISODateString;
};

export * from "./storage.ts";
export * from "./timeline.ts";
export * from "./video.ts";
export * from "./rbac.ts";
export * from "./tenancy.ts";
export * from "./access.ts";
export * from "./dsl-to-script.ts";
export * from "./org-scope.ts";
export * from "./session.ts";
export * from "./records.ts";
export * from "./control-plane.ts";
export * from "./execution-plane.ts";
export * from "./video-status.ts";
export * from "./usage.ts";
export * from "./jobs.ts";
