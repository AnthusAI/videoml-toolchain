import React from 'react';
import { motion } from 'framer-motion';
import { easeInOutCubic, interpolate, spring } from '../../math.js';

export type FramerMotionDemoProps = {
  size?: number;
  accent?: string;
  surface?: string;
  showBackground?: boolean;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function FramerMotionDemoComponent({
  size = 220,
  accent = 'var(--color-accent, #4f46e5)',
  surface = 'var(--color-surface-strong, #2a333b)',
  showBackground = true,
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
}: FramerMotionDemoProps) {
  const cycleFrames = 120;
  const localFrame = frame % cycleFrames;
  const t = localFrame / cycleFrames;
  const eased = easeInOutCubic(t);

  const amplitudeX = videoWidth * 0.22;
  const amplitudeY = videoHeight * 0.12;
  const centerX = videoWidth / 2 - size / 2;
  const centerY = videoHeight / 2 - size / 2;

  const x = centerX + Math.sin(eased * Math.PI * 2) * amplitudeX;
  const y = centerY + Math.cos(eased * Math.PI * 2) * amplitudeY;
  const pulse = spring({ frame: localFrame, fps, config: { from: 0.9, to: 1, mass: 0.6, stiffness: 160, damping: 18 } });
  const secondaryScale = interpolate(localFrame, [0, cycleFrames], [0.9, 1.05], { easing: easeInOutCubic });

  return (
    <div
      data-engine="framer"
      style={{
        position: 'absolute',
        inset: 0,
        background: showBackground ? 'var(--color-bg, #101418)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        style={{
          width: size,
          height: size,
          borderRadius: 28,
          background: surface,
          position: 'absolute',
          left: x,
          top: y,
          scale: pulse,
        }}
      />
      <motion.div
        style={{
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: 18,
          background: 'var(--color-accent-2, #3b82f6)',
          position: 'absolute',
          left: centerX + size * 0.31,
          top: centerY + size * 0.56,
          opacity: 0.95,
          scale: spring({ frame: localFrame + 18, fps, config: { from: 0.92, to: 1.06, mass: 0.7, stiffness: 140, damping: 16 } }),
        }}
      />
      <motion.div
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: 999,
          background: accent,
          position: 'absolute',
          left: centerX + size * 0.15,
          top: centerY + size * 0.15,
          scale: secondaryScale,
        }}
      />
    </div>
  );
}
