import { expect } from "chai";
import { SystemProgram } from "@solana/web3.js";
import { ctx, expectError } from "./helpers";
import { deriveOrgPda } from "../utils/pda";

export function organizationTests() {
  describe("01 — Organization Lifecycle", () => {
    it("creates an organization", async () => {
      await ctx.rbac.methods
        .initializeOrganization(ctx.orgName)
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);

      expect(org.admin.toString()).to.equal(ctx.admin.publicKey.toString());
      expect(org.creator.toString()).to.equal(ctx.admin.publicKey.toString());
      expect(org.roleCount).to.equal(0);
      expect(org.memberCount).to.equal(0);
      expect(org.nameLen).to.equal(ctx.orgName.length);
      expect(org.permissionsEpoch.toNumber()).to.equal(0);

      const nameStr = Buffer.from(org.name)
        .toString("utf-8")
        .replace(/\0/g, "");
      expect(nameStr).to.equal(ctx.orgName);
    });

    it("rejects duplicate organization name for same creator", async () => {
      await expectError(
        ctx.rbac.methods
          .initializeOrganization(ctx.orgName)
          .accountsPartial({
            admin: ctx.admin.publicKey,
            organization: ctx.orgPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
        "already in use"
      );
    });

    it("rejects organization name exceeding 32 bytes", async () => {
      const longName = "a".repeat(33);
      
      // PDA derivation will fail before we even call the program
      await expectError(
        (async () => {
          const [longPda] = deriveOrgPda(
            ctx.admin.publicKey,
            longName,
            ctx.rbac.programId
          );
          return ctx.rbac.methods
            .initializeOrganization(longName)
            .accountsPartial({
              admin: ctx.admin.publicKey,
              organization: longPda,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        })(),
        "Max seed length exceeded"
      );
    });

    it("allows different creator to use the same org name", async () => {
      const [otherOrgPda] = deriveOrgPda(
        ctx.memberA.publicKey,
        ctx.orgName,
        ctx.rbac.programId
      );

      await ctx.rbac.methods
        .initializeOrganization(ctx.orgName)
        .accountsPartial({
          admin: ctx.memberA.publicKey,
          organization: otherOrgPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.memberA])
        .rpc();

      const org = await ctx.rbac.account.organization.fetch(otherOrgPda);
      expect(org.admin.toString()).to.equal(ctx.memberA.publicKey.toString());

      // Clean up: close this org (it has 0 roles, 0 members)
      await ctx.rbac.methods
        .closeOrganization()
        .accountsPartial({
          admin: ctx.memberA.publicKey,
          organization: otherOrgPda,
        })
        .signers([ctx.memberA])
        .rpc();
    });
  });
}