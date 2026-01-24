import { mkdirSync, writeFileSync } from "fs";
import { cpus } from "os";
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
  workers?: number;
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
  newContext?: (options: {
    viewport: { width: number; height: number };
    deviceScaleFactor?: number;
  }) => Promise<BrowserContextAdapter>;
  close?: () => Promise<void>;
};

type BrowserContextAdapter = {
  newPage: () => Promise<PageAdapter>;
  close?: () => Promise<void>;
};

type PageAdapter = {
  setViewport?: (options: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
  setViewportSize?: (options: { width: number; height: number }) => Promise<void>;
  setContent: (html: string, options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }) => Promise<void>;
  screenshot: (options: { type: "png"; omitBackground?: boolean }) => Promise<Buffer>;
  close?: () => Promise<void>;
};

const ensureDir = (path: string) => {
  mkdirSync(path, { recursive: true });
};

const applyViewport = async (
  page: PageAdapter,
  options: { width: number; height: number; deviceScaleFactor?: number },
): Promise<void> => {
  if (page.setViewport) {
    await page.setViewport(options);
    return;
  }
  if (page.setViewportSize) {
    await page.setViewportSize({ width: options.width, height: options.height });
    return;
  }
  throw new Error("Page does not support viewport sizing.");
};

const createPage = async (
  browser: BrowserAdapter,
  options: { width: number; height: number; deviceScaleFactor?: number },
): Promise<{ page: PageAdapter; closeContext?: () => Promise<void> }> => {
  if (browser.newContext) {
    const context = await browser.newContext({
      viewport: { width: options.width, height: options.height },
      deviceScaleFactor: options.deviceScaleFactor,
    });
    const page = await context.newPage();
    return {
      page,
      closeContext: async () => {
        await context.close?.();
      },
    };
  }
  const page = await browser.newPage();
  return { page };
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

const resolveWorkerCount = (workers?: number): number => {
  if (workers == null) {
    return Math.max(1, Math.min(4, cpus().length || 1));
  }
  if (!Number.isFinite(workers) || workers <= 1) {
    return 1;
  }
  return Math.max(1, Math.floor(workers));
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
  const { page, closeContext } = await createPage(activeBrowser, {
    width: options.config.width,
    height: options.config.height,
    deviceScaleFactor,
  });
  await applyViewport(page, {
    width: options.config.width,
    height: options.config.height,
    deviceScaleFactor,
  });
  await page.setContent(html, { waitUntil: "load" });
  const buffer = await page.screenshot({ type: "png" });
  await page.close?.();
  await closeContext?.();
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
  workers,
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

  const frames: Array<{ frame: number; path: string }> = [];
  ensureDir(outDir);
  const totalFrames = lastFrame - firstFrame + 1;
  const workerCount = Math.min(resolveWorkerCount(workers), totalFrames);
  const nextFrameRef = { value: firstFrame };

  const takeNextFrame = () => {
    if (nextFrameRef.value > lastFrame) {
      return null;
    }
    const next = nextFrameRef.value;
    nextFrameRef.value += 1;
    return next;
  };

  const renderWithPage = async (page: PageAdapter) => {
    for (;;) {
      const frame = takeNextFrame();
      if (frame == null) {
        return;
      }
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
  };

  const workersPool = await Promise.all(
    Array.from({ length: workerCount }, async () => {
      const { page, closeContext } = await createPage(activeBrowser, {
        width: options.config.width,
        height: options.config.height,
        deviceScaleFactor,
      });
      await applyViewport(page, {
        width: options.config.width,
        height: options.config.height,
        deviceScaleFactor,
      });
      return { page, closeContext };
    }),
  );

  await Promise.all(
    workersPool.map(async ({ page, closeContext }) => {
      try {
        await renderWithPage(page);
      } finally {
        await page.close?.();
        await closeContext?.();
      }
    }),
  );

  if (shouldClose) {
    await activeBrowser.close?.();
  }

  frames.sort((a, b) => a.frame - b.frame);
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
