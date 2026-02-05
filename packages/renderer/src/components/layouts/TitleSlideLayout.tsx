import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { reviveNode } from '../rehydrate.js';
import type { ScriptCue } from '@babulus/shared';
import { TextEffectsComponent } from '../text/TextEffectsComponent.js';
import type { TextEffectConfig } from '../../engines/text-effects.js';

export type TitleSlideLayoutProps = {
  // Content
  title: string;
  subtitle?: string;
  eyebrow?: string;

  // Typography
  titleSize?: number;
  subtitleSize?: number;
  eyebrowSize?: number;
  titleWeight?: number;
  subtitleWeight?: number;
  eyebrowWeight?: number;
  titleColor?: string;
  subtitleColor?: string;
  eyebrowColor?: string;
  eyebrowLetterSpacing?: number;

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

  // Optional text effects (named effects vocabulary, frame-driven)
  eyebrowEffect?: TextEffectConfig;
  titleEffect?: TextEffectConfig;
  subtitleEffect?: TextEffectConfig;

  // Timing
  entranceStartFrame?: number;
  exitStartFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  cue?: ScriptCue;
  styles?: any;
  debugLayout?: boolean;

  // Logo slot
  logo?: React.ReactNode;
};

export function TitleSlideLayout(props: TitleSlideLayoutProps) {
  const {
    title,
    subtitle,
    eyebrow,
    titleSize = 96,
    subtitleSize = 36,
    eyebrowSize = 22,
    titleWeight = 700,
    subtitleWeight = 400,
    eyebrowWeight = 600,
    titleColor,
    subtitleColor,
    eyebrowColor,
    eyebrowLetterSpacing = 0.28,
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
    eyebrowEffect,
    titleEffect,
    subtitleEffect,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
    cue,
    styles,
    debugLayout = false,
    logo,
  } = props;

  // Default colors from styles or fallback
  const finalTitleColor = titleColor || 'var(--color-text, #ffffff)';
  const finalSubtitleColor = subtitleColor || 'var(--color-text-muted, #cccccc)';
  const finalEyebrowColor = eyebrowColor || 'var(--color-text-muted, rgba(255,255,255,0.75))';
  const fontHeadline = 'var(--font-headline, ui-sans-serif, system-ui, sans-serif)';
  const fontSubhead = 'var(--font-subhead, ui-sans-serif, system-ui, sans-serif)';
  const fontEyebrow = 'var(--font-eyebrow, ui-sans-serif, system-ui, sans-serif)';

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

  // If a TextEffects config is provided, avoid double-animating with layout transitions.
  if (titleEffect) {
    titleTransition = { opacity: 1, transform: 'none' };
  }
  if (subtitleEffect) {
    subtitleTransition = { opacity: 1, transform: 'none' };
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
        background: background || 'var(--color-bg, #101010)',
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
              {eyebrow && (
                <div
                  style={{
                    fontSize: `${eyebrowSize}px`,
                    fontWeight: eyebrowWeight,
                    color: finalEyebrowColor,
                    fontFamily: fontEyebrow,
                    textTransform: 'uppercase',
                    letterSpacing: `${eyebrowLetterSpacing}em`,
                    marginBottom: `${Math.max(8, gap * 0.4)}px`,
                  }}
                >
                  {eyebrowEffect ? (
                    <TextEffectsComponent
                      text={eyebrow}
                      cue={cue}
                      frame={frame}
                      fps={fps}
                      videoWidth={videoWidth}
                      videoHeight={videoHeight}
                      effect={eyebrowEffect}
                      fontSize={eyebrowSize}
                      fontWeight={eyebrowWeight}
                      color={finalEyebrowColor}
                      align={horizontalAlign === 'left' ? 'left' : 'center'}
                      style={{ display: 'inline-block' }}
                    />
                  ) : (
                    eyebrow
                  )}
                </div>
              )}
              {titleEffect ? (
                <div
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
                  <TextEffectsComponent
                    text={title}
                    cue={cue}
                    frame={frame}
                    fps={fps}
                    videoWidth={videoWidth}
                    videoHeight={videoHeight}
                    effect={titleEffect}
                    fontSize={titleSize}
                    fontWeight={titleWeight}
                    color={finalTitleColor}
                    align={horizontalAlign === 'left' ? 'left' : 'center'}
                  />
                </div>
              ) : (
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
              )}
              {subtitle && (
                subtitleEffect ? (
                  <div
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
                    <TextEffectsComponent
                      text={subtitle}
                      cue={cue}
                      frame={frame}
                      fps={fps}
                      videoWidth={videoWidth}
                      videoHeight={videoHeight}
                      effect={subtitleEffect}
                      fontSize={subtitleSize}
                      fontWeight={subtitleWeight}
                      color={finalSubtitleColor}
                      align={horizontalAlign === 'left' ? 'left' : 'center'}
                    />
                  </div>
                ) : (
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
                )
              )}
            </div>
          </div>
        ) : (
          <>
            {eyebrow && (
              <div
                style={{
                  fontSize: `${eyebrowSize}px`,
                  fontWeight: eyebrowWeight,
                  color: finalEyebrowColor,
                  fontFamily: fontEyebrow,
                  textTransform: 'uppercase',
                  letterSpacing: `${eyebrowLetterSpacing}em`,
                  marginBottom: `${Math.max(8, gap * 0.4)}px`,
                }}
              >
                {eyebrowEffect ? (
                  <TextEffectsComponent
                    text={eyebrow}
                    cue={cue}
                    frame={frame}
                    fps={fps}
                    videoWidth={videoWidth}
                    videoHeight={videoHeight}
                    effect={eyebrowEffect}
                    fontSize={eyebrowSize}
                    fontWeight={eyebrowWeight}
                    color={finalEyebrowColor}
                    align={horizontalAlign === 'left' ? 'left' : 'center'}
                    style={{ display: 'inline-block' }}
                  />
                ) : (
                  eyebrow
                )}
              </div>
            )}
            {titleEffect ? (
              <div
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
                <TextEffectsComponent
                  text={title}
                  cue={cue}
                  frame={frame}
                  fps={fps}
                  videoWidth={videoWidth}
                  videoHeight={videoHeight}
                  effect={titleEffect}
                  fontSize={titleSize}
                  fontWeight={titleWeight}
                  color={finalTitleColor}
                  align={horizontalAlign === 'left' ? 'left' : 'center'}
                />
              </div>
            ) : (
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
            )}
            {subtitle && (
              subtitleEffect ? (
                <div
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
                  <TextEffectsComponent
                    text={subtitle}
                    cue={cue}
                    frame={frame}
                    fps={fps}
                    videoWidth={videoWidth}
                    videoHeight={videoHeight}
                    effect={subtitleEffect}
                    fontSize={subtitleSize}
                    fontWeight={subtitleWeight}
                    color={finalSubtitleColor}
                    align={horizontalAlign === 'left' ? 'left' : 'center'}
                  />
                </div>
              ) : (
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
              )
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
