pub const ORGANIZATION_SEED: &[u8] = b"organization";

pub const ROLE_SEED: &[u8] = b"role";

pub const MEMBERSHIP_SEED: &[u8] = b"membership";

pub const MAX_ROLES: u8 = 64;

pub const MAX_NAME_LENGTH: usize = 32;

pub const RESERVED_SPACE: usize = 64;

pub const PERM_READ: u64 = 1 << 0;

pub const PERM_WRITE: u64 = 1 << 1;

pub const PERM_DELETE: u64 = 1 << 2;

pub const PERM_EXECUTE: u64 = 1 << 3;

pub const PERM_LIST: u64 = 1 << 4;

pub const PERM_EXPORT: u64 = 1 << 5;

pub const PERM_CREATE_ROLE: u64 = 1 << 16;

pub const PERM_DELETE_ROLE: u64 = 1 << 17;

pub const PERM_ASSIGN_MEMBER: u64 = 1 << 18;

pub const PERM_REVOKE_MEMBER: u64 = 1 << 19;

pub const PERM_UPDATE_CONFIG: u64 = 1 << 20;

pub const CUSTOM_PERM_START_BIT: u8 = 32;
pub const CUSTOM_PERM_END_BIT: u8 = 47;

pub const PERM_SUPER_ADMIN: u64 = 1 << 63;

pub fn has_permission(actual_permissions: u64, required_permissions: u64) -> bool {
    if actual_permissions & PERM_SUPER_ADMIN != 0 {
        return true;
    }
    (actual_permissions & required_permissions) == required_permissions
}

pub fn contains_super_admin(permissions: u64) -> bool {
    permissions & PERM_SUPER_ADMIN != 0
}

pub fn role_bit(role_index: u8) -> u64 {
    assert!(role_index < MAX_ROLES, "role_index must be < 64");
    1u64 << role_index
}
