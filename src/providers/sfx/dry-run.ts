import { writeSilenceWav } from "../../audio/wav.js";
import type { SFXProvider, SFXRequest, SFXVariant } from "./types.js";

export class DryRunSFXProvider implements SFXProvider {
  name = "dry-run";

  async generate(req: SFXRequest, outPath: string): Promise<SFXVariant> {
    const duration = req.durationSec ?? 0.4;
    writeSilenceWav(outPath, duration, req.sampleRateHz);
    return { path: outPath, durationSec: duration, seed: req.seed ?? null };
  }
}
