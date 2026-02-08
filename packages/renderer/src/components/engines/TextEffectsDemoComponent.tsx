import React from 'react';
import gsapImport from 'gsap';
import type { ScriptCue } from '../../shared.js';
import { TextEffectsComponent } from '../text/TextEffectsComponent.js';
import type { TextEffectConfig } from '../../engines/text-effects.js';

const gsap = (gsapImport as any).gsap ?? gsapImport;

export type TextEffectsDemoProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  cue?: ScriptCue;
};

const ROOT_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--color-bg, #101418)',
};

type EffectRow = {
  label: string;
  title: string;
  description: string;
  effect: TextEffectConfig['effect'];
  unit: TextEffectConfig['unit'];
  custom?: boolean;
  direction?: TextEffectConfig['direction'];
  color?: string;
  shimmerColorFrom?: string;
  shimmerColorTo?: string;
};

const EFFECT_ROWS: EffectRow[] = [
  {
    label: 'fade',
    title: 'Fade In',
    description: 'Gentle appearance with no motion.',
    effect: 'fade',
    unit: 'chars',
  },
  {
    label: 'fade_up',
    title: 'Fade Up',
    description: 'Lifted entrance for emphasis.',
    effect: 'fade',
    direction: 'up',
    unit: 'words',
  },
  {
    label: 'slide_left',
    title: 'Slide Left',
    description: 'Clean motion from the right.',
    effect: 'slide',
    direction: 'left',
    unit: 'chars',
  },
  {
    label: 'slide_right',
    title: 'Slide Right',
    description: 'Clean motion from the left.',
    effect: 'slide',
    direction: 'right',
    unit: 'chars',
  },
  {
    label: 'pop',
    title: 'Pop',
    description: 'Snappy scale punch.',
    effect: 'pop',
    unit: 'chars',
  },
  {
    label: 'shimmer',
    title: 'Shimmer',
    description: 'Polished highlight sweep.',
    effect: 'shimmer',
    unit: 'chars',
    shimmerColorFrom: 'var(--color-text, #f2f4f8)',
    shimmerColorTo: 'var(--color-text-strong, #ffffff)',
  },
  {
    label: 'custom',
    title: 'Custom (GSAP)',
    description: 'Build your own effect with any engine.',
    effect: 'fade',
    unit: 'chars',
    custom: true,
  },
];

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--color-surface, #1f2933)',
  borderRadius: 22,
  padding: '22px 26px',
  display: 'flex',
  alignItems: 'center',
  minHeight: 110,
};

const CardText = ({
  frame,
  fps,
  cue,
  title,
  description,
  effect,
  startFrame,
  color,
  shimmerColorTo,
  shimmerColorFrom,
}: {
  frame: number;
  fps: number;
  cue?: ScriptCue;
  title: string;
  description: string;
  effect: TextEffectConfig;
  startFrame: number;
  color?: string;
  shimmerColorTo?: string;
  shimmerColorFrom?: string;
}) => {
  const effectConfig: TextEffectConfig = {
    ...effect,
    start: { kind: 'frame', frame: startFrame },
    ...(shimmerColorFrom ? { shimmerColorFrom } : color ? { shimmerColorFrom: color } : {}),
    ...(shimmerColorTo ? { shimmerColorTo } : {}),
  };
  return (
    <div>
      <TextEffectsComponent
        text={title}
        effect={effectConfig}
        frame={frame}
        fps={fps}
        cue={cue}
        fontSize={36}
        fontWeight={700}
        align="left"
        color={color}
        fontFamily={'var(--font-headline, ui-sans-serif, system-ui, sans-serif)'}
        style={{ marginBottom: 6 }}
      />
      <TextEffectsComponent
        text={description}
        effect={{ ...effectConfig, start: { kind: 'frame', frame: startFrame + 6 } }}
        frame={frame}
        fps={fps}
        cue={cue}
        fontSize={20}
        fontWeight={500}
        color={'var(--color-text-muted, #9aa5b1)'}
        align="left"
        fontFamily={'var(--font-subhead, ui-sans-serif, system-ui, sans-serif)'}
      />
    </div>
  );
};

