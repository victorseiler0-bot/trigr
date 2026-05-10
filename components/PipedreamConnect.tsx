"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  userId: string;
  appSlug: string;
  appName: string;
  connected: boolean;
  accountId?: string;
  logo: React.ReactNode;
  description: string;
  onConnected: (accountId: string) => void;
  onDisconnected: () => void;
}

export function PipedreamConnectButton({
  userId, appSlug, appName, connected, accountId,
  logo, description, onConnected, onDisconnected,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pdRef = useRef<import("@pipedream/sdk/browser").PipedreamClient | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@pipedream/sdk/browser").then(({ createFrontendClient }) => {
      if (!mounted) return;
      pdRef.current = createFrontendClient({
        externalUserId: userId,
        tokenCallback: async () => {
          const r = await fetch("/api/pipedream/token", { method: "POST" });
          if (!r.ok) throw new Error("Token fetch failed");
          return r.json();
        },
      });
    });
    return () => { mounted = false; };
  }, [userId]);

  const handleConnect = useCallback(async () => {
    if (!pdRef.current) return;
    setBusy(true); setError("");
    try {
      await pdRef.current.connectAccount({
        app: appSlug,
        onSuccess: ({ id }) => {
          setBusy(false);
          onConnected(id);
        },
        onError: (err: Error) => {
          setBusy(false);
          setError(err?.message ?? "Erreur de connexion");
        },
        onClose: () => { setBusy(false); },
      });
    } catch (e: unknown) {
      setBusy(false);
      setError((e as Error)?.message ?? "Erreur");
    }
  }, [appSlug, onConnected]);

  async function handleDisconnect() {
    if (!accountId) return;
    setBusy(true);
    try {
      await fetch("/api/pipedream/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      onDisconnected();
    } catch {
      setError("Erreur lors de la déconnexion");
    } finally { setBusy(false); }
  }

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 ${
      connected
        ? "border-white/[0.12] bg-white/[0.03] hover:border-white/[0.18]"
        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
    }`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{appName}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${connected ? "status-connected" : "status-disconnected"}`} />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        <span className="text-xs text-zinc-700 shrink-0 font-medium border border-zinc-800 px-1.5 py-0.5 rounded-md">Pipedream</span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {connected ? (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 5l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Connecté via OAuth
          </span>
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
            Retirer
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40"
        >
          {busy
            ? <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
            : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
          }
          {busy ? "Connexion en cours…" : "Connecter"}
        </button>
      )}
    </div>
  );
}
