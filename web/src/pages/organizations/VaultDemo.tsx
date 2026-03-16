import { Activity, Maximize2, Plus, Loader2, Lock, RefreshCw, Trash2, Shield, Edit3, Server, Search, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Buffer } from "buffer";

// Permission bits from program constants
const PERM_READ = BigInt(1) << BigInt(0);
const PERM_WRITE = BigInt(1) << BigInt(1);
const PERM_DELETE = BigInt(1) << BigInt(2);
const PERM_SUPER_ADMIN = BigInt(1) << BigInt(63);

import { useQueryClient } from "@tanstack/react-query";
import { useOrganization, useOrganizationRoles, useUserMembership, useVaults } from "../../hooks/useOrganizationData";

export default function VaultDemo() {
	const { id } = useParams<{ id: string }>();
	const { program, vaultProgram, wallet } = useAnchorProgram();
	const queryClient = useQueryClient();

	const { data: organization, isLoading: isLoadingOrg } = useOrganization(id);
	const { data: roles = [], isLoading: isLoadingRoles } = useOrganizationRoles(id);
	const { data: vaults = [], isLoading: isLoadingVaults } = useVaults(id);
	const { data: userMembership, isLoading: isLoadingMembership } = useUserMembership(id);

	const [userPermissions, setUserPermissions] = useState<bigint>(BigInt(0));
	const [logs, setLogs] = useState<any[]>([]);
	const [isActionLoading, setIsActionLoading] = useState(false);
	
	// Create/Update Modal State
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newVaultLabel, setNewVaultLabel] = useState("");
	const [newVaultData, setNewVaultData] = useState("");
	const [editingVault, setEditingVault] = useState<any>(null);

	const isLoading = isLoadingOrg || isLoadingRoles || isLoadingVaults || isLoadingMembership;

	const orgPubkey = useMemo(() => {
		try {
			return id ? new PublicKey(id) : null;
		} catch {
			return null;
		}
	}, [id]);

	useEffect(() => {
		if (userMembership) {
			setUserPermissions(BigInt(userMembership.rolesBitmap.toString()) | BigInt(userMembership.cachedPermissions.toString()));
		} else if (organization && wallet) {
			if (organization.admin.toBase58() === wallet.publicKey.toBase58()) {
				setUserPermissions(PERM_SUPER_ADMIN | PERM_READ | PERM_WRITE | PERM_DELETE);
			} else {
				setUserPermissions(BigInt(0));
			}
		}
	}, [userMembership, organization, wallet]);

	const invalidateData = () => {
		queryClient.invalidateQueries({ queryKey: ["organization", id] });
		queryClient.invalidateQueries({ queryKey: ["roles", id] });
		queryClient.invalidateQueries({ queryKey: ["vaults", id] });
		queryClient.invalidateQueries({ queryKey: ["user-membership", id] });
	};

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

	const handleInitializeStaffProfile = async () => {
		if (!program || !orgPubkey || !wallet || roles.length === 0) return;
		
		try {
			setIsActionLoading(true);
			
			// Find a role with WRITE permission, or default to roles[0]
			const writeRole = roles.find(r => (BigInt(r.account.permissions.toString()) & PERM_WRITE) !== BigInt(0)) || roles[0];
			
			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), wallet.publicKey.toBuffer()],
				program.programId
			);

			await program.methods
				.assignRole(writeRole.account.roleIndex, null)
				.accounts({
					authority: wallet.publicKey,
					authorityMembership: null, // Admin skips this
					organization: orgPubkey,
					member: wallet.publicKey,
					membership: membershipPda,
					role: writeRole.publicKey,
					systemProgram: anchor.web3.SystemProgram.programId,
				} as any)
				.rpc();

			addLog("MEMBERSHIP", "SUCCESS", `Profile initialized with role: ${formatBytes(writeRole.account.name)}`);
			invalidateData();
		} catch (err: any) {
			console.error("Failed to initialize profile:", err);
			addLog("MEMBERSHIP", "ERROR", `Failed: ${err.message || "Unknown error"}`);
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleCreateVault = async () => {
		if (!vaultProgram || !orgPubkey || !wallet || !newVaultLabel) return;
		
		if (!userMembership) {
			addLog("VAULT", "BLOCKED", "You must initialize your staff profile first.");
			return;
		}

		try {
			setIsActionLoading(true);
			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), wallet.publicKey.toBuffer()],
				program!.programId
			);

			const [vaultPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("vault"), orgPubkey.toBuffer(), new TextEncoder().encode(newVaultLabel)],
				vaultProgram.programId
			);

			await vaultProgram.methods
				.initializeVault(newVaultLabel, Buffer.from(newVaultData))
				.accounts({
					signer: wallet.publicKey,
					organization: orgPubkey,
					membership: membershipPda,
					vault: vaultPda,
					rbacProgram: program!.programId,
					systemProgram: anchor.web3.SystemProgram.programId,
				} as any)
				.rpc();

			addLog("INITIALIZE_SUCCESS", "SUCCESS", `Initialized vault: ${newVaultLabel}`);
			setShowCreateModal(false);
			setNewVaultLabel("");
			setNewVaultData("");
			invalidateData();
		} catch (err: any) {
			console.error("Error creating vault:", err);
			addLog("INITIALIZE_ERROR", "ERROR", err.message || "Failed to initialize vault");
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleWriteVault = async () => {
		if (!vaultProgram || !orgPubkey || !wallet || !editingVault) return;

		try {
			setIsActionLoading(true);
			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), wallet.publicKey.toBuffer()],
				program!.programId
			);

			await vaultProgram.methods
				.writeVault(Buffer.from(newVaultData))
				.accounts({
					signer: wallet.publicKey,
					organization: orgPubkey,
					membership: membershipPda,
					vault: editingVault.publicKey,
					rbacProgram: program!.programId,
				} as any)
				.rpc();

			addLog("WRITE_SUCCESS", "SUCCESS", `Updated vault data for: ${editingVault.account.label}`);
			setEditingVault(null);
			setNewVaultData("");
			invalidateData();
		} catch (err: any) {
			console.error("Error writing to vault:", err);
			addLog("WRITE_ERROR", "ERROR", err.message || "Failed to write to vault");
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleReadVault = async (vault: any) => {
		if (!vaultProgram || !orgPubkey || !wallet) return;

		try {
			setIsActionLoading(true);
			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), wallet.publicKey.toBuffer()],
				program!.programId
			);

			await vaultProgram.methods
				.readVault()
				.accounts({
					signer: wallet.publicKey,
					organization: orgPubkey,
					membership: membershipPda,
					vault: vault.publicKey,
					rbacProgram: program!.programId,
				} as any)
				.rpc();

			addLog("READ_SUCCESS", "SUCCESS", `Logged on-chain read for: ${new TextDecoder().decode(Uint8Array.from(vault.account.label)).replace(/\0/g, "")}`);
			alert("Read event emitted on-chain. Check transaction logs.");
		} catch (err: any) {
			console.error("Error reading vault:", err);
			addLog("READ_ERROR", "ERROR", err.message || "Access Denied: Read failed");
			alert(`Read failed: ${err.message}`);
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleDeleteVault = async (vault: any) => {
		if (!vaultProgram || !orgPubkey || !wallet) return;
		if (!confirm("Are you sure you want to delete this vault? This action is irreversible.")) return;

		try {
			setIsActionLoading(true);
			const [membershipPda] = PublicKey.findProgramAddressSync(
				[new TextEncoder().encode("membership"), orgPubkey.toBuffer(), wallet.publicKey.toBuffer()],
				program!.programId
			);

			await vaultProgram.methods
				.deleteVault()
				.accounts({
					signer: wallet.publicKey,
					organization: orgPubkey,
					membership: membershipPda,
					vault: vault.publicKey,
					rbacProgram: program!.programId,
				} as any)
				.rpc();

			addLog("DELETE_SUCCESS", "SUCCESS", `Deleted vault account`);
			invalidateData();
		} catch (err: any) {
			console.error("Error deleting vault:", err);
			addLog("DELETE_ERROR", "ERROR", err.message || "Failed to delete vault");
		} finally {
			setIsActionLoading(false);
		}
	};

	// Helper to format bytes
	const formatBytes = (bytes: number[] | Uint8Array) => {
		return new TextDecoder().decode(Uint8Array.from(bytes)).replace(/\0/g, "");
	};

	if (isLoading && vaults.length === 0) {
		return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-palePeriwinkle" /></div>;
	}

	const hasRead = checkAccess(PERM_READ);
	const hasWrite = checkAccess(PERM_WRITE);
	const hasDelete = checkAccess(PERM_DELETE);
	const hasAdmin = checkAccess(PERM_SUPER_ADMIN);

	return (
		<>
			<div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 fade-in">
				<div>
					<h1 className="text-2xl font-bold text-white uppercase tracking-tight">
						{organization ? formatBytes(organization.name) : "Organization"} Vaults
					</h1>
				</div>
				<div className="relative group">
					<button 
						onClick={() => setShowCreateModal(true)}
						disabled={!hasWrite || isActionLoading || !userMembership}
						className={`px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(77,143,255,0.2)] flex items-center gap-2 cursor-pointer border-none font-mono text-xs ${hasWrite && userMembership ? "bg-pearlWhite text-deepIndigo hover:bg-white" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
					>
						{isActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
						CREATE_VAULT
					</button>
					{(!hasWrite || !userMembership) && (
						<span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-[125%] left-1/2 -translate-x-1/2 w-48 bg-royalBlue text-white text-center rounded-md p-2 text-[10px] font-mono border border-palePeriwinkle/20 z-50 shadow-2xl">
							{!userMembership ? "Profile Initialization Required" : "Requires WRITE permission"}
						</span>
					)}
				</div>
			</div>

			{/* Membership Warning Banner */}
			{!userMembership && organization && (
				<div className="mb-8 p-6 rounded-2xl bg-royalBlue/5 border border-royalBlue/20 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 slide-in-bottom">
					<div className="flex items-center gap-5">
						<div className="w-14 h-14 rounded-2xl bg-royalBlue/10 flex items-center justify-center border border-royalBlue/20 shadow-inner">
							<Shield className="w-7 h-7 text-royalBlue animate-pulse" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-white uppercase tracking-tight">Missing Staff Profile</h3>
							<p className="text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em] mt-1 leading-relaxed max-w-md">
								RBAC requires an on-chain membership record to track your authority bits. Even as an admin, you must initialize your profile node.
							</p>
						</div>
					</div>
					<button
						onClick={handleInitializeStaffProfile}
						disabled={isActionLoading || roles.length === 0}
						className="w-full md:w-auto px-8 py-3 bg-royalBlue text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-[0_0_25px_rgba(77,143,255,0.4)] transition-all cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-3"
					>
						{isActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
						{roles.length === 0 ? "No Roles Found" : "Initialize My Profile"}
					</button>
				</div>
			)}

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
				{vaults.map((vault) => {
					const label = formatBytes(vault.account.label);
					const vaultPubkey = vault.publicKey.toBase58();
					const version = vault.account.version;
					const createdAt = new Date(vault.account.createdAt.toNumber() * 1000).toLocaleString();
					
					return (
						<div key={vaultPubkey} className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-white/2 transition-all text-white shadow-lg">
							<div className="p-6 flex items-start justify-between">
								<div className="space-y-4 grow">
									<div className="flex items-center gap-4">
										<h3 className="text-lg font-mono font-bold text-white tracking-tight uppercase">
											{label}
										</h3>
										<span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-palePeriwinkle/60 font-bold">
											v{version}.0.0-SECURED
										</span>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-[10px] font-mono uppercase tracking-widest">
										<div>
											<span className="block text-palePeriwinkle/30 mb-1">
												Vault Creator
											</span>
											<span className="text-palePeriwinkle/80 truncate block" title={vault.account.creator.toBase58()}>
												{vault.account.creator.toBase58().substring(0, 8)}...{vault.account.creator.toBase58().substring(36)}
											</span>
										</div>
										<div>
											<span className="block text-palePeriwinkle/30 mb-1">
												Creation Epoch
											</span>
											<span className="text-royalBlue/80 lowercase italic font-mono truncate block">
												{createdAt}
											</span>
										</div>
										<div>
											<span className="block text-palePeriwinkle/30 mb-1">
												Data Entropy
											</span>
											<span className="text-palePeriwinkle/80">
												{vault.account.dataLen} BYTES
											</span>
										</div>
										<div>
											<span className="block text-palePeriwinkle/30 mb-1">
												Node Integrity
											</span>
											<div className="flex items-center gap-1.5">
												<div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
												<span className="text-green-400 font-bold">VERIFIED_PDA</span>
											</div>
										</div>
									</div>
								</div>
								<div className="flex flex-col gap-2">
									<button 
										onClick={() => handleReadVault(vault)} 
										disabled={!hasRead || isActionLoading}
										className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${hasRead ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20" : "bg-white/5 border-white/10 text-white/10 cursor-not-allowed"}`}
									>
										<Search className="w-3 h-3" />
										READ
									</button>
									<button 
										onClick={() => {
											setEditingVault(vault);
											setNewVaultData(formatBytes(vault.account.data).substring(0, vault.account.dataLen));
										}} 
										disabled={!hasWrite || isActionLoading}
										className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${hasWrite ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" : "bg-white/5 border-white/10 text-white/10 cursor-not-allowed"}`}
									>
										<Edit3 className="w-3 h-3" />
										WRITE
									</button>
									<button 
										onClick={() => handleDeleteVault(vault)} 
										disabled={!hasDelete || isActionLoading}
										className={`px-4 py-2 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${hasDelete ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-white/5 border-white/10 text-white/10 cursor-not-allowed"}`}
									>
										<Trash2 className="w-3 h-3" />
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
									<div className="flex items-center gap-2">
										<Server className="w-3 h-3 text-green-400/80" />
										<span className="text-[10px] font-mono text-green-400/80 uppercase tracking-widest font-bold">
											On-Chain Raw Data Buffer ({vault.account.dataLen} bytes)
										</span>
									</div>
									<button className="text-palePeriwinkle/70 hover:text-white cursor-pointer bg-transparent border-none">
										<Maximize2 className="w-4 h-4" />
									</button>
								</div>
								<pre className="text-xs font-mono text-palePeriwinkle/90 bg-white/2 p-4 rounded-xl border border-white/5 overflow-x-auto leading-relaxed">
									{formatBytes(vault.account.data).substring(0, vault.account.dataLen) || "// NO DATA STORED"}
								</pre>
							</div>
						</div>
					);
				})}

				{vaults.length === 0 && !isLoading && (
					<div className="glass-card rounded-2xl p-12 text-center border border-dashed border-white/10">
						<Server className="w-12 h-12 text-palePeriwinkle/10 mx-auto mb-4" />
						<p className="text-palePeriwinkle/40 font-mono text-xs uppercase tracking-widest">No vault accounts discovered for this organization.</p>
					</div>
				)}
			</div>

			<div className="glass-card rounded-2xl border-l-2 border-l-magentaViolet overflow-hidden fade-in shadow-2xl delay-300 mb-20 text-white">
				<div className="p-4 bg-white/2 border-b border-white/5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Activity className="w-4 h-4 text-royalBlue" />
						<h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
							Node Access Activity
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

			{/* Vault Management Modal (Create/Edit) */}
			{(showCreateModal || editingVault) && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
					<div className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 fade-in animate-scale-up">
						<div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
							<div>
								<h2 className="text-lg font-bold text-white uppercase tracking-tight">
									{editingVault ? "Update Vault Data" : "Initialize New Vault"}
								</h2>
								<p className="text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em] mt-1">
									{editingVault 
										? `Vault_ID: ${editingVault.publicKey.toBase58().substring(0, 8)}...` 
										: "Define on-chain metadata PDA and initial payload"}
								</p>
							</div>
							<button 
								onClick={() => {
									setShowCreateModal(false);
									setEditingVault(null);
									setNewVaultLabel("");
									setNewVaultData("");
								}} 
								className="p-2 text-palePeriwinkle/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer bg-transparent border-none"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="p-8 space-y-8">
							{!editingVault && (
								<div className="space-y-3">
									<label className="block text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em]">
										Vault Label (32 bytes max)
									</label>
									<input
										type="text"
										className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-mono text-white focus:outline-none focus:border-royalBlue/50 transition-all placeholder:text-white/10 shadow-inner uppercase tracking-widest"
										placeholder="e.g. TREASURY_STATE"
										value={newVaultLabel}
										onChange={(e) => setNewVaultLabel(e.target.value)}
									/>
								</div>
							)}

							<div className="space-y-3">
								<label className="block text-[10px] font-mono text-palePeriwinkle/60 uppercase tracking-[0.2em]">
									Vault Payload (Data String)
								</label>
								<textarea
									className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-sm font-mono text-white focus:outline-none focus:border-royalBlue/50 transition-all placeholder:text-white/10 shadow-inner h-32 resize-none"
									placeholder='{ "status": "active", "bal": 100 }'
									value={newVaultData}
									onChange={(e) => setNewVaultData(e.target.value)}
								/>
								<div className="flex justify-between items-center text-[9px] font-mono text-palePeriwinkle/20 uppercase tracking-widest">
									<span>Capacity: 256 bytes</span>
									<span>Current: {new TextEncoder().encode(newVaultData).length} bytes</span>
								</div>
							</div>

							<div className="flex gap-4 pt-4">
								<button
									onClick={() => {
										setShowCreateModal(false);
										setEditingVault(null);
										setNewVaultLabel("");
										setNewVaultData("");
									}}
									className="flex-1 py-4 border border-white/5 bg-white/2 rounded-xl text-[10px] font-mono font-bold text-palePeriwinkle/60 uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
								>
									Cancel
								</button>
								<button
									onClick={editingVault ? handleWriteVault : handleCreateVault}
									disabled={isActionLoading || (!newVaultLabel && !editingVault)}
									className="flex-1 py-4 bg-white text-deepIndigo rounded-xl text-[10px] font-mono font-black uppercase tracking-widest hover:bg-pearlWhite disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-2 border-none cursor-pointer"
								>
									{isActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
									{editingVault ? "Update On-Chain" : "Initialize PDA"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
