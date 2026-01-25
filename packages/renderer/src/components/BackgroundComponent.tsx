import React from "react";

export type BackgroundProps = {
  color?: string;
  gradient?: string;
  image?: string;
};

export function BackgroundComponent(props: BackgroundProps) {
  const { color = "#000000", gradient, image } = props;

  const background = gradient || image || color;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background,
        zIndex: -1, // Always behind other content
      }}
    />
  );
}
