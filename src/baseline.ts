import { createHash } from "crypto";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";

export type BaselineArtifact = {
  path: string;
  sha256?: string;
  optional?: boolean;
};

export type BaselineRecord = {
  artifacts: BaselineArtifact[];
  [key: string]: unknown;
};

export type BaselineMismatch = {
  artifact: BaselineArtifact;
  expected: string;
  actual: string;
};

export type BaselineCheckResult = {
  ok: boolean;
  missing: BaselineArtifact[];
  mismatched: BaselineMismatch[];
  updatedRecord?: BaselineRecord;
};

export type BaselineCheckOptions = {
  baseDir?: string;
  update?: boolean;
};

export function computeSha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function resolveArtifactPath(artifactPath: string, baseDir: string): string {
  if (isAbsolute(artifactPath)) {
    return artifactPath;
  }
  return resolve(baseDir, artifactPath);
}

export function verifyBaseline(record: BaselineRecord, options: BaselineCheckOptions = {}): BaselineCheckResult {
  const baseDir = options.baseDir ?? process.cwd();
  const missing: BaselineArtifact[] = [];
  const mismatched: BaselineMismatch[] = [];
  const updatedRecord = options.update ? structuredClone(record) : undefined;

  for (const [index, artifact] of record.artifacts.entries()) {
    const resolvedPath = resolveArtifactPath(artifact.path, baseDir);
    const exists = existsSync(resolvedPath);
    if (!exists) {
      if (!artifact.optional) {
        missing.push(artifact);
      }
      continue;
    }
    const actual = computeSha256(resolvedPath);
    if (options.update && updatedRecord) {
      updatedRecord.artifacts[index].sha256 = actual;
    }
    if (!artifact.sha256) {
      mismatched.push({
        artifact,
        expected: "(missing)",
        actual,
      });
      continue;
    }
    if (artifact.sha256 !== actual) {
      mismatched.push({
        artifact,
        expected: artifact.sha256,
        actual,
      });
    }
  }

  return {
    ok: missing.length === 0 && mismatched.length === 0,
    missing,
    mismatched,
    updatedRecord,
  };
}

export function readBaselineRecord(path: string): BaselineRecord {
  const content = readFileSync(path, "utf8");
  const parsed = JSON.parse(content) as BaselineRecord;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.artifacts)) {
    throw new Error(`Invalid baseline record at ${path}`);
  }
  return parsed;
}

export function writeBaselineRecord(path: string, record: BaselineRecord): void {
  const content = JSON.stringify(record, null, 2);
  const target = isAbsolute(path) ? path : resolve(path);
  const outDir = dirname(target);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  writeFileSync(target, content + "\n");
}
