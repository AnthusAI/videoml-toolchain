import { copyFileSync, writeFileSync, existsSync } from "fs";
import { dirname, extname, join } from "path";
import { computeSha256 } from "./baseline.js";
import { ensureDir, hashKey, safePrefix } from "./util.js";

export type RunArtifact = {
  kind: "script" | "timeline" | "audio";
  path: string;
  sha256: string;
};

export type RunMetadata = {
  id: string;
  compositionId: string;
  env: string;
  createdAt: string;
  source: { dslPath: string };
  artifacts: RunArtifact[];
};

export type RunWriteResult = {
  runId: string;
  runDir: string;
  runPath: string;
  artifacts: RunArtifact[];
};

type RunWriteOptions = {
  envCacheDir: string;
  env: string;
  compositionId: string;
  dslPath: string;
  scriptPath: string;
  timelinePath: string;
  audioPath?: string | null;
};

const artifactName = (prefix: string, hash: string, ext = ""): string => `${prefix}.${safePrefix(hash)}${ext}`;

export const writeRunArtifacts = ({
  envCacheDir,
  env,
  compositionId,
  dslPath,
  scriptPath,
  timelinePath,
  audioPath,
}: RunWriteOptions): RunWriteResult => {
  const scriptHash = computeSha256(scriptPath);
  const timelineHash = computeSha256(timelinePath);
  const audioHash = audioPath && existsSync(audioPath) ? computeSha256(audioPath) : null;

  const runId = hashKey({
    compositionId,
    env,
    scriptHash,
    timelineHash,
    audioHash,
  });

  const runsDir = join(envCacheDir, "runs");
  const runDir = join(runsDir, runId);
  ensureDir(runDir);

  const artifacts: RunArtifact[] = [];
  const scriptName = artifactName("script", scriptHash, ".json");
  copyFileSync(scriptPath, join(runDir, scriptName));
  artifacts.push({ kind: "script", path: scriptName, sha256: scriptHash });

  const timelineName = artifactName("timeline", timelineHash, ".json");
  copyFileSync(timelinePath, join(runDir, timelineName));
  artifacts.push({ kind: "timeline", path: timelineName, sha256: timelineHash });

  if (audioPath && audioHash) {
    const audioName = artifactName("audio", audioHash, extname(audioPath));
    copyFileSync(audioPath, join(runDir, audioName));
    artifacts.push({ kind: "audio", path: audioName, sha256: audioHash });
  }

  const runMetadata: RunMetadata = {
    id: runId,
    compositionId,
    env,
    createdAt: new Date().toISOString(),
    source: { dslPath },
    artifacts,
  };

  const runPath = join(runDir, "run.json");
  writeFileSync(runPath, JSON.stringify(runMetadata, null, 2) + "\n");

  ensureDir(runsDir);
  const latestPath = join(runsDir, "latest.json");
  writeFileSync(latestPath, JSON.stringify({ runId, runPath: join("runs", runId, "run.json") }, null, 2) + "\n");

  return { runId, runDir, runPath, artifacts };
};
