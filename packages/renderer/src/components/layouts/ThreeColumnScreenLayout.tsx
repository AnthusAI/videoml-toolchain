import React from "react";
import { FlexPageLayout, type FlexPageChildSpec } from "./FlexPageLayout.js";

export type ThreeColumnScreenLayoutProps = {
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

  columns: [FlexPageChildSpec, FlexPageChildSpec, FlexPageChildSpec];
  ratios?: [number, number, number];
  contentGap?: number;

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

export function ThreeColumnScreenLayout({
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
  columns,
  ratios = [1, 1, 1],
  contentGap = 24,
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
}: ThreeColumnScreenLayoutProps) {
  const children: FlexPageChildSpec[] = columns.map((col, idx) => ({
    ...col,
    flex: Math.max(0.05, ratios[idx] ?? 1),
  })) as FlexPageChildSpec[];

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
      contentDirection="row"
      contentGap={contentGap}
      children={children}
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
