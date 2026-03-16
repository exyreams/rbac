import { useQuery } from "@tanstack/react-query";
import { useAnchorProgram } from "./useAnchorProgram";

export function useOrganizations() {
	const { program, wallet } = useAnchorProgram();

	return useQuery({
		queryKey: ["organizations", wallet?.publicKey.toBase58()],
		queryFn: async () => {
			if (!program || !wallet) return [];

			// 1. Fetch organizations where user is admin
			const adminOrgsRaw = await program.account.organization.all([
				{
					memcmp: {
						offset: 8, // discriminator
						bytes: wallet.publicKey.toBase58(),
					},
				},
			]);

			// 2. Fetch memberships for this user
			const memberships = await program.account.membership.all([
				{
					memcmp: {
						offset: 8 + 32, // member pubkey
						bytes: wallet.publicKey.toBase58(),
					},
				},
			]);

			// 3. Fetch organization details for those memberships
			const memberOrgsRaw = await Promise.all(
				memberships.map((m) =>
					program.account.organization.fetch(m.account.organization),
				),
			);

			const memberOrgsProcessed = memberships.map((m, i) => ({
				publicKey: m.account.organization,
				account: memberOrgsRaw[i],
				role: "Member" as const,
			}));

			const adminOrgsProcessed = adminOrgsRaw.map((o) => ({
				publicKey: o.publicKey,
				account: o.account,
				role: "Admin" as const,
			}));

			// Combine and deduplicate (admin takes precedence)
			const combined: any[] = [...adminOrgsProcessed];
			for (const mOrg of memberOrgsProcessed) {
				if (!combined.some((o) => o.publicKey.equals(mOrg.publicKey))) {
					combined.push(mOrg);
				}
			}

			// Sort by creation date
			return combined.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber());
		},
		enabled: !!program && !!wallet,
	});
}
