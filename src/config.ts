import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import YAML from "yaml";
import { ParseError } from "./errors.js";

export type Config = Record<string, unknown>;

export function loadConfig(projectDir?: string, dslPath?: string): Config {
  const path = findConfigPath(projectDir, dslPath);
  if (!path) {
    return {};
  }
  try {
    const text = readFileSync(path, "utf-8");
    const obj = YAML.parse(text);
    if (!obj) {
      return {};
    }
    if (typeof obj !== "object" || Array.isArray(obj)) {
      throw new ParseError(`Config must be a mapping: ${path}`);
    }
    return obj as Config;
  } catch (err) {
    if (err instanceof ParseError) {
      throw err;
    }
    throw new ParseError(`Invalid config: ${path}`);
  }
}

export function findConfigPath(projectDir?: string, dslPath?: string): string | null {
  const override = process.env.BABULUS_PATH;
  if (override) {
    const resolved = resolve(override);
    const candidate = existsSync(resolved) && !resolved.endsWith(".yml") && !resolved.endsWith(".yaml")
      ? join(resolved, "config.yml")
      : resolved;
    if (existsSync(candidate)) {
      return candidate;
    }
    throw new ParseError(`BABULUS_PATH is set but config not found: ${candidate}`);
  }

  if (dslPath) {
    const root = findProjectRoot(dslPath);
    const local = join(root, ".babulus", "config.yml");
    if (existsSync(local)) {
      return local;
    }
  }

  if (projectDir) {
    const local = join(resolve(projectDir), ".babulus", "config.yml");
    if (existsSync(local)) {
      return local;
    }
  }

  const cwdLocal = join(process.cwd(), ".babulus", "config.yml");
  if (existsSync(cwdLocal)) {
    return cwdLocal;
  }

  const homeLocal = join(homedir(), ".babulus", "config.yml");
  if (existsSync(homeLocal)) {
    return homeLocal;
  }

  return null;
}

export function findProjectRoot(dslPath: string): string {
  let current = resolve(dirname(dslPath));
  while (true) {
    if (existsSync(join(current, ".babulus")) || existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(dirname(dslPath));
    }
    current = parent;
  }
}

export function getProviderConfig(config: Config, provider: string): Record<string, unknown> {
  const providers = config.providers;
  if (providers == null) {
    return {};
  }
  if (typeof providers !== "object" || Array.isArray(providers)) {
    throw new ParseError("config.providers must be a mapping");
  }
  const cfg = (providers as Record<string, unknown>)[provider] ?? {};
  if (typeof cfg !== "object" || Array.isArray(cfg)) {
    throw new ParseError(`config.providers.${provider} must be a mapping`);
  }
  return cfg as Record<string, unknown>;
}

function getNestedString(config: Config, path: string[]): string | null {
  let current: unknown = config;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  if (current == null) {
    return null;
  }
  if (typeof current !== "string") {
    throw new ParseError(`config.${path.join(".")} must be a string`);
  }
  return current;
}

export function getDefaultProvider(config: Config): string | null {
  return getNestedString(config, ["tts", "default_provider"]);
}

export function getDefaultSfxProvider(config: Config): string | null {
  return getNestedString(config, ["audio", "default_sfx_provider"]);
}

export function getDefaultMusicProvider(config: Config): string | null {
  return getNestedString(config, ["audio", "default_music_provider"]);
}
