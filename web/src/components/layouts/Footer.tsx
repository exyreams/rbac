import { Hexagon, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
	return (
		<footer className="border-t border-white/10 bg-black/40 pt-20 pb-10">
			<div className="max-w-7xl mx-auto px-6">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
					<div className="col-span-1 md:col-span-1">
						<div className="flex items-center gap-2 mb-6">
							<div className="w-2 h-2 bg-royalBlue rounded-full"></div>
							<span className="font-mono text-sm tracking-widest text-white font-bold">
								SYS.RBAC
							</span>
						</div>
						<p className="text-sm text-palePeriwinkle/70 leading-relaxed mb-6">
							The definitive protocol for decentralized identity and role-based
							gatekeeping. Engineered for the future of on-chain organizations.
						</p>
						<div className="flex gap-4">
							<a
								href="#"
								className="text-palePeriwinkle/80 hover:text-white transition-colors"
							>
								<Hexagon className="w-5 h-5" />
							</a>
							<a
								href="#"
								className="text-palePeriwinkle/80 hover:text-white transition-colors"
							>
								<Lock className="w-5 h-5" />
							</a>
						</div>
					</div>

					<div className="col-span-1">
						<h4 className="font-mono text-xs uppercase tracking-widest text-lightLavender mb-6">
							Platform
						</h4>
						<ul className="space-y-4 text-sm text-blue-100/70">
							<li>
								<Link
									to="/organizations"
									className="hover:text-white transition-colors"
								>
									Dashboard
								</Link>
							</li>
							<li>
								<Link
									to="/profile"
									className="hover:text-white transition-colors"
								>
									Profile
								</Link>
							</li>
							<li>
								<Link
									to="/check"
									className="hover:text-white transition-colors"
								>
									Check Permission
								</Link>
							</li>
							<li>
								<Link
									to="/admin"
									className="hover:text-white transition-colors"
								>
									Admin Dashboard
								</Link>
							</li>
						</ul>
					</div>

					<div className="col-span-1">
						<h4 className="font-mono text-xs uppercase tracking-widest text-lightLavender mb-6">
							Community
						</h4>
						<ul className="space-y-4 text-sm text-blue-100/40">
							<li>
								<a href="#" className="hover:text-white transition-colors">
									Discord
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-white transition-colors">
									Governance
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-white transition-colors">
									Blog
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-white transition-colors">
									Events
								</a>
							</li>
						</ul>
					</div>

					<div className="col-span-1">
						<h4 className="font-mono text-xs uppercase tracking-widest text-lightLavender mb-6">
							Stay Updated
						</h4>
						<div className="flex flex-col gap-4">
							<div className="relative">
								<input
									type="email"
									placeholder="Enter email address"
									className="w-full bg-deepIndigo border border-palePeriwinkle/20 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-magentaViolet transition-all placeholder:text-palePeriwinkle/30 shadow-inner"
								/>
							</div>
							<button className="w-full bg-royalBlue hover:bg-magentaViolet text-white text-xs font-mono py-3 rounded-lg transition-colors uppercase tracking-wider cursor-pointer">
								Subscribe
							</button>
						</div>
					</div>
				</div>

				<div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-palePeriwinkle/50 font-mono">
					<p className="opacity-70">
						© {new Date().getFullYear()} SYS.RBAC Protocol. All rights reserved.
					</p>
					<div className="flex gap-6">
						<a
							href="#"
							className="text-palePeriwinkle/80 hover:text-white transition-colors no-underline"
						>
							Privacy Policy
						</a>
						<a
							href="#"
							className="text-palePeriwinkle/80 hover:text-white transition-colors no-underline"
						>
							Terms of Service
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
