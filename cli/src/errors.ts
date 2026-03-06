/**
 * errors.ts — Structured error parsing for Anchor and Solana errors.
 *
 * Extracts error codes, human-readable messages, and actionable suggestions
 * from the various error formats Anchor and Solana can produce.
 */

export interface ParsedError {
  code: string;
  message: string;
  suggestion: string;
  isAnchorError: boolean;
  isRetryable: boolean;
  logs?: string[];
}

/** Maps known Anchor error codes to actionable fix suggestions. */
const SUGGESTIONS: Record<string, string> = {
  InsufficientPermissions: "Check permissions: rbac-cli member show <pubkey>",
  StalePermissions: "Refresh cache: rbac-cli member refresh <pubkey>",
  MembershipInactive: "Membership deactivated. Assign a role to reactivate.",
  MembershipExpired: "Update expiry: rbac-cli member update-expiry <pubkey> -e <ts>",
  MembershipHasActiveRoles: "Revoke all roles first: rbac-cli member revoke <pubkey> <idx>",
  RoleHasMembers: "Revoke this role from all members before closing.",
  RoleAlreadyAssigned: "This role is already assigned to the member.",
  RoleNotAssigned: "Member does not currently hold this role.",
  OrganizationNotEmpty: "Close all roles and memberships first.",
  CannotDelegateUnheldRole: "You can only delegate roles you hold yourself.",
  SuperAdminRestricted: "Only the org admin can grant SUPER_ADMIN.",
  Unauthorized: "Signer is neither admin nor authorized member.",
  InvalidRoleIndex: "Role index must be 0–63.",
  NameTooLong: "Name must be ≤ 32 bytes.",
  ExpiryInPast: "Expiry timestamp must be in the future.",
  MaxRolesReached: "Organization has reached the 64-role limit.",
  RoleInactive: "Reactivate the role first: rbac-cli role reactivate <idx>",
  PermissionDenied: "RBAC check failed. Verify role assignments.",
  LabelTooLong: "Vault label must be ≤ 32 bytes.",
  DataTooLong: "Vault data must be ≤ 256 bytes.",
  ArithmeticOverflow: "Numeric overflow — please report this bug.",
  InvalidNewAdmin: "Cannot transfer admin to the zero address.",
  SameAdmin: "New admin is already the current admin.",
  InvalidRefreshAccounts: "Pass remaining role accounts for refresh.",
  CannotSelfRemoveAdmin: "Transfer admin first: rbac-cli org transfer-admin <new>",
};

/**
 * Parse any error into a structured ParsedError.
 * Handles Anchor errors, Solana tx errors, network errors, and plain strings.
 */
export function parseAnchorError(err: any): ParsedError {
  // Already a ParsedError
  if (err && typeof err === "object" && "isAnchorError" in err) {
    return err as ParsedError;
  }

  // Plain string
  if (typeof err === "string") {
    return {
      code: "Error",
      message: err,
      suggestion: findSuggestion(err),
      isAnchorError: false,
      isRetryable: false,
    };
  }

  // Anchor structured error (err.error.errorCode.code)
  if (err?.error?.errorCode?.code) {
    const code = err.error.errorCode.code;
    return {
      code,
      message: err.error.errorMessage || code,
      suggestion: SUGGESTIONS[code] || "",
      isAnchorError: true,
      isRetryable: false,
      logs: err.logs,
    };
  }

  // Search transaction logs for error codes
  if (err?.logs && Array.isArray(err.logs)) {
    for (const log of err.logs) {
      const match = log.match(/Error Code: (\w+)\. Error Message: (.+)/);
      if (match) {
        return {
          code: match[1],
          message: match[2],
          suggestion: SUGGESTIONS[match[1]] || "",
          isAnchorError: true,
          isRetryable: false,
          logs: err.logs,
        };
      }
    }
  }

  const msg = String(err?.message || err);

  // Constraint errors
  if (msg.includes("ConstraintHasOne")) {
    return {
      code: "ConstraintHasOne",
      message: "Account constraint violation — wrong authority or ownership.",
      suggestion: "Verify you're using the correct keypair.",
      isAnchorError: true,
      isRetryable: false,
    };
  }

  // Account not found
  if (msg.includes("AccountNotInitialized") || msg.includes("Account does not exist")) {
    return {
      code: "AccountNotFound",
      message: "Account does not exist or hasn't been created yet.",
      suggestion: "Create the account first (org init, member assign, etc.).",
      isAnchorError: true,
      isRetryable: false,
    };
  }

  // Already exists
  if (msg.includes("already in use")) {
    return {
      code: "AccountAlreadyExists",
      message: "This account already exists.",
      suggestion: "Use a different name or check existing accounts.",
      isAnchorError: false,
      isRetryable: false,
    };
  }

  // Insufficient funds
  if (msg.includes("insufficient") && (msg.includes("fund") || msg.includes("lamport"))) {
    return {
      code: "InsufficientFunds",
      message: "Not enough SOL for this transaction.",
      suggestion: "Run: solana airdrop 2 --url devnet",
      isAnchorError: false,
      isRetryable: false,
    };
  }

  // Network / timeout (retryable)
  if (
    msg.includes("BlockhashNotFound") ||
    msg.includes("TransactionExpiredBlockheight") ||
    msg.includes("timeout") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("429") ||
    msg.includes("Too Many Requests")
  ) {
    return {
      code: "NetworkError",
      message: msg.slice(0, 200),
      suggestion: "Check your connection and try again.",
      isAnchorError: false,
      isRetryable: true,
    };
  }

  // Fallback
  return {
    code: "Error",
    message: msg.slice(0, 300),
    suggestion: findSuggestion(msg),
    isAnchorError: false,
    isRetryable: false,
  };
}

/** Search the message for any known error code and return its suggestion. */
function findSuggestion(msg: string): string {
  for (const [code, suggestion] of Object.entries(SUGGESTIONS)) {
    if (msg.includes(code)) return suggestion;
  }
  return "";
}