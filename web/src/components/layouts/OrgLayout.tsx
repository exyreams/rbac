import { Copy, Loader2, RefreshCw } from "lucide-react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useOrganization } from "../../hooks/useOrganizationData";
import { useQueryClient } from "@tanstack/react-query";

export default function OrgLayout() {
	const location = useLocation();
	const { id } = useParams();
	const queryClient = useQueryClient();
	const { data: organization, isLoading, isFetching } = useOrganization(id);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const orgName = useMemo(() => {
		if (!organization) return "Organization";
		return new TextDecoder().decode(Uint8Array.from(organization.name)).replace(/\0/g, "");
	}, [organization]);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await queryClient.invalidateQueries({ queryKey: ["organization", id] });
		await queryClient.invalidateQueries({ queryKey: ["roles", id] });
		await queryClient.invalidateQueries({ queryKey: ["memberships", id] });
		await queryClient.invalidateQueries({ queryKey: ["vaults", id] });
		await queryClient.invalidateQueries({ queryKey: ["user-membership", id] });
		await queryClient.invalidateQueries({ queryKey: ["history", id] });
		setIsRefreshing(false);
	};

	const tabs = [
		{ name: "OVERVIEW", path: `/org/${id}` },
		{ name: "HISTORY", path: `/org/${id}/history` },
		{ name: "ROLES", path: `/org/${id}/roles` },
		{ name: "MEMBERS", path: `/org/${id}/members` },
		{ name: "VAULTS", path: `/org/${id}/vaults` },
		{ name: "SETTINGS", path: `/org/${id}/settings` },
	];

	if (isLoading && !organization) {
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
									{organization?.admin.toBase58().slice(0, 8)}...
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-palePeriwinkle/40 uppercase tracking-widest">
									EPOCH:
								</span>
								<span className="text-royalBlue font-bold uppercase tracking-tight">
									{organization?.permissionsEpoch.toString()}
								</span>
							</div>
						</div>

						<p className="mt-8 text-palePeriwinkle/60 text-sm leading-relaxed max-w-3xl font-light">
							Cryptographically secured identity protocol. This organization operates via on-chain role-based access control, 
							enforcing granular permissions across decentralized infrastructure and multi-sig vaults.
						</p>
					</div>

					<div className="flex flex-col items-end gap-3">
						<button
							onClick={handleRefresh}
							disabled={isRefreshing || isFetching}
							className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-palePeriwinkle hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
						>
							<RefreshCw className={`w-3 h-3 ${(isRefreshing || isFetching) ? "animate-spin" : ""}`} />
							REFRESH_ON_CHAIN
						</button>
						{(isRefreshing || isFetching) && (
							<span className="text-[9px] font-mono text-royalBlue animate-pulse uppercase tracking-widest">
								Syncing_Nodes...
							</span>
						)}
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
