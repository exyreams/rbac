import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useState, useRef, useEffect } from "react";
import { Copy, LogOut, ChevronDown, Wallet, ExternalLink, RefreshCw, Check } from "lucide-react";

export default function WalletDropdown() {
	const { publicKey, disconnect, connected } = useWallet();
	const { setVisible } = useWalletModal();
	const [isOpen, setIsOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const address = publicKey?.toBase58() || "";
	const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleCopy = async () => {
		if (address) {
			await navigator.clipboard.writeText(address);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (!connected || !publicKey) {
		return (
			<button
				onClick={() => setVisible(true)}
				className="h-10 px-6 rounded-full border border-white/20 bg-transparent font-mono text-xs text-palePeriwinkle hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
			>
				<Wallet className="w-3.5 h-3.5" />
				CONNECT_WALLET
			</button>
		);
	}

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`h-10 px-4 rounded-full border transition-all flex items-center gap-2 cursor-pointer font-mono text-xs ${isOpen ? "bg-white/10 border-white/40 text-white" : "bg-white/5 border-white/20 text-palePeriwinkle hover:border-white/30"}`}
			>
				<div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
				{shortAddress}
				<ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-white/10 shadow-2xl overflow-hidden py-1 slide-in-top z-50">
					<div className="px-4 py-3 border-b border-white/5 bg-white/2">
						<p className="text-[10px] font-mono text-palePeriwinkle/40 uppercase tracking-widest mb-1">Active Account</p>
						<p className="text-xs font-mono text-white font-bold truncate">{address}</p>
					</div>
					
					<div className="p-1">
						<button
							onClick={handleCopy}
							className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono text-palePeriwinkle hover:bg-white/5 hover:text-white transition-all cursor-pointer border-none bg-transparent"
						>
							{copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
							{copied ? "COPIED_TOCLIPBOARD" : "COPY_ADDRESS"}
						</button>

						<button
							onClick={() => {
								setIsOpen(false);
								setVisible(true);
							}}
							className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono text-palePeriwinkle hover:bg-white/5 hover:text-white transition-all cursor-pointer border-none bg-transparent"
						>
							<RefreshCw className="w-3.5 h-3.5" />
							CHANGE_WALLET
						</button>

						<a
							href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
							target="_blank"
							rel="noopener noreferrer"
							className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono text-palePeriwinkle hover:bg-white/5 hover:text-white transition-all no-underline cursor-pointer"
						>
							<ExternalLink className="w-3.5 h-3.5" />
							VIEW_EXPLORER
						</a>

						<div className="h-px bg-white/5 my-1 mx-2" />

						<button
							onClick={() => {
								setIsOpen(false);
								disconnect();
							}}
							className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-mono text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer border-none bg-transparent"
						>
							<LogOut className="w-3.5 h-3.5" />
							DISCONNECT
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
