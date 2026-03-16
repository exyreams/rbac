import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import type { Rbac } from "../anchor/types/rbac";
import type { GuardedVault } from "../anchor/types/guarded_vault";
import rbacIdl from "../anchor/idl/rbac.json";
import vaultIdl from "../anchor/idl/guarded_vault.json";
import { PublicKey } from "@solana/web3.js";

export const RBAC_PROGRAM_ID = new PublicKey("EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb");
export const VAULT_PROGRAM_ID = new PublicKey("HgHvXGBihfmreQvnpm5JLbBLQUvkyWTqo7ryaFnez6uY");

export function useAnchorProgram() {
	const { connection } = useConnection();
	const wallet = useAnchorWallet();

	const provider = useMemo(() => {
		if (!wallet) return null;
		return new AnchorProvider(connection, wallet, {
			preflightCommitment: "confirmed",
		});
	}, [connection, wallet]);

	const program = useMemo(() => {
		if (!provider) return null;
		return new Program<Rbac>(rbacIdl as any, provider);
	}, [provider]);

	const vaultProgram = useMemo(() => {
		if (!provider) return null;
		return new Program<GuardedVault>(vaultIdl as any, provider);
	}, [provider]);

	return {
		program,
		vaultProgram,
		provider,
		wallet,
		connection,
	};
}
