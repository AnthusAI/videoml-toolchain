import { DOMParser } from "@xmldom/xmldom";
import { ParseError } from "../errors.js";
import { applyVomPatches } from "./xml-patch.js";
import type {
  AudioPlan,
  ComponentSpec,
  CueSpec,
  LayerSpec,
  PauseSpec,
  SceneSpec,
  SemanticMarkup,
  TimeRange,
  VideoFileSpec,
  VisualStyles,
  VoiceSegmentSpec,
} from "./types.js";

const BUILTIN_TAGS = new Set([
  "video",
  "scene",
  "cue",
  "layer",
  "pause",
  "voice",
  "bullet",
  "voiceover",
  "sequence",
  "stack",
]);

type NodeLike = {
  nodeType: number;
};

type ElementLike = {
  nodeType: number;
  tagName: string;
  attributes: {
    length: number;
    item(index: number): { name: string; value: string } | null;
  };
  childNodes: ArrayLike<NodeLike>;
  textContent?: string | null;
};

const isElement = (node: NodeLike): node is ElementLike => node.nodeType === 1;

const getChildElements = (node: ElementLike): ElementLike[] =>
  Array.from(node.childNodes).filter(isElement);

const asElementLike = (node: unknown): ElementLike => node as unknown as ElementLike;

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const parseBoolean = (value: string) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const parseNumber = (value: string) => {
  if (!/^[-+]?\d+(\.\d+)?$/.test(value)) return null;
  return Number.parseFloat(value);
};

const parseJson = (value: string, context: string) => {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ParseError(`Invalid JSON in ${context}: ${message}`);
  }
};

const toCamelCase = (value: string) =>
  value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const toPascalCase = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

class MissingTimeReferenceError extends Error {}

type TimeEvalContext = {
  fps: number;
  getSceneStart: (id: string) => number | null;
  getSceneEnd: (id: string) => number | null;
  getCueStart: (id: string) => number | null;
  getPrevStart: () => number | null;
  getPrevEnd: () => number | null;
  getNextStart: () => number | null;
};

type Token =
  | { type: "number"; value: number; unit?: "f" | "s" | "ms" }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "dot" }
  | { type: "comma" };

type AstNode =
  | { kind: "number"; value: number; unit?: "f" | "s" | "ms" }
  | { kind: "identifier"; value: string }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: AstNode; right: AstNode }
  | { kind: "unary"; op: "+" | "-"; value: AstNode }
  | { kind: "call"; name: string; args: AstNode[] }
  | { kind: "property"; target: AstNode; prop: string };

const tokenizeTime = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  const pushNumber = (raw: string, unit?: "f" | "s" | "ms") => {
    tokens.push({ type: "number", value: Number.parseFloat(raw), unit });
  };
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      i += 1;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "operator", value: ch });
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i += 1;
      continue;
    }
    if (ch === ".") {
      tokens.push({ type: "dot" });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i += 1;
      continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(input[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < input.length && /[\d.]/.test(input[j] ?? "")) j += 1;
      const raw = input.slice(i, j);
      let unit: "f" | "s" | "ms" | undefined;
      if (input.slice(j, j + 2) === "ms") {
        unit = "ms";
        j += 2;
      } else if (input[j] === "f" || input[j] === "s") {
        unit = input[j] as "f" | "s";
        j += 1;
      }
      pushNumber(raw, unit);
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_-]/.test(input[j] ?? "")) j += 1;
      tokens.push({ type: "identifier", value: input.slice(i, j) });
      i = j;
      continue;
    }
    throw new ParseError(`Unexpected character "${ch}" in time expression.`);
  }
  return tokens;
};

