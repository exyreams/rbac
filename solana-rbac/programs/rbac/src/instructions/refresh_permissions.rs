use anchor_lang::prelude::*;

use crate::constants::*;
use crate::events::PermissionsRefreshed;
use crate::state::{Membership, Organization, Role};

pub fn handler<'info>(ctx: Context<'_, '_, 'info, 'info, RefreshPermissions<'info>>) -> Result<()> {
    let membership = &mut ctx.accounts.membership;
    let clock = Clock::get()?;

    let old_cached = membership.cached_permissions;

    let mut new_cached = 0u64;
    let bitmap = membership.roles_bitmap;

    for bit_pos in 0..MAX_ROLES {
        if bitmap & (1u64 << bit_pos) == 0 {
            continue;
        }

        let mut found = false;
        for account_info in ctx.remaining_accounts.iter() {
            if let Ok(role_data) = Account::<Role>::try_from(account_info) {
                if role_data.organization == ctx.accounts.organization.key()
                    && role_data.role_index == bit_pos
                {
                    if role_data.is_active {
                        new_cached |= role_data.permissions;
                    }
                    found = true;
                    break;
                }
            }
        }

        if !found {
            msg!(
                "Warning: no valid role account found for bit position {}",
                bit_pos
            );
        }
    }

    membership.cached_permissions = new_cached;
    membership.last_updated = clock.unix_timestamp;

    emit!(PermissionsRefreshed {
        organization: ctx.accounts.organization.key(),
        membership: membership.key(),
        member: membership.member,
        old_cached_permissions: old_cached,
        new_cached_permissions: new_cached,
        refreshed_by: ctx.accounts.payer.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Permissions refreshed for {}. 0x{:016X} → 0x{:016X}",
        membership.member,
        old_cached,
        new_cached
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RefreshPermissions<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
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
        constraint = membership.organization == organization.key(),
        seeds = [
            MEMBERSHIP_SEED,
            organization.key().as_ref(),
            membership.member.as_ref(),
        ],
        bump = membership.bump
    )]
    pub membership: Account<'info, Membership>,
}
