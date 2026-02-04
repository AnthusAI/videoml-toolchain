import React from "react";
import { getComponent } from "../registry.js";
import { reviveNode } from "../rehydrate.js";

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
  chapterNumber?: string | number;
  chapterLabel?: string;
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover";
  logo?: React.ReactNode;
  logoPosition?: "left" | "right" | "center";
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
  chapterNumber,
  chapterLabel = "Chapter",
  logoUrl,
  logoAlt,
  logoWidth,
  logoHeight,
  logoFit,
  logo,
  logoPosition,
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
  const dbgOutline = debugLayout ? "6px dashed rgba(0, 255, 255, 0.95)" : undefined;
  const dbgOutline2 = debugLayout ? "5px dashed rgba(0, 255, 255, 0.85)" : undefined;
  const dbgOutline3 = debugLayout ? "4px dashed rgba(0, 255, 255, 0.7)" : undefined;
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

  const resolvedLogo = logo ?? (logoUrl ? (
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
  ) : null);

  const logoNode = resolvedLogo ? reviveNode(resolvedLogo) : null;
  const resolvedLogoPosition: "left" | "right" | "center" =
    logoPosition ?? (headerAlign === "center" ? "center" : "right");
  const showLogoInline = !!logoNode && resolvedLogoPosition === "left";
  const showLogoRight = !!logoNode && resolvedLogoPosition === "right";
  const showLogoCenter = !!logoNode && resolvedLogoPosition === "center";

  const headerHeightEstimate =
    (label ? 20 + 6 : 0) +
    (eyebrow ? 18 + 6 : 0) +
    (title ? 64 : 0) +
    (subtitle ? 28 + 8 : 0);
  const logoHeightEstimate = Math.max(64, Math.min(180, headerHeightEstimate || 120));

  const sizedLogoNode = (() => {
    if (!logoNode) return null;
    if (React.isValidElement(logoNode)) {
      const nextProps: Record<string, any> = {};
      if (typeof (logoNode.props as any)?.size === "number") {
        nextProps.size = logoHeightEstimate;
      }
      nextProps.style = {
        ...(logoNode.props as any)?.style,
        height: "100%",
        width: "auto",
      };
      return React.cloneElement(logoNode as any, nextProps);
    }
    return logoNode;
  })();

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
        outline: dbgOutline,
        outlineOffset: -6,
        overflow: debugLayout ? "visible" : "hidden",
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
          outline: dbgOutline2,
          outlineOffset: -5,
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
          <div
            style={{
              display: "flex",
              flexDirection: chapterNumber || showLogoInline ? "row" : "column",
              alignItems:
                chapterNumber || showLogoInline
                  ? "flex-start"
                  : headerAlign === "center"
                    ? "center"
                    : "flex-start",
              gap: chapterNumber ? 24 : 0,
              minWidth: 0,
            }}
          >
            {showLogoInline && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 24,
                }}
              >
                {sizedLogoNode}
              </div>
            )}
            {chapterNumber != null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: colorTextMuted,
                    fontWeight: 600,
                    fontFamily: fontEyebrow,
                  }}
                >
                  {chapterLabel}
                </div>
                <div
                  style={{
                    fontSize: 54,
                    fontWeight: 700,
                    color: colorText,
                    lineHeight: 1,
                    fontFamily: fontHeadline,
                  }}
                >
                  {chapterNumber}
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: headerAlign === "center" && !chapterNumber ? "center" : "flex-start",
                gap: 8,
                minWidth: 0,
              }}
            >
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
          </div>
          {showLogoCenter && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <div style={{ height: `${logoHeightEstimate}px`, display: "flex", alignItems: "center" }}>
                {sizedLogoNode}
              </div>
            </div>
          )}
        </div>
        {showLogoRight && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <div style={{ height: `${logoHeightEstimate}px`, display: "flex", alignItems: "center" }}>
              {sizedLogoNode}
            </div>
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
          outline: dbgOutline3,
          outlineOffset: debugLayout ? -4 : undefined,
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
                outline: debugLayout ? dbgOutline3 : undefined,
                outlineOffset: debugLayout ? -4 : undefined,
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
