import React from 'react';
import gsapImport from 'gsap';
import { interpolate } from '../../math.js';

export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'jsx'
  | 'tsx'
  | 'css'
  | 'json'
  | 'bash'
  | 'html'
  | 'sql'
  | 'go'
  | 'rust';

export type CodeTheme = 'dark' | 'light' | 'monokai' | 'github' | 'dracula' | 'nord';

export type CodeBlockProps = {
  // Content
  code: string;
  language?: CodeLanguage;

  // Visual
  theme?: CodeTheme;
  fontSize?: number;
  lineHeight?: number;
  showLineNumbers?: boolean;
  highlightLines?: number[];

  // Size & Position
  position?: { x?: number; y?: number };
  width?: number;
  height?: number;
  padding?: number;
  borderRadius?: number;
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
  slideDurationFrames?: number;
  slideEase?: string;

  // Animation
  revealStyle?: 'instant' | 'typewriter' | 'line-by-line' | 'fade';
  typewriterSpeed?: number;
  showCursor?: boolean;
  cursorChar?: string;
  lineDelayFrames?: number;
  lineDurationFrames?: number;

  startFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
};

const gsap = (gsapImport as any).gsap ?? gsapImport;

const resolveSlideEase = (ease?: string) => {
  if (!ease) return undefined;
  const parsed = (gsap as any).parseEase?.(ease);
  if (typeof parsed === 'function') {
    return parsed as (t: number) => number;
  }
  return undefined;
};

const themes: Record<CodeTheme, any> = {
  dark: {
    background: '#1e1e1e',
    text: '#d4d4d4',
    keyword: '#569cd6',
    string: '#ce9178',
    comment: '#6a9955',
    function: '#dcdcaa',
    number: '#b5cea8',
    lineNumberColor: '#858585',
    highlightLine: 'rgba(255, 255, 255, 0.1)',
  },
  light: {
    background: '#ffffff',
    text: '#24292e',
    keyword: '#d73a49',
    string: '#032f62',
    comment: '#6a737d',
    function: '#6f42c1',
    number: '#005cc5',
    lineNumberColor: '#959da5',
    highlightLine: 'rgba(0, 0, 0, 0.05)',
  },
  monokai: {
    background: '#272822',
    text: '#f8f8f2',
    keyword: '#f92672',
    string: '#e6db74',
    comment: '#75715e',
    function: '#a6e22e',
    number: '#ae81ff',
    lineNumberColor: '#75715e',
    highlightLine: 'rgba(255, 255, 255, 0.1)',
  },
  github: {
    background: '#f6f8fa',
    text: '#24292e',
    keyword: '#d73a49',
    string: '#032f62',
    comment: '#6a737d',
    function: '#6f42c1',
    number: '#005cc5',
    lineNumberColor: '#959da5',
    highlightLine: 'rgba(0, 0, 0, 0.05)',
  },
  dracula: {
    background: '#282a36',
    text: '#f8f8f2',
    keyword: '#ff79c6',
    string: '#f1fa8c',
    comment: '#6272a4',
    function: '#50fa7b',
    number: '#bd93f9',
    lineNumberColor: '#6272a4',
    highlightLine: 'rgba(255, 255, 255, 0.1)',
  },
  nord: {
    background: '#2e3440',
    text: '#eceff4',
    keyword: '#81a1c1',
    string: '#a3be8c',
    comment: '#616e88',
    function: '#88c0d0',
    number: '#b48ead',
    lineNumberColor: '#616e88',
    highlightLine: 'rgba(255, 255, 255, 0.1)',
  },
};

