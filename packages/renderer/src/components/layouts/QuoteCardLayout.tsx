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
  accentColor = "#6b46c1",
  backgroundColor = "rgba(255,255,255,0.9)",
  textColor = "#1a1a1a",
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
    durationFrames: 20,
    from: 0,
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
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
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
              color: "rgba(26,26,26,0.65)",
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
