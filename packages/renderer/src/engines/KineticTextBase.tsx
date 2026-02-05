import React from 'react';
import { clamp01 } from './utils.js';

export type KineticTextMode = 'letters' | 'words';

export type KineticTextOptions = {
  mode?: KineticTextMode;
  startFrame?: number;
  staggerFrames?: number;
  maxProgress?: number;
};

export type KineticTextProps = {
  text: string;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

type TextSegment = { raw: string; display: string };

export abstract class KineticTextBase<P extends KineticTextProps = KineticTextProps> extends React.Component<P> {
  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected splitText(text: string, mode: KineticTextMode): TextSegment[] {
    if (mode === 'words') {
      return text.split(/(\s+)/).filter(Boolean).map((word) => ({ raw: word, display: word }));
    }
    return Array.from(text).map((char) => ({ raw: char, display: char }));
  }

  protected getVisibleCount(text: string, options?: KineticTextOptions): number {
    const mode = options?.mode ?? 'letters';
    const segments = this.splitText(text, mode);
    const startFrame = options?.startFrame ?? 0;
    const staggerFrames = Math.max(1, options?.staggerFrames ?? 2);
    const frame = this.getFrame();
    const progress = (frame - startFrame) / staggerFrames;
    const count = Math.floor(progress);
    return Math.max(0, Math.min(segments.length, count));
  }

  protected buildVisibleText(text: string, options?: KineticTextOptions): string {
    const mode = options?.mode ?? 'letters';
    const segments = this.splitText(text, mode);
    const visibleCount = this.getVisibleCount(text, options);
    return segments.slice(0, visibleCount).map((seg) => seg.display).join('');
  }

  protected getProgress(text: string, options?: KineticTextOptions): number {
    const mode = options?.mode ?? 'letters';
    const segments = this.splitText(text, mode);
    const count = segments.length || 1;
    const visibleCount = this.getVisibleCount(text, options);
    const maxProgress = options?.maxProgress ?? 1;
    return clamp01((visibleCount / count) * maxProgress);
  }

  render(): React.ReactNode {
    return null;
  }
}
