import { expect } from "chai";
import { SystemProgram } from "@solana/web3.js";
import { ctx } from "../rbac/helpers";

export function cpiIntegrationTests() {
  describe("CPI-01 — Guarded Vault Integration", () => {
    it("memberA (writer) creates a vault via CPI", async () => {
      const data = Buffer.from('{"api_key":"sk_test_123"}');

      await ctx.vault.methods
        .initializeVault(ctx.vaultLabel, data as any)
        .accountsPartial({
          signer: ctx.memberA.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
          vault: ctx.vaultPda,
          rbacProgram: ctx.rbac.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.memberA])
        .rpc();

      const v = await ctx.vault.account.vault.fetch(ctx.vaultPda);
      expect(v.creator.toString()).to.equal(ctx.memberA.publicKey.toString());
      expect(v.organization.toString()).to.equal(ctx.orgPda.toString());
      expect(v.dataLen).to.equal(data.length);
      expect(v.version).to.equal(1);

      const labelStr = Buffer.from(v.label)
        .toString("utf-8")
        .replace(/\0/g, "");
      expect(labelStr).to.equal(ctx.vaultLabel);
    });

    it("memberB (reader) reads the vault via CPI", async () => {
      await ctx.vault.methods
        .readVault()
        .accountsPartial({
          signer: ctx.memberB.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipBPda,
          vault: ctx.vaultPda,
          rbacProgram: ctx.rbac.programId,
        })
        .signers([ctx.memberB])
        .rpc();
    });

    it("memberA writes vault — version increments", async () => {
      const newData = Buffer.from('{"api_key":"sk_live_456"}');

      await ctx.vault.methods
        .writeVault(newData as any)
        .accountsPartial({
          signer: ctx.memberA.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
          vault: ctx.vaultPda,
          rbacProgram: ctx.rbac.programId,
        })
        .signers([ctx.memberA])
        .rpc();

      const v = await ctx.vault.account.vault.fetch(ctx.vaultPda);
      expect(v.version).to.equal(2);
      expect(v.dataLen).to.equal(newData.length);
      expect(v.lastModifiedBy.toString()).to.equal(
        ctx.memberA.publicKey.toString()
      );
    });

    it("memberA deletes vault — account closed", async () => {
      await ctx.vault.methods
        .deleteVault()
        .accountsPartial({
          signer: ctx.memberA.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
          vault: ctx.vaultPda,
          rbacProgram: ctx.rbac.programId,
        })
        .signers([ctx.memberA])
        .rpc();

      const account = await ctx.provider.connection.getAccountInfo(
        ctx.vaultPda
      );
      expect(account).to.be.null;
    });
  });
}