use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::RoleAssigned;
use crate::state::{Membership, Organization, Role};

/// Assigns a role to a member, creating the membership if needed.
///
/// Callable by:
/// - Organization admin (can assign any role)
/// - Any member with `PERM_ASSIGN_MEMBER` **who also holds the role
///   being assigned** (delegation guard — prevents privilege escalation)
///
/// # Delegation Guard
///
/// In Web2, systems like AWS IAM enforce that delegators cannot grant
/// permissions they don't hold. We enforce the same: a non-admin
/// assigner must hold the role they're assigning. This prevents a
/// member with `ASSIGN_MEMBER` + `READ` from granting `WRITE` to others.
///
/// # Permissions Epoch
///
/// New and updated memberships sync their `permissions_epoch` to the
/// organization's current epoch, ensuring they start with a fresh cache.
pub fn handler(ctx: Context<AssignRole>, role_index: u8, expires_at: Option<i64>) -> Result<()> {
    require!(role_index < MAX_ROLES, RbacError::InvalidRoleIndex);

    let clock = Clock::get()?;

    // Pre-read role data to avoid borrow conflicts
    let role_is_active = ctx.accounts.role.is_active;
    let role_idx = ctx.accounts.role.role_index;
    let role_permissions = ctx.accounts.role.permissions;

    require!(role_is_active, RbacError::RoleInactive);
    require!(role_idx == role_index, RbacError::InvalidRoleIndex);

    let signer_key = ctx.accounts.authority.key();
    let org_key = ctx.accounts.organization.key();
    let org_epoch = ctx.accounts.organization.permissions_epoch;
    let is_admin = signer_key == ctx.accounts.organization.admin;
    let member_key = ctx.accounts.member.key();

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
            has_permission(auth_membership.cached_permissions, PERM_ASSIGN_MEMBER),
            RbacError::InsufficientPermissions
        );

        // Delegation guard: non-admins can only assign roles they hold
        let assigner_bit = role_bit(role_index);
        require!(
            auth_membership.roles_bitmap & assigner_bit != 0,
            RbacError::CannotDelegateUnheldRole
        );

        if contains_super_admin(role_permissions) {
            return Err(error!(RbacError::SuperAdminRestricted));
        }
    }

    if let Some(exp) = expires_at {
        require!(exp > clock.unix_timestamp, RbacError::ExpiryInPast);
    }

    // ── Update membership ──────────────────────────────────────
    let membership = &mut ctx.accounts.membership;
    let bit = role_bit(role_index);
    let is_new = membership.created_at == 0;

    if is_new {
        membership.organization = org_key;
        membership.member = member_key;
        membership.roles_bitmap = bit;
        membership.cached_permissions = role_permissions;
        membership.granted_by = signer_key;
        membership.created_at = clock.unix_timestamp;
        membership.last_updated = clock.unix_timestamp;
        membership.expires_at = expires_at;
        membership.is_active = true;
        membership.permissions_epoch = org_epoch;
        membership.bump = ctx.bumps.membership;

        ctx.accounts.organization.member_count = ctx
            .accounts
            .organization
            .member_count
            .checked_add(1)
            .ok_or(RbacError::ArithmeticOverflow)?;
    } else {
        require!(
            membership.roles_bitmap & bit == 0,
            RbacError::RoleAlreadyAssigned
        );

        membership.roles_bitmap |= bit;
        membership.cached_permissions |= role_permissions;
        membership.granted_by = signer_key;
        membership.last_updated = clock.unix_timestamp;
        membership.is_active = true;
        membership.permissions_epoch = org_epoch;

        if expires_at.is_some() {
            membership.expires_at = expires_at;
        }
    }

    let new_bitmap = membership.roles_bitmap;
    let new_cached = membership.cached_permissions;
    let membership_key = membership.key();

    // ── Increment reference count on assigned role ─────────────
    let role = &mut ctx.accounts.role;
    role.reference_count = role
        .reference_count
        .checked_add(1)
        .ok_or(RbacError::ArithmeticOverflow)?;

    let new_ref_count = role.reference_count;

    emit!(RoleAssigned {
        organization: org_key,
        membership: membership_key,
        member: member_key,
        role_index,
        granted_by: signer_key,
        new_roles_bitmap: new_bitmap,
        new_cached_permissions: new_cached,
        new_reference_count: new_ref_count,
        is_new_membership: is_new,
        permissions_epoch: org_epoch,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Role {} assigned to {}. Bitmap: 0x{:016X}, Perms: 0x{:016X}, Refs: {}",
        role_index,
        member_key,
        new_bitmap,
        new_cached,
        new_ref_count
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

    /// CHECK: Validated via the membership PDA seed — only the correct
    /// member address produces a valid PDA.
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
