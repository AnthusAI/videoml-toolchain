import React from "react";
import type { ScriptCue } from "../shared.js";
import type { CascadedStyles } from "../styles/cascade.js";
import { TextEffectsComponent } from "./text/TextEffectsComponent.js";
import type { TextEffectConfig } from "../engines/text-effects.js";

export type SubtitleProps = {
  text?: string; // Explicit text
  binding?: string; // e.g., "cue.text"
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  position?: { x?: number | string; y?: number | string };
  textEffect?: TextEffectConfig;
  // Injected by renderer
  cue?: ScriptCue;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  styles?: CascadedStyles;
};

export function SubtitleComponent(props: SubtitleProps) {
  const {
    text,
    binding,
    fontSize,
    fontWeight,
    color,
    textAlign,
    position = { x: 48, y: 120 },
    textEffect,
    cue,
    styles = {} as CascadedStyles,
    frame,
    fps,
    videoWidth,
    videoHeight,
  } = props;

  // Resolve text: explicit text takes precedence, then binding, then default to cue.text
  const displayText = text || (binding && cue ? resolveBinding(binding, { cue }) : (cue ? resolveBinding("cue.text", { cue }) : undefined));

  if (!displayText) return null;

  const resolvedTextAlign = textAlign ?? styles.textAlign ?? "left";

  // For center-aligned text, use transform to center around the position
  const transform = resolvedTextAlign === "center" ? "translateX(-50%)" : undefined;

  if (textEffect) {
    return (
      <div
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          textAlign: resolvedTextAlign,
          fontFamily: styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif",
          opacity: styles._computedOpacity ?? 1,
          transform,
        }}
      >
        <TextEffectsComponent
          text={displayText}
          effect={textEffect}
          frame={frame}
          fps={fps}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          fontSize={fontSize ?? styles.fontSize ?? 20}
          fontWeight={fontWeight ?? styles.fontWeight ?? 400}
          color={color ?? styles.color ?? "#cbd5f5"}
          align={resolvedTextAlign}
          fontFamily={styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif"}
          style={{ display: "inline-block", width: "auto", height: "auto" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        fontSize: fontSize ?? styles.fontSize ?? 20,
        fontWeight: fontWeight ?? styles.fontWeight ?? 400,
        color: color ?? styles.color ?? "#cbd5f5",
        textAlign: resolvedTextAlign,
        fontFamily: styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif",
        opacity: styles._computedOpacity ?? 1,
        whiteSpace: "nowrap",
        transform,
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
