import React from 'react';
import { KineticTextBase, type KineticTextOptions } from '../../engines/KineticTextBase.js';

export type KineticTextComponentProps = {
  text: string;
  mode?: KineticTextOptions['mode'];
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  color?: string;
  muted?: string;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export class KineticTextComponent extends KineticTextBase<KineticTextComponentProps> {
  render() {
    const {
      text,
      mode = 'letters',
      startFrame = 0,
      staggerFrames = 2,
      fontSize = 64,
      color = 'var(--color-text, #f2f4f8)',
      muted = 'var(--color-text-muted, #9aa5b1)',
    } = this.props;

    const visibleText = this.buildVisibleText(text, { mode, startFrame, staggerFrames });

    return (
      <div
        data-engine="text"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        <div style={{ position: 'relative' }}>
          <span style={{ color: muted }}>{text}</span>
          <span
            style={{
              color,
              position: 'absolute',
              left: 0,
              top: 0,
              whiteSpace: 'pre',
            }}
          >
            {visibleText}
          </span>
        </div>
      </div>
    );
  }
}
