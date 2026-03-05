use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleAssigned;
use crate::state::{Membership, Organization, Role};

pub fn handler(ctx: Context<AssignRole>, role_index: u8, expires_at: Option<i64>) -> Result<()> {
    require!(role_index < MAX_ROLES, RbacError::InvalidRoleIndex);

    let role = &ctx.accounts.role;
    let clock = Clock::get()?;

    require!(role.is_active, RbacError::RoleInactive);
    require!(role.role_index == role_index, RbacError::InvalidRoleIndex);

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
            has_permission(auth_membership.cached_permissions, PERM_ASSIGN_MEMBER),
            RbacError::InsufficientPermissions
        );

        if contains_super_admin(role.permissions) {
            return Err(error!(RbacError::SuperAdminRestricted));
        }
    }

    if let Some(exp) = expires_at {
        require!(exp > clock.unix_timestamp, RbacError::ExpiryInPast);
    }

    let membership = &mut ctx.accounts.membership;
    let bit = role_bit(role_index);
    let is_new = membership.created_at == 0;

    if is_new {
        membership.organization = ctx.accounts.organization.key();
        membership.member = ctx.accounts.member.key();
        membership.roles_bitmap = bit;
        membership.cached_permissions = role.permissions;
        membership.granted_by = signer_key;
        membership.created_at = clock.unix_timestamp;
        membership.last_updated = clock.unix_timestamp;
        membership.expires_at = expires_at;
        membership.is_active = true;
        membership.bump = ctx.bumps.membership;

        let org = &mut ctx.accounts.organization;
        org.member_count = org
            .member_count
            .checked_add(1)
            .ok_or(RbacError::ArithmeticOverflow)?;
    } else {
        require!(
            membership.roles_bitmap & bit == 0,
            RbacError::RoleAlreadyAssigned
        );

        membership.roles_bitmap |= bit;
        membership.cached_permissions |= role.permissions;
        membership.granted_by = signer_key;
        membership.last_updated = clock.unix_timestamp;
        membership.is_active = true;

        if expires_at.is_some() {
            membership.expires_at = expires_at;
        }
    }

    emit!(RoleAssigned {
        organization: ctx.accounts.organization.key(),
        membership: membership.key(),
        member: ctx.accounts.member.key(),
        role_index,
        granted_by: signer_key,
        new_roles_bitmap: membership.roles_bitmap,
        new_cached_permissions: membership.cached_permissions,
        is_new_membership: is_new,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} assigned to {}. Bitmap: 0x{:016X}, Perms: 0x{:016X}",
        role_index,
        ctx.accounts.member.key(),
        membership.roles_bitmap,
        membership.cached_permissions
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(role_index: u8)]
pub struct AssignRole<'info> {
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
        constraint = role.organization == organization.key(),
        seeds = [
            ROLE_SEED,
            organization.key().as_ref(),
            &[role_index],
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,

    /// CHECK: Validated indirectly — the membership PDA is seeded with this
    /// key, so only the correct member address produces a valid PDA.
    pub member: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Membership::INIT_SPACE,
        seeds = [
            MEMBERSHIP_SEED,
            organization.key().as_ref(),
            member.key().as_ref(),
        ],
        bump
    )]
    pub membership: Account<'info, Membership>,

    pub system_program: Program<'info, System>,
}
