import { writeFileSync } from "fs";
import { dirname } from "path";
import { CompileError } from "../../errors.js";
import { ensureDir } from "../../util.js";
import { probeDurationSec } from "../../media.js";
import type { SFXProvider, SFXRequest, SFXVariant } from "./types.js";

export class ElevenLabsSFXProvider implements SFXProvider {
  name = "elevenlabs";
  apiKey: string;
  baseUrl: string;
  modelId: string;
  promptInfluence?: number | null;
  loop?: boolean | null;

  constructor(opts: { apiKey: string; baseUrl?: string; modelId?: string; promptInfluence?: number | null; loop?: boolean | null }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? "https://api.elevenlabs.io";
    this.modelId = opts.modelId ?? "eleven_text_to_sound_v2";
    this.promptInfluence = opts.promptInfluence ?? null;
    this.loop = opts.loop ?? null;
  }

  async generate(req: SFXRequest, outPath: string): Promise<SFXVariant> {
    if (!this.apiKey) {
      throw new CompileError("ElevenLabs SFX requires providers.elevenlabs.api_key in config");
    }
    ensureDir(dirname(outPath));

    const payload: Record<string, unknown> = {
      text: req.prompt,
      model_id: this.modelId,
      duration_seconds: req.durationSec ?? undefined,
    };
    if (this.promptInfluence != null) {
      payload.prompt_influence = this.promptInfluence;
    }
    if (this.loop != null) {
      payload.loop = this.loop;
    }

    const res = await fetch(`${this.baseUrl}/v1/sound-generation`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CompileError(`ElevenLabs SFX failed (${res.status}): ${text.slice(0, 400)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buf);
    const duration = req.durationSec != null ? req.durationSec : probeDurationSec(outPath);
    return { path: outPath, durationSec: duration, seed: req.seed ?? null };
  }
}
