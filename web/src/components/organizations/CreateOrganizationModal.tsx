import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrganizationModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { program, wallet } = useAnchorProgram();

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !wallet) return;

    setIsLoading(true);
    setError(null);

    try {
      const [orgPda] = PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode("organization"),
          wallet.publicKey.toBytes(),
          new TextEncoder().encode(name),
        ],
        program.programId,
      );

      await program.methods
        .initializeOrganization(name)
        .accounts({
          admin: wallet.publicKey,
          organization: orgPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      onSuccess();
      onClose();
      setName("");
    } catch (err: any) {
      console.error("Failed to create organization:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-deepIndigo/80 backdrop-blur-sm fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-palePeriwinkle/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-sans font-medium text-white mb-2">
          Create Organization
        </h2>
        <p className="text-palePeriwinkle/50 text-sm font-mono mb-8">
          INITIALIZE_NEW_TENANT.EXE
        </p>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nexus Labs DAO"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-palePeriwinkle/40 transition-colors placeholder:text-palePeriwinkle/20"
              required
              maxLength={32}
            />
            <p className="mt-2 text-[10px] text-palePeriwinkle/30 font-mono">
              MAX 32 CHARACTERS. THIS NAME WILL BE PART OF THE PDA SEED.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-4 bg-pearlWhite text-deepIndigo rounded-xl font-medium hover:bg-white transition-all transform active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying to Solana...
              </>
            ) : (
              "Confirm & Initialize"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
