import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { clamp } from "./math.js";
import { RendererProvider, type VideoConfig } from "./context.js";

export type RenderFrameOptions = {
  component: React.ComponentType<Record<string, unknown>>;
  config: VideoConfig;
  frame: number;
  inputProps?: Record<string, unknown>;
};

export type RenderFrameFileOptions = RenderFrameOptions & {
  outPath: string;
};

export type RenderFramePngOptions = RenderFrameOptions & {
  outPath: string;
  deviceScaleFactor?: number;
  browser?: BrowserAdapter;
  autoClose?: boolean;
};

export type RenderFramesPngOptions = RenderFrameOptions & {
  outDir: string;
  startFrame?: number;
  endFrame?: number;
  framePattern?: string;
  deviceScaleFactor?: number;
  browser?: BrowserAdapter;
  autoClose?: boolean;
  onFrame?: (frame: number, path: string) => void;
};

export type RenderFramesHtmlOptions = RenderFrameOptions & {
  outDir: string;
  startFrame?: number;
  endFrame?: number;
  framePattern?: string;
  onFrame?: (frame: number, path: string) => void;
};

export type RenderFramesResult = {
  frames: Array<{ frame: number; path: string }>;
};

type BrowserAdapter = {
  newPage: () => Promise<PageAdapter>;
  close?: () => Promise<void>;
};

type PageAdapter = {
  setViewport: (options: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
  setContent: (html: string, options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }) => Promise<void>;
  screenshot: (options: { type: "png"; omitBackground?: boolean }) => Promise<Buffer>;
  close?: () => Promise<void>;
};

const ensureDir = (path: string) => {
  mkdirSync(path, { recursive: true });
};

export const renderFrameToHtml = ({ component: Component, config, frame, inputProps }: RenderFrameOptions): string => {
  const maxFrame = Math.max(0, config.durationFrames - 1);
  const clampedFrame = clamp(Math.round(frame), 0, maxFrame);
  const markup = renderToStaticMarkup(
    <RendererProvider frame={clampedFrame} config={config}>
      <Component {...(inputProps ?? {})} />
    </RendererProvider>,
  );
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    `<style>html,body{margin:0;padding:0;width:${config.width}px;height:${config.height}px;}</style>`,
    "</head>",
    `<body><div id="root" style="width:100%;height:100%">${markup}</div></body>`,
    "</html>",
  ].join("");
};

export const renderFrameToFile = ({ outPath, ...options }: RenderFrameFileOptions): string => {
  const html = renderFrameToHtml(options);
  ensureDir(dirname(outPath));
  writeFileSync(outPath, html);
  return html;
};

const loadPlaywright = async (): Promise<{ chromium: { launch: () => Promise<BrowserAdapter> } }> => {
  try {
    return (await import("playwright")) as { chromium: { launch: () => Promise<BrowserAdapter> } };
  } catch {
    try {
      return (await import("playwright-core")) as { chromium: { launch: () => Promise<BrowserAdapter> } };
    } catch {
      throw new Error("Playwright is required for PNG rendering. Install 'playwright' or 'playwright-core'.");
    }
  }
};

const formatFrameName = (pattern: string, frame: number): string => {
  const match = pattern.match(/%0(\d+)d/);
  if (match) {
    const width = Number(match[1]);
    const padded = String(frame).padStart(width, "0");
    return pattern.replace(match[0], padded);
  }
  if (pattern.includes("%d")) {
    return pattern.replace("%d", String(frame));
  }
  return pattern;
};

export const renderFrameToPng = async ({
  outPath,
  deviceScaleFactor = 1,
  browser,
  autoClose,
  ...options
}: RenderFramePngOptions): Promise<Buffer> => {
  const html = renderFrameToHtml(options);
  const providedBrowser = browser ?? (await loadPlaywright()).chromium.launch();
  const activeBrowser = await providedBrowser;
  const shouldClose = autoClose ?? !browser;
  const page = await activeBrowser.newPage();
  await page.setViewport({
    width: options.config.width,
    height: options.config.height,
    deviceScaleFactor,
  });
  await page.setContent(html, { waitUntil: "load" });
  const buffer = await page.screenshot({ type: "png" });
  await page.close?.();
  if (shouldClose) {
    await activeBrowser.close?.();
  }
  ensureDir(dirname(outPath));
  writeFileSync(outPath, buffer);
  return buffer;
};

export const renderFramesToPng = async ({
  outDir,
  startFrame = 0,
  endFrame,
  framePattern = "frame-%06d.png",
  deviceScaleFactor = 1,
  browser,
  autoClose,
  onFrame,
  ...options
}: RenderFramesPngOptions): Promise<RenderFramesResult> => {
  const lastFrame = Math.min(
    options.config.durationFrames - 1,
    endFrame ?? options.config.durationFrames - 1,
  );
  const firstFrame = Math.max(0, startFrame);
  if (lastFrame < firstFrame) {
    return { frames: [] };
  }
  const providedBrowser = browser ?? (await loadPlaywright()).chromium.launch();
  const activeBrowser = await providedBrowser;
  const shouldClose = autoClose ?? !browser;
  const page = await activeBrowser.newPage();
  await page.setViewport({
    width: options.config.width,
    height: options.config.height,
    deviceScaleFactor,
  });

  const frames: Array<{ frame: number; path: string }> = [];
  ensureDir(outDir);
  for (let frame = firstFrame; frame <= lastFrame; frame += 1) {
    const html = renderFrameToHtml({ ...options, frame });
    await page.setContent(html, { waitUntil: "load" });
    const buffer = await page.screenshot({ type: "png" });
    const fileName = formatFrameName(framePattern, frame);
    const outPath = join(outDir, fileName);
    ensureDir(dirname(outPath));
    writeFileSync(outPath, buffer);
    frames.push({ frame, path: outPath });
    onFrame?.(frame, outPath);
  }

  await page.close?.();
  if (shouldClose) {
    await activeBrowser.close?.();
  }

  return { frames };
};

export const renderFramesToHtml = ({
  outDir,
  startFrame = 0,
  endFrame,
  framePattern = "frame-%06d.html",
  onFrame,
  ...options
}: RenderFramesHtmlOptions): RenderFramesResult => {
  const lastFrame = Math.min(
    options.config.durationFrames - 1,
    endFrame ?? options.config.durationFrames - 1,
  );
  const firstFrame = Math.max(0, startFrame);
  if (lastFrame < firstFrame) {
    return { frames: [] };
  }

  const frames: Array<{ frame: number; path: string }> = [];
  ensureDir(outDir);
  for (let frame = firstFrame; frame <= lastFrame; frame += 1) {
    const html = renderFrameToHtml({ ...options, frame });
    const fileName = formatFrameName(framePattern, frame);
    const outPath = join(outDir, fileName);
    ensureDir(dirname(outPath));
    writeFileSync(outPath, html);
    frames.push({ frame, path: outPath });
    onFrame?.(frame, outPath);
  }

  return { frames };
};
