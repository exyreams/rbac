export default function Stats() {
	return (
		<section className="border-y border-white/5 bg-black/40 backdrop-blur-sm">
			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
					<div className="flex flex-col gap-1">
						<span className="font-mono text-2xl md:text-3xl text-white">
							12,400+
						</span>
						<span className="font-mono text-xs uppercase tracking-wider text-lightLavender/60">
							Organizations
						</span>
					</div>
					<div className="flex flex-col gap-1">
						<span className="font-mono text-2xl md:text-3xl text-white">
							340K
						</span>
						<span className="font-mono text-xs uppercase tracking-wider text-lightLavender/60">
							Roles Managed
						</span>
					</div>
					<div className="flex flex-col gap-1">
						<span className="font-mono text-2xl md:text-3xl text-white">
							2.1M
						</span>
						<span className="font-mono text-xs uppercase tracking-wider text-lightLavender/60">
							Permissions
						</span>
					</div>
					<div className="flex flex-col gap-1">
						<span className="font-mono text-2xl md:text-3xl text-white">
							99.98%
						</span>
						<span className="font-mono text-xs uppercase tracking-wider text-lightLavender/60">
							Uptime
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}
