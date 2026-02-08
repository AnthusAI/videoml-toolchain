import React from 'react';
import { useCurrentFrame, useVideoConfig } from '../../context.js';

export type P5NeonFieldProps = {
  intensity?: number;
  speed?: number;
  scale?: number;
  debugFrame?: boolean;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
};

const DEFAULT_BG = '#0f1117';

export function P5NeonFieldComponent({
  intensity = 1,
  speed = 1,
  scale = 1,
  debugFrame = false,
  style,
  className,
  dataEngine,
}: P5NeonFieldProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const time = (frame / Math.max(1, fps)) * speed;
  const maxDim = Math.max(width, height);

  const r1 = maxDim * (0.34 + 0.06 * Math.sin(time * 1.5)) * scale;
  const r2 = maxDim * (0.28 + 0.05 * Math.cos(time * 1.2)) * scale;
  const r3 = maxDim * (0.24 + 0.05 * Math.sin(time * 1.8)) * scale;

  const p1x = width * 0.3 + Math.sin(time * 1.6) * width * 0.18;
  const p1y = height * 0.45 + Math.cos(time * 1.2) * height * 0.14;
  const p2x = width * 0.7 + Math.sin(time * 1.1 + 2.2) * width * 0.2;
  const p2y = height * 0.35 + Math.cos(time * 1.5 + 1.3) * height * 0.16;
  const p3x = width * 0.52 + Math.sin(time * 1.9 + 3.8) * width * 0.15;
  const p3y = height * 0.72 + Math.cos(time * 1.3 + 2.9) * height * 0.12;

  const alphaA = Math.min(0.6, 0.38 * intensity);
  const alphaB = Math.min(0.65, 0.42 * intensity);
  const alphaC = Math.min(0.55, 0.32 * intensity);

  return (
    <div
      className={className}
      data-engine={dataEngine}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: `var(--color-bg, ${DEFAULT_BG})`,
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx={p1x} cy={p1y} r={r1} fill="var(--color-accent, #293b8f)" fillOpacity={alphaA} />
        <circle cx={p2x} cy={p2y} r={r2} fill="var(--color-accent-2, #8a3562)" fillOpacity={alphaB} />
        <circle cx={p3x} cy={p3y} r={r3} fill="var(--color-surface-strong, #0d121b)" fillOpacity={alphaC} />
      </svg>

      {debugFrame ? (
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            color: '#fff',
            fontSize: 14,
            fontFamily: 'monospace',
          }}
        >
          frame {frame}
        </div>
      ) : null}
    </div>
  );
}
