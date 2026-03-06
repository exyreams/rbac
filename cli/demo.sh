#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# RBAC CLI — End-to-End Demo (Expert Level)
#
# Prerequisites:
#   1. anchor build && anchor deploy  (programs on devnet)
#   2. cd cli && npm install
#   3. Funded devnet keypair at ~/.config/solana/id.json
#
# Run:  bash demo.sh
# ═══════════════════════════════════════════════════════
set -euo pipefail

CLI="npx tsx src/index.ts -c https://api.devnet.solana.com --force"
MEMBER_KEYPAIR="/tmp/rbac-demo-member.json"
ORG_NAME="demo-org-$(date +%s)"

echo ""
echo "═══════════════════════════════════════════════"
echo "  RBAC + Guarded Vault — Full Lifecycle Demo"
echo "  (with simulation, retry, dry-run, auto-refresh)"
echo "═══════════════════════════════════════════════"
echo ""

# ── Setup ──────────────────────────────────────────────────────
if [ ! -f "$MEMBER_KEYPAIR" ]; then
  solana-keygen new --no-bip39-passphrase -o "$MEMBER_KEYPAIR" --force 2>/dev/null
fi
MEMBER_PUBKEY=$(solana-keygen pubkey "$MEMBER_KEYPAIR")
ADMIN_PUBKEY=$(solana-keygen pubkey ~/.config/solana/id.json)

echo "Admin:  $ADMIN_PUBKEY"
echo "Member: $MEMBER_PUBKEY"
echo ""

echo "▸ Airdropping to member..."
solana airdrop 2 "$MEMBER_PUBKEY" --url devnet 2>/dev/null || echo "  (airdrop may have failed — continuing)"
sleep 3

# ── 1. Organization ───────────────────────────────────────────
echo "▸ Step 1a: Create organization '$ORG_NAME'"
$CLI org init "$ORG_NAME"

echo "▸ Step 1b: Show organization"
$CLI org show

echo "▸ Step 1c: Show CLI context"
$CLI config status

# ── 2. Roles ──────────────────────────────────────────────────
echo "▸ Step 2a: Create 'reader' role (READ)"
$CLI role create reader READ

echo "▸ Step 2b: Create 'writer' role (READ,WRITE,DELETE)"
$CLI role create writer "READ,WRITE,DELETE"

echo "▸ Step 2c: List all roles"
$CLI role list

echo "▸ Step 2d: Show available permissions"
$CLI role perms

# ── 3. Memberships ────────────────────────────────────────────
echo "▸ Step 3a: Assign 'writer' role (index 1) to admin"
$CLI member assign "$ADMIN_PUBKEY" 1

echo "▸ Step 3b: Assign 'reader' role (index 0) to member"
$CLI member assign "$MEMBER_PUBKEY" 0

echo "▸ Step 3c: Show admin membership"
$CLI member show "$ADMIN_PUBKEY"

echo "▸ Step 3d: Show member membership"
$CLI member show "$MEMBER_PUBKEY"

echo "▸ Step 3e: List all members"
$CLI member list

# ── 4. Permission checks ─────────────────────────────────────
echo "▸ Step 4a: Check admin has WRITE (off-chain)"
$CLI member check "$ADMIN_PUBKEY" WRITE

echo "▸ Step 4b: Check member has READ (off-chain)"
$CLI member check "$MEMBER_PUBKEY" READ

echo "▸ Step 4c: Check member does NOT have WRITE (off-chain)"
$CLI member check "$MEMBER_PUBKEY" WRITE || true

echo "▸ Step 4d: Check admin has WRITE (on-chain CPI)"
$CLI member check "$ADMIN_PUBKEY" WRITE --on-chain

# ── 5. Dry-run demo ──────────────────────────────────────────
echo "▸ Step 5a: Dry-run vault create (no SOL spent)"
$CLI --dry-run vault create dry-test "This won't actually create"

echo "▸ Step 5b: Dry-run role create"
$CLI --dry-run role create "dry-role" "READ,WRITE"

# ── 6. Vault operations ──────────────────────────────────────
echo "▸ Step 6a: Create vault 'secrets' (admin, requires WRITE)"
$CLI vault create secrets '{"api_key":"sk_live_demo_123"}'

echo "▸ Step 6b: Show vault data (off-chain)"
$CLI vault show secrets

echo "▸ Step 6c: Read vault on-chain (member, requires READ)"
$CLI -k "$MEMBER_KEYPAIR" vault read secrets

echo "▸ Step 6d: Write vault (admin, requires WRITE)"
$CLI vault write secrets '{"api_key":"sk_live_updated","ver":2}'

echo "▸ Step 6e: Show updated vault (version should be 2)"
$CLI vault show secrets

echo "▸ Step 6f: List all vaults"
$CLI vault list

# ── 7. Role update, stale cache, auto-refresh ────────────────
echo "▸ Step 7a: Update reader role: READ → READ|LIST"
$CLI role update 0 "READ,LIST"

echo "▸ Step 7b: Check member — auto-refreshes stale cache"
$CLI member check "$MEMBER_PUBKEY" READ

echo "▸ Step 7c: Check member LIST (should PASS after refresh)"
$CLI member check "$MEMBER_PUBKEY" LIST

# ── 8. Full cleanup ──────────────────────────────────────────
echo "▸ Step 8a: Delete vault"
$CLI vault delete secrets

echo "▸ Step 8b: Revoke all roles"
$CLI member revoke "$ADMIN_PUBKEY" 1
$CLI member revoke "$MEMBER_PUBKEY" 0

echo "▸ Step 8c: Close member's membership"
$CLI member close "$MEMBER_PUBKEY"

echo "▸ Step 8d: Transfer admin → member (so admin membership can close)"
$CLI org transfer-admin "$MEMBER_PUBKEY"

echo "▸ Step 8e: New admin closes old admin's membership"
$CLI -k "$MEMBER_KEYPAIR" member close "$ADMIN_PUBKEY"

echo "▸ Step 8f: Close roles (new admin)"
$CLI -k "$MEMBER_KEYPAIR" role close 0
$CLI -k "$MEMBER_KEYPAIR" role close 1

echo "▸ Step 8g: Close organization (new admin)"
$CLI -k "$MEMBER_KEYPAIR" org close

# ── 9. Show transaction log ──────────────────────────────────
echo ""
echo "▸ Transaction log (.rbac-cli-log.jsonl):"
if [ -f .rbac-cli-log.jsonl ]; then
  echo "  $(wc -l < .rbac-cli-log.jsonl) transactions logged"
  echo ""
  echo "  Last 5 entries:"
  tail -5 .rbac-cli-log.jsonl | while read line; do
    echo "    $line"
  done
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✔ Demo complete — full lifecycle demonstrated"
echo "  Features shown:"
echo "    • Transaction simulation before send"
echo "    • Retry with exponential backoff"
echo "    • Dry-run mode (--dry-run)"
echo "    • Auto-refresh stale permissions"
echo "    • Compute budget + priority fees"
echo "    • Transaction logging"
echo "    • Structured error parsing"
echo "    • Shell completion (run: rbac-cli completion bash)"
echo "  All accounts closed, all rent reclaimed."
echo "═══════════════════════════════════════════════"
echo ""