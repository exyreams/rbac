use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::events::VaultWritten;
use crate::state::Vault;

use rbac::constants::PERM_WRITE;
use rbac::state::{Membership, Organization};

/// Overwrites vault data. Requires WRITE permission.
/// Increments the version counter for optimistic concurrency.
pub fn handler(ctx: Context<WriteVault>, new_data: Vec<u8>) -> Result<()> {
    require!(new_data.len() <= 256, VaultError::DataTooLong);

    // ── CPI permission check ───────────────────────────────────
    let cpi_program = ctx.accounts.rbac_program.to_account_info();
    let cpi_accounts = rbac::cpi::accounts::CheckPermission {
        organization: ctx.accounts.organization.to_account_info(),
        membership: ctx.accounts.membership.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    rbac::cpi::check_permission(cpi_ctx, PERM_WRITE)
        .map_err(|_| error!(VaultError::PermissionDenied))?;

    // ── Update vault ───────────────────────────────────────────
    let clock = Clock::get()?;

    let vault = &mut ctx.accounts.vault;
    let mut data_bytes = [0u8; 256];
    data_bytes[..new_data.len()].copy_from_slice(&new_data);

    vault.data = data_bytes;
    vault.data_len = new_data.len() as u16;
    vault.updated_at = clock.unix_timestamp;
    vault.last_modified_by = ctx.accounts.signer.key();
    vault.version = vault
        .version
        .checked_add(1)
        .ok_or(VaultError::ArithmeticOverflow)?;

    let new_version = vault.version;

    emit!(VaultWritten {
        vault: vault.key(),
        organization: ctx.accounts.organization.key(),
        writer: ctx.accounts.signer.key(),
        data_len: new_data.len() as u16,
        new_version,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Vault {} updated by {} ({} bytes, v{})",
        vault.key(),
        ctx.accounts.signer.key(),
        new_data.len(),
        new_version
    );

    Ok(())
}

#[derive(Accounts)]
pub struct WriteVault<'info> {
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
        constraint = vault.organization == organization.key()
            @ VaultError::OrganizationMismatch,
    )]
    pub vault: Account<'info, Vault>,

    pub rbac_program: Program<'info, rbac::program::Rbac>,
}
