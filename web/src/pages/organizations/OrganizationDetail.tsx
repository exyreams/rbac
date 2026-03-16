import {
	PlusSquare,
	UserPlus,
	Loader2,
	Info,
	ArrowRightLeft,
	Copy,
	ExternalLink,
	User,
	Shield,
	ChevronRight
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { useOrganization, useOrganizationRoles, useOrganizationMembers } from "../../hooks/useOrganizationData";

export default function OrganizationDetail() {
	const { id } = useParams<{ id: string }>();
	const { data: organization, isLoading: isLoadingOrg } = useOrganization(id);
	const { data: rolesRaw, isLoading: isLoadingRoles } = useOrganizationRoles(id);
	const { data: membershipsRaw, isLoading: isLoadingMembers } = useOrganizationMembers(id);

	const isLoading = isLoadingOrg || isLoadingRoles || isLoadingMembers;

	const roles = useMemo(() => rolesRaw?.map(r => r.account) || [], [rolesRaw]);
	const memberships = useMemo(() => membershipsRaw?.map(m => m.account) || [], [membershipsRaw]);

	if (isLoading && !organization) {
		return (
			<div className="flex justify-center py-20">
				<Loader2 className="w-8 h-8 text-palePeriwinkle animate-spin" />
			</div>
		);
	}

	if (!organization) {
		return (
			<div className="text-center py-24 glass-card rounded-2xl">
				<p className="text-palePeriwinkle/30 font-mono tracking-widest uppercase">ORGANIZATION_NOT_FOUND.ERR</p>
				<Link to="/dashboard" className="mt-4 inline-block text-royalBlue hover:text-neonGlow transition-colors text-[10px] font-mono font-bold tracking-widest uppercase no-underline">
					[ RETURN_TO_DASHBOARD ]
				</Link>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 fade-in delay-100">
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-palePeriwinkle/70">
					<div className="text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1 font-bold">
						Total Members
					</div>
					<div className="text-2xl font-mono text-white font-bold">{organization.memberCount}</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-magentaViolet/70">
					<div className="text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1 font-bold">
						Active Roles
					</div>
					<div className="text-2xl font-mono text-white font-bold">{organization.roleCount.toString().padStart(2, '0')}</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-royalBlue/70">
					<div className="text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1 font-bold">
						Permissions Epoch
					</div>
					<div className="text-2xl font-mono text-white font-bold">{organization.permissionsEpoch.toString()}</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-white/20">
					<div className="text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1 font-bold">
						Admin
					</div>
					<div className="flex items-center justify-between gap-2 overflow-hidden">
						<div className="text-sm font-mono text-white/90 truncate font-bold">{organization.admin.toBase58().slice(0, 8)}...</div>
						<button 
							onClick={() => navigator.clipboard.writeText(organization.admin.toBase58())}
							className="p-1.5 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue shrink-0"
							title="Copy Admin Address"
						>
							<Copy className="w-3 h-3" />
						</button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in delay-200">
				<div className="lg:col-span-2 space-y-8">
					<div className="stat-card rounded-2xl overflow-hidden border border-white/5">
						<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
							<h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-palePeriwinkle/60 uppercase">
								Active Members ({memberships.length})
							</h2>
							<Link to={`/org/${id}/members`} className="flex items-center gap-1 text-[10px] font-mono font-bold text-royalBlue hover:text-neonGlow transition-colors uppercase tracking-widest group/link">
								Manage All <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
							</Link>
						</div>
						<div className="divide-y divide-white/5">
							{memberships.slice(0, 5).map((m, i) => {
								const memberAddr = m.member.toBase58();
								const displayAddr = memberAddr.slice(0, 8) + "..." + memberAddr.slice(-8);
								
								return (
									<div key={i} className="px-6 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
										<div className="flex items-center gap-4">
											<div className="w-10 h-10 rounded-xl bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center text-royalBlue shadow-inner group-hover:scale-110 transition-transform">
												<User className="w-5 h-5" />
											</div>
											<div>
												<div className="flex items-center gap-3">
													<p className="text-sm text-white font-medium font-mono">
														{displayAddr}
													</p>
													<div className="flex items-center gap-1.5">
														<button 
															onClick={() => navigator.clipboard.writeText(memberAddr)}
															className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
															title="Copy Address"
														>
															<Copy className="w-3 h-3" />
														</button>
														<a 
															href={`https://explorer.solana.com/address/${memberAddr}?cluster=devnet`}
															target="_blank"
															rel="noopener noreferrer"
															className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
														>
															<ExternalLink className="w-3 h-3" />
														</a>
													</div>
												</div>
												<p className="text-[11px] text-palePeriwinkle/40 font-medium leading-normal max-w-[400px]">
													{memberAddr === organization.admin.toBase58() 
														? "Primary organization administrator with root-level authority." 
														: "Verified identity with active organizational access and role permissions."}
												</p>
												<p className="text-[9px] font-mono text-palePeriwinkle/60 uppercase mt-1">
													JOINED: {new Date(m.createdAt.toNumber() * 1000).toLocaleDateString()}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<span className={`px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-widest ${m.isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
												{m.isActive ? "Active" : "Inactive"}
											</span>
										</div>
									</div>
								);
							})}
							{memberships.length === 0 && (
								<div className="px-6 py-10 text-center">
									<p className="text-palePeriwinkle/20 font-mono text-xs italic">NO_MEMBERS_FOUND.LOG</p>
								</div>
							)}
						</div>
					</div>

					<div className="stat-card rounded-2xl overflow-hidden border border-white/5">
						<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
							<h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-palePeriwinkle/60 uppercase">
								Roles Overview ({roles.length})
							</h2>
							<Link to={`/org/${id}/roles`} className="flex items-center gap-1 text-[10px] font-mono font-bold text-royalBlue hover:text-neonGlow transition-colors uppercase tracking-widest group/link">
								Manage Roles <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
							</Link>
						</div>
						<div className="divide-y divide-white/5">
							{roles.map((role, i) => (
								<div key={i} className="px-6 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-xl bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center text-magentaViolet shadow-inner group-hover:scale-110 transition-transform">
											<Shield className="w-5 h-5" />
										</div>
										<div>
											<p className="text-sm text-white font-bold tracking-tight">
												{new TextDecoder().decode(Uint8Array.from(role.name)).replace(/\0/g, "")}
											</p>
											<p className="text-[11px] text-palePeriwinkle/40 font-medium leading-normal max-w-[300px] mb-1">
												{role.permissions.toString() === "9223372036854775808" || (BigInt(role.permissions.toString()) & (BigInt(1) << BigInt(63))) !== BigInt(0)
													? "Full administrative control over organization, roles, and vault protocols."
													: BigInt(role.permissions.toString()) === BigInt(1)
														? "Read-only access to organizational data and member directories."
														: "Custom access tier with specific data and administrative permissions."}
											</p>
											<p className="text-[9px] font-mono text-palePeriwinkle/40 uppercase">
												PERMISSIONS: 0x{role.permissions.toString(16).toUpperCase()}
											</p>
										</div>
									</div>
									<div className="text-right">
										<div className="text-white text-xs font-mono font-bold">{role.referenceCount} Members</div>
										<div className={`text-[9px] font-mono font-bold ${role.isActive ? 'text-green-400' : 'text-red-400'}`}>
											{role.isActive ? "READY" : "DEACTIVATED"}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className="stat-card rounded-2xl p-6 border border-white/5">
						<h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-palePeriwinkle/60 uppercase mb-6">
							Quick Actions
						</h2>
						<div className="flex flex-col gap-3">
							<Link to={`/org/${id}/members`} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:border-royalBlue/30 hover:bg-white/5 transition-all text-left group cursor-pointer bg-transparent no-underline">
								<div className="w-10 h-10 rounded-lg bg-royalBlue/10 border border-royalBlue/20 flex items-center justify-center text-royalBlue group-hover:scale-110 transition-transform">
									<UserPlus className="w-5 h-5" />
								</div>
								<div>
									<div className="text-sm font-bold text-white uppercase tracking-tight">
										Add Member
									</div>
									<div className="text-[9px] font-mono text-palePeriwinkle/50 uppercase tracking-widest mt-0.5">
										Assign wallet to role
									</div>
								</div>
							</Link>

							<Link to={`/org/${id}/roles`} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:border-magentaViolet/30 hover:bg-white/5 transition-all text-left group cursor-pointer bg-transparent no-underline">
								<div className="w-10 h-10 rounded-lg bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center text-magentaViolet group-hover:scale-110 transition-transform">
									<PlusSquare className="w-5 h-5" />
								</div>
								<div>
									<div className="text-sm font-bold text-white uppercase tracking-tight">
										Create Role
									</div>
									<div className="text-[9px] font-mono text-palePeriwinkle/50 uppercase tracking-widest mt-0.5">
										Define new access tier
									</div>
								</div>
							</Link>

							<Link to={`/org/${id}/settings`} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all text-left group cursor-pointer bg-transparent no-underline">
								<div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-palePeriwinkle group-hover:scale-110 transition-transform">
									<ArrowRightLeft className="w-5 h-5" />
								</div>
								<div>
									<div className="text-sm font-bold text-white uppercase tracking-tight">
										System Settings
									</div>
									<div className="text-[9px] font-mono text-palePeriwinkle/50 uppercase tracking-widest mt-0.5">
										Manage core policies
									</div>
								</div>
							</Link>
						</div>
					</div>

					<div className="stat-card rounded-2xl p-6 border border-white/5 bg-white/2 shadow-inner">
						<div className="flex items-center gap-2 mb-4">
							<Info className="w-4 h-4 text-royalBlue" />
							<span className="text-[10px] font-mono text-pearlWhite/60 uppercase tracking-[0.2em] font-black">
								Security Policy
							</span>
						</div>
						<p className="text-[11px] text-palePeriwinkle/60 leading-relaxed font-mono uppercase tracking-tight">
							Changes to roles or permissions increment the global epoch.
							Members must refresh their local cache to synchronize state.
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
