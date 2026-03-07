import {
	ShieldCheck,
	Loader2,
	Check,
	AlertCircle,
	ChevronDown,
	Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAnchorProgram } from "../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// Permission bits from program constants
const PERM_READ = BigInt(1) << BigInt(0);
const PERM_WRITE = BigInt(1) << BigInt(1);
const PERM_DELETE = BigInt(1) << BigInt(2);
const PERM_SUPER_ADMIN = BigInt(1) << BigInt(63);

const PERMISSIONS = [
	{ id: "read", label: "READ", bit: PERM_READ, color: "green" },
	{ id: "write", label: "WRITE", bit: PERM_WRITE, color: "blue" },
	{ id: "delete", label: "DELETE", bit: PERM_DELETE, color: "red" },
	{ id: "admin", label: "ADMIN", bit: PERM_SUPER_ADMIN, color: "amber" },
];

export default function PermissionCheckTool() {
	const { program, wallet } = useAnchorProgram();
	const [orgs, setOrgs] = useState<any[]>([]);
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
	const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

	useEffect(() => {
		const fetchOrgs = async () => {
			if (!program || !wallet) return;
			try {
				setIsLoadingOrgs(true);
				// Fetch orgs where user is admin
				const adminOrgs = await program.account.organization.all([
					{
						memcmp: {
							offset: 8 + 32, // discriminator + admin(32)
							bytes: wallet.publicKey.toBase58(),
						},
					},
				]);

				// Fetch memberships for the user
				const userMemberships = await program.account.membership.all([
					{
						memcmp: {
							offset: 8 + 32, // discriminator + org(32)
							bytes: wallet.publicKey.toBase58(),
						},
					},
				]);

				const memberOrgPubkeys = userMemberships.map(m => (m.account as any).organization);
				const memberOrgs = await Promise.all(
					memberOrgPubkeys.map(pubkey => program.account.organization.fetch(pubkey))
				);

				const combined = [
					...adminOrgs.map(o => ({ 
						publicKey: o.publicKey, 
						name: new TextDecoder().decode(Uint8Array.from((o.account as any).name)).replace(/\0/g, "") 
					})),
					...memberOrgs.map((o, i) => ({ 
						publicKey: memberOrgPubkeys[i], 
						name: new TextDecoder().decode(Uint8Array.from((o as any).name)).replace(/\0/g, "") 
					}))
				];

				// Deduplicate
				const unique = combined.filter((v, i, a) => a.findIndex(t => t.publicKey.toBase58() === v.publicKey.toBase58()) === i);
				setOrgs(unique);
				if (unique.length > 0) setSelectedOrgId(unique[0].publicKey.toBase58());
			} catch (err) {
				console.error("Error fetching orgs:", err);
			} finally {
				setIsLoadingOrgs(false);
			}
		};

		fetchOrgs();
	}, [program, wallet]);

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

			// We use the check_permission instruction to verify on-chain (will throw error if failed)
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
					timestamp: new Date().toISOString(),
					organization: orgs.find(o => o.publicKey.toBase58() === selectedOrgId)?.name || "Unknown",
					member: memberAddress,
					permission: perm.label,
					source: perm.id === "admin" ? "ADMIN_ROLE" : "ASSIGNED_ROLE",
					cacheStatus: "FRESH",
				});
			} catch (err: any) {
				setCheckResult({
					granted: false,
					timestamp: new Date().toISOString(),
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

			// Helper: Build remaining_accounts for role PDAs from a bitmap
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
			
			alert("Permissions refreshed successfully!");
		} catch (err) {
			console.error("Refresh failed:", err);
		}
	};

	return (
		<>
			<div className="mb-10 fade-in text-white">
				<div className="flex items-center gap-3 text-palePeriwinkle/40 text-xs font-mono mb-2">
					<span className="uppercase">SYSTEM</span>
					<span>/</span>
					<span className="text-white uppercase">Check</span>
				</div>
				<div className="flex items-end justify-between">
					<div>
						<h1 className="text-3xl font-sans font-medium text-white">
							Permission Check
						</h1>
						<p className="font-mono text-[10px] text-palePeriwinkle/40 tracking-[0.3em] mt-2">
							VERIFY_ACCESS.EXE
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-8 fade-in delay-100 text-white">
				<div className="col-span-12 lg:col-span-5 space-y-6">
					<div className="glass-card rounded-2xl border-l-2 border-l-magentaViolet p-8">
						<h3 className="font-mono text-[10px] font-bold text-palePeriwinkle/40 tracking-widest uppercase mb-6">
							Input Form
						</h3>

						<div className="space-y-6">
							<div>
								<label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase mb-2 tracking-widest">
									Organization
								</label>
								<div className="relative">
									<select 
										value={selectedOrgId}
										onChange={(e) => setSelectedOrgId(e.target.value)}
										className="w-full px-4 py-3 rounded-xl font-mono text-xs appearance-none pr-10 bg-deepIndigo/50 border border-palePeriwinkle/15 text-white focus:outline-none focus:border-palePeriwinkle transition-colors"
									>
										{isLoadingOrgs ? (
											<option>Loading...</option>
										) : (
											orgs.map(org => (
												<option key={org.publicKey.toBase58()} value={org.publicKey.toBase58()}>{org.name}</option>
											))
										)}
									</select>
									<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
										<ChevronDown className="w-4 h-4 text-white" />
									</div>
								</div>
								<span className="mt-2 block font-mono text-[9px] text-palePeriwinkle/30 px-1 truncate">
									{selectedOrgId}
								</span>
							</div>

							<div>
								<label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase mb-2 tracking-widest">
									Member Address
								</label>
								<div className="relative">
									<input
										type="text"
										value={memberAddress}
										onChange={(e) => setMemberAddress(e.target.value)}
										placeholder="Paste wallet address"
										className="w-full px-4 py-3 rounded-xl font-mono text-xs pr-12 bg-deepIndigo/50 border border-palePeriwinkle/15 text-white focus:outline-none focus:border-palePeriwinkle transition-colors"
									/>
									<button 
										onClick={() => wallet?.publicKey && setMemberAddress(wallet.publicKey.toBase58())}
										className="absolute right-4 top-1/2 -translate-y-1/2 text-palePeriwinkle/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
										title="Use my address"
									>
										<ShieldCheck className="w-4 h-4" />
									</button>
								</div>
							</div>

							<div>
								<label className="block text-[10px] font-mono text-palePeriwinkle/40 uppercase mb-2 tracking-widest">
									Permission Type
								</label>
								<div className="grid grid-cols-2 gap-3">
									{PERMISSIONS.map(perm => (
										<button 
											key={perm.id}
											onClick={() => setSelectedPermId(perm.id)}
											className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${selectedPermId === perm.id ? `border-${perm.color}-500/40 bg-${perm.color}-500/10 text-${perm.color}-400` : "border-white/5 bg-white/5 text-palePeriwinkle/40"}`}
										>
											<span className="font-mono text-xs font-bold">{perm.label}</span>
										</button>
									))}
								</div>
							</div>

							<div className="pt-2 flex items-center gap-4">
								<button 
									onClick={handleCheckPermission}
									disabled={isChecking || !selectedOrgId || !memberAddress}
									className="flex-1 py-4 bg-magentaViolet text-white rounded-xl font-mono text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(77,143,255,0.15)] hover:shadow-[0_0_25px_rgba(77,143,255,0.3)] transition-all cursor-pointer border-none disabled:opacity-50"
								>
									{isChecking ? "Verifying..." : "Check Permission"}
								</button>
								{isChecking && <Loader2 className="w-5 h-5 text-magentaViolet animate-spin" />}
							</div>
						</div>
					</div>

					<div className="glass-card rounded-2xl p-6">
						<h3 className="font-mono text-[10px] font-bold text-palePeriwinkle/40 tracking-widest uppercase mb-4">
							Security Summary
						</h3>
						<div className="space-y-3">
							<div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4">
								<div className="w-8 h-8 rounded bg-palePeriwinkle/10 flex items-center justify-center text-palePeriwinkle shrink-0">
									<ShieldCheck className="w-4 h-4" />
								</div>
								<div>
									<p className="text-xs font-medium text-white">
										Real-time verification
									</p>
									<p className="text-[9px] text-palePeriwinkle/40 font-mono mt-0.5 uppercase tracking-widest">
										Cross-checks on-chain state.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="col-span-12 lg:col-span-7 space-y-6">
					{checkResult ? (
						<div className={`glass-card rounded-2xl border-l-2 p-8 ${checkResult.granted ? "border-l-green-500/50" : "border-l-red-500/50"}`}>
							<div className="flex items-center gap-4 mb-8">
								<div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${checkResult.granted ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
									{checkResult.granted ? <Check className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
								</div>
								<div>
									<h2 className={`text-xl font-mono font-bold tracking-tight ${checkResult.granted ? "text-green-400" : "text-red-400"}`}>
										{checkResult.granted ? "PERMISSION_GRANTED" : "PERMISSION_DENIED"}
									</h2>
									<p className="text-[10px] font-mono text-palePeriwinkle/40 tracking-widest mt-1 uppercase">
										TIMESTAMP: {checkResult.timestamp}
									</p>
								</div>
							</div>

							<div className="space-y-4 font-mono">
								<div className="flex items-center justify-between py-3 border-b border-white/5">
									<span className="text-[10px] text-palePeriwinkle/30 uppercase tracking-widest">
										Organization
									</span>
									<span className="text-xs text-white">{checkResult.organization}</span>
								</div>
								<div className="flex items-center justify-between py-3 border-b border-white/5">
									<span className="text-[10px] text-palePeriwinkle/30 uppercase tracking-widest">
										Member
									</span>
									<span className="text-xs text-white truncate max-w-[200px]">{checkResult.member}</span>
								</div>
								<div className="flex items-center justify-between py-3 border-b border-white/5">
									<span className="text-[10px] text-palePeriwinkle/30 uppercase tracking-widest">
										Permission Type
									</span>
									<span className={`text-xs font-bold ${checkResult.granted ? "text-green-400" : "text-red-400"}`}>{checkResult.permission}</span>
								</div>
								<div className="flex items-center justify-between py-3">
									<span className="text-[10px] text-palePeriwinkle/30 uppercase tracking-widest">
										Cache Status
									</span>
									<div className="flex items-center gap-2">
										<span className={`text-xs ${checkResult.cacheStatus === "FRESH" ? "text-green-400" : "text-amber-400"}`}>{checkResult.cacheStatus}</span>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
							<div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-palePeriwinkle/20 mb-6">
								<Activity className="w-8 h-8" />
							</div>
							<p className="text-palePeriwinkle/20 font-mono text-sm uppercase tracking-[0.2em]">Awaiting_Command.log</p>
						</div>
					)}

					<div className="glass-card rounded-2xl p-6 border-l-2 border-l-palePeriwinkle/30 flex items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
							<div className="font-mono">
								<p className="text-[10px] text-palePeriwinkle/30 tracking-widest uppercase">
									Permission Cache
								</p>
								<p className="text-[11px] text-white/90">
									Ensure your on-chain permissions are up to date.
								</p>
							</div>
						</div>
						<button 
							onClick={handleRefreshPermissions}
							className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white rounded-lg uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
						>
							Refresh Permissions
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
