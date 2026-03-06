# Solana On-Chain RBAC + Guarded Vault

> Rebuilding enterprise Role-Based Access Control as composable Solana programs — proving Solana is a distributed state-machine backend, not just a crypto tool.

[![Built with Anchor](https://img.shields.io/badge/Built%20with-Anchor%200.32.1-blueviolet)](https://www.anchor-lang.com/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-green)](https://explorer.solana.com/?cluster=devnet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Why RBAC on Solana](#why-rbac-on-solana)
- [Architecture: Web2 vs Solana](#architecture-web2-vs-solana)
  - [How RBAC Works in Web2](#how-rbac-works-in-web2)
  - [How RBAC Works on Solana](#how-rbac-works-on-solana)
  - [Key Architectural Differences](#key-architectural-differences)
- [Account Model](#account-model)
  - [PDA Derivation Map](#pda-derivation-map)
  - [Why Bitmaps Instead of JOINs](#why-bitmaps-instead-of-joins)
  - [Why Cached Permissions](#why-cached-permissions)
  - [Permissions Epoch (Cache Invalidation)](#permissions-epoch-cache-invalidation)
  - [Reference Counting](#reference-counting)
- [Permission System](#permission-system)
  - [Bit Layout](#bit-layout)
  - [Delegation Guard](#delegation-guard)
- [CPI Composability](#cpi-composability)
- [Program Instructions](#program-instructions)
  - [RBAC Program](#rbac-program-instructions)
  - [Guarded Vault Program](#guarded-vault-program-instructions)
- [Tradeoffs & Constraints](#tradeoffs--constraints)
- [Security Considerations](#security-considerations)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Build & Test](#build--test)
  - [Deploy to Devnet](#deploy-to-devnet)
- [Devnet Deployment](#devnet-deployment)
- [CLI Usage](#cli-usage)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

This project implements a **production-grade Role-Based Access Control system** as two composable Solana programs:

| Program | Program ID | Purpose |
|---------|-----------|---------|
| **`rbac`** | `EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb` | Core RBAC engine — organizations, roles, memberships, permission checks |
| **`guarded_vault`** | `HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY` | Demo consumer — a key-value vault gated by RBAC via CPI |

### What This Demonstrates

- **Organizations** as on-chain entities with admin governance
- **Roles** with 64-bit bitmap permissions (up to 64 roles per org)
- **Memberships** with expiry, multi-role support, and cached permissions
- **Cross-program permission verification** via CPI
- **Cache invalidation** via permissions epoch (the on-chain Redis pattern)
- **Reference counting** for safe role lifecycle management
- **Delegation guards** preventing privilege escalation
- **Optimistic concurrency** via vault versioning (ETag pattern)
- **Full lifecycle**: create → assign → check → revoke → close with rent reclamation

---

## Why RBAC on Solana

Every backend system needs access control. In Web2, RBAC is implemented with databases, middleware, and session management — all controlled by a single operator who can silently modify permissions, tamper with audit logs, or grant themselves access.

Moving RBAC on-chain solves three fundamental problems:

1. **Tamper-proof audit trail** — every permission change is an immutable transaction. No database admin can quietly `UPDATE user_roles SET role = 'admin'`.

2. **Permissionless composability** — any Solana program can integrate with the RBAC engine via CPI without API keys, rate limits, or contractual agreements. The `guarded_vault` program demonstrates this.

3. **Cryptographic identity** — authentication is handled by Ed25519 signatures (wallet keypairs) rather than passwords, sessions, or OAuth tokens that can be stolen or forged.

---

## Architecture: Web2 vs Solana

### How RBAC Works in Web2

```
┌──────────────────────────────────────────────────────────────┐
│                      Web2 RBAC Stack                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Client ──► API Gateway ──► Auth Middleware ──► Service      │
│                                    │                         │
│                                    ▼                         │
│                          ┌─────────────────┐                 │
│                          │   Database       │                │
│                          │  ┌────────────┐  │                │
│                          │  │ users      │  │                │
│                          │  │ roles      │  │                │
│                          │  │ user_roles │  │                │
│                          │  │ permissions│  │                │
│                          │  └────────────┘  │                │
│                          └────────┬────────┘                 │
│                                   │                          │
│                          ┌────────▼────────┐                 │
│                          │  Redis Cache    │                 │
│                          │  (permissions)  │                 │
│                          └─────────────────┘                 │
│                                                              │
│  Authentication: JWT / Session cookies / OAuth 2.0           │
│  Authorization:  Middleware queries DB or cache per request   │
│  State:          Centralized PostgreSQL / MySQL              │
│  Trust model:    Trust the server operator                    │
│  Audit:          Application-level logging (mutable)         │
│  Caching:        Redis with TTL-based invalidation           │
│  Composability:  REST API with API keys                      │
└──────────────────────────────────────────────────────────────┘
```

**Typical Web2 implementation flow:**

```sql
-- 1. Create a role
INSERT INTO roles (name, org_id) VALUES ('editor', 42);
INSERT INTO role_permissions (role_id, permission) VALUES (1, 'READ'), (1, 'WRITE');

-- 2. Assign role to user
INSERT INTO user_roles (user_id, role_id) VALUES (7, 1);

-- 3. Check permission at middleware layer
SELECT 1 FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = 7 AND p.name = 'WRITE';
-- If row exists → allow; otherwise → 403 Forbidden

-- 4. Cache result in Redis
SET "perms:user:7:org:42" "READ|WRITE" EX 300  -- 5 min TTL
```

### How RBAC Works on Solana

```
┌──────────────────────────────────────────────────────────────┐
│                  Solana RBAC Architecture                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Client ──► Transaction ──► Solana Runtime                   │
│                                    │                         │
│                       ┌────────────▼────────────┐            │
│                       │     RBAC Program        │            │
│                       │   (Stateless Logic)     │            │
│                       └────────────┬────────────┘            │
│                                    │                         │
│                    ┌───────────────┼───────────────┐         │
│                    ▼               ▼               ▼         │
│           ┌──────────────┐ ┌────────────┐ ┌─────────────┐   │
│           │ Organization │ │    Role    │ │ Membership  │   │
│           │     PDA      │ │    PDA     │ │    PDA      │   │
│           │              │ │            │ │             │   │
│           │ admin        │ │ permissions│ │ roles_bitmap│   │
│           │ role_count   │ │ is_active  │ │ cached_perms│   │
│           │ member_count │ │ ref_count  │ │ expires_at  │   │
│           │ perm_epoch   │ │ role_index │ │ perm_epoch  │   │
│           └──────────────┘ └────────────┘ └──────┬──────┘   │
│                                                  │           │
│                                          ┌───────▼───────┐   │
│                                          │  CPI call to  │   │
│                                          │ check_permission  │
│                                          └───────┬───────┘   │
│                                                  │           │
│                                          ┌───────▼───────┐   │
│                                          │ Guarded Vault │   │
│                                          │   Program     │   │
│                                          │               │   │
│                                          │ vault data    │   │
│                                          │ version       │   │
│                                          └───────────────┘   │
│                                                              │
│  Authentication: Ed25519 wallet signature (built into Solana)│
│  Authorization:  On-chain program logic via CPI              │
│  State:          PDAs (Program Derived Addresses)            │
│  Trust model:    Cryptographic verification + consensus      │
│  Audit:          Immutable transaction history + events      │
│  Caching:        cached_permissions with epoch invalidation  │
│  Composability:  CPI (no API keys, no rate limits)           │
└──────────────────────────────────────────────────────────────┘
```

**Solana implementation flow:**

```rust
// 1. Create a role (on-chain instruction)
rbac::create_role(ctx, "editor", PERM_READ | PERM_WRITE)?;
// Role PDA created with permissions bitmap = 0x03

// 2. Assign role to member (on-chain instruction)
rbac::assign_role(ctx, role_index: 0, expires_at: None)?;
// Membership PDA: roles_bitmap |= (1 << 0), cached_permissions |= role.permissions

// 3. Check permission (CPI from consumer program)
rbac::cpi::check_permission(cpi_ctx, PERM_WRITE)?;
// Single bitwise AND: (0x03 & 0x02) == 0x02 → GRANTED
```

### Key Architectural Differences

| Aspect | Web2 | Solana On-Chain |
|--------|------|-----------------|
| **Identity** | Username/password → JWT token | Ed25519 keypair (wallet) |
| **State storage** | SQL rows in centralized DB | PDA accounts on distributed ledger |
| **Permission check** | Middleware queries DB / Redis | CPI call: single bitwise AND |
| **Data model** | Normalized tables with JOINs | Flat accounts with bitmap encoding |
| **Caching** | Redis with TTL (time-based) | `cached_permissions` with epoch (version-based) |
| **Cache invalidation** | TTL expiry or pub/sub events | `permissions_epoch` mismatch forces refresh |
| **Atomicity** | DB transactions (BEGIN/COMMIT) | Solana transaction (all-or-nothing) |
| **Audit trail** | Application logs (mutable, deletable) | Blockchain history (immutable, permanent) |
| **Multi-tenancy** | Schema or row-level isolation | Organization PDA isolation |
| **Composability** | REST APIs with API keys | CPI (zero-config, permissionless) |
| **Cost model** | Fixed server + DB hosting | Rent (~0.002 SOL/account) + TX fees |
| **Availability** | Depends on hosting SLA | Solana network consensus (99.5%+) |
| **Latency** | ~1–50ms per request | ~400ms (slot time) for state changes |
| **Read latency** | ~1–50ms | ~100ms (RPC call, no TX needed) |
| **Throughput** | 1000s RPS per server (scalable) | ~1000 TPS network-wide (shared) |
| **Admin power** | Full DB access, can modify anything | Constrained by program logic |
| **Credential theft** | Passwords, tokens can be stolen | Private key only; no server-side secrets |

---

## Account Model

### PDA Derivation Map

```
Organization PDA
  seeds: ["organization", creator_pubkey, name_bytes]
  size:  8 + 175 bytes
  
  ├── Role PDA (up to 64 per org)
  │     seeds: ["role", organization_pubkey, role_index_byte]
  │     size:  8 + 127 bytes
  │
  └── Membership PDA (one per member per org)
        seeds: ["membership", organization_pubkey, member_pubkey]
        size:  8 + 147 bytes
        
Vault PDA (in guarded_vault program)
  seeds: ["vault", organization_pubkey, label_bytes]
  size:  8 + 410 bytes
```

All accounts use **Program Derived Addresses (PDAs)** — deterministic addresses derived from known seeds. This means:

- No account enumeration needed (you can compute the address client-side)
- No database index or lookup table required
- Uniqueness is cryptographically guaranteed (same seeds = same address)
- Cross-program references work without foreign keys

### Why Bitmaps Instead of JOINs

In Web2, checking "does user 7 have WRITE permission?" requires:

```sql
SELECT 1 FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  WHERE ur.user_id = 7 AND rp.permission = 'WRITE';
```

This touches 2+ tables and requires an index scan. On Solana, you can't do queries — each account must be declared upfront in the transaction, and loading accounts costs compute units.

Instead, we encode everything in bitmaps:

```
roles_bitmap: u64 = 0b00000101
                          ││
                          │└─ Bit 0: Role 0 (reader) ✓
                          └── Bit 2: Role 2 (auditor) ✓

cached_permissions: u64 = role_0.permissions | role_2.permissions
                        = 0x01 | 0x15
                        = 0x15  (READ | LIST | EXPORT)

Permission check: (0x15 & PERM_WRITE) == PERM_WRITE
                   (0x15 & 0x02)      == 0x02
                    0x00              == 0x02  → FALSE (denied)
```

**One account read** gives you all roles + all permissions. No JOINs, no queries, O(1) checks.

### Why Cached Permissions

**The problem:** To check permissions from scratch, you'd need to load every assigned Role account, read its `permissions` field, and OR them together. With 10 roles assigned, that's 10 additional account reads — expensive and variable compute cost.

**The solution:** Cache the OR'd permissions directly on the Membership account. Permission checks need only 1 account read.

**The tradeoff:** When a role's permissions change, the cache becomes stale. This is identical to the Redis cache problem in Web2.

### Permissions Epoch (Cache Invalidation)

Web2 cache invalidation strategies:
- **TTL-based**: Cache expires after N seconds (simple but allows stale reads)
- **Event-driven**: Pub/sub notifies cache to invalidate (complex but immediate)
- **Version-based**: Compare version numbers (deterministic, no timing issues)

We chose **version-based** — the on-chain equivalent:

```
Organization                    Membership
┌─────────────────┐            ┌─────────────────┐
│ permissions_epoch: 5 │        │ permissions_epoch: 5 │ ← in sync ✓
└─────────────────┘            └─────────────────┘

Admin updates role permissions...

Organization                    Membership
┌─────────────────┐            ┌─────────────────┐
│ permissions_epoch: 6 │        │ permissions_epoch: 5 │ ← STALE ✗
└─────────────────┘            └─────────────────┘

check_permission → StalePermissions error
refresh_permissions → recomputes cache, syncs epoch to 6
check_permission → succeeds ✓
```

This is **safer than TTL** because there's zero window for stale permissions — the check fails immediately after any role change. And unlike event-driven invalidation, there's no messaging infrastructure needed.

### Reference Counting

In Web2, deleting a role with `ON DELETE CASCADE` automatically cleans up `user_roles` references. On Solana, there's no cascade — each account is independent.

We solve this with `reference_count` on Role accounts:

```
assign_role:  role.reference_count += 1
revoke_role:  role.reference_count -= 1
close_role:   require!(role.reference_count == 0)  // can't close with active members
```

This prevents dangling bitmap references — a membership with bit 3 set but no Role 3 account would be in an undefined state.

**Cleanup workflow:**
1. Revoke role from all members (decrements `reference_count`)
2. Close role (only succeeds when `reference_count == 0`)
3. Close memberships (only succeeds when `roles_bitmap == 0`)
4. Close organization (only succeeds when `role_count == 0` and `member_count == 0`)

---

## Permission System

### Bit Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                        64-bit Permission Bitmap                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Bit 63        SUPER_ADMIN (bypasses ALL permission checks)          │
│  Bits 48-62    Reserved (system-level future expansion)              │
│  Bits 32-47    Custom application permissions (16 slots)             │
│  Bits 21-31    Reserved (future admin operations)                    │
│  Bit 20        UPDATE_CONFIG                                         │
│  Bit 19        REVOKE_MEMBER                                         │
│  Bit 18        ASSIGN_MEMBER                                         │
│  Bit 17        DELETE_ROLE                                           │
│  Bit 16        CREATE_ROLE                                           │
│  Bits 6-15     Reserved (future data operations)                     │
│  Bit 5         EXPORT                                                │
│  Bit 4         LIST                                                  │
│  Bit 3         EXECUTE                                               │
│  Bit 2         DELETE                                                │
│  Bit 1         WRITE                                                 │
│  Bit 0         READ                                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Example role definitions:**

| Role | Permissions | Bitmap Value |
|------|-------------|-------------|
| Viewer | READ | `0x0000000000000001` |
| Editor | READ \| WRITE | `0x0000000000000003` |
| Manager | READ \| WRITE \| DELETE \| ASSIGN_MEMBER | `0x0000000000040007` |
| Admin | READ \| WRITE \| DELETE \| CREATE_ROLE \| ASSIGN_MEMBER \| REVOKE_MEMBER | `0x00000000000D0007` |
| Super Admin | SUPER_ADMIN | `0x8000000000000000` |

**Custom permissions (bits 32-47)** allow applications to define domain-specific permissions without modifying the RBAC program:

```rust
// In your application
const PERM_APPROVE_PAYMENT: u64 = 1 << 32;
const PERM_GENERATE_REPORT: u64 = 1 << 33;
const PERM_MANAGE_INVENTORY: u64 = 1 << 34;
```

### Delegation Guard

A critical security feature ported from enterprise RBAC systems like AWS IAM:

**Problem:** A member with `ASSIGN_MEMBER` permission but only `READ` access could assign the `Admin` role (which includes `WRITE` + `DELETE`) to an accomplice — effectively escalating privileges through delegation.

**Solution:** Non-admin assigners must hold the role they're assigning:

```rust
// assign_role.rs — non-admin branch
require!(
    auth_membership.roles_bitmap & role_bit(role_index) != 0,
    RbacError::CannotDelegateUnheldRole
);
```

A member with roles `[viewer, moderator]` can only assign `viewer` or `moderator` to others — never `admin` or `super_admin`.

The organization admin bypasses this check, as they are the root of trust.

---

## CPI Composability

The most powerful aspect of on-chain RBAC is **permissionless composability via CPI**.

In Web2, integrating with an authorization service requires:
1. API key registration
2. REST API calls with authentication headers
3. Rate limit management
4. Network latency and failure handling
5. Contractual/legal agreements

On Solana, **any program can call `check_permission` via CPI with zero setup**:

```rust
// In ANY Solana program — no registration, no API keys
use rbac::cpi::accounts::CheckPermission;
use rbac::constants::PERM_WRITE;

let cpi_ctx = CpiContext::new(
    ctx.accounts.rbac_program.to_account_info(),
    CheckPermission {
        organization: ctx.accounts.organization.to_account_info(),
        membership: ctx.accounts.membership.to_account_info(),
    },
);
rbac::cpi::check_permission(cpi_ctx, PERM_WRITE)?;
// If execution reaches here, WRITE permission is confirmed.
// If denied, the entire transaction rolls back atomically.
```

**Web2 equivalent:**

```javascript
// Express.js middleware
app.put('/vault/:id',
  requirePermission('WRITE'),  // ← this is what CPI replaces
  async (req, res) => {
    // handler
  }
);
```

The `guarded_vault` program demonstrates this pattern with four operations:

| Vault Operation | Required Permission | CPI Call |
|----------------|-------------------|----------|
| `initialize_vault` | `PERM_WRITE` | `check_permission(ctx, PERM_WRITE)` |
| `write_vault` | `PERM_WRITE` | `check_permission(ctx, PERM_WRITE)` |
| `read_vault` | `PERM_READ` | `check_permission(ctx, PERM_READ)` |
| `delete_vault` | `PERM_DELETE` | `check_permission(ctx, PERM_DELETE)` |

---

## Program Instructions

### RBAC Program Instructions

| Instruction | Who Can Call | Description |
|------------|-------------|-------------|
| `initialize_organization` | Anyone | Creates an org. Signer becomes admin + creator. |
| `transfer_admin` | Current admin | Transfers admin rights to a new wallet. |
| `close_organization` | Admin | Closes org (requires 0 roles, 0 members). Reclaims rent. |
| `create_role` | Admin or member with `CREATE_ROLE` | Creates a named role with permission bitmap. |
| `update_role_permissions` | Admin | Changes a role's permissions. Increments epoch. |
| `deactivate_role` | Admin | Soft-disables a role. Increments epoch. |
| `reactivate_role` | Admin | Re-enables a deactivated role. Increments epoch. |
| `close_role` | Admin | Closes role account (requires `reference_count == 0`). |
| `assign_role` | Admin or member with `ASSIGN_MEMBER` | Assigns role to member. Creates membership if new. |
| `revoke_role` | Admin or member with `REVOKE_MEMBER` | Removes role from member. Decrements reference count. |
| `refresh_permissions` | Anyone (permissionless) | Recomputes cached permissions. Syncs epoch. |
| `update_membership_expiry` | Admin | Sets or removes membership expiry timestamp. |
| `leave_organization` | Member | Self-service departure (requires `roles_bitmap == 0`). |
| `close_membership` | Admin | Removes a member (requires `roles_bitmap == 0`). |
| `check_permission` | Any program via CPI | Verifies permission. Returns Ok or error. |

### Guarded Vault Program Instructions

| Instruction | Required Permission | Description |
|------------|-------------------|-------------|
| `initialize_vault` | WRITE | Creates a labeled vault with initial data. |
| `write_vault` | WRITE | Overwrites vault data. Increments version. |
| `read_vault` | READ | Emits read event for audit trail. |
| `delete_vault` | DELETE | Closes vault account. Reclaims rent. |

---

## Tradeoffs & Constraints

### 1. Account Size vs Rent Cost

| Account | Size (bytes) | Rent (SOL) | Web2 Equivalent |
|---------|-------------|-----------|-----------------|
| Organization | 183 | ~0.002 | `organizations` row |
| Role | 135 | ~0.002 | `roles` + `role_permissions` rows |
| Membership | 155 | ~0.002 | `user_roles` row + Redis cache entry |
| Vault | 418 | ~0.004 | Key-value store entry |

Creating an org with 5 roles and 20 members costs ~0.054 SOL in rent. All rent is reclaimable when accounts are closed.

**Web2 comparison:** A PostgreSQL RDS instance costs ~$15/month minimum regardless of usage. On-chain, you pay only for what you store.

### 2. Compute Budget

| Operation | Approximate CU | Notes |
|-----------|---------------|-------|
| `check_permission` (CPI) | ~15,000 | Single account read + bitwise AND |
| `assign_role` | ~35,000 | Init-if-needed + state updates |
| `revoke_role` | ~40,000 | State update + permission refresh |
| `refresh_permissions` (10 roles) | ~80,000 | Iterates remaining_accounts |

Solana default limit is 200,000 CU per instruction (extendable to 1.4M per transaction). All operations fit comfortably within limits.

### 3. No Query Layer

| Operation | Web2 | Solana |
|-----------|------|--------|
| "Get all members of org X" | `SELECT * FROM memberships WHERE org_id = X` | `getProgramAccounts` with filters (expensive RPC, not available on-chain) |
| "Get member's permissions" | `SELECT ... JOIN ... WHERE user_id = Y` | Compute PDA from known seeds, fetch single account |
| "Find orgs where user is admin" | `SELECT * FROM orgs WHERE admin_id = Y` | Must know org names or use off-chain indexer |

**Mitigation:** PDA seeds are deterministic. If you know the organization name and member pubkey, you can compute the exact account address client-side. For discovery queries, use an off-chain indexer like Helius or custom event listener.

### 4. Cache Consistency

| Aspect | Web2 (Redis) | Solana (Epoch) |
|--------|-------------|---------------|
| Invalidation trigger | TTL expiry or pub/sub event | `permissions_epoch` increment |
| Stale window | 0 to TTL seconds | Zero — check fails immediately |
| Refresh mechanism | Automatic (TTL) or event handler | Explicit `refresh_permissions` call |
| Who refreshes | Application server | Anyone (permissionless instruction) |
| Failure mode | Stale cache serves outdated perms | Transaction rejected until refresh |

The epoch model is **stricter** than TTL — there's no window where stale permissions are silently accepted. The tradeoff is that someone must call `refresh_permissions` after role changes.

### 5. Latency

| Operation | Web2 | Solana |
|-----------|------|--------|
| Permission check (cached) | < 1ms (in-memory) | ~100ms (RPC simulation, no TX) |
| Permission check (DB) | 1–50ms | ~400ms (on-chain TX) |
| State change (role assign) | 1–50ms | ~400ms (requires TX confirmation) |
| Read account data | 1–50ms | ~100ms (RPC `getAccountInfo`) |

Solana is slower for individual operations but provides guarantees that Web2 cannot: atomicity, immutability, and trustlessness.

### 6. Immutable Audit Trail (Advantage)

Every operation emits structured events that are permanently recorded on-chain:

```rust
emit!(RoleAssigned {
    organization, membership, member, role_index,
    granted_by, new_roles_bitmap, new_cached_permissions,
    new_reference_count, is_new_membership, permissions_epoch,
    timestamp,
});
```

In Web2, audit logs are stored in databases or log services that administrators can modify or delete. On Solana, the transaction history is immutable — a compliance auditor can independently verify every permission change ever made.

### 7. Permissionless Composability (Advantage)

The `guarded_vault` program was built with zero coordination with the RBAC program. It simply:
1. Added `rbac` as a Cargo dependency with `features = ["cpi"]`
2. Called `rbac::cpi::check_permission` in its instruction handlers

No API keys. No registration. No rate limits. No legal agreements. Any program on Solana can do the same.

---

## Security Considerations

### 1. Stale Permission Cache → StalePermissions Error

**Risk:** After `update_role_permissions`, memberships retain old cached permissions until refreshed.

**Mitigation:** The `permissions_epoch` mechanism rejects stale caches at `check_permission` time. There is zero window for stale permissions to be accepted.

**Operational note:** After changing role permissions, call `refresh_permissions` for all affected memberships. This can be automated with a crank service.

### 2. Delegation Privilege Escalation → CannotDelegateUnheldRole Error

**Risk:** A member with `ASSIGN_MEMBER` but limited permissions could assign a higher-privileged role.

**Mitigation:** Non-admin assigners must hold the role they're assigning. Additionally, only the admin can grant `SUPER_ADMIN`.

### 3. Role Closure with Active References → RoleHasMembers Error

**Risk:** Closing a role while memberships still reference it would leave orphaned bitmap bits.

**Mitigation:** `reference_count` on roles prevents closure until all memberships revoke the role.

### 4. Membership Closure with Active Roles → MembershipHasActiveRoles Error

**Risk:** Closing a membership without revoking roles would corrupt role reference counts.

**Mitigation:** `close_membership` and `leave_organization` require `roles_bitmap == 0`.

### 5. Admin Single Point of Failure

**Risk:** The admin is a single keypair. If compromised, the attacker has full control.

**Mitigation:** `transfer_admin` allows rotation. In production, the admin should be a multisig wallet (e.g., Squads Protocol).

### 6. Clock Dependence for Expiry

**Risk:** Membership expiry uses `Clock::get()` which relies on validator-reported time (±1 second drift allowed).

**Mitigation:** Acceptable for authorization with second-level precision. Not suitable for sub-second time-critical access control.

### 7. Account Data is Publicly Readable

**Risk:** Vault data stored on-chain is readable by anyone via RPC, regardless of RBAC permissions.

**Mitigation:** The `read_vault` instruction enforces READ permission with an audit trail, but this is a logical control, not a data encryption control. For truly secret data, encrypt off-chain and store only ciphertext on-chain.

### 8. CPI Reentrancy

**Risk:** `check_permission` is read-only and does not modify state, so reentrancy is not a concern. `guarded_vault` follows checks-effects-interactions: CPI check first, then state modification.

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) 1.75+
- [Solana CLI](https://docs.solanalabs.com/cli/install) 1.18+
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) 0.32.1
- [Node.js](https://nodejs.org/) 18+

### Build & Test

```bash
# Clone the repository
git clone https://github.com/exyreams/rbac.git
cd rbac

# Install dependencies
yarn install

# Build both programs
anchor build

# Run tests (uses local validator)
anchor test

# Run tests with verbose output
anchor test -- --verbose
```

### Deploy to Devnet

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 5

# Deploy both programs
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb
solana program show HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY
```

---

## Devnet Deployment

| Program | Program ID | Explorer |
|---------|-----------|----------|
| RBAC | `EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb` | [View on Explorer](https://explorer.solana.com/address/EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb?cluster=devnet) |
| Guarded Vault | `HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY` | [View on Explorer](https://explorer.solana.com/address/HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY?cluster=devnet) |

### Example Devnet Transactions

<!-- Replace these with actual transaction signatures after deployment -->

| Operation | Transaction |
|-----------|------------|
| Create Organization | [View TX](https://explorer.solana.com/tx/REPLACE_WITH_TX_SIG?cluster=devnet) |
| Create Role | [View TX](https://explorer.solana.com/tx/REPLACE_WITH_TX_SIG?cluster=devnet) |
| Assign Role | [View TX](https://explorer.solana.com/tx/REPLACE_WITH_TX_SIG?cluster=devnet) |
| CPI Permission Check (Vault Write) | [View TX](https://explorer.solana.com/tx/REPLACE_WITH_TX_SIG?cluster=devnet) |
| Permission Denied (Reader → Write) | [View TX](https://explorer.solana.com/tx/REPLACE_WITH_TX_SIG?cluster=devnet) |

---

## CLI Usage

A full-featured TypeScript CLI is available in the [`cli/`](./cli) directory. It wraps every program instruction with transaction simulation, dry-run mode, retry with exponential backoff, structured error messages, and shell tab-completion.

```bash
cd cli && npm install

# Create an org and roles
npx tsx src/index.ts org init my-org
npx tsx src/index.ts role create writer "READ,WRITE,DELETE"

# Assign a role and check permissions
npx tsx src/index.ts member assign $(solana-keygen pubkey) 0
npx tsx src/index.ts member check $(solana-keygen pubkey) WRITE

# Vault operations
npx tsx src/index.ts vault create secrets '{"api_key":"sk_live_123"}'
npx tsx src/index.ts vault read secrets

# Simulate without spending SOL
npx tsx src/index.ts --dry-run vault create test '{"x":1}'

# Run the full end-to-end lifecycle demo
bash cli/demo.sh
```

**→ See [`cli/README.md`](./cli/README.md) for the complete command reference, global options, transaction engine details, and shell completion setup.**

---

## Project Structure

```
solana-rbac/
├── programs/
│   ├── rbac/
│   │   ├── src/
│   │   │   ├── instructions/
│   │   │   │   ├── assign_role.rs          # Role assignment with delegation guard
│   │   │   │   ├── check_permission.rs     # CPI entry point for permission checks
│   │   │   │   ├── close_membership.rs     # Admin-initiated member removal
│   │   │   │   ├── close_organization.rs   # Organization cleanup
│   │   │   │   ├── close_role.rs           # Role cleanup (ref count gated)
│   │   │   │   ├── create_role.rs          # Role creation with permissions
│   │   │   │   ├── deactivate_role.rs      # Soft-disable role
│   │   │   │   ├── initialize_org.rs       # Organization creation
│   │   │   │   ├── leave_organization.rs   # Self-service departure
│   │   │   │   ├── mod.rs                  # Instruction module exports
│   │   │   │   ├── reactivate_role.rs      # Re-enable role
│   │   │   │   ├── refresh_permissions.rs  # Cache recomputation
│   │   │   │   ├── revoke_role.rs          # Role removal with ref count
│   │   │   │   ├── transfer_admin.rs       # Admin transfer
│   │   │   │   ├── update_membership_expiry.rs
│   │   │   │   └── update_role_permissions.rs  # + epoch increment
│   │   │   ├── state/
│   │   │   │   ├── membership.rs           # Member ↔ roles binding + cache
│   │   │   │   ├── mod.rs                  # State module exports
│   │   │   │   ├── organization.rs         # Top-level tenant + epoch
│   │   │   │   └── role.rs                 # Permission set + ref count
│   │   │   ├── constants.rs                # Permission bits + helpers
│   │   │   ├── errors.rs                   # Error codes
│   │   │   ├── events.rs                   # Event definitions
│   │   │   └── lib.rs                      # Program entry point
│   │   └── Cargo.toml
│   │
│   └── guarded_vault/
│       ├── src/
│       │   ├── instructions/
│       │   │   ├── delete_vault.rs         # Delete vault (DELETE via CPI)
│       │   │   ├── initialize_vault.rs     # Create vault (WRITE via CPI)
│       │   │   ├── mod.rs                  # Instruction module exports
│       │   │   ├── read_vault.rs           # Audit read (READ via CPI)
│       │   │   └── write_vault.rs          # Update vault (WRITE via CPI)
│       │   ├── state/
│       │   │   ├── mod.rs                  # State module exports
│       │   │   └── vault.rs                # Vault data + versioning
│       │   ├── errors.rs
│       │   ├── events.rs
│       │   └── lib.rs
│       └── Cargo.toml
│
├── tests/
│   ├── rbac.ts                             # Test entry point
│   ├── rbac/
│   │   ├── 01_organization.ts              # Org init, transfer, close
│   │   ├── 02_roles.ts                     # Role create, update, deactivate, close
│   │   ├── 03_membership.ts                # Assign, revoke, expiry
│   │   ├── 04_permissions.ts               # Permission checks (granted + denied)
│   │   ├── 05_refresh.ts                   # Stale cache + epoch refresh
│   │   ├── 06_security.ts                  # Delegation guard, escalation attempts
│   │   ├── 07_cleanup.ts                   # Full lifecycle teardown
│   │   └── helpers.ts                      # Shared test utilities
│   ├── guarded_vault/
│   │   ├── 01_cpi_integration.ts           # Vault CRUD via CPI permission checks
│   │   └── 02_cpi_denied.ts                # CPI rejection when permission denied
│   └── utils/
│       ├── pda.ts                          # PDA derivation helpers
│       └── permission_constants.ts         # Shared permission bitmaps
│
cli/                                        # TypeScript CLI
├── src/
│   ├── commands/
│   │   ├── config.ts                       # config status, reset
│   │   ├── member.ts                       # assign, revoke, show, check, refresh, etc.
│   │   ├── org.ts                          # init, show, use, list, transfer-admin, close
│   │   ├── role.ts                         # create, show, list, update, deactivate, etc.
│   │   └── vault.ts                        # create, write, read, delete, show, list
│   ├── ui/
│   │   ├── banner.ts                       # Pre-command header
│   │   ├── format.ts                       # Box drawing, tables, pubkey truncation
│   │   ├── prompts.ts                      # Interactive confirmations
│   │   ├── spinner.ts                      # Transaction progress spinner
│   │   └── theme.ts                        # Centralized chalk color palette
│   ├── completion.ts                       # bash/zsh/fish tab-completion scripts
│   ├── display.ts                          # All print functions (org, role, member, vault)
│   ├── errors.ts                           # Structured Anchor/Solana error parsing
│   ├── index.ts                            # Entry point + global flags
│   ├── pda.ts                              # PDA derivation (mirrors on-chain seeds)
│   ├── permissions.ts                      # Bitmap parsing, decoding, formatting
│   ├── setup.ts                            # Provider, IDL loading, config file
│   ├── tx.ts                               # Transaction engine (simulate/retry/log)
│   └── validation.ts                       # Input validation (pubkeys, names, labels)
├── demo.sh                                 # End-to-end lifecycle demo
├── package.json
└── tsconfig.json
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.