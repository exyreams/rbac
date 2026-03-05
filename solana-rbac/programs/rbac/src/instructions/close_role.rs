use anchor_lang::prelude::*;

use crate::constants::*;
use crate::events::RoleClosed;
use crate::state::{Organization, Role};

pub fn handler(ctx: Context<CloseRole>) -> Result<()> {
    let organization = &mut ctx.accounts.organization;
    let role = &ctx.accounts.role;
    let clock = Clock::get()?;

    let rent_reclaimed = ctx.accounts.role.to_account_info().lamports();
    let role_index = role.role_index;

    organization.role_count = organization.role_count.saturating_sub(1);

    emit!(RoleClosed {
        organization: organization.key(),
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
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[role.role_index],
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,
}
