use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct Vault {
    pub organization: Pubkey,
    pub creator: Pubkey,
    pub data: [u8; 256],
    pub label: [u8; 32],
    pub label_len: u8,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_modified_by: Pubkey,
    pub bump: u8,
}

impl Vault {
    pub const INIT_SPACE: usize = 32 + 32 + 256 + 32 + 1 + 8 + 8 + 32 + 1;
}
