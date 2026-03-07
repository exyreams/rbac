import { Activity, Maximize2, Plus, Loader2, Lock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";

// Permission bits from program constants
const PERM_READ = BigInt(1) << BigInt(0);
const PERM_WRITE = BigInt(1) << BigInt(1);
const PERM_DELETE = BigInt(1) << BigInt(2);
const PERM_SUPER_ADMIN = BigInt(1) << BigInt(63);

export default function VaultDemo() {
	const { id } = useParams<{ id: string }>();
	const { program, wallet } = useAnchorProgram();
	const [organization, setOrganization] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [userPermissions, setUserPermissions] = useState<bigint>(BigInt(0));
	const [logs, setLogs] = useState<any[]>([]);

	const orgPubkey = useMemo(() => {
		try {
			return id ? new PublicKey(id) : null;
		} catch {
			return null;
		}
	}, [id]);

	const fetchData = async () => {
		if (!program || !orgPubkey || !wallet) return;

		try {
			setIsLoading(true);
			const orgAccount = await program.account.organization.fetch(orgPubkey);
			setOrganization(orgAccount);

			// Check if user is admin
			if (orgAccount.admin.toBase58() === wallet.publicKey.toBase58()) {
				setUserPermissions(PERM_SUPER_ADMIN | PERM_READ | PERM_WRITE | PERM_DELETE);
			} else {
				// Fetch membership
				const [membershipPda] = PublicKey.findProgramAddressSync(
					[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), wallet.publicKey.toBuffer()],
					program.programId
				);
				try {
					const membership = await program.account.membership.fetch(membershipPda);
					setUserPermissions(BigInt(membership.rolesBitmap.toString()) | BigInt(membership.cachedPermissions.toString()));
				} catch {
					setUserPermissions(BigInt(0));
				}
			}
		} catch (err) {
			console.error("Error fetching vault data:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [program, orgPubkey, wallet]);

	const addLog = (type: string, status: string, message: string) => {
		setLogs(prev => [
			{
				timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
				type,
				status,
				message
			},
			...prev
		].slice(0, 50));
	};

	const checkAccess = (required: bigint): boolean => {
		const hasAdmin = (userPermissions & PERM_SUPER_ADMIN) !== BigInt(0);
		const hasPerm = (userPermissions & required) !== BigInt(0);
		return hasAdmin || hasPerm;
	};

	const handleAction = (name: string, action: string, required: bigint) => {
		const granted = checkAccess(required);
		if (granted) {
			addLog(`${action}_SUCCESS`, "SUCCESS", `Performed ${action} on ${name}`);
			alert(`${action} successful on ${name}`);
		} else {
			addLog(`${action}_BLOCKED`, "DENIED", `Access denied for ${name} — Missing ${action} permission`);
			alert(`Access Denied: You do not have ${action} permission.`);
		}
	};

	if (isLoading) {
		return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-palePeriwinkle" /></div>;
	}

	const orgName = organization ? new TextDecoder().decode(Uint8Array.from(organization.name)).replace(/\0/g, "") : "Portal";
	const hasRead = checkAccess(PERM_READ);
	const hasWrite = checkAccess(PERM_WRITE);
	const hasDelete = checkAccess(PERM_DELETE);
	const hasAdmin = checkAccess(PERM_SUPER_ADMIN);

	return (
		<>
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 fade-in">
				<div>
					<div className="flex items-center gap-3 text-palePeriwinkle/40 text-xs font-mono mb-2">
						<Link to="/organizations" className="hover:text-palePeriwinkle flex items-center gap-1 transition-colors no-underline uppercase">
							<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
							</svg>
							ORGANIZATIONS
						</Link>
						<span>/</span>
						<Link to={`/org/${id}`} className="text-palePeriwinkle/60 no-underline hover:text-white uppercase transition-colors">{orgName}</Link>
					</div>
					<h1 className="text-3xl font-sans font-medium text-white">Vaults</h1>
				</div>
				<div className="relative group">
					<button 
						onClick={() => handleAction("NEW_VAULT", "WRITE", PERM_WRITE)}
						className={`px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(77,143,255,0.2)] flex items-center gap-2 cursor-pointer border-none font-mono text-xs ${hasWrite ? "bg-pearlWhite text-deepIndigo hover:bg-white" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
					>
						<Plus className="w-4 h-4" />
						CREATE_VAULT
					</button>
					{!hasWrite && (
						<span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-[125%] left-1/2 -translate-x-1/2 w-40 bg-royalBlue text-white text-center rounded-md p-2 text-[10px] font-mono border border-palePeriwinkle/20 z-50">
							Requires WRITE permission
						</span>
					)}
				</div>
			</div>

			<div className="glass-card rounded-2xl p-4 flex items-center justify-between mb-8 fade-in border-l-4 border-l-magentaViolet delay-100">
				<div className="flex items-center gap-3">
					<div className="w-2 h-2 bg-magentaViolet rounded-full animate-pulse"></div>
					<span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">
						On-Chain Permission Status
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className={`px-2.5 py-1 rounded border text-[9px] font-mono font-bold shadow-sm transition-opacity ${hasRead ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-white/5 border-white/10 text-white/20"}`}>
						READ
					</span>
					<span className={`px-2.5 py-1 rounded border text-[9px] font-mono font-bold shadow-sm transition-opacity ${hasWrite ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-white/5 border-white/10 text-white/20"}`}>
						WRITE
					</span>
					<span className={`px-2.5 py-1 rounded border text-[9px] font-mono font-bold shadow-sm transition-opacity ${hasDelete ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-white/20"}`}>
						DELETE
					</span>
					<span className={`px-2.5 py-1 rounded border text-[9px] font-mono font-bold shadow-sm transition-opacity ${hasAdmin ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/5 border-white/10 text-white/20"}`}>
						ADMIN
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 mb-12 fade-in delay-200">
				{/* Vault 1: CORE_CONFIG */}
				<div className="glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-magentaViolet/30 transition-all text-white">
					<div className="p-6 flex items-start justify-between">
						<div className="space-y-4 grow">
							<div className="flex items-center gap-4">
								<h3 className="text-lg font-mono font-bold text-white tracking-tight uppercase">
									CORE_CONFIG
								</h3>
								<span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-palePeriwinkle/60 font-bold">
									v1.2.3
								</span>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px] font-mono uppercase tracking-widest">
								<div>
									<span className="block text-palePeriwinkle/30 mb-1">
										Owner Address
									</span>
									<span className="text-palePeriwinkle/80 truncate block">{organization?.admin.toBase58()}</span>
								</div>
								<div>
									<span className="block text-palePeriwinkle/30 mb-1">
										Last Modified
									</span>
									<span className="text-palePeriwinkle/80">
										2026.03.05 14:22
									</span>
								</div>
								<div>
									<span className="block text-palePeriwinkle/30 mb-1">
										Data Snapshot
									</span>
									<span className="text-palePeriwinkle/80 lowercase italic truncate block">
										{'{ "net_id": 1, "gas_limit": "0x4c..." }'}
									</span>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<button onClick={() => handleAction("CORE_CONFIG", "READ", PERM_READ)} className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${hasRead ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20" : "bg-white/5 border-white/10 text-white/10"}`}>
								READ
							</button>
							<button onClick={() => handleAction("CORE_CONFIG", "WRITE", PERM_WRITE)} className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${hasWrite ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" : "bg-white/5 border-white/10 text-white/10"}`}>
								WRITE
							</button>
							<button onClick={() => handleAction("CORE_CONFIG", "DELETE", PERM_DELETE)} className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${hasDelete ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-white/5 border-white/10 text-white/10"}`}>
								DELETE
							</button>
						</div>
					</div>

					<div className={`bg-black/40 border-t border-white/5 p-6 relative ${!hasRead ? 'grayscale' : ''}`}>
						{!hasRead && (
							<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-deepIndigo/80 backdrop-blur-sm">
								<Lock className="w-6 h-6 text-red-500 mb-2" />
								<span className="text-[10px] font-mono text-white uppercase tracking-widest font-bold">Encrpyted_Data: Access_Denied</span>
							</div>
						)}
						<div className="flex items-center justify-between mb-4">
							<span className="text-[10px] font-mono text-green-400/60 uppercase tracking-widest">
								Previewing: application/json
							</span>
							<button className="text-palePeriwinkle/40 hover:text-white cursor-pointer bg-transparent border-none">
								<Maximize2 className="w-4 h-4" />
							</button>
						</div>
						<pre className="text-xs font-mono text-palePeriwinkle/90 bg-white/2 p-4 rounded-xl border border-white/5 overflow-x-auto leading-relaxed">
							{`{
  "protocol_version": "1.0.4",
  "auth_endpoints": ["https://node-1.rbac.sys", "https://node-2.rbac.sys"],
  "dynamic_refresh_rate": 300,
  "failover_enabled": true,
  "checksum": "sha256:8f43...e01"
}`}
						</pre>
					</div>
				</div>

				{/* Vault 2: TREASURY_STATE */}
				<div className="glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-magentaViolet/30 transition-all text-white">
					<div className="p-6 flex items-start justify-between">
						<div className="space-y-4 grow">
							<div className="flex items-center gap-4">
								<h3 className="text-lg font-mono font-bold text-white tracking-tight uppercase">
									TREASURY_STATE
								</h3>
								<span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-palePeriwinkle/60 font-bold">
									v2.0.1
								</span>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[10px] font-mono uppercase tracking-widest">
								<div>
									<span className="block text-palePeriwinkle/30 mb-1">
										Balance
									</span>
									<span className="text-palePeriwinkle/80">14,250.55 SOL</span>
								</div>
								<div>
									<span className="block text-palePeriwinkle/30 mb-1">
										Allocated
									</span>
									<span className="text-palePeriwinkle/80">
										2,100.00 SOL
									</span>
								</div>
								<div>
									<span className="block text-palePeriwinkle/30 mb-1">
										Risk Status
									</span>
									<span className="text-green-400 font-bold">OPTIMAL</span>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<button onClick={() => handleAction("TREASURY_STATE", "READ", PERM_READ)} className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${hasRead ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20" : "bg-white/5 border-white/10 text-white/10"}`}>
								READ
							</button>
							<button onClick={() => handleAction("TREASURY_STATE", "WRITE", PERM_WRITE)} className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${hasWrite ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" : "bg-white/5 border-white/10 text-white/10"}`}>
								WRITE
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="glass-card rounded-2xl border-l-2 border-l-magentaViolet overflow-hidden fade-in shadow-2xl delay-300 mb-20 text-white">
				<div className="p-4 bg-white/2 border-b border-white/5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Activity className="w-4 h-4 text-magentaViolet" />
						<h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
							Access Activity Log
						</h4>
					</div>
				</div>
				<div className="max-h-60 overflow-y-auto">
					<table className="w-full text-left">
						<tbody className="text-[10px] font-mono">
							{logs.map((log, i) => (
								<tr key={i} className="border-b border-white/5 hover:bg-white/1 transition-colors">
									<td className="p-4 text-palePeriwinkle/30 w-40">
										{log.timestamp}
									</td>
									<td className="p-4 w-40">
										<span className={`px-1.5 py-0.5 rounded border ${log.status === "SUCCESS" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
											{log.type}
										</span>
									</td>
									<td className="p-4 text-palePeriwinkle/80">
										{log.message}
									</td>
								</tr>
							))}
							{logs.length === 0 && (
								<tr>
									<td colSpan={3} className="p-12 text-center text-palePeriwinkle/20 italic tracking-widest uppercase">SYSTEM_AWAITING_INPUT.EXE</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
