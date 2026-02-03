import React from 'react';
import { interpolate, spring, clamp } from '../math.js';
import { easeOutBounce } from '../animation/easing.js';
import { squashStretch, arcPath } from '../animation/principles.js';

export type Principle =
  | 'squash-stretch'
  | 'anticipation'
  | 'arcs'
  | 'timing'
  | 'appeal';

type Props = {
  principle: Principle;
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function TwelvePrinciplesDemo({ principle, frame = 0, fps = 30, videoWidth = 1920, videoHeight = 1080 }: Props) {
  // 4-second loop for continuous demonstration
  const loopDuration = fps * 4;
  const loopFrame = frame % loopDuration;

  // Common ball properties
  const ballSize = 80;
  const groundY = videoHeight - 200;
  const centerX = videoWidth / 2;

  switch (principle) {
    case 'squash-stretch':
      return <SquashStretchDemo frame={loopFrame} fps={fps} ballSize={ballSize} groundY={groundY} centerX={centerX} />;
    case 'anticipation':
      return <AnticipationDemo frame={loopFrame} fps={fps} ballSize={ballSize} groundY={groundY} centerX={centerX} />;
    case 'arcs':
      return <ArcsDemo frame={loopFrame} fps={fps} ballSize={ballSize} groundY={groundY} videoWidth={videoWidth} />;
    case 'timing':
      return <TimingDemo frame={loopFrame} fps={fps} ballSize={ballSize} groundY={groundY} videoWidth={videoWidth} />;
    case 'appeal':
      return <AppealDemo frame={loopFrame} fps={fps} ballSize={ballSize} groundY={groundY} centerX={centerX} />;
    default:
      return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 48 }}>
        Demo for {principle}
      </div>;
  }
}

function SquashStretchDemo({ frame, fps, ballSize, groundY, centerX }: any) {
  // Ball bounces with squash on impact, stretch in air
  const bounceHeight = 400;
  const bouncePeriod = fps * 1; // 1 second per bounce
  const progress = (frame % bouncePeriod) / bouncePeriod;

  // Parabolic bounce: y = 4h * t * (1-t)
  const heightOffset = 4 * bounceHeight * progress * (1 - progress);
  const y = groundY - heightOffset - ballSize / 2;

  // Velocity for squash/stretch (derivative of parabola)
  const velocity = 4 * bounceHeight * (1 - 2 * progress) / bouncePeriod;
  const normalizedVelocity = velocity / (4 * bounceHeight / bouncePeriod);

  const { scaleX, scaleY } = squashStretch({ velocity: normalizedVelocity });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e' }}>
      {/* Ground line */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 - 2,
          left: 0,
          right: 0,
          height: 4,
          background: '#4a4a6a',
        }}
      />

      {/* Ball */}
      <div
        style={{
          position: 'absolute',
          left: centerX - ballSize / 2,
          top: y,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b6b, #ee5253)',
          transform: `scale(${scaleX}, ${scaleY})`,
          transformOrigin: 'center bottom',
          boxShadow: '0 4px 20px rgba(238, 82, 83, 0.5)',
        }}
      />

      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          left: centerX - ballSize / 2,
          top: groundY - 10,
          width: ballSize,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.3)',
          transform: `scaleX(${1 + (1 - heightOffset / bounceHeight) * 0.5})`,
        }}
      />
    </div>
  );
}

function AnticipationDemo({ frame, fps, ballSize, groundY, centerX }: any) {
  // Ball crouches before jumping
  const cycleDuration = fps * 2; // 2 seconds per cycle
  const cycleFrame = frame % cycleDuration;

  const anticipationFrames = fps * 0.3; // 0.3 seconds
  const jumpFrames = fps * 1.2; // 1.2 seconds
  const landFrames = fps * 0.5; // 0.5 seconds

  let y = groundY - ballSize / 2;
  let squash = 1;

  if (cycleFrame < anticipationFrames) {
    // Crouching down (anticipation)
    const progress = cycleFrame / anticipationFrames;
    y = groundY - ballSize / 2 + 20 * progress; // Move down
    squash = 1 - 0.2 * progress; // Squash slightly
  } else if (cycleFrame < anticipationFrames + jumpFrames) {
    // Jumping up
    const jumpFrame = cycleFrame - anticipationFrames;
    const jumpProgress = jumpFrame / jumpFrames;

    // Parabolic arc for jump
    const heightOffset = 4 * 500 * jumpProgress * (1 - jumpProgress);
    y = groundY - ballSize / 2 - heightOffset;

    // Stretch while going up, compress while coming down
    const velocity = (1 - 2 * jumpProgress);
    squash = 1 + Math.abs(velocity) * 0.3;
  } else {
    // Landing
    const landFrame = cycleFrame - anticipationFrames - jumpFrames;
    const landProgress = landFrame / landFrames;
    squash = 1 - 0.15 * (1 - landProgress); // Compress on landing, then recover
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e' }}>
      {/* Ground line */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 - 2,
          left: 0,
          right: 0,
          height: 4,
          background: '#4a4a6a',
        }}
      />

      {/* Ball with anticipation */}
      <div
        style={{
          position: 'absolute',
          left: centerX - ballSize / 2,
          top: y,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6b6bff, #5253ee)',
          transform: `scaleY(${squash})`,
          transformOrigin: 'center bottom',
          boxShadow: '0 4px 20px rgba(82, 83, 238, 0.5)',
        }}
      />
    </div>
  );
}

