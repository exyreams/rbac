use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct Role {
    pub organization: Pubkey,
    pub name: [u8; 32],
    pub role_index: u8,
    pub permissions: u64,
    pub is_active: bool,
    pub created_by: Pubkey,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl Role {
    pub const INIT_SPACE: usize = 32 + 32 + 1 + 8 + 1 + 32 + 8 + 8 + 1;
}
