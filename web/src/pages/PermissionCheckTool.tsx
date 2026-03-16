import {
	ShieldCheck,
	Loader2,
	Check,
	AlertCircle,
	ChevronDown,
	Activity,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAnchorProgram } from "../hooks/useAnchorProgram";
import { usePermissibleOrganizations } from "../hooks/useOrganizationData";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Permission bits from program constants
const PERM_READ = BigInt(1) << BigInt(0);
const PERM_WRITE = BigInt(1) << BigInt(1);
const PERM_DELETE = BigInt(1) << BigInt(2);
const PERM_SUPER_ADMIN = BigInt(1) << BigInt(63);

const PERMISSIONS = [
	{ id: "read", label: "READ", bit: PERM_READ, color: "green", glow: "rgba(34, 197, 94, 0.2)" },
	{ id: "write", label: "WRITE", bit: PERM_WRITE, color: "blue", glow: "rgba(59, 130, 246, 0.2)" },
	{ id: "delete", label: "DELETE", bit: PERM_DELETE, color: "red", glow: "rgba(239, 68, 68, 0.2)" },
	{ id: "admin", label: "ADMIN", bit: PERM_SUPER_ADMIN, color: "amber", glow: "rgba(245, 158, 11, 0.2)" },
];

export default function PermissionCheckTool() {
	const { program, wallet } = useAnchorProgram();
	const { data: orgs = [], isLoading: isLoadingOrgs } = usePermissibleOrganizations();
	const [selectedOrgId, setSelectedOrgId] = useState<string>("");
	const [memberAddress, setMemberAddress] = useState("");
	const [selectedPermId, setSelectedPermId] = useState("read");
	const [isChecking, setIsChecking] = useState(false);
	const [checkResult, setCheckResult] = useState<{
		granted: boolean;
		timestamp: string;
		organization: string;
		member: string;
		permission: string;
		source: string;
		cacheStatus: string;
	} | null>(null);

	// Set initial selection once orgs load
	useMemo(() => {
		if (orgs.length > 0 && !selectedOrgId) {
			setSelectedOrgId(orgs[0].publicKey.toBase58());
		}
	}, [orgs, selectedOrgId]);


	const handleCheckPermission = async () => {
		if (!program || !selectedOrgId || !memberAddress) return;

		try {
			setIsChecking(true);
			const orgPubkey = new PublicKey(selectedOrgId);
			const memberPubkey = new PublicKey(memberAddress);
			const perm = PERMISSIONS.find(p => p.id === selectedPermId)!;

			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), memberPubkey.toBuffer()],
				program.programId
			);

			try {
				await program.methods
					.checkPermission(new anchor.BN(perm.bit.toString()))
					.accounts({
						member: memberPubkey,
						organization: orgPubkey,
						membership: membershipPda,
					} as any)
					.rpc();

				setCheckResult({
					granted: true,
					timestamp: new Date().toLocaleTimeString(),
					organization: orgs.find(o => o.publicKey.toBase58() === selectedOrgId)?.name || "Unknown",
					member: memberAddress,
					permission: perm.label,
					source: perm.id === "admin" ? "ADMIN_ROLE" : "ASSIGNED_ROLE",
					cacheStatus: "FRESH",
				});
			} catch (err: any) {
				setCheckResult({
					granted: false,
					timestamp: new Date().toLocaleTimeString(),
					organization: orgs.find(o => o.publicKey.toBase58() === selectedOrgId)?.name || "Unknown",
					member: memberAddress,
					permission: perm.label,
					source: "NONE_OR_REVOKED",
					cacheStatus: "MISS",
				});
			}
		} catch (err) {
			console.error("Check failed:", err);
		} finally {
			setIsChecking(false);
		}
	};

	const handleRefreshPermissions = async () => {
		if (!program || !wallet || !selectedOrgId || !memberAddress) return;
		try {
			const orgPubkey = new PublicKey(selectedOrgId);
			const memberPubkey = new PublicKey(memberAddress);
			
			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), memberPubkey.toBuffer()],
				program.programId
			);

			const membershipData = await program.account.membership.fetch(membershipPda);
			const rolesBitmap = BigInt(membershipData.rolesBitmap.toString());

			const roleAccounts = [];
			for (let i = 0; i < 64; i++) {
				if ((rolesBitmap & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
					const [rPda] = PublicKey.findProgramAddressSync(
						[new TextEncoder().encode("role"), orgPubkey.toBuffer(), new Uint8Array([i])],
						program.programId
					);
					roleAccounts.push({ pubkey: rPda, isWritable: false, isSigner: false });
				}
			}

			await program.methods
				.refreshPermissions()
				.accounts({
					signer: wallet.publicKey,
					organization: orgPubkey,
					membership: membershipPda,
				} as any)
				.remainingAccounts(roleAccounts)
				.rpc();
			
			alert("Permissions successfully synchronized with on-chain role registry.");
		} catch (err) {
			console.error("Refresh failed:", err);
		}
	};

	return (
		<>
			<div className="mb-8 fade-in text-white">
				<div className="flex items-end justify-between">
					<div>
						<h1 className="text-3xl font-sans font-medium text-white tracking-tight">
							Security Validator
						</h1>
						<p className="font-mono text-[9px] text-royalBlue/60 tracking-[0.3em] uppercase">
							on_chain_permission_check.sys
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-6 fade-in delay-100 text-white items-start">
				<div className="col-span-12 lg:col-span-4 space-y-4">
					<div className="glass-card glass-card-no-shift rounded-xl border-l border-l-magentaViolet/50 p-6 shadow-2xl">
						<h3 className="font-mono text-[8px] font-bold text-palePeriwinkle/50 tracking-[0.3em] uppercase mb-6">
							VALIDATION_INPUTS
						</h3>

						<div className="space-y-6">
							<div>
								<label className="block text-[9px] font-mono text-palePeriwinkle/40 uppercase mb-2 tracking-widest">
									Organization_ID
								</label>
								<div className="relative">
									<select 
										value={selectedOrgId}
										onChange={(e) => setSelectedOrgId(e.target.value)}
										className="w-full px-3 py-3 rounded-lg font-mono text-[11px] appearance-none pr-10 bg-black/40 border border-white/5 text-white focus:outline-none focus:border-royalBlue/50 transition-all shadow-inner"
									>
										{isLoadingOrgs ? (
											<option>Synchronizing...</option>
										) : orgs.length === 0 ? (
                                            <option>No Authorized Orgs</option>
                                        ) : (
											orgs.map(org => (
												<option key={org.publicKey.toBase58()} value={org.publicKey.toBase58()}>{org.name}</option>
											))
										)}
									</select>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
										<ChevronDown className="w-3.5 h-3.5 text-white" />
									</div>
								</div>
							</div>

							<div>
								<label className="block text-[9px] font-mono text-palePeriwinkle/40 uppercase mb-2 tracking-widest">
									Identity_Address
								</label>
								<div className="relative">
									<input
										type="text"
										value={memberAddress}
										onChange={(e) => setMemberAddress(e.target.value)}
										placeholder="Paste wallet pubkey"
										className="w-full px-3 py-3 rounded-lg font-mono text-[11px] pr-10 bg-black/40 border border-white/5 text-white focus:outline-none focus:border-royalBlue/50 transition-all placeholder:text-white/10 shadow-inner"
									/>
									<button 
										onClick={() => wallet?.publicKey && setMemberAddress(wallet.publicKey.toBase58())}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-palePeriwinkle/40 hover:text-royalBlue transition-colors bg-transparent border-none cursor-pointer"
										title="Auto-fill session wallet"
									>
										<ShieldCheck className="w-4 h-4" />
									</button>
								</div>
							</div>

							<div>
								<label className="block text-[9px] font-mono text-palePeriwinkle/60 uppercase mb-3 tracking-widest">
									Permission_Tier
								</label>
								<div className="grid grid-cols-2 gap-2.5">
									{PERMISSIONS.map(perm => (
										<button 
											key={perm.id}
											onClick={() => setSelectedPermId(perm.id)}
											className={`flex flex-col items-center justify-center p-3.5 rounded-lg border transition-all cursor-pointer ${selectedPermId === perm.id ? `border-${perm.color}-500/30 bg-${perm.color}-500/5 text-${perm.color}-400 shadow-[0_0_15px_${perm.glow}]` : "border-white/5 bg-white/2 text-palePeriwinkle/40 hover:bg-white/5"}`}
										>
											<span className="font-mono text-[9px] font-bold tracking-widest uppercase">{perm.label}</span>
										</button>
									))}
								</div>
							</div>

							<div className="pt-2">
								<button 
									onClick={handleCheckPermission}
									disabled={isChecking || !selectedOrgId || !memberAddress}
									className="group w-full py-3.5 bg-royalBlue hover:bg-royalBlue/80 text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-[0.25em] shadow-lg transition-all cursor-pointer border-none disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-2"
								>
									{isChecking ? (
										<>
											<Loader2 className="w-3.5 h-3.5 animate-spin text-white/50" />
											<span>EXECUTING...</span>
										</>
									) : (
										<>
											<span>RUN_VALIDATION</span>
											<Activity className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
										</>
									)}
								</button>
							</div>
						</div>
					</div>

					<div className="bg-black/20 backdrop-blur-md rounded-xl p-5 border border-white/5">
						<div className="flex gap-4 items-center">
							<div className="w-8 h-8 rounded bg-royalBlue/10 flex items-center justify-center text-royalBlue shrink-0">
								<Activity className="w-3.5 h-3.5" />
							</div>
							<div>
								<p className="text-[10px] font-medium text-white/80">
									Deterministic Proofs
								</p>
								<p className="text-[8px] text-palePeriwinkle/40 font-mono leading-relaxed uppercase tracking-widest">
									On-chain program verification logic.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="col-span-12 lg:col-span-8 space-y-4">
					{checkResult ? (
						<div className={`glass-card glass-card-no-shift rounded-xl border-l p-6 overflow-hidden relative shadow-2xl ${checkResult.granted ? "border-l-green-500/40" : "border-l-red-500/40"}`}>
							<div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-[80px] opacity-[0.1] ${checkResult.granted ? "bg-green-500" : "bg-red-500"}`}></div>

							<div className="flex items-center gap-5 mb-8 relative z-10">
								<div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border backdrop-blur-sm ${checkResult.granted ? "bg-green-500/10 border-green-500/20 text-green-400 shadow-md" : "bg-red-500/10 border-red-500/20 text-red-400 shadow-md"}`}>
									{checkResult.granted ? <Check className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
								</div>
								<div>
									<h2 className={`text-xl font-mono font-bold tracking-[0.15em] ${checkResult.granted ? "text-green-400" : "text-red-400"}`}>
										{checkResult.granted ? "ACCESS_GRANTED" : "ACCESS_DENIED"}
									</h2>
									<p className="text-[8px] font-mono text-palePeriwinkle/40 tracking-widest mt-1 uppercase flex items-center gap-2">
										COMPLETED: {checkResult.timestamp}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-x-8 gap-y-5 font-mono relative z-10">
								<div className="flex flex-col gap-1.5 py-3 border-b border-white/5">
									<span className="text-[8px] text-palePeriwinkle/40 uppercase tracking-[0.2em]">
										Entity.Organization
									</span>
									<span className="text-xs text-white/80">{checkResult.organization.toUpperCase()}</span>
								</div>
								<div className="flex flex-col gap-1.5 py-3 border-b border-white/5">
									<span className="text-[8px] text-palePeriwinkle/40 uppercase tracking-[0.2em]">
										Protocol.Tier
									</span>
									<span className={`text-xs font-bold tracking-widest ${checkResult.granted ? "text-green-400" : "text-red-400"}`}>{checkResult.permission}</span>
								</div>
								<div className="flex flex-col gap-1.5 py-3 border-b border-white/5 col-span-2">
									<span className="text-[8px] text-palePeriwinkle/40 uppercase tracking-[0.2em]">
										Entity.Identity
									</span>
									<span className="text-xs text-white/80 truncate">{checkResult.member}</span>
								</div>
								<div className="flex items-center justify-between py-3 col-span-2">
									<span className="text-[8px] text-palePeriwinkle/40 uppercase tracking-[0.2em]">
										Node_Cache
									</span>
									<div className="flex items-center gap-2">
										<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 ${checkResult.cacheStatus === "FRESH" ? "text-green-400/70" : "text-amber-400/70"}`}>{checkResult.cacheStatus}</span>
										<div className={`w-1 h-1 rounded-full ${checkResult.cacheStatus === "FRESH" ? "bg-green-400" : "bg-amber-400"} animate-pulse`}></div>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="glass-card glass-card-no-shift rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[380px] border-dashed border-white/5 overflow-hidden relative">
							<div className="absolute inset-0 opacity-[0.02] select-none pointer-events-none">
                                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white to-transparent"></div>
                                <div className="grid grid-cols-12 h-full">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="border-r border-white/10 h-full"></div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-center text-palePeriwinkle/10 mb-6 relative z-10">
								<Activity className="w-7 h-7" />
							</div>
							<p className="text-palePeriwinkle/40 font-mono text-[9px] uppercase tracking-[0.3em] relative z-10">Awaiting_Command_Sequence</p>
                            <p className="text-white/5 font-mono text-[60px] font-black absolute bottom-4 select-none uppercase tracking-tighter opacity-50">VERIFY</p>
						</div>
					)}

					<div className="glass-card glass-card-no-shift rounded-xl p-5 border-l border-l-royalBlue/40 flex items-center justify-between gap-4 group hover:border-l-royalBlue transition-all bg-black/10">
						<div className="flex items-center gap-4">
							<div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                            </div>
							<div className="font-mono">
								<p className="text-[9px] text-palePeriwinkle/50 tracking-[0.15em] uppercase font-bold">
									Cache_Sync
								</p>
								<p className="text-[10px] text-white/70 mt-0.5 leading-relaxed max-w-sm">
									Force-sync local permission bits with on-chain role registry.
								</p>
							</div>
						</div>
						<button 
							onClick={handleRefreshPermissions}
							className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/50 hover:text-white rounded-lg uppercase tracking-widest hover:bg-white/10 hover:border-royalBlue/30 transition-all cursor-pointer whitespace-nowrap"
						>
							SYNC_PERMISSIONS
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