const parseTimeExpression = (input: string): AstNode => {
  const tokens = tokenizeTime(input);
  let idx = 0;
  const peek = () => tokens[idx];
  const consume = () => tokens[idx++];

  const parsePrimary = (): AstNode => {
    const token = consume();
    if (!token) throw new ParseError("Unexpected end of time expression.");
    if (token.type === "number") {
      return { kind: "number", value: token.value, unit: token.unit };
    }
    if (token.type === "identifier") {
      let node: AstNode = { kind: "identifier", value: token.value };
      const next = peek();
      if (next?.type === "paren" && next.value === "(") {
        consume();
        const args: AstNode[] = [];
        const afterOpen = peek();
        if (!(afterOpen?.type === "paren" && afterOpen.value === ")")) {
          while (true) {
            args.push(parseExpression());
            const comma = peek();
            if (comma?.type === "comma") {
              consume();
              continue;
            }
            break;
          }
        }
        const closing = consume();
        if (!closing || closing.type !== "paren" || closing.value !== ")") {
          throw new ParseError("Expected closing ')' in time expression.");
        }
        node = { kind: "call", name: token.value, args };
      }
      while (true) {
        const dot = peek();
        if (!dot || dot.type !== "dot") {
          break;
        }
        consume();
        const prop = consume();
        if (!prop || prop.type !== "identifier") {
          throw new ParseError("Expected property name after '.'.");
        }
        node = { kind: "property", target: node, prop: prop.value };
      }
      return node;
    }
    if (token.type === "paren" && token.value === "(") {
      const expr = parseExpression();
      const closing = consume();
      if (!closing || closing.type !== "paren" || closing.value !== ")") {
        throw new ParseError("Expected closing ')' in time expression.");
      }
      return expr;
    }
    throw new ParseError("Invalid time expression.");
  };

  const parseUnary = (): AstNode => {
    const token = peek();
    if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
      consume();
      return { kind: "unary", op: token.value, value: parseUnary() };
    }
    return parsePrimary();
  };

  const parseTerm = (): AstNode => {
    let node = parseUnary();
    while (true) {
      const op = peek();
      if (!op || op.type !== "operator" || (op.value !== "*" && op.value !== "/")) {
        break;
      }
      consume();
      node = { kind: "binary", op: op.value, left: node, right: parseUnary() };
    }
    return node;
  };

  const parseExpression = (): AstNode => {
    let node = parseTerm();
    while (true) {
      const op = peek();
      if (!op || op.type !== "operator" || (op.value !== "+" && op.value !== "-")) {
        break;
      }
      consume();
      node = { kind: "binary", op: op.value, left: node, right: parseTerm() };
    }
    return node;
  };

  const expr = parseExpression();
  if (idx < tokens.length) {
    throw new ParseError("Unexpected token in time expression.");
  }
  return expr;
};

