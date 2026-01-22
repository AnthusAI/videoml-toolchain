import { writeSilenceWav } from "../../audio/wav.js";
import type { MusicProvider, MusicRequest, MusicVariant } from "./types.js";

export class DryRunMusicProvider implements MusicProvider {
  name = "dry-run";

  async generate(req: MusicRequest, outPath: string): Promise<MusicVariant> {
    const duration = req.durationSeconds;
    writeSilenceWav(outPath, duration, req.sampleRateHz);
    return { path: outPath, durationSec: duration, seed: req.seed ?? null };
  }
}
