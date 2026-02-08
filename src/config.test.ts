import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findConfigPath, getDefaultProvider, getProviderConfig, loadConfig } from "./config.js";

describe("Config Loader", () => {
  let testDir: string;
  let originalBabulusPath: string | undefined;
  let originalVideomlPath: string | undefined;
  let originalCwd: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    testDir = join(tmpdir(), `videoml-config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    originalBabulusPath = process.env.BABULUS_PATH;
    originalVideomlPath = process.env.VIDEOML_PATH;
    originalCwd = process.cwd();
    originalHome = process.env.HOME;

    // Isolate tests from any real user-level config.
    process.env.HOME = testDir;
    process.chdir(testDir);
  });

  afterEach(() => {
    if (originalBabulusPath) process.env.BABULUS_PATH = originalBabulusPath;
    else delete process.env.BABULUS_PATH;

    if (originalVideomlPath) process.env.VIDEOML_PATH = originalVideomlPath;
    else delete process.env.VIDEOML_PATH;

    if (originalHome) process.env.HOME = originalHome;
    else delete process.env.HOME;

    process.chdir(originalCwd);

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("findConfigPath", () => {
    it("finds config from VIDEOML_PATH environment variable", () => {
      const configPath = join(testDir, "videoml-config.yml");
      writeFileSync(configPath, "providers: {}");
      process.env.VIDEOML_PATH = configPath;

      const found = findConfigPath();
      assert.equal(found, configPath);
    });

    it("finds config from BABULUS_PATH environment variable", () => {
      const configPath = join(testDir, "custom-config.yml");
      writeFileSync(configPath, "providers: {}");
      process.env.BABULUS_PATH = configPath;

      const found = findConfigPath();
      assert.equal(found, configPath);
    });

    it("finds config in BABULUS_PATH directory (config.yml)", () => {
      const configDir = join(testDir, "babulus-dir");
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, "config.yml");
      writeFileSync(configPath, "providers: {}");
      process.env.BABULUS_PATH = configDir;

      const found = findConfigPath();
      assert.equal(found, configPath);
    });

    it("throws if VIDEOML_PATH is set but config not found (no project fallback)", () => {
      process.env.VIDEOML_PATH = join(testDir, "nonexistent");
      throwsMatch(() => findConfigPath(), /VIDEOML_PATH\/BABULUS_PATH is set but config not found/);
    });

    it("throws if BABULUS_PATH is set but config not found (no project fallback)", () => {
      process.env.BABULUS_PATH = join(testDir, "nonexistent");
      throwsMatch(() => findConfigPath(), /VIDEOML_PATH\/BABULUS_PATH is set but config not found/);
    });

    it("finds config in project directory", () => {
      const projectDir = join(testDir, "project");
      const videomlDir = join(projectDir, ".videoml");
      mkdirSync(videomlDir, { recursive: true });
      const configPath = join(videomlDir, "config.yml");
      writeFileSync(configPath, "providers: {}");

      const found = findConfigPath(projectDir);
      assert.equal(found, configPath);
    });

    it("finds config via DSL path project root", () => {
      const projectDir = join(testDir, "dsl-project");
      const videomlDir = join(projectDir, ".videoml");
      mkdirSync(videomlDir, { recursive: true });
      const configPath = join(videomlDir, "config.yml");
      writeFileSync(configPath, "providers: {}");

      const dslPath = join(projectDir, "video.babulus.xml");
      writeFileSync(dslPath, "<video/>");

      const found = findConfigPath(undefined, dslPath);
      assert.equal(found, configPath);
    });

    it("finds config in current working directory", () => {
      const videomlDir = join(testDir, ".videoml");
      mkdirSync(videomlDir, { recursive: true });
      const configPath = join(videomlDir, "config.yml");
      writeFileSync(configPath, "providers: {}");

      const found = findConfigPath();
      assert.equal(realpathSync(found!), realpathSync(configPath));
    });

    it("returns null if no config found", () => {
      const found = findConfigPath(testDir);
      assert.equal(found, null);
    });

    it("prefers .videoml over .babulus", () => {
      const projectDir = join(testDir, "priorities");
      const videomlDir = join(projectDir, ".videoml");
      const babulusDir = join(projectDir, ".babulus");
      mkdirSync(videomlDir, { recursive: true });
      mkdirSync(babulusDir, { recursive: true });
      const videomlPath = join(videomlDir, "config.yml");
      const babulusPath = join(babulusDir, "config.yml");
      writeFileSync(videomlPath, "providers:\n  test: videoml");
      writeFileSync(babulusPath, "providers:\n  test: babulus");

      const found = findConfigPath(projectDir);
      assert.equal(found, videomlPath);
    });
  });

  describe("loadConfig", () => {
    it("loads valid YAML config", () => {
      const configPath = join(testDir, ".videoml", "config.yml");
      mkdirSync(join(testDir, ".videoml"), { recursive: true });
      writeFileSync(
        configPath,
        [
          "providers:",
          "  openai:",
          '    api_key: "sk-test"',
          '    model: "gpt-4o-mini-tts"',
          "tts:",
          "  default_provider: openai",
          "",
        ].join("\n"),
      );

      const config = loadConfig(testDir);
      assert.ok((config as any).providers);
      assert.equal((config as any).providers.openai.api_key, "sk-test");
    });

    it("returns empty config if no config file found", () => {
      const config = loadConfig(testDir);
      assert.deepEqual(config, {});
    });

    it("throws for invalid YAML", () => {
      const configPath = join(testDir, ".videoml", "config.yml");
      mkdirSync(join(testDir, ".videoml"), { recursive: true });
      writeFileSync(configPath, "invalid: yaml: content: [");

      throwsMatch(() => loadConfig(testDir), /Invalid config/);
    });

    it("throws if config is not a mapping", () => {
      const configPath = join(testDir, ".videoml", "config.yml");
      mkdirSync(join(testDir, ".videoml"), { recursive: true });
      writeFileSync(configPath, "- list\n- of\n- items");

      throwsMatch(() => loadConfig(testDir), /Config must be a mapping/);
    });

    it("handles empty config file", () => {
      const configPath = join(testDir, ".videoml", "config.yml");
      mkdirSync(join(testDir, ".videoml"), { recursive: true });
      writeFileSync(configPath, "");

      const config = loadConfig(testDir);
      assert.deepEqual(config, {});
    });
  });

  describe("getProviderConfig", () => {
    it("extracts provider config", () => {
      const config = {
        providers: {
          openai: {
            api_key: "sk-test",
            model: "gpt-4o-mini-tts",
          },
        },
      };

      const providerConfig = getProviderConfig(config, "openai");
      assert.deepEqual(providerConfig, { api_key: "sk-test", model: "gpt-4o-mini-tts" });
    });

    it("returns empty object if provider not found", () => {
      const config = { providers: { openai: { api_key: "sk-test" } } };
      const providerConfig = getProviderConfig(config, "elevenlabs");
      assert.deepEqual(providerConfig, {});
    });

    it("returns empty object if providers not defined", () => {
      const config = {};
      const providerConfig = getProviderConfig(config, "openai");
      assert.deepEqual(providerConfig, {});
    });

    it("throws if providers is not a mapping", () => {
      const config = { providers: "not-an-object" };
      throwsMatch(() => getProviderConfig(config as any, "openai"), /config\.providers must be a mapping/);
    });

    it("throws if provider config is not a mapping", () => {
      const config = { providers: { openai: "not-an-object" } };
      throwsMatch(() => getProviderConfig(config as any, "openai"), /config\.providers\.openai must be a mapping/);
    });
  });

  describe("getDefaultProvider", () => {
    it("extracts default provider from config.tts.default_provider", () => {
      const config = { tts: { default_provider: "openai" } };
      assert.equal(getDefaultProvider(config as any), "openai");
    });

    it("returns null if default provider not set or inferred", () => {
      assert.equal(getDefaultProvider({} as any), null);
    });

    it("throws if default_provider is not a string", () => {
      const config = { tts: { default_provider: 123 } };
      throwsMatch(() => getDefaultProvider(config as any), /config\.tts\.default_provider must be a string/);
    });
  });

  describe("Environment variable override", () => {
    it("loads config from BABULUS_PATH", () => {
      const configPath = join(testDir, "env-config.yml");
      writeFileSync(configPath, ['providers:', '  openai:', '    api_key: "sk-env-test"', ""].join("\n"));
      process.env.BABULUS_PATH = configPath;

      const config = loadConfig();
      assert.equal((config as any).providers.openai.api_key, "sk-env-test");
    });
  });
});

function throwsMatch(fn: () => unknown, pattern: RegExp): void {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof Error);
    assert.match(err.message, pattern);
    return true;
  });
}
