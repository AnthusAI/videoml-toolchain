import React from 'react';
import { applyTransition, type TransitionConfig } from '../../animation/transitions.js';
import { staggeredProgress } from '../../animation/stagger.js';
import { spring } from '../../math.js';

export type BulletItem = {
  text: string;
  subItems?: string[];
  icon?: string;
  highlight?: boolean;
};

export type BulletListProps = {
  // Content
  items: string[] | BulletItem[];

  // Bullet Style
  bulletStyle?: 'disc' | 'circle' | 'square' | 'number' | 'check' | 'arrow' | 'dash' | 'icon' | 'none';
  customBullet?: string;
  bulletColor?: string;
  bulletIcon?: {
    kind: 'lucide' | 'unicode';
    name: string; // lucide icon name OR unicode char (when kind==='unicode')
    size?: number; // px
    strokeWidth?: number; // for lucide
    color?: string;
    fontFamily?: string; // for unicode option
  };

  // Typography
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  highlightColor?: string;

  // Layout
  position?: { x?: number; y?: number };
  // Allows CSS strings like 'min(90vw, 1000px)' when in flex layout
  maxWidth?: number | string;
  columns?: number;
  columnGap?: number;
  height?: number;
  indent?: number;
  spacing?: number;
  justify?: 'start' | 'center' | 'space-between' | 'space-evenly';

  // Animation
  revealStyle?: 'fade' | 'slide' | 'typewriter' | 'spring' | 'scale';
  staggerDelayFrames?: number;
  itemDurationFrames?: number;

  // Layout mode:
  // - 'absolute' (legacy): positioned via x/y inside the frame
  // - 'flex'/'flow' (preferred): participates in parent layout (e.g. FlexPage)
  layoutMode?: 'absolute' | 'flex' | 'flow';

  // Debug
  showLayout?: boolean; // deprecated: prefer debugLayout

  // Manual control
  visibleCount?: number;

  // Timing
  entranceStartFrame?: number;

  // Injected
  frame?: number;
  fps?: number;
  videoWidth?: number;
  videoHeight?: number;
  debugLayout?: boolean;
};

