// Browser-safe exports
export * from "./math.ts";
export * from "./context.tsx";
export * from "./player.tsx";
export * from "./sequence.tsx";
export * from "./storyboard.tsx";
export * from "./ComposableRenderer.tsx";
export * from "./engines/index.ts";
export * from "./live-actions.ts";

// Server-only modules - import directly when needed:
// import { renderFramesToPng } from "@babulus/renderer/src/render.tsx";
// import { encodeVideo } from "@babulus/renderer/src/encode.ts";
// import { renderVideo } from "@babulus/renderer/src/pipeline.ts";
// import { renderStoryboard } from "@babulus/renderer/src/storyboard-render.ts";
// import { toolchain } from "@babulus/renderer/src/toolchain.ts";
// import { renderStoryboardFramesPng } from "@babulus/renderer/src/storyboard-frames-png.ts";
// import { renderFramesToHtml } from "@babulus/renderer/src/storyboard-frames.ts";
