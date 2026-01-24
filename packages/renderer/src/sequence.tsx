import React from "react";
import { RendererProvider, useRenderContext } from "./context.tsx";

export type SequenceProps = {
  from?: number;
  durationInFrames?: number;
  children: React.ReactNode;
};

export const Sequence = ({ from = 0, durationInFrames, children }: SequenceProps) => {
  const ctx = useRenderContext();
  const start = from;
  const end = durationInFrames == null ? ctx.config.durationFrames : start + durationInFrames;
  if (ctx.frame < start || ctx.frame >= end) {
    return null;
  }
  return (
    <RendererProvider frame={ctx.frame - start} config={ctx.config}>
      {children}
    </RendererProvider>
  );
};
