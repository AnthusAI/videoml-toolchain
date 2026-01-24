type SegmentOptions = {
  allowDots?: boolean;
};

const assertSegment = (label: string, value: string, options: SegmentOptions = {}): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  if (value.includes("/") || value.includes("\\")) {
    throw new Error(`${label} must not include path separators`);
  }
  if (!options.allowDots && value.includes("..")) {
    throw new Error(`${label} must not include '..'`);
  }
  return value;
};

export type AssetKeyParams = {
  orgId: string;
  projectId?: string | null;
  kind: string;
  sha256: string;
  fileName: string;
};

export type RunArtifactKeyParams = {
  orgId: string;
  videoId: string;
  runId: string;
  fileName: string;
};

export type GenerationArtifactKeyParams = {
  orgId: string;
  videoId: string;
  runId: string;
};

export type RenderArtifactKeyParams = {
  orgId: string;
  videoId: string;
  runId: string;
};

export const buildOrgPrefix = (orgId: string): string => {
  return `org/${assertSegment("orgId", orgId)}`;
};

export const buildAssetKey = ({ orgId, projectId, kind, sha256, fileName }: AssetKeyParams): string => {
  const orgPrefix = buildOrgPrefix(orgId);
  const resolvedProject = projectId ? assertSegment("projectId", projectId) : "shared";
  const safeKind = assertSegment("kind", kind);
  const safeHash = assertSegment("sha256", sha256);
  const safeFile = assertSegment("fileName", fileName, { allowDots: true });
  return `${orgPrefix}/projects/${resolvedProject}/assets/${safeKind}/${safeHash}/${safeFile}`;
};

export const buildRunArtifactKey = ({ orgId, videoId, runId, fileName }: RunArtifactKeyParams): string => {
  const orgPrefix = buildOrgPrefix(orgId);
  const safeVideo = assertSegment("videoId", videoId);
  const safeRun = assertSegment("runId", runId);
  const safeFile = assertSegment("fileName", fileName, { allowDots: true });
  return `${orgPrefix}/videos/${safeVideo}/runs/${safeRun}/${safeFile}`;
};

export const buildRunArtifactPrefix = (orgId: string, videoId: string, runId: string, prefix: string): string => {
  const orgPrefix = buildOrgPrefix(orgId);
  const safeVideo = assertSegment("videoId", videoId);
  const safeRun = assertSegment("runId", runId);
  const safePrefix = assertSegment("prefix", prefix);
  return `${orgPrefix}/videos/${safeVideo}/runs/${safeRun}/${safePrefix}/`;
};

export const buildGenerationArtifactKeys = ({ orgId, videoId, runId }: GenerationArtifactKeyParams) => {
  return {
    scriptArtifactKey: buildRunArtifactKey({ orgId, videoId, runId, fileName: "script.json" }),
    timelineArtifactKey: buildRunArtifactKey({ orgId, videoId, runId, fileName: "timeline.json" }),
    audioArtifactKey: buildRunArtifactKey({ orgId, videoId, runId, fileName: "audio.wav" }),
    logsArtifactKey: buildRunArtifactKey({ orgId, videoId, runId, fileName: "generation.log" }),
  };
};

export const buildRenderArtifactKeys = ({ orgId, videoId, runId }: RenderArtifactKeyParams) => {
  return {
    mp4ArtifactKey: buildRunArtifactKey({ orgId, videoId, runId, fileName: "render.mp4" }),
    stillsArtifactPrefix: buildRunArtifactPrefix(orgId, videoId, runId, "stills"),
    logsArtifactKey: buildRunArtifactKey({ orgId, videoId, runId, fileName: "render.log" }),
  };
};
