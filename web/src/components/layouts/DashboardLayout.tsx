import { Link, Outlet } from "react-router-dom";
import WalletDropdown from "./WalletDropdown";

export default function DashboardLayout() {
	return (
		<div className="min-h-screen flex flex-col antialiased">
			<nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 bg-deepIndigo/80 backdrop-blur-md">
				<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-royalBlue rounded-full shadow-[0_0_8px_var(--color-royalBlue)]"></div>
						<Link
							to="/"
							className="font-mono text-sm tracking-widest text-royalBlue font-bold hover:text-neonGlow transition-colors"
						>
							SYS.RBAC.v1.0
						</Link>
					</div>

					<div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-wider text-palePeriwinkle">
						<Link
							to="/dashboard"
							className="nav-link hover:text-white transition-colors"
						>
							DASHBOARD
						</Link>
						<Link
							to="/check"
							className="nav-link hover:text-white transition-colors"
						>
							PERMISSIONS
						</Link>
					</div>

					<div className="flex items-center gap-4">
						<WalletDropdown />
					</div>
				</div>
			</nav>

			<main className="grow pt-24 pb-20 px-6 max-w-7xl mx-auto w-full">
				<Outlet />
			</main>

			<footer className="border-t border-white/5 bg-black/20 py-8">
				<div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono tracking-widest uppercase text-palePeriwinkle">
					<div className="flex items-center gap-4">
						<span className="opacity-90">SYS.RBAC DASHBOARD V1.0.4</span>
						<span className="hidden md:inline opacity-30">|</span>
						<span className="opacity-90">NODE_STATUS: ONLINE</span>
					</div>
					<div className="opacity-90">© {new Date().getFullYear()} DECENTRALIZED PERMISSIONS INFRASTRUCTURE</div>
				</div>
			</footer>
		</div>
	);
}
