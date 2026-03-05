use anchor_lang::prelude::*;

use crate::constants::*;
use crate::events::RoleReactivated;
use crate::state::{Organization, Role};

pub fn handler(ctx: Context<ReactivateRole>) -> Result<()> {
    let role = &mut ctx.accounts.role;
    let clock = Clock::get()?;

    role.is_active = true;

    emit!(RoleReactivated {
        organization: ctx.accounts.organization.key(),
        role: role.key(),
        role_index: role.role_index,
        reactivated_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Role {} reactivated", role.role_index);

    Ok(())
}

#[derive(Accounts)]
pub struct ReactivateRole<'info> {
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
