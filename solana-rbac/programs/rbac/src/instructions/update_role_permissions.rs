use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RolePermissionsUpdated;
use crate::state::{Organization, Role};

/// Updates a role's permission bitmap.
///
/// Increments `permissions_epoch` on the organization, which
/// invalidates all membership caches. Members must call
/// `refresh_permissions` before their next `check_permission`
/// will succeed.
///
/// This is intentional: stale-by-default is safer than
/// silently granting outdated permissions.
pub fn handler(ctx: Context<UpdateRolePermissions>, new_permissions: u64) -> Result<()> {
    let clock = Clock::get()?;

    let old_permissions = ctx.accounts.role.permissions;

    if contains_super_admin(new_permissions) {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.organization.admin,
            RbacError::SuperAdminRestricted
        );
    }

    // Update role
    let role = &mut ctx.accounts.role;
    role.permissions = new_permissions;
    role.updated_at = clock.unix_timestamp;

    let role_key = role.key();
    let role_index = role.role_index;

    // Increment epoch — invalidates all membership caches
    let org = &mut ctx.accounts.organization;
    org.permissions_epoch = org
        .permissions_epoch
        .checked_add(1)
        .ok_or(RbacError::ArithmeticOverflow)?;

    let new_epoch = org.permissions_epoch;

    emit!(RolePermissionsUpdated {
        organization: org.key(),
        role: role_key,
        role_index,
        old_permissions,
        new_permissions,
        updated_by: ctx.accounts.admin.key(),
        new_permissions_epoch: new_epoch,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} permissions: 0x{:016X} → 0x{:016X}. Epoch now {}. Memberships need refresh.",
        role_index,
        old_permissions,
        new_permissions,
        new_epoch
    );

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateRolePermissions<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        has_one = admin,
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
        constraint = role.organization == organization.key(),
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[role.role_index],
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,
}
