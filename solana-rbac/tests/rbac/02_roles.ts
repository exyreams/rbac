import { expect } from "chai";
import { SystemProgram } from "@solana/web3.js";
import { ctx, expectError } from "./helpers";
import {
  PERM_READ,
  PERM_WRITE,
  PERM_DELETE,
  PERM_ASSIGN_MEMBER,
  PERM_REVOKE_MEMBER,
  combinePerms,
} from "../utils/permission_constants";

export function roleTests() {
  describe("02 — Role Management", () => {
    it("creates reader role (index 0, PERM_READ)", async () => {
      await ctx.rbac.methods
        .createRole("reader", PERM_READ)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda0);
      expect(role.roleIndex).to.equal(0);
      expect(role.permissions.toNumber()).to.equal(PERM_READ.toNumber());
      expect(role.isActive).to.be.true;
      expect(role.referenceCount).to.equal(0);

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(org.roleCount).to.equal(1);
    });

    it("creates writer role (index 1, READ|WRITE|DELETE)", async () => {
      const perms = combinePerms(PERM_READ, PERM_WRITE, PERM_DELETE);

      await ctx.rbac.methods
        .createRole("writer", perms)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda1,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda1);
      expect(role.roleIndex).to.equal(1);
      expect(role.permissions.toNumber()).to.equal(perms.toNumber());
      expect(role.isActive).to.be.true;
      expect(role.referenceCount).to.equal(0);
    });

    it("creates manager role (index 2, READ|ASSIGN|REVOKE)", async () => {
      const perms = combinePerms(PERM_READ, PERM_ASSIGN_MEMBER, PERM_REVOKE_MEMBER);

      await ctx.rbac.methods
        .createRole("manager", perms)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda2,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda2);
      expect(role.roleIndex).to.equal(2);
      expect(role.permissions.toNumber()).to.equal(perms.toNumber());

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(org.roleCount).to.equal(3);
    });

    it("rejects non-admin without CREATE_ROLE permission", async () => {
      const { deriveRolePda } = await import("../utils/pda");
      // Need to derive the correct PDA for role index 3 (next available)
      const [hackerRolePda] = deriveRolePda(ctx.orgPda, 3, ctx.rbac.programId);
      
      await expectError(
        ctx.rbac.methods
          .createRole("hacker-role", PERM_READ)
          .accountsPartial({
            authority: ctx.unauthorized.publicKey,
            authorityMembership: null,
            organization: ctx.orgPda,
            role: hackerRolePda,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.unauthorized])
          .rpc(),
        "Unauthorized"
      );
    });

    it("deactivates a role and increments epoch", async () => {
      const orgBefore = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      const epochBefore = orgBefore.permissionsEpoch.toNumber();

      await ctx.rbac.methods
        .deactivateRole()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
        })
        .rpc();

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda0);
      expect(role.isActive).to.be.false;

      const orgAfter = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(orgAfter.permissionsEpoch.toNumber()).to.equal(epochBefore + 1);
    });

    it("reactivates a role and increments epoch", async () => {
      const orgBefore = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      const epochBefore = orgBefore.permissionsEpoch.toNumber();

      await ctx.rbac.methods
        .reactivateRole()
        .accountsPartial({
          admin: ctx.admin.publicKey,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
        })
        .rpc();

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda0);
      expect(role.isActive).to.be.true;

      const orgAfter = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(orgAfter.permissionsEpoch.toNumber()).to.equal(epochBefore + 1);
    });
  });
}