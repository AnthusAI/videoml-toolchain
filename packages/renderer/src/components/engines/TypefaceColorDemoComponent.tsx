import React from "react";

export type TypefaceColorDemoProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

type Preset = {
  eyebrow: string;
  title: string;
  subtitle: string;
  eyebrowFont: string;
  titleFont: string;
  subtitleFont: string;
  eyebrowColor: string;
  titleColor: string;
  subtitleColor: string;
};

const PRESETS: Preset[] = [
  {
    eyebrow: "Typefaces",
    title: "Studio Sans",
    subtitle: "Clean, confident, readable.",
    eyebrowFont: "var(--font-preview-humanist, var(--font-eyebrow))",
    titleFont: "var(--font-preview-sans, var(--font-headline))",
    subtitleFont: "var(--font-preview-humanist, var(--font-subhead))",
    eyebrowColor: "var(--color-accent, #ff5ec4)",
    titleColor: "var(--color-text, #eef1ff)",
    subtitleColor: "var(--color-text-muted, #c8cff6)",
  },
  {
    eyebrow: "Typefaces",
    title: "Warm Serif",
    subtitle: "Editorial weight and warmth.",
    eyebrowFont: "var(--font-preview-sans, var(--font-eyebrow))",
    titleFont: "var(--font-preview-humanist, var(--font-headline))",
    subtitleFont: "var(--font-preview-sans, var(--font-subhead))",
    eyebrowColor: "var(--color-secondary, #6a7dff)",
    titleColor: "var(--color-text, #eef1ff)",
    subtitleColor: "var(--color-text-muted, #c8cff6)",
  },
  {
    eyebrow: "Color themes",
    title: "Electric Contrast",
    subtitle: "High clarity for motion graphics.",
    eyebrowFont: "var(--font-preview-humanist, var(--font-eyebrow))",
    titleFont: "var(--font-preview-sans, var(--font-headline))",
    subtitleFont: "var(--font-preview-humanist, var(--font-subhead))",
    eyebrowColor: "var(--color-accent-2, #6a7dff)",
    titleColor: "var(--color-text, #eef1ff)",
    subtitleColor: "var(--color-text-muted, #c8cff6)",
  },
  {
    eyebrow: "Color themes",
    title: "Soft Neutral",
    subtitle: "Balanced palettes that stay readable.",
    eyebrowFont: "var(--font-preview-sans, var(--font-eyebrow))",
    titleFont: "var(--font-preview-humanist, var(--font-headline))",
    subtitleFont: "var(--font-preview-humanist, var(--font-subhead))",
    eyebrowColor: "var(--color-accent, #ff5ec4)",
    titleColor: "var(--color-text, #eef1ff)",
    subtitleColor: "var(--color-text-muted, #c8cff6)",
  },
];

export function TypefaceColorDemoComponent({
  frame = 0,
  videoWidth = 1920,
  videoHeight = 1080,
}: TypefaceColorDemoProps) {
  const segmentFrames = 36;
  const fadeFrames = 8;
  const total = PRESETS.length;
  const idx = Math.floor(frame / segmentFrames) % total;
  const nextIdx = (idx + 1) % total;
  const local = frame % segmentFrames;
  const fadeStart = segmentFrames - fadeFrames;
  const fadeProgress = local >= fadeStart ? (local - fadeStart) / fadeFrames : 0;

  const current = PRESETS[idx];
  const next = PRESETS[nextIdx];

  const renderPreset = (preset: Preset, opacity: number) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        textAlign: "center",
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: preset.eyebrowFont,
          fontSize: 22,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: preset.eyebrowColor,
          fontWeight: 600,
        }}
      >
        {preset.eyebrow}
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: preset.titleFont,
          fontSize: 84,
          fontWeight: 700,
          color: preset.titleColor,
        }}
      >
        {preset.title}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: preset.subtitleFont,
          fontSize: 30,
          fontWeight: 500,
          color: preset.subtitleColor,
        }}
      >
        {preset.subtitle}
      </div>
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {renderPreset(current, 1 - fadeProgress)}
      {renderPreset(next, fadeProgress)}
    </div>
  );
}
