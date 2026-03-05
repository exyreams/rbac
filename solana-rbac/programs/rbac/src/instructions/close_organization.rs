use anchor_lang::prelude::*;

use crate::constants::ORGANIZATION_SEED;
use crate::errors::RbacError;
use crate::events::OrganizationClosed;
use crate::state::Organization;

pub fn handler(ctx: Context<CloseOrganization>) -> Result<()> {
    let organization = &ctx.accounts.organization;
    let clock = Clock::get()?;

    require!(
        organization.role_count == 0 && organization.member_count == 0,
        RbacError::OrganizationNotEmpty
    );

    let rent_reclaimed = ctx.accounts.organization.to_account_info().lamports();

    emit!(OrganizationClosed {
        organization: organization.key(),
        admin: ctx.accounts.admin.key(),
        rent_reclaimed,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Organization closed. {} lamports reclaimed.",
        rent_reclaimed
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CloseOrganization<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        has_one = admin,
        close = admin,
        constraint = organization.role_count == 0
            && organization.member_count == 0
            @ RbacError::OrganizationNotEmpty,
        seeds = [
            ORGANIZATION_SEED,
            organization.creator.as_ref(),
            &organization.name[..organization.name_len as usize],
        ],
        bump = organization.bump
    )]
    pub organization: Account<'info, Organization>,
}
