import { SystemProgram } from "@solana/web3.js";
import { ctx, expectError } from "../rbac/helpers";
import { deriveVaultPda } from "../utils/pda";

export function cpiDeniedTests() {
  describe("CPI-02 — Guarded Vault Permission Denied", () => {
    const deniedLabel = "denied-test";
    let deniedVaultPda: any;

    before(async () => {
      [deniedVaultPda] = deriveVaultPda(
        ctx.orgPda,
        deniedLabel,
        ctx.vault.programId
      );

      // Create a vault as memberA (writer) for denied tests
      const data = Buffer.from("test data for denied tests");
      await ctx.vault.methods
        .initializeVault(deniedLabel, data as any)
        .accountsPartial({
          signer: ctx.memberA.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
          vault: deniedVaultPda,
          rbacProgram: ctx.rbac.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.memberA])
        .rpc();
    });

    it("memberB (reader) CANNOT write to vault", async () => {
      await expectError(
        ctx.vault.methods
          .writeVault(Buffer.from("hacked") as any)
          .accountsPartial({
            signer: ctx.memberB.publicKey,
            organization: ctx.orgPda,
            membership: ctx.membershipBPda,
            vault: deniedVaultPda,
            rbacProgram: ctx.rbac.programId,
          })
          .signers([ctx.memberB])
          .rpc(),
        "InsufficientPermissions"
      );
    });

    it("memberB (reader) CANNOT delete vault", async () => {
      await expectError(
        ctx.vault.methods
          .deleteVault()
          .accountsPartial({
            signer: ctx.memberB.publicKey,
            organization: ctx.orgPda,
            membership: ctx.membershipBPda,
            vault: deniedVaultPda,
            rbacProgram: ctx.rbac.programId,
          })
          .signers([ctx.memberB])
          .rpc(),
        "InsufficientPermissions"
      );
    });

    it("non-member CANNOT read vault", async () => {
      // unauthorized user has no membership — constraint check fails
      const { deriveMembershipPda } = await import("../utils/pda");
      const [fakeMembership] = deriveMembershipPda(
        ctx.orgPda,
        ctx.unauthorized.publicKey,
        ctx.rbac.programId
      );

      await expectError(
        ctx.vault.methods
          .readVault()
          .accountsPartial({
            signer: ctx.unauthorized.publicKey,
            organization: ctx.orgPda,
            membership: fakeMembership,
            vault: deniedVaultPda,
            rbacProgram: ctx.rbac.programId,
          })
          .signers([ctx.unauthorized])
          .rpc(),
        "AccountNotInitialized"
      );
    });

    after(async () => {
      // Clean up: delete the denied-test vault
      await ctx.vault.methods
        .deleteVault()
        .accountsPartial({
          signer: ctx.memberA.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
          vault: deniedVaultPda,
          rbacProgram: ctx.rbac.programId,
        })
        .signers([ctx.memberA])
        .rpc();
    });
  });
}