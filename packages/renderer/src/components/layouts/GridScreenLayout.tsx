import React from "react";
import { FlexPageLayout, type FlexPageChildSpec } from "./FlexPageLayout.js";

export type GridScreenLayoutProps = {
  background?: string;
  padding?: number;
  gap?: number;

  label?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  chapterNumber?: string | number;
  chapterLabel?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover";
  logo?: React.ReactNode;
  logoPosition?: "left" | "right" | "center";
  headerAlign?: "left" | "center";

  grid: {
    columns: number;
    rows?: number;
    items: React.ReactNode[];
    gap?: number;
    padding?: number;
    staggerPattern?: "row" | "column" | "diagonal" | "spiral" | "random";
    staggerDelayFrames?: number;
    itemDurationFrames?: number;
    entranceStartFrame?: number;
  };

  // Injected
  frame?: number;
  fps?: number;
  timeSec?: number;
  videoWidth?: number;
  videoHeight?: number;
  scene?: any;
  cue?: any;
  styles?: any;
  markup?: any;
  progress?: number;
  debugLayout?: boolean;
};

export function GridScreenLayout({
  background,
  padding,
  gap,
  label,
  eyebrow,
  title,
  subtitle,
  chapterNumber,
  chapterLabel,
  logoUrl,
  logoAlt,
  logoWidth,
  logoHeight,
  logoFit,
  logo,
  logoPosition,
  headerAlign = "left",
  grid,
  frame,
  fps,
  timeSec,
  videoWidth,
  videoHeight,
  scene,
  cue,
  styles,
  markup,
  progress,
  debugLayout = false,
}: GridScreenLayoutProps) {
  const normalizedItems = grid.items.map((item, index) => {
    if (typeof item === "string" || typeof item === "number") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            borderRadius: 20,
            background: index % 2 === 0 ? "var(--color-surface, #2b2044)" : "var(--color-surface-2, #3d2b5c)",
            color: "var(--color-text, #f6f2ff)",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          {String(item)}
        </div>
      );
    }
    return item;
  });

  const child: FlexPageChildSpec = {
    type: "Grid",
    id: "grid",
    flex: 1,
    props: {
      ...grid,
      items: normalizedItems,
      padding: grid.padding ?? 0,
    },
  };

  return (
    <FlexPageLayout
      background={background}
      padding={padding}
      gap={gap}
      label={label}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      chapterNumber={chapterNumber}
      chapterLabel={chapterLabel}
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      logoWidth={logoWidth}
      logoHeight={logoHeight}
      logoFit={logoFit}
      logo={logo}
      logoPosition={logoPosition}
      headerAlign={headerAlign}
      contentDirection="column"
      contentGap={24}
      children={[child]}
      debugLayout={debugLayout}
      frame={frame}
      fps={fps}
      timeSec={timeSec}
      videoWidth={videoWidth}
      videoHeight={videoHeight}
      scene={scene}
      cue={cue}
      styles={styles}
      markup={markup}
      progress={progress}
    />
  );
}
