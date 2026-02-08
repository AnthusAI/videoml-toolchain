// Browser-safe exports
export * from "./math.js";
export * from "./context.js";
export * from "./player.js";
export * from "./sequence.js";
export * from "./storyboard.js";
export * from "./ComposableRenderer.js";
export * from "./engines/index.js";
export * from "./live-actions.js";

// Server-only modules - import directly when needed:
// import { renderFramesToPng } from "@babulus/renderer/src/render.js";
// import { encodeVideo } from "@babulus/renderer/src/encode.js";
// import { renderVideo } from "@babulus/renderer/src/pipeline.js";
// import { renderStoryboard } from "@babulus/renderer/src/storyboard-render.js";
// import { toolchain } from "@babulus/renderer/src/toolchain.js";
// import { renderStoryboardFramesPng } from "@babulus/renderer/src/storyboard-frames-png.js";
// import { renderFramesToHtml } from "@babulus/renderer/src/storyboard-frames.js";
