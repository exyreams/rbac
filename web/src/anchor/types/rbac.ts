/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rbac.json`.
 */
export type Rbac = {
  "address": "EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb",
  "metadata": {
    "name": "rbac",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "On-chain Role-Based Access Control system for Solana."
  },
  "docs": [
    "# Solana On-Chain RBAC",
    "",
    "A complete Role-Based Access Control system implemented as a",
    "Solana program. Designed to be composed with via CPI — any",
    "program can delegate authorization decisions to this program.",
    "",
    "## Architecture",
    "",
    "```text",
    "Organization (tenant)",
    "├── Role 0..63 (permission sets)",
    "└── Membership (member ↔ roles binding with cached permissions)",
    "```",
    "",
    "## Key Design Decisions",
    "",
    "- **Bitmap permissions**: O(1) checks, 64 roles in 8 bytes",
    "- **Cached permissions**: avoids loading N role accounts per check",
    "- **Permissions epoch**: detects stale caches after role updates",
    "- **Reference counting**: prevents closing roles with active members",
    "- **Delegation guard**: non-admins can only assign roles they hold"
  ],
  "instructions": [
    {
      "name": "assignRole",
      "discriminator": [
        255,
        174,
        125,
        180,
        203,
        155,
        202,
        131
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "authorityMembership",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "role",
          "writable": true
        },
        {
          "name": "member",
          "docs": [
            "member address produces a valid PDA."
          ]
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "roleIndex",
          "type": "u8"
        },
        {
          "name": "expiresAt",
          "type": {
            "option": "i64"
          }
        }
      ]
    },
    {
      "name": "checkPermission",
      "discriminator": [
        154,
        199,
        232,
        242,
        96,
        72,
        197,
        236
      ],
      "accounts": [
        {
          "name": "organization"
        },
        {
          "name": "membership",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "membership.member",
                "account": "membership"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "requiredPermissions",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeMembership",
      "discriminator": [
        75,
        163,
        172,
        3,
        117,
        168,
        222,
        86
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "membership.member",
                "account": "membership"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeOrganization",
      "discriminator": [
        223,
        179,
        142,
        148,
        80,
        216,
        32,
        61
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "closeRole",
      "discriminator": [
        139,
        108,
        157,
        18,
        175,
        150,
        155,
        26
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "role",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createRole",
      "discriminator": [
        170,
        147,
        127,
        223,
        222,
        112,
        205,
        163
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "authorityMembership",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "role",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "permissions",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deactivateRole",
      "discriminator": [
        162,
        67,
        65,
        17,
        193,
        18,
        206,
        34
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "role",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeOrganization",
      "discriminator": [
        21,
        20,
        253,
        138,
        250,
        160,
        119,
        87
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  103,
                  97,
                  110,
                  105,
                  122,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "admin"
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "leaveOrganization",
      "discriminator": [
        46,
        228,
        122,
        79,
        49,
        105,
        53,
        79
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "reactivateRole",
      "discriminator": [
        134,
        26,
        174,
        189,
        131,
        204,
        47,
        137
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "role",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "refreshPermissions",
      "discriminator": [
        82,
        17,
        119,
        43,
        192,
        96,
        184,
        4
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization"
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "membership.member",
                "account": "membership"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "revokeRole",
      "discriminator": [
        179,
        232,
        2,
        180,
        48,
        227,
        82,
        7
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "authorityMembership",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "organization"
        },
        {
          "name": "role",
          "docs": [
            "The specific role being revoked. Mutable to decrement",
            "its `reference_count`."
          ],
          "writable": true
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "membership.member",
                "account": "membership"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "roleIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "transferAdmin",
      "discriminator": [
        42,
        242,
        66,
        106,
        228,
        10,
        111,
        156
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateMembershipExpiry",
      "discriminator": [
        130,
        213,
        143,
        86,
        250,
        213,
        129,
        213
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization"
        },
        {
          "name": "membership",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  115,
                  104,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "account",
                "path": "membership.member",
                "account": "membership"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newExpiresAt",
          "type": {
            "option": "i64"
          }
        }
      ]
    },
    {
      "name": "updateRolePermissions",
      "discriminator": [
        254,
        11,
        60,
        45,
        173,
        224,
        153,
        89
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "organization"
          ]
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "role",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newPermissions",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "membership",
      "discriminator": [
        231,
        141,
        180,
        98,
        109,
        168,
        175,
        166
      ]
    },
    {
      "name": "organization",
      "discriminator": [
        145,
        38,
        152,
        251,
        91,
        57,
        118,
        160
      ]
    },
    {
      "name": "role",
      "discriminator": [
        46,
        219,
        197,
        24,
        233,
        249,
        253,
        154
      ]
    }
  ],
  "events": [
    {
      "name": "adminTransferred",
      "discriminator": [
        255,
        147,
        182,
        5,
        199,
        217,
        38,
        179
      ]
    },
    {
      "name": "memberLeft",
      "discriminator": [
        48,
        83,
        72,
        92,
        111,
        227,
        133,
        142
      ]
    },
    {
      "name": "membershipClosed",
      "discriminator": [
        163,
        38,
        35,
        215,
        93,
        174,
        246,
        10
      ]
    },
    {
      "name": "membershipExpiryUpdated",
      "discriminator": [
        41,
        33,
        184,
        15,
        143,
        33,
        236,
        134
      ]
    },
    {
      "name": "organizationClosed",
      "discriminator": [
        164,
        185,
        225,
        9,
        55,
        173,
        239,
        244
      ]
    },
    {
      "name": "organizationCreated",
      "discriminator": [
        50,
        45,
        35,
        29,
        215,
        59,
        22,
        185
      ]
    },
    {
      "name": "permissionCheckPerformed",
      "discriminator": [
        105,
        198,
        99,
        230,
        157,
        75,
        234,
        100
      ]
    },
    {
      "name": "permissionsRefreshed",
      "discriminator": [
        54,
        183,
        251,
        135,
        89,
        118,
        238,
        206
      ]
    },
    {
      "name": "roleAssigned",
      "discriminator": [
        15,
        207,
        225,
        171,
        169,
        117,
        98,
        131
      ]
    },
    {
      "name": "roleClosed",
      "discriminator": [
        104,
        151,
        154,
        97,
        124,
        28,
        148,
        108
      ]
    },
    {
      "name": "roleCreated",
      "discriminator": [
        203,
        8,
        94,
        252,
        142,
        13,
        51,
        221
      ]
    },
    {
      "name": "roleDeactivated",
      "discriminator": [
        188,
        98,
        128,
        233,
        150,
        14,
        206,
        86
      ]
    },
    {
      "name": "rolePermissionsUpdated",
      "discriminator": [
        163,
        54,
        38,
        219,
        173,
        163,
        181,
        233
      ]
    },
    {
      "name": "roleReactivated",
      "discriminator": [
        9,
        120,
        96,
        16,
        13,
        24,
        250,
        208
      ]
    },
    {
      "name": "roleRevoked",
      "discriminator": [
        167,
        183,
        52,
        229,
        126,
        206,
        62,
        61
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooLong",
      "msg": "Name exceeds the maximum length of 32 bytes"
    },
    {
      "code": 6001,
      "name": "maxRolesReached",
      "msg": "Organization has reached the maximum role capacity of 64"
    },
    {
      "code": 6002,
      "name": "invalidRoleIndex",
      "msg": "Role index is out of valid bounds"
    },
    {
      "code": 6003,
      "name": "roleInactive",
      "msg": "Role is currently deactivated"
    },
    {
      "code": 6004,
      "name": "membershipExpired",
      "msg": "Membership has expired"
    },
    {
      "code": 6005,
      "name": "membershipInactive",
      "msg": "Membership is not active"
    },
    {
      "code": 6006,
      "name": "insufficientPermissions",
      "msg": "Insufficient permissions for this operation"
    },
    {
      "code": 6007,
      "name": "superAdminRestricted",
      "msg": "Only the organization admin can grant SUPER_ADMIN permissions"
    },
    {
      "code": 6008,
      "name": "organizationNotEmpty",
      "msg": "Cannot close organization with existing members or roles"
    },
    {
      "code": 6009,
      "name": "roleHasMembers",
      "msg": "Cannot close role while memberships still reference it"
    },
    {
      "code": 6010,
      "name": "roleAlreadyAssigned",
      "msg": "This role is already assigned to the member"
    },
    {
      "code": 6011,
      "name": "roleNotAssigned",
      "msg": "Member does not currently hold this role"
    },
    {
      "code": 6012,
      "name": "invalidRefreshAccounts",
      "msg": "Invalid remaining accounts provided for permission refresh"
    },
    {
      "code": 6013,
      "name": "cannotSelfRemoveAdmin",
      "msg": "Admin cannot remove themselves — transfer admin first"
    },
    {
      "code": 6014,
      "name": "expiryInPast",
      "msg": "Expiry timestamp must be in the future"
    },
    {
      "code": 6015,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in permission computation"
    },
    {
      "code": 6016,
      "name": "unauthorized",
      "msg": "Unauthorized: signer is neither admin nor authorized member"
    },
    {
      "code": 6017,
      "name": "invalidNewAdmin",
      "msg": "Cannot transfer admin to the zero address"
    },
    {
      "code": 6018,
      "name": "sameAdmin",
      "msg": "New admin is already the current admin"
    },
    {
      "code": 6019,
      "name": "stalePermissions",
      "msg": "Permissions cache is stale — call refresh_permissions first"
    },
    {
      "code": 6020,
      "name": "cannotDelegateUnheldRole",
      "msg": "Cannot assign a role you do not hold yourself"
    },
    {
      "code": 6021,
      "name": "membershipHasActiveRoles",
      "msg": "Revoke all roles before closing membership or leaving"
    }
  ],
  "types": [
    {
      "name": "adminTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "previousAdmin",
            "type": "pubkey"
          },
          {
            "name": "newAdmin",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "memberLeft",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "rolesBitmapAtDeparture",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "membership",
      "docs": [
        "Links a member to an organization with one or more roles.",
        "",
        "This is the Solana equivalent of a `user_roles` JOIN table, but with",
        "a critical optimization: all permission data is cached directly in",
        "this account, eliminating the need for JOINs at check time.",
        "",
        "# Permission Caching",
        "",
        "Web2 permission check:",
        "```sql",
        "SELECT 1 FROM permissions p",
        "JOIN role_permissions rp ON p.id = rp.permission_id",
        "JOIN user_roles ur ON rp.role_id = ur.role_id",
        "WHERE ur.user_id = ? AND p.name = 'WRITE'",
        "```",
        "",
        "On-chain check: `(cached_permissions & PERM_WRITE) == PERM_WRITE`",
        "",
        "One account read, one bitwise AND. No JOINs, no queries.",
        "",
        "# Cache Staleness",
        "When a role's permissions change, `permissions_epoch` falls behind",
        "the organization's epoch. `check_permission` detects this and",
        "rejects the check until `refresh_permissions` is called — the",
        "on-chain version of Redis cache invalidation.",
        "",
        "# PDA Seeds",
        "`[\"membership\", organization_pubkey, member_pubkey]`",
        "",
        "Guarantees one membership per member per organization."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "docs": [
              "Parent organization."
            ],
            "type": "pubkey"
          },
          {
            "name": "member",
            "docs": [
              "The member's wallet address."
            ],
            "type": "pubkey"
          },
          {
            "name": "rolesBitmap",
            "docs": [
              "Bitmap of assigned role indices. Bit N set means role N is held."
            ],
            "type": "u64"
          },
          {
            "name": "cachedPermissions",
            "docs": [
              "OR of all assigned roles' permission bitmaps.",
              "Refreshed via `refresh_permissions` when stale."
            ],
            "type": "u64"
          },
          {
            "name": "grantedBy",
            "docs": [
              "Last authority who modified this membership."
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "lastUpdated",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "docs": [
              "Optional expiration. Checked during `check_permission`."
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "isActive",
            "docs": [
              "Whether this membership is active. Set to false when",
              "all roles are revoked."
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "permissionsEpoch",
            "docs": [
              "Must match `Organization.permissions_epoch` for",
              "`check_permission` to succeed."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "membershipClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "rolesBitmapAtClosure",
            "type": "u64"
          },
          {
            "name": "rentReclaimed",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "membershipExpiryUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "membership",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "oldExpiresAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "newExpiresAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "organization",
      "docs": [
        "Top-level entity in the RBAC hierarchy.",
        "",
        "Maps to a \"tenant\" or \"workspace\" in Web2 systems. Each organization",
        "has an isolated set of roles and memberships, similar to how a SaaS",
        "app partitions data per customer.",
        "",
        "# PDA Seeds",
        "`[\"organization\", creator_pubkey, name_bytes]`",
        "",
        "Two different creators can both have an org named \"default\" because",
        "the creator pubkey is part of the seed.",
        "",
        "# Lifecycle",
        "`initialize_org` → manage roles/members → `close_organization`",
        "",
        "Closing requires `role_count == 0` and `member_count == 0` to",
        "prevent orphaned state.",
        "",
        "# Permissions Epoch",
        "Incremented whenever any role's permissions change (update,",
        "deactivate, reactivate). Memberships cache this value; if",
        "they fall behind, `check_permission` rejects them until",
        "`refresh_permissions` is called — the on-chain equivalent of",
        "cache invalidation in Redis."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Current administrator. Transferable via `transfer_admin`."
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "Original creator (immutable). Used as PDA seed for namespacing."
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "UTF-8 name, null-padded to 32 bytes."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nameLen",
            "docs": [
              "Actual byte length of the name."
            ],
            "type": "u8"
          },
          {
            "name": "roleCount",
            "docs": [
              "Number of roles created. Also serves as the next `role_index`."
            ],
            "type": "u8"
          },
          {
            "name": "memberCount",
            "docs": [
              "Number of active membership accounts."
            ],
            "type": "u32"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp of creation."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "permissionsEpoch",
            "docs": [
              "Monotonic counter incremented on any role permission change.",
              "Memberships must match this to pass `check_permission`."
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved for future fields without account reallocation."
            ],
            "type": {
              "array": [
                "u8",
                56
              ]
            }
          }
        ]
      }
    },
    {
      "name": "organizationClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "rentReclaimed",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "organizationCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "permissionCheckPerformed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "requiredPermissions",
            "type": "u64"
          },
          {
            "name": "actualPermissions",
            "type": "u64"
          },
          {
            "name": "granted",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "permissionsRefreshed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "membership",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "oldCachedPermissions",
            "type": "u64"
          },
          {
            "name": "newCachedPermissions",
            "type": "u64"
          },
          {
            "name": "syncedEpoch",
            "type": "u64"
          },
          {
            "name": "refreshedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "role",
      "docs": [
        "Defines a named permission set within an organization.",
        "",
        "Equivalent to a role row in a Web2 `roles` table, but with permissions",
        "encoded as a 64-bit bitmap rather than a JOIN table.",
        "",
        "# PDA Seeds",
        "`[\"role\", organization_pubkey, role_index]`",
        "",
        "# Reference Counting",
        "`reference_count` tracks how many memberships currently hold this role.",
        "The role cannot be closed until all memberships revoke it",
        "(`reference_count == 0`), preventing dangling bitmap references.",
        "",
        "# Active/Inactive",
        "Deactivated roles stop contributing permissions on the next",
        "`refresh_permissions` call, but existing caches remain until refreshed.",
        "The organization's `permissions_epoch` is incremented on state change",
        "to force a refresh."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "docs": [
              "Parent organization."
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "UTF-8 name, null-padded."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "roleIndex",
            "docs": [
              "Position in the organization's role list and the corresponding",
              "bit position in `Membership.roles_bitmap`."
            ],
            "type": "u8"
          },
          {
            "name": "permissions",
            "docs": [
              "Bitmap of granted permissions. OR'd into the membership cache",
              "when this role is assigned."
            ],
            "type": "u64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether this role is currently active. Inactive roles are excluded",
              "from permission calculations during `refresh_permissions`."
            ],
            "type": "bool"
          },
          {
            "name": "createdBy",
            "docs": [
              "Who created this role."
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "referenceCount",
            "docs": [
              "Number of memberships currently holding this role.",
              "Incremented on `assign_role`, decremented on `revoke_role`."
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "roleAssigned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "membership",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "grantedBy",
            "type": "pubkey"
          },
          {
            "name": "newRolesBitmap",
            "type": "u64"
          },
          {
            "name": "newCachedPermissions",
            "type": "u64"
          },
          {
            "name": "newReferenceCount",
            "type": "u32"
          },
          {
            "name": "isNewMembership",
            "type": "bool"
          },
          {
            "name": "permissionsEpoch",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "rentReclaimed",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "permissions",
            "type": "u64"
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleDeactivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "deactivatedBy",
            "type": "pubkey"
          },
          {
            "name": "newPermissionsEpoch",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "rolePermissionsUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "oldPermissions",
            "type": "u64"
          },
          {
            "name": "newPermissions",
            "type": "u64"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "newPermissionsEpoch",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleReactivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "reactivatedBy",
            "type": "pubkey"
          },
          {
            "name": "newPermissionsEpoch",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "membership",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "roleIndex",
            "type": "u8"
          },
          {
            "name": "revokedBy",
            "type": "pubkey"
          },
          {
            "name": "newRolesBitmap",
            "type": "u64"
          },
          {
            "name": "newCachedPermissions",
            "type": "u64"
          },
          {
            "name": "newReferenceCount",
            "type": "u32"
          },
          {
            "name": "permissionsEpoch",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
