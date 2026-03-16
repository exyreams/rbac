import {
	PlusSquare,
	UserPlus,
	Loader2,
	ChevronDown,
	ChevronRight,
	Search,
	Clock,
	Terminal,
	ExternalLink,
	ShieldCheck,
	UserCheck,
	Copy
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useOrganizationHistory } from "../../hooks/useOrganizationData";

export default function OrganizationHistory() {
	const { id } = useParams<{ id: string }>();
	const { data: activitiesRaw = [], isLoading } = useOrganizationHistory(id);
	const [searchTerm, setSearchTerm] = useState("");
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const activities = useMemo(() => {
		return activitiesRaw.map(activity => {
			let icon = Terminal;
			let color = "palePeriwinkle";

			switch (activity.type) {
				case "SYSTEM_INIT":
					icon = Terminal;
					color = "green";
					break;
				case "ROLE_DEFINE":
					icon = PlusSquare;
					color = "magentaViolet";
					break;
				case "MEMSHIP_SYNC":
					icon = UserPlus;
					color = "royalBlue";
					break;
				case "ROLE_ASSIGN":
					icon = UserCheck;
					color = "emerald-400";
					break;
				case "ROLE_REVOKE":
					icon = ShieldCheck;
					color = "red-400";
					break;
			}

			return { ...activity, icon, color };
		});
	}, [activitiesRaw]);

	const filteredActivities = useMemo(() => {
		return activities.filter(a => 
			a.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
			a.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
			a.signature.toLowerCase().includes(searchTerm.toLowerCase())
		);
	}, [activities, searchTerm]);

	const toggleExpand = (id: string) => {
		setExpandedId(expandedId === id ? null : id);
	};

	if (isLoading && activities.length === 0) {
		return (
			<div className="flex justify-center py-20">
				<Loader2 className="w-8 h-8 text-royalBlue animate-spin" />
			</div>
		);
	}

	return (
		<div className="fade-in max-w-[1400px] mx-auto">
			<div className="flex justify-between items-center mb-8">
				<div className="relative w-full max-w-lg">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-palePeriwinkle/60" />
					<input 
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search via signature, label or wallet..."
						className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-pearlWhite focus:outline-none focus:border-royalBlue transition-all placeholder:text-palePeriwinkle/40 font-mono shadow-inner"
					/>
				</div>
				<div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-palePeriwinkle font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/5">
					<div className="flex items-center gap-2">
						<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
						LIVE_INDEXER: ACTIVE
					</div>
					<span className="opacity-20">|</span>
					<div className="flex items-center gap-2">
						<Clock className="w-3.5 h-3.5 text-royalBlue" />
						SYNC: LAST_SLOT_249,103,112
					</div>
				</div>
			</div>

			<div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A0F1E]/80 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="border-b border-white/10 bg-white/5">
							<th className="px-8 py-5 text-[11px] font-mono font-bold text-pearlWhite uppercase tracking-widest">Sig / TX Hash</th>
							<th className="px-6 py-5 text-[11px] font-mono font-bold text-pearlWhite uppercase tracking-widest">Operation</th>
							<th className="px-6 py-5 text-[11px] font-mono font-bold text-pearlWhite uppercase tracking-widest">Actor</th>
							<th className="px-6 py-5 text-[11px] font-mono font-bold text-pearlWhite uppercase tracking-widest">Status</th>
							<th className="px-8 py-5 text-[11px] font-mono font-bold text-pearlWhite uppercase tracking-widest text-right">Timestamp</th>
							<th className="px-4 py-5 w-12"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/10">
						{filteredActivities.map((activity) => (
							<React.Fragment key={activity.id}>
								<tr 
									onClick={() => toggleExpand(activity.id)}
									className={`group cursor-pointer transition-all duration-150 ${expandedId === activity.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
								>
									<td className="px-8 py-5">
										<div className="flex items-center gap-3">
											<span className="text-[11px] font-mono text-royalBlue font-black tracking-tight">{activity.signature}</span>
											<div className="flex items-center gap-1.5 opacity-100 transition-opacity">
												<button 
													onClick={(e) => {
														e.stopPropagation();
														navigator.clipboard.writeText(activity.fullSig);
													}}
													className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
													title="Copy Signature"
												>
													<Copy className="w-3 h-3" />
												</button>
												<a 
													href={`https://explorer.solana.com/tx/${activity.fullSig}?cluster=devnet`}
													target="_blank"
													rel="noopener noreferrer"
													onClick={(e) => e.stopPropagation()}
													className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
												>
													<ExternalLink className="w-3 h-3" />
												</a>
											</div>
										</div>
									</td>
									<td className="px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="p-1.5 rounded-lg border border-white/10 bg-white/5 shadow-sm">
												<activity.icon className="w-4 h-4 text-pearlWhite/70" />
											</div>
											<span className="text-[11px] font-mono font-bold text-pearlWhite tracking-tighter uppercase">{activity.label}</span>
										</div>
									</td>
									<td className="px-6 py-5">
										<div className="flex items-center gap-3">
											<span className="text-[11px] font-mono text-palePeriwinkle font-bold uppercase tracking-tight">{activity.actor}</span>
											<div className="flex items-center gap-1.5">
												<button 
													onClick={(e) => {
														e.stopPropagation();
														navigator.clipboard.writeText(activity.fullActor);
													}}
													className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
													title="Copy Address"
												>
													<Copy className="w-3 h-3" />
												</button>
												<a 
													href={`https://explorer.solana.com/address/${activity.fullActor}?cluster=devnet`}
													target="_blank"
													rel="noopener noreferrer"
													onClick={(e) => e.stopPropagation()}
													className="p-1 hover:bg-white/10 rounded transition-colors text-palePeriwinkle/40 hover:text-royalBlue"
												>
													<ExternalLink className="w-3 h-3" />
												</a>
											</div>
										</div>
									</td>
									<td className="px-6 py-5">
										<span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
											activity.status === 'Finalized' 
												? 'text-green-400 bg-green-400/10 border-green-400/20' 
												: 'text-royalBlue bg-royalBlue/10 border-royalBlue/20'
										}`}>
											{activity.status}
										</span>
									</td>
									<td className="px-8 py-5 text-right">
										<span className="text-[11px] font-mono text-palePeriwinkle font-bold">
											{new Date(activity.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
										</span>
									</td>
									<td className="px-4 py-5 text-center">
										{expandedId === activity.id ? 
											<ChevronDown className="w-5 h-5 text-royalBlue" /> : 
											<ChevronRight className="w-5 h-5 text-palePeriwinkle/30 group-hover:text-royalBlue transition-colors" />
										}
									</td>
								</tr>
								{expandedId === activity.id && (
									<tr className="bg-white/3 border-t border-white/5 shadow-inner">
										<td colSpan={6} className="px-10 py-10">
											<div className="max-w-6xl mx-auto space-y-10">
												{/* Top Metrics Strip */}
												<div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/5">
													<div className="flex items-center gap-10">
														<div className="space-y-1">
															<span className="text-[9px] font-mono text-palePeriwinkle/30 border-b border-white/5 pb-0.5 uppercase tracking-[0.2em] font-black block">Anchor Slot</span>
															<div className="text-[14px] font-mono text-pearlWhite font-black">{activity.slot}</div>
														</div>
														<div className="space-y-1">
															<span className="text-[9px] font-mono text-palePeriwinkle/30 border-b border-white/5 pb-0.5 uppercase tracking-[0.2em] font-black block">Network Fee</span>
															<div className="text-[14px] font-mono text-pearlWhite font-black">{activity.fee}</div>
														</div>
														<div className="space-y-1">
															<span className="text-[9px] font-mono text-palePeriwinkle/30 border-b border-white/5 pb-0.5 uppercase tracking-[0.2em] font-black block">Confirmation</span>
															<div className={`text-[12px] font-mono font-black uppercase tracking-tight ${
																activity.status === 'Finalized' ? 'text-green-400' : 'text-royalBlue'
															}`}>
																{activity.status}
															</div>
														</div>
													</div>
													
													<div className="flex items-center gap-4">
														<div className="hidden sm:flex flex-col items-end gap-1">
															<span className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-[0.2em] font-black">Transaction Hash</span>
															<span className="text-[10px] font-mono text-palePeriwinkle/40 truncate max-w-[120px]">{activity.fullSig}</span>
														</div>
														<a 
															href={`https://explorer.solana.com/tx/${activity.fullSig}?cluster=devnet`}
															target="_blank"
															rel="noopener noreferrer"
															className="bg-royalBlue/10 hover:bg-royalBlue/20 border border-royalBlue/30 hover:border-royalBlue/50 p-2.5 rounded-lg text-royalBlue transition-all group/exp"
															title="View on Solana Explorer"
														>
															<ExternalLink className="w-4 h-4 group-hover/exp:scale-110 transition-transform" />
														</a>
													</div>
												</div>

												{/* Audit Report Content */}
												<div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
													{/* Execution Summary - 2 cols */}
													<div className="lg:col-span-2 space-y-6">
														<div className="space-y-4">
															<div className="flex items-center gap-2">
																<div className={`w-1 h-3 rounded-full bg-${activity.color}`}></div>
																<h4 className="text-[11px] font-mono font-black text-pearlWhite/60 uppercase tracking-[0.3em]">Execution Summary</h4>
															</div>
															<div className="bg-white/2 rounded-xl border border-white/5 p-4">
																<p className="text-[14px] text-pearlWhite font-sans font-medium leading-relaxed">
																	{activity.details}
																</p>
															</div>
														</div>

														<div className="space-y-4 pt-6">
															<div className="flex items-center gap-2">
																<div className="w-1 h-3 rounded-full bg-palePeriwinkle/20"></div>
																<h4 className="text-[11px] font-mono font-black text-pearlWhite/40 uppercase tracking-[0.3em]">Authority context</h4>
															</div>
															<div className="bg-white/2 rounded-xl border border-white/5 p-4 font-mono">
																<div className="text-[9px] text-palePeriwinkle/20 uppercase tracking-widest font-black mb-1">Actor Key</div>
																<div className="text-[11px] text-pearlWhite break-all opacity-80">{activity.fullSig}</div>
															</div>
														</div>
													</div>

													{/* Terminal Logs - 3 cols */}
													<div className="lg:col-span-3 space-y-4">
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<div className="w-1 h-3 rounded-full bg-royalBlue/40"></div>
																<h4 className="text-[11px] font-mono font-black text-royalBlue uppercase tracking-[0.3em]">On-Chain_Trace</h4>
															</div>
															<div className="text-[9px] font-mono text-palePeriwinkle/20 uppercase font-black">Buffer: 0x00..{activity.id.slice(-4)}</div>
														</div>
														
														<div className="bg-[#050811] rounded-2xl border border-white/5 shadow-2xl overflow-hidden group/terminal relative">
															{/* Subtle scanline effect */}
															<div className="absolute inset-0 pointer-events-none bg-size-[100%_2px] bg-linear-to-b from-transparent via-white/2 to-transparent opacity-20"></div>
															
															<div className="h-[280px] overflow-y-auto custom-scrollbar p-6 font-mono text-[10px] space-y-2 relative">
																{activity.rawLogs.map((log: string, idx: number) => (
																	<div key={idx} className="flex gap-4 group/line">
																		<span className="text-white/10 shrink-0 tabular-nums font-black w-6">{idx + 1}</span>
																		<span className={`break-all tracking-tight ${
																			log.includes('success') ? 'text-green-400 font-bold' : 
																			log.includes('invoke') ? 'text-royalBlue/60' : 
																			log.includes('Instruction:') ? 'text-magentaViolet/90 font-black tracking-widest' : 
																			'text-palePeriwinkle/60'
																		}`}>
																			{log}
																		</span>
																	</div>
																))}
																{activity.rawLogs.length === 0 && (
																	<div className="flex flex-col items-center justify-center h-full opacity-10 text-center gap-2">
																		<Terminal className="w-8 h-8" />
																		<span className="text-[9px] uppercase tracking-[0.3em] font-black">NO_TRACE_INDEXED</span>
																	</div>
																)}
															</div>
														</div>
													</div>
												</div>
											</div>
										</td>
									</tr>
								)}
							</React.Fragment>
						))}
					</tbody>
				</table>
				{filteredActivities.length === 0 && (
					<div className="py-24 text-center border-t border-white/5">
						<Terminal className="w-16 h-16 text-palePeriwinkle/5 mx-auto mb-4" />
						<p className="text-palePeriwinkle/60 font-mono text-sm uppercase tracking-[0.3em] font-bold mb-4">OPERATIONS_LOG_EMPTY.SYS</p>
						<a 
							href={`https://explorer.solana.com/address/${id}?cluster=devnet`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[10px] font-mono text-royalBlue/60 hover:text-royalBlue transition-colors uppercase tracking-widest font-bold"
						>
							[ VIEW_ON_CHAIN_EXPLORER ]
						</a>
					</div>
				)}
			</div>
		</div>
	);
}

import React from "react";