const evalTimeAst = (node: AstNode, ctx: TimeEvalContext): number => {
  switch (node.kind) {
    case "number": {
      if (!node.unit) return node.value;
      if (node.unit === "f") return node.value / ctx.fps;
      if (node.unit === "ms") return node.value / 1000;
      return node.value;
    }
    case "identifier": {
      if (node.value === "timeline") {
        throw new ParseError("timeline requires a property (e.g. timeline.start).");
      }
      throw new ParseError(`Unknown identifier "${node.value}" in time expression.`);
    }
    case "unary": {
      const val = evalTimeAst(node.value, ctx);
      return node.op === "-" ? -val : val;
    }
    case "binary": {
      const left = evalTimeAst(node.left, ctx);
      const right = evalTimeAst(node.right, ctx);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
      }
    }
    case "call": {
      const name = node.name;
      if (name === "min" || name === "max") {
        if (node.args.length < 2) {
          throw new ParseError(`${name} requires at least 2 arguments.`);
        }
        const values = node.args.map((arg) => evalTimeAst(arg, ctx));
        return name === "min" ? Math.min(...values) : Math.max(...values);
      }
      if (name === "clamp") {
        if (node.args.length !== 3) {
          throw new ParseError("clamp requires 3 arguments.");
        }
        const value = evalTimeAst(node.args[0], ctx);
        const min = evalTimeAst(node.args[1], ctx);
        const max = evalTimeAst(node.args[2], ctx);
        return Math.min(max, Math.max(min, value));
      }
      if (name === "snap") {
        if (node.args.length !== 2) {
          throw new ParseError("snap requires 2 arguments.");
        }
        const value = evalTimeAst(node.args[0], ctx);
        const grid = evalTimeAst(node.args[1], ctx);
        return grid === 0 ? value : Math.round(value / grid) * grid;
      }
      if (name === "scene") {
        const arg = node.args[0];
        if (!arg || arg.kind !== "identifier") {
          throw new ParseError("scene() requires an identifier argument.");
        }
        return ctx.getSceneStart(arg.value) ?? (() => { throw new MissingTimeReferenceError(`scene(${arg.value})`); })();
      }
      if (name === "cue") {
        const arg = node.args[0];
        if (!arg || arg.kind !== "identifier") {
          throw new ParseError("cue() requires an identifier argument.");
        }
        const value = ctx.getCueStart(arg.value);
        if (value == null) throw new MissingTimeReferenceError(`cue(${arg.value})`);
        return value;
      }
      throw new ParseError(`Unknown function "${name}".`);
    }
    case "property": {
      if (node.target.kind === "identifier" && node.target.value === "prev") {
        if (node.prop === "start") {
          const value = ctx.getPrevStart();
          if (value == null) throw new MissingTimeReferenceError("prev.start");
          return value;
        }
        if (node.prop === "end") {
          const value = ctx.getPrevEnd();
          if (value == null) throw new MissingTimeReferenceError("prev.end");
          return value;
        }
      }
      if (node.target.kind === "identifier" && node.target.value === "next") {
        if (node.prop === "start") {
          const value = ctx.getNextStart();
          if (value == null) throw new MissingTimeReferenceError("next.start");
          return value;
        }
      }
      if (node.target.kind === "identifier" && node.target.value === "timeline" && node.prop === "start") {
        return 0;
      }
      if (node.target.kind === "call" && node.target.name === "scene") {
        const arg = node.target.args[0];
        if (!arg || arg.kind !== "identifier") {
          throw new ParseError("scene() requires an identifier argument.");
        }
        if (node.prop === "start") {
          const value = ctx.getSceneStart(arg.value);
          if (value == null) throw new MissingTimeReferenceError(`scene(${arg.value}).start`);
          return value;
        }
        if (node.prop === "end") {
          const value = ctx.getSceneEnd(arg.value);
          if (value == null) throw new MissingTimeReferenceError(`scene(${arg.value}).end`);
          return value;
        }
      }
      throw new ParseError(`Unsupported property access ".${node.prop}".`);
    }
  }
};

const parseTimeValue = (value: string, ctx: TimeEvalContext): number => {
  const expr = parseTimeExpression(value.trim());
  return evalTimeAst(expr, ctx);
};

const parseAttributes = (element: ElementLike) => {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i += 1) {
    const attr = element.attributes.item(i);
    if (!attr) continue;
    attrs[attr.name] = attr.value;
  }
  return attrs;
};

const parseProps = (attrs: Record<string, string>, reserved: Set<string>) => {
  const props: Record<string, unknown> = {};
  if (attrs.props) {
    Object.assign(props, parseJson(attrs.props, "props attribute"));
  }
  for (const [rawKey, rawValue] of Object.entries(attrs)) {
    if (rawKey === "props" || reserved.has(rawKey)) continue;
    const key = toCamelCase(rawKey);
    const boolValue = parseBoolean(rawValue);
    if (boolValue != null) {
      props[key] = boolValue;
      continue;
    }
    const numValue = parseNumber(rawValue);
    if (numValue != null) {
      props[key] = numValue;
      continue;
    }
    props[key] = rawValue;
  }
  return props;
};

const parseStylesOrMarkup = (value: string | undefined, label: string) => {
  if (!value) return undefined;
  return parseJson(value, label);
};

