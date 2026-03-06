import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { SystemProgram, Keypair } from "@solana/web3.js";
import { ctx, expectError } from "./helpers";
import { deriveMembershipPda } from "../utils/pda";
import { PERM_READ, PERM_WRITE, PERM_DELETE, combinePerms } from "../utils/permission_constants";

export function membershipTests() {
  describe("03 — Membership & Role Assignment", () => {
    it("assigns reader role to memberA (new membership)", async () => {
      await ctx.rbac.methods
        .assignRole(0, null)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          member: ctx.memberA.publicKey,
          membership: ctx.membershipAPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipAPda);
      expect(m.member.toString()).to.equal(ctx.memberA.publicKey.toString());
      expect(m.rolesBitmap.toNumber()).to.equal(1); // bit 0
      expect(m.cachedPermissions.toNumber()).to.equal(PERM_READ.toNumber());
      expect(m.isActive).to.be.true;
      expect(m.expiresAt).to.be.null;

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(org.memberCount).to.equal(1);

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda0);
      expect(role.referenceCount).to.equal(1);
    });

    it("assigns writer role to memberA (existing membership, multi-role)", async () => {
      await ctx.rbac.methods
        .assignRole(1, null)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda1,
          member: ctx.memberA.publicKey,
          membership: ctx.membershipAPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipAPda);
      // bitmap: bit 0 | bit 1 = 3
      expect(m.rolesBitmap.toNumber()).to.equal(3);
      // perms: READ | (READ|WRITE|DELETE) = READ|WRITE|DELETE = 7
      const expected = combinePerms(PERM_READ, PERM_WRITE, PERM_DELETE);
      expect(m.cachedPermissions.toNumber()).to.equal(expected.toNumber());

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      // member_count stays at 1 (not a new member)
      expect(org.memberCount).to.equal(1);

      const role = await ctx.rbac.account.role.fetch(ctx.rolePda1);
      expect(role.referenceCount).to.equal(1);
    });

    it("rejects duplicate role assignment", async () => {
      await expectError(
        ctx.rbac.methods
          .assignRole(0, null)
          .accountsPartial({
            authority: ctx.admin.publicKey,
            authorityMembership: null,
            organization: ctx.orgPda,
            role: ctx.rolePda0,
            member: ctx.memberA.publicKey,
            membership: ctx.membershipAPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
        "RoleAlreadyAssigned"
      );
    });

    it("assigns reader role to memberB with 24h expiry", async () => {
      const futureExpiry = new anchor.BN(
        Math.floor(Date.now() / 1000) + 86400
      );

      await ctx.rbac.methods
        .assignRole(0, futureExpiry)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          member: ctx.memberB.publicKey,
          membership: ctx.membershipBPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipBPda);
      expect(m.expiresAt).to.not.be.null;
      expect(m.rolesBitmap.toNumber()).to.equal(1);
      expect(m.isActive).to.be.true;

      const org = await ctx.rbac.account.organization.fetch(ctx.orgPda);
      expect(org.memberCount).to.equal(2);
    });

    it("rejects assignment with past expiry", async () => {
      const pastExpiry = new anchor.BN(1000);
      const tempMember = Keypair.generate();
      const [tempPda] = deriveMembershipPda(
        ctx.orgPda,
        tempMember.publicKey,
        ctx.rbac.programId
      );

      await expectError(
        ctx.rbac.methods
          .assignRole(0, pastExpiry)
          .accountsPartial({
            authority: ctx.admin.publicKey,
            authorityMembership: null,
            organization: ctx.orgPda,
            role: ctx.rolePda0,
            member: tempMember.publicKey,
            membership: tempPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
        "ExpiryInPast"
      );
    });

    it("assigns manager role to memberC", async () => {
      await ctx.rbac.methods
        .assignRole(2, null)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda2,
          member: ctx.memberC.publicKey,
          membership: ctx.membershipCPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipCPda);
      expect(m.rolesBitmap.toNumber()).to.equal(4); // bit 2
    });

    it("assigns reader role to memberC (for delegation tests)", async () => {
      await ctx.rbac.methods
        .assignRole(0, null)
        .accountsPartial({
          authority: ctx.admin.publicKey,
          authorityMembership: null,
          organization: ctx.orgPda,
          role: ctx.rolePda0,
          member: ctx.memberC.publicKey,
          membership: ctx.membershipCPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const m = await ctx.rbac.account.membership.fetch(ctx.membershipCPda);
      // bitmap: bit 0 | bit 2 = 5
      expect(m.rolesBitmap.toNumber()).to.equal(5);
    });
  });
}