import React, { useEffect, useRef, useState } from "react";
import { subscribeLiveAction } from "../../live-actions.js";

export type ActionPulseProps = {
  actionName?: string;
  targetId?: string;
  label?: string;
  baseColor?: string;
  pulseColor?: string;
  pulseSeconds?: number;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function ActionPulseComponent({
  actionName = "pulse",
  targetId,
  label = "Action Pulse",
  baseColor = "#1f2937",
  pulseColor = "#38bdf8",
  pulseSeconds = 0.6,
  frame = 0,
  fps = 30,
  videoWidth = 1280,
  videoHeight = 720,
}: ActionPulseProps) {
  const [pulseFrame, setPulseFrame] = useState<number | null>(null);
  const frameRef = useRef(frame);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    const unsubscribe = subscribeLiveAction((action) => {
      if (action.name !== actionName) return;
      if (targetId && action.targetId && targetId !== action.targetId) return;
      setPulseFrame(frameRef.current);
    });
    return unsubscribe;
  }, [actionName, targetId]);

  const pulseFrames = Math.max(1, Math.round(pulseSeconds * fps));
  const isActive = pulseFrame != null && frame - pulseFrame <= pulseFrames;
  const color = isActive ? pulseColor : baseColor;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: Math.max(24, Math.floor(videoWidth / 28)),
        fontWeight: 600,
        color: "#f8fafc",
        backgroundColor: color,
        transition: "background-color 120ms linear",
      }}
    >
      {label}
    </div>
  );
}
