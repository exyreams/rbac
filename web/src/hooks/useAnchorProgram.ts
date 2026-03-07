import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import type { Rbac } from "../anchor/types/rbac";
import idl from "../anchor/idl/rbac.json";
import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("EBPengHRgFJB2SLWscZD8yarTXLC6oJ5BdQSjK5V5wDb");

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
		return new Program<Rbac>(idl as any, provider);
	}, [provider]);

	return {
		program,
		provider,
		wallet,
		connection,
	};
}
