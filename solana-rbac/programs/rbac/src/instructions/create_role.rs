use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleCreated;
use crate::state::{Membership, Organization, Role};

pub fn handler(ctx: Context<CreateRole>, name: String, permissions: u64) -> Result<()> {
    require!(name.len() <= MAX_NAME_LENGTH, RbacError::NameTooLong);

    let organization = &mut ctx.accounts.organization;
    let clock = Clock::get()?;

    require!(
        organization.role_count < MAX_ROLES,
        RbacError::MaxRolesReached
    );

    let signer_key = ctx.accounts.authority.key();
    let is_admin = signer_key == organization.admin;

    if !is_admin {
        let membership = ctx
            .accounts
            .authority_membership
            .as_ref()
            .ok_or(error!(RbacError::Unauthorized))?;

        require!(membership.is_active, RbacError::MembershipInactive);

        if let Some(expires_at) = membership.expires_at {
            require!(
                clock.unix_timestamp < expires_at,
                RbacError::MembershipExpired
            );
        }

        require!(
            has_permission(membership.cached_permissions, PERM_CREATE_ROLE),
            RbacError::InsufficientPermissions
        );
    }

    if contains_super_admin(permissions) {
        require!(is_admin, RbacError::SuperAdminRestricted);
    }

    let mut name_bytes = [0u8; 32];
    let bytes = name.as_bytes();
    name_bytes[..bytes.len()].copy_from_slice(bytes);

    let role_index = organization.role_count;

    let role = &mut ctx.accounts.role;
    role.organization = organization.key();
    role.name = name_bytes;
    role.role_index = role_index;
    role.permissions = permissions;
    role.is_active = true;
    role.created_by = signer_key;
    role.created_at = clock.unix_timestamp;
    role.updated_at = clock.unix_timestamp;
    role.bump = ctx.bumps.role;

    organization.role_count = organization
        .role_count
        .checked_add(1)
        .ok_or(RbacError::ArithmeticOverflow)?;

    emit!(RoleCreated {
        organization: organization.key(),
        role: role.key(),
        role_index,
        name: name_bytes,
        permissions,
        created_by: signer_key,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role '{}' (index {}) created with permissions 0x{:016X}",
        name,
        role_index,
        permissions
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CreateRole<'info> {
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
        mut,
        seeds = [
            ORGANIZATION_SEED,
            organization.creator.as_ref(),
            &organization.name[..organization.name_len as usize],
        ],
        bump = organization.bump
    )]
    pub organization: Account<'info, Organization>,

    #[account(
        init,
        payer = authority,
        space = 8 + Role::INIT_SPACE,
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[organization.role_count],
        ],
        bump
    )]
    pub role: Account<'info, Role>,

    pub system_program: Program<'info, System>,
}
