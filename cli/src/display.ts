/**
 * display.ts — All high-level print functions.
 * Handles JSON and formatted output, with structured error display.
 */
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import { T } from "./ui/theme";
import { printBox, printTable, pk, truncKey } from "./ui/format";
import { isJsonMode, isVerboseMode, explorerUrl } from "./setup";
import { decodePermissions, formatHex, hasPermission } from "./permissions";
import { parseAnchorError, ParsedError } from "./errors";

// ── Helpers ────────────────────────────────────────────────────

function toBN(val: any): BN {
  if (BN.isBN(val)) return val;
  if (typeof val === "number") return new BN(val);
  if (typeof val === "bigint") return new BN(val.toString());
  return new BN(0);
}

function toNum(val: any): number {
  if (BN.isBN(val)) return val.toNumber();
  if (typeof val === "number") return val;
  return 0;
}

function decodeName(arr: number[] | Uint8Array, len?: number): string {
  const a = Array.from(arr);
  const end =
    len != null ? len : a.indexOf(0) === -1 ? a.length : a.indexOf(0);
  return Buffer.from(a.slice(0, end)).toString("utf-8");
}

function fmtTs(val: any): string {
  const n = toNum(val);
  return n === 0 ? "—" : new Date(n * 1000).toISOString();
}

function activeStr(isActive: boolean): string {
  return isActive ? `${T.active} yes` : `${T.inactive} no`;
}

// ── Transaction result ─────────────────────────────────────────

export function printTx(msg: string, sig?: string, cluster?: string): void {
  if (isJsonMode()) {
    console.log(JSON.stringify({ success: true, message: msg, signature: sig || null }));
    return;
  }
  console.log(`\n  ${T.success("✔")} ${msg}`);
  if (sig && sig !== "(dry-run)") {
    console.log(`  ${T.label("Signature:")}  ${T.dim(sig)}`);
    if (cluster) {
      console.log(`  ${T.label("Explorer:")}   ${T.dim(explorerUrl(sig, cluster))}`);
    }
  }
  console.log("");
}

// ── Messages ───────────────────────────────────────────────────

export function printInfo(msg: string): void {
  if (isJsonMode()) {
    console.log(JSON.stringify({ info: msg }));
  } else {
    console.log(`\n  ${T.success("ℹ")} ${msg}\n`);
  }
}

/**
 * Print an error with structured parsing.
 * Accepts: string, Error, ParsedError, or any Anchor error object.
 * Extracts error code, message, and actionable suggestion.
 * Shows transaction logs in --verbose mode.
 */
export function printErr(err: any): void {
  // Normalize to ParsedError
  const parsed: ParsedError =
    err && typeof err === "object" && "isAnchorError" in err
      ? (err as ParsedError)
      : parseAnchorError(err);

  if (isJsonMode()) {
    console.error(
      JSON.stringify({
        success: false,
        error: parsed.code,
        message: parsed.message,
        suggestion: parsed.suggestion || undefined,
      })
    );
  } else {
    // Display code + message
    if (parsed.code !== "Error" && parsed.message !== parsed.code) {
      console.error(`\n  ${T.error("✖")} ${T.bold(parsed.code)}`);
      console.error(`    ${parsed.message}`);
    } else {
      console.error(`\n  ${T.error("✖")} ${parsed.message}`);
    }

    // Actionable suggestion
    if (parsed.suggestion) {
      console.error(`\n    ${T.dim("→")} ${parsed.suggestion}`);
    }

    // Transaction logs in verbose mode
    if (parsed.logs && isVerboseMode()) {
      console.error(`\n    ${T.dim("Transaction logs (last 10):")}`);
      for (const log of parsed.logs.slice(-10)) {
        console.error(`      ${T.dim(log)}`);
      }
    }
  }

  console.error("");
  process.exitCode = 1;
}

// ── Organization ───────────────────────────────────────────────

