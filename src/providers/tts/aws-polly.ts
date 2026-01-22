import { writeFileSync } from "fs";
import { dirname } from "path";
import { PollyClient, SynthesizeSpeechCommand, type VoiceId, type Engine, type LanguageCode } from "@aws-sdk/client-polly";
import type { TTSProvider, TTSRequest, TTSSegment } from "./types.js";
import { CompileError } from "../../errors.js";
import { ensureDir } from "../../util.js";

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

function pcmDurationSec(pcm: Buffer, sampleRateHz: number): number {
  const frames = Math.floor(pcm.length / 2);
  return frames / sampleRateHz;
}

export class PollyTTSProvider implements TTSProvider {
  name = "aws-polly";
  region: string;
  voiceId: string;
  engine: string;
  languageCode?: string | null;

  constructor(opts: { region?: string; voiceId?: string; engine?: string; languageCode?: string | null }) {
    this.region = opts.region ?? "us-east-1";
    this.voiceId = opts.voiceId ?? "Joanna";
    this.engine = opts.engine ?? "standard";
    this.languageCode = opts.languageCode ?? null;
  }

  async synthesize(req: TTSRequest, outPath: string): Promise<TTSSegment> {
    const voiceId = req.voice ?? this.voiceId;
    const allowed = [8000, 16000];
    if (!allowed.includes(req.sampleRateHz)) {
      throw new CompileError(
        `AWS Polly PCM only supports sample_rate_hz ${allowed.join(", ")} (got ${req.sampleRateHz}).`,
      );
    }

    const client = new PollyClient({ region: this.region });
    const command = new SynthesizeSpeechCommand({
      Text: req.text,
      OutputFormat: "pcm",
      VoiceId: voiceId as VoiceId,
      SampleRate: String(req.sampleRateHz),
      Engine: this.engine as Engine,
      LanguageCode: this.languageCode ? (this.languageCode as LanguageCode) : undefined,
    });

    const response = await client.send(command);
    if (!response.AudioStream) {
      throw new CompileError("AWS Polly response missing AudioStream");
    }

    const chunks: Buffer[] = [];
    const stream = response.AudioStream as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pcm = Buffer.concat(chunks);
    pcmToWav(pcm, req.sampleRateHz, outPath);
    const duration = pcmDurationSec(pcm, req.sampleRateHz);
    return { path: outPath, durationSec: duration };
  }
}
