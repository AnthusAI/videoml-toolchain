import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { reviveNode } from '../rehydrate.js';

export type SidebarLayoutProps = {
  main: React.ReactNode;
  sidebar: React.ReactNode;

  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: number | string;
  gap?: number;
  padding?: number;

  // Animation
  sidebarEntrance?: TransitionConfig;
  mainEntrance?: TransitionConfig;
  staggerDelayFrames?: number;

  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function SidebarLayout(props: SidebarLayoutProps) {
  const {
    main,
    sidebar,
    sidebarPosition = 'left',
    sidebarWidth = 300,
    gap = 24,
    padding = 80,
    sidebarEntrance,
    mainEntrance,
    staggerDelayFrames = 15,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
  } = props;

  // Default animations
  const defaultSidebarEntrance: TransitionConfig = {
    type: 'slide',
    direction: sidebarPosition === 'left' ? 'left' : 'right',
    distance: 50,
    durationFrames: 20,
  };

  const defaultMainEntrance: TransitionConfig = {
    type: 'fade',
    durationFrames: 15,
    delayFrames: staggerDelayFrames,
  };

  const sidebarConfig = sidebarEntrance || defaultSidebarEntrance;
  const mainConfig = mainEntrance || defaultMainEntrance;

  let sidebarTransition = { opacity: 1, transform: 'none' };
  let mainTransition = { opacity: 1, transform: 'none' };

  if (frame < sidebarConfig.durationFrames + (sidebarConfig.delayFrames || 0)) {
    const t = applyTransition(sidebarConfig, frame, { fps, width: videoWidth, height: videoHeight });
    sidebarTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  if (frame < mainConfig.durationFrames + (mainConfig.delayFrames || 0)) {
    const t = applyTransition(mainConfig, frame, { fps, width: videoWidth, height: videoHeight });
    mainTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  const sidebarWidthStr = typeof sidebarWidth === 'number' ? `${sidebarWidth}px` : sidebarWidth;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: sidebarPosition === 'left' ? `${sidebarWidthStr} 1fr` : `1fr ${sidebarWidthStr}`,
        gap: `${gap}px`,
        padding: `${padding}px`,
      }}
    >
      {sidebarPosition === 'left' ? (
        <>
          <div style={{ opacity: sidebarTransition.opacity, transform: sidebarTransition.transform || 'none' }}>
            {reviveNode(sidebar)}
          </div>
          <div style={{ opacity: mainTransition.opacity, transform: mainTransition.transform || 'none' }}>{reviveNode(main)}</div>
        </>
      ) : (
        <>
          <div style={{ opacity: mainTransition.opacity, transform: mainTransition.transform || 'none' }}>{reviveNode(main)}</div>
          <div style={{ opacity: sidebarTransition.opacity, transform: sidebarTransition.transform || 'none' }}>
            {reviveNode(sidebar)}
          </div>
        </>
      )}
    </div>
  );
}
