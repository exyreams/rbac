use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("RBAC permission check failed — access denied")]
    PermissionDenied,

    #[msg("Vault label exceeds 32 bytes")]
    LabelTooLong,

    #[msg("Vault data exceeds 256 bytes")]
    DataTooLong,

    #[msg("Vault does not belong to the specified organization")]
    OrganizationMismatch,

    #[msg("CPI to RBAC program failed")]
    RbacCpiFailed,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