const parseTiming = (attrs: Record<string, string>, ctx: TimeEvalContext) => {
  const startRaw = attrs.start;
  const endRaw = attrs.end;
  const durationRaw = attrs.duration;
  if (!startRaw && !endRaw && !durationRaw) return undefined;
  const start = startRaw ? parseTimeValue(startRaw, ctx) : (durationRaw ? 0 : undefined);
  const end = endRaw ? parseTimeValue(endRaw, ctx) : undefined;
  if (start != null && durationRaw && end == null) {
    const duration = parseTimeValue(durationRaw, ctx);
    return { startSec: start, endSec: start + duration };
  }
  return {
    startSec: start,
    endSec: end,
  };
};

const parseTimeRange = (attrs: Record<string, string>, ctx: TimeEvalContext, label: string): TimeRange | undefined => {
  const startRaw = attrs.start;
  const endRaw = attrs.end;
  const durationRaw = attrs.duration;
  if (!startRaw && !endRaw && !durationRaw) return undefined;
  if (!startRaw && (endRaw || durationRaw)) {
    throw new ParseError(`${label} timing requires start when end or duration is provided.`);
  }
  const start = startRaw ? parseTimeValue(startRaw, ctx) : undefined;
  const endExplicit = endRaw ? parseTimeValue(endRaw, ctx) : undefined;
  if (start != null && durationRaw && endExplicit == null) {
    const duration = parseTimeValue(durationRaw, ctx);
    return { start, end: start + duration };
  }
  if (start != null && endExplicit != null) {
    return { start, end: endExplicit };
  }
  if (start != null) {
    return { start };
  }
  return undefined;
};

const parsePause = (attrs: Record<string, string>, ctx: TimeEvalContext): PauseSpec => {
  if (attrs.seconds) {
    return {
      kind: "pause",
      mode: "fixed",
      seconds: parseTimeValue(attrs.seconds, ctx),
    };
  }
  if (attrs.mean && attrs.std) {
    const pause: PauseSpec = {
      kind: "pause",
      mode: "gaussian",
      mean: parseTimeValue(attrs.mean, ctx),
      std: parseTimeValue(attrs.std, ctx),
    };
    if (attrs.min) pause.min = parseTimeValue(attrs.min, ctx);
    if (attrs.max) pause.max = parseTimeValue(attrs.max, ctx);
    return pause;
  }
  throw new ParseError("pause requires seconds or mean+std attributes.");
};

const parseVoiceSegments = (cueEl: ElementLike, ctx: TimeEvalContext): VoiceSegmentSpec[] => {
  const segments: VoiceSegmentSpec[] = [];
  for (const child of getChildElements(cueEl)) {
    if (child.tagName === "voice") {
      const text = normalizeText(child.textContent);
      if (!text) continue;
      const attrs = parseAttributes(child);
      const trimEnd = attrs["trim-end"];
      segments.push({
        kind: "text",
        text,
        trimEndSec: trimEnd ? parseTimeValue(trimEnd, ctx) : undefined,
      });
      continue;
    }
    if (child.tagName === "pause") {
      const attrs = parseAttributes(child);
      segments.push({ kind: "pause", pause: parsePause(attrs, ctx) });
      continue;
    }
  }
  return segments;
};

const parseCue = (cueEl: ElementLike, ctx: TimeEvalContext): CueSpec => {
  const attrs = parseAttributes(cueEl);
  const id = attrs.id;
  if (!id) {
    throw new ParseError("cue tag requires id attribute.");
  }
  const label = attrs.label ?? id;
  const provider = attrs.provider ?? null;
  const segments = parseVoiceSegments(cueEl, ctx);
  const time = parseTimeRange(attrs, ctx, `cue "${id}"`);
  const bullets = getChildElements(cueEl)
    .filter((child) => child.tagName === "bullet")
    .map((child) => normalizeText(child.textContent))
    .filter(Boolean);

  return {
    kind: "cue",
    id,
    label,
    segments,
    bullets,
    provider,
    time,
  };
};

