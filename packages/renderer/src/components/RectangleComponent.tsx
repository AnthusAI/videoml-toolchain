import React from "react";
import type { CascadedStyles } from "../styles/cascade.ts";

export type RectangleProps = {
  // Visual
  color?: string;
  gradient?: string;
  image?: string;

  // Positioning (optional - defaults to full viewport)
  x?: number;
  y?: number;
  width?: number | string; // Can be "100%" or pixel value
  height?: number | string;

  // Border/effects
  borderRadius?: number;
  border?: string;

  // Injected by renderer
  styles?: CascadedStyles;
};

export function RectangleComponent(props: RectangleProps) {
  const {
    color,
    gradient,
    image,
    x = 0,
    y = 0,
    width = "100%",
    height = "100%",
    borderRadius,
    border,
    styles = {} as CascadedStyles,
  } = props;

  // Priority: gradient > image > color > styles.background > transparent
  const background = gradient || image || color || styles.background || "transparent";

  // When width/height are percentages and x/y are 0, use inset positioning for better compatibility
  const useInsetPositioning = (width === "100%" || width === "100vw") &&
                               (height === "100%" || height === "100vh") &&
                               x === 0 && y === 0;

  return (
    <div
      style={useInsetPositioning ? {
        position: "absolute",
        inset: 0,
        background,
        opacity: styles._computedOpacity ?? 1,
        borderRadius,
        border,
      } : {
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background,
        opacity: styles._computedOpacity ?? 1,
        borderRadius,
        border,
      }}
    />
  );
}
