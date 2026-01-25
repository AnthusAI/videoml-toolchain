import React, { useMemo } from "react";
import { getActiveCue, getActiveScene, type ScriptData } from "@babulus/shared";
import { useCurrentFrame, useVideoConfig } from "./context.tsx";
import { getComponent } from "./components/registry.ts";
import type { ComponentSpec } from "../../src/dsl/types.ts";

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

  const components = (scene?.components as ComponentSpec[] | undefined) || [];

  // Sort by zIndex (lower = back, higher = front)
  const sortedComponents = useMemo(() => {
    return [...components].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [components]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#000000", // Default black background
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {sortedComponents.map((spec) => {
        // Check visibility
        if (spec.visible === false) return null;

        // Check timing
        if (spec.timing) {
          const { startSec, endSec } = spec.timing;
          if (startSec !== undefined && timeSec < startSec) return null;
          if (endSec !== undefined && timeSec > endSec) return null;
        }

        // Resolve component
        const Component = getComponent(spec.type);
        if (!Component) {
          console.warn(`Component not found: ${spec.type}`);
          return null;
        }

        // Merge props with context
        const props: Record<string, any> = {
          ...spec.props,
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

        return <Component key={spec.id} {...props} />;
      })}
    </div>
  );
};

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
