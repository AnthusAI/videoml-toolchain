import { getProviderConfig, type Config } from "../../config.js";
import { CompileError } from "../../errors.js";
import { DryRunSFXProvider } from "./dry-run.js";
import { ElevenLabsSFXProvider } from "./elevenlabs.js";
import type { SFXProvider } from "./types.js";

export function getSfxProvider(name: string, config: Config): SFXProvider {
  if (name === "dry-run") {
    return new DryRunSFXProvider();
  }
  if (name === "elevenlabs") {
    const cfg = getProviderConfig(config, "elevenlabs");
    return new ElevenLabsSFXProvider({
      apiKey: String(cfg.api_key ?? ""),
      baseUrl: String(cfg.base_url ?? "https://api.elevenlabs.io"),
      modelId: String(cfg.sfx_model_id ?? "eleven_text_to_sound_v2"),
      promptInfluence: cfg.sfx_prompt_influence != null ? Number(cfg.sfx_prompt_influence) : null,
      loop: cfg.sfx_loop != null ? Boolean(cfg.sfx_loop) : null,
    });
  }
  throw new CompileError(`Unknown SFX provider "${name}". Supported: dry-run, elevenlabs`);
}
