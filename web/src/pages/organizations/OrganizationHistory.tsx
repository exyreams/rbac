import {
	CheckCircle,
	PlusSquare,
	UserPlus,
	Loader2,
	ShieldCheck,
	Search
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";

export default function OrganizationHistory() {
	const { id } = useParams<{ id: string }>();
	const { program } = useAnchorProgram();
	const [activities, setActivities] = useState<any[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	const orgPubkey = useMemo(() => {
		try {
			return id ? new PublicKey(id) : null;
		} catch {
			return null;
		}
	}, [id]);

	const fetchHistory = async () => {
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

			// Mock activities based on on-chain state
			const mockActivities = [
				{
					id: "org-1",
					type: "ORG_CREATED",
					label: "Organization Created",
					timestamp: orgAccount.createdAt.toNumber() * 1000,
					details: `System initialized by ${orgAccount.admin.toBase58().slice(0, 8)}...`,
					icon: CheckCircle,
					color: "green",
				},
			];

			allRoles.forEach((r: any) => {
				mockActivities.push({
					id: `role-${r.account.roleIndex}`,
					type: "ROLE_CREATED",
					label: "Role Created",
					timestamp: r.account.createdAt.toNumber() * 1000,
					details: `New accessibility tier "${new TextDecoder().decode(Uint8Array.from(r.account.name)).replace(/\0/g, "")}" defined at index ${r.account.roleIndex}`,
					icon: PlusSquare,
					color: "magentaViolet",
				});
			});

			allMemberships.forEach((m: any, i: number) => {
				mockActivities.push({
					id: `member-${i}`,
					type: "MEMBER_JOINED",
					label: "Member Joined",
					timestamp: m.account.createdAt.toNumber() * 1000,
					details: `Identity ${m.account.member.toBase58().slice(0, 8)}... synchronized with organization`,
					icon: UserPlus,
					color: "palePeriwinkle",
				});
			});

			setActivities(mockActivities.sort((a, b) => b.timestamp - a.timestamp));
		} catch (err) {
			console.error("Error fetching history:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchHistory();
	}, [program, orgPubkey]);

	const filteredActivities = useMemo(() => {
		return activities.filter(a => 
			a.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
			a.details.toLowerCase().includes(searchTerm.toLowerCase())
		);
	}, [activities, searchTerm]);

	if (isLoading) {
		return (
			<div className="flex justify-center py-20">
				<Loader2 className="w-8 h-8 text-palePeriwinkle animate-spin" />
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto fade-in">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
				<div>
					<h2 className="text-xl font-sans font-bold text-pearlWhite tracking-tight mb-1">Audit Log</h2>
					<p className="text-[10px] font-mono text-palePeriwinkle/40 tracking-widest uppercase">Comprehensive Activity History</p>
				</div>
				<div className="relative w-full md:w-80">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-palePeriwinkle/30" />
					<input 
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Filter logs..."
						className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-royalBlue/40 transition-colors placeholder:text-palePeriwinkle/20"
					/>
				</div>
			</div>

			<div className="stat-card rounded-2xl overflow-hidden border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
				<div className="divide-y divide-white/5">
					{filteredActivities.map((activity) => (
						<div key={activity.id} className="px-8 py-6 flex gap-6 hover:bg-white/[0.02] transition-colors group">
							<div className={`mt-0.5 w-10 h-10 rounded-xl bg-${activity.color}/10 border border-${activity.color}/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
								<activity.icon className={`w-5 h-5 text-${activity.color}`} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between mb-1.5">
									<p className="text-[13px] font-bold text-pearlWhite uppercase tracking-wider">
										{activity.label}
									</p>
									<span className="text-[9px] text-palePeriwinkle/30 font-mono uppercase tracking-widest">
										{new Date(activity.timestamp).toLocaleString()}
									</span>
								</div>
								<p className="text-xs text-palePeriwinkle/50 font-mono leading-relaxed max-w-3xl">
									{activity.details}
								</p>
							</div>
						</div>
					))}
					{filteredActivities.length === 0 && (
						<div className="px-8 py-20 text-center">
							<ShieldCheck className="w-12 h-12 text-palePeriwinkle/10 mx-auto mb-4" />
							<p className="text-palePeriwinkle/30 font-mono text-sm uppercase tracking-widest">NO_RECORDS_MATCH_FILTER.SYS</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
