import React from "react";

export type ProgressBarProps = {
  position?: "top" | "bottom";
  height?: number;
  color?: string;
  backgroundColor?: string;
  // Injected by renderer
  progress?: number; // 0-100
};

export function ProgressBarComponent(props: ProgressBarProps) {
  const {
    position = "bottom",
    height = 8,
    color = "linear-gradient(90deg, #38bdf8, #818cf8)",
    backgroundColor = "rgba(148,163,184,0.25)",
    progress = 0,
  } = props;

  const style: React.CSSProperties = {
    position: "absolute",
    [position]: 0,
    left: 0,
    right: 0,
    height,
    background: backgroundColor,
  };

  return (
    <div style={style}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, progress))}%`,
          background: color,
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
}
