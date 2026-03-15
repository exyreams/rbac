import { X, Loader2, UserPlus, Shield, ChevronDown, Search, Calendar } from "lucide-react";
import { useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import * as anchor from "@coral-xyz/anchor";

interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgPubkey: PublicKey;
  organization: any;
  roles: any[];
}

export function AssignRoleModal({
  isOpen,
  onClose,
  onSuccess,
  orgPubkey,
  organization,
  roles,
}: AssignRoleModalProps) {
  const { program, wallet } = useAnchorProgram();
  const [memberAddress, setMemberAddress] = useState("");
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredRoles = roles.filter(role => 
    new TextDecoder().decode(Uint8Array.from(role.account.name))
      .toLowerCase()
      .includes(roleSearchTerm.toLowerCase())
  );

  const selectedRole = roles.find(r => r.account.roleIndex === selectedRoleIndex);
  const selectedRoleName = selectedRole 
    ? new TextDecoder().decode(Uint8Array.from(selectedRole.account.name)).replace(/\0/g, "")
    : "Select Authority Level";

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!program || !wallet || !organization) return;
    try {
      setIsLoading(true);
      setError(null);

      const memberPubkey = new PublicKey(memberAddress);

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
          new Uint8Array([selectedRoleIndex]),
        ],
        program.programId,
      )[0];

      // Check if current user is admin
      const isAdmin = wallet.publicKey.equals(organization.admin);
      const authorityMembershipPda = isAdmin
        ? null
        : PublicKey.findProgramAddressSync(
            [
              new TextEncoder().encode("membership"),
              orgPubkey.toBuffer(),
              wallet.publicKey.toBuffer(),
            ],
            program.programId,
          )[0];

      const expiresAt = expiryDate
        ? new anchor.BN(Math.floor(new Date(expiryDate).getTime() / 1000))
        : null;

      await program.methods
        .assignRole(selectedRoleIndex, expiresAt)
        .accounts({
          authority: wallet.publicKey,
          authorityMembership: authorityMembershipPda,
          organization: orgPubkey,
          member: memberPubkey,
          membership: membershipPda,
          role: rolePda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to assign role:", err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel border border-white/10 w-full max-w-md rounded-3xl overflow-hidden fade-in animate-scale-up">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center shadow-lg">
              <UserPlus className="w-6 h-6 text-royalBlue" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Assign Authority</h3>
              <p className="text-[10px] text-palePeriwinkle/60 font-mono uppercase tracking-[0.2em] mt-1">Deploy on-chain permission node</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-palePeriwinkle/40 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer bg-transparent border-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-2">
              Member Wallet Address
            </label>
            <input
              type="text"
              value={memberAddress}
              onChange={(e) => setMemberAddress(e.target.value)}
              placeholder="Paste Solana address..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-mono text-white focus:outline-none focus:border-royalBlue/40 transition-colors placeholder:text-white/10"
            />
          </div>

          <div className="relative">
            <label className="block text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em] mb-4">
              Authority Tier
            </label>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white flex items-center justify-between cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-royalBlue" />
                <span className="font-bold tracking-widest uppercase text-xs">{selectedRoleName}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-palePeriwinkle/30 group-hover:text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-[#0A0D14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden fade-in animate-scale-up backdrop-blur-xl">
                <div className="p-3 border-b border-white/5 bg-white/2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-palePeriwinkle/30" />
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Search Tiers..."
                      value={roleSearchTerm}
                      onChange={(e) => setRoleSearchTerm(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-[10px] font-mono text-white focus:outline-none focus:border-royalBlue/30 transition-all placeholder:text-palePeriwinkle/20"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-2">
                  {filteredRoles.map((role) => {
                    const name = new TextDecoder().decode(Uint8Array.from(role.account.name)).replace(/\0/g, "");
                    const isSelected = selectedRoleIndex === role.account.roleIndex;
                    return (
                      <div
                        key={role.account.roleIndex}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoleIndex(role.account.roleIndex);
                          setIsDropdownOpen(false);
                          setRoleSearchTerm("");
                        }}
                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-royalBlue/20 border border-royalBlue/20' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg border transition-colors ${isSelected ? 'bg-royalBlue/20 border-royalBlue/30' : 'bg-white/5 border-white/10 group-hover:border-royalBlue/20'}`}>
                            <Shield className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-royalBlue'}`} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-tight">{name}</p>
                            <p className="text-[8px] font-mono text-palePeriwinkle/40 mt-1 uppercase">SLOT {role.account.roleIndex.toString().padStart(2, '0')}</p>
                          </div>
                        </div>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-royalBlue shadow-[0_0_8px_rgba(77,143,255,0.8)]" />}
                      </div>
                    );
                  })}
                  {filteredRoles.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-[10px] font-mono text-palePeriwinkle/20 uppercase italic">No matches found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em] mb-4">
              Authority Lifespan
            </label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/20 group-hover:text-royalBlue transition-colors" />
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm font-mono text-white focus:outline-none focus:border-royalBlue/40 transition-all placeholder:text-white/10"
              />
            </div>
            <p className="mt-3 text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest italic">
              Leave empty for permanent authority
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-mono text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white/2 border border-white/5 rounded-2xl text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={isLoading || !memberAddress}
              className="flex-1 py-4 bg-white text-deepIndigo rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest hover:bg-pearlWhite transition-all shadow-xl flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Assign Tier
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
