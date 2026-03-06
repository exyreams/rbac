/**
 * org.ts — Organization lifecycle with simulation, retry, dry-run.
 */
import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import {
  getProvider,
  getRbacProgram,
  getGlobalOpts,
  loadConfig,
  saveConfig,
  requireOrg,
} from "../setup";
import { findOrganizationPda } from "../pda";
import { validatePubkey, validateName } from "../validation";
import { printOrg, printTx, printErr } from "../display";
import { printTable, truncKey } from "../ui/format";
import { T } from "../ui/theme";
import { Spinner } from "../ui/spinner";
import { confirm } from "../ui/prompts";
import { executeTx } from "../tx";

export function registerOrgCommands(parent: Command): void {
  const org = parent
    .command("org")
    .description("Organization lifecycle management");

  org
    .command("init <name>")
    .description("Create a new organization (you become admin)")
    .action(async (name: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Creating organization...").start();
      try {
        validateName(name);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const creator = provider.wallet.publicKey;
        const [orgPda] = findOrganizationPda(creator, name);

        const builder = program.methods
          .initializeOrganization(name)
          .accountsPartial({
            admin: creator,
            organization: orgPda,
            systemProgram: SystemProgram.programId,
          });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "initializeOrganization",
          priorityFee: g.priorityFee,
        });

        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Organization created");

        if (!result.dryRun) {
          const config = loadConfig();
          config.organization = {
            address: orgPda.toBase58(),
            name,
            creator: creator.toBase58(),
          };
          saveConfig(config);
        }

        printTx(
          result.dryRun
            ? `Would create organization '${name}'`
            : `Organization '${name}' created and set as active`,
          result.signature,
          g.cluster
        );
        if (!g.json && !result.dryRun) console.log(`  ${T.label("PDA:")} ${orgPda.toBase58()}\n`);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  org
    .command("show")
    .description("Show active organization details")
    .action(async (_opts: any, cmd: Command) => {
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const o = requireOrg();
        const data = await (program.account as any).organization.fetch(o.address);
        printOrg(data, o.address);
      } catch (err: any) {
        printErr(err);
      }
    });

  org
    .command("use <address>")
    .description("Set an existing organization as active")
    .action(async (address: string, _opts: any, cmd: Command) => {
      try {
        const orgKey = validatePubkey(address, "organization address");
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const data = await (program.account as any).organization.fetch(orgKey);

        const name = Buffer.from(data.name.slice(0, data.nameLen)).toString("utf-8");
        const config = loadConfig();
        config.organization = {
          address: orgKey.toBase58(),
          name,
          creator: data.creator.toBase58(),
        };
        saveConfig(config);
        printTx(`Now using organization '${name}' (${address})`);
      } catch (err: any) {
        printErr(err);
      }
    });

  org
    .command("list")
    .description("List organizations where you are admin or creator")
    .action(async (_opts: any, cmd: Command) => {
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const wallet = provider.wallet.publicKey;

        const [byAdmin, byCreator] = await Promise.all([
          (program.account as any).organization.all([
            { memcmp: { offset: 8, bytes: wallet.toBase58() } },
          ]),
          (program.account as any).organization.all([
            { memcmp: { offset: 40, bytes: wallet.toBase58() } },
          ]),
        ]);

        const seen = new Set<string>();
        const all: any[] = [];
        for (const item of [...byAdmin, ...byCreator]) {
          const key = item.publicKey.toBase58();
          if (!seen.has(key)) { seen.add(key); all.push(item); }
        }

        if (all.length === 0) {
          printErr("No organizations found for this wallet.");
          return;
        }

        if (g.json) {
          console.log(JSON.stringify(all.map((o: any) => ({
            address: o.publicKey.toBase58(),
            name: Buffer.from(o.account.name.slice(0, o.account.nameLen)).toString("utf-8"),
            admin: o.account.admin.toBase58(),
            roleCount: o.account.roleCount,
            memberCount: typeof o.account.memberCount === "number" ? o.account.memberCount : o.account.memberCount.toNumber(),
          })), null, 2));
          return;
        }

        console.log(`\n  ${T.title("Your Organizations")} (${all.length} found)`);
        printTable(
          ["Name", "Roles", "Members", "Admin", "Address"],
          [16, 6, 8, 14, 14],
          all.map((o: any) => {
            const d = o.account;
            return [
              Buffer.from(d.name.slice(0, d.nameLen)).toString("utf-8"),
              String(d.roleCount),
              String(typeof d.memberCount === "number" ? d.memberCount : d.memberCount.toNumber()),
              truncKey(d.admin),
              truncKey(o.publicKey),
            ];
          })
        );
      } catch (err: any) {
        printErr(err);
      }
    });

  org
    .command("transfer-admin <new-admin>")
    .description("Transfer admin to another wallet")
    .option("-f, --force", "Skip confirmation")
    .action(async (newAdmin: string, opts: any, cmd: Command) => {
      const spin = new Spinner("Transferring admin...").start();
      try {
        const newKey = validatePubkey(newAdmin, "new admin");
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const o = requireOrg();

        if (!opts.force && !g.force) {
          spin.fail();
          const ok = await confirm(`Transfer admin to ${truncKey(newKey)}? This is irreversible.`);
          if (!ok) return printErr("Cancelled.");
          spin.start();
        }

        const builder = program.methods
          .transferAdmin(newKey)
          .accountsPartial({ admin: provider.wallet.publicKey, organization: o.address });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "transferAdmin",
          priorityFee: g.priorityFee,
        });

        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Admin transferred");
        printTx(result.dryRun ? `Would transfer admin to ${newAdmin}` : `Admin transferred to ${newAdmin}`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  org
    .command("close")
    .description("Close the organization (requires 0 roles, 0 members)")
    .option("-f, --force", "Skip confirmation")
    .action(async (opts: any, cmd: Command) => {
      const spin = new Spinner("Closing organization...").start();
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const program = getRbacProgram(provider);
        const o = requireOrg();

        if (!opts.force && !g.force) {
          spin.fail();
          const ok = await confirm("Close organization and reclaim rent? Cannot be undone.");
          if (!ok) return printErr("Cancelled.");
          spin.start();
        }

        const builder = program.methods
          .closeOrganization()
          .accountsPartial({ admin: provider.wallet.publicKey, organization: o.address });

        const result = await executeTx({
          builder, provider, spinner: spin, label: "closeOrganization",
          priorityFee: g.priorityFee,
        });

        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Organization closed");

        if (!result.dryRun) {
          const config = loadConfig();
          delete config.organization;
          saveConfig(config);
        }

        printTx(result.dryRun ? "Would close organization" : "Organization closed — rent reclaimed", result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });
}