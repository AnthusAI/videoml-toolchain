import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { ParseError } from "../errors.js";

export type VomPatch =
  | { op: "appendNode"; parentId: string; nodeXml: string; index?: number }
  | { op: "removeNode"; nodeId: string }
  | { op: "setAttr"; nodeId: string; name: string; value: string | null }
  | { op: "setText"; nodeId: string; textContent: string }
  | { op: "replaceSubtree"; nodeId: string; nodeXml: string }
  | { op: "sealScene"; sceneId: string };

type PatchOptions = {
  enforceSealed?: boolean;
};

type NodeLike = {
  nodeType: number;
  parentNode: NodeLike | null;
  childNodes: ArrayLike<NodeLike> | null;
};

type ElementLike = NodeLike & {
  tagName?: string;
  getAttribute?: (name: string) => string | null;
  setAttribute?: (name: string, value: string) => void;
  removeAttribute?: (name: string) => void;
  appendChild?: (child: NodeLike) => void;
  insertBefore?: (child: NodeLike, ref: NodeLike | null) => void;
  replaceChild?: (newChild: NodeLike, oldChild: NodeLike) => void;
};

const isElementNode = (node: NodeLike | null | undefined): node is ElementLike =>
  Boolean(node && node.nodeType === 1);

const walkElements = (root: ElementLike, visit: (el: ElementLike) => void): void => {
  const stack: ElementLike[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    visit(node);
    const children = Array.from(node.childNodes ?? []).filter(isElementNode);
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }
};

const findById = (root: ElementLike, id: string): ElementLike | null => {
  let found: ElementLike | null = null;
  walkElements(root, (el) => {
    if (found) return;
    if (el.getAttribute?.("id") === id) {
      found = el;
    }
  });
  return found;
};

const findSceneAncestor = (node: ElementLike): ElementLike | null => {
  let current: NodeLike | null = node;
  while (current) {
    if (isElementNode(current) && current.tagName === "scene") {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const assertNotSealed = (root: ElementLike, node: ElementLike, opts?: PatchOptions) => {
  if (!opts?.enforceSealed) return;
  const scene = findSceneAncestor(node);
  if (!scene) return;
  const sealed = scene.getAttribute?.("sealed") ?? scene.getAttribute?.("data-sealed");
  if (sealed === "true") {
    const sceneId = scene.getAttribute?.("id") ?? "unknown";
    throw new ParseError(`Cannot patch sealed scene "${sceneId}".`);
  }
};

const requireMethod = <T extends Function>(
  target: unknown,
  name: string,
  op: string
): T => {
  const value = (target as Record<string, unknown> | null | undefined)?.[name];
  if (typeof value !== "function") {
    throw new ParseError(`${op}: missing DOM method "${name}".`);
  }
  return value as T;
};

const parseFragment = (nodeXml: string): ElementLike => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<root>${nodeXml}</root>`, "text/xml");
  const root = doc.documentElement as unknown as ElementLike;
  const firstChild = Array.from(root.childNodes ?? []).find(isElementNode);
  if (!firstChild) {
    throw new ParseError("nodeXml must contain a single root element.");
  }
  return firstChild as ElementLike;
};

export const applyVomPatches = (xml: string, patches: VomPatch[], opts?: PatchOptions): string => {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement as unknown as ElementLike;
  if (!root || root.tagName !== "videoml") {
    throw new ParseError("XML root must be <videoml>.");
  }

  for (const patch of patches) {
    switch (patch.op) {
      case "appendNode": {
        const parent = findById(root, patch.parentId);
        if (!parent) throw new ParseError(`appendNode: parent "${patch.parentId}" not found.`);
        assertNotSealed(root, parent, opts);
        const newNode = parseFragment(patch.nodeXml);
        const imported = doc.importNode ? doc.importNode(newNode as any, true) : (newNode as any);
        const children = Array.from(parent.childNodes ?? []).filter(isElementNode);
        if (patch.index == null || patch.index >= children.length) {
          requireMethod<(child: NodeLike) => void>(parent, "appendChild", "appendNode")(imported);
        } else {
          requireMethod<(child: NodeLike, ref: NodeLike | null) => void>(
            parent,
            "insertBefore",
            "appendNode"
          )(imported, children[patch.index] as any);
        }
        break;
      }
      case "removeNode": {
        const target = findById(root, patch.nodeId);
        if (!target || !target.parentNode) {
          throw new ParseError(`removeNode: node "${patch.nodeId}" not found.`);
        }
        assertNotSealed(root, target, opts);
        requireMethod<(child: NodeLike) => void>(target.parentNode, "removeChild", "removeNode")(
          target as any
        );
        break;
      }
      case "setAttr": {
        const target = findById(root, patch.nodeId);
        if (!target) throw new ParseError(`setAttr: node "${patch.nodeId}" not found.`);
        assertNotSealed(root, target, opts);
        if (patch.value == null) {
          requireMethod<(name: string) => void>(target, "removeAttribute", "setAttr")(patch.name);
        } else {
          requireMethod<(name: string, value: string) => void>(target, "setAttribute", "setAttr")(
            patch.name,
            patch.value
          );
        }
        break;
      }
      case "setText": {
        const target = findById(root, patch.nodeId);
        if (!target) throw new ParseError(`setText: node "${patch.nodeId}" not found.`);
        assertNotSealed(root, target, opts);
        (target as any).textContent = patch.textContent;
        break;
      }
      case "replaceSubtree": {
        const target = findById(root, patch.nodeId);
        if (!target || !target.parentNode) {
          throw new ParseError(`replaceSubtree: node "${patch.nodeId}" not found.`);
        }
        assertNotSealed(root, target, opts);
        const newNode = parseFragment(patch.nodeXml);
        const imported = doc.importNode ? doc.importNode(newNode as any, true) : (newNode as any);
        requireMethod<(newChild: NodeLike, oldChild: NodeLike) => void>(
          target.parentNode,
          "replaceChild",
          "replaceSubtree"
        )(imported, target as any);
        break;
      }
      case "sealScene": {
        const scene = findById(root, patch.sceneId);
        if (!scene || scene.tagName !== "scene") {
          throw new ParseError(`sealScene: scene "${patch.sceneId}" not found.`);
        }
        requireMethod<(name: string, value: string) => void>(scene, "setAttribute", "sealScene")(
          "sealed",
          "true"
        );
        break;
      }
    }
  }

  return serializer.serializeToString(doc);
};
