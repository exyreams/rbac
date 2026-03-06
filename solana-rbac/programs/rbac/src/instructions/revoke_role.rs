use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleRevoked;
use crate::state::{Membership, Organization, Role};

/// Revokes a specific role from a member.
///
/// The role being revoked is a named account so its `reference_count`
/// can be decremented. Other roles the member holds are passed via
/// `remaining_accounts` to refresh `cached_permissions`.
///
/// If revoking the last role, the membership is deactivated
/// (`is_active = false`, `cached_permissions = 0`).
///
/// Callable by:
/// - Organization admin
/// - Any member with `PERM_REVOKE_MEMBER`
pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, RevokeRole<'info>>,
    role_index: u8,
) -> Result<()> {
    require!(role_index < MAX_ROLES, RbacError::InvalidRoleIndex);

    let clock = Clock::get()?;
    let signer_key = ctx.accounts.authority.key();
    let org_key = ctx.accounts.organization.key();
    let org_epoch = ctx.accounts.organization.permissions_epoch;
    let is_admin = signer_key == ctx.accounts.organization.admin;

    // ── Authorization ──────────────────────────────────────────
    if !is_admin {
        let auth_membership = ctx
            .accounts
            .authority_membership
            .as_ref()
            .ok_or(error!(RbacError::Unauthorized))?;

        require!(auth_membership.is_active, RbacError::MembershipInactive);

        if let Some(exp) = auth_membership.expires_at {
            require!(clock.unix_timestamp < exp, RbacError::MembershipExpired);
        }

        require!(
            has_permission(auth_membership.cached_permissions, PERM_REVOKE_MEMBER),
            RbacError::InsufficientPermissions
        );
    }

    // ── Validate role assignment ───────────────────────────────
    let bit = role_bit(role_index);

    require!(
        ctx.accounts.membership.roles_bitmap & bit != 0,
        RbacError::RoleNotAssigned
    );

    let member_key = ctx.accounts.membership.member;

    if member_key == ctx.accounts.organization.admin
        && (ctx.accounts.membership.roles_bitmap & !bit) == 0
    {
        msg!("Warning: admin now has no roles, but retains admin privileges");
    }

    // ── Update membership ──────────────────────────────────────
    let membership = &mut ctx.accounts.membership;
    membership.roles_bitmap &= !bit;

    if membership.roles_bitmap == 0 {
        membership.cached_permissions = 0;
        membership.is_active = false;
        msg!(
            "Member {} has no remaining roles — membership deactivated",
            member_key
        );
    } else {
        require!(
            !ctx.remaining_accounts.is_empty(),
            RbacError::InvalidRefreshAccounts
        );

        let mut new_cached = 0u64;

        for account_info in ctx.remaining_accounts.iter() {
            if let Ok(role_data) = Account::<Role>::try_from(account_info) {
                if role_data.organization == org_key
                    && role_data.is_active
                    && (membership.roles_bitmap & role_bit(role_data.role_index) != 0)
                {
                    new_cached |= role_data.permissions;
                }
            }
        }

        membership.cached_permissions = new_cached;
    }

    membership.last_updated = clock.unix_timestamp;
    membership.granted_by = signer_key;
    membership.permissions_epoch = org_epoch;

    let new_bitmap = membership.roles_bitmap;
    let new_cached = membership.cached_permissions;
    let membership_key = membership.key();

    // ── Decrement reference count on revoked role ──────────────
    let role = &mut ctx.accounts.role;
    role.reference_count = role.reference_count.saturating_sub(1);
    let new_ref_count = role.reference_count;

    emit!(RoleRevoked {
        organization: org_key,
        membership: membership_key,
        member: member_key,
        role_index,
        revoked_by: signer_key,
        new_roles_bitmap: new_bitmap,
        new_cached_permissions: new_cached,
        new_reference_count: new_ref_count,
        permissions_epoch: org_epoch,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} revoked from {}. Bitmap: 0x{:016X}, Refs: {}",
        role_index,
        member_key,
        new_bitmap,
        new_ref_count
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(role_index: u8)]
pub struct RevokeRole<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [
            MEMBERSHIP_SEED,
            organization.key().as_ref(),
            authority.key().as_ref(),
        ],
        bump,
    )]
    pub authority_membership: Option<Account<'info, Membership>>,

    #[account(
        seeds = [
            ORGANIZATION_SEED,
            organization.creator.as_ref(),
            &organization.name[..organization.name_len as usize],
        ],
        bump = organization.bump
    )]
    pub organization: Account<'info, Organization>,

    /// The specific role being revoked. Mutable to decrement
    /// its `reference_count`.
    #[account(
        mut,
        constraint = role.organization == organization.key(),
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[role_index],
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,

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
