use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::events::VaultDeleted;
use crate::state::Vault;

use rbac::constants::PERM_DELETE;
use rbac::state::{Membership, Organization};

pub fn handler(ctx: Context<DeleteVault>) -> Result<()> {
    let cpi_program = ctx.accounts.rbac_program.to_account_info();
    let cpi_accounts = rbac::cpi::accounts::CheckPermission {
        organization: ctx.accounts.organization.to_account_info(),
        membership: ctx.accounts.membership.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    rbac::cpi::check_permission(cpi_ctx, PERM_DELETE)
        .map_err(|_| error!(VaultError::PermissionDenied))?;

    let clock = Clock::get()?;
    let vault = &ctx.accounts.vault;
    let rent_reclaimed = vault.to_account_info().lamports();
    let vault_key = vault.key();

    emit!(VaultDeleted {
        vault: vault_key,
        organization: ctx.accounts.organization.key(),
        deleted_by: ctx.accounts.signer.key(),
        rent_reclaimed,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Vault {} deleted by {}. {} lamports reclaimed.",
        vault_key,
        ctx.accounts.signer.key(),
        rent_reclaimed
    );

    Ok(())
}

#[derive(Accounts)]
pub struct DeleteVault<'info> {
    #[account(mut)]
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
        mut,
        close = signer,
        constraint = vault.organization == organization.key()
            @ VaultError::OrganizationMismatch,
    )]
    pub vault: Account<'info, Vault>,

    pub rbac_program: Program<'info, rbac::program::Rbac>,
}
