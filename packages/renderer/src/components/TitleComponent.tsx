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

  const resolvedTextAlign = textAlign ?? styles.textAlign ?? "left";

  // For center-aligned text, center the container and make content centered within
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: position.y,
    fontSize: fontSize ?? styles.fontSize ?? 48,
    fontWeight: fontWeight ?? styles.fontWeight ?? 700,
    fontFamily: styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif",
    opacity: styles._computedOpacity ?? 1,
  };

  if (resolvedTextAlign === "center") {
    // For centered titles, use left:50% and translateX(-50%) on the span itself
    containerStyle.left = "50%";
    containerStyle.display = "inline-block";
  } else {
    // For left-aligned titles, position at the specified x
    containerStyle.left = position.x;
    containerStyle.textAlign = resolvedTextAlign;
  }

  const spanStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "0.18em 0.22em",
    backgroundColor: color ?? styles.color ?? "#c7007e",
    color: "#ffffff",
    lineHeight: 1,
  };

  if (resolvedTextAlign === "center") {
    spanStyle.transform = "translateX(-50%)";
  }

  return (
    <div style={containerStyle}>
      <span style={spanStyle}>
        {displayText}
      </span>
    </div>
  );
}

function resolveBinding(binding: string, context: { scene?: ScriptScene }): string {
  if (binding === "scene.title") return context.scene?.title || "";
  if (binding === "scene.id") return context.scene?.id || "";
  // Add more bindings as needed
  return "";
}
