use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::MembershipClosed;
use crate::state::{Membership, Organization};

pub fn handler(ctx: Context<CloseMembership>) -> Result<()> {
    let clock = Clock::get()?;
    let membership = &ctx.accounts.membership;

    require!(
        membership.member != ctx.accounts.admin.key(),
        RbacError::CannotSelfRemoveAdmin
    );

    let rent_reclaimed = ctx.accounts.membership.to_account_info().lamports();
    let roles_bitmap_at_closure = membership.roles_bitmap;
    let member = membership.member;

    let org = &mut ctx.accounts.organization;
    org.member_count = org.member_count.saturating_sub(1);

    emit!(MembershipClosed {
        organization: org.key(),
        member,
        closed_by: ctx.accounts.admin.key(),
        roles_bitmap_at_closure,
        rent_reclaimed,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Membership for {} closed by admin. {} lamports reclaimed.",
        member,
        rent_reclaimed
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CloseMembership<'info> {
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
        close = admin,
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
