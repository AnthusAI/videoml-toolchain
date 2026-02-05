import React from 'react';
import type p5 from 'p5';

export type P5SketchProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
};

type SketchSize = { width: number; height: number };

export abstract class P5SketchBase<P extends P5SketchProps = P5SketchProps> extends React.Component<P> {
  protected containerRef = React.createRef<HTMLDivElement>();
  protected p5Instance: p5 | null = null;
  private isClient = typeof window !== 'undefined';
  private latestFrame = 0;
  private latestFps = 30;
  private latestSize: SketchSize = { width: 1920, height: 1080 };

  protected abstract drawFrame(sketch: p5, frame: number, fps: number, size: SketchSize): void;

  protected setupSketch(_sketch: p5, _size: SketchSize): void {
    // Optional hook for subclasses
  }

  componentDidMount(): void {
    if (!this.isClient) return;
    this.latestFrame = this.getFrame();
    this.latestFps = this.getFps();
    this.latestSize = this.getSize();
    void this.initSketch();
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient || !this.p5Instance) return;
    const size = this.getSize();
    const sizeChanged = size.width !== this.latestSize.width || size.height !== this.latestSize.height;
    this.latestFrame = this.getFrame();
    this.latestFps = this.getFps();
    this.latestSize = size;

    if (sizeChanged) {
      this.p5Instance.resizeCanvas(size.width, size.height);
    }

    if (
      prevProps.frame !== this.props.frame ||
      prevProps.fps !== this.props.fps ||
      prevProps.videoWidth !== this.props.videoWidth ||
      prevProps.videoHeight !== this.props.videoHeight
    ) {
      this.p5Instance.redraw();
    }
  }

  componentWillUnmount(): void {
    if (this.p5Instance) {
      this.p5Instance.remove();
      this.p5Instance = null;
    }
  }

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): SketchSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  private async initSketch(): Promise<void> {
    const container = this.containerRef.current;
    if (!container) return;
    const size = this.getSize();
    const p5Module = await import('p5');
    const P5 = (p5Module as any).default ?? (p5Module as any);

    this.p5Instance = new P5((sketch: p5) => {
      sketch.setup = () => {
        sketch.createCanvas(size.width, size.height);
        sketch.noLoop();
        this.setupSketch(sketch, size);
      };

      sketch.draw = () => {
        this.drawFrame(sketch, this.latestFrame, this.latestFps, this.latestSize);
      };
    }, container);

    this.p5Instance?.redraw();
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
