import React from "react";
import { applyTransition, type TransitionConfig } from "../../animation/transitions.js";

export type QuoteCardLayoutProps = {
  quote: string;
  attribution?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  maxWidth?: number;
  entrance?: TransitionConfig;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

/**
  * Simple quote layout for pull-quotes in video.
  * Centered block with accent bar, oversized quote mark, and attribution.
  * Built to stay readable on TV: large type, generous padding, high contrast.
  */
export function QuoteCardLayout({
  quote,
  attribution,
  accentColor = "var(--color-accent, #8fb2ff)",
  backgroundColor = "var(--color-surface, #1f2233)",
  textColor = "var(--color-text, #f6f2ff)",
  padding = 72,
  maxWidth = 1200,
  entrance,
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
}: QuoteCardLayoutProps) {
  const entranceConfig: TransitionConfig = entrance ?? {
    type: "fade",
    durationFrames: 1,
    from: 1,
    to: 1,
  };

  const transition = applyTransition(entranceConfig, frame, { fps, width: videoWidth, height: videoHeight });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${padding}px`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: `${maxWidth}px`,
          background: backgroundColor,
          color: textColor,
          borderRadius: 24,
          padding: `${padding}px`,
          opacity: transition.opacity ?? 1,
          transform: transition.transform ?? "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: padding * 0.8,
            bottom: padding * 0.8,
            width: 8,
            background: accentColor,
            borderRadius: 12,
          }}
        />
        <div style={{ fontSize: 82, lineHeight: 1.05, fontWeight: 700, letterSpacing: -0.5, paddingLeft: 32 }}>
          “{quote}”
        </div>
        {attribution && (
          <div
            style={{
              marginTop: 32,
              paddingLeft: 32,
              fontSize: 32,
              fontWeight: 500,
              color: "var(--color-text-muted, rgba(255,255,255,0.7))",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            — {attribution}
          </div>
        )}
      </div>
    </div>
  );
}
