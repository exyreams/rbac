import { Plus, Search, Loader2, LayoutGrid, List as ListIcon, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAnchorProgram } from "../hooks/useAnchorProgram";
import { useOrganizations } from "../hooks/useOrganizations";
import CreateOrganizationModal from "../components/organizations/CreateOrganizationModal";


export default function Dashboard() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
	const { wallet } = useAnchorProgram();
	const { data: orgsRaw, isLoading, refetch } = useOrganizations();

	const orgs = useMemo(() => {
		if (!orgsRaw) return [];
		return orgsRaw.map((o: any) => ({
			publicKey: o.publicKey,
			name: new TextDecoder().decode(Uint8Array.from(o.account.name)).replace(/\0/g, ""),
			admin: o.account.admin,
			memberCount: o.account.memberCount,
			roleCount: o.account.roleCount,
			createdAt: o.account.createdAt.toNumber() * 1000,
			role: o.role,
		}));
	}, [orgsRaw]);

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
			totalRoles: orgs.reduce((acc, org) => acc + org.roleCount, 0)
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
					<div className="flex items-center gap-3 text-palePeriwinkle text-xs font-mono mb-2">
						<span className="uppercase opacity-70">SYSTEM</span>
						<span className="opacity-30">/</span>
						<span className="text-pearlWhite uppercase font-bold tracking-widest">
							Dashboard
						</span>
					</div>
					<h1 className="text-3xl font-sans font-bold text-pearlWhite tracking-tight mb-2">
						System Console
					</h1>
					<p className="text-palePeriwinkle/60 text-[10px] font-mono tracking-[0.4em]">
						MASTER_CONTROL_INTERFACE.FXF
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

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 fade-in delay-100">
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-palePeriwinkle/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
					<div className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-1">
						Total Orgs
					</div>
					<div className="text-2xl font-mono text-pearlWhite font-bold">
						{stats.total.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-magentaViolet/50">
					<div className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-1">
						Active Roles
					</div>
					<div className="text-2xl font-mono text-pearlWhite font-bold">
						{stats.totalRoles.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-neonGlow/50">
					<div className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-1">
						Admin Access
					</div>
					<div className="text-2xl font-mono text-pearlWhite font-bold">
						{stats.admin.toString().padStart(2, "0")}
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-green-500/50">
					<div className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-1">
						System Status
					</div>
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
						<div className="text-sm font-mono font-bold text-green-400 tracking-widest">NOMINAL</div>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between mb-8 fade-in delay-200">
				<div className="relative grow max-w-xl">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/30" />
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search by organization name or address..."
						className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-royalBlue/40 transition-colors placeholder:text-palePeriwinkle/20"
					/>
				</div>
				<div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
					<button 
						onClick={() => setViewMode('list')}
						className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-royalBlue text-white shadow-lg shadow-royalBlue/20' : 'text-palePeriwinkle/40 hover:text-palePeriwinkle'}`}
						title="List View"
					>
						<ListIcon className="w-4 h-4" />
					</button>
					<button 
						onClick={() => setViewMode('grid')}
						className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-royalBlue text-white shadow-lg shadow-royalBlue/20' : 'text-palePeriwinkle/40 hover:text-palePeriwinkle'}`}
						title="Grid View"
					>
						<LayoutGrid className="w-4 h-4" />
					</button>
				</div>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-20">
					<Loader2 className="w-8 h-8 text-palePeriwinkle animate-spin" />
				</div>
			) : (
				<div className={`grid gap-6 mb-20 fade-in delay-300 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
					{filteredOrgs.length > 0 ? (
						filteredOrgs.map((org) => (
							<div
								key={org.publicKey.toBase58()}
								className={`stat-card rounded-2xl p-6 flex transition-all group hover:border-royalBlue/30 hover:bg-white/5 ${viewMode === 'list' ? 'flex-col md:flex-row md:items-center justify-between gap-6' : 'flex-col gap-6'}`}
							>
								<div className={`flex gap-6 ${viewMode === 'list' ? 'items-center grow' : 'flex-col'}`}>
									<div className="w-12 h-12 rounded-xl bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center text-royalBlue font-bold font-mono text-xl shrink-0 group-hover:scale-110 transition-transform">
										{org.name[0]}
									</div>
									<div className="min-w-0">
										<div className="flex items-center gap-3 mb-1">
											<h3 className="text-lg font-semibold text-pearlWhite truncate group-hover:text-royalBlue transition-colors">
												{org.name}
											</h3>
											<span
												className={`px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-widest shrink-0 ${
													org.role === "Admin"
														? "bg-royalBlue/10 border-royalBlue/30 text-royalBlue font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)]"
														: "bg-white/5 border-white/10 text-palePeriwinkle"
												}`}
											>
												{org.role === "Admin" ? "Admin" : "Member"}
											</span>
										</div>
										<p className="text-[10px] font-mono text-palePeriwinkle/40 truncate uppercase tracking-tight">
											ADDR: {org.publicKey.toBase58().slice(0, 12)}...{org.publicKey.toBase58().slice(-8)}
										</p>
									</div>
								</div>

								<div className={`flex items-center gap-6 ${viewMode === 'grid' ? 'pt-4 border-t border-white/5 w-full justify-between' : ''}`}>
									<div className="flex gap-6">
										<div>
											<div className="text-[9px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-0.5">
												Members
											</div>
											<div className="text-sm text-pearlWhite font-mono font-bold leading-none">{org.memberCount}</div>
										</div>
										<div>
											<div className="text-[9px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-0.5">
												Roles
											</div>
											<div className="text-sm text-pearlWhite font-mono font-bold leading-none">{org.roleCount}</div>
										</div>
									</div>
									<Link
										to={`/org/${org.publicKey.toBase58()}`}
										className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono font-bold text-royalBlue hover:bg-royalBlue hover:text-white transition-all uppercase tracking-widest no-underline group/btn flex items-center gap-2 whitespace-nowrap"
									>
										Manage
										<span className="group-hover/btn:translate-x-1 transition-transform">
											→
										</span>
									</Link>
								</div>
							</div>
						))
					) : (
						<div className="col-span-full py-20 text-center glass-card rounded-2xl border-dashed border-white/10">
							<ShieldCheck className="w-12 h-12 text-palePeriwinkle/10 mx-auto mb-4" />
							<p className="text-palePeriwinkle/30 font-mono uppercase tracking-[0.2em] text-sm">
								NO_ORGANIZATIONS_FOUND.ERR
							</p>
						</div>
					)}
				</div>
			)}

			<CreateOrganizationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={refetch}
			/>
		</>
	);
}
