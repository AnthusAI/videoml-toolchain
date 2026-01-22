import { getProviderConfig, type Config } from "../../config.js";
import { CompileError } from "../../errors.js";
import { DryRunMusicProvider } from "./dry-run.js";
import { ElevenLabsMusicProvider } from "./elevenlabs.js";
import type { MusicProvider } from "./types.js";

export function getMusicProvider(name: string, config: Config): MusicProvider {
  if (name === "dry-run") {
    return new DryRunMusicProvider();
  }
  if (name === "elevenlabs") {
    const cfg = getProviderConfig(config, "elevenlabs");
    return new ElevenLabsMusicProvider({
      apiKey: String(cfg.api_key ?? ""),
      baseUrl: String(cfg.base_url ?? "https://api.elevenlabs.io"),
      modelId: String(cfg.music_model_id ?? "music_v1"),
    });
  }
  throw new CompileError(`Unknown music provider "${name}". Supported: dry-run, elevenlabs`);
}
