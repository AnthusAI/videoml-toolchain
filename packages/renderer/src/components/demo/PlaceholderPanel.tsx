import React from "react";

export type PlaceholderPanelProps = {
  label?: string;
  tone?: "primary" | "secondary";
  text?: string;
  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  debugLayout?: boolean;
};

const DEFAULT_BLOCKS = [
  { top: "12%", left: "8%", width: "22%", height: "16%" },
  { top: "18%", left: "68%", width: "18%", height: "12%" },
  { top: "42%", left: "12%", width: "26%", height: "18%" },
  { top: "52%", left: "58%", width: "24%", height: "20%" },
  { top: "72%", left: "20%", width: "18%", height: "12%" },
  { top: "74%", left: "68%", width: "14%", height: "10%" },
];

export function PlaceholderPanel({
  label,
  tone = "primary",
  text = "Placeholder",
}: PlaceholderPanelProps) {
  const surface = tone === "secondary" ? "var(--color-surface-2, rgba(255,255,255,0.1))" : "var(--color-surface, rgba(255,255,255,0.08))";
  const accent = tone === "secondary" ? "var(--color-accent-2, rgba(255,255,255,0.18))" : "var(--color-accent, rgba(255,255,255,0.18))";
  const textColor = "var(--color-text, #f5f7fb)";
  const textMuted = "var(--color-text-muted, rgba(255,255,255,0.7))";
  const fontHeadline = "var(--font-headline, ui-sans-serif, system-ui, sans-serif)";
  const fontEyebrow = "var(--font-eyebrow, ui-sans-serif, system-ui, sans-serif)";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 28,
        background: surface,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {DEFAULT_BLOCKS.map((block, idx) => (
        <div
          key={`${block.left}-${idx}`}
          style={{
            position: "absolute",
            top: block.top,
            left: block.left,
            width: block.width,
            height: block.height,
            borderRadius: 16,
            background: accent,
            opacity: 0.35,
          }}
        />
      ))}
      <div
        style={{
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {label && (
          <div
            style={{
              fontSize: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: textMuted,
              fontWeight: 600,
              fontFamily: fontEyebrow,
              marginBottom: 12,
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: textColor,
            fontFamily: fontHeadline,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
