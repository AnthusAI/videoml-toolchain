import React from "react";
import type { ScriptScene } from "@babulus/shared";
import type { CascadedStyles } from "../styles/cascade.ts";

export type TitleProps = {
  text?: string; // Explicit text
  binding?: string; // e.g., "scene.title"
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  position?: { x?: number | string; y?: number | string };
  // Injected by renderer
  scene?: ScriptScene;
  frame?: number;
  styles?: CascadedStyles;
};

export function TitleComponent(props: TitleProps) {
  const {
    text,
    binding,
    fontSize,
    fontWeight,
    color,
    textAlign,
    position = { x: 48, y: 48 },
    scene,
    styles = {} as CascadedStyles,
  } = props;

  // Resolve text from binding or explicit prop
  const displayText = binding && scene ? resolveBinding(binding, { scene }) : text;

  if (!displayText) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        fontSize: fontSize ?? styles.fontSize ?? 48,
        fontWeight: fontWeight ?? styles.fontWeight ?? 700,
        color: color ?? styles.color ?? "#ffffff",
        textAlign: textAlign ?? styles.textAlign ?? "left",
        fontFamily: styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif",
        opacity: styles._computedOpacity ?? 1,
      }}
    >
      {displayText}
    </div>
  );
}

function resolveBinding(binding: string, context: { scene?: ScriptScene }): string {
  if (binding === "scene.title") return context.scene?.title || "";
  if (binding === "scene.id") return context.scene?.id || "";
  // Add more bindings as needed
  return "";
}
