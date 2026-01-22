import { writeFileSync } from "fs";
import { dirname } from "path";
import type { TTSProvider, TTSRequest, TTSSegment } from "./types.js";
import { CompileError } from "../../errors.js";
import { ensureDir } from "../../util.js";
import { probeDurationSec } from "../../media.js";

function azureOutputFormat(sampleRateHz: number): string {
  if (sampleRateHz === 44100) return "riff-44100hz-16bit-mono-pcm";
  if (sampleRateHz === 24000) return "riff-24khz-16bit-mono-pcm";
  if (sampleRateHz === 16000) return "riff-16khz-16bit-mono-pcm";
  if (sampleRateHz === 8000) return "riff-8khz-16bit-mono-pcm";
  throw new CompileError("Azure TTS sample_rate_hz must be 8000, 16000, 24000, or 44100");
}

export class AzureSpeechTTSProvider implements TTSProvider {
  name = "azure-speech";
  apiKey: string;
  region: string;
  voiceName: string;

  constructor(opts: { apiKey: string; region: string; voiceName?: string }) {
    this.apiKey = opts.apiKey;
    this.region = opts.region;
    this.voiceName = opts.voiceName ?? "en-US-JennyNeural";
  }

  async synthesize(req: TTSRequest, outPath: string): Promise<TTSSegment> {
    if (!this.apiKey || !this.region) {
      throw new CompileError("Azure TTS requires providers.azure_speech.api_key and providers.azure_speech.region");
    }
    const voice = req.voice ?? this.voiceName;
    ensureDir(dirname(outPath));

    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const outputFormat = azureOutputFormat(req.sampleRateHz);
    const ssml = [
      "<speak version='1.0' xml:lang='en-US'>",
      `  <voice name='${voice}'>`,
      `    ${req.text}`,
      "  </voice>",
      "</speak>",
    ].join("\n");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": outputFormat,
        "User-Agent": "babulus",
      },
      body: ssml,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CompileError(`Azure TTS failed (${res.status}): ${text.slice(0, 400)}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buf);
    const duration = probeDurationSec(outPath);
    return { path: outPath, durationSec: duration };
  }
}
