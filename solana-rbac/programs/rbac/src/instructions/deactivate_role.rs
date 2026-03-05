use anchor_lang::prelude::*;

use crate::constants::*;
use crate::events::RoleDeactivated;
use crate::state::{Organization, Role};

pub fn handler(ctx: Context<DeactivateRole>) -> Result<()> {
    let role = &mut ctx.accounts.role;
    let clock = Clock::get()?;

    role.is_active = false;

    emit!(RoleDeactivated {
        organization: ctx.accounts.organization.key(),
        role: role.key(),
        role_index: role.role_index,
        deactivated_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Role {} deactivated", role.role_index);

    Ok(())
}

#[derive(Accounts)]
pub struct DeactivateRole<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
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
