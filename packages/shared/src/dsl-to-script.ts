/**
 * Transforms DSL CompositionSpec into ScriptData with placeholder timing.
 *
 * This enables instant preview of DSL files without requiring TTS generation.
 * Placeholder timing provides "good enough" preview for visual verification.
 */

import type { CompositionSpec, SceneSpec, CueSpec, VoiceSegmentSpec, LayerSpec, ComponentSpec, PauseSpec } from "babulus/dsl";
import type { ScriptData, ScriptScene, ScriptCue, ScriptSegment } from "./video.js";

/**
 * Strategy for generating placeholder timing when actual TTS timing is unavailable.
 */
export type PlaceholderTimingStrategy =
  | { type: 'uniform' }  // Distribute scenes uniformly across total duration
  | { type: 'cue-count'; secondsPerCue: number }  // Estimate duration based on cue count
  | { type: 'explicit' };  // Use scene.time() hints if provided (fallback to uniform)

/**
 * Converts a CompositionSpec (from DSL execution) into ScriptData with placeholder timing.
 *
 * @param composition - The composition spec from executing .babulus.ts file
 * @param strategy - How to generate placeholder timing (default: cue-count with 3 seconds per cue)
 * @returns ScriptData ready for rendering with ComposableRenderer
 */
type CompositionStyles = { styles?: Record<string, unknown> };

export function dslToScriptData(
  composition: CompositionSpec,
  strategy: PlaceholderTimingStrategy = { type: 'cue-count', secondsPerCue: 3 }
): ScriptData {
  const totalDuration = composition.meta?.durationSeconds ?? 10;
  const fps = composition.meta?.fps ?? 30;
  const width = composition.meta?.width ?? 1280;
  const height = composition.meta?.height ?? 720;

  let currentTime = 0;
  const scenes: ScriptScene[] = [];

  for (const sceneSpec of composition.scenes) {
    const scriptScene = transformScene(sceneSpec, currentTime, totalDuration, strategy, composition.scenes.length);
    scenes.push(scriptScene);
    currentTime = scriptScene.endSec ?? currentTime;
  }

  // Calculate actual duration based on final scene end time
  const actualDuration = scenes.length > 0 ? (scenes[scenes.length - 1].endSec ?? totalDuration) : totalDuration;

  return {
    scenes,
    fps,
    meta: {
      fps,
      width,
      height,
      durationSeconds: actualDuration,
    },
    styles: (composition as CompositionStyles).styles,
  };
}

const isCueSpec = (item: CueSpec | PauseSpec): item is CueSpec => item.kind === "cue";

/**
 * Transforms a single scene with placeholder timing.
 */
function transformScene(
  sceneSpec: SceneSpec,
  currentTime: number,
  totalDuration: number,
  strategy: PlaceholderTimingStrategy,
  totalScenes: number
): ScriptScene {
  // Calculate scene timing
  const sceneStart = sceneSpec.time?.start ?? currentTime;
  let sceneDuration: number;

  if (sceneSpec.time?.end !== undefined) {
    // Explicit timing provided
    sceneDuration = sceneSpec.time.end - sceneStart;
  } else if (strategy.type === 'cue-count') {
    // Estimate based on cue count
    const cueCount = sceneSpec.items.filter(isCueSpec).length;
    sceneDuration = Math.max(1, cueCount * strategy.secondsPerCue);
  } else {
    // Uniform distribution
    sceneDuration = totalDuration / Math.max(1, totalScenes);
  }

  const sceneEnd = sceneStart + sceneDuration;

  // Transform cues with timing
  const cues: ScriptCue[] = [];
  const cueItems = sceneSpec.items.filter(isCueSpec);

  if (cueItems.length > 0) {
    const cueDuration = sceneDuration / cueItems.length;

    cueItems.forEach((cueSpec, idx) => {
      const cueStart = sceneStart + (idx * cueDuration);
      const cueEnd = cueStart + cueDuration;

      // Extract text from voice segments
      const text = extractTextFromSegments(cueSpec.segments);

      // Generate placeholder segment timing
      const segments = transformCueSegments(cueSpec.segments, cueStart, cueDuration);

      cues.push({
        id: cueSpec.id,
        label: cueSpec.label,
        text,
        startSec: cueStart,
        endSec: cueEnd,
        segments,
        markup: cueSpec.markup,
      });
    });
  }

  // Transform layers and components as-is (timing is handled by ComposableRenderer)
  const layers = sceneSpec.layers?.map(transformLayer) ?? [];
  const components = sceneSpec.components?.map(transformComponent) ?? [];

  return {
    id: sceneSpec.id,
    title: sceneSpec.title,
    startSec: sceneStart,
    endSec: sceneEnd,
    cues,
    styles: sceneSpec.styles,
    layers,
    components,
    markup: sceneSpec.markup,
  };
}

/**
 * Extracts text content from voice segments for cue.text field.
 */
function extractTextFromSegments(segments: VoiceSegmentSpec[]): string {
  return segments
    .filter(seg => seg.kind === 'text')
    .map(seg => (seg as { text: string }).text)
    .join(' ');
}

/**
 * Transforms VoiceSegmentSpec array into ScriptSegment array with placeholder timing.
 * Distributes the cue duration evenly across text segments, with small gaps for pauses.
 */
function transformCueSegments(
  segments: VoiceSegmentSpec[],
  cueStartSec: number,
  cueDurationSec: number
): ScriptSegment[] {
  const result: ScriptSegment[] = [];
  const textSegs = segments.filter(s => s.kind === 'text');
  const pauseSegs = segments.filter(s => s.kind === 'pause');

  // Reserve some time for pauses
  const pauseDuration = 0.3; // Placeholder pause duration
  const totalPauseTime = pauseSegs.length * pauseDuration;
  const availableForText = Math.max(0.5, cueDurationSec - totalPauseTime);
  const segDuration = availableForText / Math.max(1, textSegs.length);

  let currentTime = cueStartSec;
  for (const seg of segments) {
    if (seg.kind === 'text') {
      const textSeg = seg as { kind: 'text'; text: string };
      result.push({
        type: 'tts',
        startSec: currentTime,
        endSec: currentTime + segDuration,
        text: textSeg.text,
      });
      currentTime += segDuration;
    } else if (seg.kind === 'pause') {
      result.push({
        type: 'pause',
        startSec: currentTime,
        endSec: currentTime + pauseDuration,
        durationSec: pauseDuration,
      });
      currentTime += pauseDuration;
    }
  }
  return result;
}

/**
 * Transforms layer spec (preserves structure, no timing changes needed).
 */
function transformLayer(layer: LayerSpec): unknown {
  return {
    id: layer.id,
    styles: layer.styles,
    markup: layer.markup,
    timing: layer.timing,
    visible: layer.visible,
    zIndex: layer.zIndex,
    components: layer.components?.map(transformComponent) ?? [],
  };
}

/**
 * Transforms component spec (preserves structure, no timing changes needed).
 */
function transformComponent(component: ComponentSpec): unknown {
  return {
    id: component.id,
    type: component.type,
    props: component.props,
    bindings: component.bindings,
    styles: component.styles,
    markup: component.markup,
    zIndex: component.zIndex,
    visible: component.visible,
    timing: component.timing,
  };
}
