import { X, Loader2, UserPlus } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-royalBlue/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-royalBlue" />
            </div>
            <h3 className="text-lg font-medium text-white">Assign Role</h3>
          </div>
          <button
            onClick={onClose}
            className="text-palePeriwinkle/40 hover:text-white cursor-pointer bg-transparent border-none"
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

          <div>
            <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-2">
              Select Role
            </label>
            <select
              value={selectedRoleIndex}
              onChange={(e) => setSelectedRoleIndex(parseInt(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm text-white focus:outline-none focus:border-royalBlue/40 transition-colors"
            >
              {roles.map((role) => (
                <option
                  key={role.account.roleIndex}
                  value={role.account.roleIndex}
                  className="bg-deepIndigo"
                >
                  {new TextDecoder()
                    .decode(Uint8Array.from(role.account.name))
                    .replace(/\0/g, "")}{" "}
                  (Index: {role.account.roleIndex})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-mono text-white focus:outline-none focus:border-royalBlue/40 transition-colors placeholder:text-white/10"
            />
            <p className="mt-2 text-[9px] font-mono text-palePeriwinkle/20 uppercase tracking-tighter italic">
              Leave blank for permanent membership
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
              className="flex-1 py-3 border border-white/10 rounded-full text-sm font-medium text-palePeriwinkle hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={isLoading || !memberAddress}
              className="flex-1 py-3 bg-royalBlue text-white rounded-full font-medium hover:bg-royalBlue/80 transition-all shadow-[0_0_20px_rgba(77,143,255,0.2)] flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Assign Role"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
