import React from "react";
import type { ScriptScene } from "@babulus/shared";

export type TitleProps = {
  text?: string; // Explicit text
  binding?: string; // e.g., "scene.title"
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  position?: { x?: number | string; y?: number | string };
  // Scene/frame context injected by renderer
  scene?: ScriptScene;
  frame?: number;
};

export function TitleComponent(props: TitleProps) {
  const {
    text,
    binding,
    fontSize = 48,
    fontWeight = 700,
    color = "#ffffff",
    textAlign = "left",
    position = { x: 48, y: 48 },
    scene,
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

function resolveBinding(binding: string, context: { scene?: ScriptScene }): string {
  if (binding === "scene.title") return context.scene?.title || "";
  if (binding === "scene.id") return context.scene?.id || "";
  // Add more bindings as needed
  return "";
}