const parseComponent = (
  element: ElementLike,
  ctx: TimeEvalContext,
  componentIndex: number,
): ComponentSpec => {
  const attrs = parseAttributes(element);
  const reserved = new Set(["id", "visible", "z", "start", "end", "duration", "styles", "markup", "props"]);
  const rawId = attrs.id;
  const id = rawId ?? `${element.tagName}-${componentIndex}`;
  const visible = attrs.visible ? parseBoolean(attrs.visible) ?? true : undefined;
  const zIndex = attrs.z ? parseNumber(attrs.z) ?? undefined : undefined;
  const timing = parseTiming(attrs, ctx);
  const styles = parseStylesOrMarkup(attrs.styles, "styles attribute") as VisualStyles | undefined;
  const markup = parseStylesOrMarkup(attrs.markup, "markup attribute") as SemanticMarkup | undefined;
  const props = parseProps(attrs, reserved);
  const type = toPascalCase(element.tagName);

  return {
    id,
    type,
    props,
    styles,
    markup,
    zIndex,
    visible,
    timing: timing
      ? {
          startSec: timing.startSec,
          endSec: timing.endSec,
        }
      : undefined,
  };
};

const DEFAULT_SEQUENCE_CHILD_SECONDS = 1;

const parseContainerTiming = (attrs: Record<string, string>, ctx: TimeEvalContext) => {
  const startRaw = attrs.start;
  const endRaw = attrs.end;
  const durationRaw = attrs.duration;
  if (!startRaw && !endRaw && !durationRaw) return { startSec: 0, endSec: undefined };
  const start = startRaw ? parseTimeValue(startRaw, ctx) : 0;
  const end = endRaw ? parseTimeValue(endRaw, ctx) : undefined;
  if (durationRaw && end == null) {
    const duration = parseTimeValue(durationRaw, ctx);
    return { startSec: start, endSec: start + duration };
  }
  return { startSec: start, endSec: end };
};

const mergeCascaded = <T extends Record<string, unknown> | undefined>(
  parent: T,
  child: T,
): T => {
  if (!parent) return child;
  if (!child) return parent;
  return { ...parent, ...child } as T;
};

