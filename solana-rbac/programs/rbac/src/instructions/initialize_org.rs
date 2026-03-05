use anchor_lang::prelude::*;

use crate::constants::{MAX_NAME_LENGTH, ORGANIZATION_SEED};
use crate::errors::RbacError;
use crate::events::OrganizationCreated;
use crate::state::Organization;

pub fn handler(ctx: Context<InitializeOrg>, name: String) -> Result<()> {
    require!(name.len() <= MAX_NAME_LENGTH, RbacError::NameTooLong);

    let mut name_bytes = [0u8; 32];
    let bytes = name.as_bytes();
    name_bytes[..bytes.len()].copy_from_slice(bytes);

    let clock = Clock::get()?;

    let organization = &mut ctx.accounts.organization;
    organization.admin = ctx.accounts.admin.key();
    organization.creator = ctx.accounts.admin.key();
    organization.name = name_bytes;
    organization.name_len = bytes.len() as u8;
    organization.role_count = 0;
    organization.member_count = 0;
    organization.created_at = clock.unix_timestamp;
    organization.bump = ctx.bumps.organization;
    organization.reserved = [0u8; 64];

    emit!(OrganizationCreated {
        organization: organization.key(),
        admin: ctx.accounts.admin.key(),
        name: name_bytes,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Organization '{}' created by {}",
        name,
        ctx.accounts.admin.key()
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeOrg<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Organization::INIT_SPACE,
        seeds = [
            ORGANIZATION_SEED,
            admin.key().as_ref(),
            name.as_bytes(),
        ],
        bump
    )]
    pub organization: Account<'info, Organization>,

    pub system_program: Program<'info, System>,
}
