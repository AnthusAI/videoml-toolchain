import React, { useMemo } from "react";
import { getActiveCue, getActiveScene, type ScriptData } from "@babulus/shared";
import { useCurrentFrame, useVideoConfig } from "./context.js";

export type StoryboardRendererProps = {
  script: ScriptData;
  title?: string;
  subtitle?: string;
};

const getScriptDuration = (script: ScriptData): number => {
  const metaDuration = script.meta?.durationSeconds ?? 0;
  const sceneEnds = (script.scenes ?? []).map((scene) => scene.endSec ?? 0);
  const sceneMax = sceneEnds.length ? Math.max(...sceneEnds) : 0;
  return Math.max(metaDuration, sceneMax);
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const StoryboardRenderer = ({ script, title, subtitle }: StoryboardRendererProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSec = frame / fps;
  const scene = useMemo(() => getActiveScene(script, timeSec), [script, timeSec]);
  const cue = useMemo(() => getActiveCue(script, timeSec), [script, timeSec]);
  const durationSec = useMemo(() => getScriptDuration(script), [script]);
  const progressPct = durationSec > 0 ? Math.min(100, Math.max(0, (timeSec / durationSec) * 100)) : 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle at top left, #1e293b 0%, #0f172a 45%, #05070f 100%)",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 48,
        boxSizing: "border-box",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 2, color: "#94a3b8" }}>
          {title ?? "Babulus Storyboard"}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700 }}>{scene?.title ?? "Scene"}</div>
        <div style={{ fontSize: 20, color: "#cbd5f5" }}>{cue?.text ?? cue?.label ?? subtitle ?? "Cue"}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 12 }}>
          <span>{formatTime(timeSec)}</span>
          <span>
            {width}×{height} · {fps}fps
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: "rgba(148,163,184,0.25)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #38bdf8, #818cf8)",
            }}
          />
        </div>
      </div>
    </div>
  );
};
