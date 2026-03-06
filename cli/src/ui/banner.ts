
/**
 * banner.ts — Prints a compact header before every command.
 * Suppressed automatically in JSON output mode.
 */
import chalk from "chalk";
import { isJsonMode } from "../setup";

export function printBanner(cluster: string): void {
  if (isJsonMode()) return;

  const net = cluster.includes("mainnet")
    ? "mainnet-beta"
    : cluster.includes("devnet")
      ? "devnet"
      : cluster.includes("testnet")
        ? "testnet"
        : "custom";

  console.log("");
  console.log(
    chalk.dim("  ──────────────────────────────────────────────")
  );
  console.log(
    chalk.cyan.bold("   SOLANA RBAC") + chalk.dim(" · On-Chain Access Control")
  );
  console.log(chalk.dim(`   ${net} · v0.1.0`));
  console.log(
    chalk.dim("  ──────────────────────────────────────────────")
  );
  console.log("");
}
