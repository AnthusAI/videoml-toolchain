import React from "react";
import { FlexPageLayout, type FlexPageChildSpec } from "./FlexPageLayout.js";

export type ContentScreenLayoutProps = {
  background?: string;
  padding?: number;
  gap?: number;

  label?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover";
  logo?: React.ReactNode;
  logoPosition?: "left" | "right" | "center";
  headerAlign?: "left" | "center";

  content?: FlexPageChildSpec | FlexPageChildSpec[];
  children?: FlexPageChildSpec[];

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

export function ContentScreenLayout({
  background,
  padding,
  gap,
  label,
  eyebrow,
  title,
  subtitle,
  logoUrl,
  logoAlt,
  logoWidth,
  logoHeight,
  logoFit,
  logo,
  logoPosition,
  headerAlign = "left",
  content,
  children,
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
}: ContentScreenLayoutProps) {
  const resolvedChildren: FlexPageChildSpec[] =
    children ??
    (content
      ? Array.isArray(content)
        ? content
        : [content]
      : []);

  return (
    <FlexPageLayout
      background={background}
      padding={padding}
      gap={gap}
      label={label}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
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
      children={resolvedChildren}
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
