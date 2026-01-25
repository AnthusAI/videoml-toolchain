import React from "react";
import type { ScriptCue } from "@babulus/shared";

export type SubtitleProps = {
  text?: string; // Explicit text
  binding?: string; // e.g., "cue.text"
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  position?: { x?: number | string; y?: number | string };
  // Cue context injected by renderer
  cue?: ScriptCue;
  frame?: number;
};

export function SubtitleComponent(props: SubtitleProps) {
  const {
    text,
    binding = "cue.text", // Default to cue text
    fontSize = 20,
    fontWeight = 400,
    color = "#cbd5f5",
    textAlign = "left",
    position = { x: 48, y: 120 },
    cue,
  } = props;

  // Resolve text from binding or explicit prop
  const displayText = binding && cue ? resolveBinding(binding, { cue }) : text;

  if (!displayText) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        fontSize,
        fontWeight,
        color,
        textAlign,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {displayText}
    </div>
  );
}

function resolveBinding(binding: string, context: { cue?: ScriptCue }): string {
  if (binding === "cue.text") return context.cue?.text || "";
  if (binding === "cue.label") return context.cue?.label || "";
  if (binding === "cue.id") return context.cue?.id || "";
  // Add more bindings as needed
  return "";
}
