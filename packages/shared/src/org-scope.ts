import { assertSameOrg } from "./tenancy.ts";

export type OrgScopedInput = {
  orgId?: string | null;
};

export const applyOrgScope = <T extends OrgScopedInput>(
  input: T,
  activeOrgId: string,
): T & { orgId: string } => {
  if (input.orgId) {
    assertSameOrg(input.orgId, activeOrgId);
  }
  return {
    ...input,
    orgId: activeOrgId,
  };
};

export const assertOrgScope = <T extends { orgId: string }>(
  record: T,
  activeOrgId: string,
): T => {
  assertSameOrg(record.orgId, activeOrgId);
  return record;
};

export const buildOrgFilter = (orgId: string, field = "orgId"): Record<string, { eq: string }> => {
  return {
    [field]: { eq: orgId },
  };
};
