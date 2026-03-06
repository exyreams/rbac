# RBAC CLI

Command-line interface for the **Solana On-Chain RBAC** and **Guarded Vault** programs. Manages organizations, roles, memberships, and CPI-guarded vaults on devnet.

## Prerequisites

- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) with a funded devnet keypair
- [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/))
- Programs deployed to devnet (`anchor build && anchor deploy`)
- IDL files at `target/idl/rbac.json` and `target/idl/guarded_vault.json`

## Installation

```bash
cd cli
npm install
```

## Quick Start

```bash
# Create an organization (saves to .rbac-cli.json)
npx tsx src/index.ts org init my-org

# Create roles
npx tsx src/index.ts role create reader READ
npx tsx src/index.ts role create writer "READ,WRITE,DELETE"

# Assign a role to yourself
npx tsx src/index.ts member assign $(solana-keygen pubkey) 1

# Create a vault (requires WRITE)
npx tsx src/index.ts vault create api-keys '{"key":"sk_live_123"}'

# Check permissions
npx tsx src/index.ts member check $(solana-keygen pubkey) WRITE
```

Or run the full demo:

```bash
bash demo.sh
```

## Global Options

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --cluster <url>` | Solana RPC URL | `https://api.devnet.solana.com` |
| `-k, --keypair <path>` | Signer keypair JSON | `~/.config/solana/id.json` |
| `--json` | Output as JSON | off |
| `--verbose` | Show full pubkeys | off |
| `-f, --force` | Skip confirmations | off |

## Command Reference

### Organization (`org`)

```bash
org init <name>                  # Create organization (you become admin)
org show                         # Show active organization
org use <address>                # Switch to existing organization
org list                         # List your organizations
org transfer-admin <new-admin>   # Transfer admin role
org close                        # Close org (0 roles, 0 members required)
```

### Roles (`role`)

```bash
role create <name> <perms>       # Create role: "READ,WRITE" or "0x3" or "3"
role show <index>                # Show role details
role list                        # List all roles (table view)
role update <index> <perms>      # Update permissions (increments epoch)
role deactivate <index>          # Deactivate role
role reactivate <index>          # Reactivate role
role close <index>               # Close role (ref_count must be 0)
role perms                       # List all permission names
```

### Members (`member`)

```bash
member assign <pubkey> <role>    # Assign role (creates membership if needed)
  --expires <timestamp>          #   Set unix expiry
  --expires-in <seconds>         #   Expire N seconds from now
member revoke <pubkey> <role>    # Revoke a role
member show <pubkey>             # Show membership details
member check <pubkey> <perms>    # Check permissions (off-chain)
  --on-chain                     #   Verify via CPI transaction
member refresh <pubkey>          # Refresh cached permissions
member update-expiry <pubkey>    # Update expiry
  --expires <timestamp>          #   New expiry
  --remove                       #   Remove expiry
member leave                     # Self-service departure
member close <pubkey>            # Admin: close membership
member list                      # List all members (table view)
```

### Vault (`vault`)

```bash
vault create <label> <data>      # Create vault (WRITE required)
vault write <label> <data>       # Update vault data (WRITE required)
vault read <label>               # On-chain read with audit (READ required)
vault delete <label>             # Delete vault (DELETE required)
vault show <label>               # Off-chain read (no permission check)
vault list                       # List all vaults (table view)
```

### Config (`config`)

```bash
config status                    # Show wallet, balance, cluster, org
config reset                     # Clear active organization
```

## Permission System

```
DATA OPERATIONS (bits 0–5):
  READ (0)  WRITE (1)  DELETE (2)  EXECUTE (3)  LIST (4)  EXPORT (5)

ADMIN OPERATIONS (bits 16–20):
  CREATE_ROLE (16)  DELETE_ROLE (17)  ASSIGN_MEMBER (18)
  REVOKE_MEMBER (19)  UPDATE_CONFIG (20)

SUPER (bit 63):
  SUPER_ADMIN — bypasses all checks

CUSTOM APP (bits 32–47):
  16 slots for application-specific permissions
```

Permissions can be specified as:
- **Named**: `READ,WRITE,DELETE` or `READ|WRITE`
- **Hex**: `0x7`
- **Decimal**: `7`

## Architecture

```
Organization (tenant)
  ├── Role 0..63 (permission bitmaps)
  └── Membership (member ↔ roles with cached permissions)
        └── Vault (CPI-guarded data, delegates auth to RBAC)
```

- **Bitmap permissions**: 64 roles in 8 bytes, O(1) checks
- **Cached permissions**: avoids loading N role accounts per check
- **Permissions epoch**: detects stale caches after role updates
- **Reference counting**: prevents closing roles with active members
- **Delegation guard**: non-admins can only assign roles they hold

## Demo Output

Run `bash demo.sh` to see the full lifecycle:

1. Create org → create roles → assign members
2. Permission checks (granted + denied)
3. Vault CRUD with CPI permission enforcement
4. Role update → stale cache detection → refresh
5. Full cleanup with admin transfer flow