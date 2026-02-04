import React from "react";
import { interpolate, clamp } from "../../math.js";
import { FlexPageLayout, type FlexPageChildSpec } from "./FlexPageLayout.js";

type AnimatedRatio = {
  frames: number[];
  values: number[];
};

export type TwoColumnScreenLayoutProps = {
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

  left: FlexPageChildSpec;
  right: FlexPageChildSpec;
  ratio?: number | AnimatedRatio; // left ratio (0..1)
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

function resolveRatio(frame: number, ratio?: number | AnimatedRatio): number {
  if (ratio == null) return 0.5;
  if (typeof ratio === "number") return clamp(ratio, 0.2, 0.8);
  if (ratio.frames.length !== ratio.values.length || ratio.frames.length < 2) {
    return clamp(ratio.values[0] ?? 0.5, 0.2, 0.8);
  }

  const firstFrame = ratio.frames[0];
  const lastFrame = ratio.frames[ratio.frames.length - 1];
  if (frame <= firstFrame) {
    return clamp(ratio.values[0] ?? 0.5, 0.2, 0.8);
  }
  if (frame >= lastFrame) {
    return clamp(ratio.values[ratio.values.length - 1] ?? 0.5, 0.2, 0.8);
  }

  for (let i = 0; i < ratio.frames.length - 1; i++) {
    const startFrame = ratio.frames[i];
    const endFrame = ratio.frames[i + 1];
    if (frame >= startFrame && frame <= endFrame) {
      const startValue = ratio.values[i];
      const endValue = ratio.values[i + 1];
      const value = interpolate(frame, [startFrame, endFrame], [startValue, endValue], { clamp: true });
      return clamp(value, 0.2, 0.8);
    }
  }

  return clamp(ratio.values[0] ?? 0.5, 0.2, 0.8);
}

export function TwoColumnScreenLayout({
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
  left,
  right,
  ratio,
  contentGap = 32,
  frame = 0,
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
}: TwoColumnScreenLayoutProps) {
  const resolvedRatio = resolveRatio(frame, ratio);
  const leftFlex = Math.max(0.05, resolvedRatio);
  const rightFlex = Math.max(0.05, 1 - resolvedRatio);

  const children: FlexPageChildSpec[] = [
    { ...left, flex: leftFlex },
    { ...right, flex: rightFlex },
  ];

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
