import { writeFileSync, renameSync, unlinkSync, existsSync } from "fs";
import type { TTSProvider, TTSRequest, TTSSegment } from "./types.js";
import { CompileError } from "../../errors.js";
import {
  probeDurationSec,
  validateAudioFile,
  AUDIO_MIN_ACTIVITY_RATIO_DEFAULT,
  AUDIO_MIN_DURATION_SEC_DEFAULT,
} from "../../media.js";

export class OpenAITTSProvider implements TTSProvider {
  name = "openai";
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  defaultVoice: string;

  constructor(opts: { apiKey: string; baseUrl?: string; defaultModel?: string; defaultVoice?: string }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? "https://api.openai.com/v1/audio/speech";
    this.defaultModel = opts.defaultModel ?? "gpt-4o-mini-tts";
    this.defaultVoice = opts.defaultVoice ?? "alloy";
  }

  async synthesize(req: TTSRequest, outPath: string): Promise<TTSSegment> {
    if (!this.apiKey) {
      throw new CompileError("OpenAI TTS requires providers.openai.api_key in config");
    }
    const model = req.model ?? this.defaultModel;
    const voice = req.voice ?? this.defaultVoice;

    // Lightweight pronunciation shim: ensure "Babulus" sounds like "bab-ulous" (rhymes with "fabulous" but starts with B)
    const normalizedText = req.text.replace(/\bBabulus\b/gi, (m) =>
      m[0] === "B" ? "Bab-ulous" : "bab-ulous"
    );

    const payload = {
      model,
      voice,
      input: normalizedText,
      response_format: "wav",
    };

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CompileError(`OpenAI TTS failed (${res.status}): ${text.slice(0, 400)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) {
      throw new CompileError(`OpenAI TTS returned suspiciously short response (${buf.length} bytes)`);
    }
    if (!buf.slice(0, 4).equals(Buffer.from("RIFF"))) {
      try {
        const errJson = JSON.parse(buf.toString("utf-8"));
        throw new CompileError(`OpenAI TTS returned error: ${JSON.stringify(errJson)}`);
      } catch {
        throw new CompileError(`OpenAI TTS returned invalid WAV (first 100 bytes): ${buf.slice(0, 100).toString("hex")}`);
      }
    }

    const tmpOutPath = `${outPath}.tmp-${Date.now()}-${process.pid}`;
    let wroteTmp = false;
    try {
      writeFileSync(tmpOutPath, buf);
      wroteTmp = true;

      const validation = validateAudioFile(tmpOutPath, {
        requireAudioStream: true,
        minBytes: 256,
        minDurationSec: AUDIO_MIN_DURATION_SEC_DEFAULT,
        probeSeconds: 3,
        sampleRateHz: req.sampleRateHz,
        minActivityRatio: AUDIO_MIN_ACTIVITY_RATIO_DEFAULT,
        checkSilence: true,
      });
      if (!validation.valid) {
        throw new CompileError(
          `OpenAI TTS returned unusable audio: ${validation.failures.join(", ")} ` +
          `(bytes=${validation.bytes}, duration=${validation.durationSec.toFixed(3)}s, ` +
          `activity_ratio=${(validation.activityRatio ?? 0).toFixed(4)})`,
        );
      }

      const duration = probeDurationSec(tmpOutPath);
      renameSync(tmpOutPath, outPath);
      wroteTmp = false;
      return { path: outPath, durationSec: duration };
    } finally {
      if (wroteTmp && existsSync(tmpOutPath)) {
        try {
          unlinkSync(tmpOutPath);
        } catch {
          // Ignore cleanup failures so the original synthesis error is preserved.
        }
      }
    }
  }
}
