/**
 * index.ts — CLI entry point.
 * Registers all commands, global flags (including --dry-run, --priority-fee),
 * pre-action hook for flag init + banner, and completion command.
 */
import { Command } from "commander";
import { setFlags } from "./setup";
import { printBanner } from "./ui/banner";
import { registerConfigCommands } from "./commands/config";
import { registerOrgCommands } from "./commands/org";
import { registerRoleCommands } from "./commands/role";
import { registerMemberCommands } from "./commands/member";
import { registerVaultCommands } from "./commands/vault";
import { generateCompletion } from "./completion";

const program = new Command();

program
  .name("rbac-cli")
  .description(
    "CLI for the Solana On-Chain RBAC + Guarded Vault programs.\n" +
      "Manages organizations, roles, memberships, and CPI-guarded vaults."
  )
  .version("0.1.0")
  .option(
    "-c, --cluster <url>",
    "Solana cluster RPC URL",
    "https://api.devnet.solana.com"
  )
  .option(
    "-k, --keypair <path>",
    "Path to signer keypair JSON",
    `${process.env.HOME}/.config/solana/id.json`
  )
  .option("--json", "Output results as JSON")
  .option("--verbose", "Show full public keys and extra detail")
  .option("-f, --force", "Skip confirmation prompts")
  .option("--dry-run", "Simulate transactions without sending")
  .option(
    "--priority-fee <micro-lamports>",
    "Priority fee per compute unit",
    "1000"
  );

// Set global flags and show banner before every command
program.hook("preAction", (thisCmd) => {
  let root: Command = thisCmd;
  while (root.parent) root = root.parent;
  const opts = root.opts();
  setFlags({
    json: !!opts.json,
    verbose: !!opts.verbose,
    dryRun: !!opts.dryRun,
  });
  printBanner(opts.cluster || "https://api.devnet.solana.com");
});

// Register all command groups
registerConfigCommands(program);
registerOrgCommands(program);
registerRoleCommands(program);
registerMemberCommands(program);
registerVaultCommands(program);

// Shell completion command
program
  .command("completion <shell>")
  .description("Generate shell completion script (bash, zsh, fish)")
  .action((shell: string) => {
    generateCompletion(shell);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});