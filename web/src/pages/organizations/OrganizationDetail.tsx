import {
	ArrowRightLeft,
	CheckCircle,
	Info,
	PlusSquare,
	UserPlus,
	Loader2,
	History,
	LayoutDashboard,
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
	const [activities, setActivities] = useState<any[]>([]);
	const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
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

			// Mock activities based on on-chain state for now
			const mockActivities = [
				{
					id: "org-1",
					type: "ORG_CREATED",
					label: "Organization Created",
					timestamp: orgAccount.createdAt.toNumber() * 1000,
					details: `Nexus Labs DAO initialized by ${orgAccount.admin.toBase58().slice(0, 8)}...`,
					icon: CheckCircle,
					color: "green",
				},
			];

			// Add activity for each role
			allRoles.forEach((r: any) => {
				mockActivities.push({
					id: `role-${r.account.roleIndex}`,
					type: "ROLE_CREATED",
					label: "Role Created",
					timestamp: r.account.createdAt.toNumber() * 1000,
					details: `New role "${new TextDecoder().decode(Uint8Array.from(r.account.name)).replace(/\0/g, "")}" defined at index ${r.account.roleIndex}`,
					icon: PlusSquare,
					color: "magentaViolet",
				});
			});

			// Add member join activities
			allMemberships.forEach((m: any, i: number) => {
				mockActivities.push({
					id: `member-${i}`,
					type: "MEMBER_JOINED",
					label: "Member Joined",
					timestamp: m.account.createdAt.toNumber() * 1000,
					details: `Wallet ${m.account.member.toBase58().slice(0, 8)}... joined the organization`,
					icon: UserPlus,
					color: "palePeriwinkle",
				});
			});

			setActivities(mockActivities.sort((a, b) => b.timestamp - a.timestamp));
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
			<div className="text-center py-20 glass-card rounded-2xl">
				<p className="text-palePeriwinkle/30 font-mono">ORGANIZATION_NOT_FOUND.ERR</p>
				<Link to="/organizations" className="mt-4 inline-block text-palePeriwinkle hover:text-white transition-colors text-xs font-mono">
					← RETURN_TO_DASHBOARD
				</Link>
			</div>
		);
	}

	const orgName = new TextDecoder().decode(Uint8Array.from(organization.name)).replace(/\0/g, "");

	return (
		<>
			<div className="mb-10 fade-in">
				<div className="flex items-center gap-2 text-palePeriwinkle/30 text-[10px] font-mono mb-2">
					<Link to="/organizations" className="hover:text-palePeriwinkle transition-colors uppercase">Organizations</Link>
					<span>/</span>
					<span className="text-palePeriwinkle/60 uppercase">{orgName}</span>
				</div>
				<h1 className="text-3xl font-sans font-medium text-white">{orgName}</h1>
				<p className="text-xs font-mono text-palePeriwinkle/40 mt-1">{id}</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 fade-in delay-200">
				<div className="glass-card rounded-xl p-5 border-l-2 border-l-palePeriwinkle">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Total Members
					</div>
					<div className="text-2xl font-mono text-white">{organization.memberCount}</div>
				</div>
				<div className="glass-card rounded-xl p-5 border-l-2 border-l-magentaViolet">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Active Roles
					</div>
					<div className="text-2xl font-mono text-white">{organization.roleCount.toString().padStart(2, '0')}</div>
				</div>
				<div className="glass-card rounded-xl p-5 border-l-2 border-l-royalBlue">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Permissions Epoch
					</div>
					<div className="text-2xl font-mono text-white">{organization.permissionsEpoch.toString()}</div>
				</div>
				<div className="glass-card rounded-xl p-5 border-l-2 border-l-white/20">
					<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">
						Admin
					</div>
					<div className="text-sm font-mono text-white truncate">{organization.admin.toBase58().slice(0, 8)}...</div>
				</div>
			</div>
			
			<div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit mb-8 fade-in delay-200">
				<button
					onClick={() => setActiveTab("overview")}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
						activeTab === "overview"
							? "bg-palePeriwinkle text-deepIndigo shadow-lg"
							: "text-palePeriwinkle/40 hover:text-white hover:bg-white/5"
					}`}
				>
					<LayoutDashboard className="w-3.5 h-3.5" />
					OVERVIEW
				</button>
				<button
					onClick={() => setActiveTab("history")}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
						activeTab === "history"
							? "bg-palePeriwinkle text-deepIndigo shadow-lg"
							: "text-palePeriwinkle/40 hover:text-white hover:bg-white/5"
					}`}
				>
					<History className="w-3.5 h-3.5" />
					HISTORY
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in delay-300">
				<div className="lg:col-span-2 space-y-8">
					{activeTab === "overview" ? (
						<>
							<div className="glass-card rounded-2xl overflow-hidden">
								<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
									<h2 className="text-xs font-mono tracking-widest text-palePeriwinkle/60 uppercase">
										Active Members ({memberships.length})
									</h2>
									<Link to={`/org/${id}/members`} className="text-[10px] font-mono text-palePeriwinkle/30 hover:text-white transition-colors uppercase">
										Manage All
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
													<p className="text-sm text-white font-medium truncate max-w-[200px]">
														{m.member.toBase58()}
													</p>
													<p className="text-[10px] font-mono text-palePeriwinkle/40">
														JOINED: {new Date(m.createdAt.toNumber() * 1000).toLocaleDateString()}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-palePeriwinkle/60 uppercase">
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

							<div className="glass-card rounded-2xl overflow-hidden">
								<div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
									<h2 className="text-xs font-mono tracking-widest text-palePeriwinkle/60 uppercase">
										Roles Overview ({roles.length})
									</h2>
									<Link to={`/org/${id}/roles`} className="text-[10px] font-mono text-palePeriwinkle/30 hover:text-white transition-colors uppercase">
										Manage Roles
									</Link>
								</div>
								<div className="divide-y divide-white/5">
									{roles.map((role, i) => (
										<div key={i} className="px-6 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
											<div className="flex items-center gap-4">
												<div className="w-8 h-8 rounded bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center text-magentaViolet font-mono text-xs">
													{role.role_index}
												</div>
												<div>
													<p className="text-sm text-white font-medium">
														{new TextDecoder().decode(Uint8Array.from(role.name)).replace(/\0/g, "")}
													</p>
													<p className="text-[10px] font-mono text-palePeriwinkle/40">
														PERMISSIONS: {role.permissions.toString(16).toUpperCase()}
													</p>
												</div>
											</div>
											<div className="text-right">
												<div className="text-white text-xs font-mono">{role.referenceCount} Members</div>
												<div className={`text-[9px] font-mono ${role.is_active ? 'text-green-400' : 'text-red-400'}`}>
													{role.is_active ? "READY" : "DEACTIVATED"}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</>
					) : (
						<div className="glass-card rounded-2xl overflow-hidden">
							<div className="px-6 py-4 border-b border-white/5">
								<h2 className="text-xs font-mono tracking-widest text-palePeriwinkle/60 uppercase">
									Audit Log / Activity History
								</h2>
							</div>
							<div className="divide-y divide-white/5">
								{activities.map((activity) => (
									<div key={activity.id} className="px-6 py-5 flex gap-4 hover:bg-white/2 transition-colors">
										<div className={`mt-0.5 w-8 h-8 rounded-lg bg-${activity.color}/10 border border-${activity.color}/20 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(var(--${activity.color}-rgb),0.1)]`}>
											<activity.icon className={`w-4 h-4 text-${activity.color}`} />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between mb-1">
												<p className="text-sm font-bold text-white uppercase tracking-tight">
													{activity.label}
												</p>
												<span className="text-[10px] text-white/20 font-mono uppercase">
													{new Date(activity.timestamp).toLocaleString()}
												</span>
											</div>
											<p className="text-xs text-palePeriwinkle/40 font-mono leading-relaxed wrap-break-word">
												{activity.details}
											</p>
										</div>
									</div>
								))}
								{activities.length === 0 && (
									<div className="px-6 py-10 text-center">
										<p className="text-palePeriwinkle/20 font-mono text-xs italic">NO_ACTIVITY_LOGGED.SYS</p>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<div className="space-y-6">
					<div className="glass-card rounded-2xl p-6">
						<h2 className="text-xs font-mono tracking-widest text-palePeriwinkle/60 uppercase mb-6">
							Quick Actions
						</h2>
						<div className="flex flex-col gap-3">
							<Link to={`/org/${id}/members`} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-palePeriwinkle/40 hover:bg-white/5 transition-all text-left group cursor-pointer bg-transparent no-underline">
								<div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-palePeriwinkle group-hover:scale-110 transition-transform">
									<UserPlus className="w-5 h-5" />
								</div>
								<div>
									<div className="text-sm font-medium text-white">
										Add Member
									</div>
									<div className="text-[10px] font-mono text-palePeriwinkle/30">
										Assign wallet to role
									</div>
								</div>
							</Link>

							<Link to={`/org/${id}/roles`} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-palePeriwinkle/40 hover:bg-white/5 transition-all text-left group cursor-pointer bg-transparent no-underline">
								<div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-palePeriwinkle group-hover:scale-110 transition-transform">
									<PlusSquare className="w-5 h-5" />
								</div>
								<div>
									<div className="text-sm font-medium text-white">
										Create Role
									</div>
									<div className="text-[10px] font-mono text-palePeriwinkle/30">
										Define new access tier
									</div>
								</div>
							</Link>

							<Link to={`/org/${id}/settings`} className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-palePeriwinkle/40 hover:bg-white/5 transition-all text-left group cursor-pointer bg-transparent no-underline">
								<div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-palePeriwinkle group-hover:scale-110 transition-transform">
									<ArrowRightLeft className="w-5 h-5" />
								</div>
								<div>
									<div className="text-sm font-medium text-white">
										Organization Settings
									</div>
									<div className="text-[10px] font-mono text-palePeriwinkle/30">
										Manage core policies
									</div>
								</div>
							</Link>
						</div>
					</div>

					<div className="glass-card rounded-2xl p-6 border-dashed">
						<div className="flex items-center gap-2 mb-4">
							<Info className="w-4 h-4 text-palePeriwinkle/40" />
							<span className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest">
								Security Policy
							</span>
						</div>
						<p className="text-[11px] text-palePeriwinkle/40 leading-relaxed font-mono">
							Changes to roles or permissions increment the global epoch.
							Members must refresh their local cache to synchronize state.
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
