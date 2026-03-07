import {
	ShieldCheck,
	Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAnchorProgram } from "../hooks/useAnchorProgram";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
	const { program, wallet } = useAnchorProgram();
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

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
					<div className="flex items-center gap-3 text-palePeriwinkle/40 text-xs font-mono mb-2">
						<span className="uppercase">SYSTEM</span>
						<span>/</span>
						<span className="text-white uppercase">Admin</span>
					</div>
					<h1 className="text-3xl font-sans font-medium text-white">
						Admin Dashboard
					</h1>
					<p className="font-mono text-[10px] text-palePeriwinkle/40 tracking-[0.3em] mt-2">
						SYSTEM_CONTROL.EXE
					</p>
				</div>
				<div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-500 font-mono text-[10px] tracking-widest font-bold">
					ADMIN_ONLY
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 fade-in delay-100 text-white">
				<div className="glass-card rounded-xl p-6 border-b-2 border-b-magentaViolet">
					<p className="text-[10px] font-mono text-palePeriwinkle/40 tracking-widest uppercase mb-2">
						Managed Organizations
					</p>
					<div className="flex items-end gap-2">
						<span className="text-3xl font-mono font-bold">{organizations.length}</span>
					</div>
				</div>
				<div className="glass-card rounded-xl p-6 border-b-2 border-b-blue-500">
					<p className="text-[10px] font-mono text-palePeriwinkle/40 tracking-widest uppercase mb-2">
						System Role Count
					</p>
					<div className="flex items-end gap-2">
						<span className="text-3xl font-mono font-bold">{totalRoles}</span>
					</div>
				</div>
				<div className="glass-card rounded-xl p-6 border-b-2 border-b-green-500">
					<p className="text-[10px] font-mono text-palePeriwinkle/40 tracking-widest uppercase mb-2">
						Status
					</p>
					<div className="flex items-center gap-3">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
						<span className="text-sm font-mono font-bold text-green-400">NOMINAL</span>
					</div>
				</div>
				<div className="glass-card rounded-xl p-6 border-b-2 border-b-amber-500">
					<p className="text-[10px] font-mono text-palePeriwinkle/40 tracking-widest uppercase mb-2">
						Threat Level
					</p>
					<span className="text-sm font-mono font-bold text-amber-500 uppercase tracking-widest">Minimal</span>
				</div>
			</div>

			<h3 className="text-white font-mono text-xs font-bold uppercase tracking-widest mb-6 px-1">Managed Portals</h3>
			<div className="grid grid-cols-1 gap-4 mb-20 fade-in delay-200">
				{organizations.map((org) => {
					const name = new TextDecoder().decode(Uint8Array.from(org.account.name)).replace(/\0/g, "");
					const pubkey = org.publicKey.toBase58();

					return (
						<div key={pubkey} className="glass-card rounded-2xl p-6 border border-white/5 hover:border-magentaViolet/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group text-white">
							<div className="flex items-center gap-6">
								<div className="w-12 h-12 rounded-xl bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center text-magentaViolet font-bold text-xl font-mono">
									{name.charAt(0)}
								</div>
								<div>
									<h4 className="text-white font-medium text-lg mb-1">{name}</h4>
									<p className="text-[10px] font-mono text-palePeriwinkle/30 uppercase tracking-widest flex items-center gap-2">
										ADDR: {pubkey.slice(0, 12)}... | ROLES: {org.account.roleCount}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Link to={`/org/${pubkey}`} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full font-mono text-[10px] text-white hover:bg-magentaViolet hover:border-magentaViolet transition-all no-underline font-bold uppercase tracking-widest">
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
