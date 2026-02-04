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
  const child: FlexPageChildSpec = {
    type: "Grid",
    id: "grid",
    flex: 1,
    props: {
      ...grid,
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
