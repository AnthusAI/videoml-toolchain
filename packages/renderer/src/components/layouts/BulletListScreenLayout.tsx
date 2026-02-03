import React from "react";
import { BulletListComponent, type BulletListProps } from "../motion/BulletListComponent.js";
import { FlexPageLayout } from "./FlexPageLayout.js";

export type BulletListScreenLayoutProps = {
  background?: string;
  padding?: number;
  gap?: number;

  // Header
  label?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover";
  align?: "left" | "center";

  // Bullets
  bullets: BulletListProps;

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

/**
 * Standard bullet-screen layout: full-page flex with header + bullet list.
 */
export function BulletListScreenLayout(props: BulletListScreenLayoutProps) {
  const {
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
    align = "left",
    bullets,
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
  } = props;

  const bulletProps: BulletListProps = {
    layoutMode: "flex",
    justify: "space-between",
    ...bullets,
    frame,
    fps,
    videoWidth,
    videoHeight,
    debugLayout,
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
      headerAlign={align}
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      logoWidth={logoWidth}
      logoHeight={logoHeight}
      logoFit={logoFit}
      contentDirection="column"
      contentGap={24}
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
      children={[
        {
          type: "BulletList",
          id: "bulletList",
          flex: 1,
          props: bulletProps,
        },
      ]}
    />
  );
}
