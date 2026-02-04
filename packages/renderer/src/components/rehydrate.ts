import React from "react";

/**
 * Revive plain-object React element snapshots (JSON-serialized) back into real React elements.
 * This allows generated script JSON to safely represent JSX-like structures.
 */
export const reviveNode = (node: any): React.ReactNode => {
  if (node == null || typeof node === "boolean") return null;

  if (React.isValidElement(node)) return node;

  if (Array.isArray(node)) {
    return node.map((child) => reviveNode(child) ?? null);
  }

  if (typeof node === "object" && "type" in node) {
    const { type, props = {} } = node as any;
    const children = reviveNode(props.children);
    const { children: _omit, ...rest } = props;
    return React.createElement(type as any, rest, children as any);
  }

  return node;
};
