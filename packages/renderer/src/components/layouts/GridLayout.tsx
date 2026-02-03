import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { staggeredProgress, type StaggerPattern } from '../../animation/stagger.js';
import { reviveNode } from '../rehydrate.js';

export type GridLayoutProps = {
  // Content
  items: React.ReactNode[];

  // Grid structure
  columns: number;
  rows?: number;
  gap?: number;
  padding?: number;

  // Item sizing
  itemAspectRatio?: number;

  // Animation
  staggerPattern?: StaggerPattern;
  staggerDelayFrames?: number;
  itemEntrance?: TransitionConfig;
  itemDurationFrames?: number;

  entranceStartFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function GridLayout(props: GridLayoutProps) {
  const {
    items,
    columns,
    rows,
    gap = 24,
    padding = 80,
    itemAspectRatio,
    staggerPattern = 'row',
    staggerDelayFrames = 5,
    itemEntrance,
    itemDurationFrames = 20,
    entranceStartFrame = 0,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
    videoHeight = 1080,
  } = props;

  // Calculate rows if not specified
  const actualRows = rows || Math.ceil(items.length / columns);

  // Default entrance animation
  const defaultEntrance: TransitionConfig = {
    type: 'scale',
    from: 0.8,
    to: 1,
    durationFrames: itemDurationFrames,
  };

  const entranceConfig = itemEntrance || defaultEntrance;
  const entranceFrame = frame - entranceStartFrame;

  // Calculate stagger order based on pattern
  const getStaggerIndex = (index: number): number => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    switch (staggerPattern) {
      case 'linear':
        return index;
      case 'reverse':
        return items.length - 1 - index;
      case 'from-center': {
        const centerRow = (actualRows - 1) / 2;
        const centerCol = (columns - 1) / 2;
        return Math.abs(row - centerRow) + Math.abs(col - centerCol);
      }
      case 'from-edges': {
        const centerRow = (actualRows - 1) / 2;
        const centerCol = (columns - 1) / 2;
        const maxDist = Math.max(centerRow, centerCol);
        const dist = Math.abs(row - centerRow) + Math.abs(col - centerCol);
        return maxDist - dist;
      }
      case 'row':
        return row * columns + col;
      case 'column':
        return col * actualRows + row;
      case 'diagonal':
        return row + col;
      case 'spiral':
        // Simplified spiral: distance from edges
        const minDistToEdge = Math.min(row, col, actualRows - 1 - row, columns - 1 - col);
        return minDistToEdge * (columns + actualRows) + (row + col);
      case 'random':
        // For random, use seeded approach (simplified here)
        return ((index * 7) + 13) % items.length;
      default:
        return index;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        padding: `${padding}px`,
      }}
    >
      {items.map((item, index) => {
        const staggerIndex = getStaggerIndex(index);
        const progress = staggeredProgress(staggerIndex, entranceFrame, {
          count: items.length,
          delayFrames: staggerDelayFrames,
          durationFrames: itemDurationFrames,
        });

        // Apply transition based on progress
        let transition = { opacity: 1, transform: 'none' };
        if (progress < 1) {
          const itemFrame = progress * itemDurationFrames;
          const t = applyTransition(entranceConfig, itemFrame, { fps, width: videoWidth, height: videoHeight });
          transition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
        }

        return (
          <div
            key={index}
            style={{
              opacity: transition.opacity,
              transform: transition.transform || 'none',
              aspectRatio: itemAspectRatio ? `${itemAspectRatio}` : undefined,
            }}
          >
            {reviveNode(item)}
          </div>
        );
      })}
    </div>
  );
}
