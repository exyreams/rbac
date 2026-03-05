use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleRevoked;
use crate::state::{Membership, Organization, Role};

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, RevokeRole<'info>>,
    role_index: u8,
) -> Result<()> {
    require!(role_index < MAX_ROLES, RbacError::InvalidRoleIndex);

    let clock = Clock::get()?;
    let signer_key = ctx.accounts.authority.key();
    let is_admin = signer_key == ctx.accounts.organization.admin;

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

    let membership = &mut ctx.accounts.membership;
    let bit = role_bit(role_index);

    require!(
        membership.roles_bitmap & bit != 0,
        RbacError::RoleNotAssigned
    );

    if membership.member == ctx.accounts.organization.admin && (membership.roles_bitmap & !bit) == 0
    {
        msg!("Warning: admin now has no roles, but retains admin privileges");
    }

    membership.roles_bitmap &= !bit;

    if membership.roles_bitmap == 0 {
        membership.cached_permissions = 0;
        membership.is_active = false;
        msg!(
            "Member {} has no remaining roles — membership deactivated",
            membership.member
        );
    } else {
        require!(
            !ctx.remaining_accounts.is_empty(),
            RbacError::InvalidRefreshAccounts
        );

        let mut new_cached = 0u64;

        for account_info in ctx.remaining_accounts.iter() {
            let role_data = Account::<Role>::try_from(account_info)?;

            if role_data.organization != ctx.accounts.organization.key() {
                continue;
            }

            if role_data.is_active
                && (membership.roles_bitmap & role_bit(role_data.role_index) != 0)
            {
                new_cached |= role_data.permissions;
            }
        }

        membership.cached_permissions = new_cached;
    }

    membership.last_updated = clock.unix_timestamp;
    membership.granted_by = signer_key;

    emit!(RoleRevoked {
        organization: ctx.accounts.organization.key(),
        membership: membership.key(),
        member: membership.member,
        role_index,
        revoked_by: signer_key,
        new_roles_bitmap: membership.roles_bitmap,
        new_cached_permissions: membership.cached_permissions,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} revoked from {}. Bitmap: 0x{:016X}",
        role_index,
        membership.member,
        membership.roles_bitmap
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