const scrambleText = (text: string, progress: number, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped >= 0.98) {
    return text;
  }
  const revealCount = Math.max(0, Math.ceil(text.length * clamped));
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? '';
    if (ch === ' ') {
      out += ' ';
      continue;
    }
    if (i < revealCount) {
      out += ch;
      continue;
    }
    const idx = (i * 7 + Math.floor(progress * 100)) % alphabet.length;
    out += alphabet[idx] ?? ch;
  }
  return out;
};

const CustomGsapCard = ({
  frame,
  fps,
  startFrame,
}: {
  frame: number;
  fps: number;
  startFrame: number;
}) => {
  const durationFrames = 36;
  const raw = (frame - startFrame) / durationFrames;
  const local = raw >= 1 ? 1 : Math.max(0, Math.min(1, raw));
  const ease = (gsap as any).parseEase ? (gsap as any).parseEase('power2.out') : (v: number) => v;
  const eased = ease(local);
  const pingPong = 1 - Math.sin(Math.PI * eased);
  const headline = scrambleText('Custom (GSAP)', pingPong);
  const subProgress = Math.max(0, Math.min(1, (pingPong - 0.2) / 0.8));
  const sub = scrambleText('Build your own effect with any engine.', subProgress);

  return (
    <div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--color-text, #f2f4f8)',
          letterSpacing: '-0.01em',
          fontFamily: 'var(--font-headline, ui-sans-serif, system-ui, sans-serif)',
        }}
      >
        {headline}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 20,
          fontWeight: 500,
          color: 'var(--color-text-muted, #9aa5b1)',
          fontFamily: 'var(--font-subhead, ui-sans-serif, system-ui, sans-serif)',
        }}
      >
        {sub}
      </div>
    </div>
  );
};

export function TextEffectsDemoComponent({
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
  cue,
}: TextEffectsDemoProps) {
  const rows = React.useMemo(() => {
    const baseStart = Math.round(fps * 0.3);
    const gap = Math.round(fps * 0.35);
    return EFFECT_ROWS.map((row, idx) => ({
      ...row,
      effectConfig: {
        effect: row.effect,
        unit: row.unit,
        direction: row.direction,
        shimmerColorFrom: row.shimmerColorFrom,
        shimmerColorTo: row.shimmerColorTo,
        start: { kind: 'frame', frame: baseStart + idx * gap },
        durationFrames: 22,
        staggerFrames: row.unit === 'words' ? 5 : 2,
        easing: 'easeOut',
      } satisfies TextEffectConfig,
      startFrame: baseStart + idx * gap,
      color: row.color,
      shimmerColorFrom: row.shimmerColorFrom,
    }));
  }, [fps]);

  const gridRows = React.useMemo(() => {
    const cardSpacing = 24;
    const columnWidth = Math.round((videoWidth - 260) / 2);
    return rows.map((row, idx) => {
      const col = idx % 2;
      const rowIndex = Math.floor(idx / 2);
      const left = 120 + col * (columnWidth + cardSpacing);
      const top = 260 + rowIndex * (120 + cardSpacing);
      const width = row.custom ? videoWidth - 240 : columnWidth;
      return {
        ...row,
        style: {
          position: 'absolute',
          left: row.custom ? 120 : left,
          top,
          width,
        } satisfies React.CSSProperties,
      };
    });
  }, [rows, videoWidth]);

  return (
    <div style={ROOT_STYLE}>
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 110,
          color: 'var(--color-text, #f2f4f8)',
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        Text effects menu
      </div>
      {gridRows.map((row) => (
        <div key={row.label} style={{ ...CARD_STYLE, ...(row.style || {}) }}>
          {row.custom ? (
            <CustomGsapCard frame={frame} fps={fps} startFrame={row.startFrame} />
          ) : (
            <CardText
              frame={frame}
              fps={fps}
              cue={cue}
              title={row.title}
              description={row.description}
              effect={row.effectConfig}
              startFrame={row.startFrame}
              color={row.color}
              shimmerColorFrom={row.shimmerColorFrom}
              shimmerColorTo={row.shimmerColorTo}
            />
          )}
        </div>
      ))}
    </div>
  );
}
