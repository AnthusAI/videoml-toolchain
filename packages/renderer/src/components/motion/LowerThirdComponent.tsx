import React from 'react';
import { interpolate, easeOutCubic } from '../../math.js';

export type LowerThirdStyle = 'minimal' | 'corporate' | 'broadcast' | 'modern';

export type LowerThirdProps = {
  // Content
  name: string;
  title?: string;
  organization?: string;

  // Visual Style
  style?: LowerThirdStyle;

  // Colors
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;

  // Position
  position?: {
    x?: number;
    y?: number;
  };
  maxWidth?: number;

  // Animation Timing (in frames)
  entranceFrames?: number;
  holdFrames?: number;
  exitFrames?: number;

  // Animation Style
  entrance?: 'slide' | 'reveal' | 'typewriter' | 'spring';
  exit?: 'slide' | 'fade' | 'collapse';

  // When to start
  startFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function LowerThirdComponent(props: LowerThirdProps) {
  const {
    name,
    title,
    organization,
    style = 'modern',
    primaryColor = '#0066cc',
    textColor = '#ffffff',
    backgroundColor = 'rgba(0, 0, 0, 0.85)',
    position = {},
    maxWidth = 600,
    entranceFrames = 20,
    holdFrames = 90,
    exitFrames = 15,
    entrance = 'slide',
    exit: exitStyle = 'slide',
    startFrame = 0,
    frame = 0,
    videoHeight = 1080,
  } = props;

  const relativeFrame = frame - startFrame;
  const x = position.x ?? 80;
  const y = position.y ?? videoHeight - 180;

  // Phase calculation
  let phase: 'entrance' | 'hold' | 'exit' | 'hidden';
  let phaseProgress = 0;

  if (relativeFrame < 0) {
    phase = 'hidden';
  } else if (relativeFrame < entranceFrames) {
    phase = 'entrance';
    phaseProgress = relativeFrame / entranceFrames;
  } else if (relativeFrame < entranceFrames + holdFrames) {
    phase = 'hold';
    phaseProgress = 1;
  } else if (relativeFrame < entranceFrames + holdFrames + exitFrames) {
    phase = 'exit';
    phaseProgress = 1 - (relativeFrame - entranceFrames - holdFrames) / exitFrames;
  } else {
    phase = 'hidden';
  }

  if (phase === 'hidden') {
    return null;
  }

  // Apply easing
  const easedProgress = easeOutCubic(phaseProgress);

  // Calculate animation values based on entrance/exit style
  let accentProgress = 1;
  let bgOffset = 0;
  let bgOpacity = 1;
  let textOpacity = 1;

  if (phase === 'entrance') {
    if (entrance === 'slide') {
      // Frames 0-10: Accent bar slides in
      accentProgress = Math.min(1, (relativeFrame / 10) * 1.5);
      // Frames 5-15: Background bar expands
      bgOffset = relativeFrame < 5 ? -100 : interpolate(relativeFrame, [5, 15], [-100, 0]);
      bgOpacity = relativeFrame < 5 ? 0 : interpolate(relativeFrame, [5, 15], [0, 1]);
      // Frames 10-20: Text fades in
      textOpacity = relativeFrame < 10 ? 0 : interpolate(relativeFrame, [10, 20], [0, 1]);
    } else {
      accentProgress = easedProgress;
      bgOpacity = easedProgress;
      textOpacity = easedProgress;
    }
  } else if (phase === 'exit') {
    if (exitStyle === 'fade') {
      bgOpacity = easedProgress;
      textOpacity = easedProgress;
      accentProgress = easedProgress;
    } else if (exitStyle === 'slide') {
      const exitFrame = relativeFrame - entranceFrames - holdFrames;
      bgOffset = interpolate(exitFrame, [0, exitFrames], [0, -100]);
      bgOpacity = easedProgress;
      textOpacity = easedProgress;
      accentProgress = easedProgress;
    }
  }

  // Render based on style preset
  if (style === 'modern') {
    return (
      <div style={{ position: 'absolute', left: x, top: y }}>
        {/* Accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: 4,
            height: '100%',
            background: primaryColor,
            transform: `scaleY(${accentProgress})`,
            transformOrigin: 'top',
          }}
        />
        {/* Background */}
        <div
          style={{
            background: backgroundColor,
            borderRadius: '0 8px 8px 0',
            padding: '16px 24px 16px 20px',
            transform: `translateX(${bgOffset}px)`,
            opacity: bgOpacity,
            maxWidth: `${maxWidth}px`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600, color: textColor, opacity: textOpacity }}>{name}</div>
          {title && <div style={{ fontSize: 18, color: '#cccccc', marginTop: 4, opacity: textOpacity }}>{title}</div>}
          {organization && <div style={{ fontSize: 14, color: '#999999', marginTop: 2, opacity: textOpacity }}>{organization}</div>}
        </div>
      </div>
    );
  }

  if (style === 'minimal') {
    return (
      <div style={{ position: 'absolute', left: x, top: y, maxWidth: `${maxWidth}px`, opacity: bgOpacity }}>
        <div style={{ borderLeft: `2px solid ${primaryColor}`, paddingLeft: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: textColor, opacity: textOpacity }}>{name}</div>
          {title && <div style={{ fontSize: 18, color: '#cccccc', marginTop: 4, opacity: textOpacity }}>{title}</div>}
        </div>
      </div>
    );
  }

  // Default: corporate style
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <div
        style={{
          background: primaryColor,
          padding: '12px 24px',
          maxWidth: `${maxWidth}px`,
          opacity: bgOpacity,
          transform: `translateX(${bgOffset}px)`,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, color: textColor, opacity: textOpacity }}>{name}</div>
        {title && <div style={{ fontSize: 18, color: textColor, marginTop: 4, opacity: textOpacity, fontWeight: 300 }}>{title}</div>}
      </div>
    </div>
  );
}
