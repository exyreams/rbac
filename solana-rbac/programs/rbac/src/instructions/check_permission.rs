use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::PermissionCheckPerformed;
use crate::state::{Membership, Organization};

pub fn handler(ctx: Context<CheckPermission>, required_permissions: u64) -> Result<()> {
    let membership = &ctx.accounts.membership;
    let clock = Clock::get()?;

    require!(membership.is_active, RbacError::MembershipInactive);

    if let Some(expires_at) = membership.expires_at {
        require!(
            clock.unix_timestamp < expires_at,
            RbacError::MembershipExpired
        );
    }

    let granted = has_permission(membership.cached_permissions, required_permissions);

    emit!(PermissionCheckPerformed {
        organization: ctx.accounts.organization.key(),
        member: membership.member,
        required_permissions,
        actual_permissions: membership.cached_permissions,
        granted,
        timestamp: clock.unix_timestamp,
    });

    if granted {
        msg!(
            "Permission GRANTED for {}. Required: 0x{:016X}, Has: 0x{:016X}",
            membership.member,
            required_permissions,
            membership.cached_permissions
        );
        Ok(())
    } else {
        msg!(
            "Permission DENIED for {}. Required: 0x{:016X}, Has: 0x{:016X}",
            membership.member,
            required_permissions,
            membership.cached_permissions
        );
        Err(error!(RbacError::InsufficientPermissions))
    }
}

#[derive(Accounts)]
pub struct CheckPermission<'info> {
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
