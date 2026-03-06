use anchor_lang::prelude::*;

/// Defines a named permission set within an organization.
///
/// Equivalent to a role row in a Web2 `roles` table, but with permissions
/// encoded as a 64-bit bitmap rather than a JOIN table.
///
/// # PDA Seeds
/// `["role", organization_pubkey, role_index]`
///
/// # Reference Counting
/// `reference_count` tracks how many memberships currently hold this role.
/// The role cannot be closed until all memberships revoke it
/// (`reference_count == 0`), preventing dangling bitmap references.
///
/// # Active/Inactive
/// Deactivated roles stop contributing permissions on the next
/// `refresh_permissions` call, but existing caches remain until refreshed.
/// The organization's `permissions_epoch` is incremented on state change
/// to force a refresh.
#[account]
#[derive(Debug, InitSpace)]
pub struct Role {
    /// Parent organization.
    pub organization: Pubkey,

    /// UTF-8 name, null-padded.
    pub name: [u8; 32],

    /// Position in the organization's role list and the corresponding
    /// bit position in `Membership.roles_bitmap`.
    pub role_index: u8,

    /// Bitmap of granted permissions. OR'd into the membership cache
    /// when this role is assigned.
    pub permissions: u64,

    /// Whether this role is currently active. Inactive roles are excluded
    /// from permission calculations during `refresh_permissions`.
    pub is_active: bool,

    /// Who created this role.
    pub created_by: Pubkey,

    pub created_at: i64,
    pub updated_at: i64,

    /// PDA bump seed.
    pub bump: u8,

    /// Number of memberships currently holding this role.
    /// Incremented on `assign_role`, decremented on `revoke_role`.
    pub reference_count: u32,
}
