import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import WalletDropdown from "./WalletDropdown";

export default function Header() {
	const { connected } = useWallet();

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5">
			<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
				<Link
					to="/"
					className="flex items-center gap-2 no-underline group cursor-pointer"
				>
					<div className="w-2 h-2 bg-palePeriwinkle rounded-full animate-pulse group-hover:bg-white transition-colors"></div>
					<span className="font-mono text-sm tracking-widest text-palePeriwinkle font-bold group-hover:text-white transition-colors">
						SYS.RBAC.v1.0
					</span>
				</Link>

				<div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-wider text-lightLavender/80">
					<Link
						to="/organizations"
						className="nav-link hover:text-white transition-colors no-underline"
					>
						PORTALS
					</Link>
					<Link
						to="/admin"
						className="nav-link hover:text-white transition-colors no-underline"
					>
						ADMIN
					</Link>
				</div>

				<div className="flex items-center gap-4">
					<WalletDropdown />
					{connected && (
						<Link
							to="/organizations"
							className="font-mono text-xs border border-white/20 px-4 py-2 rounded-full text-palePeriwinkle hover:bg-white/5 transition-colors no-underline uppercase"
						>
							LAUNCH APP
						</Link>
					)}
				</div>
			</div>
		</nav>
	);
}