export function printOrg(data: any, address: PublicKey): void {
  if (isJsonMode()) {
    console.log(
      JSON.stringify({
        address: address.toBase58(),
        name: decodeName(data.name, data.nameLen),
        admin: data.admin.toBase58(),
        creator: data.creator.toBase58(),
        roleCount: data.roleCount,
        memberCount: toNum(data.memberCount),
        permissionsEpoch: toBN(data.permissionsEpoch).toString(),
        createdAt: toNum(data.createdAt),
      })
    );
    return;
  }
  printBox("Organization", [
    ["Address", pk(address)],
    ["Name", decodeName(data.name, data.nameLen)],
    ["Admin", pk(data.admin)],
    ["Creator", pk(data.creator)],
    ["Roles", String(data.roleCount)],
    ["Members", String(toNum(data.memberCount))],
    ["Epoch", toBN(data.permissionsEpoch).toString()],
    ["Created", fmtTs(data.createdAt)],
  ]);
}

// ── Role ───────────────────────────────────────────────────────

export function printRole(data: any, address: PublicKey): void {
  const permsBN = toBN(data.permissions);
  const names = decodePermissions(permsBN);
  if (isJsonMode()) {
    console.log(
      JSON.stringify({
        address: address.toBase58(),
        name: decodeName(data.name),
        roleIndex: data.roleIndex,
        permissions: formatHex(permsBN),
        permissionNames: names,
        isActive: data.isActive,
        referenceCount: toNum(data.referenceCount),
        createdBy: data.createdBy.toBase58(),
        createdAt: toNum(data.createdAt),
        updatedAt: toNum(data.updatedAt),
      })
    );
    return;
  }
  printBox("Role", [
    ["Address", pk(address)],
    ["Name", decodeName(data.name)],
    ["Index", String(data.roleIndex)],
    ["Permissions", `${formatHex(permsBN)} ${T.perm(names.join(", ") || "NONE")}`],
    ["Active", activeStr(data.isActive)],
    ["Ref count", String(toNum(data.referenceCount))],
    ["Created by", pk(data.createdBy)],
    ["Created", fmtTs(data.createdAt)],
    ["Updated", fmtTs(data.updatedAt)],
  ]);
}

export function printRoleTable(
  roles: { publicKey: PublicKey; account: any }[]
): void {
  if (isJsonMode()) {
    const arr = roles.map((r) => ({
      address: r.publicKey.toBase58(),
      name: decodeName(r.account.name),
      roleIndex: r.account.roleIndex,
      permissions: decodePermissions(toBN(r.account.permissions)),
      isActive: r.account.isActive,
      referenceCount: toNum(r.account.referenceCount),
    }));
    console.log(JSON.stringify(arr, null, 2));
    return;
  }
  const headers = ["#", "Name", "Permissions", "Active", "Refs", "Address"];
  const widths = [3, 12, 28, 8, 5, 12];
  const rows = roles.map((r) => {
    const d = r.account;
    return [
      String(d.roleIndex),
      decodeName(d.name),
      T.perm(decodePermissions(toBN(d.permissions)).join(",") || "NONE"),
      d.isActive ? T.active : T.inactive,
      String(toNum(d.referenceCount)),
      truncKey(r.publicKey),
    ];
  });
  printTable(headers, widths, rows);
}

// ── Membership ─────────────────────────────────────────────────

