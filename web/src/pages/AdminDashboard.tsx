import {
	ShieldCheck,
	Loader2,
	LayoutGrid,
	List as ListIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAnchorProgram } from "../hooks/useAnchorProgram";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
	const { program, wallet } = useAnchorProgram();
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

	useEffect(() => {
		const fetchAllData = async () => {
			if (!program || !wallet) return;
			try {
				setIsLoading(true);
				const adminOrgs = await program.account.organization.all([
					{
						memcmp: {
							offset: 8 + 32, // discriminator + name(32)
							bytes: wallet.publicKey.toBase58(),
						},
					},
				]);
				setOrganizations(adminOrgs);
			} catch (err) {
				console.error("Error fetching admin data:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAllData();
	}, [program, wallet]);

	if (isLoading) {
		return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-palePeriwinkle" /></div>;
	}

	const totalRoles = organizations.reduce((acc, org) => acc + org.account.roleCount, 0);

	return (
		<>
			<div className="mb-8 fade-in flex justify-between items-start text-white">
				<div>
					<div className="flex items-center gap-3 text-palePeriwinkle text-xs font-mono mb-2">
						<span className="uppercase opacity-70">SYSTEM</span>
						<span className="opacity-30">/</span>
						<span className="text-pearlWhite uppercase font-bold tracking-widest">Admin Dashboard</span>
					</div>
					<h1 className="text-3xl font-sans font-bold text-pearlWhite tracking-tight">
						Admin Dashboard
					</h1>
					<p className="font-mono text-[10px] text-palePeriwinkle/60 tracking-[0.4em] mt-2">
						SYSTEM_CONTROL.FXF
					</p>
				</div>
				<div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 font-mono text-[10px] tracking-widest font-bold">
					ADMIN_ONLY
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 fade-in delay-100 text-white">
				<div className="stat-card rounded-xl p-6 border-b-2 border-b-royalBlue/50">
					<p className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-2">
						Managed Organizations
					</p>
					<div className="flex items-end gap-2">
						<span className="text-3xl font-mono font-bold text-pearlWhite">{organizations.length}</span>
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-b-2 border-b-neonGlow/50">
					<p className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-2">
						System Role Count
					</p>
					<div className="flex items-end gap-2">
						<span className="text-3xl font-mono font-bold text-pearlWhite">{totalRoles}</span>
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-b-2 border-b-green-500/50">
					<p className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-2">
						System Status
					</p>
					<div className="flex items-center gap-3">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
						<span className="text-sm font-mono font-bold text-green-400 tracking-widest">NOMINAL</span>
					</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-b-2 border-b-amber-500/50">
					<p className="text-[10px] font-mono text-lightLavender tracking-widest uppercase mb-2">
						Threat Level
					</p>
					<span className="text-sm font-mono font-bold text-amber-500 uppercase tracking-widest">Minimal</span>
				</div>
			</div>

			<div className="flex items-center justify-between mb-6 px-1">
				<h3 className="text-pearlWhite font-mono text-xs font-bold uppercase tracking-[0.3em] opacity-60">Managed Portals</h3>
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

			<div className={`grid gap-4 mb-20 fade-in delay-200 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
				{organizations.map((org) => {
					const name = new TextDecoder().decode(Uint8Array.from(org.account.name)).replace(/\0/g, "");
					const pubkey = org.publicKey.toBase58();

					return (
						<div 
							key={pubkey} 
							className={`stat-card rounded-2xl p-6 border border-white/5 hover:border-royalBlue/30 transition-all group text-white flex ${viewMode === 'list' ? 'flex-col md:flex-row md:items-center justify-between gap-6' : 'flex-col gap-6'}`}
						>
							<div className={`flex gap-6 ${viewMode === 'list' ? 'items-center' : 'flex-col'}`}>
								<div className="w-12 h-12 rounded-xl bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center text-royalBlue font-bold text-xl font-mono shrink-0 transition-transform">
									{name.charAt(0)}
								</div>
								<div>
									<h4 className="text-pearlWhite font-semibold text-lg mb-1 group-hover:text-royalBlue transition-colors">{name}</h4>
									<p className="text-[10px] font-mono text-palePeriwinkle uppercase tracking-widest flex items-center gap-2">
										ADDR: {pubkey.slice(0, 8)}...{pubkey.slice(-4)} | ROLES: {org.account.roleCount}
									</p>
								</div>
							</div>
							<div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'mt-auto pt-4 border-t border-white/5 w-full justify-between' : ''}`}>
								<Link to={`/org/${pubkey}`} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full font-mono text-[10px] text-white hover:bg-royalBlue hover:border-royalBlue transition-all no-underline font-bold uppercase tracking-widest text-center grow md:grow-0">
									MANAGE_SYSTEM
								</Link>
							</div>
						</div>
					);
				})}

				{organizations.length === 0 && (
					<div className="py-20 glass-card rounded-2xl text-center flex flex-col items-center justify-center border border-dashed border-white/10 text-white">
						<ShieldCheck className="w-12 h-12 text-palePeriwinkle/10 mb-4" />
						<p className="text-palePeriwinkle/20 font-mono text-sm mb-6 uppercase tracking-widest">No complexes found under current signature</p>
						<Link to="/organizations" className="px-8 py-3 bg-magentaViolet text-white rounded-full font-mono text-xs font-bold hover:bg-magentaViolet/80 transition-all no-underline uppercase tracking-widest shadow-lg">
							Create_First_Org
						</Link>
					</div>
				)}
			</div>
		</>
	);
}
