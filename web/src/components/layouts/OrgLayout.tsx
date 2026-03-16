import { Copy, Loader2 } from "lucide-react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";

export default function OrgLayout() {
	const location = useLocation();
	const { id } = useParams();
	const { program } = useAnchorProgram();
	const [orgName, setOrgName] = useState("");
	const [orgData, setOrgData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	const orgPubkey = useMemo(() => {
		try {
			return id ? new PublicKey(id) : null;
		} catch {
			return null;
		}
	}, [id]);

	useEffect(() => {
		const fetchOrg = async () => {
			if (!program || !orgPubkey) return;
			try {
				setIsLoading(true);
				const data = await program.account.organization.fetch(orgPubkey);
				const name = new TextDecoder().decode(Uint8Array.from(data.name)).replace(/\0/g, "");
				setOrgName(name);
				setOrgData(data);
			} catch (err) {
				console.error("Error fetching org for layout:", err);
			} finally {
				setIsLoading(false);
			}
		};
		fetchOrg();
	}, [program, orgPubkey]);

	const tabs = [
		{ name: "OVERVIEW", path: `/org/${id}` },
		{ name: "HISTORY", path: `/org/${id}/history` },
		{ name: "ROLES", path: `/org/${id}/roles` },
		{ name: "MEMBERS", path: `/org/${id}/members` },
		{ name: "VAULTS", path: `/org/${id}/vaults` },
		{ name: "SETTINGS", path: `/org/${id}/settings` },
	];

	if (isLoading) {
		return (
			<div className="flex justify-center py-20">
				<Loader2 className="w-8 h-8 text-palePeriwinkle animate-spin" />
			</div>
		);
	}

	return (
		<>
			<div className="mb-10 fade-in">

				<div className="flex flex-col lg:flex-row justify-between items-start gap-8">
					<div className="grow">
						<div className="flex items-center gap-4 mb-4">
							<h1 className="text-4xl font-sans font-bold text-pearlWhite tracking-tight">
								{orgName}
							</h1>
							<span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.1)]">
								SOLANA DEVNET
							</span>
						</div>

						<div className="flex flex-wrap items-center gap-y-4 gap-x-8 text-[11px] font-mono">
							<div className="flex items-center gap-2 group">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">ADDR:</span>
								<span className="text-palePeriwinkle opacity-80 uppercase tracking-tight">
									{id?.slice(0, 8)}...{id?.slice(-8)}
								</span>
								<button 
									className="text-palePeriwinkle/30 hover:text-pearlWhite transition-colors cursor-pointer border-none bg-transparent"
									onClick={() => id && navigator.clipboard.writeText(id)}
								>
									<Copy className="w-3.5 h-3.5" />
								</button>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">ADMIN:</span>
								<span className="text-palePeriwinkle opacity-80 uppercase tracking-tight">
									{orgData?.admin.toBase58().slice(0, 8)}...
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">
									EPOCH:
								</span>
								<span className="text-royalBlue font-bold uppercase tracking-tight">
									{orgData?.permissionsEpoch.toString()}
								</span>
							</div>
						</div>

						<p className="mt-8 text-palePeriwinkle/60 text-sm leading-relaxed max-w-3xl font-light">
							Cryptographically secured identity protocol. This organization operates via on-chain role-based access control, 
							enforcing granular permissions across decentralized infrastructure and multi-sig vaults.
						</p>
					</div>
				</div>
			</div>

			<div className="border-b border-white/5 flex items-center gap-8 mb-8 fade-in delay-100">
				{tabs.map((tab) => (
					<Link
						key={tab.name}
						to={tab.path}
						className={`pb-4 text-[10px] font-mono font-bold tracking-[0.2em] transition-all cursor-pointer relative ${
							location.pathname === tab.path
								? "text-pearlWhite"
								: "text-palePeriwinkle/40 hover:text-pearlWhite"
						}`}
					>
						{tab.name}
						{location.pathname === tab.path && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-royalBlue shadow-[0_0_10px_var(--color-royalBlue)]" />
						)}
					</Link>
				))}
			</div>

			<Outlet />
		</>
	);
}
