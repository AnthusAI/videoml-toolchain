import React from "react";
import { getComponent } from "../registry.js";

export type FlexPageChildSpec = {
  type: string;
  id?: string;
  flex?: number | string; // e.g. 1, "0 0 auto"
  style?: React.CSSProperties;
  props?: Record<string, any>;
};

export type FlexPageLayoutProps = {
  background?: string;
  padding?: number;
  gap?: number;

  // Header
  label?: string; // e.g. "A", "B", "C"
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover";
  headerAlign?: "left" | "center";

  // Content container
  contentDirection?: "column" | "row";
  contentGap?: number;

  children?: FlexPageChildSpec[];

  // Injected
  frame?: number;
  fps?: number;
  timeSec?: number;
  videoWidth?: number;
  videoHeight?: number;
  scene?: any;
  cue?: any;
  styles?: any;
  markup?: any;
  progress?: number;
  debugLayout?: boolean;
};

export function FlexPageLayout({
  background,
  padding = 80,
  gap = 32,
  label,
  eyebrow,
  title,
  subtitle,
  logoUrl,
  logoAlt,
  logoWidth,
  logoHeight,
  logoFit,
  headerAlign = "left",
  contentDirection = "column",
  contentGap = 24,
  children = [],
  frame = 0,
  fps = 30,
  timeSec = 0,
  videoWidth = 1920,
  videoHeight = 1080,
  scene,
  cue,
  styles,
  markup,
  progress,
  debugLayout = false,
}: FlexPageLayoutProps) {
  // Debug borders should be clearly visible even when scaled down in video players.
  const dbgBorder = debugLayout ? "2px dashed rgba(255, 0, 0, 0.6)" : undefined;
  const dbgBorder2 = debugLayout ? "2px dashed rgba(0, 160, 255, 0.6)" : undefined;
  const dbgBorder3 = debugLayout ? "2px dashed rgba(0, 255, 160, 0.6)" : undefined;
  const titleCase = (s: string) =>
    s
      .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase
      .replace(/[-_]/g, " ")
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));

  const debugLabel = (text: string) =>
    debugLayout ? (
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 6,
          padding: "2px 6px",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          background: "rgba(0,0,0,0.55)",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      >
        {text}
      </div>
    ) : null;

  const headerJustify = headerAlign === "center" ? "center" : "flex-start";
  const headerTextAlign = headerAlign === "center" ? "center" : "left";
  const fontEyebrow = "var(--font-eyebrow, ui-sans-serif, system-ui, sans-serif)";
  const fontHeadline = "var(--font-headline, ui-sans-serif, system-ui, sans-serif)";
  const fontSubhead = "var(--font-subhead, ui-sans-serif, system-ui, sans-serif)";
  const colorText = "var(--color-text, #ffffff)";
  const colorTextMuted = "var(--color-text-muted, rgba(255,255,255,0.7))";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding,
        gap,
        background: background ?? styles?.background ?? "transparent",
        boxSizing: "border-box",
        border: dbgBorder,
        overflow: "hidden",
      }}
    >
      {debugLabel("FlexPage root")}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: headerAlign === "center" ? "center" : "space-between",
          alignItems: "flex-start",
          gap: 16,
          border: dbgBorder2,
          padding: debugLayout ? 8 : 0,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {debugLabel("Header")}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: headerAlign === "center" ? "center" : "flex-start",
            gap: 6,
            minWidth: 0,
          }}
        >
          {label && (
            <div
              style={{
                fontSize: 20,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: colorTextMuted,
                fontWeight: 600,
                fontFamily: fontEyebrow,
              }}
            >
              {label}
            </div>
          )}
          {eyebrow && (
            <div
              style={{
                fontSize: 18,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: colorTextMuted,
                fontWeight: 600,
                fontFamily: fontEyebrow,
              }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: colorText,
                textAlign: headerTextAlign,
                lineHeight: 1.05,
                wordBreak: "break-word",
                fontFamily: fontHeadline,
              }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                fontSize: 28,
                fontWeight: 400,
                color: colorTextMuted,
                textAlign: headerTextAlign,
                wordBreak: "break-word",
                fontFamily: fontSubhead,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {logoUrl && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <img
              src={logoUrl}
              alt={logoAlt ?? "Logo"}
              style={{
                width: logoWidth ?? 140,
                height: logoHeight ?? 80,
                objectFit: logoFit ?? "contain",
                display: "block",
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: contentDirection,
          gap: contentGap,
          border: dbgBorder3,
          padding: 0,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {debugLabel("Content")}
        {children.map((child, idx) => {
          const Impl = getComponent(child.type);
          if (!Impl) return null;

          const flex =
            child.flex == null ? "1 1 0" : typeof child.flex === "number" ? `${child.flex} ${child.flex} 0` : child.flex;

          const typeLabelMap: Record<string, string> = {
            BulletList: "Bullet List",
            BulletListScreen: "Bullet List Screen",
            FlexPage: "Flex Page",
          };
          const baseLabel = child.id
            ? titleCase(child.id)
            : child.type
              ? (typeLabelMap[child.type] ?? titleCase(child.type))
              : `Child ${idx + 1}`;

          // Prefer readable, non-redundant labels.
          const childLabelText =
            child.type === "BulletList" ? "Bullet List Component" : baseLabel;
          const showChildLabel = debugLayout;

          const childProps: Record<string, any> = {
            ...(child.props ?? {}),
            // pass through injected context so nested components are pure functions of frame
            frame,
            fps,
            timeSec,
            videoWidth,
            videoHeight,
            scene,
            cue,
            styles,
            markup,
            progress,
            debugLayout,
          };

          return (
            <div
              key={child.id ?? `${child.type}-${idx}`}
              style={{
                flex,
                minHeight: 0,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                ...(child.style ?? {}),
                border: debugLayout ? "2px dashed rgba(255,255,255,0.35)" : undefined,
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              {showChildLabel && debugLabel(childLabelText)}
              <Impl {...childProps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
