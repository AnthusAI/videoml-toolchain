import { spawn } from "node:child_process";
import { createRequire } from "node:module";

export type FfmpegRunnerResult = {
  stdout: string;
  stderr: string;
  code: number | null;
  error?: Error;
};

export type FfmpegRunner = (command: string, args: string[]) => Promise<FfmpegRunnerResult>;

export type PlaywrightPackageInfo = {
  name: "playwright" | "playwright-core";
  version: string;
};

export type PlaywrightResolver = () => PlaywrightPackageInfo | null;

export type RendererToolchainOptions = {
  ffmpegPath?: string;
  expectedFfmpegVersion?: string | null;
  expectedPlaywrightVersion?: string | null;
  requireFfmpeg?: boolean;
  requirePlaywright?: boolean;
  runFfmpeg?: FfmpegRunner;
  resolvePlaywright?: PlaywrightResolver;
};

export type RendererToolchainStatus = {
  ok: boolean;
  issues: string[];
  ffmpeg: {
    required: boolean;
    path: string;
    available: boolean;
    version: string | null;
    expected: string | null;
    ok: boolean;
    error: string | null;
  };
  playwright: {
    required: boolean;
    packageName: string | null;
    available: boolean;
    version: string | null;
    expected: string | null;
    ok: boolean;
    error: string | null;
  };
};

export const parseFfmpegVersion = (output: string): string | null => {
  const match = output.match(/ffmpeg version\s+([^\s]+)/i);
  return match?.[1] ?? null;
};

const defaultRunFfmpeg: FfmpegRunner = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ stdout, stderr, code: null, error });
    });
    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });

export const resolvePlaywrightPackage: PlaywrightResolver = () => {
  const require = createRequire(import.meta.url);
  try {
    const pkg = require("playwright/package.json") as { version: string };
    return { name: "playwright", version: pkg.version };
  } catch {
    try {
      const pkg = require("playwright-core/package.json") as { version: string };
      return { name: "playwright-core", version: pkg.version };
    } catch {
      return null;
    }
  }
};

export const detectRendererToolchain = async (
  options: RendererToolchainOptions = {},
): Promise<RendererToolchainStatus> => {
  const ffmpegPath = options.ffmpegPath ?? "ffmpeg";
  const expectedFfmpegVersion = options.expectedFfmpegVersion ?? null;
  const expectedPlaywrightVersion = options.expectedPlaywrightVersion ?? null;
  const requireFfmpeg = options.requireFfmpeg ?? false;
  const requirePlaywright = options.requirePlaywright ?? false;
  const runFfmpeg = options.runFfmpeg ?? defaultRunFfmpeg;
  const resolvePlaywright = options.resolvePlaywright ?? resolvePlaywrightPackage;

  let ffmpegVersion: string | null = null;
  let ffmpegError: string | null = null;
  let ffmpegAvailable = false;
  const ffmpegRequired = requireFfmpeg || expectedFfmpegVersion !== null;

  try {
    const result = await runFfmpeg(ffmpegPath, ["-version"]);
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    ffmpegVersion = parseFfmpegVersion(output);
    if (result.error) {
      const error = result.error as NodeJS.ErrnoException;
      ffmpegError = error.code === "ENOENT" ? `ffmpeg not found at ${ffmpegPath}` : error.message;
    } else if (result.code !== 0) {
      ffmpegError = `ffmpeg exited with code ${result.code ?? "unknown"}`;
    }
    ffmpegAvailable = Boolean(ffmpegVersion) && !ffmpegError;
  } catch (error) {
    ffmpegError = error instanceof Error ? error.message : String(error);
  }

  const playwrightInfo = resolvePlaywright();
  const playwrightRequired = requirePlaywright || expectedPlaywrightVersion !== null;
  const playwrightVersion = playwrightInfo?.version ?? null;
  const playwrightName = playwrightInfo?.name ?? null;
  const playwrightAvailable = Boolean(playwrightInfo);
  const playwrightError = playwrightAvailable ? null : "Playwright package not found";

  const issues: string[] = [];

  if (ffmpegRequired) {
    if (ffmpegError) {
      issues.push(ffmpegError);
    } else if (!ffmpegVersion) {
      issues.push("ffmpeg version not detected");
    }
    if (expectedFfmpegVersion) {
      if (!ffmpegVersion) {
        issues.push(`ffmpeg ${expectedFfmpegVersion} expected but not detected`);
      } else if (ffmpegVersion !== expectedFfmpegVersion) {
        issues.push(`ffmpeg version mismatch (expected ${expectedFfmpegVersion}, got ${ffmpegVersion})`);
      }
    }
  }

  if (playwrightRequired) {
    if (playwrightError) {
      issues.push(playwrightError);
    }
    if (expectedPlaywrightVersion) {
      if (!playwrightVersion) {
        issues.push(`Playwright ${expectedPlaywrightVersion} expected but not detected`);
      } else if (playwrightVersion !== expectedPlaywrightVersion) {
        issues.push(
          `Playwright version mismatch (expected ${expectedPlaywrightVersion}, got ${playwrightVersion})`,
        );
      }
    }
  }

  const ffmpegOk = !ffmpegRequired || issues.filter((issue) => issue.toLowerCase().includes("ffmpeg")).length === 0;
  const playwrightOk =
    !playwrightRequired || issues.filter((issue) => issue.toLowerCase().includes("playwright")).length === 0;

  return {
    ok: issues.length === 0,
    issues,
    ffmpeg: {
      required: ffmpegRequired,
      path: ffmpegPath,
      available: ffmpegAvailable,
      version: ffmpegVersion,
      expected: expectedFfmpegVersion,
      ok: ffmpegOk,
      error: ffmpegError,
    },
    playwright: {
      required: playwrightRequired,
      packageName: playwrightName,
      available: playwrightAvailable,
      version: playwrightVersion,
      expected: expectedPlaywrightVersion,
      ok: playwrightOk,
      error: playwrightError,
    },
  };
};

export const formatRendererToolchainIssues = (status: RendererToolchainStatus): string => {
  return status.issues.join("; ");
};

export const assertRendererToolchain = async (
  options: RendererToolchainOptions = {},
): Promise<RendererToolchainStatus> => {
  const status = await detectRendererToolchain(options);
  if (!status.ok) {
    const message = formatRendererToolchainIssues(status) || "Renderer toolchain requirements not met.";
    throw new Error(message);
  }
  return status;
};