export function CodeBlockComponent(props: CodeBlockProps) {
  const {
    code,
    language = 'javascript',
    theme = 'dark',
    fontSize = 18,
    lineHeight = 1.6,
    showLineNumbers = true,
    highlightLines = [],
    position = {},
    width,
    height,
    padding = 24,
    borderRadius = 12,
    xFrom,
    xTo,
    yFrom,
    yTo,
    slideDurationFrames = 0,
    slideEase = 'power2.out',
    revealStyle = 'instant',
    typewriterSpeed = 1,
    showCursor = true,
    cursorChar = '▋',
    lineDelayFrames = 10,
    lineDurationFrames = 15,
    startFrame = 0,
    frame = 0,
    videoWidth = 1920,
  } = props;

  const relativeFrame = frame - startFrame;
  const themeColors = themes[theme];

  // Calculate position
  const targetX = xTo ?? position.x ?? (videoWidth - (width || 1200)) / 2;
  const targetY = yTo ?? position.y ?? 100;
  const easeFn = resolveSlideEase(slideEase);
  const shouldSlideX = typeof xFrom === 'number' && typeof xTo === 'number' && slideDurationFrames > 0;
  const shouldSlideY = typeof yFrom === 'number' && typeof yTo === 'number' && slideDurationFrames > 0;
  const x = shouldSlideX
    ? interpolate(relativeFrame, [0, slideDurationFrames], [xFrom, xTo], { clamp: true, easing: easeFn })
    : targetX;
  const y = shouldSlideY
    ? interpolate(relativeFrame, [0, slideDurationFrames], [yFrom, yTo], { clamp: true, easing: easeFn })
    : targetY;

  // Split code into lines
  const lines = code.split('\n');

  // Calculate visible content based on reveal style
  let visibleCode = code;
  let displayCursor = false;

  if (revealStyle === 'typewriter' && relativeFrame >= 0) {
    const charsToShow = Math.floor(relativeFrame * typewriterSpeed);
    visibleCode = code.slice(0, Math.min(charsToShow, code.length));
    displayCursor = showCursor && charsToShow < code.length && Math.floor(relativeFrame / 15) % 2 === 0;
  } else if (revealStyle === 'line-by-line' && relativeFrame >= 0) {
    const visibleLineCount = Math.floor(relativeFrame / (lineDelayFrames + lineDurationFrames));
    const currentLineIndex = Math.min(visibleLineCount, lines.length);
    visibleCode = lines.slice(0, currentLineIndex).join('\n');

    // Fade in the current line
    if (currentLineIndex < lines.length) {
      const lineStartFrame = currentLineIndex * (lineDelayFrames + lineDurationFrames) + lineDelayFrames;
      const lineFrame = relativeFrame - lineStartFrame;
      if (lineFrame >= 0 && lineFrame < lineDurationFrames) {
        // Fading in the line
        visibleCode += '\n' + lines[currentLineIndex];
      }
    }
  } else if (revealStyle === 'fade' && relativeFrame >= 0 && relativeFrame < 30) {
    // Just use opacity, keep full code
  }

  // Simple syntax highlighting
  const highlightCode = (text: string): React.ReactNode => {
    // Very basic regex-based highlighting
    const keywordPattern = /\b(const|let|var|function|if|else|return|import|export|class|extends|async|await|for|while|try|catch|throw|new)\b/g;
    const stringPattern = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
    const commentPattern = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    const numberPattern = /\b(\d+)\b/g;

    let highlighted = text;

    // Replace patterns with spans
    highlighted = highlighted.replace(commentPattern, (match) => `<span style="color: ${themeColors.comment}">${match}</span>`);
    highlighted = highlighted.replace(stringPattern, (match) => `<span style="color: ${themeColors.string}">${match}</span>`);
    highlighted = highlighted.replace(keywordPattern, (match) => `<span style="color: ${themeColors.keyword}">${match}</span>`);
    highlighted = highlighted.replace(numberPattern, (match) => `<span style="color: ${themeColors.number}">${match}</span>`);

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const visibleLines = visibleCode.split('\n');

  // Calculate opacity for fade reveal
  let opacity = 1;
  if (revealStyle === 'fade' && relativeFrame >= 0 && relativeFrame < 30) {
    opacity = interpolate(relativeFrame, [0, 30], [0, 1]);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
        maxWidth: '1200px',
        background: themeColors.background,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
        fontFamily: '"Source Code Pro", "Courier New", monospace',
        fontSize: `${fontSize}px`,
        lineHeight,
        overflow: 'auto',
        opacity,
      }}
    >
      <pre style={{ margin: 0, color: themeColors.text }}>
        {visibleLines.map((line, index) => {
          const lineNumber = index + 1;
          const isHighlighted = highlightLines.includes(lineNumber);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                background: isHighlighted ? themeColors.highlightLine : 'transparent',
                paddingLeft: '8px',
                paddingRight: '8px',
              }}
            >
              {showLineNumbers && (
                <span
                  style={{
                    color: themeColors.lineNumberColor,
                    marginRight: '16px',
                    minWidth: '30px',
                    textAlign: 'right',
                    userSelect: 'none',
                  }}
                >
                  {lineNumber}
                </span>
              )}
              <code>{highlightCode(line)}</code>
            </div>
          );
        })}
        {displayCursor && <span style={{ animation: 'none' }}>{cursorChar}</span>}
      </pre>
    </div>
  );
}
