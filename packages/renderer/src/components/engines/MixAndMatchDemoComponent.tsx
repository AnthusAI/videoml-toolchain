import React from 'react';
import { P5ParticlesComponent } from './P5ParticlesComponent.js';
import { D3BarChartComponent } from './D3BarChartComponent.js';
import { ThreeOrbitComponent } from './ThreeOrbitComponent.js';
import { FramerMotionDemoComponent } from './FramerMotionDemoComponent.js';
import { AnimeHarnessDemoComponent } from './AnimeHarnessDemoComponent.js';
import { TextEffectsComponent } from '../text/TextEffectsComponent.js';

export type MixAndMatchDemoProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function MixAndMatchDemoComponent({
  frame = 0,
  fps = 30,
  videoWidth = 1920,
  videoHeight = 1080,
}: MixAndMatchDemoProps) {
  const cardRadius = 28;
  const cardPadding = 18;
  const cardBg = 'var(--color-surface, #1f2933)';
  const cardText = 'var(--color-text, #f2f4f8)';
  const cardMuted = 'var(--color-text-muted, #9aa5b1)';

  const cardShadowless: React.CSSProperties = {
    background: cardBg,
    borderRadius: cardRadius,
    padding: cardPadding,
  };

  return (
    <div
      data-engine="mix"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: 'var(--color-bg, #101418)',
      }}
    >
      {/* Generative background (p5) */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <P5ParticlesComponent
          frame={frame}
          fps={fps}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          particleCount={36}
          radius={10}
        />
      </div>

      {/* Top row cards */}
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 64,
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.75fr',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        {/* D3 card */}
        <div style={{ ...cardShadowless, position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: cardMuted, fontSize: 12, letterSpacing: '0.2em', fontWeight: 700 }}>
            D3
          </div>
          <div style={{ color: cardText, fontSize: 18, fontWeight: 700, marginTop: 6 }}>
            Data-driven animation
          </div>
          <div style={{ position: 'relative', height: 340, marginTop: 14 }}>
            <D3BarChartComponent
              frame={frame}
              fps={fps}
              videoWidth={900}
              videoHeight={420}
              showBackground={false}
              padding={90}
              barRadius={16}
            />
          </div>
        </div>

        {/* Three card */}
        <div style={{ ...cardShadowless, position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: cardMuted, fontSize: 12, letterSpacing: '0.2em', fontWeight: 700 }}>
            THREE
          </div>
          <div style={{ color: cardText, fontSize: 18, fontWeight: 700, marginTop: 6 }}>
            Spatial layer
          </div>
          <div style={{ position: 'relative', height: 340, marginTop: 14 }}>
            <ThreeOrbitComponent
              frame={frame}
              fps={fps}
              videoWidth={520}
              videoHeight={420}
              cubeSize={120}
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Framer Motion accent layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <FramerMotionDemoComponent
          frame={frame}
          fps={fps}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          size={180}
          showBackground={false}
          surface={'var(--color-surface-strong, #2a333b)'}
        />
      </div>

      {/* Anime.js accent vignette */}
      <div style={{ position: 'absolute', right: 64, bottom: 64, width: 520, height: 360, pointerEvents: 'none' }}>
        <AnimeHarnessDemoComponent
          frame={frame}
          fps={fps}
          videoWidth={520}
          videoHeight={360}
          showBackground={false}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Kinetic text overlay */}
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 80 }}>
        <TextEffectsComponent
          text={'Mix and match engines in one scene.'}
          effect={{
            effect: 'slide_left',
            unit: 'words',
            start: { kind: 'frame', frame: Math.round(fps * 0.6) },
            durationFrames: 26,
            staggerFrames: 6,
            easing: 'easeOut',
          }}
          frame={frame}
          fps={fps}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          fontSize={52}
          align="left"
          color={'var(--color-text, #f2f4f8)'}
        />
      </div>
    </div>
  );
}