const parseContainerChildren = (
  element: ElementLike,
  ctx: TimeEvalContext,
  componentIndex: number,
  containerStart: number,
  flow: "sequence" | "stack",
  inheritedStyles?: VisualStyles,
  inheritedMarkup?: SemanticMarkup,
): { components: ComponentSpec[]; componentIndex: number; maxEnd?: number } => {
  const components: ComponentSpec[] = [];
  let cursor = containerStart;
  let maxEnd: number | undefined = undefined;
  const containerAttrs = parseAttributes(element);
  const containerStyles = parseStylesOrMarkup(containerAttrs.styles, "styles attribute") as
    | VisualStyles
    | undefined;
  const containerMarkup = parseStylesOrMarkup(containerAttrs.markup, "markup attribute") as
    | SemanticMarkup
    | undefined;
  const cascadedStyles = mergeCascaded(inheritedStyles, containerStyles);
  const cascadedMarkup = mergeCascaded(inheritedMarkup, containerMarkup);

  for (const child of getChildElements(element)) {
    if (BUILTIN_TAGS.has(child.tagName) && child.tagName !== "sequence" && child.tagName !== "stack") {
      continue;
    }

      if (child.tagName === "sequence" || child.tagName === "stack") {
        const childAttrs = parseAttributes(child);
        const childTiming = parseContainerTiming(childAttrs, ctx);
        const childStart = containerStart + (childTiming.startSec ?? 0);
        const nested = parseContainerChildren(
          child,
          ctx,
          componentIndex,
          flow === "sequence" ? cursor : childStart,
          child.tagName as "sequence" | "stack",
          cascadedStyles,
          cascadedMarkup,
        );
        components.push(...nested.components);
        componentIndex = nested.componentIndex;
      if (flow === "sequence") {
        cursor = nested.maxEnd ?? cursor;
      } else if (nested.maxEnd != null) {
        maxEnd = maxEnd == null ? nested.maxEnd : Math.max(maxEnd, nested.maxEnd);
      }
      continue;
    }

    const attrs = parseAttributes(child);
    const parsed = parseComponent(child, ctx, componentIndex);
    parsed.styles = mergeCascaded(cascadedStyles, parsed.styles as VisualStyles | undefined);
    parsed.markup = mergeCascaded(cascadedMarkup, parsed.markup as SemanticMarkup | undefined);
    componentIndex += 1;

    const startOffset = attrs.start ? parseTimeValue(attrs.start, ctx) : undefined;
    const endOffset = attrs.end ? parseTimeValue(attrs.end, ctx) : undefined;
    const durationValue = attrs.duration ? parseTimeValue(attrs.duration, ctx) : undefined;

    const baseStart = flow === "sequence" ? cursor : containerStart;
    const childStart = baseStart + (startOffset ?? 0);
    let childEnd: number | undefined;

    if (durationValue != null) {
      childEnd = childStart + durationValue;
    } else if (endOffset != null) {
      childEnd = containerStart + endOffset;
    } else if (flow === "sequence") {
      childEnd = childStart + DEFAULT_SEQUENCE_CHILD_SECONDS;
    }

    if (childStart != null || childEnd != null) {
      parsed.timing = {
        startSec: childStart,
        endSec: childEnd,
      };
    }

    components.push(parsed);

    if (flow === "sequence") {
      cursor = childEnd ?? cursor;
    } else if (childEnd != null) {
      maxEnd = maxEnd == null ? childEnd : Math.max(maxEnd, childEnd);
    }
  }

  if (flow === "sequence") {
    maxEnd = cursor;
  }

  return { components, componentIndex, maxEnd };
};

const parseLayer = (layerEl: ElementLike, ctx: TimeEvalContext): LayerSpec => {
  const attrs = parseAttributes(layerEl);
  const id = attrs.id;
  if (!id) {
    throw new ParseError("layer tag requires id attribute.");
  }
  const visible = attrs.visible ? parseBoolean(attrs.visible) ?? true : undefined;
  const zIndex = attrs.z ? parseNumber(attrs.z) ?? undefined : undefined;
  const timing = parseTiming(attrs, ctx);
  const styles = parseStylesOrMarkup(attrs.styles, "styles attribute") as VisualStyles | undefined;
  const markup = parseStylesOrMarkup(attrs.markup, "markup attribute") as SemanticMarkup | undefined;

  const components: ComponentSpec[] = [];
  const children = getChildElements(layerEl);
  let componentIndex = 0;
  for (const child of children) {
    if (child.tagName === "sequence" || child.tagName === "stack") {
      const containerAttrs = parseAttributes(child);
      const containerTiming = parseContainerTiming(containerAttrs, ctx);
      const containerStart = containerTiming.startSec ?? 0;
      const parsed = parseContainerChildren(
        child,
        ctx,
        componentIndex,
        containerStart,
        child.tagName as "sequence" | "stack",
        undefined,
        undefined,
      );
      components.push(...parsed.components);
      componentIndex = parsed.componentIndex;
      continue;
    }
    if (BUILTIN_TAGS.has(child.tagName)) {
      continue;
    }
    components.push(parseComponent(child, ctx, componentIndex));
    componentIndex += 1;
  }

  return {
    id,
    styles,
    markup,
    timing: timing
      ? {
          startSec: timing.startSec,
          endSec: timing.endSec,
        }
      : undefined,
    visible,
    zIndex,
    components,
  };
};

