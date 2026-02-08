import type { Video, VideoStatus } from "./index.js";

export type { VideoStatus };

const VIDEO_STATUS_TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  draft: ["generating", "error"],
  generating: ["ready", "error"],
  ready: ["rendering", "published", "error"],
  rendering: ["published", "error"],
  published: ["error"],
  error: ["draft", "generating"],
};

export const canTransitionVideoStatus = (from: VideoStatus, to: VideoStatus): boolean => {
  if (from === to) {
    return true;
  }
  return VIDEO_STATUS_TRANSITIONS[from].includes(to);
};

export const transitionVideoStatus = (from: VideoStatus, to: VideoStatus): VideoStatus => {
  if (!canTransitionVideoStatus(from, to)) {
    throw new Error(`Invalid video status transition: ${from} -> ${to}`);
  }
  return to;
};

export const updateVideoStatus = (video: Video, nextStatus: VideoStatus): Video => {
  return {
    ...video,
    status: transitionVideoStatus(video.status, nextStatus),
  };
};
