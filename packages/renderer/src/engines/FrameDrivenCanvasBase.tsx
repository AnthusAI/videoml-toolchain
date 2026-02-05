import React from 'react';

export type FrameDrivenCanvasProps = {
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  style?: React.CSSProperties;
  className?: string;
  dataEngine?: string;
};

type CanvasSize = { width: number; height: number };

export abstract class FrameDrivenCanvasBase<P extends FrameDrivenCanvasProps = FrameDrivenCanvasProps> extends React.Component<P> {
  protected canvasRef = React.createRef<HTMLCanvasElement>();
  protected containerRef = React.createRef<HTMLDivElement>();
  private isClient = typeof window !== 'undefined';

  protected abstract drawFrame(
    ctx: CanvasRenderingContext2D,
    frame: number,
    fps: number,
    size: CanvasSize,
  ): void;

  componentDidMount(): void {
    if (!this.isClient) return;
    this.syncCanvasSize();
    this.renderFrame();
  }

  componentDidUpdate(prevProps: Readonly<P>): void {
    if (!this.isClient) return;
    if (
      prevProps.frame !== this.props.frame ||
      prevProps.fps !== this.props.fps ||
      prevProps.videoWidth !== this.props.videoWidth ||
      prevProps.videoHeight !== this.props.videoHeight
    ) {
      this.syncCanvasSize();
      this.renderFrame();
    }
  }

  protected getFrame(): number {
    return this.props.frame ?? 0;
  }

  protected getFps(): number {
    return this.props.fps ?? 30;
  }

  protected getSize(): CanvasSize {
    return {
      width: this.props.videoWidth ?? 1920,
      height: this.props.videoHeight ?? 1080,
    };
  }

  private syncCanvasSize(): void {
    const canvas = this.canvasRef.current;
    if (!canvas) return;
    const { width, height } = this.getSize();
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  private renderFrame(): void {
    const canvas = this.canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.drawFrame(ctx, this.getFrame(), this.getFps(), this.getSize());
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
      >
        <canvas ref={this.canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    );
  }
}
