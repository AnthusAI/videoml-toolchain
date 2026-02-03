import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';

export type ChyronPage = {
  text: string;
  icon?: string;
  highlight?: boolean;
};

export type ChyronProps = {
  // Content
  items: string[] | ChyronPage[];

  // Mode
  mode?: 'scroll' | 'page';

  // Scroll mode settings
  scrollSpeed?: number;
  direction?: 'left' | 'right';
  separator?: string;
  loop?: boolean;

  // Page mode settings
  pageDurationFrames?: number;
  pageTransition?: TransitionConfig;
  pageIndex?: number;

  // Visual
  position?: 'top' | 'bottom';
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  padding?: { left?: number; right?: number };

  // Animation
  entrance?: TransitionConfig;
  entranceStartFrame?: number;
  exit?: TransitionConfig;
  exitStartFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function ChyronComponent(props: ChyronProps) {
  const {
    items,
    mode = 'scroll',
    scrollSpeed = 2,
    direction = 'left',
    separator = ' • ',
    loop = true,
    pageDurationFrames = 90,
    pageTransition,
    pageIndex,
    position = 'bottom',
    height = 60,
    backgroundColor = 'rgba(0, 0, 0, 0.8)',
    textColor = '#ffffff',
    fontSize = 24,
    padding = { left: 20, right: 20 },
    entrance,
    entranceStartFrame = 0,
    exit,
    exitStartFrame,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
  } = props;

  // Normalize items to pages
  const pages: ChyronPage[] = items.map((item) =>
    typeof item === 'string' ? { text: item } : item
  );

  // Calculate bar entrance/exit
  const entranceFrame = frame - entranceStartFrame;
  const exitFrame = exitStartFrame !== undefined ? frame - exitStartFrame : -1;

  const defaultEntrance: TransitionConfig = {
    type: 'slide',
    direction: position === 'bottom' ? 'down' : 'up',
    distance: height,
    durationFrames: 15,
  };

  let barTransition = { opacity: 1, transform: 'none' };

  if (entrance && entranceFrame >= 0 && entranceFrame < entrance.durationFrames) {
    const t = applyTransition(entrance || defaultEntrance, entranceFrame, {
      fps,
      width: videoWidth,
      height: videoHeight,
    });
    barTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  if (exit && exitFrame >= 0 && exitFrame < exit.durationFrames) {
    const t = applyTransition(exit, exitFrame, { fps, width: videoWidth, height: videoHeight });
    barTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  // Render content based on mode
  let content: React.ReactNode;

  if (mode === 'scroll') {
    // Scroll mode: continuous horizontal scroll
    const scrollText = pages.map((p) => p.text).join(separator);
    const fullText = loop ? scrollText + separator + scrollText : scrollText;
    const scrollOffset = (frame * scrollSpeed) % (scrollText.length * (fontSize * 0.6));

    content = (
      <div
        style={{
          position: 'absolute',
          whiteSpace: 'nowrap',
          transform: direction === 'left' ? `translateX(-${scrollOffset}px)` : `translateX(${scrollOffset}px)`,
          color: textColor,
          fontSize: `${fontSize}px`,
          lineHeight: `${height}px`,
          paddingLeft: `${padding.left}px`,
          paddingRight: `${padding.right}px`,
        }}
      >
        {fullText}
      </div>
    );
  } else {
    // Page mode: discrete pages with transitions
    const currentPageIndex =
      pageIndex !== undefined
        ? pageIndex
        : Math.floor(frame / pageDurationFrames) % pages.length;

    const page = pages[currentPageIndex] || pages[0];

    const defaultPageTransition: TransitionConfig = {
      type: 'fade',
      durationFrames: 15,
    };

    const transitionConfig = pageTransition || defaultPageTransition;
    const pageStartFrame = pageIndex === undefined ? frame % pageDurationFrames : 0;

    let pageContentTransition = { opacity: 1, transform: 'none' };
    if (pageStartFrame < transitionConfig.durationFrames) {
      const t = applyTransition(transitionConfig, pageStartFrame, {
        fps,
        width: videoWidth,
        height: videoHeight,
      });
      pageContentTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
    }

    content = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          paddingLeft: `${padding.left}px`,
          paddingRight: `${padding.right}px`,
          opacity: pageContentTransition.opacity,
          transform: pageContentTransition.transform || 'none',
        }}
      >
        {page.icon && (
          <span style={{ marginRight: '12px', fontSize: `${fontSize * 1.2}px` }}>{page.icon}</span>
        )}
        <span
          style={{
            color: page.highlight ? '#ffcc00' : textColor,
            fontSize: `${fontSize}px`,
            fontWeight: page.highlight ? 600 : 400,
          }}
        >
          {page.text}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        [position]: 0,
        left: 0,
        right: 0,
        height: `${height}px`,
        background: backgroundColor,
        overflow: 'hidden',
        opacity: barTransition.opacity,
        transform: barTransition.transform || 'none',
      }}
    >
      {content}
    </div>
  );
}
