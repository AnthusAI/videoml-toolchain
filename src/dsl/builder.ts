import { slugify } from "../util.js";
import type {
  AudioClipSpec,
  AudioPlan,
  AudioTrackSpec,
  CompositionDefaults,
  CompositionMeta,
  CompositionSpec,
  CueSpec,
  VisualStyles,
  LayerSpec,
  ComponentSpec,
  SemanticMarkup,
  PauseSpec,
  SceneSpec,
  TimeRange,
  VideoFileSpec,
  VoiceSegmentSpec,
  VoiceoverConfig,
} from "./types.js";
import { normalizePause, pause as pauseHelper } from "./pause.js";

export type DefineVideoFn = (builder: VideoBuilder | CompositionBuilder) => void | Promise<void>;

export type DefineVideoConfig = {
  fps?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

// New simplified signature: defineVideo(title, config, fn)
export function defineVideo(
  title: string,
  config: DefineVideoConfig,
  fn: (builder: CompositionBuilder) => void
): VideoFileSpec | Promise<VideoFileSpec>;
// New simplified signature without config: defineVideo(title, fn)
export function defineVideo(title: string, fn: (builder: CompositionBuilder) => void): VideoFileSpec | Promise<VideoFileSpec>;
// Legacy signature: defineVideo(fn) where fn receives VideoBuilder
export function defineVideo(fn: DefineVideoFn): VideoFileSpec | Promise<VideoFileSpec>;
export function defineVideo(
  titleOrFn: string | DefineVideoFn,
  configOrFn?: DefineVideoConfig | ((builder: CompositionBuilder) => void),
  fnMaybe?: (builder: CompositionBuilder) => void
): VideoFileSpec | Promise<VideoFileSpec> {
  // New simplified API: defineVideo(title, config, fn)
  if (typeof titleOrFn === "string" && typeof configOrFn === "object" && fnMaybe) {
    const builder = new CompositionBuilder(titleOrFn, { meta: configOrFn });
    const result = fnMaybe(builder);
    const maybePromise = result as Promise<void> | undefined;
    if (typeof maybePromise?.then === "function") {
      return (async () => {
        await maybePromise;
        return { compositions: [builder.toSpec()] };
      })();
    }
    return { compositions: [builder.toSpec()] };
  }

  // New simplified API: defineVideo(title, fn)
  if (typeof titleOrFn === "string" && typeof configOrFn === "function") {
    const builder = new CompositionBuilder(titleOrFn, {});
    const result = configOrFn(builder);
    const maybePromise = result as Promise<void> | undefined;
    if (typeof maybePromise?.then === "function") {
      return (async () => {
        await maybePromise;
        return { compositions: [builder.toSpec()] };
      })();
    }
    return { compositions: [builder.toSpec()] };
  }

  // Legacy API: defineVideo(fn) where fn receives VideoBuilder
  const fn = titleOrFn as DefineVideoFn;
  const builder = new VideoBuilder();
  const result = fn(builder);
  const maybePromise = result as Promise<void> | undefined;
  if (typeof maybePromise?.then === "function") {
    return (async () => {
      await maybePromise;
      return builder.toSpec();
    })();
  }
  return builder.toSpec();
}

export function defineDefaults(defaults: CompositionDefaults): CompositionDefaults {
  return defaults;
}

class VideoBuilder {
  private compositions: CompositionSpec[] = [];

  composition(
    name: string,
    optsOrFn?: Partial<CompositionSpec> | ((c: CompositionBuilder) => void),
    fnMaybe?: (c: CompositionBuilder) => void,
  ): CompositionSpec {
    const opts = typeof optsOrFn === "function" ? {} : optsOrFn ?? {};
    const fn = typeof optsOrFn === "function" ? optsOrFn : fnMaybe;
    if (!fn) {
      throw new Error("composition() requires a builder function");
    }
    const builder = new CompositionBuilder(name, opts);
    fn(builder);
    const spec = builder.toSpec();
    this.compositions.push(spec);
    return spec;
  }

  toSpec(): VideoFileSpec {
    return { compositions: this.compositions };
  }
}

class CompositionBuilder {
  private id: string;
  private title?: string | null;
  private _meta?: CompositionMeta;
  private _posterTime?: number | null;
  private _voiceover?: VoiceoverConfig;
  private _audioProviders?: { sfx?: string | null; music?: string | null };
  private scenes: SceneSpec[] = [];
  private audioPlan: AudioPlan = { tracks: [] };

  constructor(name: string, opts: Partial<CompositionSpec>) {
    this.id = slugify(name);
    this.title = opts.title ?? null;
    this._meta = opts.meta;
    this._posterTime = opts.posterTime ?? null;
    this._voiceover = opts.voiceover;
    this._audioProviders = opts.audioProviders;
    if (opts.audioPlan) {
      this.audioPlan = { ...opts.audioPlan, tracks: [...(opts.audioPlan.tracks ?? [])] };
    }
  }

  use(defaults: CompositionDefaults): void {
    this._meta = { ...defaults.meta, ...this._meta };
    this._voiceover = mergeVoiceover(defaults.voiceover, this._voiceover);
    this._audioProviders = { ...defaults.audioProviders, ...this._audioProviders };
    if (defaults.audioPlan) {
      const mergedTracks = [...(defaults.audioPlan.tracks ?? []), ...this.audioPlan.tracks];
      this.audioPlan = {
        ...defaults.audioPlan,
        ...this.audioPlan,
        tracks: mergedTracks,
      };
    }
  }

  meta(meta: CompositionMeta): void {
    this._meta = { ...this._meta, ...meta };
  }

  posterTime(seconds: number): void {
    this._posterTime = seconds;
  }

  audioProviders(providers: { sfx?: string | null; music?: string | null }): void {
    this._audioProviders = { ...this._audioProviders, ...providers };
  }

  voiceover(config: VoiceoverConfig): void {
    this._voiceover = mergeVoiceover(this._voiceover, config);
  }

  scene(
    name: string,
    optsOrFn?: Partial<SceneSpec> | ((s: SceneBuilder) => void),
    fnMaybe?: (s: SceneBuilder) => void,
  ): SceneSpec {
    const opts = typeof optsOrFn === "function" ? {} : optsOrFn ?? {};
    const fn = typeof optsOrFn === "function" ? optsOrFn : fnMaybe;
    if (!fn) {
      throw new Error("scene() requires a builder function");
    }
    const builder = new SceneBuilder(name, opts, this.audioPlan);
    fn(builder);
    const spec = builder.toSpec();
    this.scenes.push(spec);
    return spec;
  }

  toSpec(): CompositionSpec {
    return {
      id: this.id,
      title: this.title ?? undefined,
      meta: this._meta,
      posterTime: this._posterTime ?? undefined,
      voiceover: this._voiceover,
      audioProviders: this._audioProviders,
      scenes: this.scenes,
      audioPlan: this.audioPlan,
    };
  }
}

class SceneBuilder {
  private id: string;
  private sceneTitle: string;
  private time?: TimeRange;
  private items: Array<CueSpec | PauseSpec> = [];
  private audioPlan: AudioPlan;
  private _markup?: SemanticMarkup;
  private _styles?: VisualStyles;
  private _layers: LayerSpec[] = [];
  private _components: ComponentSpec[] = [];

  constructor(name: string, opts: Partial<SceneSpec>, audioPlan: AudioPlan) {
    this.id = opts.id ?? slugify(name);
    this.sceneTitle = opts.title ?? name;
    this.time = opts.time;
    this.audioPlan = audioPlan;
    this._markup = opts.markup;
    this._styles = opts.styles;
    this._layers = opts.layers ?? [];
    this._components = opts.components ?? [];
  }

  /**
   * Insert a fixed or Gaussian pause (seconds) between scene items.
   */
  pause(seconds: number): void;
  pause(mean: number, std: number, clamp?: { min?: number; max?: number }): void;
  pause(first: number, second?: number, clamp?: { min?: number; max?: number }): void {
    if (second !== undefined) {
      this.items.push(pauseHelper(first, second, clamp));
    } else {
      this.items.push(pauseHelper(first));
    }
  }

  cue(
    name: string,
    optsOrFn?: Partial<CueSpec> | ((c: CueBuilder) => void),
    fnMaybe?: (c: CueBuilder) => void,
  ): CueSpec {
    const opts = typeof optsOrFn === "function" ? {} : optsOrFn ?? {};
    const fn = typeof optsOrFn === "function" ? optsOrFn : fnMaybe;
    if (!fn) {
      throw new Error("cue() requires a builder function");
    }
    const id = opts.id ?? slugify(name);
    const label = opts.label ?? name;
    const cueBuilder = new CueBuilder(id, label, opts);
    fn(cueBuilder);
    const cueSpec = cueBuilder.toSpec();
    this.items.push(cueSpec);
    return cueSpec;
  }

  music(id: string, opts: Omit<AudioClipSpec, "id" | "kind" | "start"> & { at?: number }): void {
    const track = ensureTrack(this.audioPlan, "music", "music");
    track.clips.push({
      id,
      kind: "music",
      start: { kind: "scene", scene: { sceneId: this.id, offsetSec: opts.at ?? 0 } },
      volume: opts.volume,
      fadeTo: opts.fadeTo,
      fadeOut: opts.fadeOut,
      sourceId: opts.sourceId,
      playThrough: opts.playThrough,
      prompt: opts.prompt,
      durationSeconds: opts.durationSeconds ?? null,
      variants: opts.variants,
      pick: opts.pick,
      modelId: opts.modelId,
      forceInstrumental: opts.forceInstrumental,
    });
  }

  sfx(id: string, opts: Omit<AudioClipSpec, "id" | "kind" | "start"> & { at?: number }): void {
    const track = ensureTrack(this.audioPlan, "sfx", "sfx");
    track.clips.push({
      id,
      kind: "sfx",
      start: { kind: "scene", scene: { sceneId: this.id, offsetSec: opts.at ?? 0 } },
      volume: opts.volume,
      fadeTo: opts.fadeTo,
      fadeOut: opts.fadeOut,
      sourceId: opts.sourceId,
      prompt: opts.prompt,
      durationSeconds: opts.durationSeconds ?? null,
      variants: opts.variants,
      pick: opts.pick,
      modelId: opts.modelId,
    });
  }

  markup(markup: SemanticMarkup): void {
    this._markup = { ...(this._markup ?? {}), ...markup };
  }

  /**
   * Set scene-level styles that cascade to layers and components.
   */
  styles(styles: VisualStyles): void {
    this._styles = { ...(this._styles ?? {}), ...styles };
  }

  /**
   * Create a layer to group components with shared styles, markup, and timing.
   */
  layer(
    id: string,
    opts: {
      styles?: VisualStyles;
      markup?: SemanticMarkup;
      timing?: { startSec?: number; endSec?: number };
      visible?: boolean;
      zIndex?: number;
    },
    fn: (layer: LayerBuilder) => void,
  ): void {
    const layerSpec: LayerSpec = {
      id,
      styles: opts.styles,
      markup: opts.markup,
      timing: opts.timing,
      visible: opts.visible,
      zIndex: opts.zIndex,
      components: [],
    };

    const builder = new LayerBuilder(layerSpec);
    fn(builder);

    this._layers.push(layerSpec);
  }

  /**
   * Add a rectangle component directly to the scene.
   */
  rectangle(props: Record<string, unknown>): void {
    this._components.push({
      id: `rectangle-${this._components.length}`,
      type: "Rectangle",
      props,
    });
  }

  /**
   * Add a title component directly to the scene.
   */
  title(props: Record<string, unknown>): void {
    this._components.push({
      id: `title-${this._components.length}`,
      type: "Title",
      props,
    });
  }

  /**
   * Add a subtitle component directly to the scene.
   */
  subtitle(props: Record<string, unknown>): void {
    this._components.push({
      id: `subtitle-${this._components.length}`,
      type: "Subtitle",
      props,
    });
  }

  /**
   * Add a progress bar component directly to the scene.
   */
  progressBar(props?: Record<string, unknown>): void {
    this._components.push({
      id: `progress-${this._components.length}`,
      type: "ProgressBar",
      props: props ?? {},
    });
  }

  toSpec(): SceneSpec {
    return {
      id: this.id,
      title: this.sceneTitle,
      time: this.time,
      items: this.items,
      markup: this._markup,
      styles: this._styles,
      layers: this._layers.length > 0 ? this._layers : undefined,
      components: this._components.length > 0 ? this._components : undefined,
    };
  }
}

/**
 * Builder for creating layers (groups of components with shared styles).
 */
class LayerBuilder {
  constructor(private spec: LayerSpec) {}

  /**
   * Add a rectangle component to this layer.
   */
  rectangle(props: Record<string, unknown>): this {
    this.spec.components.push({
      id: `rectangle-${this.spec.components.length}`,
      type: "Rectangle",
      props,
    });
    return this;
  }

  /**
   * Add a title component to this layer.
   */
  title(props: Record<string, unknown>): this {
    this.spec.components.push({
      id: `title-${this.spec.components.length}`,
      type: "Title",
      props,
    });
    return this;
  }

  /**
   * Add a subtitle component to this layer.
   */
  subtitle(props: Record<string, unknown>): this {
    this.spec.components.push({
      id: `subtitle-${this.spec.components.length}`,
      type: "Subtitle",
      props,
    });
    return this;
  }

  /**
   * Add a progress bar component to this layer.
   */
  progressBar(props?: Record<string, unknown>): this {
    this.spec.components.push({
      id: `progress-${this.spec.components.length}`,
      type: "ProgressBar",
      props: props ?? {},
    });
    return this;
  }

  /**
   * Add a custom component to this layer.
   */
  component(
    id: string,
    type: string | React.ComponentType<any>,
    props?: Record<string, unknown>,
    options?: {
      markup?: SemanticMarkup;
      styles?: VisualStyles;
      zIndex?: number;
      visible?: boolean;
      timing?: { startSec?: number; endSec?: number };
    }
  ): this {
    this.spec.components.push({
      id,
      type,
      props: props ?? {},
      markup: options?.markup,
      styles: options?.styles,
      zIndex: options?.zIndex,
      visible: options?.visible,
      timing: options?.timing,
    });
    return this;
  }
}

class CueBuilder {
  private id: string;
  private label: string;
  private time?: TimeRange;
  private _bullets: string[] = [];
  private segments: VoiceSegmentSpec[] = [];
  private provider?: string | null;
  private _markup?: SemanticMarkup;

  constructor(id: string, label: string, opts: Partial<CueSpec>) {
    this.id = id;
    this.label = label;
    this.time = opts.time;
    this.provider = opts.provider ?? null;
    this._markup = opts.markup;
    if (opts.bullets) {
      this._bullets = [...opts.bullets];
    }
  }

  voice(fn: (v: VoiceBuilder) => void): void {
    const builder = new VoiceBuilder();
    fn(builder);
    this.segments = builder.toSegments();
  }

  bullets(items: string[]): void {
    this._bullets = [...items];
  }

  markup(markup: SemanticMarkup): void {
    this._markup = { ...(this._markup ?? {}), ...markup };
  }

  toSpec(): CueSpec {
    return {
      kind: "cue",
      id: this.id,
      label: this.label,
      segments: this.segments,
      bullets: this._bullets,
      markup: this._markup,
      time: this.time,
      provider: this.provider,
    };
  }
}

class VoiceBuilder {
  private segments: VoiceSegmentSpec[] = [];

  say(text: string, opts?: { trimEndSeconds?: number }): void {
    const trimEndSec = opts?.trimEndSeconds ?? null;
    this.segments.push({ kind: "text", text, trimEndSec });
  }

  /**
   * Insert a fixed or Gaussian pause (seconds) between voice segments.
   */
  pause(seconds: number): void;
  pause(mean: number, std: number, clamp?: { min?: number; max?: number }): void;
  pause(first: number, second?: number, clamp?: { min?: number; max?: number }): void {
    const spec = second !== undefined ? pauseHelper(first, second, clamp) : pauseHelper(first);
    this.segments.push({ kind: "pause", pause: spec });
  }

  toSegments(): VoiceSegmentSpec[] {
    return this.segments;
  }
}

function mergeVoiceover(base?: VoiceoverConfig, override?: VoiceoverConfig): VoiceoverConfig | undefined {
  if (!base && !override) {
    return undefined;
  }
  return {
    ...base,
    ...override,
    pronunciationDictionary: {
      ...base?.pronunciationDictionary,
      ...override?.pronunciationDictionary,
    },
    pronunciations: override?.pronunciations ?? base?.pronunciations,
  };
}

function ensureTrack(audioPlan: AudioPlan, id: string, kind: string): AudioTrackSpec {
  let track = audioPlan.tracks.find((t) => t.id === id);
  if (!track) {
    track = { id, kind, clips: [] };
    audioPlan.tracks.push(track);
  }
  return track;
}

export type { CompositionBuilder, SceneBuilder, CueBuilder, VoiceBuilder };