const parseScene = (sceneEl: ElementLike, ctx: TimeEvalContext): SceneSpec => {
  const attrs = parseAttributes(sceneEl);
  const id = attrs.id;
  if (!id) {
    throw new ParseError("scene tag requires id attribute.");
  }
  const title = attrs.title ?? id;
  const time = parseTimeRange(attrs, ctx, `scene "${id}"`);
  const styles = parseStylesOrMarkup(attrs.styles, "styles attribute") as VisualStyles | undefined;
  const markup = parseStylesOrMarkup(attrs.markup, "markup attribute") as SemanticMarkup | undefined;

  const items: Array<CueSpec | PauseSpec> = [];
  let cueCount = 0;
  const layers: LayerSpec[] = [];
  const components: ComponentSpec[] = [];
  let componentIndex = 0;

  for (const child of getChildElements(sceneEl)) {
    if (child.tagName === "cue") {
      items.push(parseCue(child, ctx));
      cueCount += 1;
      continue;
    }
    if (child.tagName === "pause") {
      items.push(parsePause(parseAttributes(child), ctx));
      continue;
    }
    if (child.tagName === "layer") {
      layers.push(parseLayer(child, ctx));
      continue;
    }
    if (child.tagName === "sequence" || child.tagName === "stack") {
      const containerAttrs = parseAttributes(child);
      const containerTiming = parseContainerTiming(containerAttrs, ctx);
      const containerStart = containerTiming.startSec ?? 0;
      const parsed = parseContainerChildren(
        child,
        ctx,
        componentIndex,
        containerStart,
        child.tagName as "sequence" | "stack",
        undefined,
        undefined,
      );
      components.push(...parsed.components);
      componentIndex = parsed.componentIndex;
      continue;
    }
    if (!BUILTIN_TAGS.has(child.tagName)) {
      components.push(parseComponent(child, ctx, componentIndex));
      componentIndex += 1;
    }
  }

  // Cues are optional in V3 (visual-only scenes are allowed).

  return {
    id,
    title,
    time,
    items,
    styles,
    markup,
    layers: layers.length > 0 ? layers : undefined,
    components: components.length > 0 ? components : undefined,
  };
};

