import React from "react";
import { ContentScreenLayout } from "../layouts/ContentScreenLayout.js";
import { IconComponent } from "../motion/IconComponent.js";

export type ContentLayoutDemoProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function ContentLayoutDemo({
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
}: ContentLayoutDemoProps) {
  const phaseLength = fps * 4;
  const phase = Math.floor(frame / phaseLength);

  const brandBackground = "var(--color-bg, #101010)";
  const logo = (
    <IconComponent
      kind="lucide"
      name="star"
      size={56}
      strokeWidth={4}
      color="var(--color-text, #ffffff)"
      inline
    />
  );

  if (phase === 0) {
    return (
      <ContentScreenLayout
        background={brandBackground}
        eyebrow="Content Screen"
        title="Left Title + Subtitle"
        subtitle="Default header style with no logo"
        headerAlign="left"
        content={{
          type: "PlaceholderPanel",
          id: "content-slot",
          flex: 1,
          props: { label: "Content Area", text: "Primary Content", tone: "primary" },
        }}
      />
    );
  }

  if (phase === 1) {
    return (
      <ContentScreenLayout
        background={brandBackground}
        eyebrow="Frame On"
        title="Debug Layout Frame"
        subtitle="Every region is visible when debugLayout is enabled."
        debugLayout
        headerAlign="left"
        logo={logo}
        logoPosition="right"
        content={{
          type: "PlaceholderPanel",
          id: "content-slot",
          flex: 1,
          props: { label: "Content Area", text: "Content Slot", tone: "primary" },
        }}
      />
    );
  }

  if (phase === 2) {
    return (
      <ContentScreenLayout
        background={brandBackground}
        eyebrow="Logo Right"
        title="Left Title + Logo"
        subtitle="Logo anchors the right side"
        headerAlign="left"
        logo={logo}
        logoPosition="right"
        content={{
          type: "PlaceholderPanel",
          id: "content-slot",
          flex: 1,
          props: { label: "Content Area", text: "Content Slot", tone: "primary" },
        }}
      />
    );
  }

  if (phase === 3) {
    return (
      <ContentScreenLayout
        background={brandBackground}
        eyebrow="Header Variants"
        title="Centered Title Only"
        headerAlign="center"
        content={{
          type: "PlaceholderPanel",
          id: "content-slot",
          flex: 1,
          props: { label: "Content Area", text: "Content Slot", tone: "secondary" },
        }}
      />
    );
  }

  if (phase === 4) {
    return (
      <ContentScreenLayout
        background={brandBackground}
        eyebrow="Centered + Logo"
        title="Centered Title + Logo"
        subtitle="Logo sits below when centered"
        headerAlign="center"
        logo={logo}
        logoPosition="center"
        content={{
          type: "PlaceholderPanel",
          id: "content-slot",
          flex: 1,
          props: { label: "Content Area", text: "Content Slot", tone: "secondary" },
        }}
      />
    );
  }

  if (phase === 5) {
    return (
      <ContentScreenLayout
        background={brandBackground}
        eyebrow="Centered + Left Logo"
        title="Centered Title"
        subtitle="Logo aligned left of the title block"
        headerAlign="center"
        logo={logo}
        logoPosition="left"
        content={{
          type: "PlaceholderPanel",
          id: "content-slot",
          flex: 1,
          props: { label: "Content Area", text: "Content Slot", tone: "secondary" },
        }}
      />
    );
  }

  return (
    <ContentScreenLayout
      background={brandBackground}
      title={undefined}
      subtitle={undefined}
      headerAlign="left"
      content={{
        type: "PlaceholderPanel",
        id: "content-slot",
        flex: 1,
        props: { label: "Content Area", text: "Full Screen Content", tone: "primary" },
      }}
    />
  );
}
