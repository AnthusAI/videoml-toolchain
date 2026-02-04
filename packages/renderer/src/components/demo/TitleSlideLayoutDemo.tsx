import React from "react";
import { TitleSlideLayout } from "../layouts/TitleSlideLayout.js";
import { IconComponent } from "../motion/IconComponent.js";

export type TitleSlideLayoutDemoProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  debugLayout?: boolean;
};

export function TitleSlideLayoutDemo({
  frame = 0,
  fps = 30,
  debugLayout = false,
}: TitleSlideLayoutDemoProps) {
  const phaseLength = fps * 3;
  const phase = Math.floor(frame / phaseLength);
  const logo = (
    <IconComponent
      kind="lucide"
      name="star"
      size={140}
      strokeWidth={4}
      color="var(--color-text-muted, rgba(255,255,255,0.7))"
      inline
    />
  );
  const logoLeft = (
    <IconComponent
      kind="lucide"
      name="star"
      size={140}
      strokeWidth={4}
      color="var(--color-text-muted, rgba(255,255,255,0.7))"
      inline
    />
  );

  if (phase === 0) {
    return (
      <TitleSlideLayout
        title="Title Screen Layout"
        subtitle="Centered title + subtitle"
        verticalAlign="center"
        horizontalAlign="center"
        entranceStartFrame={-999}
      />
    );
  }

  if (phase === 1) {
    return (
      <TitleSlideLayout
        title="Title Screen Layout"
        subtitle="Centered title + subtitle"
        verticalAlign="center"
        horizontalAlign="center"
        entranceStartFrame={-999}
        debugLayout
      />
    );
  }

  if (phase === 2) {
    return (
      <TitleSlideLayout
        title="Centered Title + Logo"
        subtitle="Logo centers below the title"
        verticalAlign="center"
        horizontalAlign="center"
        entranceStartFrame={-999}
        logo={logo}
      />
    );
  }

  if (phase === 3) {
    return (
      <TitleSlideLayout
        title="Centered Title + Left Logo"
        subtitle="Logo aligned to the left of the title block"
        verticalAlign="center"
        horizontalAlign="left"
        padding={120}
        entranceStartFrame={-999}
        logo={logoLeft}
      />
    );
  }

  if (phase === 4) {
    return (
      <TitleSlideLayout
        title="Left-Aligned Title"
        subtitle="Logo slot is empty"
        verticalAlign="center"
        horizontalAlign="left"
        padding={120}
        entranceStartFrame={-999}
      />
    );
  }

  return (
    <TitleSlideLayout
      title="Left Title + Logo"
      subtitle="Logo sits to the left of text"
      verticalAlign="center"
      horizontalAlign="left"
      padding={120}
      entranceStartFrame={-999}
      logo={logo}
    />
  );
}
