use anchor_lang::prelude::*;

/// Top-level entity in the RBAC hierarchy.
///
/// Maps to a "tenant" or "workspace" in Web2 systems. Each organization
/// has an isolated set of roles and memberships, similar to how a SaaS
/// app partitions data per customer.
///
/// # PDA Seeds
/// `["organization", creator_pubkey, name_bytes]`
///
/// Two different creators can both have an org named "default" because
/// the creator pubkey is part of the seed.
///
/// # Lifecycle
/// `initialize_org` → manage roles/members → `close_organization`
///
/// Closing requires `role_count == 0` and `member_count == 0` to
/// prevent orphaned state.
///
/// # Permissions Epoch
/// Incremented whenever any role's permissions change (update,
/// deactivate, reactivate). Memberships cache this value; if
/// they fall behind, `check_permission` rejects them until
/// `refresh_permissions` is called — the on-chain equivalent of
/// cache invalidation in Redis.
#[account]
#[derive(Debug, InitSpace)]
pub struct Organization {
    /// Current administrator. Transferable via `transfer_admin`.
    pub admin: Pubkey,

    /// Original creator (immutable). Used as PDA seed for namespacing.
    pub creator: Pubkey,

    /// UTF-8 name, null-padded to 32 bytes.
    pub name: [u8; 32],

    /// Actual byte length of the name.
    pub name_len: u8,

    /// Number of roles created. Also serves as the next `role_index`.
    pub role_count: u8,

    /// Number of active membership accounts.
    pub member_count: u32,

    /// Unix timestamp of creation.
    pub created_at: i64,

    /// PDA bump seed.
    pub bump: u8,

    /// Monotonic counter incremented on any role permission change.
    /// Memberships must match this to pass `check_permission`.
    pub permissions_epoch: u64,

    /// Reserved for future fields without account reallocation.
    pub reserved: [u8; 56],
}
