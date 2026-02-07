import React from 'react';
import gsapImport from 'gsap';

const gsap = (gsapImport as any).gsap ?? gsapImport;

export type GsapPrinciplesDemoProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  centerX?: number;
  centerY?: number;
  width?: number;
  height?: number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function GsapPrinciplesDemoComponent({
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
  centerX = 960,
  centerY = 640,
  width = 1200,
  height = 320,
}: GsapPrinciplesDemoProps) {
  const time = frame / Math.max(1, fps);
  const cycleSec = 2.8;
  const half = cycleSec / 2;
  const local = time % cycleSec;
  const halfPhase = local < half ? local / half : (local - half) / half;
  const dir = local < half ? 1 : -1;

  const easeInOut = (gsap as any).parseEase ? (gsap as any).parseEase('power2.inOut') : (v: number) => v;

  const left = videoWidth * (1 / 3);
  const right = videoWidth * (2 / 3);
  const startX = dir > 0 ? left : right;
  const endX = dir > 0 ? right : left;
  const eased = easeInOut(halfPhase);
  const x = startX + (endX - startX) * eased;

  const y = centerY;
  const containerLeft = centerX - width / 2;
  const localX = x - containerLeft;

  const accent = 'var(--color-accent, #ff5ec4)';
  const textMuted = 'var(--color-text-muted, #c7c2bc)';

  const size = Math.min(height * 0.6, 120);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: videoWidth,
        height: videoHeight,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: centerX - width / 2,
          top: centerY - height / 2,
          width,
          height,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: localX - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            borderRadius: 999,
            background: accent,
            transform: 'scale(1, 1)',
          }}
        />
        {/* Intentionally no labels; focus on the motion only. */}
      </div>
    </div>
  );
}
