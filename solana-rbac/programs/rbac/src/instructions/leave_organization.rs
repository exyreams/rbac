use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::MemberLeft;
use crate::state::{Membership, Organization};

/// Self-service departure from an organization.
///
/// The member must revoke all their roles before leaving.
/// In Web2, leaving a workspace usually auto-removes roles,
/// but on Solana role `reference_count` must be explicitly
/// decremented to maintain consistency.
///
/// # Workflow
/// 1. Admin (or self, if permitted) calls `revoke_role` for each role
/// 2. Member calls `leave_organization`
pub fn handler(ctx: Context<LeaveOrganization>) -> Result<()> {
    let clock = Clock::get()?;
    let membership = &ctx.accounts.membership;

    require!(
        membership.member != ctx.accounts.organization.admin,
        RbacError::CannotSelfRemoveAdmin
    );

    require!(
        membership.roles_bitmap == 0,
        RbacError::MembershipHasActiveRoles
    );

    let roles_bitmap_at_departure = membership.roles_bitmap;

    let org = &mut ctx.accounts.organization;
    org.member_count = org.member_count.saturating_sub(1);

    emit!(MemberLeft {
        organization: org.key(),
        member: ctx.accounts.member.key(),
        roles_bitmap_at_departure,
        timestamp: clock.unix_timestamp,
    });

    msg!("Member {} left the organization", ctx.accounts.member.key());

    Ok(())
}

#[derive(Accounts)]
pub struct LeaveOrganization<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

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
        close = member,
        constraint = membership.organization == organization.key(),
        constraint = membership.member == member.key(),
        constraint = membership.roles_bitmap == 0 @ RbacError::MembershipHasActiveRoles,
        seeds = [
            MEMBERSHIP_SEED,
            organization.key().as_ref(),
            member.key().as_ref(),
        ],
        bump = membership.bump
    )]
    pub membership: Account<'info, Membership>,
}
