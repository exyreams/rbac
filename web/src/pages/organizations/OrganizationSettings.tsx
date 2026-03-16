import {
  AlertTriangle,
  ArrowRightLeft,
  Download,
  ExternalLink,
  Loader2,
  Copy,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAnchorProgram } from "../../hooks/useAnchorProgram";
import { PublicKey } from "@solana/web3.js";

import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "../../hooks/useOrganizationData";

export default function OrganizationSettings() {
  const { id } = useParams<{ id: string }>();
  const { program, wallet } = useAnchorProgram();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organization, isLoading } = useOrganization(id);

  const [newAdmin, setNewAdmin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const orgPubkey = useMemo(() => {
    try {
      return id ? new PublicKey(id) : null;
    } catch {
      return null;
    }
  }, [id]);

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: ["organization", id] });
  };

  const handleTransferAdmin = async () => {
    if (!program || !wallet || !orgPubkey || !newAdmin) return;
    try {
      setIsProcessing(true);
      const newAdminPubkey = new PublicKey(newAdmin);
      await program.methods
        .transferAdmin(newAdminPubkey)
        .accounts({
          admin: wallet.publicKey,
          organization: orgPubkey,
        } as any)
        .rpc();

      alert("Admin transferred successfully!");
      setNewAdmin("");
      invalidateData();
    } catch (err) {
      console.error("Transfer failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseOrg = async () => {
    if (!program || !wallet || !orgPubkey) return;
    if (
      !confirm(
        "Are you sure you want to close this organization? This action is irreversible.",
      )
    )
      return;

    try {
      setIsProcessing(true);
      await program.methods
        .closeOrganization()
        .accounts({
          admin: wallet.publicKey,
          organization: orgPubkey,
        } as any)
        .rpc();

      alert("Organization closed successfully!");
      navigate("/organizations");
    } catch (err) {
      console.error("Close failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !organization) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-palePeriwinkle" />
      </div>
    );
  }

  if (!organization) {
      return (
          <div className="text-center py-20">
              <p className="text-palePeriwinkle/40 font-mono text-xs uppercase tracking-widest">Organization Not Found</p>
          </div>
      );
  }

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportRoles = async () => {
    if (!program || !orgPubkey) return;
    try {
      setIsProcessing(true);
      const allRoles = await program.account.role.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: orgPubkey.toBase58(),
          },
        },
      ]);

      const rolesData = allRoles.map((r) => ({
        publicKey: r.publicKey.toBase58(),
        ...r.account,
        name: new TextDecoder()
          .decode(Uint8Array.from(r.account.name))
          .replace(/\0/g, ""),
        permissions: r.account.permissions.toString(),
      }));

      downloadJson(rolesData, `roles-${orgPubkey.toBase58().slice(0, 8)}.json`);
    } catch (err) {
      console.error("Export roles failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportSysState = async () => {
    if (!program || !orgPubkey || !organization) return;
    try {
      setIsProcessing(true);
      const [allRoles, allMemberships] = await Promise.all([
        program.account.role.all([
          { memcmp: { offset: 8, bytes: orgPubkey.toBase58() } },
        ]),
        program.account.membership.all([
          { memcmp: { offset: 8, bytes: orgPubkey.toBase58() } },
        ]),
      ]);

      const state = {
        organization: {
          publicKey: orgPubkey.toBase58(),
          ...organization,
          name: new TextDecoder()
            .decode(Uint8Array.from(organization.name))
            .replace(/\0/g, ""),
          createdAt: organization.createdAt.toString(),
          permissionsEpoch: organization.permissionsEpoch.toString(),
        },
        roles: allRoles.map((r) => ({
          publicKey: r.publicKey.toBase58(),
          ...r.account,
          name: new TextDecoder()
            .decode(Uint8Array.from(r.account.name))
            .replace(/\0/g, ""),
          permissions: r.account.permissions.toString(),
        })),
        memberships: allMemberships.map((m) => ({
          publicKey: m.publicKey.toBase58(),
          ...m.account,
          member: m.account.member.toBase58(),
          rolesBitmap: m.account.rolesBitmap.toString(),
          expiresAt: m.account.expiresAt?.toString() || null,
        })),
      };

      downloadJson(
        state,
        `system-state-${orgPubkey.toBase58().slice(0, 8)}.json`,
      );
    } catch (err) {
      console.error("Export system state failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin =
    wallet &&
    organization &&
    organization.admin.toBase58() === wallet.publicKey.toBase58();

  return (
    <>
      <div className="mb-10 fade-in">
        <h1 className="text-3xl font-sans font-medium text-white mb-2">Settings</h1>
        <p className="text-palePeriwinkle/60 text-[10px] font-mono tracking-[0.4em]">CONFIGURATION.SYS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 fade-in delay-100 text-white">

        <div className="glass-card glass-card-no-shift rounded-2xl border-l-2 border-l-lightLavender/40 p-8 flex flex-col gap-6">
          <h3 className="font-mono text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-1 h-3 bg-lightLavender/60 rounded-full"></span>{" "}
            Organization Metadata
          </h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                Creation Date
              </span>
              <span className="font-mono text-sm text-white/90 font-bold">
                {new Date(
                  organization.createdAt.toNumber() * 1000,
                ).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                Permissions Epoch
              </span>
              <span className="font-mono text-sm text-white/90 font-bold">
                {organization.permissionsEpoch.toString()}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                Total Members
              </span>
              <span className="font-mono text-sm text-white/90 font-bold">
                {organization.memberCount.toString()}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                Creator Address
              </span>
              <span className="font-mono text-[10px] text-white/90 font-medium truncate">
                {organization.creator.toBase58()}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                On-Chain Address
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/90 font-medium truncate">
                  {id}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(id!);
                    alert("Copied!");
                  }}
                  className="text-palePeriwinkle/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                Network
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[9px] font-mono text-blue-400 font-black uppercase shadow-[0_0_8px_rgba(59,130,246,0.1)]">
                Solana Devnet
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase tracking-widest mb-1">
                Role Slots
              </span>
              <span className="font-mono text-sm text-white/90 font-bold">
                {organization.roleCount} / 64
              </span>
            </div>
          </div>
          <div className="mt-auto pt-4">
            <a
              href={`https://explorer.solana.com/address/${id}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-magentaViolet hover:text-lightLavender transition-colors uppercase tracking-widest no-underline"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportRoles}
              disabled={isProcessing}
              className="flex-1 p-3 flex items-center justify-between rounded-xl border border-white/10 hover:border-magentaViolet/30 hover:bg-white/2 transition-all group bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-palePeriwinkle/40 group-hover:text-magentaViolet transition-colors" />
                <span className="text-[10px] font-mono text-white/80 uppercase font-bold">
                  Export_Roles
                </span>
              </div>
              <span className="text-[9px] font-mono text-palePeriwinkle/30">
                {organization.roleCount}_slots
              </span>
            </button>
            <button
              onClick={handleExportSysState}
              disabled={isProcessing}
              className="flex-1 p-3 flex items-center justify-between rounded-xl border border-white/10 hover:border-magentaViolet/30 hover:bg-white/2 transition-all group bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-palePeriwinkle/40 group-hover:text-magentaViolet transition-colors" />
                <span className="text-[10px] font-mono text-white/80 uppercase font-bold">
                  Sys_State
                </span>
              </div>
              <span className="text-[9px] font-mono text-palePeriwinkle/30">
                rev_{organization.permissionsEpoch.toString()}
              </span>
            </button>
          </div>
        </div>

        <div className="glass-card glass-card-no-shift rounded-2xl border-l-2 border-l-white/20 p-8 flex flex-col gap-6">
          <h3 className="font-mono text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-1 h-3 bg-white/40 rounded-full"></span> Admin
            Management
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono text-palePeriwinkle/70 uppercase mb-3 tracking-widest">
                Current Root Admin
              </label>
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <span className="font-mono text-[10px] text-white/90 font-medium truncate max-w-[200px]">
                  {organization.admin.toBase58()}
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded bg-magentaViolet/20 border border-magentaViolet/40 text-[9px] font-mono text-white font-bold ml-2 shrink-0">
                    YOU
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newAdmin}
                  onChange={(e) => setNewAdmin(e.target.value)}
                  placeholder="New Admin Address"
                  className="w-full px-4 py-3 rounded-xl font-mono text-xs bg-deepIndigo/50 border border-white/10 text-white focus:outline-none focus:border-palePeriwinkle transition-colors"
                />
                <button
                  onClick={handleTransferAdmin}
                  disabled={!isAdmin || !newAdmin || isProcessing}
                  className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all text-left bg-transparent cursor-pointer ${isAdmin ? "border-white/10 hover:border-magentaViolet/40 hover:bg-white/2" : "opacity-30 cursor-not-allowed border-white/5"}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-4 h-4 text-palePeriwinkle/60" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase mb-1">
                      Transfer Admin
                    </h4>
                    <p className="text-[9px] font-mono text-palePeriwinkle/60 leading-relaxed">
                      {isAdmin
                        ? "Permanently transfers root access to another wallet address."
                        : "ADMIN_PERMISSION_REQUIRED"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`glass-card glass-card-no-shift rounded-2xl border-l-2 border-l-red-500/50 p-8 flex flex-col gap-6 md:col-span-2 ${!isAdmin ? "opacity-50" : ""}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-red-400 tracking-widest uppercase flex items-center gap-2">
              <span className="w-1 h-3 bg-red-500/60 rounded-full"></span>{" "}
              Danger Zone
            </h3>
            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[9px] font-mono text-red-400 font-bold shadow-[0_0_8px_rgba(239,68,68,0.1)]">
              ADMIN_ONLY
            </span>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl">
              <h4 className="text-xs font-mono font-bold text-white uppercase mb-2">
                Close Organization
              </h4>
              <p className="text-[11px] font-mono text-palePeriwinkle/60 leading-relaxed">
                This will permanently deactivate the organization and revoke all
                roles. This action cannot be undone. All vault access through
                this organization layer will be terminated immediately.
              </p>
            </div>
            <button
              onClick={handleCloseOrg}
              disabled={!isAdmin || isProcessing}
              className={`px-8 py-3 rounded-lg border border-red-500/40 text-red-500 bg-transparent font-mono text-xs font-bold hover:bg-red-500/10 transition-all flex items-center gap-3 cursor-pointer shrink-0 ${!isAdmin ? "cursor-not-allowed" : ""}`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              CLOSE_ORGANIZATION
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
