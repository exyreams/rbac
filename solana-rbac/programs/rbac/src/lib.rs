use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb");

/// # Solana On-Chain RBAC
///
/// A complete Role-Based Access Control system implemented as a
/// Solana program. Designed to be composed with via CPI — any
/// program can delegate authorization decisions to this program.
///
/// ## Architecture
///
/// ```text
/// Organization (tenant)
///   ├── Role 0..63 (permission sets)
///   └── Membership (member ↔ roles binding with cached permissions)
/// ```
///
/// ## Key Design Decisions
///
/// - **Bitmap permissions**: O(1) checks, 64 roles in 8 bytes
/// - **Cached permissions**: avoids loading N role accounts per check
/// - **Permissions epoch**: detects stale caches after role updates
/// - **Reference counting**: prevents closing roles with active members
/// - **Delegation guard**: non-admins can only assign roles they hold
#[program]
pub mod rbac {
    use super::*;

    pub fn initialize_organization(ctx: Context<InitializeOrg>, name: String) -> Result<()> {
        instructions::initialize_org::handler(ctx, name)
    }

    pub fn transfer_admin(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
        instructions::transfer_admin::handler(ctx, new_admin)
    }

    pub fn close_organization(ctx: Context<CloseOrganization>) -> Result<()> {
        instructions::close_organization::handler(ctx)
    }

    pub fn create_role(ctx: Context<CreateRole>, name: String, permissions: u64) -> Result<()> {
        instructions::create_role::handler(ctx, name, permissions)
    }

    pub fn update_role_permissions(
        ctx: Context<UpdateRolePermissions>,
        new_permissions: u64,
    ) -> Result<()> {
        instructions::update_role_permissions::handler(ctx, new_permissions)
    }

    pub fn deactivate_role(ctx: Context<DeactivateRole>) -> Result<()> {
        instructions::deactivate_role::handler(ctx)
    }

    pub fn reactivate_role(ctx: Context<ReactivateRole>) -> Result<()> {
        instructions::reactivate_role::handler(ctx)
    }

    pub fn close_role(ctx: Context<CloseRole>) -> Result<()> {
        instructions::close_role::handler(ctx)
    }

    pub fn assign_role(
        ctx: Context<AssignRole>,
        role_index: u8,
        expires_at: Option<i64>,
    ) -> Result<()> {
        instructions::assign_role::handler(ctx, role_index, expires_at)
    }

    pub fn revoke_role<'info>(
        ctx: Context<'_, '_, 'info, 'info, RevokeRole<'info>>,
        role_index: u8,
    ) -> Result<()> {
        instructions::revoke_role::handler(ctx, role_index)
    }

    pub fn refresh_permissions<'info>(
        ctx: Context<'_, '_, 'info, 'info, RefreshPermissions<'info>>,
    ) -> Result<()> {
        instructions::refresh_permissions::handler(ctx)
    }

    pub fn update_membership_expiry(
        ctx: Context<UpdateMembershipExpiry>,
        new_expires_at: Option<i64>,
    ) -> Result<()> {
        instructions::update_membership_expiry::handler(ctx, new_expires_at)
    }

    pub fn leave_organization(ctx: Context<LeaveOrganization>) -> Result<()> {
        instructions::leave_organization::handler(ctx)
    }

    pub fn close_membership(ctx: Context<CloseMembership>) -> Result<()> {
        instructions::close_membership::handler(ctx)
    }

    pub fn check_permission(
        ctx: Context<CheckPermission>,
        required_permissions: u64,
    ) -> Result<()> {
        instructions::check_permission::handler(ctx, required_permissions)
    }
}
