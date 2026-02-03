import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { reviveNode } from '../rehydrate.js';

export type TwoColumnLayoutProps = {
  // Content
  left: React.ReactNode;
  right: React.ReactNode;

  // Layout
  ratio?: '50-50' | '40-60' | '60-40' | '33-67' | '67-33';
  gap?: number;
  padding?: number;
  verticalAlign?: 'top' | 'center' | 'bottom' | 'stretch';

  // Animation
  staggerDelayFrames?: number;
  leftEntrance?: TransitionConfig;
  rightEntrance?: TransitionConfig;

  entranceStartFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

const ratioToGridColumns: Record<string, string> = {
  '50-50': '1fr 1fr',
  '40-60': '2fr 3fr',
  '60-40': '3fr 2fr',
  '33-67': '1fr 2fr',
  '67-33': '2fr 1fr',
};

export function TwoColumnLayout(props: TwoColumnLayoutProps) {
  const {
    left,
    right,
    ratio = '50-50',
    gap = 48,
    padding = 80,
    verticalAlign = 'top',
    staggerDelayFrames = 10,
    leftEntrance,
    rightEntrance,
    entranceStartFrame = 0,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
  } = props;

  // Default entrance animations
  const defaultLeftEntrance: TransitionConfig = {
    type: 'slide',
    direction: 'left',
    distance: 50,
    durationFrames: 20,
  };

  const defaultRightEntrance: TransitionConfig = {
    type: 'slide',
    direction: 'right',
    distance: 50,
    durationFrames: 20,
    delayFrames: staggerDelayFrames,
  };

  const leftConfig = leftEntrance || defaultLeftEntrance;
  const rightConfig = rightEntrance || defaultRightEntrance;

  // Calculate animations
  const entranceFrame = frame - entranceStartFrame;

  let leftTransition = { opacity: 1, transform: 'none' };
  let rightTransition = { opacity: 1, transform: 'none' };

  if (entranceFrame >= 0) {
    if (entranceFrame < leftConfig.durationFrames + (leftConfig.delayFrames || 0)) {
      const t = applyTransition(leftConfig, entranceFrame, { fps, width: videoWidth, height: videoHeight });
      leftTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
    }
    if (entranceFrame < rightConfig.durationFrames + (rightConfig.delayFrames || 0)) {
      const t = applyTransition(rightConfig, entranceFrame, { fps, width: videoWidth, height: videoHeight });
      rightTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
    }
  }

  // Vertical alignment
  let alignItems = 'start';
  if (verticalAlign === 'center') alignItems = 'center';
  if (verticalAlign === 'bottom') alignItems = 'end';
  if (verticalAlign === 'stretch') alignItems = 'stretch';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: ratioToGridColumns[ratio],
        gap: `${gap}px`,
        padding: `${padding}px`,
        alignItems,
      }}
    >
      <div
        style={{
          opacity: leftTransition.opacity,
          transform: leftTransition.transform || 'none',
        }}
      >
        {reviveNode(left)}
      </div>
      <div
        style={{
          opacity: rightTransition.opacity,
          transform: rightTransition.transform || 'none',
        }}
      >
        {reviveNode(right)}
      </div>
    </div>
  );
}
