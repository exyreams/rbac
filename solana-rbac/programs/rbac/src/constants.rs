/// # Permission Bit Layout (64-bit)
///
/// ```text
/// ┌─────────────────────────────────────────────────────────────────────┐
/// │ Bit 63   │ Bits 48-62  │ Bits 32-47  │ Bits 16-20  │ Bits 0-5    │
/// │ SUPER    │ Reserved    │ Custom App  │ Admin Ops   │ Data Ops    │
/// │ ADMIN    │ (system)    │ (16 slots)  │             │             │
/// └─────────────────────────────────────────────────────────────────────┘
/// ```
///
/// ## Why Bitmaps
///
/// Web2 checks permissions with JOINs:
/// ```sql
/// SELECT 1 FROM role_permissions rp
///   JOIN user_roles ur ON rp.role_id = ur.role_id
///   WHERE ur.user_id = ? AND rp.permission = 'WRITE'
/// ```
///
/// On Solana there are no queries. Bitmaps give O(1) checks via
/// a single bitwise AND — no JOINs, no heap allocation, 8 bytes total.

/// PDA seed for Organization accounts.
pub const ORGANIZATION_SEED: &[u8] = b"organization";

/// PDA seed for Role accounts.
pub const ROLE_SEED: &[u8] = b"role";

/// PDA seed for Membership accounts.
pub const MEMBERSHIP_SEED: &[u8] = b"membership";

/// Maximum number of roles per organization.
/// Constrained by the 64-bit `roles_bitmap` in Membership.
pub const MAX_ROLES: u8 = 64;

/// Maximum byte length for organization and role names.
pub const MAX_NAME_LENGTH: usize = 32;

/// Reserved bytes in Organization for future fields without reallocation.
/// Reduced from 64 to 56 when `permissions_epoch` was added.
pub const RESERVED_SPACE: usize = 56;

// ═══════════════════════════════════════════════════════
// DATA PERMISSIONS (bits 0–5)
// ═══════════════════════════════════════════════════════

pub const PERM_READ: u64 = 1 << 0;
pub const PERM_WRITE: u64 = 1 << 1;
pub const PERM_DELETE: u64 = 1 << 2;
pub const PERM_EXECUTE: u64 = 1 << 3;
pub const PERM_LIST: u64 = 1 << 4;
pub const PERM_EXPORT: u64 = 1 << 5;

// ═══════════════════════════════════════════════════════
// ADMINISTRATIVE PERMISSIONS (bits 16–20)
// ═══════════════════════════════════════════════════════

pub const PERM_CREATE_ROLE: u64 = 1 << 16;
pub const PERM_DELETE_ROLE: u64 = 1 << 17;
pub const PERM_ASSIGN_MEMBER: u64 = 1 << 18;
pub const PERM_REVOKE_MEMBER: u64 = 1 << 19;
pub const PERM_UPDATE_CONFIG: u64 = 1 << 20;

// ═══════════════════════════════════════════════════════
// CUSTOM APPLICATION PERMISSIONS (bits 32–47)
// ═══════════════════════════════════════════════════════

/// Inclusive start of the custom permission range.
pub const CUSTOM_PERM_START_BIT: u8 = 32;
/// Inclusive end of the custom permission range.
pub const CUSTOM_PERM_END_BIT: u8 = 47;

// ═══════════════════════════════════════════════════════
// SUPER ADMIN (bit 63)
// ═══════════════════════════════════════════════════════

/// Bypasses all permission checks. Only the org admin can grant this.
pub const PERM_SUPER_ADMIN: u64 = 1 << 63;

/// Returns `true` if `actual_permissions` satisfies all bits in
/// `required_permissions`.  SUPER_ADMIN automatically grants everything.
#[inline]
pub fn has_permission(actual_permissions: u64, required_permissions: u64) -> bool {
    if actual_permissions & PERM_SUPER_ADMIN != 0 {
        return true;
    }
    (actual_permissions & required_permissions) == required_permissions
}

/// Returns `true` if the permission mask includes the SUPER_ADMIN bit.
#[inline]
pub fn contains_super_admin(permissions: u64) -> bool {
    permissions & PERM_SUPER_ADMIN != 0
}

/// Converts a role index (0–63) into the corresponding bitmap bit.
#[inline]
pub fn role_bit(role_index: u8) -> u64 {
    debug_assert!(role_index < MAX_ROLES, "role_index must be < 64");
    1u64 << role_index
}
