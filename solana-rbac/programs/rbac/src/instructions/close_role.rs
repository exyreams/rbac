use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleClosed;
use crate::state::{Organization, Role};

/// Closes a role account and reclaims rent.
///
/// Requires `reference_count == 0` — all memberships holding
/// this role must revoke it first. This prevents dangling
/// bitmap references that would cause phantom permissions.
///
/// # Web2 Comparison
///
/// In Web2 you might `DELETE FROM roles WHERE id = ?` and rely
/// on `ON DELETE CASCADE` to clean up `user_roles`. On Solana
/// there's no cascade — the caller must explicitly clean up
/// references before closing.
pub fn handler(ctx: Context<CloseRole>) -> Result<()> {
    let clock = Clock::get()?;
    let role = &ctx.accounts.role;

    // Guard: cannot close while memberships reference this role
    require!(role.reference_count == 0, RbacError::RoleHasMembers);

    let rent_reclaimed = ctx.accounts.role.to_account_info().lamports();
    let role_index = role.role_index;

    ctx.accounts.organization.role_count = ctx.accounts.organization.role_count.saturating_sub(1);

    emit!(RoleClosed {
        organization: ctx.accounts.organization.key(),
        role_index,
        closed_by: ctx.accounts.admin.key(),
        rent_reclaimed,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} closed. {} lamports reclaimed.",
        role_index,
        rent_reclaimed
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CloseRole<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        has_one = admin,
        seeds = [
            ORGANIZATION_SEED,
            organization.creator.as_ref(),
            &organization.name[..organization.name_len as usize],
        ],
        bump = organization.bump
    )]
    pub organization: Account<'info, Organization>,

    #[account(
        mut,
        close = admin,
        constraint = role.organization == organization.key(),
        constraint = role.reference_count == 0 @ RbacError::RoleHasMembers,
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[role.role_index],
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,
}
