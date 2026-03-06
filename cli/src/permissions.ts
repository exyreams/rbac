/**
 * permissions.ts — Permission bitmap parsing, checking, and formatting.
 * Mirrors constants.rs from the on-chain program exactly.
 */
import BN from "bn.js";

// ── Data permissions (bits 0–5) ────────────────────────────────
export const PERM_READ = new BN(1).shln(0);
export const PERM_WRITE = new BN(1).shln(1);
export const PERM_DELETE = new BN(1).shln(2);
export const PERM_EXECUTE = new BN(1).shln(3);
export const PERM_LIST = new BN(1).shln(4);
export const PERM_EXPORT = new BN(1).shln(5);

// ── Admin permissions (bits 16–20) ─────────────────────────────
export const PERM_CREATE_ROLE = new BN(1).shln(16);
export const PERM_DELETE_ROLE = new BN(1).shln(17);
export const PERM_ASSIGN_MEMBER = new BN(1).shln(18);
export const PERM_REVOKE_MEMBER = new BN(1).shln(19);
export const PERM_UPDATE_CONFIG = new BN(1).shln(20);

// ── Super admin (bit 63) ──────────────────────────────────────
export const PERM_SUPER_ADMIN = new BN(1).shln(63);

const NAMED_PERMS: Record<string, BN> = {
  READ: PERM_READ,
  WRITE: PERM_WRITE,
  DELETE: PERM_DELETE,
  EXECUTE: PERM_EXECUTE,
  LIST: PERM_LIST,
  EXPORT: PERM_EXPORT,
  CREATE_ROLE: PERM_CREATE_ROLE,
  DELETE_ROLE: PERM_DELETE_ROLE,
  ASSIGN_MEMBER: PERM_ASSIGN_MEMBER,
  REVOKE_MEMBER: PERM_REVOKE_MEMBER,
  UPDATE_CONFIG: PERM_UPDATE_CONFIG,
  SUPER_ADMIN: PERM_SUPER_ADMIN,
};

/**
 * Parse a permission string into a BN bitmap.
 * Accepts: hex ("0x3"), decimal ("7"), or named ("READ,WRITE" / "READ|WRITE").
 */
export function parsePermissions(input: string): BN {
  const trimmed = input.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return new BN(trimmed.slice(2), 16);
  }
  if (/^\d+$/.test(trimmed)) {
    return new BN(trimmed, 10);
  }
  const names = trimmed.split(/[,|]+/).map((s) => s.trim().toUpperCase());
  let result = new BN(0);
  for (const name of names) {
    if (!name) continue;
    const perm = NAMED_PERMS[name];
    if (!perm) {
      throw new Error(
        `Unknown permission '${name}'. Valid: ${Object.keys(NAMED_PERMS).join(", ")}`
      );
    }
    result = result.or(perm);
  }
  return result;
}

/** Decode a BN bitmap into a list of named permissions. */
export function decodePermissions(bitmap: BN): string[] {
  const names: string[] = [];
  for (const [name, bit] of Object.entries(NAMED_PERMS)) {
    if (!bitmap.and(bit).isZero()) names.push(name);
  }
  return names;
}

/** Check if `actual` satisfies all bits in `required`. SUPER_ADMIN bypasses. */
export function hasPermission(actual: BN, required: BN): boolean {
  if (!actual.and(PERM_SUPER_ADMIN).isZero()) return true;
  return actual.and(required).eq(required);
}

/** Format a BN as a padded 16-char hex string. */
export function formatHex(bn: BN): string {
  return "0x" + bn.toString(16).toUpperCase().padStart(16, "0");
}

/** Print the full permission reference table. */
export function listPermissions(): void {
  console.log("\n  Available permissions:\n");
  console.log("  DATA OPERATIONS (bits 0–5):");
  console.log("    READ            (bit 0)   Read data");
  console.log("    WRITE           (bit 1)   Write / create data");
  console.log("    DELETE          (bit 2)   Delete data");
  console.log("    EXECUTE         (bit 3)   Execute operations");
  console.log("    LIST            (bit 4)   List / enumerate");
  console.log("    EXPORT          (bit 5)   Export data");
  console.log("");
  console.log("  ADMIN OPERATIONS (bits 16–20):");
  console.log("    CREATE_ROLE     (bit 16)  Create new roles");
  console.log("    DELETE_ROLE     (bit 17)  Delete roles");
  console.log("    ASSIGN_MEMBER   (bit 18)  Assign roles to members");
  console.log("    REVOKE_MEMBER   (bit 19)  Revoke roles from members");
  console.log("    UPDATE_CONFIG   (bit 20)  Update org configuration");
  console.log("");
  console.log("  SUPER (bit 63):");
  console.log("    SUPER_ADMIN     (bit 63)  Bypasses all checks");
  console.log("");
  console.log('  Custom app permissions: bits 32–47 (pass as hex, e.g. "0x100000000")');
  console.log("");
}