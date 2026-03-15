import {
  Clock,
  RefreshCw,
  Search,
  UserPlus,
  Loader2,
  Trash2,
  LogOut,
  User,
  Shield,
  Calendar,
  Copy,
  ExternalLink,
  X
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
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
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

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

  const MemberDetailModal = ({ member, isOpen, onClose }: { member: any, isOpen: boolean, onClose: () => void }) => {
    if (!member || !isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="absolute inset-0" onClick={onClose} />
        <div className="glass-panel relative w-full max-w-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                Member Intelligence
              </h3>
              <p className="text-[10px] text-palePeriwinkle/60 font-mono uppercase tracking-[0.2em] mt-1">
                Node Identity & Access Audit
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-palePeriwinkle/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer bg-transparent border-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Security Snapshot */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-royalBlue" />
                  <h4 className="text-[10px] font-mono font-black text-palePeriwinkle/60 uppercase tracking-[0.2em]">Security_Snapshot</h4>
                </div>

                <div className="space-y-4 pl-4 border-l border-white/5">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest">Identity_Node</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-royalBlue font-black truncate max-w-[180px]">
                        {member.account.member.toBase58()}
                      </span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(member.account.member.toBase58())}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/20 hover:text-royalBlue border-none bg-transparent cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest">Epoch</span>
                      <span className="text-[11px] font-mono text-white font-black block">#{member.account.permissionsEpoch.toString()}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest">Status</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        <span className="text-[11px] font-mono text-white font-black uppercase">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifecycle Control */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-magentaViolet" />
                  <h4 className="text-[10px] font-mono font-black text-palePeriwinkle/60 uppercase tracking-[0.2em]">Lifecycle_Control</h4>
                </div>
                
                <div className="space-y-4 pl-4 border-l border-white/5">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest">Update_Expiry</span>
                    <input
                      type="date"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] font-mono text-white focus:outline-none focus:border-royalBlue/40 transition-all"
                      onChange={(e) => {
                        const date = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : null;
                        handleUpdateExpiry(member.account.member, date);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateExpiry(member.account.member, null)}
                      className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Perm_Set
                    </button>
                    <button
                      onClick={async () => {
                        if (!program || !wallet || !orgPubkey) return;
                        const membershipData = await program.account.membership.fetch(member.publicKey);
                        const rolesBitmap = BigInt(membershipData.rolesBitmap.toString());
                        const roleAccounts = [];
                        for (let i = 0; i < 64; i++) {
                          if ((rolesBitmap & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
                            const [rPda] = PublicKey.findProgramAddressSync(
                              [new TextEncoder().encode("role"), orgPubkey.toBuffer(), new Uint8Array([i])],
                              program.programId,
                            );
                            roleAccounts.push({ pubkey: rPda, isWritable: false, isSigner: false });
                          }
                        }
                        await program.methods.refreshPermissions().accounts({
                          payer: wallet.publicKey,
                          membership: member.publicKey,
                          organization: orgPubkey,
                        } as any).remainingAccounts(roleAccounts).rpc();
                        fetchData();
                      } }
                      className="py-2.5 bg-royalBlue/10 hover:bg-royalBlue/20 border border-royalBlue/20 rounded-xl text-[9px] font-mono font-black text-royalBlue uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync_Node
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Authority Matrix */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-royalBlue" />
                  <h4 className="text-[10px] font-mono font-black text-palePeriwinkle/60 uppercase tracking-[0.2em]">Authority_Matrix</h4>
                </div>
                <span className="text-[9px] font-mono text-palePeriwinkle/20 uppercase">IDX_{member.account.member.toBase58().slice(-6)}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {roles.map((r) => {
                  const isAssigned = (BigInt(member.account.rolesBitmap.toString()) & (BigInt(1) << BigInt(r.account.roleIndex))) !== BigInt(0);
                  if (!isAssigned) return null;
                  const name = new TextDecoder().decode(Uint8Array.from(r.account.name)).replace(/\0/g, "");
                  return (
                    <div key={r.publicKey.toBase58()} className="group border border-white/5 bg-white/2 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-royalBlue/5 rounded-lg border border-royalBlue/10">
                          <Shield className="w-3.5 h-3.5 text-royalBlue" />
                        </div>
                        <div>
                          <p className="text-[8px] font-mono font-bold text-palePeriwinkle/30 uppercase tracking-widest mb-0.5">SLOT_{r.account.roleIndex.toString().padStart(2, '0')}</p>
                          <h5 className="text-[11px] font-bold text-white uppercase tracking-tight">{name}</h5>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(member.account.member, r.account.roleIndex)}
                        className="p-1.5 text-red-500/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                        title="Revoke_Authority"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {roles.filter(r => (BigInt(member.account.rolesBitmap.toString()) & (BigInt(1) << BigInt(r.account.roleIndex))) !== BigInt(0)).length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-10" />
                    <p className="text-[10px] font-mono uppercase tracking-widest font-black">NO_AUTHORITY_MAPPED</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full py-4 border border-white/5 bg-white/2 rounded-xl text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
              >
                Close_Audit_Log
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 fade-in">
        <div>
          <div className="flex items-center gap-2 text-palePeriwinkle/60 text-[10px] font-mono mb-1 uppercase tracking-[0.2em]">
            Manage Staff & Permissions
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            Organization Members
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isMember && (
            <button
              onClick={handleLeave}
              className="px-6 py-3 bg-red-500/5 border border-red-500/20 text-red-500/80 rounded-xl font-bold hover:bg-red-500/10 transition-all flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              Leave Organization
            </button>
          )}
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-6 py-3 bg-white text-deepIndigo rounded-xl font-bold hover:bg-pearlWhite transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer border-none font-mono text-[10px] uppercase tracking-widest shadow-xl"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
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

      <div className="rounded-2xl overflow-hidden mb-6 border border-white/10 bg-[#0A0F1E]/80 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest">
                  Staff Member
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest">
                  Authority Cipher
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest">
                  Expiry
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest">
                  Onboarded
                </th>
                <th className="p-5 text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest text-right">
                  Manage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMemberships.map((m) => (
                <React.Fragment key={m.publicKey.toBase58()}>
                  <tr
                    onClick={() => setSelectedMember(m)}
                    className={`group cursor-pointer transition-all duration-150 ${selectedMember?.publicKey.toBase58() === m.publicKey.toBase58() ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3 font-mono">
                        <div className="w-8 h-8 rounded-lg bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-royalBlue" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-royalBlue font-black tracking-tight">
                              {m.account.member.toBase58().slice(0, 8)}...{m.account.member.toBase58().slice(-8)}
                            </span>
                            <div className="flex items-center gap-1.5 py-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(m.account.member.toBase58());
                                }}
                                className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <a 
                                href={`https://explorer.solana.com/address/${m.account.member.toBase58()}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          <span className="text-[11px] text-palePeriwinkle/40 uppercase tracking-widest font-bold mt-0.5 whitespace-nowrap">Authorized Tier</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-royalBlue/80 font-bold bg-royalBlue/5 px-2 py-1 rounded border border-royalBlue/10 w-fit">
                        <Shield className="w-3 h-3" />
                        0x{m.account.rolesBitmap
                          .toString(16)
                          .toUpperCase()
                          .padStart(16, "0")}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-palePeriwinkle/60">
                        <Clock className="w-3 h-3 text-palePeriwinkle/30" />
                        {m.account.expiresAt
                          ? new Date(
                              m.account.expiresAt.toNumber() * 1000,
                            ).toLocaleDateString()
                          : "PERMANENT"}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-palePeriwinkle/60">
                        <Calendar className="w-3 h-3 text-palePeriwinkle/30" />
                        {new Date(
                          m.account.createdAt.toNumber() * 1000,
                        ).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-5 text-right w-32">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(m);
                          }}
                          className="px-4 py-2 bg-royalBlue/10 hover:bg-royalBlue/20 border border-royalBlue/20 text-royalBlue rounded-lg text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Manage_Node
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              {filteredMemberships.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <User className="w-8 h-8 text-palePeriwinkle/10" />
                      <p className="text-palePeriwinkle/40 font-mono text-[10px] uppercase tracking-widest italic">
                        NO_MEMBERS_FOUND
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {selectedMember && (
        <MemberDetailModal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
        />
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
