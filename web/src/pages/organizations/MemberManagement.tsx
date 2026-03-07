import {
  ChevronRight,
  Clock,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Loader2,
  Trash2,
  X,
  LogOut,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { AssignRoleModal } from "../../components/organizations/AssignRoleModal";

export default function MemberManagement() {
  const { id } = useParams<{ id: string }>();
  const { program, wallet } = useAnchorProgram();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

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
      const [orgAccount, allMemberships, allRoles] = await Promise.all([
        program.account.organization.fetch(orgPubkey),
        program.account.membership.all([
          {
            memcmp: {
              offset: 8, // discriminator
              bytes: orgPubkey.toBase58(),
            },
          },
        ]),
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
      setMemberships(allMemberships);
      setRoles(allRoles);
    } catch (err) {
      console.error("Error fetching memberships:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, orgPubkey]);

  const handleRevoke = async (memberPubkey: PublicKey, roleIndex: number) => {
    if (!program || !wallet || !orgPubkey) return;
    try {
      const [membershipPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("membership"),
          orgPubkey.toBuffer(),
          memberPubkey.toBuffer(),
        ],
        program.programId,
      );

      const rolePda = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("role"),
          orgPubkey.toBuffer(),
          new Uint8Array([roleIndex]),
        ],
        program.programId,
      )[0];

      const membershipData =
        await program.account.membership.fetch(membershipPda);
      const currentBitmap = BigInt(membershipData.rolesBitmap.toString());
      const newBitmap = currentBitmap & ~(BigInt(1) << BigInt(roleIndex));

      // Build remaining_accounts for other roles (excluding the one being revoked)
      const remainingAccounts = [];
      for (let i = 0; i < 64; i++) {
        if (
          i !== roleIndex &&
          (newBitmap & (BigInt(1) << BigInt(i))) !== BigInt(0)
        ) {
          const [rPda] = PublicKey.findProgramAddressSync(
            [
              new TextEncoder().encode("role"),
              orgPubkey.toBuffer(),
              new Uint8Array([i]),
            ],
            program.programId,
          );
          remainingAccounts.push({
            pubkey: rPda,
            isWritable: false,
            isSigner: false,
          });
        }
      }

      await program.methods
        .revokeRole(roleIndex)
        .accounts({
          authority: wallet.publicKey,
          organization: orgPubkey,
          membership: membershipPda,
          role: rolePda,
        } as any)
        .remainingAccounts(remainingAccounts)
        .rpc();

      fetchData();
    } catch (err) {
      console.error("Failed to revoke role:", err);
    }
  };

  const handleUpdateExpiry = async (
    memberPubkey: PublicKey,
    newExpiry: number | null,
  ) => {
    if (!program || !wallet || !orgPubkey) return;
    try {
      const [membershipPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("membership"),
          orgPubkey.toBuffer(),
          memberPubkey.toBuffer(),
        ],
        program.programId,
      );

      await program.methods
        .updateMembershipExpiry(newExpiry ? new anchor.BN(newExpiry) : null)
        .accounts({
          admin: wallet.publicKey,
          organization: orgPubkey,
          membership: membershipPda,
        } as any)
        .rpc();

      fetchData();
    } catch (err) {
      console.error("Failed to update expiry:", err);
    }
  };

  const handleLeave = async () => {
    if (!program || !wallet || !orgPubkey) return;
    if (!confirm("Are you sure you want to leave this organization?")) return;
    try {
      const [membershipPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("membership"),
          orgPubkey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        program.programId,
      );

      await program.methods
        .leaveOrganization()
        .accounts({
          member: wallet.publicKey,
          organization: orgPubkey,
          membership: membershipPda,
        } as any)
        .rpc();

      alert("You have left the organization.");
      fetchData();
    } catch (err) {
      console.error("Failed to leave organization:", err);
    }
  };

  const isMember = useMemo(() => {
    return memberships.some((m) =>
      m.account.member.equals(wallet?.publicKey || PublicKey.default),
    );
  }, [memberships, wallet]);

  const filteredMemberships = useMemo(() => {
    return memberships.filter((m) =>
      m.account.member
        .toBase58()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }, [memberships, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-palePeriwinkle animate-spin" />
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
              <ChevronRight className="w-3 h-3 rotate-180" />
              ORGANIZATIONS
            </Link>
            <span>/</span>
            <Link
              to={`/org/${id}`}
              className="text-palePeriwinkle/60 no-underline hover:text-white transition-colors uppercase"
            >
              {orgName}
            </Link>
          </div>
          <h1 className="text-3xl font-sans font-medium text-white">
            Member Management
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-6 py-3 bg-pearlWhite text-deepIndigo rounded-full font-medium hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(77,143,255,0.2)] flex items-center gap-2 cursor-pointer border-none font-mono text-xs"
          >
            <UserPlus className="w-4 h-4" />
            ADD_MEMBER
          </button>
          {isMember && (
            <button
              onClick={handleLeave}
              className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full font-medium hover:bg-red-500/20 transition-all flex items-center gap-2 cursor-pointer font-mono text-xs"
            >
              <LogOut className="w-4 h-4" />
              LEAVE_ORG
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-8 fade-in delay-100">
        <div className="relative grow min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by wallet address..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-palePeriwinkle/40 transition-colors placeholder:text-palePeriwinkle/20 font-mono"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden mb-6 fade-in shadow-xl delay-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/40 uppercase tracking-widest">
                  Wallet
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/40 uppercase tracking-widest">
                  Roles Bitmap
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/40 uppercase tracking-widest">
                  Expiry Date
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/40 uppercase tracking-widest">
                  Join Date
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/40 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.map((m) => (
                <tr
                  key={m.publicKey.toBase58()}
                  className="table-row-hover border-b border-white/5 transition-colors group"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-2 font-mono text-sm text-white/90">
                      {m.account.member.toBase58().slice(0, 12)}...
                      {m.account.member.toBase58().slice(-8)}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1.5 font-mono text-[10px] text-palePeriwinkle/60">
                      0x
                      {m.account.rolesBitmap
                        .toString(16)
                        .toUpperCase()
                        .padStart(16, "0")}
                    </div>
                  </td>
                  <td className="p-5 font-mono text-[11px] text-palePeriwinkle/60">
                    {m.account.expiresAt
                      ? new Date(
                          m.account.expiresAt.toNumber() * 1000,
                        ).toLocaleDateString()
                      : "PERMANENT"}
                  </td>
                  <td className="p-5 font-mono text-[11px] text-palePeriwinkle/60">
                    {new Date(
                      m.account.createdAt.toNumber() * 1000,
                    ).toLocaleDateString()}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedMember(m)}
                        className="p-2 text-palePeriwinkle/30 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer bg-transparent border-none"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMemberships.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <p className="text-palePeriwinkle/20 font-mono text-xs italic">
                      NO_MEMBERS_FOUND.LOG
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
        <div className="glass-card rounded-2xl border-l-2 border-l-magentaViolet overflow-hidden fade-in shadow-2xl mt-10">
          <div className="p-6 bg-white/2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-magentaViolet" />
              </div>
              <div>
                <h4 className="text-sm font-mono font-bold text-white uppercase">
                  MEMBER_ANALYSIS:{" "}
                  {selectedMember.account.member.toBase58().slice(0, 8)}...
                </h4>
                <p className="text-[10px] text-palePeriwinkle/30 font-mono uppercase tracking-widest mt-0.5">
                  CACHE_EPOCH:{" "}
                  {selectedMember.account.permissionsEpoch.toString()} | EXPIRY:{" "}
                  {selectedMember.account.expiresAt
                    ? new Date(
                        selectedMember.account.expiresAt.toNumber() * 1000,
                      ).toLocaleDateString()
                    : "PERMANENT"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMember(null)}
              className="text-palePeriwinkle/40 hover:text-white cursor-pointer bg-transparent border-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-4">
                Active Roles (Bitmap Indicies)
              </label>
              <div className="flex flex-wrap gap-4">
                {roles.map((r) => {
                  const isAssigned =
                    (BigInt(selectedMember.account.rolesBitmap.toString()) &
                      (BigInt(1) << BigInt(r.account.roleIndex))) !==
                    BigInt(0);
                  if (!isAssigned) return null;
                  return (
                    <div
                      key={r.publicKey.toBase58()}
                      className="border border-white/10 bg-white/5 rounded-xl p-4 flex items-center justify-between gap-6 min-w-[200px]"
                    >
                      <div>
                        <span className="text-[9px] font-mono font-bold text-palePeriwinkle/30 uppercase">
                          Role Index {r.account.roleIndex}
                        </span>
                        <div className="text-sm font-mono font-bold text-white uppercase">
                          {new TextDecoder()
                            .decode(Uint8Array.from(r.account.name))
                            .replace(/\0/g, "")}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleRevoke(
                            selectedMember.account.member,
                            r.account.roleIndex,
                          )
                        }
                        className="p-2 text-red-500/40 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-10 p-4 rounded-xl bg-white/5 border border-white/10">
              <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-2">
                Manage Expiry
              </label>
              <div className="flex gap-4">
                <input
                  type="date"
                  className="bg-deepIndigo border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-white"
                  onChange={(e) => {
                    const date = e.target.value
                      ? Math.floor(new Date(e.target.value).getTime() / 1000)
                      : null;
                    handleUpdateExpiry(selectedMember.account.member, date);
                  }}
                />
                <button
                  onClick={() =>
                    handleUpdateExpiry(selectedMember.account.member, null)
                  }
                  className="text-[10px] font-mono text-palePeriwinkle/40 hover:text-white cursor-pointer bg-transparent border-none"
                >
                  SET_PERMANENT
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-white/5 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-magentaViolet animate-pulse"></div>
                <div className="font-mono text-[10px] text-palePeriwinkle/40 uppercase">
                  Global Epoch:{" "}
                  <span className="text-white">
                    {organization?.permissionsEpoch.toString()}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!program || !wallet || !orgPubkey) return;
                  const membershipData = await program.account.membership.fetch(
                    selectedMember.publicKey,
                  );
                  const rolesBitmap = BigInt(
                    membershipData.rolesBitmap.toString(),
                  );

                  const roleAccounts = [];
                  for (let i = 0; i < 64; i++) {
                    if (
                      (rolesBitmap & (BigInt(1) << BigInt(i))) !==
                      BigInt(0)
                    ) {
                      const [rPda] = PublicKey.findProgramAddressSync(
                        [
                          new TextEncoder().encode("role"),
                          orgPubkey.toBuffer(),
                          new Uint8Array([i]),
                        ],
                        program.programId,
                      );
                      roleAccounts.push({
                        pubkey: rPda,
                        isWritable: false,
                        isSigner: false,
                      });
                    }
                  }

                  await program.methods
                    .refreshPermissions()
                    .accounts({
                      payer: wallet.publicKey,
                      membership: selectedMember.publicKey,
                      organization: orgPubkey,
                    } as any)
                    .remainingAccounts(roleAccounts)
                    .rpc();
                  fetchData();
                }}
                className="px-6 py-2.5 bg-magentaViolet text-white rounded-full text-xs font-bold hover:bg-magentaViolet/80 transition-all flex items-center gap-2 cursor-pointer border-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {orgPubkey && organization && (
        <AssignRoleModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={fetchData}
          orgPubkey={orgPubkey}
          organization={organization}
          roles={roles}
        />
      )}
    </>
  );
}
