use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::MemberLeft;
use crate::state::{Membership, Organization};

pub fn handler(ctx: Context<LeaveOrganization>) -> Result<()> {
    let clock = Clock::get()?;
    let membership = &ctx.accounts.membership;

    require!(
        membership.member != ctx.accounts.organization.admin,
        RbacError::CannotSelfRemoveAdmin
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
        seeds = [
            MEMBERSHIP_SEED,
            organization.key().as_ref(),
            member.key().as_ref(),
        ],
        bump = membership.bump
    )]
    pub membership: Account<'info, Membership>,
}
