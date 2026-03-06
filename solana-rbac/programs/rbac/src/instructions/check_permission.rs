use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::PermissionCheckPerformed;
use crate::state::{Membership, Organization};

/// Verifies that a member has the required permissions.
///
/// This is the CPI entry point for consumer programs like
/// `guarded_vault`. It's the Solana equivalent of auth middleware:
///
/// ```js
/// // Web2
/// app.put('/resource', requirePermission('WRITE'), handler);
///
/// // Solana — consumer program calls via CPI:
/// rbac::cpi::check_permission(cpi_ctx, PERM_WRITE)?;
/// ```
///
/// # Checks performed
/// 1. Membership is active
/// 2. Membership has not expired
/// 3. Permissions cache is not stale (epoch matches organization)
/// 4. Required permission bits are set in cached permissions
///
/// Returns `Ok(())` if granted, error if denied.
pub fn handler(ctx: Context<CheckPermission>, required_permissions: u64) -> Result<()> {
    let membership = &ctx.accounts.membership;
    let org = &ctx.accounts.organization;
    let clock = Clock::get()?;

    // 1. Active check
    require!(membership.is_active, RbacError::MembershipInactive);

    // 2. Expiry check
    if let Some(expires_at) = membership.expires_at {
        require!(
            clock.unix_timestamp < expires_at,
            RbacError::MembershipExpired
        );
    }

    // 3. Staleness check — reject if cached permissions are outdated
    require!(
        membership.permissions_epoch == org.permissions_epoch,
        RbacError::StalePermissions
    );

    // 4. Permission check
    let granted = has_permission(membership.cached_permissions, required_permissions);

    emit!(PermissionCheckPerformed {
        organization: org.key(),
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
