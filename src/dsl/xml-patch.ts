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

const isElementNode = (node: Node): node is Element => node.nodeType === 1;

const walkElements = (root: Element, visit: (el: Element) => void): void => {
  const stack: Element[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    visit(node);
    const children = Array.from(node.childNodes).filter(isElementNode) as Element[];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }
};

const findById = (root: Element, id: string): Element | null => {
  let found: Element | null = null;
  walkElements(root, (el) => {
    if (found) return;
    if (el.getAttribute("id") === id) {
      found = el;
    }
  });
  return found;
};

const findSceneAncestor = (node: Element): Element | null => {
  let current: Node | null = node;
  while (current) {
    if (isElementNode(current) && current.tagName === "scene") {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const assertNotSealed = (root: Element, node: Element, opts?: PatchOptions) => {
  if (!opts?.enforceSealed) return;
  const scene = findSceneAncestor(node);
  if (!scene) return;
  const sealed = scene.getAttribute("sealed") ?? scene.getAttribute("data-sealed");
  if (sealed === "true") {
    const sceneId = scene.getAttribute("id") ?? "unknown";
    throw new ParseError(`Cannot patch sealed scene "${sceneId}".`);
  }
};

const parseFragment = (nodeXml: string): Element => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<root>${nodeXml}</root>`, "text/xml");
  const root = doc.documentElement;
  const firstChild = Array.from(root.childNodes).find(isElementNode);
  if (!firstChild) {
    throw new ParseError("nodeXml must contain a single root element.");
  }
  return firstChild as Element;
};

export const applyVomPatches = (xml: string, patches: VomPatch[], opts?: PatchOptions): string => {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root || root.tagName !== "video") {
    throw new ParseError("XML root must be <video>.");
  }

  for (const patch of patches) {
    switch (patch.op) {
      case "appendNode": {
        const parent = findById(root, patch.parentId);
        if (!parent) throw new ParseError(`appendNode: parent "${patch.parentId}" not found.`);
        assertNotSealed(root, parent, opts);
        const newNode = parseFragment(patch.nodeXml);
        const imported = doc.importNode ? doc.importNode(newNode, true) : (newNode as Node);
        const children = Array.from(parent.childNodes).filter(isElementNode);
        if (patch.index == null || patch.index >= children.length) {
          parent.appendChild(imported);
        } else {
          parent.insertBefore(imported, children[patch.index]);
        }
        break;
      }
      case "removeNode": {
        const target = findById(root, patch.nodeId);
        if (!target || !target.parentNode) {
          throw new ParseError(`removeNode: node "${patch.nodeId}" not found.`);
        }
        assertNotSealed(root, target, opts);
        target.parentNode.removeChild(target);
        break;
      }
      case "setAttr": {
        const target = findById(root, patch.nodeId);
        if (!target) throw new ParseError(`setAttr: node "${patch.nodeId}" not found.`);
        assertNotSealed(root, target, opts);
        if (patch.value == null) {
          target.removeAttribute(patch.name);
        } else {
          target.setAttribute(patch.name, patch.value);
        }
        break;
      }
      case "setText": {
        const target = findById(root, patch.nodeId);
        if (!target) throw new ParseError(`setText: node "${patch.nodeId}" not found.`);
        assertNotSealed(root, target, opts);
        target.textContent = patch.textContent;
        break;
      }
      case "replaceSubtree": {
        const target = findById(root, patch.nodeId);
        if (!target || !target.parentNode) {
          throw new ParseError(`replaceSubtree: node "${patch.nodeId}" not found.`);
        }
        assertNotSealed(root, target, opts);
        const newNode = parseFragment(patch.nodeXml);
        const imported = doc.importNode ? doc.importNode(newNode, true) : (newNode as Node);
        target.parentNode.replaceChild(imported, target);
        break;
      }
      case "sealScene": {
        const scene = findById(root, patch.sceneId);
        if (!scene || scene.tagName !== "scene") {
          throw new ParseError(`sealScene: scene "${patch.sceneId}" not found.`);
        }
        scene.setAttribute("sealed", "true");
        break;
      }
    }
  }

  return serializer.serializeToString(doc);
};
