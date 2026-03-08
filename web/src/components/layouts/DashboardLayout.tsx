import { User } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export default function DashboardLayout() {
	return (
		<div className="min-h-screen flex flex-col antialiased">
			<nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 bg-deepIndigo/60 backdrop-blur-md">
				<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-palePeriwinkle rounded-full"></div>
						<Link
							to="/"
							className="font-mono text-sm tracking-widest text-palePeriwinkle font-bold hover:text-white transition-colors"
						>
							SYS.RBAC.v1.0
						</Link>
					</div>

					<div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-wider text-lightLavender/80">
						<Link to="/organizations" className="nav-link text-white">
							DASHBOARD
						</Link>
						<Link
							to="/organizations"
							className="nav-link hover:text-white transition-colors"
						>
							ORGANIZATIONS
						</Link>
						<Link
							to="/check"
							className="nav-link hover:text-white transition-colors"
						>
							PERMISSIONS
						</Link>
					</div>

					<div className="flex items-center gap-4">
						<div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 font-mono text-[10px]">
							<span className="text-green-400">●</span>
							<span className="text-palePeriwinkle/70">0x71C...4f92</span>
						</div>
						<Link
							to="/profile"
							className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer"
						>
							<User className="w-4 h-4 text-palePeriwinkle" />
						</Link>
					</div>
				</div>
			</nav>

			<main className="flex-grow pt-24 pb-20 px-6 max-w-7xl mx-auto w-full">
				<Outlet />
			</main>

			<footer className="border-t border-white/5 bg-black/20 py-8">
				<div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-palePeriwinkle/30 font-mono tracking-widest uppercase">
					<div className="flex items-center gap-4">
						<span>SYS.RBAC DASHBOARD V1.0.4</span>
						<span className="hidden md:inline">|</span>
						<span>NODE_STATUS: ONLINE</span>
					</div>
					<div>© 2024 DECENTRALIZED PERMISSIONS INFRASTRUCTURE</div>
				</div>
			</footer>
		</div>
	);
}
