import React from 'react';
import { interpolate, easeOutCubic } from '../../math.js';
import { easeOutBounce } from '../../animation/easing.js';

export type PointerStyle = 'arrow' | 'line' | 'elbow' | 'curved';

export type CalloutProps = {
  // Content
  text: string;

  // Pointer
  pointerTarget: { x: number; y: number };
  pointerStyle?: PointerStyle;
  pointerColor?: string;
  pointerWidth?: number;

  // Box positioning
  boxPosition?: { x: number; y: number };
  autoPosition?: 'left' | 'right' | 'above' | 'below' | 'auto';

  // Box Style
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  maxWidth?: number;

  // Typography
  fontSize?: number;
  textColor?: string;

  // Animation
  entrance?: 'grow' | 'fade' | 'draw' | 'pop';
  entranceDurationFrames?: number;

  startFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function CalloutComponent(props: CalloutProps) {
  const {
    text,
    pointerTarget,
    pointerStyle = 'line',
    pointerColor,
    pointerWidth = 2,
    boxPosition,
    autoPosition = 'auto',
    backgroundColor = 'rgba(0, 0, 0, 0.9)',
    borderColor = '#ffffff',
    borderWidth = 2,
    borderRadius = 8,
    padding = 16,
    maxWidth = 300,
    fontSize = 20,
    textColor = '#ffffff',
    entrance = 'draw',
    entranceDurationFrames = 30,
    startFrame = 0,
    frame = 0,
    videoWidth = 1920,
    videoHeight = 1080,
  } = props;

  const relativeFrame = frame - startFrame;
  const finalPointerColor = pointerColor || borderColor;

  if (relativeFrame < 0 || relativeFrame > entranceDurationFrames) {
    return null;
  }

  // Calculate box position
  let boxX: number;
  let boxY: number;

  if (boxPosition) {
    boxX = boxPosition.x;
    boxY = boxPosition.y;
  } else {
    // Auto-position based on target location
    const spacing = 50;
    if (autoPosition === 'auto') {
      // Place opposite to the quadrant of the target
      if (pointerTarget.x < videoWidth / 2 && pointerTarget.y < videoHeight / 2) {
        // Top-left quadrant -> box bottom-right
        boxX = pointerTarget.x + spacing;
        boxY = pointerTarget.y + spacing;
      } else if (pointerTarget.x >= videoWidth / 2 && pointerTarget.y < videoHeight / 2) {
        // Top-right quadrant -> box bottom-left
        boxX = pointerTarget.x - maxWidth - spacing;
        boxY = pointerTarget.y + spacing;
      } else if (pointerTarget.x < videoWidth / 2 && pointerTarget.y >= videoHeight / 2) {
        // Bottom-left quadrant -> box top-right
        boxX = pointerTarget.x + spacing;
        boxY = pointerTarget.y - 100 - spacing;
      } else {
        // Bottom-right quadrant -> box top-left
        boxX = pointerTarget.x - maxWidth - spacing;
        boxY = pointerTarget.y - 100 - spacing;
      }
    } else {
      if (autoPosition === 'left') {
        boxX = pointerTarget.x - maxWidth - spacing;
        boxY = pointerTarget.y - 50;
      } else if (autoPosition === 'right') {
        boxX = pointerTarget.x + spacing;
        boxY = pointerTarget.y - 50;
      } else if (autoPosition === 'above') {
        boxX = pointerTarget.x - maxWidth / 2;
        boxY = pointerTarget.y - 100 - spacing;
      } else {
        // below
        boxX = pointerTarget.x - maxWidth / 2;
        boxY = pointerTarget.y + spacing;
      }
    }
  }

  // Animation based on entrance style
  let lineProgress = 1;
  let boxScale = 1;
  let boxOpacity = 1;
  let textOpacity = 1;

  if (entrance === 'draw') {
    // Frames 0-15: Line draws
    lineProgress = Math.min(1, relativeFrame / 15);
    // Frames 10-25: Box scales up
    const boxStartFrame = 10;
    if (relativeFrame >= boxStartFrame) {
      const boxFrame = relativeFrame - boxStartFrame;
      boxScale = easeOutBounce(Math.min(1, boxFrame / 15));
      boxOpacity = Math.min(1, boxFrame / 15);
    } else {
      boxScale = 0;
      boxOpacity = 0;
    }
    // Frames 15-30: Text fades in
    textOpacity = relativeFrame < 15 ? 0 : interpolate(relativeFrame, [15, 30], [0, 1]);
  } else if (entrance === 'grow') {
    const progress = easeOutCubic(relativeFrame / entranceDurationFrames);
    lineProgress = progress;
    boxScale = progress;
    boxOpacity = progress;
    textOpacity = progress;
  } else if (entrance === 'fade') {
    const progress = easeOutCubic(relativeFrame / entranceDurationFrames);
    lineProgress = 1;
    boxScale = 1;
    boxOpacity = progress;
    textOpacity = progress;
  } else {
    // pop
    boxScale = easeOutBounce(relativeFrame / entranceDurationFrames);
    boxOpacity = Math.min(1, relativeFrame / (entranceDurationFrames * 0.5));
    textOpacity = boxOpacity;
    lineProgress = boxOpacity;
  }

  // Calculate line path
  const lineStartX = pointerTarget.x;
  const lineStartY = pointerTarget.y;
  const lineEndX = boxX + maxWidth / 2;
  const lineEndY = boxY + 50;

  const currentEndX = lineStartX + (lineEndX - lineStartX) * lineProgress;
  const currentEndY = lineStartY + (lineEndY - lineStartY) * lineProgress;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Pointer line */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${videoWidth} ${videoHeight}`}
      >
        {pointerStyle === 'line' && (
          <line
            x1={lineStartX}
            y1={lineStartY}
            x2={currentEndX}
            y2={currentEndY}
            stroke={finalPointerColor}
            strokeWidth={pointerWidth}
          />
        )}
        {pointerStyle === 'arrow' && (
          <>
            <line
              x1={lineStartX}
              y1={lineStartY}
              x2={currentEndX}
              y2={currentEndY}
              stroke={finalPointerColor}
              strokeWidth={pointerWidth}
            />
            {lineProgress > 0.9 && (
              <polygon
                points={`${lineStartX},${lineStartY - 8} ${lineStartX + 8},${lineStartY} ${lineStartX},${lineStartY + 8}`}
                fill={finalPointerColor}
              />
            )}
          </>
        )}
        {pointerStyle === 'elbow' && (
          <polyline
            points={`${lineStartX},${lineStartY} ${lineStartX},${currentEndY} ${currentEndX},${currentEndY}`}
            stroke={finalPointerColor}
            strokeWidth={pointerWidth}
            fill="none"
          />
        )}
      </svg>

      {/* Callout box */}
      <div
        style={{
          position: 'absolute',
          left: boxX,
          top: boxY,
          maxWidth: `${maxWidth}px`,
          background: backgroundColor,
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: `${borderRadius}px`,
          padding: `${padding}px`,
          transform: `scale(${boxScale})`,
          transformOrigin: 'center',
          opacity: boxOpacity,
        }}
      >
        <div style={{ fontSize: `${fontSize}px`, color: textColor, opacity: textOpacity }}>{text}</div>
      </div>
    </div>
  );
}
