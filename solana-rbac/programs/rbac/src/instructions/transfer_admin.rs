use anchor_lang::prelude::*;

use crate::constants::ORGANIZATION_SEED;
use crate::errors::RbacError;
use crate::events::AdminTransferred;
use crate::state::Organization;

pub fn handler(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
    require!(new_admin != Pubkey::default(), RbacError::InvalidNewAdmin);
    require!(new_admin != ctx.accounts.admin.key(), RbacError::SameAdmin);

    let organization = &mut ctx.accounts.organization;
    let previous_admin = organization.admin;
    let clock = Clock::get()?;

    organization.admin = new_admin;

    emit!(AdminTransferred {
        organization: organization.key(),
        previous_admin,
        new_admin,
        timestamp: clock.unix_timestamp,
    });

    msg!("Admin transferred from {} to {}", previous_admin, new_admin);

    Ok(())
}

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
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
}
