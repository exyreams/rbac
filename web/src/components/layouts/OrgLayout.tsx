import { Copy } from "lucide-react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";

export default function OrgLayout() {
	const location = useLocation();
	const { id } = useParams();

	const tabs = [
		{ name: "OVERVIEW", path: `/org/${id}` },
		{ name: "ROLES", path: `/org/${id}/roles` },
		{ name: "MEMBERS", path: `/org/${id}/members` },
		{ name: "VAULTS", path: `/org/${id}/vaults` },
		{ name: "SETTINGS", path: `/org/${id}/settings` },
	];

	return (
		<>
			<div className="mb-10 fade-in">
				<div className="flex items-center gap-3 text-palePeriwinkle text-[10px] font-mono mb-4 uppercase tracking-[0.2em]">
					<Link
						to="/organizations"
						className="hover:text-pearlWhite transition-colors opacity-70"
					>
						Organizations
					</Link>
					<span className="opacity-30">/</span>
					<span className="text-pearlWhite font-bold tracking-widest">
						Nexus Labs DAO
					</span>
				</div>

				<div className="flex flex-col lg:flex-row justify-between items-start gap-8">
					<div className="flex-grow">
						<div className="flex items-center gap-4 mb-3">
							<h1 className="text-4xl font-sans font-bold text-pearlWhite tracking-tight">
								Nexus Labs DAO
							</h1>
							<span className="px-3 py-1 rounded-full bg-royalBlue/10 border border-royalBlue/30 text-[9px] font-mono text-royalBlue font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.1)]">
								Ethereum Mainnet
							</span>
						</div>

						<div className="flex flex-wrap items-center gap-y-4 gap-x-8 text-[11px] font-mono">
							<div className="flex items-center gap-2 group">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">ADDR:</span>
								<span className="text-palePeriwinkle opacity-80 uppercase tracking-tight">
									0x4a2c...88f1
								</span>
								<button className="text-palePeriwinkle/30 hover:text-pearlWhite transition-colors cursor-pointer border-none bg-transparent">
									<Copy className="w-3.5 h-3.5" />
								</button>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">ADMIN:</span>
								<span className="text-palePeriwinkle opacity-80 uppercase tracking-tight">
									0x71C...4f92
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">
									CREATED:
								</span>
								<span className="text-palePeriwinkle opacity-80 uppercase tracking-tight">
									12.04.23
								</span>
							</div>
						</div>

						<p className="mt-6 text-palePeriwinkle/60 text-sm leading-relaxed max-w-2xl font-light">
							Primary research and development laboratory for modular
							infrastructure. This DAO manages the core protocol parameters,
							treasury allocations, and contributor access control across the
							Nexus ecosystem.
						</p>
					</div>
				</div>
			</div>

			<div className="border-b border-white/5 flex items-center gap-8 mb-8 fade-in delay-100">
				{tabs.map((tab) => (
					<Link
						key={tab.name}
						to={tab.path}
						className={`pb-4 text-[10px] font-mono font-bold tracking-[0.2em] transition-all cursor-pointer relative ${
							location.pathname === tab.path
								? "text-pearlWhite"
								: "text-palePeriwinkle/40 hover:text-pearlWhite"
						}`}
					>
						{tab.name}
						{location.pathname === tab.path && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-royalBlue shadow-[0_0_10px_var(--color-royalBlue)]" />
						)}
					</Link>
				))}
			</div>

			<Outlet />
		</>
	);
}
