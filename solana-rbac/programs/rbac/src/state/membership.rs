use anchor_lang::prelude::*;

/// Links a member to an organization with one or more roles.
///
/// This is the Solana equivalent of a `user_roles` JOIN table, but with
/// a critical optimization: all permission data is cached directly in
/// this account, eliminating the need for JOINs at check time.
///
/// # Permission Caching
///
/// Web2 permission check:
/// ```sql
/// SELECT 1 FROM permissions p
///   JOIN role_permissions rp ON p.id = rp.permission_id
///   JOIN user_roles ur ON rp.role_id = ur.role_id
///   WHERE ur.user_id = ? AND p.name = 'WRITE'
/// ```
///
/// On-chain check: `(cached_permissions & PERM_WRITE) == PERM_WRITE`
///
/// One account read, one bitwise AND. No JOINs, no queries.
///
/// # Cache Staleness
/// When a role's permissions change, `permissions_epoch` falls behind
/// the organization's epoch. `check_permission` detects this and
/// rejects the check until `refresh_permissions` is called — the
/// on-chain version of Redis cache invalidation.
///
/// # PDA Seeds
/// `["membership", organization_pubkey, member_pubkey]`
///
/// Guarantees one membership per member per organization.
#[account]
#[derive(Debug, InitSpace)]
pub struct Membership {
    /// Parent organization.
    pub organization: Pubkey,

    /// The member's wallet address.
    pub member: Pubkey,

    /// Bitmap of assigned role indices. Bit N set means role N is held.
    pub roles_bitmap: u64,

    /// OR of all assigned roles' permission bitmaps.
    /// Refreshed via `refresh_permissions` when stale.
    pub cached_permissions: u64,

    /// Last authority who modified this membership.
    pub granted_by: Pubkey,

    pub created_at: i64,
    pub last_updated: i64,

    /// Optional expiration. Checked during `check_permission`.
    pub expires_at: Option<i64>,

    /// Whether this membership is active. Set to false when
    /// all roles are revoked.
    pub is_active: bool,

    /// PDA bump seed.
    pub bump: u8,

    /// Must match `Organization.permissions_epoch` for
    /// `check_permission` to succeed.
    pub permissions_epoch: u64,
}
