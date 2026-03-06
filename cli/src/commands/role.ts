/**
 * member.ts — Membership management with auto-refresh and executeTx engine.
 */
import { Command } from "commander";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { getProvider, getRbacProgram, getGlobalOpts, requireOrg } from "../setup";
import { findRolePda, findMembershipPda } from "../pda";
import { validatePubkey, validateRoleIndex } from "../validation";
import { parsePermissions, hasPermission } from "../permissions";
import {
  printMembership, printMemberTable, printPermCheck,
  printTx, printErr, printInfo,
} from "../display";
import { truncKey } from "../ui/format";
import { T } from "../ui/theme";
import { Spinner } from "../ui/spinner";
import { confirm } from "../ui/prompts";
import { executeTx } from "../tx";

/** Build remaining_accounts for role PDAs from a bitmap. */
function buildRoleAccounts(orgAddress: PublicKey, bitmap: BN): any[] {
  const accounts: any[] = [];
  for (let i = 0; i < 64; i++) {
    if (!bitmap.and(new BN(1).shln(i)).isZero()) {
      const [rPda] = findRolePda(orgAddress, i);
      accounts.push({ pubkey: rPda, isWritable: false, isSigner: false });
    }
  }
  return accounts;
}

export function registerRoleCommands(parent: Command): void {
  const member = parent.command("member").description("Membership and role assignment management");

  // ── assign ───────────────────────────────────────────────────
  member
    .command("assign <member-pubkey> <role-index>")
    .description("Assign a role to a member (creates membership if needed)")
    .option("-e, --expires <timestamp>", "Unix timestamp for expiry")
    .option("--expires-in <seconds>", "Seconds from now until expiry")
    .action(async (memberStr: string, roleIdxStr: string, opts: any, cmd: Command) => {
      const spin = new Spinner("Assigning role...").start();
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const roleIndex = validateRoleIndex(roleIdxStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();

        const [rolePda] = findRolePda(org.address, roleIndex);
        const [membershipPda] = findMembershipPda(org.address, memberKey);

        let expiresAt: BN | null = null;
        if (opts.expires) expiresAt = new BN(opts.expires);
        else if (opts.expiresIn) expiresAt = new BN(Math.floor(Date.now() / 1000) + parseInt(opts.expiresIn, 10));

        const signer = provider.wallet.publicKey;
        const orgData = await (program.account as any).organization.fetch(org.address);
        const isAdmin = signer.equals(orgData.admin);
        const [authPda] = findMembershipPda(org.address, signer);

        const builder = program.methods
          .assignRole(roleIndex, expiresAt)
          .accountsPartial({
            authority: signer,
            authorityMembership: isAdmin ? undefined : authPda,
            organization: org.address,
            role: rolePda,
            member: memberKey,
            membership: membershipPda,
            systemProgram: SystemProgram.programId,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "assignRole", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role assigned");
        printTx(`Role ${roleIndex} assigned to ${truncKey(memberKey)}`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── revoke ───────────────────────────────────────────────────
  member
    .command("revoke <member-pubkey> <role-index>")
    .description("Revoke a role from a member")
    .action(async (memberStr: string, roleIdxStr: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Revoking role...").start();
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const roleIndex = validateRoleIndex(roleIdxStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();

        const [rolePda] = findRolePda(org.address, roleIndex);
        const [membershipPda] = findMembershipPda(org.address, memberKey);

        const mData = await (program.account as any).membership.fetch(membershipPda);
        const currentBitmap = new BN(mData.rolesBitmap);
        const newBitmap = currentBitmap.and(new BN(1).shln(roleIndex).notn(64));
        const remainingAccounts = buildRoleAccounts(org.address, newBitmap);

        const signer = provider.wallet.publicKey;
        const orgData = await (program.account as any).organization.fetch(org.address);
        const isAdmin = signer.equals(orgData.admin);
        const [authPda] = findMembershipPda(org.address, signer);

        const builder = program.methods
          .revokeRole(roleIndex)
          .accountsPartial({
            authority: signer,
            authorityMembership: isAdmin ? undefined : authPda,
            organization: org.address,
            role: rolePda,
            membership: membershipPda,
          })
          .remainingAccounts(remainingAccounts);

        const result = await executeTx({ builder, provider, spinner: spin, label: "revokeRole", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role revoked");
        printTx(`Role ${roleIndex} revoked from ${truncKey(memberKey)}`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── show ─────────────────────────────────────────────────────
  member
    .command("show <member-pubkey>")
    .description("Show membership details for a member")
    .action(async (memberStr: string, _opts: any, cmd: Command) => {
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [membershipPda] = findMembershipPda(org.address, memberKey);
        const data = await (program.account as any).membership.fetch(membershipPda);
        printMembership(data, membershipPda);
      } catch (err: any) {
        printErr(err);
      }
    });

  // ── check (with auto-refresh) ────────────────────────────────
  member
    .command("check <member-pubkey> <permissions>")
    .description("Check if a member has required permissions")
    .option("--on-chain", "Verify on-chain via CPI (costs tx fee)")
    .action(async (memberStr: string, permsStr: string, opts: any, cmd: Command) => {
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const required = parsePermissions(permsStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [membershipPda] = findMembershipPda(org.address, memberKey);

        if (opts.onChain) {
          const spin = new Spinner("Checking on-chain...").start();
          try {
            const builder = program.methods
              .checkPermission(required)
              .accountsPartial({ organization: org.address, membership: membershipPda });

            const result = await executeTx({ builder, provider, spinner: spin, label: "checkPermission", priorityFee: g.priorityFee });
            spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Permission GRANTED (on-chain)");
            printTx(`On-chain check passed for ${truncKey(memberKey)}`, result.signature, g.cluster);
          } catch (err: any) {
            spin.fail("Permission DENIED (on-chain)");
            printErr(err);
          }
          return;
        }

        // ── Off-chain check with auto-refresh ──────────────────
        let data = await (program.account as any).membership.fetch(membershipPda);
        const orgData = await (program.account as any).organization.fetch(org.address);

        let cachedBN = new BN(data.cachedPermissions);
        let memberEpoch = new BN(data.permissionsEpoch);
        const orgEpoch = new BN(orgData.permissionsEpoch);

        // Stale permissions — offer auto-refresh
        if (!memberEpoch.eq(orgEpoch)) {
          if (!g.json) {
            console.log(`\n  ${T.warn("⚠")} Permissions cache is stale (epoch ${memberEpoch}/${orgEpoch})`);
          }

          const shouldRefresh = g.force || (!g.json && await confirm("Auto-refresh permissions now?"));

          if (shouldRefresh) {
            const refreshSpin = new Spinner("Refreshing permissions...").start();
            try {
              const bitmap = new BN(data.rolesBitmap);
              const remainingAccounts = buildRoleAccounts(org.address, bitmap);

              const refreshBuilder = program.methods
                .refreshPermissions()
                .accountsPartial({ payer: provider.wallet.publicKey, organization: org.address, membership: membershipPda })
                .remainingAccounts(remainingAccounts);

              await executeTx({ builder: refreshBuilder, provider, spinner: refreshSpin, label: "refreshPermissions", priorityFee: g.priorityFee });
              refreshSpin.succeed("Permissions refreshed");

              // Re-fetch fresh data
              data = await (program.account as any).membership.fetch(membershipPda);
              cachedBN = new BN(data.cachedPermissions);
              memberEpoch = new BN(data.permissionsEpoch);
            } catch (err: any) {
              refreshSpin.fail();
              printErr(err);
              return;
            }
          }
        }

        // Compute grant decision
        let granted = false;
        if (!data.isActive) {
          granted = false;
        } else if (data.expiresAt && new BN(data.expiresAt).toNumber() < Math.floor(Date.now() / 1000)) {
          granted = false;
        } else if (!memberEpoch.eq(orgEpoch)) {
          granted = false;
        } else {
          granted = hasPermission(cachedBN, required);
        }

        printPermCheck({
          member: memberStr, required, actual: cachedBN,
          isActive: data.isActive, memberEpoch, orgEpoch,
          expiresAt: data.expiresAt, granted,
        });
      } catch (err: any) {
        printErr(err);
      }
    });

  // ── refresh ──────────────────────────────────────────────────
  member
    .command("refresh <member-pubkey>")
    .description("Refresh cached permissions (permissionless)")
    .action(async (memberStr: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Refreshing permissions...").start();
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [membershipPda] = findMembershipPda(org.address, memberKey);

        const mData = await (program.account as any).membership.fetch(membershipPda);
        const bitmap = new BN(mData.rolesBitmap);
        const remainingAccounts = buildRoleAccounts(org.address, bitmap);

        const builder = program.methods
          .refreshPermissions()
          .accountsPartial({
            payer: provider.wallet.publicKey,
            organization: org.address,
            membership: membershipPda,
          })
          .remainingAccounts(remainingAccounts);

        const result = await executeTx({ builder, provider, spinner: spin, label: "refreshPermissions", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Permissions refreshed");
        printTx(`Permissions refreshed for ${truncKey(memberKey)}`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── update-expiry ────────────────────────────────────────────
  member
    .command("update-expiry <member-pubkey>")
    .description("Update or remove membership expiry")
    .option("-e, --expires <timestamp>", "New unix expiry timestamp")
    .option("--remove", "Remove expiry (never expires)")
    .action(async (memberStr: string, opts: any, cmd: Command) => {
      const spin = new Spinner("Updating expiry...").start();
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [membershipPda] = findMembershipPda(org.address, memberKey);

        let newExpiresAt: BN | null = null;
        if (opts.expires && !opts.remove) {
          newExpiresAt = new BN(opts.expires);
        }

        const builder = program.methods
          .updateMembershipExpiry(newExpiresAt)
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            membership: membershipPda,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "updateMembershipExpiry", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Expiry updated");

        const action = newExpiresAt ? `set to ${newExpiresAt.toString()}` : "removed";
        printTx(`Expiry ${action} for ${truncKey(memberKey)}`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── leave ────────────────────────────────────────────────────
  member
    .command("leave")
    .description("Leave the organization (must revoke all roles first)")
    .option("-f, --force", "Skip confirmation")
    .action(async (opts: any, cmd: Command) => {
      const spin = new Spinner("Leaving organization...").start();
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const signer = provider.wallet.publicKey;
        const [membershipPda] = findMembershipPda(org.address, signer);

        if (!opts.force && !g.force) {
          spin.fail();
          const ok = await confirm("Leave this organization?");
          if (!ok) return printErr("Cancelled.");
          spin.start();
        }

        const builder = program.methods
          .leaveOrganization()
          .accountsPartial({
            member: signer,
            organization: org.address,
            membership: membershipPda,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "leaveOrganization", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Left organization");
        printTx("Left the organization", result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── close ────────────────────────────────────────────────────
  member
    .command("close <member-pubkey>")
    .description("Admin: close a membership (requires roles_bitmap == 0)")
    .option("-f, --force", "Skip confirmation")
    .action(async (memberStr: string, opts: any, cmd: Command) => {
      const spin = new Spinner("Closing membership...").start();
      try {
        const memberKey = validatePubkey(memberStr, "member");
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [membershipPda] = findMembershipPda(org.address, memberKey);

        if (!opts.force && !g.force) {
          spin.fail();
          const ok = await confirm(`Close membership for ${truncKey(memberKey)}? Rent will be reclaimed.`);
          if (!ok) return printErr("Cancelled.");
          spin.start();
        }

        const builder = program.methods
          .closeMembership()
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            membership: membershipPda,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "closeMembership", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Membership closed");
        printTx(`Membership for ${truncKey(memberKey)} closed — rent reclaimed`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── list ─────────────────────────────────────────────────────
  member
    .command("list")
    .description("List all members in the active organization")
    .action(async (_opts: any, cmd: Command) => {
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();

        const members = await (program.account as any).membership.all([
          { memcmp: { offset: 8, bytes: org.address.toBase58() } },
        ]);

        if (members.length === 0) {
          if (!g.json) console.log("\n  No members found.\n");
          else console.log("[]");
          return;
        }

        if (!g.json) {
          console.log(`\n  ${T.title("Members")} in '${org.name}' (${members.length} total)`);
        }
        printMemberTable(members);
      } catch (err: any) {
        printErr(err);
      }
    });
}