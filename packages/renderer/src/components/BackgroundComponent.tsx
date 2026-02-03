import React from "react";

export type GradientConfig = {
  type?: "linear" | "radial";
  angle?: number;
  colors: string[];
  stops?: number[];
  position?: string; // for radial gradients
};

export type BackgroundProps = {
  variant?: "solid" | "linear" | "radial";
  color?: string;
  gradient?: GradientConfig;
  width?: number | string;
  height?: number | string;
  inset?: number | string;
  opacity?: number;
};

function buildGradient(config: GradientConfig, fallbackType: "linear" | "radial") {
  const type = config.type ?? fallbackType;
  const colors = config.colors ?? [];
  const stops = config.stops ?? [];
  const stopsText = colors
    .map((color, idx) => {
      const stop = stops[idx];
      return typeof stop === "number" ? `${color} ${stop}%` : color;
    })
    .join(", ");

  if (type === "radial") {
    const position = config.position ?? "center";
    return `radial-gradient(at ${position}, ${stopsText})`;
  }

  const angle = config.angle ?? 135;
  return `linear-gradient(${angle}deg, ${stopsText})`;
}

export function BackgroundComponent(props: BackgroundProps) {
  const {
    variant = "solid",
    color = "#111111",
    gradient,
    width = "100%",
    height = "100%",
    inset = 0,
    opacity = 1,
  } = props;

  let background = color;
  if (variant === "linear" || variant === "radial") {
    const gradientConfig: GradientConfig = gradient ?? { colors: [color, color] };
    background = buildGradient(gradientConfig, variant);
  }

  return (
    <div
      style={{
        position: "absolute",
        inset,
        width,
        height,
        background,
        opacity,
      }}
    />
  );
}
