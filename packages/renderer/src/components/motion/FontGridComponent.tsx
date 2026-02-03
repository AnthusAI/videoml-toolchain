import React from "react";

export type FontCard = {
  eyebrow: string;
  headline: string;
  subhead: string;
  eyebrowFont: string;
  headlineFont: string;
  subheadFont: string;
};

export type FontGridProps = {
  label: string;
  cards: FontCard[];
  background?: string;
  textColor?: string;
  layoutMode?: "absolute" | "flex";
  debugLayout?: boolean;
};

const DEFAULT_BG = "#f6f2e9";
const DEFAULT_TEXT = "#24201a";

export function FontGridComponent({
  label,
  cards,
  background = DEFAULT_BG,
  textColor = DEFAULT_TEXT,
  layoutMode = "absolute",
  debugLayout = false,
}: FontGridProps) {
  const isAbsolute = layoutMode === "absolute";
  const dbgBorder = debugLayout ? "2px dashed rgba(255, 0, 0, 0.55)" : undefined;

  return (
    <div
      style={{
        position: isAbsolute ? "absolute" : "relative",
        inset: isAbsolute ? 0 : undefined,
        width: isAbsolute ? undefined : "100%",
        height: isAbsolute ? undefined : "100%",
        padding: 64,
        background,
        color: textColor,
        fontFamily: '"Inter", system-ui, sans-serif',
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: 0,
        border: dbgBorder,
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          background: "#e0d8c8",
          color: textColor,
          fontWeight: 800,
          fontSize: 32,
          padding: "10px 18px",
          borderRadius: 12,
          boxShadow: "0 12px 26px rgba(0,0,0,0.12)",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              minHeight: 170,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontFamily: card.eyebrowFont,
                fontSize: 16,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "rgba(36,32,26,0.72)",
                marginBottom: 6,
              }}
            >
              {card.eyebrow}
            </div>
            <div
              style={{
                fontFamily: card.headlineFont,
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 800,
                color: textColor,
                marginBottom: 8,
              }}
            >
              {card.headline}
            </div>
            <div
              style={{
                fontFamily: card.subheadFont,
                fontSize: 17,
                lineHeight: 1.35,
                color: "rgba(36,32,26,0.78)",
              }}
            >
              {card.subhead}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
