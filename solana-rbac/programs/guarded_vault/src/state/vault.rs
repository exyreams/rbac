use anchor_lang::prelude::*;

/// A key-value data vault protected by the RBAC program via CPI.
///
/// Demonstrates how any Solana program can delegate authorization
/// to the RBAC engine — the on-chain equivalent of auth middleware
/// in a Web2 backend.
///
/// # PDA Seeds
/// `["vault", organization_pubkey, label_bytes]`
///
/// # Versioning
/// `version` is a monotonic counter incremented on every write.
/// Clients can use this for optimistic concurrency control:
///
/// ```text
/// 1. Read vault, note version = 5
/// 2. Submit write with expected_version = 5
/// 3. If version changed between read and write → reject
/// ```
///
/// This mirrors the ETag/If-Match pattern in HTTP APIs.
#[account]
#[derive(Debug, InitSpace)]
pub struct Vault {
    /// Parent organization.
    pub organization: Pubkey,

    /// Who created this vault.
    pub creator: Pubkey,

    /// Stored data, padded to 256 bytes.
    pub data: [u8; 256],

    /// Actual number of meaningful bytes in `data`.
    pub data_len: u16,

    /// Vault label, padded to 32 bytes.
    pub label: [u8; 32],

    /// Actual byte length of the label.
    pub label_len: u8,

    pub created_at: i64,
    pub updated_at: i64,

    /// Last writer's pubkey.
    pub last_modified_by: Pubkey,

    /// PDA bump seed.
    pub bump: u8,

    /// Monotonic write counter for optimistic concurrency.
    pub version: u32,
}
