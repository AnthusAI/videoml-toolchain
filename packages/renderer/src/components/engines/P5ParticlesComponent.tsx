import type p5 from 'p5';
import { P5SketchBase, type P5SketchProps } from '../../engines/P5SketchBase.js';
import { resolveCssVar } from '../../engines/utils.js';

export type P5ParticlesProps = P5SketchProps & {
  particleCount?: number;
  radius?: number;
};

export class P5ParticlesComponent extends P5SketchBase<P5ParticlesProps> {
  static defaultProps = {
    dataEngine: 'p5',
  };

  protected drawFrame(sketch: p5, frame: number, fps: number, size: { width: number; height: number }): void {
    const count = this.props.particleCount ?? 28;
    const radius = this.props.radius ?? 10;
    const bg = resolveCssVar(this.containerRef.current, '--color-bg', '#101418');
    const accent = resolveCssVar(this.containerRef.current, '--color-accent', '#4f46e5');
    const accent2 = resolveCssVar(this.containerRef.current, '--color-accent-2', '#3b82f6');
    const muted = resolveCssVar(this.containerRef.current, '--color-surface', '#1f2933');
    const surfaceStrong = resolveCssVar(this.containerRef.current, '--color-surface-strong', '#2a333b');

    sketch.background(bg as any);
    sketch.noStroke();

    const time = frame / Math.max(1, fps);
    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const baseRadius = Math.min(size.width, size.height) * 0.18;

    for (let i = 0; i < count; i += 1) {
      const angle = time * 0.9 + i * 0.35;
      const offset = baseRadius + (i % 6) * 18;
      const x = centerX + Math.cos(angle) * offset;
      const y = centerY + Math.sin(angle * 1.2) * offset * 0.7;
      const alpha = 255 - (i % 7) * 10;
      const accentColor = sketch.color((i % 2 === 0 ? accent : accent2) as any);
      accentColor.setAlpha(alpha);
      sketch.fill(accentColor);
      sketch.circle(x, y, radius + (i % 5));
    }

    sketch.fill(surfaceStrong as any);
    sketch.rectMode(sketch.CENTER);
    sketch.rect(centerX, centerY, baseRadius * 0.9, baseRadius * 0.4, 12);

    sketch.fill(muted as any);
    sketch.rect(centerX, centerY, baseRadius * 0.62, baseRadius * 0.18, 12);
  }
}
