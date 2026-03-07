import { Copy, Server, Settings, Shield, Loader2, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAnchorProgram } from "../hooks/useAnchorProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function UserProfile() {
	const { program, wallet } = useAnchorProgram();
	const { disconnect } = useWallet();
	const [balance, setBalance] = useState<number | null>(null);
	const [memberships, setMemberships] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			if (!program || !wallet) return;

			try {
				setIsLoading(true);
				// Fetch balance
				const bal = await program.provider.connection.getBalance(wallet.publicKey);
				setBalance(bal / LAMPORTS_PER_SOL);

				// Fetch memberships (where this wallet is the member)
				const userMemberships = await program.account.membership.all([
					{
						memcmp: {
							offset: 8 + 32, // discriminator + org(32)
							bytes: wallet.publicKey.toBase58(),
						},
					},
				]);

				// Fetch organization names for these memberships
				const enriched = await Promise.all(userMemberships.map(async (m) => {
					const orgPubkey = (m.account as any).organization;
					const org = await program.account.organization.fetch(orgPubkey);
					return {
						...m,
						orgName: new TextDecoder().decode(Uint8Array.from((org as any).name)).replace(/\0/g, ""),
						isAdmin: (org as any).admin.toBase58() === wallet.publicKey.toBase58()
					};
				}));

				setMemberships(enriched);
			} catch (err) {
				console.error("Error fetching profile data:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [program, wallet]);

	if (isLoading) {
		return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-palePeriwinkle" /></div>;
	}

	const address = wallet?.publicKey.toBase58() || "";
	const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected";

	return (
		<>
			<div className="mb-10 fade-in">
				<div className="flex items-center gap-3 text-palePeriwinkle/40 text-xs font-mono mb-2">
					<span className="text-palePeriwinkle/60 uppercase">SYSTEM</span>
					<span>/</span>
					<span className="text-white uppercase transition-colors">Profile</span>
				</div>
				<h1 className="text-3xl font-sans font-medium text-white">
					User Profile
				</h1>
			</div>

			<div className="grid grid-cols-12 gap-8 fade-in delay-100 text-white">
				<div className="col-span-12 lg:col-span-4 space-y-8">
					<div className="glass-card rounded-2xl border-l-2 border-l-magentaViolet p-8">
						<div className="flex flex-col items-center mb-8">
							<div className="w-20 h-20 rounded-2xl bg-royalBlue border border-magentaViolet/30 flex items-center justify-center text-2xl font-mono font-bold text-magentaViolet mb-4">
								{address.slice(0, 2).toUpperCase()}
							</div>
							<div className="flex items-center gap-2 mb-2">
								<span className="font-mono text-sm text-white/90">
									{shortAddress}
								</span>
								<button onClick={() => { navigator.clipboard.writeText(address); alert("Copied!"); }} className="text-palePeriwinkle/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
									<Copy className="w-4 h-4" />
								</button>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
								<span className="font-mono text-[9px] text-palePeriwinkle/50 uppercase tracking-widest">
									Solana Devnet
								</span>
							</div>
						</div>

						<div className="bg-white/5 border border-white/5 rounded-xl p-5 mb-8 text-center">
							<div className="text-[10px] font-mono text-palePeriwinkle/40 uppercase mb-1 tracking-widest">
								Available Balance
							</div>
							<div className="text-2xl font-mono font-bold text-white mb-1 flex items-center justify-center gap-2">
								<Coins className="w-5 h-5 text-amber-500" />
								{balance?.toFixed(4)} SOL
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<button onClick={() => disconnect()} className="col-span-2 px-4 py-3 rounded-xl border border-red-500/20 text-[10px] font-mono font-bold text-red-400 hover:bg-red-500/5 transition-colors uppercase tracking-widest bg-transparent cursor-pointer">
								Disconnect_Wallet
							</button>
						</div>
					</div>
				</div>

				<div className="col-span-12 lg:col-span-8 space-y-8">
					<div className="glass-card rounded-2xl border-l-2 border-l-white/20 p-8">
						<h3 className="font-mono text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2 mb-6">
							<span className="w-1 h-3 bg-white/40 rounded-full"></span>{" "}
							Organization Memberships
						</h3>
						<div className="divide-y divide-white/5">
							{memberships.map((m) => {
								const orgId = (m.account as any).organization.toBase58();
								return (
									<div key={m.publicKey.toBase58()} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
										<div className="flex items-center gap-4">
											<div className="w-10 h-10 rounded-lg bg-magentaViolet/10 border border-magentaViolet/20 flex items-center justify-center text-magentaViolet font-bold font-mono shrink-0">
												{m.orgName.charAt(0)}
											</div>
											<div>
												<div className="flex items-center gap-2 mb-1">
													<span className="text-sm font-medium text-white">
														{m.orgName}
													</span>
													{m.isAdmin && (
														<span className="px-1.5 py-0.5 rounded-sm bg-magentaViolet/10 border border-magentaViolet/30 text-[8px] font-mono text-magentaViolet/80 font-bold uppercase">
															Admin
														</span>
													)}
												</div>
												<div className="flex gap-2">
													<span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono text-blue-400 font-bold">
														{m.isAdmin ? "SUPER_ADMIN" : "MEMBER"}
													</span>
													{m.account.expiresAt && (
														<span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-400 font-bold">
															EXP: {new Date(m.account.expiresAt.toNumber() * 1000).toLocaleDateString()}
														</span>
													)}
												</div>
											</div>
										</div>
										<Link
											to={`/org/${orgId}`} 
											className="text-palePeriwinkle/40 group-hover:text-magentaViolet transition-colors flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider no-underline"
										>
											Enter_Portal
											<Settings className="w-4 h-4" />
										</Link>
									</div>
								);
							})}

							{memberships.length === 0 && (
								<div className="py-12 text-center text-palePeriwinkle/20 font-mono text-xs italic">
									NULL_MEMBERSHIPS_DETECTED.LOG
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="glass-card rounded-2xl p-6 border-b-2 border-b-magentaViolet/30">
							<div className="text-[9px] font-mono text-palePeriwinkle/30 uppercase tracking-widest mb-2">
								Active_Memberships
							</div>
							<div className="text-xl font-mono text-white font-bold">
								{memberships.length} Orgs
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
