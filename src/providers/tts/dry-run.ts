import { writeSilenceWav } from "../../audio/wav.js";
import type { TTSProvider, TTSRequest, TTSSegment } from "./types.js";

function estimateDurationSec(text: string, wpm: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return 0;
  }
  return Math.max(0.25, (words.length / wpm) * 60);
}

export class DryRunProvider implements TTSProvider {
  name = "dry-run";
  wpm: number;

  constructor(wpm = 165) {
    this.wpm = wpm;
  }

  async synthesize(req: TTSRequest, outPath: string): Promise<TTSSegment> {
    const duration = estimateDurationSec(req.text, this.wpm);
    writeSilenceWav(outPath, duration, req.sampleRateHz);
    return { path: outPath, durationSec: duration };
  }
}
