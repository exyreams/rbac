use anchor_lang::prelude::*;

use crate::constants::*;
use crate::events::PermissionsRefreshed;
use crate::state::{Membership, Organization, Role};

/// Recomputes a membership's `cached_permissions` from its assigned
/// roles and syncs `permissions_epoch` with the organization.
///
/// This is the on-chain equivalent of Redis cache invalidation.
///
/// In Web2, when a role's permissions change, you either:
/// - Bust the Redis cache entry (TTL-based or event-driven)
/// - Rely on the next DB query to return fresh data
///
/// On Solana, cached permissions on a membership become stale after
/// `update_role_permissions`, `deactivate_role`, or `reactivate_role`.
/// This instruction re-reads all role accounts and recomputes the OR'd
/// permission bitmap.
///
/// **Permissionless** — anyone can call this for any membership. This
/// allows cranks or watchers to keep permissions fresh without requiring
/// the member's signature.
///
/// Role accounts must be passed via `remaining_accounts`.
pub fn handler<'info>(ctx: Context<'_, '_, 'info, 'info, RefreshPermissions<'info>>) -> Result<()> {
    let org_key = ctx.accounts.organization.key();
    let org_epoch = ctx.accounts.organization.permissions_epoch;

    let membership = &mut ctx.accounts.membership;
    let old_cached = membership.cached_permissions;
    let bitmap = membership.roles_bitmap;

    let clock = Clock::get()?;

    let mut new_cached = 0u64;

    for bit_pos in 0..MAX_ROLES {
        if bitmap & (1u64 << bit_pos) == 0 {
            continue;
        }

        let mut found = false;
        for account_info in ctx.remaining_accounts.iter() {
            if let Ok(role_data) = Account::<Role>::try_from(account_info) {
                if role_data.organization == org_key && role_data.role_index == bit_pos {
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
    membership.permissions_epoch = org_epoch;
    membership.last_updated = clock.unix_timestamp;

    let member = membership.member;
    let membership_key = membership.key();

    emit!(PermissionsRefreshed {
        organization: org_key,
        membership: membership_key,
        member,
        old_cached_permissions: old_cached,
        new_cached_permissions: new_cached,
        synced_epoch: org_epoch,
        refreshed_by: ctx.accounts.payer.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Permissions refreshed for {}. 0x{:016X} → 0x{:016X} (epoch {})",
        member,
        old_cached,
        new_cached,
        org_epoch
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
