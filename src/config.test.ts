import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig, findConfigPath, getProviderConfig, getDefaultProvider } from './config.js';

describe('Config Loader', () => {
  let testDir: string;
  let originalBabulusPath: string | undefined;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `babulus-config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original environment
    originalBabulusPath = process.env.BABULUS_PATH;
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Restore original environment
    if (originalBabulusPath) {
      process.env.BABULUS_PATH = originalBabulusPath;
    } else {
      delete process.env.BABULUS_PATH;
    }
    process.chdir(originalCwd);

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('findConfigPath', () => {
    it('should find config from BABULUS_PATH environment variable', () => {
      const configPath = join(testDir, 'custom-config.yml');
      writeFileSync(configPath, 'providers: {}');
      process.env.BABULUS_PATH = configPath;

      const found = findConfigPath();
      expect(found).toBe(configPath);
    });

    it('should find config in BABULUS_PATH directory', () => {
      const configDir = join(testDir, 'babulus-dir');
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, 'config.yml');
      writeFileSync(configPath, 'providers: {}');
      process.env.BABULUS_PATH = configDir;

      const found = findConfigPath();
      expect(found).toBe(configPath);
    });

    it('should throw error if BABULUS_PATH is set but config not found', () => {
      process.env.BABULUS_PATH = join(testDir, 'nonexistent');
      expect(() => findConfigPath()).toThrow(/BABULUS_PATH is set but config not found/);
    });

    it('should find config in project directory', () => {
      const projectDir = join(testDir, 'project');
      const babulusDir = join(projectDir, '.babulus');
      mkdirSync(babulusDir, { recursive: true });
      const configPath = join(babulusDir, 'config.yml');
      writeFileSync(configPath, 'providers: {}');

      const found = findConfigPath(projectDir);
      expect(found).toBe(configPath);
    });

    it('should find config in DSL file parent directory', () => {
      const projectDir = join(testDir, 'dsl-project');
      const babulusDir = join(projectDir, '.babulus');
      mkdirSync(babulusDir, { recursive: true });
      const configPath = join(babulusDir, 'config.yml');
      writeFileSync(configPath, 'providers: {}');

      const dslPath = join(projectDir, 'video.babulus.ts');
      writeFileSync(dslPath, '// DSL file');

      const found = findConfigPath(undefined, dslPath);
      expect(found).toBe(configPath);
    });

    it('should find config in current working directory', () => {
      const babulusDir = join(testDir, '.babulus');
      mkdirSync(babulusDir, { recursive: true });
      const configPath = join(babulusDir, 'config.yml');
      writeFileSync(configPath, 'providers: {}');

      process.chdir(testDir);
      const found = findConfigPath();
      expect(found).toBe(configPath);
    });

    it('should return null if no config found', () => {
      const found = findConfigPath(testDir);
      expect(found).toBeNull();
    });

    it('should search order: BABULUS_PATH → project → cwd → home', () => {
      // This test verifies search order by setting up configs in multiple locations
      // and ensuring BABULUS_PATH takes precedence
      const envConfigPath = join(testDir, 'env-config.yml');
      const cwdConfigPath = join(testDir, '.babulus', 'config.yml');

      mkdirSync(join(testDir, '.babulus'), { recursive: true });
      writeFileSync(envConfigPath, 'providers:\n  test: env');
      writeFileSync(cwdConfigPath, 'providers:\n  test: cwd');

      process.chdir(testDir);
      process.env.BABULUS_PATH = envConfigPath;

      const found = findConfigPath();
      expect(found).toBe(envConfigPath);
    });
  });

  describe('loadConfig', () => {
    it('should load valid YAML config', () => {
      const configPath = join(testDir, '.babulus', 'config.yml');
      mkdirSync(join(testDir, '.babulus'), { recursive: true });
      writeFileSync(configPath, `
providers:
  openai:
    api_key: "sk-test"
    model: "gpt-4o-mini-tts"
tts:
  default_provider: openai
`);

      const config = loadConfig(testDir);
      expect(config).toBeDefined();
      expect(config.providers).toBeDefined();
      expect((config.providers as any).openai).toBeDefined();
      expect((config.providers as any).openai.api_key).toBe('sk-test');
    });

    it('should return empty config if no config file found', () => {
      const config = loadConfig(testDir);
      expect(config).toEqual({});
    });

    it('should throw error for invalid YAML', () => {
      const configPath = join(testDir, '.babulus', 'config.yml');
      mkdirSync(join(testDir, '.babulus'), { recursive: true });
      writeFileSync(configPath, 'invalid: yaml: content: [');

      expect(() => loadConfig(testDir)).toThrow(/Invalid config/);
    });

    it('should throw error if config is not an object', () => {
      const configPath = join(testDir, '.babulus', 'config.yml');
      mkdirSync(join(testDir, '.babulus'), { recursive: true });
      writeFileSync(configPath, '- list\n- of\n- items');

      expect(() => loadConfig(testDir)).toThrow(/Config must be a mapping/);
    });

    it('should handle empty config file', () => {
      const configPath = join(testDir, '.babulus', 'config.yml');
      mkdirSync(join(testDir, '.babulus'), { recursive: true });
      writeFileSync(configPath, '');

      const config = loadConfig(testDir);
      expect(config).toEqual({});
    });
  });

  describe('getProviderConfig', () => {
    it('should extract provider config', () => {
      const config = {
        providers: {
          openai: {
            api_key: 'sk-test',
            model: 'gpt-4o-mini-tts',
          },
        },
      };

      const providerConfig = getProviderConfig(config, 'openai');
      expect(providerConfig).toEqual({
        api_key: 'sk-test',
        model: 'gpt-4o-mini-tts',
      });
    });

    it('should return empty object if provider not found', () => {
      const config = {
        providers: {
          openai: { api_key: 'sk-test' },
        },
      };

      const providerConfig = getProviderConfig(config, 'elevenlabs');
      expect(providerConfig).toEqual({});
    });

    it('should return empty object if providers not defined', () => {
      const config = {};
      const providerConfig = getProviderConfig(config, 'openai');
      expect(providerConfig).toEqual({});
    });

    it('should throw error if providers is not an object', () => {
      const config = {
        providers: 'not-an-object',
      };

      expect(() => getProviderConfig(config, 'openai')).toThrow(/config.providers must be a mapping/);
    });

    it('should throw error if provider config is not an object', () => {
      const config = {
        providers: {
          openai: 'not-an-object',
        },
      };

      expect(() => getProviderConfig(config, 'openai')).toThrow(/config.providers.openai must be a mapping/);
    });
  });

  describe('getDefaultProvider', () => {
    it('should extract default TTS provider', () => {
      const config = {
        tts: {
          default_provider: 'openai',
        },
      };

      const defaultProvider = getDefaultProvider(config);
      expect(defaultProvider).toBe('openai');
    });

    it('should return null if default provider not set', () => {
      const config = {};
      const defaultProvider = getDefaultProvider(config);
      expect(defaultProvider).toBeNull();
    });

    it('should throw error if default_provider is not a string', () => {
      const config = {
        tts: {
          default_provider: 123,
        },
      };

      expect(() => getDefaultProvider(config)).toThrow(/config.tts.default_provider must be a string/);
    });
  });

  describe('Environment variable override', () => {
    it('should work with config from environment variable', () => {
      const configPath = join(testDir, 'env-config.yml');
      writeFileSync(configPath, `
providers:
  openai:
    api_key: "sk-env-test"
`);
      process.env.BABULUS_PATH = configPath;

      const config = loadConfig();
      expect((config.providers as any).openai.api_key).toBe('sk-env-test');
    });
  });
});
