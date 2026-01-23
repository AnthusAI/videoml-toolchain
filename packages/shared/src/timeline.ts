export type TimelineClip = {
  id?: string;
  kind?: string;
  startSec?: number;
  durationSec?: number;
  chosen?: { durationSec?: number };
};

export type TimelineTrack = {
  id?: string;
  kind?: string;
  clips?: TimelineClip[];
};

export type TimelineData = {
  audio?: { tracks?: TimelineTrack[] };
};

export type TimelineSummary = {
  trackCount: number;
  clipCount: number;
  durationSec: number;
};

export type TimelineClipLayout = {
  id: string | null;
  kind: string | null;
  range: TimelineClipRange;
  leftPct: number;
  widthPct: number;
};

export type TimelineTrackLayout = {
  id: string | null;
  kind: string | null;
  clips: TimelineClipLayout[];
};

export type TimelineClipRange = {
  startSec: number;
  durationSec: number;
  endSec: number;
};

export type ActiveClip = {
  trackId: string | null;
  trackKind: string | null;
  clip: TimelineClip;
  range: TimelineClipRange;
};

export const getTimelineTracks = (timeline?: TimelineData | null): TimelineTrack[] =>
  timeline?.audio?.tracks ?? [];

export const getClipRange = (clip: TimelineClip): TimelineClipRange => {
  const startSec = Math.max(0, clip.startSec ?? 0);
  const durationSec = Math.max(0, clip.durationSec ?? clip.chosen?.durationSec ?? 0);
  return { startSec, durationSec, endSec: startSec + durationSec };
};

export const summarizeTimeline = (timeline?: TimelineData | null): TimelineSummary => {
  const tracks = getTimelineTracks(timeline);
  let clipCount = 0;
  let maxEnd = 0;
  for (const track of tracks) {
    for (const clip of track.clips ?? []) {
      clipCount += 1;
      const { endSec } = getClipRange(clip);
      if (endSec > maxEnd) {
        maxEnd = endSec;
      }
    }
  }
  return { trackCount: tracks.length, clipCount, durationSec: maxEnd };
};

export const getActiveClips = (timeline: TimelineData | null | undefined, timeSec: number): ActiveClip[] => {
  if (!Number.isFinite(timeSec)) {
    return [];
  }
  const tracks = getTimelineTracks(timeline);
  const active: ActiveClip[] = [];
  for (const track of tracks) {
    for (const clip of track.clips ?? []) {
      const range = getClipRange(clip);
      if (range.durationSec <= 0) {
        continue;
      }
      if (timeSec >= range.startSec && timeSec < range.endSec) {
        active.push({
          trackId: track.id ?? null,
          trackKind: track.kind ?? null,
          clip,
          range,
        });
      }
    }
  }
  return active;
};

export const buildTimelineLayout = (
  timeline: TimelineData | null | undefined,
  durationSec?: number,
): TimelineTrackLayout[] => {
  const tracks = getTimelineTracks(timeline);
  const totalDuration = Math.max(0.0001, durationSec ?? summarizeTimeline(timeline).durationSec);
  return tracks.map((track) => {
    const clips = (track.clips ?? [])
      .map((clip) => {
        const range = getClipRange(clip);
        if (range.durationSec <= 0) {
          return null;
        }
        const leftPct = Math.min(100, Math.max(0, (range.startSec / totalDuration) * 100));
        const widthPct = Math.min(100, Math.max(0, (range.durationSec / totalDuration) * 100));
        return {
          id: clip.id ?? null,
          kind: clip.kind ?? null,
          range,
          leftPct,
          widthPct,
        };
      })
      .filter((clip): clip is TimelineClipLayout => Boolean(clip));
    return { id: track.id ?? null, kind: track.kind ?? null, clips };
  });
};
