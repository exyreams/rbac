/**
 * format.ts — Box-drawing, table rendering, and pubkey truncation.
 *
 * All visual layout primitives live here so command files stay
 * focused on business logic.
 */
import { PublicKey } from "@solana/web3.js";
import { T } from "./theme";
import { isVerboseMode } from "../setup";

// ── ANSI helpers ───────────────────────────────────────────────

/** Strip ANSI escape codes to get the visible character count. */
export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

/** Pad a string to `width` visible characters, ignoring ANSI codes. */
export function padEnd(str: string, width: number): string {
  const visible = stripAnsi(str).length;
  return visible >= width ? str : str + " ".repeat(width - visible);
}

// ── Pubkey formatting ──────────────────────────────────────────

/** Truncate a base-58 pubkey: `Fg6P...r3wN` */
export function truncKey(key: PublicKey | string, n = 4): string {
  const s = typeof key === "string" ? key : key.toBase58();
  if (s.length <= n * 2 + 3) return s;
  return `${s.slice(0, n)}...${s.slice(-n)}`;
}

/** Format a pubkey with theme color, respecting --verbose. */
export function pk(key: PublicKey | string): string {
  const s = typeof key === "string" ? key : key.toBase58();
  return T.pubkey(isVerboseMode() ? s : truncKey(s));
}

// ── Box rendering ──────────────────────────────────────────────

/**
 * Print a bordered box with a title and key-value rows.
 *
 * ```
 *   ┌─ Organization ──────────────────────────────
 *   │  Address        Fg6P...r3wN
 *   └─────────────────────────────────────────────
 * ```
 */
export function printBox(title: string, rows: [string, string][]): void {
  const bar = "─".repeat(44);
  console.log(`\n  ${T.border("┌─")} ${T.title(title)} ${T.border(bar)}`);
  console.log(T.border("  │"));
  for (const [label, value] of rows) {
    console.log(`  ${T.border("│")}  ${T.label(label.padEnd(16))}${value}`);
  }
  console.log(T.border("  │"));
  console.log(`  ${T.border("└" + "─".repeat(48))}`);
  console.log("");
}

// ── Table rendering ────────────────────────────────────────────

/**
 * Print a columnar table with headers and a separator line.
 * `widths` controls the visible width of each column.
 * Cells with ANSI codes are padded correctly via `padEnd`.
 */
export function printTable(
  headers: string[],
  widths: number[],
  rows: string[][]
): void {
  const headerLine = headers
    .map((h, i) => padEnd(T.bold(h), widths[i]))
    .join("  ");
  const separator = widths.map((w) => "─".repeat(w)).join("──");

  console.log(`\n  ${headerLine}`);
  console.log(`  ${T.border(separator)}`);

  for (const row of rows) {
    const line = row.map((cell, i) => padEnd(cell, widths[i])).join("  ");
    console.log(`  ${line}`);
  }
  console.log("");
}