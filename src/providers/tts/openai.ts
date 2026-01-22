import { writeFileSync, statSync, readFileSync } from "fs";
import type { TTSProvider, TTSRequest, TTSSegment } from "./types.js";
import { CompileError } from "../../errors.js";

function wavDurationSec(path: string): number {
  const buf = readFileSync(path);
  if (buf.length < 44) {
    return 0;
  }
  const sampleRate = buf.readUInt32LE(24);
  const numChannels = buf.readUInt16LE(22);
  const bitsPerSample = buf.readUInt16LE(34);
  const bytesPerSample = bitsPerSample / 8;
  const headerSize = 44;
  const audioBytes = buf.length - headerSize;
  const frames = audioBytes / (numChannels * bytesPerSample);
  return frames / sampleRate;
}

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

    const payload = {
      model,
      voice,
      input: req.text,
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

    writeFileSync(outPath, buf);
    const duration = wavDurationSec(outPath);
    return { path: outPath, durationSec: duration };
  }
}
