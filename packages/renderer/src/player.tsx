import React, { useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "./math.js";
import { RendererProvider, type VideoConfig } from "./context.js";

export type PlayerProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  component: React.ComponentType<T>;
  config: VideoConfig;
  inputProps?: T;
  initialFrame?: number;
  frame?: number;
  onFrameChange?: (frame: number) => void;
  autoplay?: boolean;
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  clock?: "internal" | "external";
  loop?: boolean;
  showControls?: boolean;
  className?: string;
  style?: React.CSSProperties;
  surfaceStyle?: React.CSSProperties;
};

export const Player = <T extends Record<string, unknown> = Record<string, unknown>>({
  component: Component,
  config,
  inputProps,
  initialFrame = 0,
  frame: controlledFrame,
  onFrameChange,
  autoplay = false,
  playing: controlledPlaying,
  onPlayingChange,
  clock = "internal",
  loop = false,
  showControls = true,
  className,
  style,
  surfaceStyle,
}: PlayerProps<T>) => {
  const maxFrame = Math.max(0, config.durationFrames - 1);
  const clampFrame = (value: number) => clamp(Math.round(value), 0, maxFrame);
  const isControlled = typeof controlledFrame === "number";
  const [internalFrame, setInternalFrame] = useState(() => clampFrame(isControlled ? controlledFrame : initialFrame));
  const frameValue = isControlled ? clampFrame(controlledFrame ?? 0) : internalFrame;
  const isPlayingControlled = typeof controlledPlaying === "boolean";
  const [internalPlaying, setInternalPlaying] = useState(autoplay);
  const playingValue = isPlayingControlled ? Boolean(controlledPlaying) : internalPlaying;

  const frameRef = useRef(frameValue);
  const playingRef = useRef(playingValue);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  useEffect(() => {
    frameRef.current = frameValue;
  }, [frameValue]);

  useEffect(() => {
    playingRef.current = playingValue;
  }, [playingValue]);

  useEffect(() => {
    if (clock === "external") {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      lastTimeRef.current = null;
      return;
    }
    if (!playingValue) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      lastTimeRef.current = null;
      return;
    }

    const frameDurationMs = 1000 / config.fps;
    const tick = (time: number) => {
      if (!playingRef.current) {
        return;
      }
      if (!loop && frameRef.current >= maxFrame) {
        if (!isPlayingControlled) {
          setInternalPlaying(false);
        }
        onPlayingChange?.(false);
        return;
      }
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }
      const delta = time - lastTimeRef.current;
      if (delta > 0) {
        accumulatorRef.current += delta / frameDurationMs;
        const advance = Math.floor(accumulatorRef.current);
        if (advance > 0) {
          accumulatorRef.current -= advance;
          let next = frameRef.current + advance;
          if (next > maxFrame) {
            if (loop) {
              next = next % (maxFrame + 1);
            } else {
              next = maxFrame;
              if (!isPlayingControlled) {
                setInternalPlaying(false);
              }
              onPlayingChange?.(false);
            }
          }
          const clamped = clampFrame(next);
          frameRef.current = clamped;
          if (!isControlled) {
            setInternalFrame(clamped);
          }
          onFrameChange?.(clamped);
        }
        lastTimeRef.current = time;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [clock, config.fps, loop, maxFrame, playingValue]);

  const onSeek = (value: number) => {
    const clamped = clampFrame(value);
    frameRef.current = clamped;
    if (!isControlled) {
      setInternalFrame(clamped);
    }
    onFrameChange?.(clamped);
  };

  const togglePlayback = () => {
    const next = !playingValue;
    if (!isPlayingControlled) {
      setInternalPlaying(next);
    }
    onPlayingChange?.(next);
  };

  const timeSec = useMemo(() => (frameValue / config.fps).toFixed(2), [frameValue, config.fps]);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      <div
        style={{
          width: config.width,
          height: config.height,
          background: "#0b0f1a",
          borderRadius: 12,
          overflow: "hidden",
          ...surfaceStyle,
        }}
      >
        <RendererProvider frame={frameValue} config={config}>
          <Component {...(inputProps ?? ({} as T))} />
        </RendererProvider>
      </div>

      {showControls ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={togglePlayback}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: playingValue ? "#374151" : "#1f2937",
                color: "white",
                cursor: "pointer",
              }}
            >
              {playingValue ? "Pause" : "Play"}
            </button>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              frame {frameValue} / {maxFrame} · {timeSec}s
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={frameValue}
            onChange={(event) => onSeek(Number(event.currentTarget.value))}
            onInput={(event) => onSeek(Number(event.currentTarget.value))}
          />
        </div>
      ) : null}
    </div>
  );
};
