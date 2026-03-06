import { expect } from "chai";
import { ctx, expectError } from "./helpers";
import { PERM_READ, PERM_WRITE, PERM_DELETE, combinePerms } from "../utils/permission_constants";

export function permissionTests() {
  describe("04 — Permission Checks", () => {
    it("grants READ for memberA (has reader+writer roles)", async () => {
      await ctx.rbac.methods
        .checkPermission(PERM_READ)
        .accountsPartial({
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .rpc();
    });

    it("grants WRITE for memberA", async () => {
      await ctx.rbac.methods
        .checkPermission(PERM_WRITE)
        .accountsPartial({
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .rpc();
    });

    it("grants DELETE for memberA", async () => {
      await ctx.rbac.methods
        .checkPermission(PERM_DELETE)
        .accountsPartial({
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .rpc();
    });

    it("grants compound READ|WRITE|DELETE for memberA", async () => {
      const compound = combinePerms(PERM_READ, PERM_WRITE, PERM_DELETE);
      await ctx.rbac.methods
        .checkPermission(compound)
        .accountsPartial({
          organization: ctx.orgPda,
          membership: ctx.membershipAPda,
        })
        .rpc();
    });

    it("grants READ for memberB (reader only)", async () => {
      await ctx.rbac.methods
        .checkPermission(PERM_READ)
        .accountsPartial({
          organization: ctx.orgPda,
          membership: ctx.membershipBPda,
        })
        .rpc();
    });

    it("denies WRITE for memberB (reader only)", async () => {
      await expectError(
        ctx.rbac.methods
          .checkPermission(PERM_WRITE)
          .accountsPartial({
            organization: ctx.orgPda,
            membership: ctx.membershipBPda,
          })
          .rpc(),
        "InsufficientPermissions"
      );
    });

    it("denies compound READ|WRITE for memberB", async () => {
      const compound = combinePerms(PERM_READ, PERM_WRITE);
      await expectError(
        ctx.rbac.methods
          .checkPermission(compound)
          .accountsPartial({
            organization: ctx.orgPda,
            membership: ctx.membershipBPda,
          })
          .rpc(),
        "InsufficientPermissions"
      );
    });
  });
}