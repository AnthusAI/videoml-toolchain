import React, { createContext, useContext, useMemo } from "react";
import { frameToTimeMs } from "./math.ts";

export type VideoConfig = {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
};

export type RenderContext = {
  frame: number;
  fps: number;
  timeMs: number;
  config: VideoConfig;
};

export const RendererContext = createContext<RenderContext | null>(null);

export type RendererProviderProps = {
  frame: number;
  config: VideoConfig;
  children: React.ReactNode;
};

export const RendererProvider = ({ frame, config, children }: RendererProviderProps) => {
  const value = useMemo(
    () => ({
      frame,
      fps: config.fps,
      timeMs: frameToTimeMs(frame, config.fps),
      config,
    }),
    [frame, config],
  );
  return <RendererContext.Provider value={value}>{children}</RendererContext.Provider>;
};

export const useRenderContext = (): RenderContext => {
  const ctx = useContext(RendererContext);
  if (!ctx) {
    throw new Error("useRenderContext must be used within a RendererProvider.");
  }
  return ctx;
};

export const useCurrentFrame = (): number => useRenderContext().frame;

export const useVideoConfig = (): VideoConfig => useRenderContext().config;
