/**
 * setup.ts — Provider, config, IDL loading, and global flags.
 * Foundation module that every command file depends on.
 */
import * as fs from "fs";
import * as path from "path";
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Command } from "commander";

// ── Program IDs (must match deployed programs) ────────────────
export const RBAC_PROGRAM_ID = new PublicKey(
  "EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb"
);
export const VAULT_PROGRAM_ID = new PublicKey(
  "HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY"
);

// ── Global flags ──────────────────────────────────────────────
let _flags = { json: false, verbose: false, dryRun: false };

export function setFlags(f: { json: boolean; verbose: boolean; dryRun: boolean }): void {
  _flags = f;
}
export function isJsonMode(): boolean {
  return _flags.json;
}
export function isVerboseMode(): boolean {
  return _flags.verbose;
}
export function isDryRun(): boolean {
  return _flags.dryRun;
}

// ── Config file ───────────────────────────────────────────────
const CONFIG_FILE = ".rbac-cli.json";

export interface CliConfig {
  organization?: {
    address: string;
    name: string;
    creator: string;
  };
}

export function loadConfig(): CliConfig {
  const p = path.resolve(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function saveConfig(config: CliConfig): void {
  const p = path.resolve(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(p, JSON.stringify(config, null, 2) + "\n");
}

// ── Keypair loading ───────────────────────────────────────────
export function loadKeypair(keypairPath: string): Keypair {
  const resolved = keypairPath.replace(/^~/, process.env.HOME || "");
  if (!fs.existsSync(resolved)) {
    throw new Error(`Keypair file not found: ${resolved}`);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Provider ──────────────────────────────────────────────────
export function getProvider(
  cluster: string,
  keypairPath: string
): AnchorProvider {
  const connection = new Connection(cluster, "confirmed");
  const keypair = loadKeypair(keypairPath);
  const wallet = new anchor.Wallet(keypair);
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

// ── IDL loading ───────────────────────────────────────────────
function findIdl(name: string): any {
  const candidates = [
    path.resolve(process.cwd(), `target/idl/${name}.json`),
    path.resolve(process.cwd(), `../target/idl/${name}.json`),
    path.resolve(__dirname, `../../target/idl/${name}.json`),
    path.resolve(__dirname, `../../../target/idl/${name}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  }
  throw new Error(
    `IDL '${name}.json' not found. Run 'anchor build' first.\nSearched:\n` +
      candidates.map((c) => `  ${c}`).join("\n")
  );
}

export function getRbacProgram(provider: AnchorProvider): Program {
  return new Program(findIdl("rbac") as Idl, provider);
}

export function getVaultProgram(provider: AnchorProvider): Program {
  return new Program(findIdl("guarded_vault") as Idl, provider);
}

// ── Global options ────────────────────────────────────────────
export function getGlobalOpts(cmd: Command): {
  cluster: string;
  keypair: string;
  json: boolean;
  verbose: boolean;
  force: boolean;
  dryRun: boolean;
  priorityFee: number;
} {
  let root: Command = cmd;
  while (root.parent) root = root.parent;
  const opts = root.opts();
  return {
    cluster: opts.cluster || "https://api.devnet.solana.com",
    keypair: opts.keypair || `${process.env.HOME}/.config/solana/id.json`,
    json: !!opts.json,
    verbose: !!opts.verbose,
    force: !!opts.force,
    dryRun: !!opts.dryRun,
    priorityFee: parseInt(opts.priorityFee) || 1000,
  };
}

// ── Organization requirement ──────────────────────────────────
export function requireOrg(): {
  address: PublicKey;
  name: string;
  creator: PublicKey;
} {
  const config = loadConfig();
  if (!config.organization) {
    throw new Error(
      "No active organization. Run:\n" +
        "  rbac-cli org init <name>     — create new\n" +
        "  rbac-cli org use <address>   — use existing"
    );
  }
  return {
    address: new PublicKey(config.organization.address),
    name: config.organization.name,
    creator: new PublicKey(config.organization.creator),
  };
}

// ── Explorer URL ──────────────────────────────────────────────
export function explorerUrl(sig: string, cluster: string): string {
  const net = cluster.includes("mainnet")
    ? "mainnet-beta"
    : cluster.includes("devnet")
      ? "devnet"
      : cluster.includes("testnet")
        ? "testnet"
        : "custom";
  return `https://explorer.solana.com/tx/${sig}?cluster=${net}`;
}

// ── Balance check ─────────────────────────────────────────────
export async function checkBalance(
  connection: Connection,
  pubkey: PublicKey,
  minLamports = 10_000_000
): Promise<void> {
  const balance = await connection.getBalance(pubkey);
  if (balance < minLamports) {
    throw new Error(
      `Insufficient balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL. ` +
        `Need at least ${(minLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL.\n` +
        `  Run: solana airdrop 2 --url devnet`
    );
  }
}