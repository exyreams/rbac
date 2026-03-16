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
					<p className="text-palePeriwinkle/60 text-[10px] font-mono tracking-[0.4em]">
						MANAGE_STRUCTURES.SYS
					</p>
				</div>
				<button
					onClick={() => setIsModalOpen(true)}
					className="px-6 py-3 bg-pearlWhite text-deepIndigo rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2 cursor-pointer border-none"
				>
					<Plus className="w-4 h-4" />
					Create_New_Org
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in delay-100">
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-palePeriwinkle/70">
					<div className="text-[10px] font-mono text-lightLavender/80 tracking-widest uppercase mb-1 font-bold">
						Total Orgs
					</div>
					<div className="text-2xl font-mono text-pearlWhite font-bold">
						{stats.total.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-magentaViolet/70">
					<div className="text-[10px] font-mono text-lightLavender/80 tracking-widest uppercase mb-1 font-bold">
						Admin Access
					</div>
					<div className="text-2xl font-mono text-pearlWhite font-bold">
						{stats.admin.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-royalBlue/70">
					<div className="text-[10px] font-mono text-lightLavender/80 tracking-widest uppercase mb-1 font-bold">
						Member Only
					</div>
					<div className="text-2xl font-mono text-pearlWhite font-bold">
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
								className="glass-card glass-card-no-shift rounded-2xl p-6 flex flex-col group hover:border-royalBlue/30 hover:bg-white/3"
							>
								<div className="flex justify-between items-start mb-4">
									<div className="w-10 h-10 rounded-lg bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center text-royalBlue font-bold font-mono text-lg">
										{org.name[0]}
									</div>
									<span
										className={`px-2 py-1 rounded border text-[9px] font-mono uppercase tracking-widest ${
											org.role === "Admin"
												? "bg-royalBlue/10 border-royalBlue/30 text-royalBlue font-bold"
												: "bg-white/5 border-white/10 text-palePeriwinkle"
										}`}
									>
										{org.role === "Admin" ? "Admin Access" : "Member"}
									</span>
								</div>
								<h3 className="text-lg font-semibold text-pearlWhite mb-1">
									{org.name}
								</h3>
								<p className="text-[10px] font-mono text-palePeriwinkle/70 mb-6 truncate uppercase tracking-tight font-medium">
									ADDR: {org.publicKey.toBase58()}
								</p>

								<div className="grid grid-cols-2 gap-4 mb-8">
									<div>
										<div className="text-[9px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1 font-bold">
											Members
										</div>
										<div className="text-sm text-pearlWhite/90 font-mono font-bold">{org.memberCount}</div>
									</div>
									<div>
										<div className="text-[9px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1 font-bold">
											Roles
										</div>
										<div className="text-sm text-pearlWhite/90 font-mono font-bold">{org.roleCount}</div>
									</div>
								</div>

								<div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
									<span className="text-[9px] text-palePeriwinkle/70 font-mono tracking-wider uppercase font-medium">
										CREATED: {new Date(org.createdAt).toLocaleDateString()}
									</span>
									<Link
										to={`/org/${org.publicKey.toBase58()}`}
										className="text-[10px] font-mono font-bold text-royalBlue hover:text-neonGlow transition-colors flex items-center gap-1 uppercase tracking-widest no-underline group/btn"
									>
										Manage_System{" "}
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
