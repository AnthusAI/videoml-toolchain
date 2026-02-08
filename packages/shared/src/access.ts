import type { OrgMemberRole } from "./index.js";
import { can, type OrgPermission } from "./rbac.js";
import { assertSameOrg, findMembership, type OrgMembership } from "./tenancy.js";

export type OrgAccessRequest = {
  memberships: OrgMembership[];
  orgId: string;
  activeOrgId?: string | null;
  permission?: OrgPermission | null;
};

export type OrgAccessDecision = {
  allowed: boolean;
  role?: OrgMemberRole;
  reason?: string;
};

export const checkOrgPermission = ({
  memberships,
  orgId,
  activeOrgId,
  permission,
}: OrgAccessRequest): OrgAccessDecision => {
  if (memberships.length === 0) {
    return { allowed: false, reason: "No org memberships available" };
  }
  if (activeOrgId) {
    try {
      assertSameOrg(orgId, activeOrgId);
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const membership = findMembership(memberships, orgId);
  if (!membership) {
    return { allowed: false, reason: `Active org not found: ${orgId}` };
  }
  if (permission && !can(membership.role, permission)) {
    return {
      allowed: false,
      role: membership.role,
      reason: `Permission denied: ${permission}`,
    };
  }
  return { allowed: true, role: membership.role };
};

export const assertOrgPermission = (request: OrgAccessRequest): OrgMemberRole => {
  const decision = checkOrgPermission(request);
  if (!decision.allowed) {
    throw new Error(decision.reason ?? "Permission denied");
  }
  if (!decision.role) {
    throw new Error("Permission denied");
  }
  return decision.role;
};
