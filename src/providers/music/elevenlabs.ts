import { writeFileSync } from "fs";
import { dirname } from "path";
import { CompileError } from "../../errors.js";
import { ensureDir } from "../../util.js";
import { probeDurationSec } from "../../media.js";
import type { MusicProvider, MusicRequest, MusicVariant } from "./types.js";

export class ElevenLabsMusicProvider implements MusicProvider {
  name = "elevenlabs";
  apiKey: string;
  baseUrl: string;
  modelId: string;

  constructor(opts: { apiKey: string; baseUrl?: string; modelId?: string }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? "https://api.elevenlabs.io";
    this.modelId = opts.modelId ?? "music_v1";
  }

  async generate(req: MusicRequest, outPath: string): Promise<MusicVariant> {
    if (!this.apiKey) {
      throw new CompileError("ElevenLabs music requires providers.elevenlabs.api_key in config");
    }
    ensureDir(dirname(outPath));
    const ms = Math.round(req.durationSeconds * 1000);
    if (ms < 3000 || ms > 600000) {
      throw new CompileError("ElevenLabs music duration_seconds must be between 3 and 600 seconds");
    }

    const payload: Record<string, unknown> = {
      prompt: req.prompt,
      music_length_ms: ms,
      model_id: req.modelId ?? this.modelId,
    };
    if (req.seed != null) {
      payload.seed = req.seed;
    }
    if (req.forceInstrumental != null) {
      payload.force_instrumental = req.forceInstrumental;
    }

    const res = await fetch(`${this.baseUrl}/v1/music`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        accept: "audio/*",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new CompileError(`ElevenLabs music failed (${res.status}): ${text.slice(0, 500)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buf);
    const duration = probeDurationSec(outPath);
    return { path: outPath, durationSec: duration, seed: req.seed ?? null };
  }
}
