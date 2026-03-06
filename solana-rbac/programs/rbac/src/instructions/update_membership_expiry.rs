use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RbacError;
use crate::events::MembershipExpiryUpdated;
use crate::state::{Membership, Organization};

/// Updates or removes the expiry timestamp on a membership.
///
/// Pass `None` to remove expiry (membership never expires).
/// Pass `Some(timestamp)` to set a future expiry.
pub fn handler(ctx: Context<UpdateMembershipExpiry>, new_expires_at: Option<i64>) -> Result<()> {
    let clock = Clock::get()?;

    if let Some(exp) = new_expires_at {
        require!(exp > clock.unix_timestamp, RbacError::ExpiryInPast);
    }

    let membership = &mut ctx.accounts.membership;
    let old_expires_at = membership.expires_at;

    membership.expires_at = new_expires_at;
    membership.last_updated = clock.unix_timestamp;

    emit!(MembershipExpiryUpdated {
        organization: ctx.accounts.organization.key(),
        membership: membership.key(),
        member: membership.member,
        old_expires_at,
        new_expires_at,
        updated_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Membership expiry updated for {}: {:?} → {:?}",
        membership.member,
        old_expires_at,
        new_expires_at
    );

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateMembershipExpiry<'info> {
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
