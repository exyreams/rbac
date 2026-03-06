/**
 * role.ts — Role lifecycle management with executeTx engine.
 * create, show, list, update, deactivate, reactivate, close, perms.
 */
import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import {
  getProvider,
  getRbacProgram,
  getGlobalOpts,
  requireOrg,
} from "../setup";
import { findRolePda, findMembershipPda } from "../pda";
import { validateName, validateRoleIndex } from "../validation";
import {
  parsePermissions,
  listPermissions,
  decodePermissions,
  formatHex,
} from "../permissions";
import {
  printRole,
  printRoleTable,
  printTx,
  printErr,
} from "../display";
import { truncKey } from "../ui/format";
import { T } from "../ui/theme";
import { Spinner } from "../ui/spinner";
import { confirm } from "../ui/prompts";
import { executeTx } from "../tx";

export function registerRoleCommands(parent: Command): void {
  const role = parent
    .command("role")
    .description("Role lifecycle management");

  // ── create ───────────────────────────────────────────────────
  role
    .command("create <name> <role-index> <permissions>")
    .description("Create a new role (admin only)")
    .action(async (name: string, roleIdxStr: string, permsStr: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Creating role...").start();
      try {
        validateName(name);
        const roleIndex = validateRoleIndex(roleIdxStr);
        const permissions = parsePermissions(permsStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();

        const [rolePda] = findRolePda(org.address, roleIndex);

        const builder = program.methods
          .createRole(name, roleIndex, permissions)
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            role: rolePda,
            systemProgram: SystemProgram.programId,
          });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "createRole",
          priorityFee: g.priorityFee,
        });

        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role created");
        printTx(
          result.dryRun
            ? `Would create role '${name}' at index ${roleIndex}`
            : `Role '${name}' created at index ${roleIndex}`,
          result.signature,
          g.cluster
        );
        if (!g.json && !result.dryRun) {
          console.log(`  ${T.label("PDA:")} ${rolePda.toBase58()}`);
          console.log(`  ${T.label("Permissions:")} ${T.perm(decodePermissions(permissions).join(", "))}\n`);
        }
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── show ─────────────────────────────────────────────────────
  role
    .command("show <role-index>")
    .description("Show role details by index")
    .action(async (roleIdxStr: string, _opts: any, cmd: Command) => {
      try {
        const roleIndex = validateRoleIndex(roleIdxStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [rolePda] = findRolePda(org.address, roleIndex);

        const data = await (program.account as any).role.fetch(rolePda);
        printRole(data, rolePda);
      } catch (err: any) {
        printErr(err);
      }
    });

  // ── list ─────────────────────────────────────────────────────
  role
    .command("list")
    .description("List all roles in the active organization")
    .action(async (_opts: any, cmd: Command) => {
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();

        const roles = await (program.account as any).role.all([
          { memcmp: { offset: 8, bytes: org.address.toBase58() } },
        ]);

        if (roles.length === 0) {
          if (!g.json) console.log("\n  No roles found.\n");
          else console.log("[]");
          return;
        }

        if (!g.json) {
          console.log(`\n  ${T.title("Roles")} in '${org.name}' (${roles.length} total)`);
        }
        printRoleTable(roles);
      } catch (err: any) {
        printErr(err);
      }
    });

  // ── update ───────────────────────────────────────────────────
  role
    .command("update <role-index> <new-permissions>")
    .description("Update role permissions (bumps org epoch)")
    .action(async (roleIdxStr: string, permsStr: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Updating role...").start();
      try {
        const roleIndex = validateRoleIndex(roleIdxStr);
        const newPerms = parsePermissions(permsStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [rolePda] = findRolePda(org.address, roleIndex);

        const builder = program.methods
          .updateRolePermissions(newPerms)
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            role: rolePda,
          });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "updateRolePermissions",
          priorityFee: g.priorityFee,
        });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role updated");
        printTx(
          `Role ${roleIndex} permissions updated to ${formatHex(newPerms)}`,
          result.signature,
          g.cluster
        );
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── deactivate ───────────────────────────────────────────────
  role
    .command("deactivate <role-index>")
    .description("Deactivate a role (members keep assignment but perms stop working)")
    .action(async (roleIdxStr: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Deactivating role...").start();
      try {
        const roleIndex = validateRoleIndex(roleIdxStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [rolePda] = findRolePda(org.address, roleIndex);

        const builder = program.methods
          .deactivateRole()
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            role: rolePda,
          });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "deactivateRole",
          priorityFee: g.priorityFee,
        });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role deactivated");
        printTx(`Role ${roleIndex} deactivated`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── reactivate ───────────────────────────────────────────────
  role
    .command("reactivate <role-index>")
    .description("Reactivate a previously deactivated role")
    .action(async (roleIdxStr: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Reactivating role...").start();
      try {
        const roleIndex = validateRoleIndex(roleIdxStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [rolePda] = findRolePda(org.address, roleIndex);

        const builder = program.methods
          .reactivateRole()
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            role: rolePda,
          });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "reactivateRole",
          priorityFee: g.priorityFee,
        });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role reactivated");
        printTx(`Role ${roleIndex} reactivated`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── close ────────────────────────────────────────────────────
  role
    .command("close <role-index>")
    .description("Close a role account (requires 0 members holding it)")
    .option("-f, --force", "Skip confirmation")
    .action(async (roleIdxStr: string, opts: any, cmd: Command) => {
      const spin = new Spinner("Closing role...").start();
      try {
        const roleIndex = validateRoleIndex(roleIdxStr);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const org = requireOrg();
        const [rolePda] = findRolePda(org.address, roleIndex);

        if (!opts.force && !g.force) {
          spin.fail();
          const ok = await confirm(`Close role ${roleIndex}? Rent will be reclaimed.`);
          if (!ok) return printErr("Cancelled.");
          spin.start();
        }

        const builder = program.methods
          .closeRole()
          .accountsPartial({
            admin: provider.wallet.publicKey,
            organization: org.address,
            role: rolePda,
          });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "closeRole",
          priorityFee: g.priorityFee,
        });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Role closed");
        printTx(`Role ${roleIndex} closed — rent reclaimed`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── perms ────────────────────────────────────────────────────
  role
    .command("perms")
    .description("Show the permission reference table")
    .action(() => {
      listPermissions();
    });
}