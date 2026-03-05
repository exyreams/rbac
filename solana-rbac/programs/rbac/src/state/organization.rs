use anchor_lang::prelude::*;

use crate::constants::RESERVED_SPACE;

#[account]
#[derive(Debug)]
pub struct Organization {
    pub admin: Pubkey,
    pub creator: Pubkey,
    pub name: [u8; 32],
    pub name_len: u8,
    pub role_count: u8,
    pub member_count: u32,
    pub created_at: i64,
    pub bump: u8,
    pub reserved: [u8; RESERVED_SPACE],
}

impl Organization {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 1 + 1 + 4 + 8 + 1 + RESERVED_SPACE;
}
