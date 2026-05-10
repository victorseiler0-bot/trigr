"use client";

import { useEffect, useRef, useState } from "react";

type ConnectStep = "idle" | "opening" | "authenticating" | "saving" | "done" | "error";

interface Props {
  appSlug: string;
  appName: string;
  appColor: string;
  connected: boolean;
  accountId?: string;
  logo: React.ReactNode;
  description: string;
  category: string;
  onConnected: (accountId: string) => void;
  onDisconnected: () => void;
  // userId kept for API compat but unused in component (backend reads from Clerk session)
  userId?: string;
}

const STEP_LABELS: Partial<Record<ConnectStep, string>> = {
  opening: "Récupération du token…",
  authenticating: "Autorisation en cours…",
  saving: "Sauvegarde…",
};

export function PipedreamConnectButton({
  appSlug, appName, appColor, connected, accountId,
  logo, description, category, onConnected, onDisconnected,
}: Props) {
  const [step, setStep] = useState<ConnectStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const pdRef = useRef<import("@pipedream/sdk/browser").PipedreamClient | null>(null);

  // Initialise le client une seule fois — sans options (token passé par appel)
  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("@pipedream/sdk/browser").then(({ createFrontendClient }: any) => {
      if (!alive) return;
      pdRef.current = createFrontendClient();
    });
    return () => { alive = false; };
  }, []);

  async function handleConnect() {
    if (!pdRef.current || step !== "idle") return;
    setStep("opening"); setErrorMsg("");

    // 1. Récupère un connect token depuis notre backend (lié au user Clerk)
    let token: string;
    try {
      const r = await fetch("/api/pipedream/token", { method: "POST" });
      if (!r.ok) throw new Error(`Token fetch ${r.status}`);
      const body = await r.json();
      token = body.token;
      if (!token) throw new Error("Token vide dans la réponse");
    } catch (e: unknown) {
      setStep("error");
      setErrorMsg(`Erreur token : ${(e as Error).message}`);
      setTimeout(() => setStep("idle"), 4000);
      return;
    }

    setStep("authenticating");

    // 2. Ouvre l'iframe OAuth Pipedream avec le token
    try {
      await pdRef.current.connectAccount({
        token,
        app: appSlug,
        onSuccess: async ({ id }) => {
          setStep("saving");
          try {
            const r = await fetch("/api/pipedream/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appSlug, accountId: id }),
            });
            if (!r.ok) throw new Error("Sauvegarde échouée");
            setStep("done");
            onConnected(id);
            setTimeout(() => setStep("idle"), 2000);
          } catch (e: unknown) {
            setStep("error");
            setErrorMsg(`Sauvegarde : ${(e as Error).message}`);
          }
        },
        onError: (err: Error) => {
          setStep("error");
          setErrorMsg(err?.message ?? "Erreur OAuth Pipedream");
          setTimeout(() => setStep("idle"), 4000);
        },
        onClose: () => {
          setStep(s => (s === "authenticating" || s === "opening") ? "idle" : s);
        },
      });
    } catch (e: unknown) {
      setStep("error");
      setErrorMsg((e as Error)?.message ?? "Erreur inattendue");
      setTimeout(() => setStep("idle"), 4000);
    }
  }

  async function handleDisconnect() {
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
  }

  const isBusy = step === "opening" || step === "authenticating" || step === "saving";
  const isConnected = connected && step !== "error";
  const STEPS_LIST: ConnectStep[] = ["opening", "authenticating", "saving"];
  const stepIdx = STEPS_LIST.indexOf(step);

  return (
    <div className={`relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 bg-white ${
      isConnected
        ? "border-slate-200 shadow-md"
        : "border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
    }`}>
      {isConnected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${appColor}50, transparent)` }} />
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              {logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{appName}</span>
                <span className={`w-2 h-2 rounded-full transition-all ${isConnected ? "status-connected" : "status-disconnected"}`} />
              </div>
              <span className="text-xs text-slate-400">{category}</span>
            </div>
          </div>
          <span className="text-xs text-slate-400 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded font-mono shrink-0">OAuth</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>

        {/* Barre de progression */}
        {isBusy && stepIdx >= 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              {STEPS_LIST.map((s, i) => {
                const isActive = i === stepIdx;
                const isDone = i < stepIdx;
                return (
                  <div key={s} className="flex items-center gap-1.5 flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isDone ? "bg-emerald-500" : isActive ? "bg-violet-600" : "bg-slate-200"
                    }`}>
                      {isDone
                        ? <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5"><path d="M1.5 4.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : isActive
                          ? <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      }
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center">{STEP_LABELS[step]}</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center gap-2 justify-center py-1">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5"><path d="M1.5 4.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-xs font-medium text-emerald-600">Connexion réussie !</span>
          </div>
        )}

        {step === "error" && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 break-words">{errorMsg}</p>
        )}

        {/* CTA */}
        {isConnected ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1.5 5.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Connecté
            </span>
            <button onClick={handleDisconnect} disabled={disconnecting}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40">
              Déconnecter
            </button>
          </div>
        ) : (
          <button onClick={handleConnect} disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-wait">
            {isBusy
              ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
            }
            {isBusy ? (STEP_LABELS[step] ?? "Connexion…") : "Connecter"}
          </button>
        )}
      </div>
    </div>
  );
}
