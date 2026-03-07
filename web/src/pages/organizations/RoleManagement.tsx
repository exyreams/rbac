import {
  Loader2,
  Eye,
  PenTool,
  ShieldAlert,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Settings,
  X,
  User,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Permission bits from program constants
// Data permissions (bits 0-5)
const PERM_READ = BigInt(1) << BigInt(0);
const PERM_WRITE = BigInt(1) << BigInt(1);
const PERM_DELETE = BigInt(1) << BigInt(2);
const PERM_EXECUTE = BigInt(1) << BigInt(3);
const PERM_LIST = BigInt(1) << BigInt(4);
const PERM_EXPORT = BigInt(1) << BigInt(5);

// Admin permissions (bits 16-20)
const PERM_CREATE_ROLE = BigInt(1) << BigInt(16);
const PERM_DELETE_ROLE = BigInt(1) << BigInt(17);
const PERM_ASSIGN_MEMBER = BigInt(1) << BigInt(18);
const PERM_REVOKE_MEMBER = BigInt(1) << BigInt(19);
const PERM_UPDATE_CONFIG = BigInt(1) << BigInt(20);

// Super admin (bit 63)
const PERM_SUPER_ADMIN = BigInt(1) << BigInt(63);

const PERMISSIONS_LIST = [
  {
    id: "read",
    label: "READ",
    bit: PERM_READ,
    category: "Data",
    color: "green",
  },
  {
    id: "write",
    label: "WRITE",
    bit: PERM_WRITE,
    category: "Data",
    color: "blue",
  },
  {
    id: "delete",
    label: "DELETE",
    bit: PERM_DELETE,
    category: "Data",
    color: "red",
  },
  {
    id: "execute",
    label: "EXECUTE",
    bit: PERM_EXECUTE,
    category: "Data",
    color: "indigo",
  },
  {
    id: "list",
    label: "LIST",
    bit: PERM_LIST,
    category: "Data",
    color: "cyan",
  },
  {
    id: "export",
    label: "EXPORT",
    bit: PERM_EXPORT,
    category: "Data",
    color: "purple",
  },
  {
    id: "create_role",
    label: "CREATE_ROLE",
    bit: PERM_CREATE_ROLE,
    category: "Admin",
    color: "magentaViolet",
  },
  {
    id: "delete_role",
    label: "DELETE_ROLE",
    bit: PERM_DELETE_ROLE,
    category: "Admin",
    color: "red",
  },
  {
    id: "assign_member",
    label: "ASSIGN_MEMBER",
    bit: PERM_ASSIGN_MEMBER,
    category: "Admin",
    color: "blue",
  },
  {
    id: "revoke_member",
    label: "REVOKE_MEMBER",
    bit: PERM_REVOKE_MEMBER,
    category: "Admin",
    color: "amber",
  },
  {
    id: "update_config",
    label: "UPDATE_CONFIG",
    bit: PERM_UPDATE_CONFIG,
    category: "Admin",
    color: "orange",
  },
  {
    id: "super_admin",
    label: "SUPER_ADMIN",
    bit: PERM_SUPER_ADMIN,
    category: "Super",
    color: "amber",
  },
];

export default function RoleManagement() {
  const { id } = useParams<{ id: string }>();
  const { program, wallet } = useAnchorProgram();
  const [roles, setRoles] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isMemberLoading, setIsMemberLoading] = useState(false);
  const [viewingMembersRole, setViewingMembersRole] = useState<any>(null);

  // Create Role State
  const [newRoleName, setNewRoleName] = useState("");
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>(
    PERMISSIONS_LIST.reduce(
      (acc, p) => ({ ...acc, [p.id]: p.id === "read" }),
      {},
    ),
  );

  const orgPubkey = useMemo(() => {
    try {
      return id ? new PublicKey(id) : null;
    } catch {
      return null;
    }
  }, [id]);

  const fetchData = async () => {
    if (!program || !orgPubkey) return;

    try {
      setIsLoading(true);
      const [orgAccount, allRoles] = await Promise.all([
        program.account.organization.fetch(orgPubkey),
        program.account.role.all([
          {
            memcmp: {
              offset: 8, // discriminator
              bytes: orgPubkey.toBase58(),
            },
          },
        ]),
      ]);

      setOrganization(orgAccount);
      setRoles(
        allRoles.sort((a, b) => a.account.roleIndex - b.account.roleIndex),
      );
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, orgPubkey]);

  const togglePermission = (key: string) => {
    setActiveToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateRole = async () => {
    if (!program || !wallet || !organization || !orgPubkey) return;

    try {
      setIsCreating(true);
      let permissions = BigInt(0);
      PERMISSIONS_LIST.forEach((p) => {
        if (activeToggles[p.id]) permissions |= p.bit;
      });

      const [rolePda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("role"),
          orgPubkey.toBuffer(),
          new Uint8Array([organization.roleCount]),
        ],
        program.programId,
      );

      // Admin doesn't need membership, but non-admins do
      const isAdmin = wallet.publicKey.equals(organization.admin);
      const membershipPda = isAdmin
        ? null
        : PublicKey.findProgramAddressSync(
            [
              new TextEncoder().encode("membership"),
              orgPubkey.toBuffer(),
              wallet.publicKey.toBuffer(),
            ],
            program.programId,
          )[0];

      await program.methods
        .createRole(newRoleName, new anchor.BN(permissions.toString()))
        .accounts({
          authority: wallet.publicKey,
          authorityMembership: membershipPda,
          organization: orgPubkey,
          role: rolePda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      setNewRoleName("");
      fetchData();
    } catch (err) {
      console.error("Failed to create role:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseRole = async (rolePda: PublicKey) => {
    if (!program || !wallet || !orgPubkey) return;
    if (
      !confirm(
        "Are you sure you want to close this role? This is irreversible.",
      )
    )
      return;
    try {
      await program.methods
        .closeRole()
        .accounts({
          admin: wallet.publicKey,
          organization: orgPubkey,
          role: rolePda,
        } as any)
        .rpc();
      fetchData();
    } catch (err) {
      console.error("Failed to close role:", err);
    }
  };

  const handleToggleActive = async (rolePda: PublicKey, isActive: boolean) => {
    if (!program || !wallet || !orgPubkey) return;
    try {
      if (isActive) {
        await program.methods
          .deactivateRole()
          .accounts({
            admin: wallet.publicKey,
            organization: orgPubkey,
            role: rolePda,
          } as any)
          .rpc();
      } else {
        await program.methods
          .reactivateRole()
          .accounts({
            admin: wallet.publicKey,
            organization: orgPubkey,
            role: rolePda,
          } as any)
          .rpc();
      }
      fetchData();
    } catch (err) {
      console.error("Failed to toggle role status:", err);
    }
  };

  const handleUpdatePermissions = async (
    rolePda: PublicKey,
    permissions: bigint,
  ) => {
    if (!program || !wallet || !orgPubkey) return;
    try {
      await program.methods
        .updateRolePermissions(new anchor.BN(permissions.toString()))
        .accounts({
          admin: wallet.publicKey,
          organization: orgPubkey,
          role: rolePda,
        } as any)
        .rpc();
      setEditingRole(null);
      fetchData();
    } catch (err) {
      console.error("Failed to update permissions:", err);
    }
  };

  const fetchMembersForRole = async (role: any) => {
    if (!program || !orgPubkey) return;
    try {
      setIsMemberLoading(true);
      setViewingMembersRole(role);
      const allMemberships = await program.account.membership.all([
        {
          memcmp: {
            offset: 8,
            bytes: orgPubkey.toBase58(),
          },
        },
      ]);
      const filtered = allMemberships.filter(
        (m) =>
          (BigInt(m.account.rolesBitmap.toString()) &
            (BigInt(1) << BigInt(role.account.roleIndex))) !==
          BigInt(0),
      );
      setMembers(filtered);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setIsMemberLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const name = new TextDecoder()
        .decode(Uint8Array.from(r.account.name))
        .replace(/\0/g, "");
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [roles, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-palePeriwinkle" />
      </div>
    );
  }

  const orgName = organization
    ? new TextDecoder()
        .decode(Uint8Array.from(organization.name))
        .replace(/\0/g, "")
    : "Nexus Labs DAO";

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 fade-in">
        <div>
          <div className="flex items-center gap-3 text-palePeriwinkle/40 text-xs font-mono mb-2">
            <Link
              to="/organizations"
              className="hover:text-palePeriwinkle flex items-center gap-1 transition-colors cursor-pointer no-underline uppercase"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                ></path>
              </svg>
              ORGANIZATIONS
            </Link>
            <span>/</span>
            <Link
              to={`/org/${id}`}
              className="text-palePeriwinkle/60 no-underline hover:text-white uppercase transition-colors"
            >
              {orgName}
            </Link>
          </div>
          <h1 className="text-3xl font-sans font-medium text-white">
            Role Management
          </h1>
        </div>
        <button
          onClick={() => {
            const el = document.getElementById("create-role-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="px-6 py-3 bg-pearlWhite text-deepIndigo rounded-full font-medium hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(77,143,255,0.2)] flex items-center gap-2 cursor-pointer border-none font-mono text-xs"
        >
          <Plus className="w-4 h-4" />
          NEW_ROLE
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 fade-in delay-100">
        <div className="relative grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles by name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-palePeriwinkle/40 transition-colors placeholder:text-palePeriwinkle/20"
          />
        </div>
      </div>

      <div className="space-y-4 mb-12 fade-in delay-200">
        {filteredRoles.map((role) => {
          const name = new TextDecoder()
            .decode(Uint8Array.from(role.account.name))
            .replace(/\0/g, "");
          const perms = BigInt(role.account.permissions.toString());
          const hasRead = (perms & PERM_READ) !== BigInt(0);
          const hasWrite = (perms & PERM_WRITE) !== BigInt(0);
          const hasDelete = (perms & PERM_DELETE) !== BigInt(0);
          const hasAdmin = (perms & PERM_SUPER_ADMIN) !== BigInt(0);

          return (
            <div
              key={role.publicKey.toBase58()}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <div className="p-6 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-lg font-mono font-bold text-white tracking-tight uppercase">
                      {name}
                    </h3>
                    <p className="text-[10px] text-palePeriwinkle/30 font-mono mt-1">
                      INDEX: {role.account.roleIndex} | CREATED:{" "}
                      {new Date(
                        role.account.createdAt.toNumber() * 1000,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PERMISSIONS_LIST.map((p) => {
                      if ((perms & p.bit) !== BigInt(0)) {
                        return (
                          <span
                            key={p.id}
                            className={`px-2 py-0.5 rounded bg-${p.color}-500/10 border border-${p.color}-500/20 text-[9px] font-mono text-${p.color}-400 font-bold`}
                          >
                            {p.label}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="text-center">
                    <div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase">
                      Members
                    </div>
                    <div className="text-sm font-mono text-white">
                      {role.account.referenceCount.toString().padStart(2, "0")}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full ${role.account.isActive ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10"}`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full ${role.account.isActive ? "bg-green-400" : "bg-red-400"}`}
                    ></span>
                    <span
                      className={`text-[10px] font-mono uppercase ${role.account.isActive ? "text-green-400/80" : "text-red-400/80"}`}
                    >
                      {role.account.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 border-l border-white/5 pl-8">
                    <button
                      onClick={() => fetchMembersForRole(role)}
                      className="p-2 text-palePeriwinkle/30 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingRole(role)}
                      className="p-2 text-palePeriwinkle/30 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleToggleActive(
                          role.publicKey,
                          role.account.isActive,
                        )
                      }
                      className={`p-2 transition-colors cursor-pointer border-none bg-transparent ${role.account.isActive ? "text-amber-500/40 hover:text-amber-400" : "text-green-500/40 hover:text-green-400"}`}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${!role.account.isActive ? "animate-pulse" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => handleCloseRole(role.publicKey)}
                      className="p-2 text-red-500/40 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRoles.length === 0 && (
          <div className="py-20 text-center glass-card rounded-2xl">
            <p className="text-palePeriwinkle/20 font-mono text-xs italic">
              NO_ROLES_DEFINED.LOG
            </p>
          </div>
        )}
      </div>

      <div
        id="create-role-section"
        className="glass-panel border border-magentaViolet/30 rounded-3xl p-8 mb-20 fade-in delay-300"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-medium text-white mb-1">
              Create New Role
            </h2>
            <p className="text-xs text-palePeriwinkle/40 font-mono uppercase tracking-widest">
              GENERATE_ROLE_DEFINITION.EXE
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-2">
                Role Designation
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. TREASURER"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-mono text-white focus:outline-none focus:border-palePeriwinkle/40 transition-colors placeholder:text-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-4">
              Permission Grid Configuration
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 text-center">
              {PERMISSIONS_LIST.map((p) => (
                <div
                  key={p.id}
                  onClick={() => togglePermission(p.id)}
                  className={`border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${activeToggles[p.id] ? `bg-${p.color}-500/10 border-${p.color}-500/40 shadow-[0_0_15px_rgba(0,0,0,0.1)]` : "border-white/10 hover:bg-white/5"}`}
                >
                  <span
                    className={`text-[9px] font-mono font-bold tracking-widest ${activeToggles[p.id] ? "text-white" : "text-white/20"}`}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end gap-4">
          <button
            onClick={() => {
              setNewRoleName("");
              setActiveToggles({
                read: true,
                write: false,
                delete: false,
                admin: false,
              });
            }}
            className="px-8 py-3 border border-white/10 rounded-full text-sm font-medium text-palePeriwinkle hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
          >
            Reset
          </button>
          <button
            onClick={handleCreateRole}
            disabled={isCreating || !newRoleName}
            className="px-8 py-3 bg-magentaViolet text-white rounded-full font-medium hover:bg-magentaViolet/80 transition-all shadow-[0_0_20px_rgba(77,143,255,0.2)] cursor-pointer border-none flex items-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Deploy Role
          </button>
        </div>
      </div>

      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden fade-in animate-scale-up">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                Edit Permissions:{" "}
                {new TextDecoder()
                  .decode(Uint8Array.from(editingRole.account.name))
                  .replace(/\0/g, "")}
              </h3>
              <button
                onClick={() => setEditingRole(null)}
                className="text-palePeriwinkle/40 hover:text-white cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {PERMISSIONS_LIST.map((p) => {
                  const hasPerm =
                    (BigInt(editingRole.account.permissions.toString()) &
                      p.bit) !==
                    BigInt(0);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        const newPerms = hasPerm
                          ? BigInt(editingRole.account.permissions.toString()) &
                            ~p.bit
                          : BigInt(editingRole.account.permissions.toString()) |
                            p.bit;
                        setEditingRole({
                          ...editingRole,
                          account: {
                            ...editingRole.account,
                            permissions: new anchor.BN(newPerms.toString()),
                          },
                        });
                      }}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${hasPerm ? `bg-${p.color}-500/10 border-${p.color}-500/40` : "border-white/5 bg-white/2 hover:bg-white/5"}`}
                    >
                      <span className="text-[10px] font-mono font-bold uppercase text-white">
                        {p.label}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${hasPerm ? `bg-${p.color}-400` : "bg-white/10"}`}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setEditingRole(null)}
                  className="flex-1 py-3 border border-white/10 rounded-full text-sm font-medium text-palePeriwinkle hover:bg-white/5 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleUpdatePermissions(
                      editingRole.publicKey,
                      BigInt(editingRole.account.permissions.toString()),
                    )
                  }
                  className="flex-1 py-3 bg-magentaViolet text-white rounded-full font-medium hover:bg-magentaViolet/80 transition-all border-none cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingMembersRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="glass-panel border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden fade-in animate-scale-up">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Members with Role:{" "}
                {new TextDecoder()
                  .decode(Uint8Array.from(viewingMembersRole.account.name))
                  .replace(/\0/g, "")}
              </h3>
              <button
                onClick={() => setViewingMembersRole(null)}
                className="text-palePeriwinkle/40 hover:text-white cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {isMemberLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-palePeriwinkle" />
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.publicKey.toBase58()}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-palePeriwinkle/40" />
                        <span className="font-mono text-xs">
                          {m.account.member.toBase58().slice(0, 12)}...
                          {m.account.member.toBase58().slice(-8)}
                        </span>
                      </div>
                      <Link
                        to={`/org/${id}/members`}
                        className="text-[10px] font-mono text-magentaViolet hover:underline"
                      >
                        VIEW_MEMBERS
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-10 text-palePeriwinkle/20 font-mono text-xs italic">
                  NO_MEMBERS_ASSIGNED.LOG
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
