import { expect } from "chai";
import { ctx } from "./helpers";

export function cleanupTests() {
  describe("07 — Cleanup & Account Closure", () => {
    // ══════════════════════════════════════════════════
    // REVOKE ALL ROLES
    // ══════════════════════════════════════════════════

    it("revokes role 0 from delegateTarget (last role → deactivated)", async () => {
      await ctx.rbac.methods
        .revokeRole(0)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          membership: ctx.delegateTargetMembershipPda,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(
        ctx.delegateTargetMembershipPda
      );
      expect(m.rolesBitmap.toNumber()).to.equal(0);
      expect(m.isActive).to.be.false;
      expect(m.cachedPermissions.toNumber()).to.equal(0);
    });

    it("revokes role 0 from memberA (still has role 1)", async () => {
      await ctx.rbac.methods
        .revokeRole(0)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          membership: ctx.membershipAPda,
        })
        .remainingAccounts([
          { pubkey: ctx.rolePda1, isWritable: false, isSigner: false },
        ])
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipAPda);
      expect(m.rolesBitmap.toNumber()).to.equal(2); // only bit 1
      expect(m.isActive).to.be.true;
    });

    it("revokes role 1 from memberA (last role → deactivated)", async () => {
      await ctx.rbac.methods
        .revokeRole(1)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda1,
          membership: ctx.membershipAPda,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipAPda);
      expect(m.rolesBitmap.toNumber()).to.equal(0);
      expect(m.isActive).to.be.false;
    });

    it("revokes role 0 from memberB", async () => {
      await ctx.rbac.methods
        .revokeRole(0)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          membership: ctx.membershipBPda,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipBPda);
      expect(m.rolesBitmap.toNumber()).to.equal(0);
      expect(m.isActive).to.be.false;
    });

    it("revokes role 0 from memberC (still has role 2)", async () => {
      await ctx.rbac.methods
        .revokeRole(0)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          membership: ctx.membershipCPda,
        })
        .remainingAccounts([
          { pubkey: ctx.rolePda2, isWritable: false, isSigner: false },
        ])
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipCPda);
      expect(m.rolesBitmap.toNumber()).to.equal(4); // only bit 2
    });

    it("revokes role 2 from memberC (last role → deactivated)", async () => {
      await ctx.rbac.methods
        .revokeRole(2)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda2,
          membership: ctx.membershipCPda,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipCPda);
      expect(m.rolesBitmap.toNumber()).to.equal(0);
      expect(m.isActive).to.be.false;
    });

    // ══════════════════════════════════════════════════
    // VERIFY REFERENCE COUNTS
    // ══════════════════════════════════════════════════

    it("all roles have reference_count == 0", async () => {
      const r0 = await ctx.rbac.account.role.fetch(ctx.rolePda0);
      const r1 = await ctx.rbac.account.role.fetch(ctx.rolePda1);
      const r2 = await ctx.rbac.account.role.fetch(ctx.rolePda2);

      expect(r0.referenceCount).to.equal(0);
      expect(r1.referenceCount).to.equal(0);
      expect(r2.referenceCount).to.equal(0);
    });

    // ══════════════════════════════════════════════════
    // CLOSE MEMBERSHIPS
    // ══════════════════════════════════════════════════

    it("closes delegateTarget membership", async () => {
      await ctx.rbac.methods
        .closeMembership()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.delegateTargetMembershipPda,
        })
        .rpc();

      const account = await ctx.provider.connection.getAccountInfo(
        ctx.delegateTargetMembershipPda
      );
      expect(account).to.be.null;
    });

    it("closes memberA membership", async () => {
      await ctx.rbac.methods
        .closeMembership()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .rpc();

      const account = await ctx.provider.connection.getAccountInfo(
        ctx.membershipAPda
      );
      expect(account).to.be.null;
    });

    it("closes memberB membership", async () => {
      await ctx.rbac.methods
        .closeMembership()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipBPda,
        })
        .rpc();
    });

    it("closes memberC membership", async () => {
      await ctx.rbac.methods
        .closeMembership()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipCPda,
        })
        .rpc();

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(org.memberCount).to.equal(0);
    });

    // ══════════════════════════════════════════════════
    // CLOSE ROLES
    // ══════════════════════════════════════════════════

    it("closes role 0 (reader)", async () => {
      await ctx.rbac.methods
        .closeRole()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
        })
        .rpc();

      const account = await ctx.provider.connection.getAccountInfo(
        ctx.rolePda0
      );
      expect(account).to.be.null;
    });

    it("closes role 1 (writer)", async () => {
      await ctx.rbac.methods
        .closeRole()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          role: ctx.rolePda1,
        })
        .rpc();
    });

    it("closes role 2 (manager)", async () => {
      await ctx.rbac.methods
        .closeRole()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          role: ctx.rolePda2,
        })
        .rpc();

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(org.roleCount).to.equal(0);
    });

    // ══════════════════════════════════════════════════
    // CLOSE ORGANIZATION
    // ══════════════════════════════════════════════════

    it("closes organization — rent reclaimed", async () => {
      const balanceBefore = await ctx.provider.connection.getBalance(
        ctx.admin.publicKey
      );

      await ctx.rbac.methods
        .closeOrganization()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
        })
        .rpc();

      const account = await ctx.provider.connection.getAccountInfo(
        ctx.orgPda
      );
      expect(account).to.be.null;

      const balanceAfter = await ctx.provider.connection.getBalance(
        ctx.admin.publicKey
      );
      // Balance should increase (rent reclaimed minus tx fee)
      expect(balanceAfter).to.be.greaterThan(balanceBefore - 10000);
    });
  });
}