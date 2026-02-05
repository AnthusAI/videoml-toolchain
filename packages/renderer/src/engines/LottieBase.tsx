import React from 'react';
import type { AnimationItem } from 'lottie-web';

export type LottieBaseProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
  animationData?: Record<string, unknown>;
  path?: string;
  loop?: boolean;
};

type LottieSize = { width: number; height: number };

export abstract class LottieBase<P extends LottieBaseProps = LottieBaseProps> extends React.Component<P> {
  protected containerRef = React.createRef<HTMLDivElement>();
  protected animation: AnimationItem | null = null;
  private isClient = typeof window !== 'undefined';
  private teardownListeners: (() => void) | null = null;

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): LottieSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  componentDidMount(): void {
    if (!this.isClient) return;
    void this.initAnimation();
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient || !this.animation) return;
    if (
      prevProps.frame !== this.props.frame ||
      prevProps.fps !== this.props.fps
    ) {
      this.syncFrame();
    }
  }

  componentWillUnmount(): void {
    if (this.animation) {
      if (this.teardownListeners) {
        this.teardownListeners();
        this.teardownListeners = null;
      }
      this.animation.destroy();
      this.animation = null;
    }
  }

  private async initAnimation(): Promise<void> {
    const container = this.containerRef.current;
    if (!container) return;
    if (!this.props.animationData && !this.props.path) {
      return;
    }
    container.innerHTML = '';
    const module = await import('lottie-web');
    const lottie = (module as any).default ?? module;
    this.animation = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: this.props.loop ?? true,
      autoplay: false,
      animationData: this.props.animationData as any,
      path: this.props.path,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });
    const animation = this.animation;
    if (!animation) return;

    // Prefer integer-frame stepping. We drive frames deterministically via goToAndStop.
    try {
      animation.setSubframe(false);
    } catch {
      // Older builds may not expose setSubframe; ignore.
    }

    // Lottie loads async; ensure we sync once the DOM is ready, and also immediately.
    const resync = () => this.syncFrame();
    try {
      animation.addEventListener('DOMLoaded', resync);
      animation.addEventListener('data_ready', resync);
      this.teardownListeners = () => {
        try {
          animation.removeEventListener('DOMLoaded', resync);
          animation.removeEventListener('data_ready', resync);
        } catch {
          // ignore
        }
      };
    } catch {
      // If events aren't available, we still rely on frame updates calling syncFrame().
    }

    this.syncFrame();
  }

  private syncFrame(): void {
    if (!this.animation) return;
    const frame = this.getFrame();
    const fps = this.getFps();
    const rawFrameRate = (this.animation as any).frameRate;
    const lottieFps = Number.isFinite(Number(rawFrameRate)) && Number(rawFrameRate) > 0 ? Number(rawFrameRate) : fps;
    const rawTotalFrames =
      typeof (this.animation as any).getDuration === 'function'
        ? (this.animation as any).getDuration(true)
        : (this.animation as any).totalFrames;
    const totalFrames =
      Number.isFinite(Number(rawTotalFrames)) && Number(rawTotalFrames) > 0 ? Number(rawTotalFrames) : 1;
    if (totalFrames <= 1) {
      return;
    }

    // Drive deterministically by frame. Loop through the Lottie frame range.
    // This avoids "clamp-to-end" behavior where the animation appears frozen after 1 cycle.
    const loopFrame = ((frame % totalFrames) + totalFrames) % totalFrames;
    const seekFrame =
      Number.isFinite(loopFrame) && loopFrame >= 0
        ? Math.round(loopFrame)
        : Math.round(Math.min(totalFrames - 1, Math.max(0, (frame / fps) * lottieFps)));
    try {
      this.animation.goToAndStop(seekFrame, true);
    } catch {
      // If lottie isn't ready, ignore; DOMLoaded/data_ready will resync.
    }
  }

  render() {
    const { style, className, dataEngine } = this.props;
    return (
      <div
        ref={this.containerRef}
        className={className}
        data-engine={dataEngine}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
      />
    );
  }
}
