/**
 * theme.ts — Centralized color palette for all CLI output.
 *
 * Every visual element maps to a semantic chalk function so the
 * entire look can be changed in one place.
 */
import chalk from "chalk";

export const T = {
  /** Section headers, box titles */
  title: chalk.bold.cyan,
  /** Success messages, checkmarks */
  success: chalk.green,
  /** Error messages, x-marks */
  error: chalk.red,
  /** Warnings, caution prompts */
  warn: chalk.yellow,
  /** Field labels in key-value displays */
  label: chalk.dim,
  /** Public keys, addresses */
  pubkey: chalk.yellow,
  /** Permission names */
  perm: chalk.magenta,
  /** Box borders, separators */
  border: chalk.dim,
  /** De-emphasized text (signatures, links) */
  dim: chalk.dim,
  /** Emphasis */
  bold: chalk.bold,
  /** Active status indicator */
  active: chalk.green("●"),
  /** Inactive status indicator */
  inactive: chalk.red("○"),
};
