export * from "./dsl/index.js";

export {
  loadConfig,
  findConfigPath,
  findProjectRoot,
  getDefaultMusicProvider,
  getDefaultProvider,
  getDefaultSfxProvider,
  getProviderConfig,
  type Config,
} from "./config.js";

export { BabulusError, ParseError, CompileError } from "./errors.js";

export { loadVideoFile } from "./dsl/load.js";
export type { CompositionSpec, VideoFileSpec } from "./dsl/types.js";

export { generateComposition, type GenerateOptions, type GeneratedArtifact } from "./generate.js";

export { renderVideoFromScript } from "../packages/renderer/src/video-render.js";
export type { ScriptData } from "../packages/shared/src/video.js";
export type { TimelineData } from "../packages/shared/src/timeline.js";
