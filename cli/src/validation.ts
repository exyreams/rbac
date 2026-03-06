/**
 * validation.ts — Input validation for all CLI commands.
 * Catches bad inputs before they hit the chain and produce cryptic errors.
 */
import { PublicKey } from "@solana/web3.js";

/** Parse and validate a base-58 public key string. */
export function validatePubkey(input: string, name = "address"): PublicKey {
  try {
    return new PublicKey(input);
  } catch {
    throw new Error(
      `Invalid ${name}: "${input}". Expected a base-58 Solana public key.`
    );
  }
}

/** Validate a role index is within the 0-63 bitmap range. */
export function validateRoleIndex(input: string): number {
  const idx = parseInt(input, 10);
  if (isNaN(idx) || idx < 0 || idx > 63) {
    throw new Error(`Role index must be 0–63, got "${input}".`);
  }
  return idx;
}

/** Validate a vault label does not exceed 32 bytes. */
export function validateLabel(label: string): void {
  const len = Buffer.byteLength(label, "utf-8");
  if (len > 32) {
    throw new Error(`Label exceeds 32 bytes (${len} bytes): "${label}"`);
  }
  if (len === 0) {
    throw new Error("Label cannot be empty.");
  }
}

/** Validate vault data does not exceed 256 bytes. */
export function validateData(data: string): void {
  const len = Buffer.byteLength(data, "utf-8");
  if (len > 256) {
    throw new Error(`Data exceeds 256 bytes (${len} bytes).`);
  }
}

/** Validate an organization or role name does not exceed 32 bytes. */
export function validateName(name: string): void {
  const len = Buffer.byteLength(name, "utf-8");
  if (len > 32) {
    throw new Error(`Name exceeds 32 bytes (${len} bytes): "${name}"`);
  }
  if (len === 0) {
    throw new Error("Name cannot be empty.");
  }
}