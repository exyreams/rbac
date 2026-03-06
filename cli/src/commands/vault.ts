/**
 * vault.ts — CPI-guarded vault commands with executeTx engine.
 */
import { Command } from "commander";
import { SystemProgram } from "@solana/web3.js";
import {
  getProvider,
  getVaultProgram,
  getGlobalOpts,
  requireOrg,
  RBAC_PROGRAM_ID,
} from "../setup";
import { findMembershipPda, findVaultPda } from "../pda";
import { validateLabel, validateData } from "../validation";
import { printVault, printVaultTable, printTx, printErr } from "../display";
import { T } from "../ui/theme";
import { Spinner } from "../ui/spinner";
import { confirm } from "../ui/prompts";
import { executeTx } from "../tx";

export function registerVaultCommands(parent: Command): void {
  const vault = parent
    .command("vault")
    .description("CPI-guarded vault operations (requires RBAC permissions)");

  // ── create ───────────────────────────────────────────────────
  vault
    .command("create <label> <data>")
    .description("Create a vault (requires WRITE permission)")
    .action(async (label: string, data: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Creating vault...").start();
      try {
        validateLabel(label);
        validateData(data);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const vaultProgram = getVaultProgram(provider);
        const org = requireOrg();

        const signer = provider.wallet.publicKey;
        const [membershipPda] = findMembershipPda(org.address, signer);
        const [vaultPda] = findVaultPda(org.address, label);
        const dataBuffer = Buffer.from(data, "utf-8");

        const builder = vaultProgram.methods
          .initializeVault(label, dataBuffer as any)
          .accountsPartial({
            signer,
            organization: org.address,
            membership: membershipPda,
            vault: vaultPda,
            rbacProgram: RBAC_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "initializeVault", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Vault created");
        printTx(result.dryRun ? `Would create vault '${label}'` : `Vault '${label}' created`, result.signature, g.cluster);
        if (!g.json && !result.dryRun) console.log(`  ${T.label("PDA:")} ${vaultPda.toBase58()}\n`);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── write ────────────────────────────────────────────────────
  vault
    .command("write <label> <data>")
    .description("Overwrite vault data (requires WRITE permission)")
    .action(async (label: string, data: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Writing vault...").start();
      try {
        validateLabel(label);
        validateData(data);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const vaultProgram = getVaultProgram(provider);
        const org = requireOrg();

        const signer = provider.wallet.publicKey;
        const [membershipPda] = findMembershipPda(org.address, signer);
        const [vaultPda] = findVaultPda(org.address, label);
        const dataBuffer = Buffer.from(data, "utf-8");

        const builder = vaultProgram.methods
          .writeVault(dataBuffer as any)
          .accountsPartial({
            signer,
            organization: org.address,
            membership: membershipPda,
            vault: vaultPda,
            rbacProgram: RBAC_PROGRAM_ID,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "writeVault", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Vault updated");
        printTx(`Vault '${label}' updated`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── read ─────────────────────────────────────────────────────
  vault
    .command("read <label>")
    .description("Read vault with on-chain audit trail (requires READ)")
    .action(async (label: string, _opts: any, cmd: Command) => {
      const spin = new Spinner("Reading vault (on-chain audit)...").start();
      try {
        validateLabel(label);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const vaultProgram = getVaultProgram(provider);
        const org = requireOrg();

        const signer = provider.wallet.publicKey;
        const [membershipPda] = findMembershipPda(org.address, signer);
        const [vaultPda] = findVaultPda(org.address, label);

        const builder = vaultProgram.methods
          .readVault()
          .accountsPartial({
            signer,
            organization: org.address,
            membership: membershipPda,
            vault: vaultPda,
            rbacProgram: RBAC_PROGRAM_ID,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "readVault", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Read audit logged on-chain");

        if (!result.dryRun) {
          const data = await (vaultProgram.account as any).vault.fetch(vaultPda);
          printVault(data, vaultPda);
        }
        printTx(result.dryRun ? "Would log read audit trail" : "Read audit trail recorded", result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── delete ───────────────────────────────────────────────────
  vault
    .command("delete <label>")
    .description("Delete a vault (requires DELETE permission)")
    .option("-f, --force", "Skip confirmation")
    .action(async (label: string, opts: any, cmd: Command) => {
      const spin = new Spinner("Deleting vault...").start();
      try {
        validateLabel(label);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const vaultProgram = getVaultProgram(provider);
        const org = requireOrg();

        const signer = provider.wallet.publicKey;
        const [membershipPda] = findMembershipPda(org.address, signer);
        const [vaultPda] = findVaultPda(org.address, label);

        if (!opts.force && !g.force) {
          spin.fail();
          const ok = await confirm(`Delete vault '${label}'? Account will be closed and rent reclaimed.`);
          if (!ok) return printErr("Cancelled.");
          spin.start();
        }

        const builder = vaultProgram.methods
          .deleteVault()
          .accountsPartial({
            signer,
            organization: org.address,
            membership: membershipPda,
            vault: vaultPda,
            rbacProgram: RBAC_PROGRAM_ID,
          });

        const result = await executeTx({ builder, provider, spinner: spin, label: "deleteVault", priorityFee: g.priorityFee });
        spin.succeed(result.dryRun ? "Dry run — simulation passed" : "Vault deleted");
        printTx(`Vault '${label}' deleted — rent reclaimed`, result.signature, g.cluster);
      } catch (err: any) {
        spin.fail();
        printErr(err);
      }
    });

  // ── show ─────────────────────────────────────────────────────
  vault
    .command("show <label>")
    .description("Show vault data (off-chain, no permission check)")
    .action(async (label: string, _opts: any, cmd: Command) => {
      try {
        validateLabel(label);
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const vaultProgram = getVaultProgram(provider);
        const org = requireOrg();
        const [vaultPda] = findVaultPda(org.address, label);

        const data = await (vaultProgram.account as any).vault.fetch(vaultPda);
        printVault(data, vaultPda);
      } catch (err: any) {
        printErr(err);
      }
    });

  // ── list ─────────────────────────────────────────────────────
  vault
    .command("list")
    .description("List all vaults in the active organization")
    .action(async (_opts: any, cmd: Command) => {
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const vaultProgram = getVaultProgram(provider);
        const org = requireOrg();

        const vaults = await (vaultProgram.account as any).vault.all([
          { memcmp: { offset: 8, bytes: org.address.toBase58() } },
        ]);

        if (vaults.length === 0) {
          if (!g.json) console.log("\n  No vaults found.\n");
          else console.log("[]");
          return;
        }

        if (!g.json) {
          console.log(`\n  ${T.title("Vaults")} in '${org.name}' (${vaults.length} total)`);
        }
        printVaultTable(vaults);
      } catch (err: any) {
        printErr(err);
      }
    });
}