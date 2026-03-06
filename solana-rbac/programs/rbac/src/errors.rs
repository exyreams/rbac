use anchor_lang::prelude::*;

#[error_code]
pub enum RbacError {
    #[msg("Name exceeds the maximum length of 32 bytes")]
    NameTooLong,

    #[msg("Organization has reached the maximum role capacity of 64")]
    MaxRolesReached,

    #[msg("Role index is out of valid bounds")]
    InvalidRoleIndex,

    #[msg("Role is currently deactivated")]
    RoleInactive,

    #[msg("Membership has expired")]
    MembershipExpired,

    #[msg("Membership is not active")]
    MembershipInactive,

    #[msg("Insufficient permissions for this operation")]
    InsufficientPermissions,

    #[msg("Only the organization admin can grant SUPER_ADMIN permissions")]
    SuperAdminRestricted,

    #[msg("Cannot close organization with existing members or roles")]
    OrganizationNotEmpty,

    #[msg("Cannot close role while memberships still reference it")]
    RoleHasMembers,

    #[msg("This role is already assigned to the member")]
    RoleAlreadyAssigned,

    #[msg("Member does not currently hold this role")]
    RoleNotAssigned,

    #[msg("Invalid remaining accounts provided for permission refresh")]
    InvalidRefreshAccounts,

    #[msg("Admin cannot remove themselves — transfer admin first")]
    CannotSelfRemoveAdmin,

    #[msg("Expiry timestamp must be in the future")]
    ExpiryInPast,

    #[msg("Arithmetic overflow in permission computation")]
    ArithmeticOverflow,

    #[msg("Unauthorized: signer is neither admin nor authorized member")]
    Unauthorized,

    #[msg("Cannot transfer admin to the zero address")]
    InvalidNewAdmin,

    #[msg("New admin is already the current admin")]
    SameAdmin,

    #[msg("Permissions cache is stale — call refresh_permissions first")]
    StalePermissions,

    #[msg("Cannot assign a role you do not hold yourself")]
    CannotDelegateUnheldRole,

    #[msg("Revoke all roles before closing membership or leaving")]
    MembershipHasActiveRoles,
}
