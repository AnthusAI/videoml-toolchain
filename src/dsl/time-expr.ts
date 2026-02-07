import { ParseError } from "../errors.js";

export class MissingTimeReferenceError extends Error {}

export type TimeEvalContext = {
  fps: number;
  getSceneStart: (id: string) => number | null;
  getSceneEnd: (id: string) => number | null;
  getCueStart: (id: string) => number | null;
  getMarkStart: (id: string) => number | null;
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
      if (name === "mark") {
        const arg = node.args[0];
        if (!arg || arg.kind !== "identifier") {
          throw new ParseError("mark() requires an identifier argument.");
        }
        const value = ctx.getMarkStart(arg.value);
        if (value == null) throw new MissingTimeReferenceError(`mark(${arg.value})`);
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

export const parseTimeValue = (value: string, ctx: TimeEvalContext): number => {
  const expr = parseTimeExpression(value.trim());
  return evalTimeAst(expr, ctx);
};
