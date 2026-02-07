import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { easeOutBounce } from '../../animation/easing.js';
import type { ScriptCue } from '../../shared.ts';
import { TextEffectsComponent } from '../text/TextEffectsComponent.js';
import type { TextEffectConfig } from '../../engines/text-effects.js';

export type ChapterHeadingLayoutProps = {
  // Content
  number: number | string;
  title: string;
  subtitle?: string;
  showNumber?: boolean;

  // Typography
  numberSize?: number;
  titleSize?: number;
  subtitleSize?: number;

  // Layout
  layout?: 'stacked' | 'inline' | 'side-by-side';

  numberColor?: string;
  background?: string;
  align?: 'left' | 'center' | 'right';

  // Animation
  numberEntrance?: TransitionConfig;
  titleEntrance?: TransitionConfig;

  // Optional text effects (named effects vocabulary, frame-driven)
  numberEffect?: TextEffectConfig;
  titleEffect?: TextEffectConfig;
  subtitleEffect?: TextEffectConfig;

  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  cue?: ScriptCue;
};

export function ChapterHeadingLayout(props: ChapterHeadingLayoutProps) {
  const {
    number,
    title,
    subtitle,
    showNumber = true,
    numberSize = 200,
    titleSize = 72,
    subtitleSize = 32,
    layout = 'stacked',
    numberColor = '#ff6b6b',
    background = 'var(--color-bg, #101010)',
    align = 'center',
    numberEntrance,
    titleEntrance,
    numberEffect,
    titleEffect,
    subtitleEffect,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
    cue,
  } = props;

  // Default animations
  const defaultNumberEntrance: TransitionConfig = {
    type: 'scale',
    from: 0,
    to: 1,
    durationFrames: 30,
    easing: easeOutBounce,
  };

  const defaultTitleEntrance: TransitionConfig = {
    type: 'fade',
    from: 0,
    to: 1,
    durationFrames: 20,
    delayFrames: 15,
  };

  const numberConfig = numberEntrance || defaultNumberEntrance;
  const titleConfig = titleEntrance || defaultTitleEntrance;

  let numberTransition = { opacity: 1, transform: 'none' };
  let titleTransition = { opacity: 1, transform: 'none' };

  if (!numberEffect && frame < numberConfig.durationFrames + (numberConfig.delayFrames || 0)) {
    const t = applyTransition(numberConfig, frame, { fps, width: videoWidth, height: videoHeight });
    numberTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  if (!titleEffect && frame < titleConfig.durationFrames + (titleConfig.delayFrames || 0)) {
    const t = applyTransition(titleConfig, frame, { fps, width: videoWidth, height: videoHeight });
    titleTransition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
  }

  if (layout === 'stacked') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          padding: '80px',
          background,
        }}
      >
        {showNumber && (
          <div
            style={{
              fontSize: `${numberSize}px`,
              fontWeight: 700,
              color: numberColor,
              opacity: numberTransition.opacity,
              transform: numberTransition.transform || 'none',
              lineHeight: 1,
            }}
          >
            {numberEffect ? (
              <TextEffectsComponent
                text={String(number)}
                cue={cue}
                frame={frame}
                fps={fps}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
                effect={numberEffect}
                fontSize={numberSize}
                fontWeight={700}
                color={numberColor}
                align="center"
              />
            ) : (
              number
            )}
          </div>
        )}
        <div
          style={{
            marginTop: showNumber ? '32px' : 0,
            textAlign: align,
            opacity: titleTransition.opacity,
            transform: titleTransition.transform || 'none',
          }}
        >
          {titleEffect ? (
              <TextEffectsComponent
                text={title}
                cue={cue}
                frame={frame}
                fps={fps}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
                effect={titleEffect}
                fontSize={titleSize}
                fontWeight={700}
                color={'var(--color-text, #ffffff)'}
                align="center"
                lineHeight={1}
                style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
              />
          ) : (
            <div style={{ fontSize: `${titleSize}px`, fontWeight: 700, color: 'var(--color-text, #ffffff)', textAlign: align, lineHeight: 1 }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                fontSize: `${subtitleSize}px`,
                color: 'var(--color-text-muted, #cccccc)',
                marginTop: '16px',
                textAlign: align,
              }}
            >
              {subtitleEffect ? (
                <TextEffectsComponent
                  text={subtitle}
                  cue={cue}
                  frame={frame}
                  fps={fps}
                  videoWidth={videoWidth}
                  videoHeight={videoHeight}
                  effect={subtitleEffect}
                  fontSize={subtitleSize}
                  fontWeight={400}
                  color={'var(--color-text-muted, #cccccc)'}
                  align="center"
                  style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
                />
              ) : (
                subtitle
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'side-by-side') {
    if (!showNumber) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
            padding: '80px',
            background,
          }}
        >
          <div style={{ opacity: titleTransition.opacity, transform: titleTransition.transform || 'none' }}>
            {titleEffect ? (
              <TextEffectsComponent
                text={title}
                cue={cue}
                frame={frame}
                fps={fps}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
                effect={titleEffect}
                fontSize={titleSize}
                fontWeight={700}
                color={'var(--color-text, #ffffff)'}
                align={align}
                lineHeight={1}
                style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
              />
            ) : (
              <div style={{ fontSize: `${titleSize}px`, fontWeight: 700, color: 'var(--color-text, #ffffff)', textAlign: align, lineHeight: 1 }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: `${subtitleSize}px`,
                  color: 'var(--color-text-muted, #cccccc)',
                  marginTop: '16px',
                  textAlign: align,
                }}
              >
                {subtitleEffect ? (
                <TextEffectsComponent
                  text={subtitle}
                  cue={cue}
                  frame={frame}
                  fps={fps}
                  videoWidth={videoWidth}
                  videoHeight={videoHeight}
                  effect={subtitleEffect}
                  fontSize={subtitleSize}
                  fontWeight={400}
                  color={'var(--color-text-muted, #cccccc)'}
                  align={align}
                  style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
                />
                ) : (
                  subtitle
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: align === 'left' ? '1.2fr 0.8fr' : '1fr 2fr',
          gap: '48px',
          padding: '80px',
          alignItems: 'center',
          justifyItems: align === 'left' ? 'start' : 'stretch',
          background,
        }}
      >
        <div
          style={{
            fontSize: `${numberSize}px`,
            fontWeight: 700,
            color: numberColor,
            textAlign: align === 'left' ? 'left' : 'right',
            opacity: numberTransition.opacity,
            transform: numberTransition.transform || 'none',
          }}
        >
          {numberEffect ? (
            <TextEffectsComponent
              text={String(number)}
              cue={cue}
              frame={frame}
              fps={fps}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              effect={numberEffect}
              fontSize={numberSize}
              fontWeight={700}
              color={numberColor}
              align="right"
            />
          ) : (
            number
          )}
        </div>
          <div style={{ opacity: titleTransition.opacity, transform: titleTransition.transform || 'none' }}>
            {titleEffect ? (
            <TextEffectsComponent
              text={title}
              cue={cue}
              frame={frame}
              fps={fps}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              effect={titleEffect}
              fontSize={titleSize}
              fontWeight={700}
              color={'var(--color-text, #ffffff)'}
              align="left"
              lineHeight={1}
              style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
            />
            ) : (
            <div
              style={{
                fontSize: `${titleSize}px`,
                fontWeight: 700,
                color: 'var(--color-text, #ffffff)',
                textAlign: align === 'left' ? 'left' : 'left',
                lineHeight: 1,
              }}
            >
              {title}
            </div>
            )}
          {subtitle && (
            <div
              style={{
                fontSize: `${subtitleSize}px`,
                color: 'var(--color-text-muted, #cccccc)',
                marginTop: '16px',
              }}
            >
              {subtitleEffect ? (
                <TextEffectsComponent
                  text={subtitle}
                  cue={cue}
                  frame={frame}
                  fps={fps}
                  videoWidth={videoWidth}
                  videoHeight={videoHeight}
                  effect={subtitleEffect}
                  fontSize={subtitleSize}
                  fontWeight={400}
                  color={'var(--color-text-muted, #cccccc)'}
                  align="left"
                  style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
                />
              ) : (
                subtitle
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // inline
  if (!showNumber) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          padding: '80px',
          background,
        }}
      >
        <div
          style={{
            fontSize: `${titleSize}px`,
            fontWeight: 700,
            color: 'var(--color-text, #ffffff)',
            opacity: titleTransition.opacity,
            transform: titleTransition.transform || 'none',
            lineHeight: 1,
          }}
        >
          {titleEffect ? (
            <TextEffectsComponent
              text={title}
              cue={cue}
              frame={frame}
              fps={fps}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              effect={titleEffect}
              fontSize={titleSize}
              fontWeight={700}
              color={'var(--color-text, #ffffff)'}
              align={align}
              lineHeight={1}
              style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
            />
          ) : (
            title
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
          alignItems: 'center',
          justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        padding: '80px',
        background,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
        <span
          style={{
            fontSize: `${numberSize * 0.5}px`,
            fontWeight: 700,
            color: numberColor,
            opacity: numberTransition.opacity,
            transform: numberTransition.transform || 'none',
          }}
        >
          {numberEffect ? (
            <TextEffectsComponent
              text={`Chapter ${String(number)}:`}
              cue={cue}
              frame={frame}
              fps={fps}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              effect={numberEffect}
              fontSize={numberSize * 0.5}
              fontWeight={700}
              color={numberColor}
              align="left"
            />
          ) : (
            <>Chapter {number}:</>
          )}
        </span>
        <span
          style={{
            fontSize: `${titleSize}px`,
            fontWeight: 700,
            color: 'var(--color-text, #ffffff)',
            opacity: titleTransition.opacity,
            transform: titleTransition.transform || 'none',
            lineHeight: 1,
          }}
        >
          {titleEffect ? (
            <TextEffectsComponent
              text={title}
              cue={cue}
              frame={frame}
              fps={fps}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              effect={titleEffect}
              fontSize={titleSize}
              fontWeight={700}
              color={'var(--color-text, #ffffff)'}
              align="left"
              lineHeight={1}
              style={{ width: 'auto', height: 'auto', display: 'inline-block' }}
            />
          ) : (
            title
          )}
        </span>
      </div>
    </div>
  );
}
