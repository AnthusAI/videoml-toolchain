import type { OrgMemberRole, UsageVisibilityMode } from "./index.ts";

export type OrgPermission =
  | "org:read"
  | "org:manage"
  | "org:invite"
  | "org:roles"
  | "project:read"
  | "project:create"
  | "project:edit"
  | "video:read"
  | "video:create"
  | "video:edit"
  | "video:render"
  | "storyboard:read"
  | "storyboard:edit"
  | "asset:read"
  | "asset:upload"
  | "asset:delete"
  | "run:read"
  | "run:cancel"
  | "usage:view:redacted"
  | "usage:view:full"
  | "billing:manage";

const VIEWER_PERMISSIONS: OrgPermission[] = [
  "org:read",
  "project:read",
  "video:read",
  "storyboard:read",
  "asset:read",
  "run:read",
  "usage:view:redacted",
];

const EDITOR_PERMISSIONS: OrgPermission[] = [
  ...VIEWER_PERMISSIONS,
  "project:create",
  "project:edit",
  "video:create",
  "video:edit",
  "video:render",
  "storyboard:edit",
  "asset:upload",
  "asset:delete",
  "run:cancel",
];

const ADMIN_PERMISSIONS: OrgPermission[] = [
  ...EDITOR_PERMISSIONS,
  "org:invite",
  "org:roles",
  "usage:view:full",
];

const OWNER_PERMISSIONS: OrgPermission[] = [
  ...ADMIN_PERMISSIONS,
  "org:manage",
  "billing:manage",
];

const ROLE_PERMISSIONS: Record<OrgMemberRole, OrgPermission[]> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  editor: EDITOR_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
};

export const listPermissions = (role: OrgMemberRole): OrgPermission[] => {
  return [...ROLE_PERMISSIONS[role]];
};

export const can = (role: OrgMemberRole, permission: OrgPermission): boolean => {
  return ROLE_PERMISSIONS[role].includes(permission);
};

export const resolveUsageVisibility = (
  role: OrgMemberRole,
  mode: UsageVisibilityMode,
): UsageVisibilityMode => {
  if (mode === "redacted") {
    return "redacted";
  }
  return can(role, "usage:view:full") ? "full" : "redacted";
};
