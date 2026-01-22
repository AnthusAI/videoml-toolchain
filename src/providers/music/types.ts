export type MusicRequest = {
  prompt: string;
  durationSeconds: number;
  sampleRateHz: number;
  seed?: number | null;
  modelId?: string | null;
  forceInstrumental?: boolean | null;
  extra?: Record<string, unknown> | null;
};

export type MusicVariant = {
  path: string;
  durationSec: number;
  seed?: number | null;
};

export interface MusicProvider {
  name: string;
  generate(req: MusicRequest, outPath: string): Promise<MusicVariant>;
}
