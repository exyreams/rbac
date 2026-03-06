/**
 * pda.ts — PDA derivation functions matching the on-chain seeds.
 * Seeds must exactly mirror the Rust program constants.
 */
import { PublicKey } from "@solana/web3.js";
import { RBAC_PROGRAM_ID, VAULT_PROGRAM_ID } from "./setup";

const ORG_SEED = Buffer.from("organization");
const ROLE_SEED = Buffer.from("role");
const MEMBERSHIP_SEED = Buffer.from("membership");
const VAULT_SEED = Buffer.from("vault");

export function findOrganizationPda(
  creator: PublicKey,
  name: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ORG_SEED, creator.toBuffer(), Buffer.from(name)],
    RBAC_PROGRAM_ID
  );
}

export function findRolePda(
  organization: PublicKey,
  roleIndex: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ROLE_SEED, organization.toBuffer(), Buffer.from([roleIndex])],
    RBAC_PROGRAM_ID
  );
}

export function findMembershipPda(
  organization: PublicKey,
  member: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MEMBERSHIP_SEED, organization.toBuffer(), member.toBuffer()],
    RBAC_PROGRAM_ID
  );
}

export function findVaultPda(
  organization: PublicKey,
  label: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, organization.toBuffer(), Buffer.from(label)],
    VAULT_PROGRAM_ID
  );
}