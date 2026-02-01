import { writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from "fs";
import { dirname, join, resolve, sep } from "path";
import { CompileError } from "./errors.js";
import { getDefaultMusicProvider, getDefaultProvider, getDefaultSfxProvider, type Config } from "./config.js";
import { getEnvironment, resolveEnvCacheDir } from "./env.js";
import { loadManifest, getManifestDuration, resolveCachedSegment, resolveCachedSfx, resolveCachedMusic } from "./cache-resolver.js";
import { hashKey, safePrefix, ensureDir } from "./util.js";
import { makeBullet, type Script, scriptToJson } from "./models.js";
import { getTtsProvider } from "./providers/tts/registry.js";
import { getSfxProvider } from "./providers/sfx/registry.js";
import { getMusicProvider } from "./providers/music/registry.js";
import { type CompositionSpec, type PauseSpec, type SceneSpec, type VoiceSegmentSpec, type AudioClipSpec } from "./dsl/types.js";
import { pause as pauseHelper } from "./dsl/pause.js";
import { concatAudioFiles, estimateTrailingSilenceSec, probeDurationSec, trimAudioToDuration } from "./media.js";
import { writeSilenceWav } from "./audio/wav.js";
import { loadSelections, selectionPath } from "./sfx-workflow.js";
import { ensureDictionaryFromRules, rulesHash, type PronunciationRule } from "./elevenlabs-pronunciation.js";
import { ElevenLabsTTSProvider } from "./providers/tts/elevenlabs.js";
import { createUsageLedger, recordUsage, summarizeUsageFile, summarizeUsageFileDetailed, type UsageEntry } from "./telemetry.js";
import { estimateUsageCost, getRateCard } from "./pricing.js";
import { writeRunArtifacts } from "./artifacts.js";

export type GeneratedArtifact = {
  script: Script;
  audioPath: string | null;
  timelinePath: string;
  didSynthesize: boolean;
  runId?: string;
  runPath?: string;
};

export type GenerateOptions = {
  composition: CompositionSpec;
  dslPath: string;
  scriptOut: string;
  audioOut?: string | null;
  timelineOut: string;
  outDir: string;
  config: Config;
  providerOverride?: string | null;
  sfxProviderOverride?: string | null;
  musicProviderOverride?: string | null;
  seedOverride?: number | null;
  fresh?: boolean;
  usagePath?: string | null;
  log?: (msg: string) => void;
  verboseLogs?: boolean;
};

export async function generateComposition(options: GenerateOptions): Promise<GeneratedArtifact> {
  const {
    composition,
    dslPath,
    scriptOut,
    audioOut,
    timelineOut,
    outDir,
    config,
    providerOverride,
    sfxProviderOverride,
    musicProviderOverride,
    seedOverride,
    fresh = false,
    log,
    verboseLogs = true,
  } = options;

  const _log = (msg: string) => {
    if (log) {
      log(msg);
    }
  };

  const voiceover = composition.voiceover ?? {};
  const sampleRateHz = voiceover.sampleRateHz ?? 44100;
  const leadInSec = voiceover.leadInSeconds ?? 0;
  const defaultTrimEnd = voiceover.trimEndSeconds ?? 0;
  const providerName = providerOverride ?? voiceover.provider ?? getDefaultProvider(config) ?? "dry-run";
  const provider = getTtsProvider(providerName, config);
  const resolvedModel = voiceover.model ?? (provider as { defaultModel?: string }).defaultModel ?? null;
  const resolvedVoice = voiceover.voice ?? (provider as { defaultVoice?: string }).defaultVoice ?? null;

  if (verboseLogs) {
    const modelInfo = `model=${resolvedModel ?? ""}`;
    const voiceInfo = `voice=${resolvedVoice ?? ""}`;
    _log(`voice: provider=${providerName} ${modelInfo} ${voiceInfo} fresh=${Boolean(fresh)}`);
    _log(`meta: fps=${composition.meta?.fps ?? "undefined"} width=${composition.meta?.width ?? "undefined"} height=${composition.meta?.height ?? "undefined"}`);
  }

  const rng = makeRng(seedOverride ?? voiceover.seed ?? null);

  const currentEnv = getEnvironment();
  const envCacheDir = resolveEnvCacheDir(outDir, currentEnv);
  const segmentsDir = join(envCacheDir, "segments");
  ensureDir(segmentsDir);
  const usagePath = options.usagePath === undefined ? join(envCacheDir, "usage.jsonl") : options.usagePath;
  const usageLedger = usagePath ? createUsageLedger(usagePath) : null;
  const rateCard = getRateCard(config);
  const manifestPath = join(envCacheDir, "manifest.json");
  const baseManifest = fresh ? {} : loadManifest(manifestPath);
  const manifest = normalizeManifest(baseManifest);

  if (verboseLogs) {
    _log(`cache: env=${currentEnv} provider=${providerName}`);
  }

  let didSynthesize = false;
  let pronunciationRulesHash: string | null = null;
  let effectivePronunciationLocators: Array<Record<string, unknown>> | null = null;

  if (providerName === "elevenlabs" && voiceover.pronunciations && voiceover.pronunciations.length > 0) {
    const rules: PronunciationRule[] = voiceover.pronunciations.map((lex) => {
      if (lex.alias) {
        return { stringToReplace: lex.grapheme, type: "alias", alias: lex.alias };
      }
      if (!lex.phoneme) {
        throw new CompileError(`Pronunciation lexeme for "${lex.grapheme}" must provide phoneme or alias`);
      }
      return {
        stringToReplace: lex.grapheme,
        type: "phoneme",
        phoneme: lex.phoneme,
        alphabet: lex.alphabet ?? "ipa",
      };
    });

    if (!(provider instanceof ElevenLabsTTSProvider)) {
      throw new CompileError("ElevenLabs pronunciation rules require the elevenlabs provider");
    }

    if (!provider.apiKey) {
      throw new CompileError("ElevenLabs pronunciation dictionaries require providers.elevenlabs.api_key in config");
    }

    pronunciationRulesHash = rulesHash(rules);
    const dictName = voiceover.pronunciationDictionary?.name ?? `babulus-${composition.id}`;
    const { id: dictId } = await ensureDictionaryFromRules({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      name: dictName,
      rules,
      manifest,
      workspaceAccess: voiceover.pronunciationDictionary?.workspaceAccess ?? null,
      description: voiceover.pronunciationDictionary?.description ?? null,
    });

    const merged: Array<Record<string, unknown>> = [
      { pronunciation_dictionary_id: dictId, version_id: null },
    ];

    if (voiceover.pronunciationDictionaryLocators) {
      for (const loc of voiceover.pronunciationDictionaryLocators) {
        if (loc.pronunciationDictionaryId === dictId) {
          continue;
        }
        merged.push({
          pronunciation_dictionary_id: loc.pronunciationDictionaryId,
          version_id: loc.versionId ?? null,
        });
      }
    }
    if (merged.length > 3) {
      throw new CompileError("ElevenLabs supports up to 3 pronunciation dictionaries per request");
    }
    effectivePronunciationLocators = merged;
  }

  const ttsContext = {
    voice: voiceover.voice ?? null,
    model: voiceover.model ?? null,
    format: voiceover.format ?? "wav",
    sample_rate_hz: sampleRateHz,
    provider_ctx: providerCacheContext(providerName, provider),
    pronunciation_dictionary_locators: effectivePronunciationLocators,
    pronunciation_rules_hash: pronunciationRulesHash,
  };

  let now = 0;
  const timelineItems: Array<Record<string, unknown>> = [];
  const outScenes: Script["scenes"] = [];
  const segmentKeyCounts: Record<string, number> = {};
  const segmentPathsForConcat: string[] = [];
  const narrationSegmentClips: Array<Record<string, unknown>> = [];
  const cueStartIndex: Record<string, number> = {};
  const cueSceneIndex: Record<string, string> = {};
  const sceneStartIndex: Record<string, number> = {};

  const audioOutPath = audioOut ? resolve(audioOut) : null;
  const publicSegmentsDir = audioOutPath && audioOutPath.split(sep).includes("public")
    ? join(dirname(audioOutPath), composition.id, "env", currentEnv, "segments")
    : null;
  if (publicSegmentsDir) {
    ensureDir(publicSegmentsDir);
  }

  if (leadInSec > 0) {
    if (composition.scenes.some((scene) => scene.time)) {
      throw new CompileError("voiceover.leadInSeconds is only supported when scene times are omitted");
    }
    now = leadInSec;
    timelineItems.push({ type: "lead_in", startSec: 0, endSec: now, seconds: now });

    // Generate silence audio file for lead-in
    const silenceKey = hashKey({ kind: "silence", durationSec: leadInSec, sampleRateHz });
    const silencePath = join(segmentsDir, `silence-${safePrefix(silenceKey)}.wav`);
    if (!existsSync(silencePath)) {
      writeSilenceWav(silencePath, leadInSec, sampleRateHz);
    }
    segmentPathsForConcat.push(silencePath);
  }

  const recordUsageEvent = (entry: Omit<UsageEntry, "timestamp">) => {
    if (!usageLedger) {
      return;
    }
    const estimatedCost = estimateUsageCost(entry, rateCard);
    recordUsage(usageLedger, { ...entry, estimatedCost });
  };

  for (const scene of composition.scenes) {
    const sceneStart = scene.time ? scene.time.start : now;
    if (scene.time && sceneStart < now - 1e-6) {
      throw new CompileError(`Scene "${scene.id}" starts before previous scene ends`);
    }
    now = sceneStart;
    const cuesOut: Script["scenes"][number]["cues"] = [];

    for (let idx = 0; idx < scene.items.length; idx += 1) {
      const item = scene.items[idx];
      if (idx > 0) {
        const pauseSpec = normalizePauseSpec(voiceover.pauseBetweenItems);
        if (pauseSpec) {
          const pause = samplePause(pauseSpec, rng);
          if (pause > 0) {
            const start = now;
            now += pause;
            timelineItems.push({ type: "pause", sceneId: scene.id, startSec: start, endSec: now, seconds: pause });

            // Generate silence audio file for this pause
            const silenceKey = hashKey({ kind: "silence", durationSec: pause, sampleRateHz });
            const silencePath = join(segmentsDir, `silence-${safePrefix(silenceKey)}.wav`);
            if (!existsSync(silencePath)) {
              writeSilenceWav(silencePath, pause, sampleRateHz);
            }
            segmentPathsForConcat.push(silencePath);
          }
        }
      }

      if (item.kind === "pause") {
        const pauseSec = samplePause(item, rng);
        const start = now;
        now += pauseSec;
        timelineItems.push({ type: "pause", sceneId: scene.id, startSec: start, endSec: now, seconds: pauseSec });

        // Generate silence audio file for this pause
        const silenceKey = hashKey({ kind: "silence", durationSec: pauseSec, sampleRateHz });
        const silencePath = join(segmentsDir, `silence-${safePrefix(silenceKey)}.wav`);
        if (!existsSync(silencePath)) {
          writeSilenceWav(silencePath, pauseSec, sampleRateHz);
        }
        segmentPathsForConcat.push(silencePath);

        continue;
      }

      const cue = item;
      const start = now;
      const cueSegments: Array<Record<string, unknown>> = [];

      for (let segIndex = 0; segIndex < cue.segments.length; segIndex += 1) {
        const segSpec = cue.segments[segIndex];
        if (segSpec.kind === "pause") {
          const pauseSec = samplePause(segSpec.pause, rng);
          const segStart = now;
          now += pauseSec;
          cueSegments.push({ type: "pause", startSec: segStart, endSec: now, seconds: pauseSec });

          // Generate silence audio file for this pause
          const silenceKey = hashKey({ kind: "silence", durationSec: pauseSec, sampleRateHz });
          const silencePath = join(segmentsDir, `silence-${safePrefix(silenceKey)}.wav`);
          if (!existsSync(silencePath)) {
            writeSilenceWav(silencePath, pauseSec, sampleRateHz);
          }
          segmentPathsForConcat.push(silencePath);

          continue;
        }

        const trimEndCfg = segSpec.trimEndSec ?? defaultTrimEnd ?? 0;
        const segKey = hashKey({
          kind: "tts",
          sceneId: scene.id,
          cueId: cue.id,
          text: segSpec.text,
          trimEndSec: trimEndCfg,
          ctx: ttsContext,
        });
        segmentKeyCounts[segKey] = (segmentKeyCounts[segKey] ?? 0) + 1;
        const occurrence = segmentKeyCounts[segKey];
        const ttsExt = providerName === "elevenlabs" ? ".mp3" : ".wav";
        let segPath = join(segmentsDir, `${scene.id}--${cue.id}--tts--${safePrefix(segKey)}--${occurrence}${ttsExt}`);

        const cached = resolveCachedSegment(outDir, currentEnv, segKey, scene.id, cue.id, occurrence, ttsExt, _log);
        let duration: number;
        // Verify the cached file actually exists before using it
        const cacheValid = cached.path && !fresh && existsSync(cached.path);
        if (cacheValid) {
          segPath = cached.path!;
          duration = getManifestDuration(manifest, "segments", segPath, segKey) ?? probeDurationSec(segPath);
          if (cached.env !== currentEnv) {
            _log(`tts: fallback scene=${scene.id} cue=${cue.id} seg=${segIndex + 1} using env=${cached.env}`);
          } else if (verboseLogs) {
            _log(`tts: cache scene=${scene.id} cue=${cue.id} seg=${segIndex + 1} key=${safePrefix(segKey).slice(0, 8)}`);
          }
        } else {
          // Log if cache entry exists but file is missing
          if (cached.path && !fresh && !existsSync(cached.path)) {
            _log(`tts: cache miss scene=${scene.id} cue=${cue.id} seg=${segIndex + 1} (manifest entry exists but file missing)`);
          }
          _log(`tts: synth scene=${scene.id} cue=${cue.id} seg=${segIndex + 1} -> ${segPath.split(sep).pop()}`);
          try {
            const seg = await provider.synthesize(
              {
                text: segSpec.text,
                voice: voiceover.voice ?? null,
                model: voiceover.model ?? null,
                format: voiceover.format ?? "wav",
                sampleRateHz,
                extra: effectivePronunciationLocators ? { pronunciation_dictionary_locators: effectivePronunciationLocators } : {},
              },
              segPath,
            );
            recordUsageEvent({
              kind: "tts",
              unitType: "chars",
              quantity: segSpec.text.length,
              provider: providerName,
              compositionId: composition.id,
              sceneId: scene.id,
              cueId: cue.id,
              segmentIndex: segIndex,
              model: resolvedModel,
              voice: resolvedVoice,
              env: currentEnv,
            });
            duration = seg.durationSec;
            didSynthesize = true;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new CompileError(
              `${message}\n\nLocation: ${dslPath}\n  Scene: ${scene.id}\n  Cue: ${cue.id}\n  Segment: ${segIndex + 1}`,
            );
          }
        }

        const maxSeg = voiceover.maxTtsSegmentSeconds ?? 180;
        if (duration > maxSeg) {
          _log(`tts: corrupt-duration scene=${scene.id} cue=${cue.id} seg=${segIndex + 1} duration=${duration.toFixed(1)}s -> regen`);
          const seg = await provider.synthesize(
            {
              text: segSpec.text,
              voice: voiceover.voice ?? null,
              model: voiceover.model ?? null,
              format: voiceover.format ?? "wav",
              sampleRateHz,
              extra: effectivePronunciationLocators ? { pronunciation_dictionary_locators: effectivePronunciationLocators } : {},
            },
            segPath,
          );
          recordUsageEvent({
            kind: "tts",
            unitType: "chars",
            quantity: segSpec.text.length,
            provider: providerName,
            compositionId: composition.id,
            sceneId: scene.id,
            cueId: cue.id,
            segmentIndex: segIndex,
            model: resolvedModel,
            voice: resolvedVoice,
            env: currentEnv,
          });
          duration = seg.durationSec;
          didSynthesize = true;
        }

        let trimEnd = 0;
        if (trimEndCfg > 0) {
          const trailing = estimateTrailingSilenceSec(segPath, sampleRateHz, 80, 6.0);
          const safety = 0.08;
          trimEnd = trailing >= (trimEndCfg + safety) ? trimEndCfg : 0;
        }
        const effectiveDuration = trimEnd > 0 ? Math.max(0, duration - trimEnd) : duration;
        setManifestEntry(manifest, "segments", segPath, segKey, effectiveDuration, {
          provider: providerName,
          sceneId: scene.id,
          cueId: cue.id,
          text: segSpec.text,
          sample_rate_hz: sampleRateHz,
          format: segPath.split(".").pop(),
          rawDurationSec: duration,
          trimEndSec: trimEnd,
        });

        const segStart = now;
        const segEnd = segStart + effectiveDuration;
        now = segEnd;

        const concatPath = trimEnd > 0
          ? ensureTrimmed(segPath, envCacheDir, effectiveDuration, sampleRateHz, fresh)
          : segPath;
        segmentPathsForConcat.push(concatPath);

        if (publicSegmentsDir) {
          const staged = join(publicSegmentsDir, segPath.split(sep).pop() ?? "segment.wav");
          copyFileSync(concatPath, staged);
          narrationSegmentClips.push({
            id: staged.split(sep).pop()?.replace(/\.[^.]+$/, "") ?? "segment",
            kind: "file",
            startSec: segStart,
            durationSec: effectiveDuration,
            src: toPublicPath(staged),
            volume: 1.0,
          });
        }

        cueSegments.push({
          type: "tts",
          startSec: segStart,
          endSec: segEnd,
          text: segSpec.text,
          segmentPath: segPath,
          durationSec: effectiveDuration,
          rawDurationSec: duration,
          trimEndSec: trimEnd,
        });
      }

      const end = now;
      cuesOut.push({
        id: cue.id,
        label: cue.label,
        startSec: start,
        endSec: end,
        text: cue.segments.filter(isTextSegment).map((s) => s.text).join(" ").trim(),
        bullets: cue.bullets.map(makeBullet),
        markup: cue.markup,
        segments: cueSegments.map(seg => ({
          type: seg.type as "tts" | "pause",
          startSec: seg.startSec as number,
          endSec: seg.endSec as number,
          text: seg.text as string | undefined,
          durationSec: seg.seconds as number | undefined,
        })),
      });
      if (cueStartIndex[cue.id] != null) {
        throw new CompileError(`Duplicate cue id across scenes: "${cue.id}"`);
      }
      cueStartIndex[cue.id] = start;
      cueSceneIndex[cue.id] = scene.id;
      timelineItems.push({ type: "tts", sceneId: scene.id, cueId: cue.id, startSec: start, endSec: end, segments: cueSegments });
    }

    if (!cuesOut.length) {
      throw new CompileError(`Scene "${scene.id}" has no cues`);
    }

    const sceneEndHint = scene.time ? scene.time.end : null;
    now = Math.max(now, sceneEndHint ?? now);
    // Inject sceneStartSec into component props
    const layersWithSceneStart = scene.layers?.map(layer => ({
      ...layer,
      components: layer.components.map(comp => ({
        ...comp,
        props: {
          ...(comp.props || {}),
          sceneStartSec: sceneStart,
        },
      })),
    }));

    outScenes.push({
      id: scene.id,
      title: scene.title,
      startSec: sceneStart,
      endSec: now,
      cues: cuesOut,
      markup: scene.markup,
      styles: scene.styles,
      layers: layersWithSceneStart,
      components: scene.components,
    });
    if (sceneStartIndex[scene.id] != null) {
      throw new CompileError(`Duplicate scene id: "${scene.id}"`);
    }
    sceneStartIndex[scene.id] = sceneStart;
  }

  const script: Script = {
    scenes: outScenes,
    posterTimeSec: composition.posterTime ?? null,
    fps: composition.meta?.fps,
    meta: composition.meta,
  };
  const sceneEndIndex: Record<string, number> = {};
  for (const scene of outScenes) {
    sceneEndIndex[scene.id] = scene.endSec;
  }
  const totalEndSec = outScenes.length ? outScenes[outScenes.length - 1].endSec : 0;

  ensureDir(dirname(scriptOut));
  writeFileSync(scriptOut, JSON.stringify(scriptToJson(script), null, 2) + "\n", "utf-8");
  if (verboseLogs) {
    _log(`write: script=${scriptOut} duration_seconds=${totalEndSec.toFixed(2)}`);
  }

  const audioTracksOut: Array<Record<string, unknown>> = [];
  if (narrationSegmentClips.length) {
    audioTracksOut.push({ id: "narration", kind: "narration", clips: narrationSegmentClips });
  }

  if (composition.audioPlan) {
    const sfxSelections = loadSelections(outDir);
    const defaultSfxProvider = sfxProviderOverride
      ?? composition.audioProviders?.sfx
      ?? composition.audioPlan.sfxProvider
      ?? getDefaultSfxProvider(config)
      ?? "dry-run";
    const defaultMusicProvider = musicProviderOverride
      ?? composition.audioProviders?.music
      ?? composition.audioPlan.musicProvider
      ?? getDefaultMusicProvider(config)
      ?? "dry-run";

    let sfxProvider: ReturnType<typeof getSfxProvider> | null = null;
    let musicProvider: ReturnType<typeof getMusicProvider> | null = null;

    try {
      sfxProvider = getSfxProvider(defaultSfxProvider, config);
    } catch (err) {
      _log(`audio: WARNING: ${(err as Error).message}. SFX generation will be skipped.`);
      sfxProvider = null;
    }

    try {
      musicProvider = getMusicProvider(defaultMusicProvider, config);
    } catch (err) {
      _log(`audio: WARNING: ${(err as Error).message}. Music generation will be skipped.`);
      musicProvider = null;
    }

    if (verboseLogs) {
      _log(`audio: sfx_provider=${sfxProvider ? defaultSfxProvider : "none"} music_provider=${musicProvider ? defaultMusicProvider : "none"}`);
    }

    const sfxOutDir = join(envCacheDir, "sfx");
    const musicOutDir = join(envCacheDir, "music");
    ensureDir(sfxOutDir);
    ensureDir(musicOutDir);

    const publicSfxDir = audioOutPath && audioOutPath.split(sep).includes("public") ? join(dirname(audioOutPath), "env", currentEnv, "sfx") : null;
    const publicMusicDir = audioOutPath && audioOutPath.split(sep).includes("public") ? join(dirname(audioOutPath), "env", currentEnv, "music") : null;
    if (publicSfxDir) ensureDir(publicSfxDir);
    if (publicMusicDir) ensureDir(publicMusicDir);

    for (const track of composition.audioPlan.tracks) {
      const clipsOut: Array<Record<string, unknown>> = [];
      for (const clip of track.clips) {
        const startSec = resolveStart(clip.start, cueStartIndex, sceneStartIndex);
        if (clip.kind === "file") {
          const durationForFades = clip.fadeTo || clip.fadeOut ? Math.max(0, totalEndSec - startSec) : null;
          const envelope = volumeEnvelopeForClip(clip.volume ?? 1, durationForFades, clip.fadeTo, clip.fadeOut);
          clipsOut.push({
            id: clip.id,
            kind: "file",
            startSec,
            src: clip.src,
            volume: clip.volume ?? 1,
            ...(durationForFades != null ? { durationSec: durationForFades } : {}),
            ...(envelope ? { volumeEnvelope: envelope } : {}),
          });
          continue;
        }

        if (clip.kind === "music") {
          if (!musicProvider) {
            _log(`music: skip clip=${clip.id} (provider not supported)`);
            continue;
          }
          const cacheId = clip.sourceId ?? clip.id;
          const sceneId = resolveSceneForStart(clip.start, startSec, outScenes, cueSceneIndex);
          let desired: number;
          if (clip.durationSeconds != null) {
            desired = clip.durationSeconds;
          } else if (clip.playThrough) {
            desired = totalEndSec - startSec;
          } else {
            if (!sceneId || sceneEndIndex[sceneId] == null) {
              throw new CompileError(`Cannot infer scene duration for music clip "${clip.id}"`);
            }
            desired = sceneEndIndex[sceneId] - startSec;
          }
          if (defaultMusicProvider === "elevenlabs") {
            if (desired > 600) {
              _log(`music: clamp clip=${clip.id} duration_seconds=${desired.toFixed(1)} -> 600.0`);
              desired = 600;
            }
            if (desired < 3) {
              _log(`music: clamp clip=${clip.id} duration_seconds=${desired.toFixed(2)} -> 3.0`);
              desired = 3;
            }
          }
          if (desired <= 0) {
            throw new CompileError(`Non-positive music duration for "${clip.id}" (duration=${desired})`);
          }

          const variants = Math.max(1, clip.variants ?? 1);
          const pick = clip.pick ?? 0;
          if (pick >= variants) {
            throw new CompileError(`music pick out of range for "${clip.id}" (pick=${pick}, variants=${variants})`);
          }

          const generated: Array<Record<string, unknown>> = [];
          const musicExt = defaultMusicProvider === "elevenlabs" ? ".mp3" : ".wav";
          for (let v = 0; v < variants; v += 1) {
            const musicKey = hashKey({
              kind: "music",
              clipId: cacheId,
              variant: v,
              prompt: clip.prompt,
              durationSec: desired,
              model_id: clip.modelId,
              force_instrumental: clip.forceInstrumental,
              provider: defaultMusicProvider,
              seed: voiceover.seed ?? null,
            });
            const seed = parseInt(musicKey.slice(0, 8), 16) % 2147483647;
            let outPath = join(musicOutDir, `${cacheId}--v${v + 1}--${safePrefix(musicKey)}${musicExt}`);
            const cached = resolveCachedMusic(outDir, currentEnv, musicKey, cacheId, v, musicExt, _log);
            let dur: number;
            if (cached.path && !fresh) {
              if (cached.env && cached.env !== currentEnv) {
                _log(`music: fallback clip=${clip.id} variant=${v + 1}/${variants} using env=${cached.env}`);
              }
              outPath = cached.path;
              dur = getManifestDuration(manifest, "music", outPath, musicKey) ?? probeDurationSec(outPath);
            } else {
              _log(`music: synth clip=${clip.id} variant=${v + 1}/${variants} seed=${seed} duration_seconds=${desired.toFixed(1)} -> ${outPath.split(sep).pop()}`);
              try {
                const seg = await musicProvider.generate({
                  prompt: clip.prompt ?? "",
                  durationSeconds: desired,
                  sampleRateHz,
                  seed,
                  modelId: clip.modelId ?? null,
                  forceInstrumental: clip.forceInstrumental ?? null,
                }, outPath);
                dur = seg.durationSec;
                didSynthesize = true;
                recordUsageEvent({
                  kind: "music",
                  unitType: "seconds",
                  quantity: seg.durationSec,
                  provider: defaultMusicProvider,
                  compositionId: composition.id,
                  sceneId: sceneId ?? undefined,
                  clipId: clip.id,
                  env: currentEnv,
                  promptChars: clip.prompt?.length ?? 0,
                });
              } catch (err) {
                const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
                _log(`music: synth-failed clip=${clip.id} variant=${v + 1}/${variants} err=${msg}`);
                const existing = findFirstMatch(musicOutDir, `${cacheId}--v${v + 1}--`, musicExt);
                if (existing) {
                  outPath = existing;
                  dur = probeDurationSec(outPath);
                  _log(`music: fallback clip=${clip.id} variant=${v + 1}/${variants} using_cached=${outPath.split(sep).pop()}`);
                } else {
                  dur = desired;
                  _log(`music: fallback clip=${clip.id} variant=${v + 1}/${variants} no_cache=true`);
                }
              }
            }

            if (existsSync(outPath)) {
              setManifestEntry(manifest, "music", outPath, musicKey, dur, {
                provider: defaultMusicProvider,
                clipId: cacheId,
                variant: v,
                prompt: clip.prompt,
                durationSecHint: desired,
                model_id: clip.modelId,
                force_instrumental: clip.forceInstrumental,
                format: outPath.split(".").pop(),
              });
            }
            generated.push({ variant: v, seed, path: outPath, durationSec: dur });
          }

          const chosen = generated[pick];
          let chosenSrc: string | null = null;
          const envelope = volumeEnvelopeForClip(clip.volume ?? 1, Number(chosen.durationSec), clip.fadeTo, clip.fadeOut);
          if (publicMusicDir) {
            if (!existsSync(chosen.path as string)) {
              chosenSrc = null;
            } else {
              const stagedDir = join(publicMusicDir, cacheId);
              ensureDir(stagedDir);
              const staged = join(stagedDir, String(chosen.path).split(sep).pop() ?? "music.wav");
              copyFileSync(String(chosen.path), staged);
              cleanupStagedDir(stagedDir, staged.split(sep).pop() ?? "");
              chosenSrc = toPublicPath(staged);
            }
          }

          clipsOut.push({
            id: clip.id,
            kind: "music",
            startSec,
            volume: clip.volume ?? 1,
            prompt: clip.prompt,
            pick,
            variants: generated,
            chosen,
            src: chosenSrc,
            playThrough: Boolean(clip.playThrough),
            ...(envelope ? { volumeEnvelope: envelope } : {}),
          });
          continue;
        }

        if (clip.kind === "sfx") {
          if (!sfxProvider) {
            _log(`sfx: skip clip=${clip.id} (provider not supported)`);
            continue;
          }
          const variants = Math.max(1, clip.variants ?? 1);
          const pick = sfxSelections.picks[clip.id] ?? (clip.pick ?? 0);
          if (pick >= variants) {
            throw new CompileError(`sfx pick out of range for "${clip.id}" (pick=${pick}, variants=${variants})`);
          }
          const cacheId = clip.sourceId ?? clip.id;
          const sfxCtx = {
            provider: defaultSfxProvider,
            sample_rate_hz: sampleRateHz,
            provider_ctx: defaultSfxProvider === "elevenlabs"
              ? {
                  base_url: (sfxProvider as { baseUrl?: string }).baseUrl ?? null,
                  model_id: (sfxProvider as { modelId?: string }).modelId ?? null,
                  prompt_influence: (sfxProvider as { promptInfluence?: number }).promptInfluence ?? null,
                  loop: (sfxProvider as { loop?: boolean }).loop ?? null,
                }
              : {},
          };
          const sfxExt = defaultSfxProvider === "elevenlabs" ? ".mp3" : ".wav";
          const generated: Array<Record<string, unknown>> = [];
          const sfxSceneId = resolveSceneForStart(clip.start, startSec, outScenes, cueSceneIndex);

          for (let v = 0; v < variants; v += 1) {
            const sfxKey = hashKey({
              kind: "sfx",
              clipId: cacheId,
              variant: v,
              prompt: clip.prompt,
              durationSec: clip.durationSeconds ?? null,
              ctx: sfxCtx,
              seed: voiceover.seed ?? null,
            });
            const seed = parseInt(sfxKey.slice(0, 8), 16) % 2147483647;
            let outPath = join(sfxOutDir, `${cacheId}--v${v + 1}--${safePrefix(sfxKey)}${sfxExt}`);
            const cached = resolveCachedSfx(outDir, currentEnv, sfxKey, cacheId, v, sfxExt, _log);
            let dur: number;
            if (cached.path && !fresh) {
              if (cached.env && cached.env !== currentEnv) {
                _log(`sfx: fallback clip=${clip.id} variant=${v + 1}/${variants} using env=${cached.env}`);
              }
              outPath = cached.path;
              dur = getManifestDuration(manifest, "sfx", outPath, sfxKey) ?? probeDurationSec(outPath);
            } else {
              _log(`sfx: synth clip=${clip.id} variant=${v + 1}/${variants} seed=${seed} -> ${outPath.split(sep).pop()}`);
              const seg = await sfxProvider.generate({
                prompt: clip.prompt ?? "",
                durationSec: clip.durationSeconds ?? null,
                sampleRateHz,
                seed,
              }, outPath);
              dur = seg.durationSec;
              didSynthesize = true;
              recordUsageEvent({
                kind: "sfx",
                unitType: "seconds",
                quantity: seg.durationSec,
                provider: defaultSfxProvider,
                compositionId: composition.id,
                sceneId: sfxSceneId ?? undefined,
                clipId: clip.id,
                env: currentEnv,
                promptChars: clip.prompt?.length ?? 0,
              });
            }
            setManifestEntry(manifest, "sfx", outPath, sfxKey, dur, {
              provider: defaultSfxProvider,
              clipId: clip.id,
              variant: v,
              prompt: clip.prompt,
              durationSecHint: clip.durationSeconds,
              sample_rate_hz: sampleRateHz,
              format: outPath.split(".").pop(),
            });
            generated.push({ variant: v, seed, path: outPath, durationSec: dur });
          }

          const chosen = generated[pick];
          let chosenSrc: string | null = null;
          const envelope = volumeEnvelopeForClip(clip.volume ?? 1, Number(chosen.durationSec), clip.fadeTo, clip.fadeOut);
          if (publicSfxDir) {
            const stagedDir = join(publicSfxDir, clip.id);
            ensureDir(stagedDir);
            const staged = join(stagedDir, String(chosen.path).split(sep).pop() ?? "sfx.wav");
            copyFileSync(String(chosen.path), staged);
            cleanupStagedDir(stagedDir, staged.split(sep).pop() ?? "");
            chosenSrc = toPublicPath(staged);
          }

          clipsOut.push({
            id: clip.id,
            kind: "sfx",
            startSec,
            volume: clip.volume ?? 1,
            prompt: clip.prompt,
            pick,
            selectionPath: selectionPath(outDir),
            variants: generated,
            chosen,
            src: chosenSrc,
            ...(envelope ? { volumeEnvelope: envelope } : {}),
          });
        }
      }
      audioTracksOut.push({ id: track.id, kind: track.kind, clips: clipsOut });
    }
  }

  ensureDir(dirname(timelineOut));
  writeFileSync(timelineOut, JSON.stringify({ items: timelineItems, audio: { tracks: audioTracksOut } }, null, 2) + "\n");
  if (verboseLogs) {
    _log(`write: timeline=${timelineOut} items=${timelineItems.length} tracks=${audioTracksOut.length}`);
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  if (usageLedger && usageLedger.entries.length) {
    const summary = summarizeUsageFile(usageLedger.path);
    const summaryPath = join(dirname(usageLedger.path), "usage-summary.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
    const detailed = summarizeUsageFileDetailed(usageLedger.path);
    const detailedPath = join(dirname(usageLedger.path), "usage-summary-detailed.json");
    writeFileSync(detailedPath, JSON.stringify(detailed, null, 2) + "\n");
    if (verboseLogs) {
      _log(`usage: summary=${summaryPath} detail=${detailedPath} events=${usageLedger.entries.length}`);
    }
  }

  let audioPath: string | null = null;
  if (audioOutPath) {
    concatAudioFiles(audioOutPath, segmentPathsForConcat);
    audioPath = audioOutPath;
    if (verboseLogs) {
      _log(`write: audio=${audioOutPath} segments=${segmentPathsForConcat.length}`);
    }
  }

  const runArtifacts = writeRunArtifacts({
    envCacheDir,
    env: currentEnv,
    compositionId: composition.id,
    dslPath,
    scriptPath: scriptOut,
    timelinePath: timelineOut,
    audioPath,
  });
  if (verboseLogs) {
    _log(`run: id=${runArtifacts.runId} path=${runArtifacts.runPath}`);
  }

  return {
    script,
    audioPath,
    timelinePath: timelineOut,
    didSynthesize,
    runId: runArtifacts.runId,
    runPath: runArtifacts.runPath,
  };
}

function normalizeManifest(base: Record<string, unknown>): Record<string, any> {
  return {
    version: 1,
    segments: {},
    sfx: {},
    music: {},
    ...base,
  } as Record<string, any>;
}

function setManifestEntry(
  manifest: Record<string, any>,
  section: "segments" | "sfx" | "music",
  path: string,
  key: string,
  durationSec: number,
  meta: Record<string, unknown>,
): void {
  if (!manifest[section] || typeof manifest[section] !== "object") {
    manifest[section] = {};
  }
  manifest[section][path] = { key, durationSec, meta };
}

function providerCacheContext(providerName: string, provider: unknown): Record<string, unknown> {
  if (providerName === "elevenlabs") {
    const p = provider as ElevenLabsTTSProvider;
    return {
      provider: "elevenlabs",
      voice_id: p.voiceId,
      model_id: p.modelId,
      voice_settings: p.voiceSettings ?? null,
      base_url: p.baseUrl,
    };
  }
  if (providerName === "openai") {
    return {
      provider: "openai",
      default_model: (provider as { defaultModel?: string }).defaultModel ?? null,
      default_voice: (provider as { defaultVoice?: string }).defaultVoice ?? null,
      base_url: (provider as { baseUrl?: string }).baseUrl ?? null,
    };
  }
  if (providerName === "aws" || providerName === "aws-polly") {
    return {
      provider: "aws-polly",
      region: (provider as { region?: string }).region ?? null,
      voice_id: (provider as { voiceId?: string }).voiceId ?? null,
      engine: (provider as { engine?: string }).engine ?? null,
      language_code: (provider as { languageCode?: string }).languageCode ?? null,
    };
  }
  if (providerName === "azure" || providerName === "azure-speech") {
    return {
      provider: "azure-speech",
      region: (provider as { region?: string }).region ?? null,
      voice_name: (provider as { voiceName?: string }).voiceName ?? null,
    };
  }
  return { provider: providerName };
}

function normalizePauseSpec(value: PauseSpec | number | undefined | null): PauseSpec | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return pauseHelper(value);
  }
  return value;
}

function samplePause(spec: PauseSpec, rng: () => number): number {
  if (spec.mode === "fixed") {
    return Math.max(0, spec.seconds);
  }
  let val = gaussianSample(rng, spec.mean, spec.std);
  if (spec.min != null) {
    val = Math.max(val, spec.min);
  }
  if (spec.max != null) {
    val = Math.min(val, spec.max);
  }
  return Math.max(0, val);
}

function gaussianSample(rng: () => number, mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

function makeRng(seed: number | null): () => number {
  if (seed == null) {
    return () => Math.random();
  }
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function ensureTrimmed(path: string, envCacheDir: string, duration: number, sampleRateHz: number, fresh: boolean): string {
  const trimmedDir = join(envCacheDir, "segments_trimmed");
  ensureDir(trimmedDir);
  const filename = path.split(sep).pop() ?? "segment.wav";
  const trimmed = join(trimmedDir, filename);
  if (!existsSync(trimmed) || fresh) {
    trimAudioToDuration(path, trimmed, duration, sampleRateHz);
  }
  return trimmed;
}

function toPublicPath(path: string): string {
  const parts = path.split(`${sep}public${sep}`);
  if (parts.length < 2) {
    return path;
  }
  return parts[1];
}

function resolveStart(start: AudioClipSpec["start"], cueIndex: Record<string, number>, sceneIndex: Record<string, number>): number {
  if (start.kind === "absolute") {
    return start.sec;
  }
  if (start.kind === "cue") {
    const base = cueIndex[start.cue.cueId];
    if (base == null) {
      throw new CompileError(`Unknown cue in audio start: "${start.cue.cueId}"`);
    }
    return base + (start.cue.offsetSec ?? 0);
  }
  const base = sceneIndex[start.scene.sceneId];
  if (base == null) {
    throw new CompileError(`Unknown scene in audio start: "${start.scene.sceneId}"`);
  }
  return base + (start.scene.offsetSec ?? 0);
}

function resolveSceneForStart(
  start: AudioClipSpec["start"],
  startSec: number,
  scenes: Script["scenes"],
  cueSceneIndex: Record<string, string>,
): string | null {
  if (start.kind === "scene") {
    return start.scene.sceneId;
  }
  if (start.kind === "cue") {
    return cueSceneIndex[start.cue.cueId] ?? null;
  }
  for (const scene of scenes) {
    if (scene.startSec - 1e-6 <= startSec && startSec <= scene.endSec + 1e-6) {
      return scene.id;
    }
  }
  return null;
}

function volumeEnvelopeForClip(
  baseVolume: number,
  durationSec: number | null,
  fadeTo?: { volume: number; afterSeconds: number; fadeDurationSeconds?: number },
  fadeOut?: { volume: number; beforeEndSeconds: number; fadeDurationSeconds?: number },
): Array<{ atSec: number; volume: number }> | null {
  if (!fadeTo && !fadeOut) {
    return null;
  }
  const points: Array<[number, number]> = [[0, baseVolume]];
  if (fadeTo) {
    const end = fadeTo.afterSeconds;
    const dur = fadeTo.fadeDurationSeconds ?? 2.0;
    const start = Math.max(0, end - Math.max(0, dur));
    points.push([start, baseVolume]);
    points.push([end, fadeTo.volume]);
  }
  if (fadeOut) {
    if (durationSec == null) {
      throw new CompileError("fadeOut requires a known clip duration");
    }
    const start = Math.max(0, durationSec - fadeOut.beforeEndSeconds);
    const dur = fadeOut.fadeDurationSeconds ?? 2.0;
    const end = Math.min(durationSec, start + Math.max(0, dur));
    const current = volumeAt(points, start);
    points.push([start, current]);
    points.push([end, fadeOut.volume]);
  }
  points.sort((a, b) => a[0] - b[0]);
  const squashed: Array<[number, number]> = [];
  for (const [t, v] of points) {
    const last = squashed[squashed.length - 1];
    if (last && Math.abs(last[0] - t) < 1e-9) {
      last[1] = v;
    } else {
      squashed.push([t, v]);
    }
  }
  if (!squashed.length || squashed[0][0] > 1e-9) {
    squashed.unshift([0, baseVolume]);
  }
  return squashed.map(([t, v]) => ({ atSec: t, volume: v }));
}

function volumeAt(points: Array<[number, number]>, t: number): number {
  if (!points.length) {
    return 1;
  }
  if (t <= points[0][0]) {
    return points[0][1];
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const [t0, v0] = points[i];
    const [t1, v1] = points[i + 1];
    if (t0 <= t && t <= t1) {
      if (t1 <= t0 + 1e-9) {
        return v1;
      }
      const a = (t - t0) / (t1 - t0);
      return v0 + a * (v1 - v0);
    }
  }
  return points[points.length - 1][1];
}

function isTextSegment(segment: VoiceSegmentSpec): segment is { kind: "text"; text: string } {
  return segment.kind === "text";
}

function findFirstMatch(dir: string, prefix: string, ext: string): string | null {
  if (!existsSync(dir)) {
    return null;
  }
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(prefix) && entry.endsWith(ext)) {
      return join(dir, entry);
    }
  }
  return null;
}

function cleanupStagedDir(dir: string, keepFilename: string): void {
  for (const entry of readdirSync(dir)) {
    if (entry === keepFilename) {
      continue;
    }
    try {
      const path = join(dir, entry);
      if (existsSync(path)) {
        unlinkSync(path);
      }
    } catch {
      // Ignore cleanup errors.
    }
  }
}
