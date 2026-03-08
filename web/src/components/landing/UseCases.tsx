export default function UseCases() {
	return (
		<section id="use-cases" className="py-24 bg-black/30">
			<div className="max-w-7xl mx-auto px-6">
				<div className="text-center mb-20">
					<span className="font-mono text-xs text-magentaViolet uppercase tracking-widest mb-4 block">
						Deployment Targets
					</span>
					<h2 className="text-3xl md:text-5xl font-sans text-white mb-6">
						Built for Web3 Teams
					</h2>
					<p className="text-palePeriwinkle/90 max-w-xl mx-auto">
						Scalable infrastructure that adapts to your organization's
						decentralized needs.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="premium-card p-1 rounded-xl relative overflow-hidden group">
						<div className="absolute inset-0 bg-linear-to-br from-royalBlue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div className="rounded-lg p-8 h-full relative z-10 flex flex-col items-center text-center">
							<div className="mb-6 p-4 rounded-full bg-white/5 border border-white/10 text-palePeriwinkle">
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
									></path>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-white mb-2">DAOs</h3>
							<p className="text-sm text-blue-100/70">
								Decentralized governance with tiered voting power and proposal
								execution rights based on token holdings or delegation.
							</p>
						</div>
					</div>

					<div className="border border-white/10 bg-deepIndigo/50 rounded-xl p-1 relative overflow-hidden group hover:border-royalBlue/50 transition-all">
						<div className="absolute inset-0 bg-linear-to-br from-royalBlue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div className="bg-[#050D1A] rounded-lg p-8 h-full relative z-10 flex flex-col items-center text-center">
							<div className="mb-6 p-4 rounded-full bg-white/5 border border-white/10 text-palePeriwinkle">
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									></path>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-white mb-2">
								Development Teams
							</h3>
							<p className="text-sm text-blue-100/70">
								Manage engineering access tiers. Separate deployer keys from
								admin keys and automate CI/CD pipeline permissions.
							</p>
						</div>
					</div>

					<div className="border border-white/10 bg-deepIndigo/50 rounded-xl p-1 relative overflow-hidden group hover:border-royalBlue/50 transition-all">
						<div className="absolute inset-0 bg-linear-to-br from-royalBlue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div className="bg-[#050D1A] rounded-lg p-8 h-full relative z-10 flex flex-col items-center text-center">
							<div className="mb-6 p-4 rounded-full bg-white/5 border border-white/10 text-palePeriwinkle">
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
									></path>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-white mb-2">
								Multi-sig Alternative
							</h3>
							<p className="text-sm text-blue-100/70">
								Replace cumbersome multi-sig ceremonies with programmable role
								policies that automatically validate transactions.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
