import type { OrgMemberRole } from "./index.ts";

export type OrgMembership = {
  orgId: string;
  role: OrgMemberRole;
};

const normalize = (value: string): string => value.trim();

export const listOrgIds = (memberships: OrgMembership[]): string[] => {
  return memberships.map((membership) => membership.orgId);
};

export const findMembership = (
  memberships: OrgMembership[],
  orgId: string,
): OrgMembership | null => {
  const target = normalize(orgId);
  return memberships.find((membership) => membership.orgId === target) ?? null;
};

export const hasOrgAccess = (memberships: OrgMembership[], orgId: string): boolean => {
  return findMembership(memberships, orgId) !== null;
};

export const requireOrgAccess = (memberships: OrgMembership[], orgId: string): OrgMembership => {
  const membership = findMembership(memberships, orgId);
  if (!membership) {
    throw new Error(`Active org not found: ${orgId}`);
  }
  return membership;
};

export const resolveActiveOrgId = (
  memberships: OrgMembership[],
  preferredOrgId?: string | null,
): string => {
  if (memberships.length === 0) {
    throw new Error("No org memberships available");
  }
  if (preferredOrgId) {
    return requireOrgAccess(memberships, preferredOrgId).orgId;
  }
  if (memberships.length === 1) {
    return memberships[0].orgId;
  }
  throw new Error("Active org required");
};

export const assertSameOrg = (orgId: string, activeOrgId: string): void => {
  if (normalize(orgId) !== normalize(activeOrgId)) {
    throw new Error(`Active org mismatch: ${orgId}`);
  }
};
