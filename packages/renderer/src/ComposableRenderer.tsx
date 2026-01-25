import React, { useMemo } from "react";
import { getActiveCue, getActiveScene, type ScriptData } from "@babulus/shared";
import { useCurrentFrame, useVideoConfig } from "./context.tsx";
import { getComponent } from "./components/registry.ts";
import type { ComponentSpec, LayerSpec, VisualStyles } from "../../../src/dsl/types.ts";
import { cascadeStyles, type CascadedStyles } from "./styles/cascade.ts";

export type ComposableRendererProps = {
  script: ScriptData;
};

function getScriptDuration(script: ScriptData): number {
  const metaDuration = script.meta?.durationSeconds ?? 0;
  const sceneEnds = (script.scenes ?? []).map((scene) => scene.endSec ?? 0);
  const sceneMax = sceneEnds.length ? Math.max(...sceneEnds) : 0;
  return Math.max(metaDuration, sceneMax);
}

export const ComposableRenderer = ({ script }: ComposableRendererProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSec = frame / fps;
  const scene = useMemo(() => getActiveScene(script, timeSec), [script, timeSec]);
  const cue = useMemo(() => getActiveCue(script, timeSec), [script, timeSec]);
  const durationSec = useMemo(() => getScriptDuration(script), [script]);
  const progressPct = durationSec > 0 ? Math.min(100, Math.max(0, (timeSec / durationSec) * 100)) : 0;

  const sceneStyles: VisualStyles = scene?.styles || {};
  const layers: LayerSpec[] = scene?.layers || [];
  const components: ComponentSpec[] = (scene?.components as ComponentSpec[] | undefined) || [];

  // Apply scene-level background (default black)
  const sceneBackground = sceneStyles.background || "#000000";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: sceneBackground,
        fontFamily: sceneStyles.fontFamily || "ui-sans-serif, system-ui, sans-serif",
        opacity: sceneStyles.opacity,
      }}
    >
      {/* Render layers */}
      {layers.map((layer) => (
        <Layer
          key={layer.id}
          layer={layer}
          sceneStyles={sceneStyles}
          scene={scene}
          cue={cue}
          frame={frame}
          timeSec={timeSec}
          fps={fps}
          width={width}
          height={height}
          progressPct={progressPct}
        />
      ))}

      {/* Render standalone components (backward compat) */}
      {components.map((spec) => (
        <Component
          key={spec.id}
          spec={spec}
          sceneStyles={sceneStyles}
          layerStyles={{}}
          scene={scene}
          cue={cue}
          frame={frame}
          timeSec={timeSec}
          fps={fps}
          width={width}
          height={height}
          progressPct={progressPct}
        />
      ))}
    </div>
  );
};

/**
 * Layer component - renders a group of components with shared styles/timing.
 */
function Layer({
  layer,
  sceneStyles,
  scene,
  cue,
  frame,
  timeSec,
  fps,
  width,
  height,
  progressPct,
}: {
  layer: LayerSpec;
  sceneStyles: VisualStyles;
  scene: any;
  cue: any;
  frame: number;
  timeSec: number;
  fps: number;
  width: number;
  height: number;
  progressPct: number;
}) {
  // Check layer visibility
  if (layer.visible === false) return null;

  // Check layer timing
  if (layer.timing) {
    const { startSec, endSec } = layer.timing;
    if (startSec !== undefined && timeSec < startSec) return null;
    if (endSec !== undefined && timeSec > endSec) return null;
  }

  const layerStyles = layer.styles || {};

  // Sort components by zIndex (lower = back, higher = front)
  const sortedComponents = useMemo(() => {
    return [...layer.components].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [layer.components]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: layerStyles.opacity,
        zIndex: layer.zIndex,
      }}
    >
      {sortedComponents.map((spec) => (
        <Component
          key={spec.id}
          spec={spec}
          sceneStyles={sceneStyles}
          layerStyles={layerStyles}
          scene={scene}
          cue={cue}
          frame={frame}
          timeSec={timeSec}
          fps={fps}
          width={width}
          height={height}
          progressPct={progressPct}
        />
      ))}
    </div>
  );
}

/**
 * Component renderer - renders a single component with cascaded styles.
 */
function Component({
  spec,
  sceneStyles,
  layerStyles,
  scene,
  cue,
  frame,
  timeSec,
  fps,
  width,
  height,
  progressPct,
}: {
  spec: ComponentSpec;
  sceneStyles: VisualStyles;
  layerStyles: VisualStyles;
  scene: any;
  cue: any;
  frame: number;
  timeSec: number;
  fps: number;
  width: number;
  height: number;
  progressPct: number;
}) {
  // Check visibility
  if (spec.visible === false) return null;

  // Check timing
  if (spec.timing) {
    const { startSec, endSec } = spec.timing;
    if (startSec !== undefined && timeSec < startSec) return null;
    if (endSec !== undefined && timeSec > endSec) return null;
  }

  // Resolve component
  const ComponentImpl = getComponent(spec.type);
  if (!ComponentImpl) {
    console.warn(`Component not found: ${spec.type}`);
    return null;
  }

  // Cascade styles: scene → layer → component
  const cascadedStyles: CascadedStyles = cascadeStyles(
    sceneStyles,
    layerStyles,
    spec.styles || {}
  );

  // Merge props with context and styles
  const props: Record<string, any> = {
    ...spec.props,
    styles: cascadedStyles, // Pass cascaded styles to component
    scene,
    cue,
    frame,
    timeSec,
    fps,
    width,
    height,
    progress: progressPct, // For ProgressBar
  };

  // Apply bindings
  if (spec.bindings) {
    for (const [propName, dataRef] of Object.entries(spec.bindings)) {
      props[propName] = resolveDataReference(dataRef, { scene, cue, frame, timeSec });
    }
  }

  return <ComponentImpl key={spec.id} {...props} />;
}

function resolveDataReference(
  ref: string,
  context: { scene: any; cue: any; frame: number; timeSec: number },
): any {
  if (ref.startsWith("scene.")) {
    const key = ref.substring(6);
    return context.scene?.[key];
  }
  if (ref.startsWith("cue.")) {
    const key = ref.substring(4);
    return context.cue?.[key];
  }
  if (ref.startsWith("frame.")) {
    const key = ref.substring(6);
    return key === "number" ? context.frame : context.timeSec;
  }
  return ref; // Literal value
}
