import {
  Loader2,
  Eye,
  Plus,
  Search,
  Trash2,
  Settings,
  X,
  User,
  Shield,
  LayoutGrid,
  List,
  ChevronRight
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const getPermissionColor = (color: string, active: boolean) => {
    const variants: Record<string, string> = {
      green: active ? "bg-green-500/10 border-green-500/40 text-green-400" : "border-white/5 bg-white/2 text-white/20",
      blue: active ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "border-white/5 bg-white/2 text-white/20",
      red: active ? "bg-red-500/10 border-red-500/40 text-red-400" : "border-white/5 bg-white/2 text-white/20",
      indigo: active ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400" : "border-white/5 bg-white/2 text-white/20",
      cyan: active ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-white/5 bg-white/2 text-white/20",
      purple: active ? "bg-purple-500/10 border-purple-500/40 text-purple-400" : "border-white/5 bg-white/2 text-white/20",
      magentaViolet: active ? "bg-magentaViolet-500/10 border-magentaViolet-500/40 text-magentaViolet-400" : "border-white/5 bg-white/2 text-white/20",
      amber: active ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "border-white/5 bg-white/2 text-white/20",
      orange: active ? "bg-orange-500/10 border-orange-500/40 text-orange-400" : "border-white/5 bg-white/2 text-white/20",
    };
    return variants[color] || variants.blue;
  };

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
      setShowCreateModal(false);
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

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 fade-in">
        <div>
          <div className="flex items-center gap-2 text-palePeriwinkle/60 text-[10px] font-mono mb-1 uppercase tracking-[0.2em]">
            Manage Roles & Permissions
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            Organization Roles
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer font-mono text-xs uppercase tracking-widest shadow-2xl"
        >
          <Plus className="w-4 h-4 text-royalBlue" />
          Create New Role
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 fade-in delay-100 items-center">
        <div className="relative grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles by name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-royalBlue/50 transition-all placeholder:text-palePeriwinkle/20"
          />
        </div>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all border-none cursor-pointer ${viewMode === "list" ? "bg-white/10 text-white shadow-lg" : "text-palePeriwinkle/30 hover:text-palePeriwinkle/60 bg-transparent"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all border-none cursor-pointer ${viewMode === "grid" ? "bg-white/10 text-white shadow-lg" : "text-palePeriwinkle/30 hover:text-palePeriwinkle/60 bg-transparent"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-white' : 'space-y-4'} mb-12 fade-in delay-200`}>
        {filteredRoles.map((role) => {
          const name = new TextDecoder()
            .decode(Uint8Array.from(role.account.name))
            .replace(/\0/g, "");
          const perms = BigInt(role.account.permissions.toString());

          if (viewMode === 'grid') {
            return (
              <div
                key={role.publicKey.toBase58()}
                className="stat-card rounded-2xl p-5 border border-white/5 bg-white/2 hover:bg-white/5 transition-all group duration-300 relative"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="p-2.5 bg-royalBlue/10 rounded-xl border border-royalBlue/20 group-hover:border-royalBlue/40 transition-colors">
                    <Shield className="w-5 h-5 text-royalBlue" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(role.publicKey, role.account.isActive);
                      }}
                      className={`relative w-9 h-5 rounded-full transition-all duration-300 border-none cursor-pointer ${role.account.isActive ? "bg-green-500/30 ring-1 ring-green-500/20" : "bg-white/10 ring-1 ring-white/5"}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${role.account.isActive ? "right-1 bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "left-1 bg-white/30"}`} />
                    </button>
                    <button 
                      onClick={() => setEditingRole(role)} 
                      className="p-1.5 rounded-lg bg-white/5 text-palePeriwinkle/40 hover:text-white hover:bg-white/10 border border-white/5 cursor-pointer transition-all translate-y-0.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-[15px] font-mono font-bold text-white uppercase tracking-tight truncate">
                    {name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-palePeriwinkle/60 font-mono tracking-widest uppercase">
                      Slot {role.account.roleIndex.toString().padStart(2, '0')}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className={`text-[8px] font-mono font-bold ${role.account.isActive ? "text-green-400" : "text-red-400"}`}>
                      {role.account.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6 min-h-[40px] content-start">
                  {PERMISSIONS_LIST.map((p) => {
                    if ((perms & p.bit) !== BigInt(0)) {
                      return (
                        <div
                          key={p.id}
                          className={`px-2 py-0.5 rounded-md border text-[8px] font-bold font-mono tracking-tighter ${getPermissionColor(p.color, true)} bg-transparent! opacity-90 transition-opacity whitespace-nowrap`}
                        >
                          {p.label}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-palePeriwinkle/40" />
                    <span className="text-[11px] font-mono font-bold text-white/70">
                      {role.account.referenceCount.toString().padStart(2, "0")}
                    </span>
                  </div>
                  <button
                    onClick={() => fetchMembersForRole(role)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-white/5 text-[9px] font-mono font-bold text-palePeriwinkle/60 hover:text-royalBlue transition-all border-none cursor-pointer uppercase tracking-tight"
                  >
                    View Members <ChevronRight className="w-3 h-3 translate-y-[0.5px]" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={role.publicKey.toBase58()}
              className="stat-card rounded-2xl overflow-hidden border border-white/5 bg-white/2 hover:bg-white/5 transition-all group duration-300"
            >
              <div className="p-6 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-royalBlue/30 transition-colors">
                      <Shield className="w-5 h-5 text-royalBlue" />
                    </div>
                    <div>
                      <h3 className="text-lg font-mono font-bold text-white tracking-tight uppercase">
                        {name}
                      </h3>
                      <p className="text-[10px] text-palePeriwinkle/50 font-mono mt-1">
                        INDEX_{role.account.roleIndex} • {new Date(
                          role.account.createdAt.toNumber() * 1000,
                        ).toLocaleDateString()}
                      </p>
                    </div>
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
                      className={`text-[10px] font-mono uppercase ${role.account.isActive ? "text-green-400" : "text-red-400"}`}
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
                      className={`relative w-9 h-5 rounded-full transition-all duration-300 border-none cursor-pointer ${role.account.isActive ? "bg-green-500/30 ring-1 ring-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "bg-white/10 ring-1 ring-white/5 shadow-inner"}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${role.account.isActive ? "right-1 bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "left-1 bg-white/30"}`} />
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
          <div className="py-20 text-center glass-card rounded-2xl col-span-full">
            <p className="text-palePeriwinkle/20 font-mono text-xs italic">
              NO_ROLES_DEFINED.LOG
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass-panel border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden fade-in animate-scale-up shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                  Create Role
                </h3>
                <p className="text-[10px] text-palePeriwinkle/60 font-mono uppercase tracking-[0.2em] mt-1">
                  Define authority and functional permissions
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-palePeriwinkle/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em] mb-3">
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. SYSTEMS_ADMIN"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-mono text-white focus:outline-none focus:border-royalBlue/50 transition-all placeholder:text-white/10 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em] mb-4">
                  Permission Matrix
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PERMISSIONS_LIST.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => togglePermission(p.id)}
                      className={`group relative border rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all duration-300 ${getPermissionColor(p.color, activeToggles[p.id])} ${activeToggles[p.id] ? 'shadow-lg' : 'hover:bg-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-black tracking-widest transition-colors ${activeToggles[p.id] ? "" : "text-white/40"}`}>
                          {p.label}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeToggles[p.id] ? `bg-current shadow-[0_0_8px_currentColor]` : "bg-white/10"}`} />
                      </div>
                      <span className="text-[8px] font-mono text-palePeriwinkle/60 uppercase group-hover:text-palePeriwinkle/80 transition-colors">
                        {p.category} Permissions
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 border border-white/5 bg-white/2 rounded-xl text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={isCreating || !newRoleName}
                  className="flex-1 py-4 bg-white text-deepIndigo rounded-xl text-[10px] font-mono font-black uppercase tracking-widest hover:bg-pearlWhite disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-2 border-none"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Initialize Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${getPermissionColor(p.color, hasPerm)}`}
                    >
                      <span className={`text-[10px] font-mono font-bold uppercase transition-colors ${hasPerm ? "text-white" : "text-white/40"}`}>
                        {p.label}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full transition-all ${hasPerm ? `bg-current shadow-[0_0_8px_currentColor]` : "bg-white/10"}`}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setEditingRole(null)}
                  className="flex-1 py-3 border border-white/5 bg-white/2 rounded-xl text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel Edit
                </button>
                <button
                  onClick={() =>
                    handleUpdatePermissions(
                      editingRole.publicKey,
                      BigInt(editingRole.account.permissions.toString()),
                    )
                  }
                  className="flex-1 py-3 bg-white text-deepIndigo rounded-xl text-[10px] font-mono font-black uppercase tracking-widest hover:bg-pearlWhite transition-all shadow-xl border-none cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingMembersRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 text-white">
          <div className="glass-panel border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden fade-in animate-scale-up shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">
                  Role Members
                </h3>
                <p className="text-[10px] text-palePeriwinkle/60 font-mono uppercase tracking-[0.2em] mt-1">
                  Active staff assigned to {new TextDecoder().decode(Uint8Array.from(viewingMembersRole.account.name)).replace(/\0/g, "")}
                </p>
              </div>
              <button
                onClick={() => setViewingMembersRole(null)}
                className="p-2 text-palePeriwinkle/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
              {isMemberLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-royalBlue" />
                </div>
              ) : members.length > 0 ? (
                members.map((m) => (
                  <div
                    key={m.publicKey.toBase58()}
                    className="flex items-center justify-between p-4 bg-white/2 rounded-xl border border-white/5 hover:border-royalBlue/30 hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-royalBlue/10 rounded-lg group-hover:bg-royalBlue/20 transition-colors">
                        <User className="w-4 h-4 text-royalBlue" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold block mb-0.5">
                          {m.account.member.toBase58().slice(0, 12)}...{m.account.member.toBase58().slice(-12)}
                        </span>
                        <span className="text-[8px] font-mono text-palePeriwinkle/60 uppercase tracking-widest">
                          Authorized Account
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/org/${id}/members`}
                      className="p-2 rounded-lg bg-white/5 hover:bg-royalBlue hover:text-white text-royalBlue transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                   <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                      <User className="w-6 h-6 text-palePeriwinkle/10" />
                   </div>
                   <p className="text-palePeriwinkle/40 font-mono text-[10px] uppercase tracking-widest italic">
                    NO_MEMBERS_FOUND
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 bg-white/2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setViewingMembersRole(null)}
                className="px-8 py-3 border border-white/5 bg-white/2 rounded-xl text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
