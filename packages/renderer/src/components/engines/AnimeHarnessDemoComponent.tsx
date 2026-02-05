import React from 'react';
import { AnimeJsBase, type AnimeJsBaseProps } from '../../engines/AnimeJsBase.js';

export type AnimeHarnessDemoProps = AnimeJsBaseProps & {
  accent?: string;
  surface?: string;
  showBackground?: boolean;
};

export class AnimeHarnessDemoComponent extends AnimeJsBase<AnimeHarnessDemoProps> {
  protected renderContent(): React.ReactNode {
    const showBackground = this.props.showBackground ?? true;
    const { videoWidth = 1920, videoHeight = 1080 } = this.props;
    // Scale the demo surface to fit the video frame (keeps it readable on docs previews).
    const baseW = 520;
    const baseH = 360;
    const scale = Math.max(0.5, Math.min(1.8, Math.min(videoWidth / baseW, videoHeight / baseH) * 0.72));
    // SSR-safe static DOM. Anime targets these by class.
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background: showBackground ? 'var(--color-bg, #101418)' : 'transparent',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: baseW,
            height: baseH,
            transform: `scale(${scale})`,
            transformOrigin: 'center',
          }}
        >
          <div
            className="anime-surface"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 28,
              background: 'var(--color-surface, #1f2933)',
            }}
          />
          <div
            className="anime-dot a"
            style={{
              position: 'absolute',
              width: 86,
              height: 86,
              borderRadius: 999,
              background: 'var(--color-accent, #4f46e5)',
              left: 68,
              top: 64,
            }}
          />
          <div
            className="anime-dot b"
            style={{
              position: 'absolute',
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'var(--color-accent-2, #3b82f6)',
              right: 72,
              bottom: 78,
            }}
          />
          <div
            className="anime-bar"
            style={{
              position: 'absolute',
              left: 56,
              right: 56,
              bottom: 44,
              height: 14,
              borderRadius: 999,
              background: 'var(--color-muted, #2a333b)',
              transformOrigin: 'left center',
            }}
          />
        </div>
      </div>
    );
  }

  protected buildTimeline({ anime, root, fps }: { anime: any; root: HTMLElement; fps: number }): any {
    const cycleMs = (180 / fps) * 1000;
    const dotA = Array.from(root.querySelectorAll('.anime-dot.a'));
    const dotB = Array.from(root.querySelectorAll('.anime-dot.b'));
    const bar = Array.from(root.querySelectorAll('.anime-bar'));
    if (!dotA.length || !dotB.length || !bar.length) {
      // eslint-disable-next-line no-console
      console.warn('[AnimeHarnessDemo] Missing targets', { dotA: dotA.length, dotB: dotB.length, bar: bar.length });
    }
    const tl = anime.createTimeline({
      autoplay: false,
      defaults: { easing: 'easeInOutQuad' },
    });

    // Anime.js v4 Timeline.add signature: add(targets, params, position?)
    tl.add(
      dotA,
      {
        translateX: [0, 220],
        translateY: [0, 120],
        scale: [1, 1.15],
        duration: cycleMs,
      },
      0,
    );

    tl.add(
      dotB,
      {
        translateX: [0, -220],
        translateY: [0, -120],
        rotate: [0, 90],
        duration: cycleMs,
      },
      0,
    );

    tl.add(
      bar,
      {
        scaleX: [0.2, 1],
        opacity: [0.5, 1],
        duration: cycleMs,
      },
      0,
    );

    return tl;
  }
}
