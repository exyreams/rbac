import { Plus, Search, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import CreateOrganizationModal from "../../components/organizations/CreateOrganizationModal";
import { PublicKey } from "@solana/web3.js";

interface OrgData {
	publicKey: PublicKey;
	name: string;
	admin: PublicKey;
	memberCount: number;
	roleCount: number;
	createdAt: number;
	role: "Admin" | "Member";
}

export default function OrganizationsDashboard() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [orgs, setOrgs] = useState<OrgData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const { program, wallet } = useAnchorProgram();

	const fetchOrgs = async () => {
		if (!program || !wallet) return;

		try {
			setIsLoading(true);
			// 1. Fetch all organizations created by this user
			const adminOrgs = await program.account.organization.all([
				{
					memcmp: {
						offset: 8, // discriminator
						bytes: wallet.publicKey.toBase58(),
					},
				},
			]);

			// 2. Fetch all memberships for this user
			const memberships = await program.account.membership.all([
				{
					memcmp: {
						offset: 8 + 32, // discriminator + organization pubkey
						bytes: wallet.publicKey.toBase58(),
					},
				},
			]);

			// 3. Fetch organizations for those memberships
			const memberOrgsRaw = await Promise.all(
				memberships.map((m) =>
					program.account.organization.fetch(m.account.organization),
				),
			);

			const memberOrgs = memberships.map((m, i) => ({
				publicKey: m.account.organization,
				name: new TextDecoder().decode(Uint8Array.from(memberOrgsRaw[i].name)).replace(/\0/g, ""),
				admin: memberOrgsRaw[i].admin,
				memberCount: memberOrgsRaw[i].memberCount,
				roleCount: memberOrgsRaw[i].roleCount,
				createdAt: memberOrgsRaw[i].createdAt.toNumber() * 1000,
				role: "Member" as const,
			}));

			const formattedAdminOrgs = adminOrgs.map((o) => ({
				publicKey: o.publicKey,
				name: new TextDecoder().decode(Uint8Array.from(o.account.name)).replace(/\0/g, ""),
				admin: o.account.admin,
				memberCount: o.account.memberCount,
				roleCount: o.account.roleCount,
				createdAt: o.account.createdAt.toNumber() * 1000,
				role: "Admin" as const,
			}));

			// Combine and deduplicate (admin orgs take precedence)
			const combined: OrgData[] = [...formattedAdminOrgs];
			for (const mOrg of memberOrgs) {
				if (!combined.some((o) => o.publicKey.equals(mOrg.publicKey))) {
					combined.push(mOrg);
				}
			}

			setOrgs(combined.sort((a, b) => b.createdAt - a.createdAt));
		} catch (err) {
			console.error("Error fetching organizations:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchOrgs();
	}, [program, wallet]);

	const filteredOrgs = useMemo(() => {
		return orgs.filter(
			(org) =>
				org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				org.publicKey.toBase58().toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [orgs, searchTerm]);

	const stats = useMemo(() => {
		return {
			total: orgs.length,
			admin: orgs.filter((o) => o.role === "Admin").length,
			member: orgs.filter((o) => o.role === "Member").length,
		};
	}, [orgs]);

	if (!wallet) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] text-center fade-in">
				<div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-palePeriwinkle mb-6">
					<Plus className="w-8 h-8 opacity-20" />
				</div>
				<h2 className="text-2xl font-sans text-white mb-2">Connect Wallet</h2>
				<p className="text-palePeriwinkle/50 max-w-md">
					Please connect your Solana wallet to manage your organizations and permissions on-chain.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 fade-in">
				<div>
					<h1 className="text-3xl font-sans font-medium text-white mb-2">
						Organizations
					</h1>
					<p className="text-palePeriwinkle/50 text-sm font-mono">
						MANAGE_STRUCTURES.EXE
					</p>
				</div>
				<button
					onClick={() => setIsModalOpen(true)}
					className="px-6 py-3 bg-pearlWhite text-deepIndigo rounded-full font-medium hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(77,143,255,0.2)] flex items-center gap-2 cursor-pointer border-none"
				>
					<Plus className="w-4 h-4" />
					Create New Organization
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in delay-100">
				<div className="glass-card rounded-xl p-4 border-l-2 border-l-palePeriwinkle">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Total Orgs
					</div>
					<div className="text-2xl font-mono text-white">
						{stats.total.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="glass-card rounded-xl p-4 border-l-2 border-l-magentaViolet">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Admin Access
					</div>
					<div className="text-2xl font-mono text-white">
						{stats.admin.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="glass-card rounded-xl p-4 border-l-2 border-l-royalBlue">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Member Only
					</div>
					<div className="text-2xl font-mono text-white">
						{stats.member.toString().padStart(2, "0")}
					</div>
				</div>
			</div>

			<div className="flex flex-col md:flex-row gap-4 mb-8 fade-in delay-200">
				<div className="relative grow">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/30" />
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search by organization name or address..."
						className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-palePeriwinkle/40 transition-colors placeholder:text-palePeriwinkle/20"
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-20">
					<Loader2 className="w-8 h-8 text-palePeriwinkle animate-spin" />
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 fade-in delay-300">
					{filteredOrgs.length > 0 ? (
						filteredOrgs.map((org) => (
							<div
								key={org.publicKey.toBase58()}
								className="glass-card rounded-2xl p-6 flex flex-col group"
							>
								<div className="flex justify-between items-start mb-4">
									<div className="w-10 h-10 rounded-lg bg-royalBlue/30 border border-royalBlue/50 flex items-center justify-center text-palePeriwinkle font-bold">
										{org.name[0]}
									</div>
									<span
										className={`px-2 py-1 rounded border text-[9px] font-mono uppercase tracking-tighter ${
											org.role === "Admin"
												? "bg-palePeriwinkle/10 border-palePeriwinkle/20 text-palePeriwinkle"
												: "bg-white/5 border-white/10 text-palePeriwinkle/40"
										}`}
									>
										{org.role === "Admin" ? "Admin Access" : "Member"}
									</span>
								</div>
								<h3 className="text-lg font-medium text-white mb-1">
									{org.name}
								</h3>
								<p className="text-xs font-mono text-palePeriwinkle/40 mb-6 truncate">
									{org.publicKey.toBase58()}
								</p>

								<div className="grid grid-cols-2 gap-4 mb-8">
									<div>
										<div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase mb-1">
											Members
										</div>
										<div className="text-sm text-white">{org.memberCount}</div>
									</div>
									<div>
										<div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase mb-1">
											Roles
										</div>
										<div className="text-sm text-white">{org.roleCount}</div>
									</div>
								</div>

								<div className="mt-auto flex items-center justify-between">
									<span className="text-[10px] text-palePeriwinkle/30 font-mono">
										CREATED: {new Date(org.createdAt).toLocaleDateString()}
									</span>
									<Link
										to={`/org/${org.publicKey.toBase58()}`}
										className="text-xs font-mono text-palePeriwinkle hover:text-white transition-colors flex items-center gap-1 group/btn"
									>
										MANAGE{" "}
										<span className="group-hover/btn:translate-x-1 transition-transform">
											→
										</span>
									</Link>
								</div>
							</div>
						))
					) : (
						<div className="col-span-full py-20 text-center glass-card rounded-2xl">
							<p className="text-palePeriwinkle/30 font-mono">
								NO_ORGANIZATIONS_FOUND.ERR
							</p>
						</div>
					)}
				</div>
			)}

			<CreateOrganizationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={fetchOrgs}
			/>
		</>
	);
}
