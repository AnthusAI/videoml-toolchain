import type { OrgMemberRole } from "./index.ts";
import { can, type OrgPermission } from "./rbac.ts";
import { requireOrgAccess, resolveActiveOrgId, type OrgMembership } from "./tenancy.ts";

export type ActiveSession = {
  userId: string;
  activeOrgId: string;
  role: OrgMemberRole;
};

export type BuildSessionInput = {
  userId: string;
  memberships: OrgMembership[];
  preferredOrgId?: string | null;
};

export const buildActiveSession = ({
  userId,
  memberships,
  preferredOrgId,
}: BuildSessionInput): ActiveSession => {
  const activeOrgId = resolveActiveOrgId(memberships, preferredOrgId);
  const membership = requireOrgAccess(memberships, activeOrgId);
  return {
    userId,
    activeOrgId,
    role: membership.role,
  };
};

export const sessionCan = (session: ActiveSession, permission: OrgPermission): boolean => {
  return can(session.role, permission);
};
