use anchor_lang::prelude::*;

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub organization: Pubkey,
    pub creator: Pubkey,
    pub label: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct VaultWritten {
    pub vault: Pubkey,
    pub organization: Pubkey,
    pub writer: Pubkey,
    pub data_length: u32,
    pub timestamp: i64,
}

#[event]
pub struct VaultRead {
    pub vault: Pubkey,
    pub organization: Pubkey,
    pub reader: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VaultDeleted {
    pub vault: Pubkey,
    pub organization: Pubkey,
    pub deleted_by: Pubkey,
    pub rent_reclaimed: u64,
    pub timestamp: i64,
}
