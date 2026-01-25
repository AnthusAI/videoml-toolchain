import { getProviderConfig, type Config } from "../../config.js";
import { CompileError } from "../../errors.js";
import { DryRunProvider } from "./dry-run.js";
import { ElevenLabsTTSProvider } from "./elevenlabs.js";
import { OpenAITTSProvider } from "./openai.js";
import { PollyTTSProvider } from "./aws-polly.js";
import { AzureSpeechTTSProvider } from "./azure.js";
import type { TTSProvider } from "./types.js";

export function getTtsProvider(name: string, config: Config): TTSProvider {
  if (name === "dry-run") {
    const cfg = getProviderConfig(config, "dry-run");
    const wpm = typeof cfg.wpm === "number" ? cfg.wpm : Number(cfg.wpm ?? 165);
    if (Number.isNaN(wpm)) {
      throw new CompileError("providers.dry-run.wpm must be a number");
    }
    return new DryRunProvider(wpm);
  }
  if (name === "openai") {
    const cfg = getProviderConfig(config, "openai");
    return new OpenAITTSProvider({
      apiKey: process.env.OPENAI_API_KEY || String(cfg.api_key ?? ""),
      baseUrl: String(cfg.base_url ?? "https://api.openai.com/v1/audio/speech"),
      defaultModel: String(cfg.model ?? "gpt-4o-mini-tts"),
      defaultVoice: String(cfg.voice ?? "alloy"),
    });
  }
  if (name === "elevenlabs") {
    const cfg = getProviderConfig(config, "elevenlabs");
    const voiceSettings = cfg.voice_settings;
    if (voiceSettings && (typeof voiceSettings !== "object" || Array.isArray(voiceSettings))) {
      throw new CompileError("providers.elevenlabs.voice_settings must be a mapping");
    }
    const pdl = cfg.pronunciation_dictionary_locators;
    if (pdl && !Array.isArray(pdl)) {
      throw new CompileError("providers.elevenlabs.pronunciation_dictionary_locators must be a list");
    }
    if (Array.isArray(pdl)) {
      for (const item of pdl) {
        if (typeof item !== "object" || Array.isArray(item)) {
          throw new CompileError("providers.elevenlabs.pronunciation_dictionary_locators entries must be mappings");
        }
      }
    }
    return new ElevenLabsTTSProvider({
      apiKey: process.env.ELEVENLABS_API_KEY || String(cfg.api_key ?? ""),
      voiceId: String(cfg.voice_id ?? ""),
      modelId: String(cfg.model_id ?? "eleven_multilingual_v2"),
      baseUrl: String(cfg.base_url ?? "https://api.elevenlabs.io"),
      voiceSettings: (voiceSettings as Record<string, unknown>) ?? null,
      outputFormat: String(cfg.output_format ?? "") || null,
      pronunciationDictionaryLocators: (pdl as Array<Record<string, unknown>>) ?? null,
    });
  }
  if (name === "aws" || name === "aws-polly") {
    const cfg = getProviderConfig(config, "aws_polly");
    return new PollyTTSProvider({
      region: process.env.AWS_POLLY_REGION || String(cfg.region ?? "us-east-1"),
      voiceId: String(cfg.voice_id ?? "Joanna"),
      engine: String(cfg.engine ?? "standard"),
      languageCode: cfg.language_code ? String(cfg.language_code) : null,
    });
  }
  if (name === "azure" || name === "azure-speech") {
    const cfg = getProviderConfig(config, "azure_speech");
    return new AzureSpeechTTSProvider({
      apiKey: process.env.AZURE_SPEECH_KEY || String(cfg.api_key ?? ""),
      region: process.env.AZURE_SPEECH_REGION || String(cfg.region ?? ""),
      voiceName: String(cfg.voice ?? "en-US-JennyNeural"),
    });
  }
  throw new CompileError(
    `Unknown TTS provider "${name}". Supported: dry-run, openai, elevenlabs, aws-polly (aws), azure-speech (azure)`,
  );
}