export function BulletListComponent(props: BulletListProps) {
  const {
    items,
  bulletStyle = 'disc',
  customBullet,
  bulletColor,
  bulletIcon,
  fontSize = 32,
  lineHeight = 1.5,
  textColor = '#ffffff',
  highlightColor = '#ffcc00',
  position = {},
  maxWidth,
  columns = 1,
  columnGap = 48,
  height,
  indent = 40,
  spacing = 16,
  justify = 'start',
    revealStyle = 'spring',
    staggerDelayFrames = 15,
    itemDurationFrames = 20,
    showLayout = false,
    layoutMode = 'absolute',
    debugLayout = false,
    visibleCount,
    entranceStartFrame = 0,
    frame = 0,
    fps = 30,
    videoWidth = 1920,
} = props;

  const dbg = !!(debugLayout || showLayout);
  const fontSubhead = 'var(--font-subhead, ui-sans-serif, system-ui, sans-serif)';
  const colorText = 'var(--color-text, #ffffff)';
  const colorTextMuted = 'var(--color-text-muted, rgba(255,255,255,0.8))';
  const isAbsolute = layoutMode === 'absolute';
  const maxWidthValue = (() => {
    if (isAbsolute) {
      if (typeof maxWidth === 'number') return `${maxWidth}px`;
      if (typeof maxWidth === 'string') return maxWidth;
      return undefined;
    }
    // flex/flow mode: allow CSS string; otherwise let content define width
    if (typeof maxWidth === 'string') return maxWidth;
    if (typeof maxWidth === 'number') return `${maxWidth}px`;
    return undefined;
  })();

  // Normalize items
  const normalizedItems: BulletItem[] = items.map((item) =>
    typeof item === 'string' ? { text: item } : item
  );

  // Calculate position (default to centered)
  const x = position.x ?? (typeof maxWidth === 'number' ? (videoWidth - maxWidth) / 2 : 0);
  const y = position.y ?? 200;

  const entranceFrame = frame - entranceStartFrame;

  // Determine how many items to show
  const itemsToShow = visibleCount !== undefined ? Math.min(visibleCount, normalizedItems.length) : normalizedItems.length;

  // Get bullet character
  const getBullet = (index: number, item: BulletItem): string => {
    if (item.icon) return item.icon;
    if (customBullet) return customBullet;
    if (bulletStyle === 'icon' && bulletIcon?.kind === 'unicode') return bulletIcon.name;
    if (bulletStyle === 'disc') return '•';
    if (bulletStyle === 'circle') return '○';
    if (bulletStyle === 'square') return '■';
    if (bulletStyle === 'number') return `${index + 1}.`;
    if (bulletStyle === 'check') return '✓';
    if (bulletStyle === 'arrow') return '→';
    if (bulletStyle === 'dash') return '–';
    return '';
  };

  // Default transition config
  const getDefaultTransition = (): TransitionConfig => {
    if (revealStyle === 'spring') {
      return { type: 'spring', durationFrames: itemDurationFrames, mass: 0.5, stiffness: 200, damping: 100 };
    }
    if (revealStyle === 'slide') {
      return { type: 'slide', direction: 'left', distance: 30, durationFrames: itemDurationFrames };
    }
    if (revealStyle === 'scale') {
      return { type: 'scale', from: 0.8, to: 1, durationFrames: itemDurationFrames };
    }
    return { type: 'fade', from: 0, to: 1, durationFrames: itemDurationFrames };
  };

  const transitionConfig = getDefaultTransition();

  return (
    <div
      style={{
        position: isAbsolute ? 'absolute' : 'relative',
        left: isAbsolute ? x : undefined,
        top: isAbsolute ? y : undefined,
        width: isAbsolute ? undefined : 'fit-content',
        height: isAbsolute ? (height ? `${height}px` : '85%') : '100%',
        maxWidth: maxWidthValue,
        marginLeft: isAbsolute ? undefined : 'auto',
        marginRight: isAbsolute ? undefined : 'auto',
        display: 'flex',
        flexDirection: 'column',
        flex: isAbsolute ? undefined : 1,
        minHeight: 0,
        border: dbg ? '1px dashed rgba(255,255,255,0.35)' : undefined,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {dbg && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 6,
            padding: '2px 6px',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: 'rgba(0,0,0,0.55)',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        >
          Bullet List
        </div>
      )}
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          width: columns > 1 ? '100%' : 'fit-content',
          maxWidth: columns > 1 ? '100%' : '100%',
          flex: isAbsolute ? undefined : 1,
          display: columns > 1 ? 'grid' : 'flex',
          gridAutoFlow: columns > 1 ? 'column' : undefined,
          gridTemplateColumns: columns > 1 ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
          gridTemplateRows:
            columns > 1
              ? `repeat(${Math.ceil(itemsToShow / columns)}, minmax(0, 1fr))`
              : undefined,
          alignContent: columns > 1 ? 'stretch' : undefined,
          alignItems: columns > 1 ? 'center' : undefined,
          flexDirection: columns > 1 ? undefined : 'column',
          justifyContent:
            columns > 1
              ? undefined
              : justify === 'start'
                ? 'flex-start'
                : justify === 'center'
                  ? 'center'
                  : justify === 'space-between'
                    ? 'space-between'
                    : justify === 'space-evenly'
                      ? 'space-evenly'
                      : 'flex-start',
          gap:
            columns > 1
              ? `${spacing}px`
              : justify === 'space-between' || justify === 'space-evenly'
                ? undefined
                : `${spacing}px`,
          columnGap: columns > 1 ? `${columnGap}px` : undefined,
          border: dbg ? '1px dashed rgba(255,255,255,0.25)' : undefined,
          boxSizing: 'border-box',
          minHeight: 0,
        }}
      >
        {normalizedItems.slice(0, itemsToShow).map((item, index) => {
          const progress = staggeredProgress(index, entranceFrame, {
            count: itemsToShow,
            delayFrames: staggerDelayFrames,
            durationFrames: itemDurationFrames,
          });

          // Apply transition
        let transition = { opacity: 1, transform: 'none' };
        if (progress < 1) {
          const itemFrame = progress * itemDurationFrames;

            if (revealStyle === 'spring') {
              const value = spring({
                frame: itemFrame,
                fps,
                config: { from: 0, to: 1, mass: 0.5, stiffness: 200, damping: 100 },
              });
              transition = {
                opacity: value,
                transform: `translateX(${(1 - value) * -30}px)`,
              };
            } else {
              const t = applyTransition(transitionConfig, itemFrame, { fps, width: 0, height: 0 });
              transition = { opacity: t.opacity ?? 1, transform: t.transform ?? 'none' };
            }
          }

          const baseTextColor = item.highlight ? highlightColor : textColor;
          const finalTextColor = baseTextColor === textColor ? colorText : baseTextColor;
          const finalBulletColor = bulletColor || finalTextColor;

          // Render bullet node (supports lucide or unicode or text)
          const renderBullet = () => {
            const lineBoxPx = Math.round(fontSize * (lineHeight ?? 1.5));

            // Lucide icon option
            if (bulletStyle === 'icon' && bulletIcon?.kind === 'lucide') {
              const size = bulletIcon.size ?? Math.round(fontSize * 0.9);
              const stroke = bulletIcon.strokeWidth ?? 3;
              const color = bulletIcon.color ?? finalBulletColor;
              const path = lucidePath(bulletIcon.name);
              if (!path) return <span style={{ color, fontSize: `${fontSize}px` }}>•</span>;

              // Align icon with the *first* line of text (not the full multi-line block).
              return (
                <span
                  style={{
                    width: size,
                    height: lineBoxPx,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'block' }}
                  >
                    {path}
                  </svg>
                </span>
              );
            }

            // Unicode or text bullets (default)
            const glyph = getBullet(index, item);
            const isUnicodeIcon = bulletStyle === 'icon' && bulletIcon?.kind === 'unicode';
            const fontFamily = isUnicodeIcon ? (bulletIcon.fontFamily ?? '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif') : undefined;
            const glyphSize = isUnicodeIcon ? (bulletIcon.size ?? Math.round(fontSize * 0.95)) : fontSize;
            const glyphColor = isUnicodeIcon ? (bulletIcon.color ?? finalBulletColor) : finalBulletColor;
            return (
              <span
                style={{
                  color: glyphColor,
                  marginRight: '16px',
                  fontSize: `${glyphSize}px`,
                  fontWeight: item.highlight ? 600 : 400,
                  width: bulletStyle === 'number' ? 48 : glyphSize,
                  height: lineBoxPx,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {glyph}
              </span>
            );
          };

          return (
            <li
              key={index}
              style={{
                display: 'flex',
                alignItems: columns > 1 ? 'center' : 'flex-start',
                marginBottom: justify === 'space-between' || justify === 'space-evenly' ? 0 : `${spacing}px`,
                opacity: transition.opacity,
                transform: transition.transform || 'none',
                breakInside: columns > 1 ? 'avoid' : undefined,
                pageBreakInside: columns > 1 ? 'avoid' : undefined,
              }}
            >
              {bulletStyle !== 'none' && renderBullet()}
              <div>
                <span
                  style={{
                    color: finalTextColor,
                    fontSize: `${fontSize}px`,
                    lineHeight,
                    fontWeight: item.highlight ? 600 : 400,
                    fontFamily: fontSubhead,
                  }}
                >
                  {item.text}
                </span>
                {item.subItems && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: `${spacing / 2}px`, paddingLeft: `${indent}px` }}>
                    {item.subItems.map((subItem, subIndex) => (
                      <li
                        key={subIndex}
                        style={{
                          color: colorTextMuted,
                          fontSize: `${fontSize * 0.85}px`,
                          lineHeight,
                          marginBottom: `${spacing / 2}px`,
                          fontFamily: fontSubhead,
                        }}
                      >
                        <span style={{ marginRight: '8px' }}>◦</span>
                        {subItem}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Minimal Lucide path library (expand as needed)
export function lucidePath(name: string): React.ReactNode | null {
  const n = name.toLowerCase();
  switch (n) {
    case 'check':
      return <path d="M20 6 9 17l-5-5" />;
    case 'arrow-right':
      return (
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      );
    case 'chevron-right':
      return <polyline points="9 18 15 12 9 6" />;
    case 'circle':
      return <circle cx="12" cy="12" r="9" />;
    case 'dot':
      return <circle cx="12" cy="12" r="3" />;
    case 'star':
      return <path d="m12 2 2.9 6 6.6.5-5 4.7 1.5 6.3L12 16l-6 3.5L7.5 13 2 8.5l6.6-.5Z" />;
    case 'circle-dot':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case 'minus':
      return <line x1="5" y1="12" x2="19" y2="12" />;
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      );
    case 'square':
      return <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />;
    case 'triangle-right':
      return <polygon points="8 5 19 12 8 19 8 5" />;
    default:
      return null;
  }
}
