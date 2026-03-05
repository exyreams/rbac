use anchor_lang::prelude::*;

use crate::errors::VaultError;
use crate::events::VaultCreated;
use crate::state::Vault;

use rbac::constants::PERM_WRITE;
use rbac::state::{Membership, Organization};

pub const VAULT_SEED: &[u8] = b"vault";

pub fn handler(ctx: Context<InitializeVault>, label: String, data: Vec<u8>) -> Result<()> {
    require!(label.len() <= 32, VaultError::LabelTooLong);
    require!(data.len() <= 256, VaultError::DataTooLong);

    let cpi_program = ctx.accounts.rbac_program.to_account_info();
    let cpi_accounts = rbac::cpi::accounts::CheckPermission {
        organization: ctx.accounts.organization.to_account_info(),
        membership: ctx.accounts.membership.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    rbac::cpi::check_permission(cpi_ctx, PERM_WRITE)
        .map_err(|_| error!(VaultError::PermissionDenied))?;

    let clock = Clock::get()?;

    let mut label_bytes = [0u8; 32];
    let label_b = label.as_bytes();
    label_bytes[..label_b.len()].copy_from_slice(label_b);

    let mut data_bytes = [0u8; 256];
    data_bytes[..data.len()].copy_from_slice(&data);

    let vault = &mut ctx.accounts.vault;
    vault.organization = ctx.accounts.organization.key();
    vault.creator = ctx.accounts.signer.key();
    vault.data = data_bytes;
    vault.label = label_bytes;
    vault.label_len = label_b.len() as u8;
    vault.created_at = clock.unix_timestamp;
    vault.updated_at = clock.unix_timestamp;
    vault.last_modified_by = ctx.accounts.signer.key();
    vault.bump = ctx.bumps.vault;

    emit!(VaultCreated {
        vault: vault.key(),
        organization: ctx.accounts.organization.key(),
        creator: ctx.accounts.signer.key(),
        label: label_bytes,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Vault '{}' created by {} (WRITE permission verified via CPI)",
        label,
        ctx.accounts.signer.key()
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(label: String)]
pub struct InitializeVault<'info> {
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
        init,
        payer = signer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [
            VAULT_SEED,
            organization.key().as_ref(),
            label.as_bytes(),
        ],
        bump
    )]
    pub vault: Account<'info, Vault>,

    pub rbac_program: Program<'info, rbac::program::Rbac>,

    pub system_program: Program<'info, System>,
}