export const loadVideoFileFromXml = (xml: string): VideoFileSpec => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "videoml") {
    throw new ParseError("XML root must be <videoml>.");
  }

  const attrs = parseAttributes(asElementLike(root));
  const id = attrs.id;
  if (!id) {
    throw new ParseError("video tag requires id attribute.");
  }
  const title = attrs.title ?? null;
  const fps = attrs.fps ? parseNumber(attrs.fps) ?? 30 : 30;
  const width = attrs.width ? parseNumber(attrs.width) ?? 1280 : 1280;
  const height = attrs.height ? parseNumber(attrs.height) ?? 720 : 720;
  const baseCtx: TimeEvalContext = {
    fps,
    getSceneStart: () => null,
    getSceneEnd: () => null,
    getCueStart: () => null,
    getPrevStart: () => null,
    getPrevEnd: () => null,
    getNextStart: () => null,
  };
  const duration = attrs.duration ? parseTimeValue(attrs.duration, baseCtx) : undefined;
  const poster = attrs.poster ? parseTimeValue(attrs.poster, baseCtx) : undefined;

  const scenes: SceneSpec[] = [];
  let voiceover: VideoFileSpec["compositions"][number]["voiceover"] | undefined;
  const sceneStartIndex = new Map<string, number>();
  const sceneEndIndex = new Map<string, number>();
  const sceneElements = getChildElements(asElementLike(root)).filter((child) => child.tagName === "scene");
  const cueStartIndex = new Map<string, number>();

  const pending = new Set(sceneElements.keys());
  let passes = 0;
  while (pending.size > 0) {
    let progressed = false;
    const snapshot = Array.from(pending);
    for (const index of snapshot) {
      const child = sceneElements[index];
      const prevScene = index > 0 ? scenes[index - 1] : null;
      const nextElement = index + 1 < sceneElements.length ? sceneElements[index + 1] : null;
      const ctx: TimeEvalContext = {
        fps,
        getSceneStart: (sceneId) => sceneStartIndex.get(sceneId) ?? null,
        getSceneEnd: (sceneId) => sceneEndIndex.get(sceneId) ?? null,
        getCueStart: (cueId) => cueStartIndex.get(cueId) ?? null,
        getPrevStart: () => (prevScene ? sceneStartIndex.get(prevScene.id) ?? null : null),
        getPrevEnd: () => (prevScene ? sceneEndIndex.get(prevScene.id) ?? null : null),
        getNextStart: () => {
          if (!nextElement) return null;
          const nextId = parseAttributes(nextElement).id;
          return nextId ? sceneStartIndex.get(nextId) ?? null : null;
        },
      };
      try {
        const scene = parseScene(child, ctx);
        scenes[index] = scene;
        if (scene.time?.start != null) {
          sceneStartIndex.set(scene.id, scene.time.start);
        }
        if (scene.time?.end != null) {
          sceneEndIndex.set(scene.id, scene.time.end);
        }
        for (const item of scene.items) {
          if ("kind" in item && item.kind === "cue" && item.time?.start != null) {
            cueStartIndex.set(item.id, item.time.start);
          }
        }
        pending.delete(index);
        progressed = true;
      } catch (err) {
        if (!(err instanceof MissingTimeReferenceError)) {
          throw err;
        }
      }
    }
    passes += 1;
    if (!progressed) {
      const unresolved = Array.from(pending)
        .map((idx) => parseAttributes(sceneElements[idx]).id ?? `scene#${idx}`)
        .join(", ");
      throw new ParseError(`Unresolved time references for scenes: ${unresolved}`);
    }
    if (passes > sceneElements.length + 2) {
      throw new ParseError("Time resolution did not converge.");
    }
  }

  for (const child of getChildElements(asElementLike(root))) {
    if (child.tagName === "voiceover") {
      const voiceoverAttrs = parseAttributes(child);
      voiceover = {
        provider: voiceoverAttrs.provider ?? undefined,
        voice: voiceoverAttrs.voice ?? undefined,
        model: voiceoverAttrs.model ?? undefined,
        format: voiceoverAttrs.format ?? undefined,
        sampleRateHz: voiceoverAttrs.sampleRateHz ? parseNumber(voiceoverAttrs.sampleRateHz) ?? undefined : undefined,
        seed: voiceoverAttrs.seed ? parseNumber(voiceoverAttrs.seed) ?? undefined : undefined,
        leadInSeconds: voiceoverAttrs.leadInSeconds
          ? parseTimeValue(voiceoverAttrs.leadInSeconds, baseCtx)
          : undefined,
        trimEndSeconds: voiceoverAttrs.trimEndSeconds
          ? parseTimeValue(voiceoverAttrs.trimEndSeconds, baseCtx)
          : undefined,
      };
    }
  }

  if (scenes.length === 0) {
    throw new ParseError("videoml requires at least one scene.");
  }

  const cueIds = new Set<string>();
  for (const scene of scenes) {
    for (const item of scene.items) {
      if ("kind" in item && item.kind === "cue") {
        if (cueIds.has(item.id)) {
          throw new ParseError(`Duplicate cue id across scenes: "${item.id}".`);
        }
        cueIds.add(item.id);
      }
    }
  }

  const composition = {
    id,
    title,
    meta: {
      fps,
      width,
      height,
      durationSeconds: duration,
    },
    posterTime: poster ?? undefined,
    voiceover,
    scenes,
  };

  const videoFile: VideoFileSpec = {
    compositions: [composition],
  };

  return videoFile;
};

export const loadVideoFileFromXmlWithPatches = (
  xml: string,
  patches: Array<import("./xml-patch.js").VomPatch>,
  opts?: { enforceSealed?: boolean },
): VideoFileSpec => {
  const nextXml = applyVomPatches(xml, patches, { enforceSealed: opts?.enforceSealed });
  return loadVideoFileFromXml(nextXml);
};

export const getXmlAudioPlan = (_root: ElementLike): AudioPlan | undefined => {
  return undefined;
};
