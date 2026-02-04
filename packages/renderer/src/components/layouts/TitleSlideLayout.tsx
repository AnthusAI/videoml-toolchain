import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { reviveNode } from '../rehydrate.js';

export type TitleSlideLayoutProps = {
  // Content
  title: string;
  subtitle?: string;

  // Typography
  titleSize?: number;
  subtitleSize?: number;
  titleWeight?: number;
  subtitleWeight?: number;
  titleColor?: string;
  subtitleColor?: string;

  // Layout
  verticalAlign?: 'top' | 'center' | 'bottom';
  horizontalAlign?: 'left' | 'center';
  gap?: number;
  padding?: number;
  maxWidth?: number;

  // Background
  background?: string;

  // Animation
  entrance?: {
    title?: TransitionConfig;
    subtitle?: TransitionConfig;
  };
  exit?: {
    title?: TransitionConfig;
    subtitle?: TransitionConfig;
  };

  // Timing
  entranceStartFrame?: number;
  exitStartFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  styles?: any;
  debugLayout?: boolean;

  // Logo slot
  logo?: React.ReactNode;
};

export function TitleSlideLayout(props: TitleSlideLayoutProps) {
  const {
    title,
    subtitle,
    titleSize = 96,
    subtitleSize = 36,
    titleWeight = 700,
    subtitleWeight = 400,
    titleColor,
    subtitleColor,
    verticalAlign = 'center',
    horizontalAlign = 'center',
    gap = 24,
    padding = 80,
    maxWidth = 1400,
    background,
    entrance,
    exit,
    entranceStartFrame = 0,
    exitStartFrame,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
    styles,
    debugLayout = false,
    logo,
  } = props;

  // Default colors from styles or fallback
  const finalTitleColor = titleColor || styles?.color || '#ffffff';
  const finalSubtitleColor = subtitleColor || styles?.color || '#cccccc';
  const fontHeadline = 'var(--font-headline, ui-sans-serif, system-ui, sans-serif)';
  const fontSubhead = 'var(--font-subhead, ui-sans-serif, system-ui, sans-serif)';

  // Default entrance animations
  const defaultTitleEntrance: TransitionConfig = {
    type: 'spring',
    durationFrames: 30,
    mass: 0.5,
    stiffness: 200,
    damping: 100,
  };

  const defaultSubtitleEntrance: TransitionConfig = {
    type: 'fade',
    durationFrames: 15,
    from: 0,
    to: 1,
    delayFrames: 10,
  };

  // Calculate animations
  const titleEntranceFrame = frame - entranceStartFrame;
  const titleExitFrame = exitStartFrame !== undefined ? frame - exitStartFrame : -1;

  const titleEntranceConfig = entrance?.title || defaultTitleEntrance;
  const subtitleEntranceConfig = entrance?.subtitle || defaultSubtitleEntrance;

  // Apply entrance
  let titleTransition = { opacity: 1, transform: 'none' };
  let subtitleTransition = { opacity: 1, transform: 'none' };

  if (titleEntranceFrame >= 0 && titleEntranceFrame < titleEntranceConfig.durationFrames + (titleEntranceConfig.delayFrames || 0)) {
    const t = applyTransition(titleEntranceConfig, titleEntranceFrame, { fps, width: videoWidth, height: videoHeight });
    titleTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  if (titleEntranceFrame >= 0 && titleEntranceFrame < subtitleEntranceConfig.durationFrames + (subtitleEntranceConfig.delayFrames || 0)) {
    const t = applyTransition(subtitleEntranceConfig, titleEntranceFrame, { fps, width: videoWidth, height: videoHeight });
    subtitleTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  // Apply exit if specified
  if (exit && titleExitFrame >= 0) {
    if (exit.title && titleExitFrame < exit.title.durationFrames) {
      const t = applyTransition(exit.title, titleExitFrame, { fps, width: videoWidth, height: videoHeight });
      titleTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
    }
    if (exit.subtitle && subtitle && titleExitFrame < exit.subtitle.durationFrames) {
      const t = applyTransition(exit.subtitle, titleExitFrame, { fps, width: videoWidth, height: videoHeight });
      subtitleTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
    }
  }

  // Vertical alignment
  let justifyContent = 'center';
  if (verticalAlign === 'top') justifyContent = 'flex-start';
  if (verticalAlign === 'bottom') justifyContent = 'flex-end';
  const alignItems = horizontalAlign === 'left' && !logo ? 'flex-start' : 'center';
  const textAlign = horizontalAlign === 'left' ? 'left' : 'center';

  const debugOutline = debugLayout ? '6px dashed rgba(0, 255, 255, 0.95)' : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        alignItems,
        padding: `${padding}px`,
        background: background || 'transparent',
        outline: debugOutline,
        outlineOffset: -6,
      }}
    >
      <div
        style={{
          maxWidth: `${maxWidth}px`,
          textAlign,
          outline: debugOutline,
          outlineOffset: -6,
        }}
      >
        {horizontalAlign === 'left' && logo ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: `${gap * 2}px`,
              width: 'fit-content',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {reviveNode(logo)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1
                style={{
                  fontSize: `${titleSize}px`,
                  fontWeight: titleWeight,
                  color: finalTitleColor,
                  fontFamily: fontHeadline,
                  margin: 0,
                  opacity: titleTransition.opacity,
                  transform: titleTransition.transform || 'none',
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  style={{
                    fontSize: `${subtitleSize}px`,
                    fontWeight: subtitleWeight,
                    color: finalSubtitleColor,
                    fontFamily: fontSubhead,
                    marginTop: `${gap}px`,
                    marginBottom: 0,
                    opacity: subtitleTransition.opacity,
                    transform: subtitleTransition.transform || 'none',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <h1
              style={{
                fontSize: `${titleSize}px`,
                fontWeight: titleWeight,
                color: finalTitleColor,
                fontFamily: fontHeadline,
                margin: 0,
                opacity: titleTransition.opacity,
                transform: titleTransition.transform || 'none',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: `${subtitleSize}px`,
                  fontWeight: subtitleWeight,
                  color: finalSubtitleColor,
                  fontFamily: fontSubhead,
                  marginTop: `${gap}px`,
                  marginBottom: 0,
                  opacity: subtitleTransition.opacity,
                  transform: subtitleTransition.transform || 'none',
                }}
              >
                {subtitle}
              </p>
            )}
            {logo && (
              <div
                style={{
                  marginTop: `${gap}px`,
                  display: 'flex',
                  justifyContent: horizontalAlign === 'left' ? 'flex-start' : 'center',
                }}
              >
                {reviveNode(logo)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
