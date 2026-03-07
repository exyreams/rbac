/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/guarded_vault.json`.
 */
export type GuardedVault = {
  "address": "HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY",
  "metadata": {
    "name": "guardedVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "CPI-guarded vault demonstrating RBAC composability."
  },
  "docs": [
    "# Guarded Vault",
    "",
    "A CPI-guarded key-value vault that delegates all authorization",
    "to the RBAC program. Demonstrates composable access control:",
    "",
    "- `initialize_vault` → requires WRITE",
    "- `write_vault` → requires WRITE",
    "- `read_vault` → requires READ",
    "- `delete_vault` → requires DELETE",
    "",
    "Any Solana program can follow this same pattern to integrate",
    "with the RBAC engine without any coordination."
  ],
  "instructions": [
    {
      "name": "deleteVault",
      "discriminator": [
        99,
        171,
        186,
        178,
        201,
        17,
        81,
        238
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization"
        },
        {
          "name": "membership"
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "rbacProgram",
          "address": "EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb"
        }
      ],
      "args": []
    },
    {
      "name": "initializeVault",
      "discriminator": [
        48,
        191,
        163,
        44,
        71,
        129,
        63,
        164
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization"
        },
        {
          "name": "membership"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "arg",
                "path": "label"
              }
            ]
          }
        },
        {
          "name": "rbacProgram",
          "address": "EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "label",
          "type": "string"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "readVault",
      "discriminator": [
        124,
        195,
        48,
        97,
        68,
        153,
        234,
        245
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "organization"
        },
        {
          "name": "membership"
        },
        {
          "name": "vault"
        },
        {
          "name": "rbacProgram",
          "address": "EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb"
        }
      ],
      "args": []
    },
    {
      "name": "writeVault",
      "discriminator": [
        4,
        50,
        39,
        206,
        221,
        77,
        202,
        240
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization"
        },
        {
          "name": "membership"
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "rbacProgram",
          "address": "EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb"
        }
      ],
      "args": [
        {
          "name": "newData",
          "type": "bytes"
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
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "events": [
    {
      "name": "vaultCreated",
      "discriminator": [
        117,
        25,
        120,
        254,
        75,
        236,
        78,
        115
      ]
    },
    {
      "name": "vaultDeleted",
      "discriminator": [
        89,
        143,
        126,
        144,
        12,
        23,
        165,
        184
      ]
    },
    {
      "name": "vaultRead",
      "discriminator": [
        163,
        239,
        54,
        208,
        209,
        47,
        178,
        115
      ]
    },
    {
      "name": "vaultWritten",
      "discriminator": [
        188,
        116,
        31,
        234,
        105,
        127,
        164,
        94
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "permissionDenied",
      "msg": "RBAC permission check failed — access denied"
    },
    {
      "code": 6001,
      "name": "labelTooLong",
      "msg": "Vault label exceeds 32 bytes"
    },
    {
      "code": 6002,
      "name": "dataTooLong",
      "msg": "Vault data exceeds 256 bytes"
    },
    {
      "code": 6003,
      "name": "organizationMismatch",
      "msg": "Vault does not belong to the specified organization"
    },
    {
      "code": 6004,
      "name": "rbacCpiFailed",
      "msg": "CPI to RBAC program failed"
    },
    {
      "code": 6005,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
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
      "name": "vault",
      "docs": [
        "A key-value data vault protected by the RBAC program via CPI.",
        "",
        "Demonstrates how any Solana program can delegate authorization",
        "to the RBAC engine — the on-chain equivalent of auth middleware",
        "in a Web2 backend.",
        "",
        "# PDA Seeds",
        "`[\"vault\", organization_pubkey, label_bytes]`",
        "",
        "# Versioning",
        "`version` is a monotonic counter incremented on every write.",
        "Clients can use this for optimistic concurrency control:",
        "",
        "```text",
        "1. Read vault, note version = 5",
        "2. Submit write with expected_version = 5",
        "3. If version changed between read and write → reject",
        "```",
        "",
        "This mirrors the ETag/If-Match pattern in HTTP APIs."
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
            "name": "creator",
            "docs": [
              "Who created this vault."
            ],
            "type": "pubkey"
          },
          {
            "name": "data",
            "docs": [
              "Stored data, padded to 256 bytes."
            ],
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "dataLen",
            "docs": [
              "Actual number of meaningful bytes in `data`."
            ],
            "type": "u16"
          },
          {
            "name": "label",
            "docs": [
              "Vault label, padded to 32 bytes."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "labelLen",
            "docs": [
              "Actual byte length of the label."
            ],
            "type": "u8"
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
            "name": "lastModifiedBy",
            "docs": [
              "Last writer's pubkey."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed."
            ],
            "type": "u8"
          },
          {
            "name": "version",
            "docs": [
              "Monotonic write counter for optimistic concurrency."
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "vaultCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "label",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "dataLen",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vaultDeleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "deletedBy",
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
      "name": "vaultRead",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "reader",
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
      "name": "vaultWritten",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "writer",
            "type": "pubkey"
          },
          {
            "name": "dataLen",
            "type": "u16"
          },
          {
            "name": "newVersion",
            "type": "u32"
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
