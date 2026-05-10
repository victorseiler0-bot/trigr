"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ConnectStep = "idle" | "opening" | "authenticating" | "saving" | "done" | "error";

interface Props {
  userId: string;
  appSlug: string;
  appName: string;
  appColor: string; // ex: "#E01E5A"
  connected: boolean;
  accountId?: string;
  logo: React.ReactNode;
  description: string;
  category: string;
  onConnected: (accountId: string) => void;
  onDisconnected: () => void;
  variant?: "card" | "row";
}

const STEP_LABELS: Record<ConnectStep, string> = {
  idle: "",
  opening: "Ouverture OAuth…",
  authenticating: "En attente de l'autorisation…",
  saving: "Sauvegarde de la connexion…",
  done: "Connecté !",
  error: "Erreur",
};

export function PipedreamConnectButton({
  userId, appSlug, appName, appColor, connected, accountId,
  logo, description, category, onConnected, onDisconnected,
  variant = "card",
}: Props) {
  const [step, setStep] = useState<ConnectStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const pdRef = useRef<import("@pipedream/sdk/browser").PipedreamClient | null>(null);

  // Initialise le client Pipedream browser (lazy import)
  useEffect(() => {
    let alive = true;
    import("@pipedream/sdk/browser").then(({ createFrontendClient }) => {
      if (!alive) return;
      pdRef.current = createFrontendClient({
        externalUserId: userId,
        tokenCallback: async () => {
          const r = await fetch("/api/pipedream/token", { method: "POST" });
          if (!r.ok) throw new Error("Token indisponible");
          return r.json();
        },
      });
    });
    return () => { alive = false; };
  }, [userId]);

  const handleConnect = useCallback(async () => {
    if (!pdRef.current || step !== "idle") return;
    setStep("opening"); setErrorMsg("");
    try {
      await pdRef.current.connectAccount({
        app: appSlug,
        onSuccess: async ({ id }) => {
          setStep("saving");
          try {
            await fetch("/api/pipedream/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appSlug, accountId: id }),
            });
            setStep("done");
            onConnected(id);
            setTimeout(() => setStep("idle"), 2000);
          } catch {
            setStep("error"); setErrorMsg("Erreur de sauvegarde");
          }
        },
        onError: (err: Error) => {
          setStep("error");
          setErrorMsg(err?.message ?? "Erreur OAuth");
          setTimeout(() => setStep("idle"), 3000);
        },
        onClose: () => { setStep("idle"); },
      });
      setStep("authenticating");
    } catch (e: unknown) {
      setStep("error");
      setErrorMsg((e as Error)?.message ?? "Erreur");
      setTimeout(() => setStep("idle"), 3000);
    }
  }, [appSlug, step, onConnected]);

  const handleDisconnect = useCallback(async () => {
    if (!accountId) return;
    setDisconnecting(true);
    try {
      await fetch("/api/pipedream/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appSlug, accountId }),
      });
      onDisconnected();
    } finally { setDisconnecting(false); }
  }, [accountId, appSlug, onDisconnected]);

  const isBusy = step !== "idle" && step !== "done";
  const isConnected = connected && step !== "error";

  if (variant === "row") {
    return (
      <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
        isConnected ? "border-white/[0.1] bg-white/[0.02]" : "border-white/[0.05] hover:border-white/[0.09]"
      }`}>
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">{logo}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{appName}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "status-connected" : "bg-zinc-700"}`} />
          </div>
          <p className="text-xs text-zinc-600 truncate">{description}</p>
        </div>
        <ConnectAction connected={isConnected} busy={isBusy || disconnecting} step={step}
          onConnect={handleConnect} onDisconnect={handleDisconnect} errorMsg={errorMsg} />
      </div>
    );
  }

  return (
    <div className={`group relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${
      isConnected
        ? "border-white/[0.14] bg-white/[0.025] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
        : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    }`}>
      {/* Top colored stripe when connected */}
      {isConnected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${appColor}60, transparent)` }} />
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              isConnected
                ? "bg-white/[0.06] border border-white/[0.1]"
                : "bg-white/[0.04] border border-white/[0.07] group-hover:bg-white/[0.06]"
            }`}>{logo}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{appName}</span>
                <span className={`w-2 h-2 rounded-full transition-all ${isConnected ? "status-connected" : "bg-zinc-700"}`} />
              </div>
              <span className="text-xs text-zinc-600">{category}</span>
            </div>
          </div>
          <span className="text-xs text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded font-mono shrink-0">OAuth</span>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>

        {/* Progress steps — visible only when connecting */}
        {isBusy && (
          <div className="flex items-center gap-2 py-1">
            {(["opening", "authenticating", "saving"] as ConnectStep[]).map((s, i) => {
              const stepIdx = ["opening", "authenticating", "saving"].indexOf(step);
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone ? "bg-emerald-500" : isActive ? "bg-violet-500" : "bg-zinc-800"
                  }`}>
                    {isDone
                      ? <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5"><path d="M1.5 5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : isActive
                        ? <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    }
                  </div>
                  {i < 2 && <div className={`flex-1 h-px ${isDone ? "bg-emerald-500/40" : "bg-zinc-800"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center gap-2 py-1">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5"><path d="M1.5 5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-xs text-emerald-400 font-medium">Connexion réussie !</span>
          </div>
        )}

        {step === "error" && (
          <p className="text-xs text-red-400 bg-red-500/[0.07] border border-red-500/20 rounded-lg px-3 py-2">{errorMsg}</p>
        )}

        {/* CTA */}
        <ConnectAction
          connected={isConnected} busy={isBusy || disconnecting}
          step={step} onConnect={handleConnect} onDisconnect={handleDisconnect}
          errorMsg={errorMsg}
        />
      </div>
    </div>
  );
}

function ConnectAction({ connected, busy, step, onConnect, onDisconnect, errorMsg }: {
  connected: boolean; busy: boolean; step: ConnectStep;
  onConnect: () => void; onDisconnect: () => void; errorMsg: string;
}) {
  const label = STEP_LABELS[step] || (connected ? "Connecté" : "Connecter");
  if (connected) {
    return (
      <div className="flex items-center justify-between gap-3 w-full">
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1.5 5.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Connecté
        </span>
        <button onClick={onDisconnect} disabled={busy}
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1">
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
          Déconnecter
        </button>
      </div>
    );
  }
  return (
    <button onClick={onConnect} disabled={busy}
      className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.18] text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-wait">
      {busy
        ? <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
        : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
      }
      {busy ? label : "Connecter"}
    </button>
  );
}
