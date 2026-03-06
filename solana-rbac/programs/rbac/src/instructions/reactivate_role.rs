use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleReactivated;
use crate::state::{Organization, Role};

/// Reactivates a previously deactivated role.
///
/// Increments `permissions_epoch` so memberships refresh and
/// pick up the restored permissions.
pub fn handler(ctx: Context<ReactivateRole>) -> Result<()> {
    let clock = Clock::get()?;

    let role = &mut ctx.accounts.role;
    role.is_active = true;

    let role_key = role.key();
    let role_index = role.role_index;

    let org = &mut ctx.accounts.organization;
    org.permissions_epoch = org
        .permissions_epoch
        .checked_add(1)
        .ok_or(RbacError::ArithmeticOverflow)?;

    let new_epoch = org.permissions_epoch;

    emit!(RoleReactivated {
        organization: org.key(),
        role: role_key,
        role_index,
        reactivated_by: ctx.accounts.admin.key(),
        new_permissions_epoch: new_epoch,
        timestamp: clock.unix_timestamp,
    });

    msg!("Role {} reactivated. Epoch now {}.", role_index, new_epoch);

    Ok(())
}

#[derive(Accounts)]
pub struct ReactivateRole<'info> {
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
