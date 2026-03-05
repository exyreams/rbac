use anchor_lang::prelude::*;

#[event]
pub struct OrganizationCreated {
    pub organization: Pubkey,
    pub admin: Pubkey,
    pub name: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct AdminTransferred {
    pub organization: Pubkey,
    pub previous_admin: Pubkey,
    pub new_admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct OrganizationClosed {
    pub organization: Pubkey,
    pub admin: Pubkey,
    pub rent_reclaimed: u64,
    pub timestamp: i64,
}

#[event]
pub struct RoleCreated {
    pub organization: Pubkey,
    pub role: Pubkey,
    pub role_index: u8,
    pub name: [u8; 32],
    pub permissions: u64,
    pub created_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RolePermissionsUpdated {
    pub organization: Pubkey,
    pub role: Pubkey,
    pub role_index: u8,
    pub old_permissions: u64,
    pub new_permissions: u64,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RoleDeactivated {
    pub organization: Pubkey,
    pub role: Pubkey,
    pub role_index: u8,
    pub deactivated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RoleReactivated {
    pub organization: Pubkey,
    pub role: Pubkey,
    pub role_index: u8,
    pub reactivated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RoleClosed {
    pub organization: Pubkey,
    pub role_index: u8,
    pub closed_by: Pubkey,
    pub rent_reclaimed: u64,
    pub timestamp: i64,
}

#[event]
pub struct RoleAssigned {
    pub organization: Pubkey,
    pub membership: Pubkey,
    pub member: Pubkey,
    pub role_index: u8,
    pub granted_by: Pubkey,
    pub new_roles_bitmap: u64,
    pub new_cached_permissions: u64,
    pub is_new_membership: bool,
    pub timestamp: i64,
}

#[event]
pub struct RoleRevoked {
    pub organization: Pubkey,
    pub membership: Pubkey,
    pub member: Pubkey,
    pub role_index: u8,
    pub revoked_by: Pubkey,
    pub new_roles_bitmap: u64,
    pub new_cached_permissions: u64,
    pub timestamp: i64,
}

#[event]
pub struct PermissionsRefreshed {
    pub organization: Pubkey,
    pub membership: Pubkey,
    pub member: Pubkey,
    pub old_cached_permissions: u64,
    pub new_cached_permissions: u64,
    pub refreshed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MembershipExpiryUpdated {
    pub organization: Pubkey,
    pub membership: Pubkey,
    pub member: Pubkey,
    pub old_expires_at: Option<i64>,
    pub new_expires_at: Option<i64>,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MemberLeft {
    pub organization: Pubkey,
    pub member: Pubkey,
    pub roles_bitmap_at_departure: u64,
    pub timestamp: i64,
}

#[event]
pub struct MembershipClosed {
    pub organization: Pubkey,
    pub member: Pubkey,
    pub closed_by: Pubkey,
    pub roles_bitmap_at_closure: u64,
    pub rent_reclaimed: u64,
    pub timestamp: i64,
}

#[event]
pub struct PermissionCheckPerformed {
    pub organization: Pubkey,
    pub member: Pubkey,
    pub required_permissions: u64,
    pub actual_permissions: u64,
    pub granted: bool,
    pub timestamp: i64,
}