export function printMembership(data: any, address: PublicKey): void {
  const rolesBN = toBN(data.rolesBitmap);
  const cachedBN = toBN(data.cachedPermissions);
  const epochBN = toBN(data.permissionsEpoch);
  const permNames = decodePermissions(cachedBN);

  const roleIndices: number[] = [];
  for (let i = 0; i < 64; i++) {
    if (!rolesBN.and(new BN(1).shln(i)).isZero()) roleIndices.push(i);
  }

  if (isJsonMode()) {
    console.log(
      JSON.stringify({
        address: address.toBase58(),
        organization: data.organization.toBase58(),
        member: data.member.toBase58(),
        rolesBitmap: formatHex(rolesBN),
        roleIndices,
        cachedPermissions: formatHex(cachedBN),
        permissionNames: permNames,
        permissionsEpoch: epochBN.toString(),
        isActive: data.isActive,
        grantedBy: data.grantedBy.toBase58(),
        expiresAt: data.expiresAt ? toNum(data.expiresAt) : null,
        createdAt: toNum(data.createdAt),
        lastUpdated: toNum(data.lastUpdated),
      })
    );
    return;
  }

  let expiryStr = "never";
  if (data.expiresAt) {
    const exp = toNum(data.expiresAt);
    const now = Math.floor(Date.now() / 1000);
    expiryStr =
      fmtTs(data.expiresAt) +
      (exp < now ? ` ${T.error("(EXPIRED)")}` : ` ${T.success("(active)")}`);
  }

  printBox("Membership", [
    ["Address", pk(address)],
    ["Organization", pk(data.organization)],
    ["Member", pk(data.member)],
    ["Roles bitmap", `${formatHex(rolesBN)} ${T.dim("indices: " + (roleIndices.join(", ") || "none"))}`],
    ["Permissions", `${formatHex(cachedBN)} ${T.perm(permNames.join(", ") || "NONE")}`],
    ["Epoch", epochBN.toString()],
    ["Active", activeStr(data.isActive)],
    ["Granted by", pk(data.grantedBy)],
    ["Expires", expiryStr],
    ["Created", fmtTs(data.createdAt)],
    ["Updated", fmtTs(data.lastUpdated)],
  ]);
}

export function printMemberTable(
  members: { publicKey: PublicKey; account: any }[]
): void {
  if (isJsonMode()) {
    const arr = members.map((m) => ({
      address: m.publicKey.toBase58(),
      member: m.account.member.toBase58(),
      roles: (() => {
        const idxs: number[] = [];
        const bm = toBN(m.account.rolesBitmap);
        for (let i = 0; i < 64; i++) {
          if (!bm.and(new BN(1).shln(i)).isZero()) idxs.push(i);
        }
        return idxs;
      })(),
      permissions: decodePermissions(toBN(m.account.cachedPermissions)),
      isActive: m.account.isActive,
    }));
    console.log(JSON.stringify(arr, null, 2));
    return;
  }
  const headers = ["Member", "Roles", "Permissions", "Active", "Epoch"];
  const widths = [14, 10, 30, 8, 6];
  const rows = members.map((m) => {
    const d = m.account;
    const bm = toBN(d.rolesBitmap);
    const idxs: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (!bm.and(new BN(1).shln(i)).isZero()) idxs.push(i);
    }
    return [
      truncKey(d.member),
      idxs.join(",") || "—",
      T.perm(decodePermissions(toBN(d.cachedPermissions)).join(",") || "NONE"),
      d.isActive ? T.active : T.inactive,
      toBN(d.permissionsEpoch).toString(),
    ];
  });
  printTable(headers, widths, rows);
}

// ── Vault ──────────────────────────────────────────────────────

export function printVault(data: any, address: PublicKey): void {
  const dataLen = data.dataLen;
  const raw = Buffer.from(data.data.slice(0, dataLen));

  if (isJsonMode()) {
    console.log(
      JSON.stringify({
        address: address.toBase58(),
        organization: data.organization.toBase58(),
        label: decodeName(data.label, data.labelLen),
        creator: data.creator.toBase58(),
        dataLength: dataLen,
        dataUtf8: raw.toString("utf-8"),
        dataHex: raw.toString("hex"),
        version: toNum(data.version),
        lastModifiedBy: data.lastModifiedBy.toBase58(),
        createdAt: toNum(data.createdAt),
        updatedAt: toNum(data.updatedAt),
      })
    );
    return;
  }
  printBox("Vault", [
    ["Address", pk(address)],
    ["Organization", pk(data.organization)],
    ["Label", decodeName(data.label, data.labelLen)],
    ["Creator", pk(data.creator)],
    ["Data length", `${dataLen} bytes`],
    ["Data (utf8)", raw.toString("utf-8")],
    ["Version", String(toNum(data.version))],
    ["Modified by", pk(data.lastModifiedBy)],
    ["Created", fmtTs(data.createdAt)],
    ["Updated", fmtTs(data.updatedAt)],
  ]);
}

