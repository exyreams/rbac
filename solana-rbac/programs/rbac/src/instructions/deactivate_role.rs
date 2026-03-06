use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleDeactivated;
use crate::state::{Organization, Role};

/// Deactivates a role. Deactivated roles are excluded from permission
/// calculations during `refresh_permissions`.
///
/// Increments `permissions_epoch` to invalidate membership caches.
/// Existing memberships retain the role bit in their bitmap but
/// will lose the permissions on next refresh.
pub fn handler(ctx: Context<DeactivateRole>) -> Result<()> {
    let clock = Clock::get()?;

    let role = &mut ctx.accounts.role;
    role.is_active = false;

    let role_key = role.key();
    let role_index = role.role_index;

    // Invalidate caches
    let org = &mut ctx.accounts.organization;
    org.permissions_epoch = org
        .permissions_epoch
        .checked_add(1)
        .ok_or(RbacError::ArithmeticOverflow)?;

    let new_epoch = org.permissions_epoch;

    emit!(RoleDeactivated {
        organization: org.key(),
        role: role_key,
        role_index,
        deactivated_by: ctx.accounts.admin.key(),
        new_permissions_epoch: new_epoch,
        timestamp: clock.unix_timestamp,
    });

    msg!("Role {} deactivated. Epoch now {}.", role_index, new_epoch);

    Ok(())
}

#[derive(Accounts)]
pub struct DeactivateRole<'info> {
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
        constraint = role.organization == organization.key(),
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[role.role_index],
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,
}
