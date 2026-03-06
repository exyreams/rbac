/**
 * prompts.ts — Interactive confirmation for destructive operations.
 * Auto-rejects when stdin is not a TTY (piped input) or in JSON mode.
 */
import * as readline from "readline";
import { isJsonMode } from "../setup";
import { T } from "./theme";

export function confirm(message: string): Promise<boolean> {
  if (isJsonMode() || !process.stdin.isTTY) return Promise.resolve(false);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`  ${T.warn("⚠")} ${message} ${T.dim("(y/N):")} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}