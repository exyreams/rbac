export default function Features() {
	return (
		<section id="features" className="py-24 relative overflow-hidden">
			<div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-royalBlue/20 rounded-full blur-[120px] pointer-events-none"></div>

			<div className="max-w-7xl mx-auto px-6 relative z-10">
				<div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
					<div>
						<h2 className="text-3xl md:text-4xl font-sans mb-4">
							Core Capabilities
						</h2>
						<p className="text-palePeriwinkle/90 max-w-md">
							Enterprise-grade access controls built natively for the blockchain
							ecosystem.
						</p>
					</div>
					<div className="font-mono text-xs text-palePeriwinkle/40 border border-white/10 px-3 py-1 rounded-full">
						MODULES.INIT()
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="premium-card p-8 rounded-2xl flex flex-col gap-6 group">
						<div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
							<svg
								className="w-6 h-6 text-palePeriwinkle"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
								></path>
							</svg>
						</div>
						<div>
							<h3 className="text-xl font-medium text-white mb-2">
								Role-Based Access
							</h3>
							<p className="text-sm text-palePeriwinkle/90 leading-relaxed">
								Define and assign roles on-chain with granular precision. Create
								hierarchies and inheritance structures that mirror your
								organization.
							</p>
						</div>
						<div className="mt-auto pt-6 border-t border-white/5">
							<a
								href="#"
								className="text-xs font-mono text-lightLavender hover:text-white flex items-center gap-2"
							>
								EXPLORE DOCUMENTATION <span className="text-lg">›</span>
							</a>
						</div>
					</div>

					<div className="premium-card p-8 rounded-2xl flex flex-col gap-6 group">
						<div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
							<svg
								className="w-6 h-6 text-palePeriwinkle"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
									d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
								></path>
							</svg>
						</div>
						<div>
							<h3 className="text-xl font-medium text-white mb-2">
								Permission Trees
							</h3>
							<p className="text-sm text-palePeriwinkle/90 leading-relaxed">
								Fine-grained permission management. Allow specific addresses to
								execute specific functions within your smart contracts.
							</p>
						</div>
						<div className="mt-auto pt-6 border-t border-white/5">
							<a
								href="#"
								className="text-xs font-mono text-lightLavender hover:text-white flex items-center gap-2"
							>
								VIEW SCHEMA <span className="text-lg">›</span>
							</a>
						</div>
					</div>

					<div className="premium-card p-8 rounded-2xl flex flex-col gap-6 group">
						<div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
							<svg
								className="w-6 h-6 text-palePeriwinkle"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
								></path>
							</svg>
						</div>
						<div>
							<h3 className="text-xl font-medium text-white mb-2">
								Immutable Audit
							</h3>
							<p className="text-sm text-palePeriwinkle/90 leading-relaxed">
								Every role assignment and permission check is recorded on-chain.
								Achieve zero-trust security with a complete historical trail.
							</p>
						</div>
						<div className="mt-auto pt-6 border-t border-white/5">
							<a
								href="#"
								className="text-xs font-mono text-lightLavender hover:text-white flex items-center gap-2"
							>
								AUDIT REPORTS <span className="text-lg">›</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
