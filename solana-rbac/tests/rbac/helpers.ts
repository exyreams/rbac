import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { Rbac } from "../../target/types/rbac";
import { GuardedVault } from "../../target/types/guarded_vault";
import {
  deriveOrgPda,
  deriveRolePda,
  deriveMembershipPda,
  deriveVaultPda,
} from "../utils/pda";

export interface TestContext {
  provider: anchor.AnchorProvider;
  rbac: Program<Rbac>;
  vault: Program<GuardedVault>;

  admin: anchor.Wallet;
  memberA: Keypair;
  memberB: Keypair;
  memberC: Keypair;
  unauthorized: Keypair;
  delegateTarget: Keypair;

  orgName: string;
  orgPda: PublicKey;

  rolePda0: PublicKey; // reader
  rolePda1: PublicKey; // writer
  rolePda2: PublicKey; // manager

  membershipAPda: PublicKey;
  membershipBPda: PublicKey;
  membershipCPda: PublicKey;
  delegateTargetMembershipPda: PublicKey;

  vaultLabel: string;
  vaultPda: PublicKey;
}

export const ctx = {} as TestContext;

export async function setupContext(): Promise<void> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  ctx.provider = provider;
  ctx.rbac = anchor.workspace.Rbac as Program<Rbac>;
  ctx.vault = anchor.workspace.GuardedVault as Program<GuardedVault>;
  ctx.admin = provider.wallet as anchor.Wallet;

  ctx.memberA = Keypair.generate();
  ctx.memberB = Keypair.generate();
  ctx.memberC = Keypair.generate();
  ctx.unauthorized = Keypair.generate();
  ctx.delegateTarget = Keypair.generate();

  ctx.orgName = "test-org";
  ctx.vaultLabel = "test-vault";

  // Derive all PDAs
  const rbacId = ctx.rbac.programId;
  const vaultId = ctx.vault.programId;

  [ctx.orgPda] = deriveOrgPda(ctx.admin.publicKey, ctx.orgName, rbacId);
  [ctx.rolePda0] = deriveRolePda(ctx.orgPda, 0, rbacId);
  [ctx.rolePda1] = deriveRolePda(ctx.orgPda, 1, rbacId);
  [ctx.rolePda2] = deriveRolePda(ctx.orgPda, 2, rbacId);
  [ctx.membershipAPda] = deriveMembershipPda(ctx.orgPda, ctx.memberA.publicKey, rbacId);
  [ctx.membershipBPda] = deriveMembershipPda(ctx.orgPda, ctx.memberB.publicKey, rbacId);
  [ctx.membershipCPda] = deriveMembershipPda(ctx.orgPda, ctx.memberC.publicKey, rbacId);
  [ctx.delegateTargetMembershipPda] = deriveMembershipPda(
    ctx.orgPda,
    ctx.delegateTarget.publicKey,
    rbacId
  );
  [ctx.vaultPda] = deriveVaultPda(ctx.orgPda, ctx.vaultLabel, vaultId);

  // Airdrop to test wallets
  const wallets = [
    ctx.memberA,
    ctx.memberB,
    ctx.memberC,
    ctx.unauthorized,
    ctx.delegateTarget,
  ];

  for (const kp of wallets) {
    const sig = await provider.connection.requestAirdrop(
      kp.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }
}

/**
 * Helper: expect a transaction to fail with a specific error substring.
 */
export async function expectError(
  promise: Promise<any>,
  errorSubstring: string,
  msg?: string
): Promise<void> {
  try {
    await promise;
    throw new Error(msg || `Expected error containing "${errorSubstring}" but tx succeeded`);
  } catch (err: any) {
    const errStr = err.toString();
    if (errStr.includes(errorSubstring)) {
      return; // Expected error found
    }
    // If this is our own "Expected error" throw, re-throw it
    if (errStr.includes("Expected error")) {
      throw err;
    }
    // Check in logs too
    if (err.logs && err.logs.some((l: string) => l.includes(errorSubstring))) {
      return;
    }
    throw new Error(
      `Expected error "${errorSubstring}" but got: ${errStr.slice(0, 300)}`
    );
  }
}