export function printVaultTable(
  vaults: { publicKey: PublicKey; account: any }[]
): void {
  if (isJsonMode()) {
    const arr = vaults.map((v) => ({
      address: v.publicKey.toBase58(),
      label: decodeName(v.account.label, v.account.labelLen),
      dataLength: v.account.dataLen,
      version: toNum(v.account.version),
      creator: v.account.creator.toBase58(),
    }));
    console.log(JSON.stringify(arr, null, 2));
    return;
  }
  const headers = ["Label", "Size", "Ver", "Creator", "Address"];
  const widths = [16, 6, 4, 14, 12];
  const rows = vaults.map((v) => {
    const d = v.account;
    return [
      decodeName(d.label, d.labelLen),
      `${d.dataLen}B`,
      String(toNum(d.version)),
      truncKey(d.creator),
      truncKey(v.publicKey),
    ];
  });
  printTable(headers, widths, rows);
}

// ── Permission check result ────────────────────────────────────

export function printPermCheck(opts: {
  member: string;
  required: BN;
  actual: BN;
  isActive: boolean;
  memberEpoch: BN;
  orgEpoch: BN;
  expiresAt: any;
  granted: boolean;
}): void {
  const reqNames = decodePermissions(opts.required);
  const actNames = decodePermissions(opts.actual);
  const epochSync = opts.memberEpoch.eq(opts.orgEpoch);

  if (isJsonMode()) {
    console.log(
      JSON.stringify({
        member: opts.member,
        required: formatHex(opts.required),
        requiredNames: reqNames,
        actual: formatHex(opts.actual),
        actualNames: actNames,
        isActive: opts.isActive,
        epochSynced: epochSync,
        granted: opts.granted,
      })
    );
    return;
  }

  const result = opts.granted
    ? `${T.success("✔ GRANTED")} — member has required permissions`
    : `${T.error("✖ DENIED")} — insufficient permissions`;

  printBox("Permission Check", [
    ["Member", pk(opts.member)],
    ["Required", `${formatHex(opts.required)} ${T.perm(reqNames.join(", "))}`],
    ["Actual", `${formatHex(opts.actual)} ${T.perm(actNames.join(", ") || "NONE")}`],
    ["Active", activeStr(opts.isActive)],
    ["Epoch", `${opts.memberEpoch}/${opts.orgEpoch} ${epochSync ? T.success("(synced)") : T.error("(STALE)")}`],
    ["Result", result],
  ]);
}

// ── Context status ─────────────────────────────────────────────

export function printContext(opts: {
  wallet: PublicKey;
  balance: number;
  cluster: string;
  org?: {
    address: PublicKey;
    name: string;
    admin: string;
    roleCount: number;
    memberCount: number;
    epoch: string;
  };
}): void {
  if (isJsonMode()) {
    console.log(
      JSON.stringify({
        wallet: opts.wallet.toBase58(),
        balance: opts.balance,
        cluster: opts.cluster,
        organization: opts.org
          ? {
              address: opts.org.address.toBase58(),
              name: opts.org.name,
              admin: opts.org.admin,
              roleCount: opts.org.roleCount,
              memberCount: opts.org.memberCount,
              epoch: opts.org.epoch,
            }
          : null,
      })
    );
    return;
  }

  const rows: [string, string][] = [
    ["Wallet", pk(opts.wallet)],
    ["Balance", `${(opts.balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`],
    ["Cluster", opts.cluster],
  ];

  if (opts.org) {
    rows.push(["", ""]);
    rows.push(["Organization", opts.org.name]);
    rows.push(["Org address", pk(opts.org.address)]);
    rows.push(["Admin", pk(opts.org.admin)]);
    rows.push(["Roles", String(opts.org.roleCount)]);
    rows.push(["Members", String(opts.org.memberCount)]);
    rows.push(["Epoch", opts.org.epoch]);
  } else {
    rows.push(["", ""]);
    rows.push(["Organization", T.warn("not set — run: org init <name>")]);
  }

  printBox("Status", rows);
}