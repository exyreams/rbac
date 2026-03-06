/**
 * spinner.ts — Transaction progress spinner.
 * Adds `update()` method for multi-phase feedback:
 * simulate → confirm → done.
 */
import { T } from "./theme";
import { isJsonMode } from "../setup";

const FRAMES = ["◐", "◓", "◑", "◒"];

export class Spinner {
  private msg: string;
  private idx = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private active = false;

  constructor(msg: string) {
    this.msg = msg;
  }

  start(): this {
    if (isJsonMode() || !process.stdout.isTTY) return this;
    this.active = true;
    this.timer = setInterval(() => {
      const frame = FRAMES[this.idx++ % FRAMES.length];
      process.stdout.write(`\r  ${frame} ${this.msg}`);
    }, 100);
    return this;
  }

  /** Update the spinner message mid-flight (e.g. "Simulating..." → "Confirming...") */
  update(msg: string): void {
    this.msg = msg;
    // If spinner is not active (JSON mode or non-TTY), skip
    if (!this.active) return;
    // Force an immediate redraw
    const frame = FRAMES[this.idx % FRAMES.length];
    process.stdout.write(`\r  ${frame} ${this.msg}` + " ".repeat(20));
  }

  private clear(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.active = false;
    if (process.stdout.isTTY && !isJsonMode()) {
      process.stdout.write("\r" + " ".repeat(this.msg.length + 30) + "\r");
    }
  }

  succeed(msg?: string): void {
    this.clear();
    if (!isJsonMode()) {
      console.log(`  ${T.success("✔")} ${msg || this.msg}`);
    }
  }

  fail(msg?: string): void {
    this.clear();
    if (!isJsonMode()) {
      console.log(`  ${T.error("✖")} ${msg || this.msg}`);
    }
  }
}