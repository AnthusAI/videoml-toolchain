'use client';

/**
 * Browser-compatible context providers for frame and video config.
 *
 * These providers allow ComposableRenderer to work in the browser without Remotion.
 * In a Remotion environment, use Remotion's native providers instead.
 */

import React, { createContext, useContext } from 'react';

export type VideoConfig = {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
};

const VideoConfigContext = createContext<VideoConfig | null>(null);
const FrameContext = createContext<number>(0);

/**
 * Provides video configuration (fps, dimensions, duration) to child components.
 *
 * Usage:
 * ```tsx
 * <VideoConfigProvider config={{ fps: 30, width: 1280, height: 720, durationFrames: 300 }}>
 *   <YourComponent />
 * </VideoConfigProvider>
 * ```
 */
export function VideoConfigProvider({
  config,
  children
}: {
  config: VideoConfig;
  children: React.ReactNode;
}) {
  return (
    <VideoConfigContext.Provider value={config}>
      {children}
    </VideoConfigContext.Provider>
  );
}

/**
 * Provides the current frame number to child components.
 *
 * Usage:
 * ```tsx
 * <FrameProvider frame={currentFrame}>
 *   <YourComponent />
 * </FrameProvider>
 * ```
 */
export function FrameProvider({
  frame,
  children
}: {
  frame: number;
  children: React.ReactNode;
}) {
  return (
    <FrameContext.Provider value={frame}>
      {children}
    </FrameContext.Provider>
  );
}

/**
 * Hook to access video configuration from context.
 *
 * @throws Error if used outside VideoConfigProvider
 */
export function useVideoConfig(): VideoConfig {
  const config = useContext(VideoConfigContext);
  if (!config) {
    throw new Error('useVideoConfig must be used within VideoConfigProvider');
  }
  return config;
}

/**
 * Hook to access current frame from context.
 *
 * @returns Current frame number (0 if used outside FrameProvider)
 */
export function useCurrentFrame(): number {
  return useContext(FrameContext);
}
