import { join } from "path";

export const ENV_FALLBACK_CHAIN = ["development", "aws", "azure", "production", "static"] as const;

export function getEnvironment(): string {
  return process.env.BABULUS_ENV || "development";
}

export function getEnvironmentFallbackChain(currentEnv: string): string[] {
  const idx = ENV_FALLBACK_CHAIN.indexOf(currentEnv as typeof ENV_FALLBACK_CHAIN[number]);
  if (idx === -1) {
    return [currentEnv, ...ENV_FALLBACK_CHAIN];
  }
  return ENV_FALLBACK_CHAIN.slice(idx);
}

export function resolveEnvCacheDir(outDir: string, env: string): string {
  return join(outDir, "env", env);
}
