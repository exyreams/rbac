/**
 * tx.ts — Transaction execution engine.
 *
 * Wraps every on-chain write with:
 *   1. Compute budget + priority fee instructions
 *   2. Simulation (catches errors before spending SOL)
 *   3. Dry-run mode (simulate only, no send)
 *   4. Retry with exponential backoff for network errors
 *   5. Transaction logging to .rbac-cli-log.jsonl
 */
import * as fs from "fs";
import * as path from "path";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Spinner } from "./ui/spinner";
import { isDryRun, isJsonMode } from "./setup";
import { parseAnchorError, ParsedError } from "./errors";
import { T } from "./ui/theme";

const TX_LOG_FILE = ".rbac-cli-log.jsonl";

export interface TxResult {
  signature: string;
  computeUnits?: number;
  dryRun: boolean;
}

export interface ExecuteOpts {
  /** Anchor MethodsBuilder — after .accountsPartial(), .remainingAccounts(), etc. */
  builder: any;
  /** Anchor provider (connection + wallet) */
  provider: AnchorProvider;
  /** Spinner to update with progress phases */
  spinner?: Spinner;
  /** Label for the tx log (e.g. "assignRole") */
  label?: string;
  /** Compute unit limit (default: 200,000) */
  computeUnits?: number;
  /** Priority fee in micro-lamports (default: 1,000) */
  priorityFee?: number;
  /** Max send attempts for retryable errors (default: 3) */
  retries?: number;
}

/**
 * Execute a transaction through the full lifecycle:
 * simulate → dry-run check → send with retry → log.
 *
 * Throws a `ParsedError` on failure (simulation or send).
 * Returns `TxResult` on success.
 */
export async function executeTx(opts: ExecuteOpts): Promise<TxResult> {
  const {
    builder,
    provider,
    spinner,
    label = "transaction",
    computeUnits = 200_000,
    priorityFee = 1_000,
    retries = 3,
  } = opts;

  // ── 1. Add compute budget pre-instructions ──────────────────
  const withBudget = builder.preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
  ]);

  // ── 2. Simulate ─────────────────────────────────────────────
  spinner?.update("Simulating transaction...");
  let unitsUsed = 0;

  try {
    const sim = await withBudget.simulate();
    unitsUsed = sim?.raw?.unitsConsumed ?? 0;
  } catch (err: any) {
    const parsed = parseAnchorError(err);
    spinner?.fail(`Simulation failed: ${parsed.code}`);
    throw parsed;
  }

  // ── 3. Dry-run exit ─────────────────────────────────────────
  if (isDryRun()) {
    spinner?.succeed(`Dry run passed — ${unitsUsed} CU estimated`);
    if (!isJsonMode()) {
      console.log(`\n  ${T.dim("No transaction sent (--dry-run mode)")}`);
      console.log(`  ${T.dim(`Estimated compute: ${unitsUsed} units`)}\n`);
    }
    return { signature: "(dry-run)", computeUnits: unitsUsed, dryRun: true };
  }

  // ── 4. Send with retry ──────────────────────────────────────
  let lastErr: ParsedError | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      spinner?.update(
        attempt > 1
          ? `Sending transaction (attempt ${attempt}/${retries})...`
          : "Confirming transaction..."
      );

      const sig: string = await withBudget.rpc();

      // ── 5. Log to file ────────────────────────────────────
      logTx(sig, label);

      return { signature: sig, computeUnits: unitsUsed, dryRun: false };
    } catch (err: any) {
      lastErr = parseAnchorError(err);

      // Program errors will fail again on retry — don't bother
      if (lastErr.isAnchorError || !lastErr.isRetryable) {
        spinner?.fail(`Failed: ${lastErr.code}`);
        throw lastErr;
      }

      // Exponential backoff for network errors
      if (attempt < retries) {
        const delay = 1000 * attempt;
        spinner?.update(`Network error — retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  spinner?.fail("Failed after all retry attempts");
  throw lastErr!;
}

/** Append a transaction record to the local JSONL log file. */
function logTx(sig: string, label: string): void {
  try {
    const logPath = path.resolve(process.cwd(), TX_LOG_FILE);
    const entry = {
      timestamp: new Date().toISOString(),
      signature: sig,
      operation: label,
    };
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
  } catch {
    // Never let logging break the CLI
  }
}