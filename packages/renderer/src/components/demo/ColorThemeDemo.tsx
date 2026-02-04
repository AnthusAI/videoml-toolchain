import React from "react";

export type ColorThemeDemoProps = {
  palette: {
    bg: string;
    surface: string;
    surfaceStrong: string;
    text: string;
    textMuted: string;
    primary: string;
    secondary: string;
    muted: string;
    mutedMore: string;
  };
  labelStyle?: React.CSSProperties;
};

export function ColorThemeDemo({ palette, labelStyle }: ColorThemeDemoProps) {
  const swatches = [
    { label: "BG", color: palette.bg },
    { label: "Surface", color: palette.surface },
    { label: "Surface+", color: palette.surfaceStrong },
    { label: "Primary", color: palette.primary },
    { label: "Secondary", color: palette.secondary },
    { label: "Muted", color: palette.muted },
    { label: "More Muted", color: palette.mutedMore },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 18,
        width: "100%",
        height: "100%",
        alignItems: "stretch",
      }}
    >
      {swatches.map((swatch) => (
        <div
          key={swatch.label}
          style={{
            background: swatch.color,
            borderRadius: 18,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: palette.textMuted,
              ...labelStyle,
            }}
          >
            {swatch.label}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: palette.text,
              ...labelStyle,
            }}
          >
            {swatch.color}
          </div>
        </div>
      ))}
    </div>
  );
}
