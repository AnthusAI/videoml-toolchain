import React from "react";
import { lucidePath } from "./BulletListComponent.js";

export type IconProps = {
  kind: "lucide" | "unicode";
  name: string; // lucide icon name OR unicode glyph when kind === 'unicode'
  size?: number; // px
  strokeWidth?: number; // lucide only
  color?: string;
  fontFamily?: string; // unicode only
  position?: { x?: number; y?: number };
};

const DEFAULT_UNICODE_FONT =
  '"Segoe UI Symbol", "Arial Unicode MS", "Noto Sans Symbols", "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';

export function IconComponent({
  kind,
  name,
  size = 32,
  strokeWidth = 2,
  color = "#ffffff",
  fontFamily,
  position,
}: IconProps) {
  const x = position?.x ?? 0;
  const y = position?.y ?? 0;

  if (kind === "lucide") {
    const path = lucidePath(name);
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "absolute", left: x, top: y }}
      >
        {path || <circle cx="12" cy="12" r="10" />}
      </svg>
    );
  }

  // unicode
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        color,
        fontSize: size,
        fontFamily: fontFamily || DEFAULT_UNICODE_FONT,
        lineHeight: 1,
      }}
    >
      {name}
    </div>
  );
}
