export type SFXRequest = {
  prompt: string;
  durationSec?: number | null;
  format?: string;
  sampleRateHz: number;
  seed?: number | null;
  extra?: Record<string, unknown> | null;
};

export type SFXVariant = {
  path: string;
  durationSec: number;
  seed?: number | null;
};

export interface SFXProvider {
  name: string;
  generate(req: SFXRequest, outPath: string): Promise<SFXVariant>;
}
