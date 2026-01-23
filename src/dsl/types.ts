export type TimeRange = {
  start: number;
  end: number;
  startIsRelative?: boolean;
  endIsRelative?: boolean;
};

export type MarkupValue =
  | string
  | number
  | boolean
  | null
  | MarkupValue[]
  | { [key: string]: MarkupValue };

export type SemanticMarkup = Record<string, MarkupValue>;

export type PauseSpec =
  | { kind: "pause"; mode: "fixed"; seconds: number }
  | { kind: "pause"; mode: "gaussian"; mean: number; std: number; min?: number; max?: number };

export type VoiceSegmentSpec =
  | { kind: "text"; text: string; trimEndSec?: number | null }
  | { kind: "pause"; pause: PauseSpec };

export type CueSpec = {
  kind: "cue";
  id: string;
  label: string;
  segments: VoiceSegmentSpec[];
  bullets: string[];
  markup?: SemanticMarkup;
  time?: TimeRange;
  provider?: string | null;
};

export type SceneSpec = {
  id: string;
  title: string;
  time?: TimeRange;
  items: Array<CueSpec | PauseSpec>;
  markup?: SemanticMarkup;
};

export type PronunciationLexemeSpec = {
  grapheme: string;
  phoneme?: string;
  alphabet?: string;
  alias?: string;
};

export type VoiceoverConfig = {
  provider?: string | null;
  voice?: string | null;
  model?: string | null;
  format?: string;
  sampleRateHz?: number;
  seed?: number;
  leadInSeconds?: number;
  trimEndSeconds?: number;
  /**
   * Pause inserted between consecutive scene items.
   * Use `pause(0.4)` for fixed or `pause(0.4, 0.1)` for Gaussian.
   */
  pauseBetweenItems?: PauseSpec | number;
  pronunciationDictionaryLocators?: Array<{ pronunciationDictionaryId: string; versionId?: string | null }>;
  pronunciationDictionary?: {
    name?: string;
    workspaceAccess?: string | null;
    description?: string | null;
  };
  pronunciations?: PronunciationLexemeSpec[];
  maxTtsSegmentSeconds?: number;
};

export type VolumeFadeToSpec = {
  volume: number;
  afterSeconds: number;
  fadeDurationSeconds?: number;
};

export type VolumeFadeOutSpec = {
  volume: number;
  beforeEndSeconds: number;
  fadeDurationSeconds?: number;
};

export type CueRef = { cueId: string; offsetSec?: number };
export type SceneRef = { sceneId: string; offsetSec?: number };

export type StartAt =
  | { kind: "absolute"; sec: number }
  | { kind: "cue"; cue: CueRef }
  | { kind: "scene"; scene: SceneRef };

export type AudioClipSpec = {
  id: string;
  kind: "file" | "sfx" | "music";
  start: StartAt;
  volume?: number;
  fadeTo?: VolumeFadeToSpec;
  fadeOut?: VolumeFadeOutSpec;
  sourceId?: string | null;
  playThrough?: boolean;
  src?: string;
  prompt?: string;
  durationSeconds?: number | null;
  variants?: number;
  pick?: number;
  modelId?: string | null;
  forceInstrumental?: boolean | null;
};

export type AudioTrackSpec = {
  id: string;
  kind: string;
  clips: AudioClipSpec[];
};

export type AudioPlan = {
  sfxProvider?: string | null;
  musicProvider?: string | null;
  tracks: AudioTrackSpec[];
};

export type CompositionMeta = {
  fps?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type CompositionSpec = {
  id: string;
  title?: string | null;
  meta?: CompositionMeta;
  posterTime?: number | null;
  voiceover?: VoiceoverConfig;
  audioProviders?: { sfx?: string | null; music?: string | null };
  scenes: SceneSpec[];
  audioPlan?: AudioPlan;
};

export type SeriesSpec = {
  id: string;
  episodes: Array<{ id: string; props?: Record<string, unknown> }>;
  compositionId?: string;
};

export type VideoFileSpec = {
  compositions: CompositionSpec[];
  series?: SeriesSpec[];
};

export type CompositionDefaults = Partial<Pick<CompositionSpec, "voiceover" | "audioProviders" | "meta">> & {
  audioPlan?: Partial<AudioPlan>;
};
