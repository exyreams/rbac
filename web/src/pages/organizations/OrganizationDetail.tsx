import {
	PlusSquare,
	UserPlus,
	Loader2,
	Info,
	ArrowRightLeft,
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";

export default function OrganizationDetail() {
	const { id } = useParams<{ id: string }>();
	const { program } = useAnchorProgram();
	const [organization, setOrganization] = useState<any>(null);
	const [roles, setRoles] = useState<any[]>([]);
	const [memberships, setMemberships] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const orgPubkey = useMemo(() => {
		try {
			return id ? new PublicKey(id) : null;
		} catch {
			return null;
		}
	}, [id]);

	const fetchData = async () => {
		if (!program || !orgPubkey) return;

		try {
			setIsLoading(true);
			const [orgAccount, allRoles, allMemberships] = await Promise.all([
				program.account.organization.fetch(orgPubkey),
				program.account.role.all([
					{
						memcmp: {
							offset: 8, // discriminator
							bytes: orgPubkey.toBase58(),
						},
					},
				]),
				program.account.membership.all([
					{
						memcmp: {
							offset: 8, // discriminator
							bytes: orgPubkey.toBase58(),
						},
					},
				]),
			]);

			setOrganization(orgAccount);
			setRoles(allRoles.map(r => r.account));
			setMemberships(allMemberships.map(m => m.account));
		} catch (err) {
			console.error("Error fetching organization detail:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [program, orgPubkey]);

	if (isLoading) {
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
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-palePeriwinkle/50">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Total Members
					</div>
					<div className="text-2xl font-mono text-white font-bold">{organization.memberCount}</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-magentaViolet/50">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Active Roles
					</div>
					<div className="text-2xl font-mono text-white font-bold">{organization.roleCount.toString().padStart(2, '0')}</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-royalBlue/50">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Permissions Epoch
					</div>
					<div className="text-2xl font-mono text-white font-bold">{organization.permissionsEpoch.toString()}</div>
				</div>
				<div className="stat-card rounded-xl p-6 border-l-2 border-l-white/10">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Admin
					</div>
					<div className="text-sm font-mono text-white truncate font-bold">{organization.admin.toBase58().slice(0, 8)}...</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in delay-200">
				<div className="lg:col-span-2 space-y-8">
					<div className="stat-card rounded-2xl overflow-hidden border border-white/5">
						<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
							<h2 className="text-[10px] font-mono font-bold tracking-[0.2em] text-palePeriwinkle/60 uppercase">
								Active Members ({memberships.length})
							</h2>
							<Link to={`/org/${id}/members`} className="text-[10px] font-mono font-bold text-royalBlue hover:text-neonGlow transition-colors uppercase tracking-widest">
								Manage All →
							</Link>
						</div>
						<div className="divide-y divide-white/5">
							{memberships.slice(0, 5).map((m, i) => (
								<div key={i} className="px-6 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
									<div className="flex items-center gap-4">
										<div className="w-8 h-8 rounded bg-palePeriwinkle/10 border border-palePeriwinkle/20 flex items-center justify-center text-palePeriwinkle font-mono text-xs">
											{i + 1}
										</div>
										<div>
											<p className="text-sm text-white font-medium truncate max-w-[200px] font-mono">
												{m.member.toBase58().slice(0, 12)}...
											</p>
											<p className="text-[9px] font-mono text-palePeriwinkle/40 uppercase">
												JOINED: {new Date(m.createdAt.toNumber() * 1000).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className={`px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-widest ${m.is_active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
											{m.is_active ? "Active" : "Inactive"}
										</span>
									</div>
								</div>
							))}
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
							<Link to={`/org/${id}/roles`} className="text-[10px] font-mono font-bold text-royalBlue hover:text-neonGlow transition-colors uppercase tracking-widest">
								Manage Roles →
							</Link>
						</div>
						<div className="divide-y divide-white/5">
							{roles.map((role, i) => (
								<div key={i} className="px-6 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
									<div className="flex items-center gap-4">
										<div className="w-8 h-8 rounded bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center text-magentaViolet font-mono text-xs font-bold">
											{role.role_index}
										</div>
										<div>
											<p className="text-sm text-white font-bold tracking-tight">
												{new TextDecoder().decode(Uint8Array.from(role.name)).replace(/\0/g, "")}
											</p>
											<p className="text-[9px] font-mono text-palePeriwinkle/40 uppercase">
												PERMISSIONS: 0x{role.permissions.toString(16).toUpperCase()}
											</p>
										</div>
									</div>
									<div className="text-right">
										<div className="text-white text-xs font-mono font-bold">{role.referenceCount} Members</div>
										<div className={`text-[9px] font-mono font-bold ${role.is_active ? 'text-green-400' : 'text-red-400'}`}>
											{role.is_active ? "READY" : "DEACTIVATED"}
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
									<div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest mt-0.5">
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
									<div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest mt-0.5">
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
									<div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest mt-0.5">
										Manage core policies
									</div>
								</div>
							</Link>
						</div>
					</div>

					<div className="stat-card rounded-2xl p-6 border border-dashed border-white/10">
						<div className="flex items-center gap-2 mb-4">
							<Info className="w-4 h-4 text-royalBlue/40" />
							<span className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-[0.2em] font-bold">
								Security Policy
							</span>
						</div>
						<p className="text-[11px] text-palePeriwinkle/40 leading-relaxed font-mono uppercase tracking-tight">
							Changes to roles or permissions increment the global epoch.
							Members must refresh their local cache to synchronize state.
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
