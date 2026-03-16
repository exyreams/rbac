import { useQuery } from "@tanstack/react-query";
import { useAnchorProgram } from "./useAnchorProgram";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

export function useOrganization(orgId: string | undefined) {
	const { program } = useAnchorProgram();

	return useQuery({
		queryKey: ["organization", orgId],
		queryFn: async () => {
			if (!program || !orgId) return null;
			const orgPubkey = new PublicKey(orgId);
			return await program.account.organization.fetch(orgPubkey);
		},
		enabled: !!program && !!orgId,
	});
}

export function useOrganizationRoles(orgId: string | undefined) {
	const { program } = useAnchorProgram();

	return useQuery({
		queryKey: ["roles", orgId],
		queryFn: async () => {
			if (!program || !orgId) return [];
			const orgPubkey = new PublicKey(orgId);
			return await program.account.role.all([
				{
					memcmp: {
						offset: 8, // discriminator
						bytes: orgPubkey.toBase58(),
					},
				},
			]);
		},
		enabled: !!program && !!orgId,
	});
}

export function useOrganizationMembers(orgId: string | undefined) {
	const { program } = useAnchorProgram();

	return useQuery({
		queryKey: ["memberships", orgId],
		queryFn: async () => {
			if (!program || !orgId) return [];
			const orgPubkey = new PublicKey(orgId);
			return await program.account.membership.all([
				{
					memcmp: {
						offset: 8, // discriminator
						bytes: orgPubkey.toBase58(),
					},
				},
			]);
		},
		enabled: !!program && !!orgId,
	});
}

export function useUserMembership(orgId: string | undefined) {
	const { program, wallet } = useAnchorProgram();

	return useQuery({
		queryKey: ["user-membership", orgId, wallet?.publicKey.toBase58()],
		queryFn: async () => {
			if (!program || !orgId || !wallet) return null;
			const orgPubkey = new PublicKey(orgId);
			
			// Find the membership PDA address
			const [membershipAddress] = PublicKey.findProgramAddressSync(
				[
					Buffer.from("membership"),
					orgPubkey.toBuffer(),
					wallet.publicKey.toBuffer(),
				],
				program.programId
			);

			try {
				return await program.account.membership.fetch(membershipAddress);
			} catch (e) {
				return null;
			}
		},
		enabled: !!program && !!orgId && !!wallet,
	});
}
export function useVaults(orgId: string | undefined) {
	const { vaultProgram } = useAnchorProgram();

	return useQuery({
		queryKey: ["vaults", orgId],
		queryFn: async () => {
			if (!vaultProgram || !orgId) return [];
			const orgPubkey = new PublicKey(orgId);
			return await vaultProgram.account.vault.all([
				{
					memcmp: {
						offset: 8, // organization pubkey
						bytes: orgPubkey.toBase58(),
					},
				},
			]);
		},
		enabled: !!vaultProgram && !!orgId,
	});
}
export function useOrganizationHistory(orgId: string | undefined) {
	const { program } = useAnchorProgram();

	return useQuery({
		queryKey: ["history", orgId],
		queryFn: async () => {
			if (!program || !orgId) return [];
			const orgPubkey = new PublicKey(orgId);
			const connection = program.provider.connection;

			// Step 1: Fetch Signatures (faster)
			// Using limit 10 for responsiveness
			const signatures = await connection.getSignaturesForAddress(orgPubkey, { 
				limit: 10
			});
			if (signatures.length === 0) return [];

			// Step 2: Parallel Fetch Individual Parsed Transactions
			// Parallel individual calls are often more reliable than batch calls on many RPC providers
			const txs = await Promise.all(
				signatures.map(async (sig) => {
					try {
						return await connection.getParsedTransaction(sig.signature, {
							maxSupportedTransactionVersion: 0,
							commitment: "confirmed"
						});
					} catch (e) {
						console.error(`Error fetching tx ${sig.signature}:`, e);
						return null;
					}
				})
			);

			// Step 3: Map to Activity Objects
			return signatures.map((sig, i) => {
				const tx = txs[i];
				const timestamp = sig.blockTime ? sig.blockTime * 1000 : Date.now();
				const logs = tx?.meta?.logMessages || [];

				let type = "UNKNOWN_OP";
				let label = "BLOCKCHAIN_OP";
				let details = "External program interaction detected on-chain.";
				let actor = "UNKNOWN";

				if (tx) {
					actor = tx.transaction.message.accountKeys[0].pubkey.toBase58();
					const logString = logs.join(" ");

					if (logString.includes("InitializeOrganization")) {
						type = "SYSTEM_INIT";
						label = "ORG_INIT";
						details = "On-chain organization manifest initialized. All system protocols active.";
					} else if (logString.includes("CreateRole")) {
						type = "ROLE_DEFINE";
						label = "ROLE_DEFINE";
						details = "New accessibility tier successfully pushed to the role registry.";
					} else if (logString.includes("AddMember")) {
						type = "MEMSHIP_SYNC";
						label = "MEMBERSHIP_INIT";
						details = "Identity synchronized with organization protocols.";
					} else if (logString.includes("AssignRole")) {
						type = "ROLE_ASSIGN";
						label = "ROLE_ASSIGN";
						details = "Granting specific permissions to a registered identity.";
					} else if (logString.includes("RevokeRole")) {
						type = "ROLE_REVOKE";
						label = "ROLE_REVOKE";
						details = "Removing accessibility permissions from an identity.";
					}

					const programLogLines = logs.filter(l => l.startsWith("Program log: ") && !l.includes("Instruction:"));
					if (programLogLines.length > 0) {
						const lastLog = programLogLines[programLogLines.length - 1].replace("Program log: ", "");
						if (lastLog.length > 10) details = lastLog;
					}
				}

				return {
					id: sig.signature,
					type,
					label,
					timestamp,
					details,
					actor: actor.slice(0, 8) + "..." + actor.slice(-8),
					fullActor: actor,
					signature: sig.signature.slice(0, 8) + "..."+ sig.signature.slice(-8),
					fullSig: sig.signature,
					slot: sig.slot.toLocaleString(),
					fee: tx ? (tx.meta?.fee || 0) / 1e9 + " SOL" : "0.000005 SOL",
					status: sig.confirmationStatus === "finalized" ? "Finalized" : "Confirmed",
					rawLogs: logs
				};
			});
		},
		enabled: !!program && !!orgId,
		staleTime: 1000 * 30, // History is relatively static, but we want it fresh-ish
	});
}
