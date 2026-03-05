use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct Membership {
    pub organization: Pubkey,
    pub member: Pubkey,
    pub roles_bitmap: u64,
    pub cached_permissions: u64,
    pub granted_by: Pubkey,
    pub created_at: i64,
    pub last_updated: i64,
    pub expires_at: Option<i64>,
    pub is_active: bool,
    pub bump: u8,
}

impl Membership {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 32 + 8 + 8 + 9 + 1 + 1;
}
