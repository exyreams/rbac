use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RolePermissionsUpdated;
use crate::state::{Organization, Role};

pub fn handler(ctx: Context<UpdateRolePermissions>, new_permissions: u64) -> Result<()> {
    let role = &mut ctx.accounts.role;
    let clock = Clock::get()?;

    let old_permissions = role.permissions;

    if contains_super_admin(new_permissions) {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.organization.admin,
            RbacError::SuperAdminRestricted
        );
    }

    role.permissions = new_permissions;
    role.updated_at = clock.unix_timestamp;

    emit!(RolePermissionsUpdated {
        organization: ctx.accounts.organization.key(),
        role: role.key(),
        role_index: role.role_index,
        old_permissions,
        new_permissions,
        updated_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} permissions updated: 0x{:016X} → 0x{:016X}. Memberships may need refresh.",
        role.role_index,
        old_permissions,
        new_permissions
    );

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateRolePermissions<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
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
