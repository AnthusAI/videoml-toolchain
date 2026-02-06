import React from "react";
import type { ScriptScene } from "../shared.ts";
import type { CascadedStyles } from "../styles/cascade.ts";
import { TextEffectsComponent } from "./text/TextEffectsComponent.js";
import type { TextEffectConfig } from "../engines/text-effects.js";

export type TitleProps = {
  text?: string; // Explicit text
  binding?: string; // e.g., "scene.title"
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  position?: { x?: number | string; y?: number | string };
  textEffect?: TextEffectConfig;
  // Injected by renderer
  scene?: ScriptScene;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
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
    textEffect,
    textColor,
    scene,
    frame,
    fps,
    videoWidth,
    videoHeight,
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
    opacity: styles._computedOpacity ?? 1,
  };

  if (resolvedTextAlign === "center") {
    // For centered titles, use left:50% and translateX(-50%) on the span itself
    containerStyle.left = "50%";
    containerStyle.display = "inline-block";
    if (textEffect) {
      containerStyle.transform = "translateX(-50%)";
    }
  } else {
    // For left-aligned titles, position at the specified x
    containerStyle.left = position.x;
    containerStyle.textAlign = resolvedTextAlign;
  }

  if (textEffect) {
    const pillStyle: React.CSSProperties = {
      display: "inline-block",
      padding: "0.18em 0.22em",
      backgroundColor: color ?? styles.color ?? "#c7007e",
    };

    return (
      <div style={containerStyle}>
        <span style={pillStyle}>
          <TextEffectsComponent
            text={displayText}
            effect={textEffect}
            frame={frame}
            fps={fps}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            fontSize={fontSize ?? styles.fontSize ?? 48}
            fontWeight={fontWeight ?? styles.fontWeight ?? 700}
            color={textColor ?? "#ffffff"}
            align={resolvedTextAlign}
            fontFamily={styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif"}
            style={{ display: "inline-block", width: "auto", height: "auto" }}
          />
        </span>
      </div>
    );
  }

  containerStyle.fontSize = fontSize ?? styles.fontSize ?? 48;
  containerStyle.fontWeight = fontWeight ?? styles.fontWeight ?? 700;
  containerStyle.fontFamily = styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif";

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
