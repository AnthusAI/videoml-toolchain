import React from "react";
import { TwoColumnScreenLayout } from "../layouts/TwoColumnScreenLayout.js";

export type TwoColumnLayoutDemoProps = {
  frame?: number;
  fps?: number;
};

export function TwoColumnLayoutDemo({ frame = 0, fps = 30 }: TwoColumnLayoutDemoProps) {
  const phaseLength = fps * 4;
  const phase = Math.floor(frame / phaseLength);

  const brandBackground = "var(--color-bg, #101010)";

  const leftPanel = {
    type: "PlaceholderPanel",
    id: "left-panel",
    props: { label: "Primary", text: "Left Panel", tone: "primary" },
  };

  const rightPanel = {
    type: "PlaceholderPanel",
    id: "right-panel",
    props: { label: "Secondary", text: "Right Panel", tone: "secondary" },
  };

  if (phase === 0) {
    return (
      <TwoColumnScreenLayout
        background={brandBackground}
        label="Layout"
        eyebrow="Two Column"
        title="Two Column Screen"
        subtitle="Header + two-column content"
        left={leftPanel}
        right={rightPanel}
      />
    );
  }

  if (phase === 1) {
    return (
      <TwoColumnScreenLayout
        background={brandBackground}
        label="Layout"
        eyebrow="Frame On"
        title="Debug Layout Frame"
        subtitle="Flex regions are visible with debugLayout."
        debugLayout
        left={leftPanel}
        right={rightPanel}
      />
    );
  }

  if (phase === 2) {
    const startFrame = phaseLength * 2;
    return (
      <TwoColumnScreenLayout
        background={brandBackground}
        eyebrow="Ratio Animation"
        title="Dynamic Column Proportions"
        subtitle="Animate the ratio over time"
        left={leftPanel}
        right={rightPanel}
        ratio={{
          frames: [startFrame, startFrame + fps * 3],
          values: [0.33, 0.67],
        }}
      />
    );
  }

  return (
    <TwoColumnScreenLayout
      background={brandBackground}
      eyebrow="Header Variants"
      title="Title Only"
      subtitle={undefined}
      left={leftPanel}
      right={rightPanel}
      ratio={0.5}
    />
  );
}
