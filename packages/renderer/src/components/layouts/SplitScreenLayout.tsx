import React from 'react';
import { reviveNode } from '../rehydrate.js';

export type SplitScreenLayoutProps = {
  first: React.ReactNode;
  second: React.ReactNode;

  direction?: 'horizontal' | 'vertical';
  ratio?: number;
  gap?: number;

  // Divider line
  divider?: {
    show?: boolean;
    color?: string;
    width?: number;
  };

  // Animation
  revealStyle?: 'simultaneous' | 'wipe' | 'stagger';
  revealDurationFrames?: number;

  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function SplitScreenLayout(props: SplitScreenLayoutProps) {
  const {
    first,
    second,
    direction = 'horizontal',
    ratio = 0.5,
    gap = 0,
    divider,
    revealStyle = 'simultaneous',
    revealDurationFrames = 30,
    frame = 0,
  } = props;

  // Calculate reveal progress
  let firstClipPath = 'none';
  let secondClipPath = 'none';

  if (revealStyle === 'wipe' && frame < revealDurationFrames) {
    const progress = frame / revealDurationFrames;
    if (direction === 'horizontal') {
      const percentage = progress * 100;
      firstClipPath = `inset(0 ${100 - percentage}% 0 0)`;
      secondClipPath = `inset(0 0 0 ${percentage}%)`;
    } else {
      const percentage = progress * 100;
      firstClipPath = `inset(0 0 ${100 - percentage}% 0)`;
      secondClipPath = `inset(${percentage}% 0 0 0)`;
    }
  }

  const showDivider = divider?.show !== false;
  const dividerColor = divider?.color || '#ffffff';
  const dividerWidth = divider?.width || 2;

  if (direction === 'horizontal') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: `${ratio * 100}% ${(1 - ratio) * 100}%`,
          gap: `${gap}px`,
        }}
      >
        <div style={{ clipPath: firstClipPath, position: 'relative' }}>
          {reviveNode(first)}
          {showDivider && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${dividerWidth}px`,
                background: dividerColor,
              }}
            />
          )}
        </div>
        <div style={{ clipPath: secondClipPath }}>{reviveNode(second)}</div>
      </div>
    );
  } else {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateRows: `${ratio * 100}% ${(1 - ratio) * 100}%`,
          gap: `${gap}px`,
        }}
      >
        <div style={{ clipPath: firstClipPath, position: 'relative' }}>
          {reviveNode(first)}
          {showDivider && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: `${dividerWidth}px`,
                background: dividerColor,
              }}
            />
          )}
        </div>
        <div style={{ clipPath: secondClipPath }}>{reviveNode(second)}</div>
      </div>
    );
  }
}
