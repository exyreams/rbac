import { expect } from "chai";
import { ctx, expectError } from "./helpers";
import { PERM_READ, PERM_LIST, PERM_WRITE, combinePerms } from "../utils/permission_constants";

export function refreshTests() {
  describe("05 — Permissions Epoch & Refresh", () => {
    it("update_role_permissions increments epoch", async () => {
      const orgBefore = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      const epochBefore = orgBefore.permissionsEpoch.toNumber();

      // Change reader role: READ → READ|LIST
      const newPerms = combinePerms(PERM_READ, PERM_LIST);
      await ctx.rbac.methods
        .updateRolePermissions(newPerms)
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
        })
        .rpc();

      const orgAfter = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(orgAfter.permissionsEpoch.toNumber()).to.equal(epochBefore + 1);

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda0);
      expect(role.permissions.toNumber()).to.equal(newPerms.toNumber());
    });

    it("check_permission fails with StalePermissions", async () => {
      await expectError(
        ctx.rbac.methods
          .checkPermission(PERM_READ)
          .accountsPartial({
            organization: ctx.orgPda,
            membership: ctx.membershipAPda,
          })
          .rpc(),
        "StalePermissions"
      );
    });

    it("refresh_permissions syncs memberA epoch and updates cache", async () => {
      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      const currentEpoch = org.permissionsEpoch.toNumber();

      await ctx.rbac.methods
        .refreshPermissions()
        .accountsPartial({
          payer: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .remainingAccounts([
          { pubkey: ctx.rolePda0, isWritable: false, isSigner: false },
          { pubkey: ctx.rolePda1, isWritable: false, isSigner: false },
        ])
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipAPda);
      expect(m.permissionsEpoch.toNumber()).to.equal(currentEpoch);

      // role 0 = READ|LIST (0x11 = 17)
      // role 1 = READ|WRITE|DELETE (0x07 = 7)
      // combined = 0x17 = 23
      expect(m.cachedPermissions.toNumber()).to.equal(23);
    });

    it("check_permission succeeds after refresh", async () => {
      await ctx.rbac.methods
        .checkPermission(PERM_READ)
        .accountsPartial({
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .rpc();
    });

    it("refreshes memberB and memberC for subsequent tests", async () => {
      // Refresh memberB
      await ctx.rbac.methods
        .refreshPermissions()
        .accountsPartial({
          payer: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipBPda,
        })
        .remainingAccounts([
          { pubkey: ctx.rolePda0, isWritable: false, isSigner: false },
        ])
        .rpc();

      const mB = await ctx.rbac.account.membership.fetch(ctx.membershipBPda);
      // memberB: role 0 only → READ|LIST = 0x11 = 17
      expect(mB.cachedPermissions.toNumber()).to.equal(
        combinePerms(PERM_READ, PERM_LIST).toNumber()
      );

      // Refresh memberC
      await ctx.rbac.methods
        .refreshPermissions()
        .accountsPartial({
          payer: ctx.admin.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipCPda,
        })
        .remainingAccounts([
          { pubkey: ctx.rolePda0, isWritable: false, isSigner: false },
          { pubkey: ctx.rolePda2, isWritable: false, isSigner: false },
        ])
        .rpc();

      const mC = await ctx.rbac.account.membership.fetch(ctx.membershipCPda);
      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(mC.permissionsEpoch.toNumber()).to.equal(
        org.permissionsEpoch.toNumber()
      );
    });

    it("anyone can call refresh_permissions (permissionless)", async () => {
      // memberB (non-admin) refreshes memberA's permissions
      await ctx.rbac.methods
        .refreshPermissions()
        .accountsPartial({
          payer: ctx.memberB.publicKey,
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .remainingAccounts([
          { pubkey: ctx.rolePda0, isWritable: false, isSigner: false },
          { pubkey: ctx.rolePda1, isWritable: false, isSigner: false },
        ])
        .signers([ctx.memberB])
        .rpc();
    });
  });
}