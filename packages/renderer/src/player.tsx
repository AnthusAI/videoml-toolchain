import React, { useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "./math.js";
import { RendererProvider, type VideoConfig } from "./context.js";

export type PlayerProps = {
  component: React.ComponentType<Record<string, unknown>>;
  config: VideoConfig;
  inputProps?: Record<string, unknown>;
  initialFrame?: number;
  autoplay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  className?: string;
  style?: React.CSSProperties;
  surfaceStyle?: React.CSSProperties;
};

export const Player = ({
  component: Component,
  config,
  inputProps,
  initialFrame = 0,
  autoplay = false,
  loop = false,
  showControls = true,
  className,
  style,
  surfaceStyle,
}: PlayerProps) => {
  const maxFrame = Math.max(0, config.durationFrames - 1);
  const clampFrame = (value: number) => clamp(Math.round(value), 0, maxFrame);
  const [frame, setFrame] = useState(() => clampFrame(initialFrame));
  const [playing, setPlaying] = useState(autoplay);

  const frameRef = useRef(frame);
  const playingRef = useRef(playing);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (!playing) {
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
        setPlaying(false);
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
          setFrame((prev) => {
            let next = prev + advance;
            if (next > maxFrame) {
              if (loop) {
                next = next % (maxFrame + 1);
              } else {
                next = maxFrame;
                setPlaying(false);
              }
            }
            return next;
          });
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
  }, [config.fps, loop, maxFrame, playing]);

  const onSeek = (value: number) => {
    setFrame(clampFrame(value));
  };

  const timeSec = useMemo(() => (frame / config.fps).toFixed(2), [frame, config.fps]);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
      <div
        style={{
          width: config.width,
          height: config.height,
          background: "#0b0f1a",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          ...surfaceStyle,
        }}
      >
        <RendererProvider frame={frame} config={config}>
          <Component {...(inputProps ?? {})} />
        </RendererProvider>
      </div>

      {showControls ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => setPlaying((prev) => !prev)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #1f2937",
                background: playing ? "#1f2937" : "#111827",
                color: "white",
                cursor: "pointer",
              }}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              frame {frame} / {maxFrame} · {timeSec}s
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={maxFrame}
            value={frame}
            onChange={(event) => onSeek(Number(event.currentTarget.value))}
            onInput={(event) => onSeek(Number(event.currentTarget.value))}
          />
        </div>
      ) : null}
    </div>
  );
};
