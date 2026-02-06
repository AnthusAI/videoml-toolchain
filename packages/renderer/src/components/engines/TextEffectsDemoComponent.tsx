import React from 'react';
import type { ScriptCue } from '../../shared.ts';
import { TextEffectsComponent } from '../text/TextEffectsComponent.js';
import type { TextEffectConfig } from '../../engines/text-effects.js';

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

const TITLE_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 110,
  right: 110,
  top: 120,
};

type EffectRow = {
  label: string;
  effect: TextEffectConfig['effect'];
  unit: TextEffectConfig['unit'];
};

const EFFECT_ROWS: EffectRow[] = [
  { label: 'fade', effect: 'fade', unit: 'chars' },
  { label: 'fade_up', effect: 'fade_up', unit: 'words' },
  { label: 'fade_down', effect: 'fade_down', unit: 'words' },
  { label: 'slide_left', effect: 'slide_left', unit: 'chars' },
  { label: 'slide_right', effect: 'slide_right', unit: 'chars' },
  { label: 'pop', effect: 'pop', unit: 'chars' },
  { label: 'scale_in', effect: 'scale_in', unit: 'chars' },
];

export function TextEffectsDemoComponent({
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
  cue,
}: TextEffectsDemoProps) {
  const titleEffect = React.useMemo<TextEffectConfig>(
    () => ({
      effect: 'fade_up',
      unit: 'words',
      start: { kind: 'frame', frame: 0 },
      durationFrames: 20,
      staggerFrames: 4,
      easing: 'easeOut',
    }),
    [],
  );

  const rows = React.useMemo(() => {
    const baseStart = Math.round(fps * 0.4);
    const gap = Math.round(fps * 0.35);
    return EFFECT_ROWS.map((row, idx) => ({
      ...row,
      effectConfig: {
        effect: row.effect,
        unit: row.unit,
        start: { kind: 'frame', frame: baseStart + idx * gap },
        durationFrames: 22,
        staggerFrames: row.unit === 'words' ? 5 : 2,
        easing: 'easeOut',
      } satisfies TextEffectConfig,
      style: {
        position: 'absolute',
        left: 110,
        right: 110,
        top: 260 + idx * 70,
      } satisfies React.CSSProperties,
    }));
  }, [fps]);

  return (
    <div style={ROOT_STYLE}>
      <TextEffectsComponent
        text={'Curated text effects'}
        effect={titleEffect}
        frame={frame}
        fps={fps}
        videoWidth={videoWidth}
        videoHeight={videoHeight}
        cue={cue}
        fontSize={72}
        align="left"
        style={TITLE_STYLE}
      />
      {rows.map((row, idx) => (
        <TextEffectsComponent
          key={row.label}
          text={`${row.label} · frame-driven motion`}
          effect={row.effectConfig}
          frame={frame}
          fps={fps}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          cue={cue}
          fontSize={44}
          fontWeight={600}
          color={'var(--color-text, #f2f4f8)'}
          align="left"
          style={row.style}
        />
      ))}
    </div>
  );
}
