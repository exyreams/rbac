use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY");

/// # Guarded Vault
///
/// A CPI-guarded key-value vault that delegates all authorization
/// to the RBAC program. Demonstrates composable access control:
///
/// - `initialize_vault` → requires WRITE
/// - `write_vault` → requires WRITE
/// - `read_vault` → requires READ
/// - `delete_vault` → requires DELETE
///
/// Any Solana program can follow this same pattern to integrate
/// with the RBAC engine without any coordination.
#[program]
pub mod guarded_vault {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        label: String,
        data: Vec<u8>,
    ) -> Result<()> {
        instructions::initialize_vault::handler(ctx, label, data)
    }

    pub fn write_vault(ctx: Context<WriteVault>, new_data: Vec<u8>) -> Result<()> {
        instructions::write_vault::handler(ctx, new_data)
    }

    pub fn read_vault(ctx: Context<ReadVault>) -> Result<()> {
        instructions::read_vault::handler(ctx)
    }

    pub fn delete_vault(ctx: Context<DeleteVault>) -> Result<()> {
        instructions::delete_vault::handler(ctx)
    }
}
