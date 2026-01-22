import { writeFileSync } from "fs";
import type { TTSProvider, TTSRequest, TTSSegment } from "./types.js";
import { CompileError } from "../../errors.js";
import { audioActivityRatio, isAudioAllSilence, probeDurationSec } from "../../media.js";
import { ensureDir } from "../../util.js";
import { dirname } from "path";

function pcmToWav(pcm: Buffer, sampleRateHz: number, outPath: string): void {
  ensureDir(dirname(outPath));
  if (pcm.length % 2 !== 0) {
    pcm = pcm.subarray(0, pcm.length - 1);
  }
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRateHz, 24);
  header.writeUInt32LE(sampleRateHz * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  writeFileSync(outPath, Buffer.concat([header, pcm]));
}

function defaultOutputFormat(sampleRateHz: number): string {
  if ([22050, 24000, 44100].includes(sampleRateHz)) {
    return `mp3_${sampleRateHz}_128`;
  }
  return "mp3_44100_128";
}

export class ElevenLabsTTSProvider implements TTSProvider {
  name = "elevenlabs";
  apiKey: string;
  voiceId: string;
  modelId: string;
  baseUrl: string;
  voiceSettings?: Record<string, unknown> | null;
  outputFormat?: string | null;
  pronunciationDictionaryLocators?: Array<Record<string, unknown>> | null;

  constructor(opts: {
    apiKey: string;
    voiceId?: string;
    modelId?: string;
    baseUrl?: string;
    voiceSettings?: Record<string, unknown> | null;
    outputFormat?: string | null;
    pronunciationDictionaryLocators?: Array<Record<string, unknown>> | null;
  }) {
    this.apiKey = opts.apiKey;
    this.voiceId = opts.voiceId ?? "";
    this.modelId = opts.modelId ?? "eleven_multilingual_v2";
    this.baseUrl = opts.baseUrl ?? "https://api.elevenlabs.io";
    this.voiceSettings = opts.voiceSettings ?? null;
    this.outputFormat = opts.outputFormat ?? null;
    this.pronunciationDictionaryLocators = opts.pronunciationDictionaryLocators ?? null;
  }

  async synthesize(req: TTSRequest, outPath: string): Promise<TTSSegment> {
    if (!this.apiKey) {
      throw new CompileError("ElevenLabs TTS requires providers.elevenlabs.api_key in config");
    }
    const voiceId = req.voice ?? this.voiceId;
    if (!voiceId) {
      throw new CompileError("ElevenLabs TTS requires providers.elevenlabs.voice_id (or request voice)");
    }
    if (!req.text || !req.text.trim()) {
      throw new CompileError("ElevenLabs TTS requires non-empty text");
    }

    ensureDir(dirname(outPath));

    const url = `${this.baseUrl}/v1/text-to-speech/${voiceId}/stream`;
    const outputFormat = this.outputFormat ?? defaultOutputFormat(req.sampleRateHz);

    const payloadBase: Record<string, unknown> = {
      text: req.text,
      model_id: req.model ?? this.modelId,
    };
    if (this.voiceSettings) {
      payloadBase.voice_settings = this.voiceSettings;
    }

    const extraLocators = (req.extra as Record<string, unknown> | undefined)?.pronunciation_dictionary_locators;
    const locators = extraLocators ?? this.pronunciationDictionaryLocators;

    const post = async (payload: Record<string, unknown>): Promise<Buffer> => {
      const res = await fetch(url, {
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
        throw new CompileError(`ElevenLabs TTS failed (${res.status}): ${text.slice(0, 400)}`);
      }
      return Buffer.from(await res.arrayBuffer());
    };

    const payload: Record<string, unknown> = { ...payloadBase };
    if (locators) {
      payload.pronunciation_dictionary_locators = locators;
    }

    let audio = await post(payload);

    if (outputFormat.startsWith("pcm_")) {
      pcmToWav(audio, req.sampleRateHz, outPath);
      return { path: outPath, durationSec: probeDurationSec(outPath) };
    }

    writeFileSync(outPath, audio);
    let duration = probeDurationSec(outPath);
    const probeSec = Math.min(3.0, Math.max(0.25, duration));
    let silent = isAudioAllSilence(outPath, probeSec, req.sampleRateHz);
    let activity = audioActivityRatio(outPath, probeSec, req.sampleRateHz);

    const looksBad = () => silent || activity < 0.01;

    if (looksBad() && locators) {
      const retryPayload = { ...payloadBase };
      audio = await post(retryPayload);
      writeFileSync(outPath, audio);
      duration = probeDurationSec(outPath);
      const retryProbe = Math.min(3.0, Math.max(0.25, duration));
      silent = isAudioAllSilence(outPath, retryProbe, req.sampleRateHz);
      activity = audioActivityRatio(outPath, retryProbe, req.sampleRateHz);
    }

    if (looksBad()) {
      throw new CompileError(`ElevenLabs returned unusable audio (activity_ratio=${activity.toFixed(4)})`);
    }

    return { path: outPath, durationSec: duration };
  }
}
