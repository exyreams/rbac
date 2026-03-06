/**
 * config.ts — Context and configuration management.
 */
import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  getProvider,
  getGlobalOpts,
  getRbacProgram,
  loadConfig,
  saveConfig,
} from "../setup";
import { printContext, printTx, printErr } from "../display";

export function registerConfigCommands(parent: Command): void {
  const config = parent
    .command("config")
    .description("CLI context and configuration");

  config
    .command("status")
    .description("Show wallet, balance, cluster, active org, and tx log stats")
    .action(async (_opts: any, cmd: Command) => {
      try {
        const g = getGlobalOpts(cmd);
        const provider = getProvider(g.cluster, g.keypair);
        const wallet = provider.wallet.publicKey;

        let balance = 0;
        try {
          balance = await provider.connection.getBalance(wallet);
        } catch { /* cluster unreachable */ }

        const cfg = loadConfig();
        let orgInfo: any = undefined;

        if (cfg.organization) {
          try {
            const program = getRbacProgram(provider);
            const data = await (program.account as any).organization.fetch(
              cfg.organization.address
            );
            orgInfo = {
              address: new PublicKey(cfg.organization.address),
              name: cfg.organization.name,
              admin: data.admin.toBase58(),
              roleCount: data.roleCount,
              memberCount:
                typeof data.memberCount === "number"
                  ? data.memberCount
                  : data.memberCount.toNumber(),
              epoch: data.permissionsEpoch.toString(),
            };
          } catch {
            orgInfo = {
              address: new PublicKey(cfg.organization.address),
              name: cfg.organization.name,
              admin: "unavailable",
              roleCount: 0,
              memberCount: 0,
              epoch: "?",
            };
          }
        }

        printContext({ wallet, balance, cluster: g.cluster, org: orgInfo });
      } catch (err: any) {
        printErr(err);
      }
    });

  config
    .command("reset")
    .description("Clear the active organization from config")
    .action((_opts: any, _cmd: Command) => {
      try {
        saveConfig({});
        printTx("Configuration reset — no active organization.");
      } catch (err: any) {
        printErr(err);
      }
    });
}