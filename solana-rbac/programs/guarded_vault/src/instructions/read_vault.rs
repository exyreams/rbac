use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::events::VaultRead;
use crate::state::Vault;

use rbac::constants::PERM_READ;
use rbac::state::{Membership, Organization};

pub fn handler(ctx: Context<ReadVault>) -> Result<()> {
    let cpi_program = ctx.accounts.rbac_program.to_account_info();
    let cpi_accounts = rbac::cpi::accounts::CheckPermission {
        organization: ctx.accounts.organization.to_account_info(),
        membership: ctx.accounts.membership.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    rbac::cpi::check_permission(cpi_ctx, PERM_READ)
        .map_err(|_| error!(VaultError::PermissionDenied))?;

    let clock = Clock::get()?;
    let vault = &ctx.accounts.vault;

    emit!(VaultRead {
        vault: vault.key(),
        organization: ctx.accounts.organization.key(),
        reader: ctx.accounts.signer.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Vault {} read by {}. Label: {:?}",
        vault.key(),
        ctx.accounts.signer.key(),
        String::from_utf8_lossy(&vault.label).trim_end_matches('\0')
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ReadVault<'info> {
    pub signer: Signer<'info>,

    pub organization: Account<'info, Organization>,

    #[account(
        constraint = membership.organization == organization.key()
            @ VaultError::OrganizationMismatch,
        constraint = membership.member == signer.key()
            @ VaultError::PermissionDenied,
    )]
    pub membership: Account<'info, Membership>,

    #[account(
        constraint = vault.organization == organization.key()
            @ VaultError::OrganizationMismatch,
    )]
    pub vault: Account<'info, Vault>,

    pub rbac_program: Program<'info, rbac::program::Rbac>,
}
