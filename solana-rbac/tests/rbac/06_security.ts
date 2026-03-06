import { expect } from "chai";
import { SystemProgram, Keypair } from "@solana/web3.js";
import { ctx, expectError } from "./helpers";
import { deriveRolePda, deriveMembershipPda } from "../utils/pda";
import { PERM_SUPER_ADMIN } from "../utils/permission_constants";

export function securityTests() {
  describe("06 — Security & Authorization", () => {
    it("memberC (manager, holds role 0) delegates role 0 to delegateTarget", async () => {
      await ctx.rbac.methods
        .assignRole(0, null)
        .accountsPartial({
          authority: ctx.memberC.publicKey,
          authorityMembership: ctx.membershipCPda,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          member: ctx.delegateTarget.publicKey,
          membership: ctx.delegateTargetMembershipPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.memberC])
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(
        ctx.delegateTargetMembershipPda
      );
      expect(m.rolesBitmap.toNumber()).to.equal(1); // bit 0
      expect(m.isActive).to.be.true;
    });

    it("memberC CANNOT delegate role 1 (writer) — doesn't hold it", async () => {
      const tempTarget = Keypair.generate();
      const [tempPda] = deriveMembershipPda(
        ctx.orgPda,
        tempTarget.publicKey,
        ctx.rbac.programId
      );

      await expectError(
        ctx.rbac.methods
          .assignRole(1, null)
          .accountsPartial({
            authority: ctx.memberC.publicKey,
            authorityMembership: ctx.membershipCPda,
            organization: ctx.orgPda,
            role: ctx.rolePda1,
            member: tempTarget.publicKey,
            membership: tempPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.memberC])
          .rpc(),
        "CannotDelegateUnheldRole"
      );
    });

    it("non-admin cannot create role with SUPER_ADMIN permission", async () => {
      // Even the admin's authority_membership being null means
      // the non-admin path is taken for unauthorized user
      const [rolePda3] = deriveRolePda(ctx.orgPda, 3, ctx.rbac.programId);

      await expectError(
        ctx.rbac.methods
          .createRole("super", PERM_SUPER_ADMIN)
          .accountsPartial({
            authority: ctx.unauthorized.publicKey,
            authorityMembership: null,
            organization: ctx.orgPda,
            role: rolePda3,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.unauthorized])
          .rpc(),
        "Unauthorized"
      );
    });

    it("non-admin cannot transfer admin", async () => {
      await expectError(
        ctx.rbac.methods
          .transferAdmin(ctx.unauthorized.publicKey)
          .accountsPartial({
            admin: ctx.unauthorized.publicKey,
            organization: ctx.orgPda,
          })
          .signers([ctx.unauthorized])
          .rpc(),
        "ConstraintHasOne"
      );
    });

    it("admin cannot transfer admin to themselves", async () => {
      await expectError(
        ctx.rbac.methods
          .transferAdmin(ctx.admin.publicKey)
          .accountsPartial({
            admin: ctx.admin.publicKey,
            organization: ctx.orgPda,
          })
          .rpc(),
        "SameAdmin"
      );
    });

    it("admin cannot transfer admin to zero address", async () => {
      const { PublicKey } = await import("@solana/web3.js");
      await expectError(
        ctx.rbac.methods
          .transferAdmin(PublicKey.default)
          .accountsPartial({
            admin: ctx.admin.publicKey,
            organization: ctx.orgPda,
          })
          .rpc(),
        "InvalidNewAdmin"
      );
    });

    it("cannot close membership with active roles", async () => {
      await expectError(
        ctx.rbac.methods
          .closeMembership()
          .accountsPartial({
            admin: ctx.admin.publicKey,
            organization: ctx.orgPda,
            membership: ctx.membershipAPda,
          })
          .rpc(),
        "MembershipHasActiveRoles"
      );
    });

    it("cannot close role with active references", async () => {
      await expectError(
        ctx.rbac.methods
          .closeRole()
          .accountsPartial({
            admin: ctx.admin.publicKey,
            organization: ctx.orgPda,
            role: ctx.rolePda0,
          })
          .rpc(),
        "RoleHasMembers"
      );
    });

    it("cannot close organization with roles/members", async () => {
      await expectError(
        ctx.rbac.methods
          .closeOrganization()
          .accountsPartial({
            admin: ctx.admin.publicKey,
            organization: ctx.orgPda,
          })
          .rpc(),
        "OrganizationNotEmpty"
      );
    });
  });
}