function ArcsDemo({ frame, fps, ballSize, groundY, videoWidth }: any) {
  // Ball follows natural arc trajectory
  const cycleDuration = fps * 3; // 3 seconds
  const progress = (frame % cycleDuration) / cycleDuration;

  const from = { x: 100, y: groundY - ballSize / 2 };
  const to = { x: videoWidth - 100, y: groundY - ballSize / 2 };

  const pos = arcPath({
    from,
    to,
    arcHeight: 300,
    progress,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e' }}>
      {/* Ground line */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 - 2,
          left: 0,
          right: 0,
          height: 4,
          background: '#4a4a6a',
        }}
      />

      {/* Arc trail */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox={`0 0 ${videoWidth} ${groundY + 200}`}>
        <path
          d={generateArcPath(from, to, 300, videoWidth)}
          stroke="rgba(107, 255, 107, 0.3)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="10 5"
        />
      </svg>

      {/* Ball */}
      <div
        style={{
          position: 'absolute',
          left: pos.x - ballSize / 2,
          top: pos.y,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6bff6b, #53ee52)',
          boxShadow: '0 4px 20px rgba(83, 238, 82, 0.5)',
        }}
      />
    </div>
  );
}

function TimingDemo({ frame, fps, ballSize, groundY, videoWidth }: any) {
  // Two balls with different timing
  const fastCycleDuration = fps * 1.5;
  const slowCycleDuration = fps * 3;

  const fastProgress = (frame % fastCycleDuration) / fastCycleDuration;
  const slowProgress = (frame % slowCycleDuration) / slowCycleDuration;

  const startX = 200;
  const endX = videoWidth - 200;

  const fastX = startX + (endX - startX) * fastProgress;
  const slowX = startX + (endX - startX) * slowProgress;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e' }}>
      {/* Ground line */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 - 2,
          left: 0,
          right: 0,
          height: 4,
          background: '#4a4a6a',
        }}
      />

      {/* Labels */}
      <div style={{ position: 'absolute', top: groundY - 150, left: startX - 50, color: '#ff6b6b', fontSize: 20 }}>Fast</div>
      <div style={{ position: 'absolute', top: groundY - 50, left: startX - 50, color: '#6bff6b', fontSize: 20 }}>Slow</div>

      {/* Fast ball */}
      <div
        style={{
          position: 'absolute',
          left: fastX - ballSize / 2,
          top: groundY - 150 - ballSize / 2,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b6b, #ee5253)',
          boxShadow: '0 4px 20px rgba(238, 82, 83, 0.5)',
        }}
      />

      {/* Slow ball */}
      <div
        style={{
          position: 'absolute',
          left: slowX - ballSize / 2,
          top: groundY - 50 - ballSize / 2,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6bff6b, #53ee52)',
          boxShadow: '0 4px 20px rgba(83, 238, 82, 0.5)',
        }}
      />
    </div>
  );
}

function AppealDemo({ frame, fps, ballSize, groundY, centerX }: any) {
  // Attractive, appealing ball with nice design
  const bouncePeriod = fps * 1.5;
  const progress = (frame % bouncePeriod) / bouncePeriod;

  // Gentle bounce
  const heightOffset = 4 * 200 * progress * (1 - progress);
  const y = groundY - heightOffset - ballSize / 2;

  // Gentle squash/stretch
  const velocity = (1 - 2 * progress) * 0.3;
  const { scaleX, scaleY } = squashStretch({ velocity, squashRatio: 0.9, stretchRatio: 1.1 });

  // Subtle rotation
  const rotation = progress * 360;

  // Sparkle effect
  const sparkleOpacity = Math.sin(frame * 0.2) * 0.5 + 0.5;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e' }}>
      {/* Ground line with gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 200 - 2,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, #ff6b6b, #6bff6b, #6b6bff, #ff6bff)',
        }}
      />

      {/* Ball with appealing design */}
      <div
        style={{
          position: 'absolute',
          left: centerX - ballSize / 2,
          top: y,
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
          transform: `scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`,
          transformOrigin: 'center bottom',
          boxShadow: '0 8px 32px rgba(255, 107, 157, 0.6), inset 0 4px 8px rgba(255, 255, 255, 0.3)',
          border: '3px solid rgba(255, 255, 255, 0.5)',
        }}
      >
        {/* Highlight */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '25%',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent)',
            opacity: sparkleOpacity,
          }}
        />
      </div>

      {/* Shadow with gradient */}
      <div
        style={{
          position: 'absolute',
          left: centerX - ballSize / 2,
          top: groundY - 10,
          width: ballSize,
          height: 20,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255, 107, 157, 0.4), transparent)',
          transform: `scaleX(${1 + (1 - heightOffset / 200) * 0.5})`,
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
}

// Helper to generate SVG arc path
function generateArcPath(from: { x: number; y: number }, to: { x: number; y: number }, arcHeight: number, steps: number = 100): string {
  const points: string[] = [`M ${from.x} ${from.y}`];

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const pos = arcPath({ from, to, arcHeight, progress });
    points.push(`L ${pos.x} ${pos.y}`);
  }

  return points.join(' ');
}
