import { BN } from "@coral-xyz/anchor";

// Data permissions (bits 0-5)
export const PERM_READ = new BN(1 << 0);
export const PERM_WRITE = new BN(1 << 1);
export const PERM_DELETE = new BN(1 << 2);
export const PERM_EXECUTE = new BN(1 << 3);
export const PERM_LIST = new BN(1 << 4);
export const PERM_EXPORT = new BN(1 << 5);

// Admin permissions (bits 16-20)
export const PERM_CREATE_ROLE = new BN(1 << 16);
export const PERM_DELETE_ROLE = new BN(1 << 17);
export const PERM_ASSIGN_MEMBER = new BN(1 << 18);
export const PERM_REVOKE_MEMBER = new BN(1 << 19);
export const PERM_UPDATE_CONFIG = new BN(1 << 20);

// Super admin (bit 63)
export const PERM_SUPER_ADMIN = new BN(1).shln(63);

// Composite permission helpers
export function combinePerms(...perms: BN[]): BN {
  return perms.reduce((acc, p) => acc.or(p), new BN(0));
}

export function formatPerms(val: BN): string {
  const map: [BN, string][] = [
    [PERM_READ, "READ"],
    [PERM_WRITE, "WRITE"],
    [PERM_DELETE, "DELETE"],
    [PERM_EXECUTE, "EXECUTE"],
    [PERM_LIST, "LIST"],
    [PERM_EXPORT, "EXPORT"],
    [PERM_CREATE_ROLE, "CREATE_ROLE"],
    [PERM_DELETE_ROLE, "DELETE_ROLE"],
    [PERM_ASSIGN_MEMBER, "ASSIGN_MEMBER"],
    [PERM_REVOKE_MEMBER, "REVOKE_MEMBER"],
    [PERM_UPDATE_CONFIG, "UPDATE_CONFIG"],
    [PERM_SUPER_ADMIN, "SUPER_ADMIN"],
  ];
  const active = map.filter(([bit]) => !val.and(bit).isZero()).map(([, n]) => n);
  return active.length ? active.join("|") : "NONE";
}