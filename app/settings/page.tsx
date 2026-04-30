"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const WA = "/api/bridge";

const PROVIDERS: { strategy: "oauth_google" | "oauth_microsoft"; label: string; icon: React.ReactNode }[] = [
  {
    strategy: "oauth_google", label: "Google",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>,
  },
  {
    strategy: "oauth_microsoft", label: "Microsoft",
    icon: <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>,
  },
];

const WaIcon = ({ color = "#25D366" }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.543 4.067 1.492 5.782L.057 23.249a.75.75 0 0 0 .917.932l5.578-1.461A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.659-.523-5.166-1.432l-.371-.222-3.852 1.009 1.026-3.744-.242-.386A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

const AppleIcon = ({ color = "white" }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 814 1000" fill={color}>
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
  </svg>
);

type WaStatus = "idle" | "connecting" | "qr" | "pairing" | "connected";
type AppleStatus = "form" | "connecting" | "connected";

// ── Row générique compte connecté ──────────────────────────────────────────────
function AccountRow({ icon, label, subtitle, connected, onConnect, onDisconnect, busy, connectLabel = "Connecter" }: {
  icon: React.ReactNode; label: string; subtitle?: string;
  connected: boolean; onConnect: () => void; onDisconnect: () => void;
  busy?: boolean; connectLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {connected ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Connecté
          </span>
          <button onClick={onDisconnect} disabled={busy} className="text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40">
            Retirer
          </button>
        </div>
      ) : (
        <button onClick={onConnect} disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-all">
          {busy ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
               : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>}
          {connectLabel}
        </button>
      )}
    </div>
  );
}

// ── Bannière bridge offline ────────────────────────────────────────────────────
function BridgeOfflineBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <p className="text-sm font-semibold text-red-400">Bridge local non détecté</p>
      </div>
      <p className="text-xs text-zinc-500">
        WhatsApp et Apple iCloud nécessitent le bridge local (port 3001).
        Ouvre PowerShell et lance&nbsp;:
      </p>
      <code className="text-xs text-emerald-300 bg-black/30 rounded-lg px-3 py-2 font-mono select-all">
        pm2 restart whatsapp-bridge
      </code>
      <button onClick={onRetry}
        className="self-start flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] px-3 py-1.5 rounded-lg transition-all">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Réessayer
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState("");

  // Bridge status global
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null); // null = checking

  // WhatsApp
  const [waStatus, setWaStatus] = useState<WaStatus>("idle");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waName, setWaName] = useState<string | null>(null);
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [waPhoneInput, setWaPhoneInput] = useState("");
  const [waMode, setWaMode] = useState<"qr" | "phone">("qr");
  const [waForcing, setWaForcing] = useState(false);
  const [qrTimedOut, setQrTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apple
  const [appleStatus, setAppleStatus] = useState<AppleStatus>("form");
  const [appleUser, setAppleUser] = useState<string | null>(null);
  const [appleId, setAppleId] = useState("");
  const [applePwd, setApplePwd] = useState("");
  const [appleError, setAppleError] = useState("");
  const [appleStep, setAppleStep] = useState<"guide" | "form">("guide");

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  // ── Vérification initiale du bridge ──────────────────────────────────────────
  const checkBridge = useCallback(async () => {
    try {
      // Vérifie d'abord que le bridge répond vraiment
      const statusResp = await fetch(`${WA}/status`, { signal: AbortSignal.timeout(3000) });
      if (!statusResp.ok) throw new Error("bridge error");
      const d = await statusResp.json();
      setBridgeOnline(true);

      if (d.status === "connected") {
        setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name);
      } else if (d.status === "qr") {
        setWaStatus("qr"); fetchQr();
      } else {
        setWaMode("qr"); setWaStatus("connecting");
      }

      // Apple status en parallèle (non bloquant)
      fetch(`${WA}/apple/status`, { signal: AbortSignal.timeout(2500) })
        .then(r => r.json())
        .then(da => { if (da.configured) { setAppleStatus("connected"); setAppleUser(da.username); } })
        .catch(() => {});
    } catch {
      setBridgeOnline(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    checkBridge();
  }, [isSignedIn, checkBridge]);

  // ── Polling WA ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const active = waStatus === "qr" || waStatus === "connecting" || waStatus === "pairing";
    if (!active) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } return; }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const d = await fetch(`${WA}/status`, { signal: AbortSignal.timeout(2000) }).then(r => r.json());
        if (d.status === "connected") {
          clearInterval(pollRef.current!); pollRef.current = null;
          setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name); setWaQr(null); setWaPairingCode(null);
        } else if (d.status === "qr" && waMode === "qr") {
          setWaStatus("qr"); fetchQr();
        } else if (d.pairingCode) {
          setWaPairingCode(d.pairingCode);
        }
      } catch {}
    }, 2500);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [waStatus, waMode]);

  async function fetchQr() {
    try {
      const q = await fetch(`${WA}/qr`, { signal: AbortSignal.timeout(3000) }).then(r => r.json());
      if (q.qr) { setWaQr(q.qr); setQrTimedOut(false); }
    } catch {}
  }

  // Démarre un timeout de 20s quand on attend le QR
  useEffect(() => {
    const waiting = (waStatus === "connecting" || waStatus === "qr") && waMode === "qr";
    if (!waiting) { setQrTimedOut(false); if (qrTimeoutRef.current) { clearTimeout(qrTimeoutRef.current); qrTimeoutRef.current = null; } return; }
    if (qrTimeoutRef.current) return;
    qrTimeoutRef.current = setTimeout(() => { setQrTimedOut(true); qrTimeoutRef.current = null; }, 20000);
    return () => { if (qrTimeoutRef.current) { clearTimeout(qrTimeoutRef.current); qrTimeoutRef.current = null; } };
  }, [waStatus, waMode]);

  // Force génération d'un nouveau QR : déconnecte la session actuelle → le bridge génère un QR frais
  async function waForceNewQr() {
    setWaForcing(true); setWaQr(null); setWaPairingCode(null);
    try { await fetch(`${WA}/logout`, { method: "POST", signal: AbortSignal.timeout(4000) }); } catch {}
    setWaMode("qr"); setWaStatus("connecting");
    setTimeout(() => setWaForcing(false), 2000);
  }

  async function waRequestPairing() {
    const digits = waPhoneInput.replace(/\D/g, "");
    if (!digits) return;
    setWaMode("phone"); setWaStatus("pairing"); setWaPairingCode(null);
    try {
      const r = await fetch(`${WA}/pairing-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }), signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      if (!r.ok) { setWaStatus("connecting"); setWaMode("qr"); return; }
      setWaPairingCode(d.code);
    } catch { setWaStatus("connecting"); setWaMode("qr"); }
  }

  async function waDisconnect() {
    await fetch(`${WA}/logout`, { method: "POST" }).catch(() => {});
    setWaStatus("idle"); setWaMode("qr"); setWaQr(null); setWaPhone(null); setWaName(null); setWaPairingCode(null);
  }

  async function appleConnect() {
    if (!appleId || !applePwd) return;
    setAppleStatus("connecting"); setAppleError("");
    try {
      const r = await fetch(`${WA}/apple/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: appleId, password: applePwd }),
        signal: AbortSignal.timeout(12000),
      });
      const d = await r.json();
      if (!r.ok) { setAppleError(d.error ?? "Identifiants invalides"); setAppleStatus("form"); return; }
      setAppleStatus("connected"); setAppleUser(appleId); setAppleId(""); setApplePwd("");
    } catch {
      setAppleError("Bridge inaccessible. Lance pm2 restart whatsapp-bridge."); setAppleStatus("form");
    }
  }

  async function appleDisconnect() {
    await fetch(`${WA}/apple/configure`, { method: "DELETE" }).catch(() => {});
    setAppleStatus("form"); setAppleUser(null); setAppleStep("guide");
  }

  async function connect(strategy: "oauth_google" | "oauth_microsoft") {
    setBusy(strategy); setOauthError("");
    try {
      const additionalScopes = strategy === "oauth_microsoft"
        ? ["https://graph.microsoft.com/Mail.ReadWrite", "https://graph.microsoft.com/Mail.Send",
           "https://graph.microsoft.com/Calendars.ReadWrite", "https://graph.microsoft.com/Chat.Read", "offline_access"]
        : undefined;
      await user!.createExternalAccount({
        strategy, redirectUrl: `${window.location.origin}/settings/sso-callback`,
        ...(additionalScopes ? { additionalScopes } : {}),
      });
    } catch (e: unknown) { setOauthError((e as Error)?.message ?? "Erreur"); setBusy(null); }
  }

  async function disconnect(id: string) {
    if (user!.externalAccounts.length <= 1 && !user!.passwordEnabled) { setOauthError("Dernier moyen de connexion."); return; }
    setBusy(id); setOauthError("");
    try { await user!.externalAccounts.find(a => a.id === id)?.destroy(); await user!.reload(); }
    catch (e: unknown) { setOauthError((e as Error)?.message ?? "Erreur"); }
    finally { setBusy(null); }
  }

  if (!isLoaded || !isSignedIn || !user) {
    return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>;
  }

  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 pt-28 pb-16 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez votre profil et vos comptes connectés</p>
        </div>

        {/* Profile */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-5">Profil</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-lg shrink-0">{initials || "?"}</div>
            <div><p className="font-semibold text-white">{displayName}</p><p className="text-sm text-zinc-500">{user.primaryEmailAddress?.emailAddress}</p></div>
          </div>
        </section>

        {/* Google + Microsoft */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Email & Agenda</h2>
          <p className="text-xs text-zinc-600 mb-5">Connectez Google ou Microsoft pour accéder à vos emails et calendrier.</p>
          <div className="space-y-3">
            {PROVIDERS.map(p => {
              const linked = user.externalAccounts.find(a => a.provider === p.strategy.replace("oauth_", ""));
              return (
                <AccountRow key={p.strategy} icon={p.icon} label={p.label}
                  subtitle={linked?.emailAddress} connected={!!linked}
                  onConnect={() => connect(p.strategy)} onDisconnect={() => linked && disconnect(linked.id)}
                  busy={busy === p.strategy || busy === linked?.id} />
              );
            })}
          </div>
          {oauthError && <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{oauthError}</p>}
        </section>

        {/* WhatsApp */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">WhatsApp</h2>
          <p className="text-xs text-zinc-600 mb-5">Lis et envoie des messages WhatsApp depuis l&apos;assistant.</p>

          {/* Bridge offline */}
          {bridgeOnline === false && <BridgeOfflineBanner onRetry={checkBridge} />}

          {/* Bridge checking */}
          {bridgeOnline === null && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
              <span className="w-3 h-3 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
              Vérification du bridge…
            </div>
          )}

          {/* WA connecté */}
          {bridgeOnline && waStatus === "connected" && (
            <AccountRow icon={<WaIcon />} label={waName ?? "WhatsApp"} subtitle={waPhone ? `+${waPhone}` : undefined}
              connected={true} onConnect={() => {}} onDisconnect={waDisconnect} />
          )}

          {/* WA idle (bridge up, pas encore lancé) */}
          {bridgeOnline && waStatus === "idle" && (
            <AccountRow icon={<WaIcon color="#52525b" />} label="WhatsApp" subtitle="Messages · Contacts"
              connected={false} onConnect={() => { setWaMode("qr"); setWaStatus("connecting"); }} onDisconnect={() => {}} />
          )}

          {/* Mode numéro de téléphone */}
          {bridgeOnline && waMode === "phone" && waStatus !== "pairing" && waStatus !== "connected" && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-2"><WaIcon /><p className="text-sm font-medium text-white">Connexion par numéro</p></div>
                <button onClick={() => { setWaMode("qr"); setWaStatus("connecting"); setWaQr(null); }} className="text-xs text-zinc-500 hover:text-zinc-300">← QR code</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Ton numéro WhatsApp (avec indicatif)</label>
                  <input type="tel" value={waPhoneInput} onChange={e => setWaPhoneInput(e.target.value)}
                    placeholder="+33 6 12 34 56 78" onKeyDown={e => e.key === "Enter" && waRequestPairing()} autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/50 transition-all" />
                </div>
                <button onClick={waRequestPairing} disabled={!waPhoneInput}
                  className="w-full bg-[#25D366] hover:bg-[#1fb855] disabled:opacity-40 text-black text-sm font-semibold py-2.5 rounded-xl transition-all">
                  Recevoir le code de liaison →
                </button>
              </div>
            </div>
          )}

          {/* Code de couplage */}
          {bridgeOnline && waStatus === "pairing" && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-2"><WaIcon /><p className="text-sm font-medium text-white">Entre ce code sur ton téléphone</p></div>
                <button onClick={() => { setWaStatus("connecting"); setWaMode("qr"); setWaPairingCode(null); }} className="text-xs text-zinc-600 hover:text-zinc-300">Annuler</button>
              </div>
              <div className="px-6 py-6 flex flex-col items-center gap-4">
                {waPairingCode ? (
                  <>
                    <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl px-8 py-4">
                      <p className="text-3xl font-bold tracking-[0.25em] text-[#25D366] font-mono">{waPairingCode}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-white">WhatsApp → ⋮ → Appareils liés</p>
                      <p className="text-xs text-zinc-500">→ Lier avec un numéro de téléphone → entre ce code</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                      En attente de connexion…
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-[#25D366] animate-spin" />
                    <p className="text-sm text-zinc-500">Génération du code…</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR code — mode principal */}
          {bridgeOnline && (waStatus === "qr" || (waStatus === "connecting" && waMode === "qr")) && (
            <div className="rounded-xl border border-[#25D366]/20 bg-[#25D366]/[0.03] overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#25D366]/10">
                <div className="flex items-center gap-2">
                  <WaIcon />
                  <p className="text-sm font-medium text-white">Connecter WhatsApp</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={waForceNewQr} disabled={waForcing}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white disabled:opacity-40 transition-colors">
                    {waForcing
                      ? <span className="w-3 h-3 rounded-full border border-zinc-400 border-t-transparent animate-spin" />
                      : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>}
                    Nouveau QR
                  </button>
                  <button onClick={() => { setWaStatus("idle"); setWaQr(null); }} className="text-xs text-zinc-600 hover:text-zinc-300">Annuler</button>
                </div>
              </div>

              <div className="px-6 py-6 flex flex-col items-center gap-5">
                {waQr ? (
                  <>
                    <div className="bg-white rounded-2xl p-3 shadow-[0_0_40px_rgba(37,211,102,0.15)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={waQr} alt="QR WhatsApp" className="w-56 h-56" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">Scanne avec ton téléphone</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        WhatsApp → <span className="text-zinc-300">⋮</span> → <span className="text-zinc-300">Appareils liés</span> → Lier un appareil
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                      En attente du scan — expire dans ~60s
                    </div>
                  </>
                ) : qrTimedOut ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg">!</div>
                    <p className="text-sm font-medium text-amber-300">QR code non généré</p>
                    <p className="text-xs text-zinc-500 text-center max-w-xs">Le bridge ne répond pas. Vérifie que pm2 tourne :<br/><code className="text-emerald-300">pm2 restart whatsapp-bridge</code></p>
                    <button onClick={() => { setQrTimedOut(false); waForceNewQr(); }} className="mt-1 text-xs font-semibold text-white bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 px-4 py-2 rounded-xl transition-all">
                      Réessayer
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-[#25D366] animate-spin" />
                    <p className="text-sm text-zinc-500">Génération du QR code…</p>
                    <p className="text-xs text-zinc-600">Si ça bloque → clique sur <span className="text-zinc-400">Nouveau QR</span> ci-dessus</p>
                  </div>
                )}
                <button onClick={() => setWaMode("phone")}
                  className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors underline underline-offset-2">
                  S&apos;identifier par numéro de téléphone
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Apple iCloud */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <AppleIcon color="#71717a" />
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Apple iCloud</h2>
          </div>
          <p className="text-xs text-zinc-600 mb-5">Accède à ton Calendrier et tes Contacts Apple depuis l&apos;assistant.</p>

          {/* Bridge offline */}
          {bridgeOnline === false && <BridgeOfflineBanner onRetry={checkBridge} />}

          {/* Apple connecté */}
          {bridgeOnline && appleStatus === "connected" && (
            <AccountRow
              icon={<AppleIcon />}
              label="Apple iCloud" subtitle={appleUser ?? undefined}
              connected={true} onConnect={() => {}} onDisconnect={appleDisconnect}
            />
          )}

          {/* Apple vérification */}
          {bridgeOnline && appleStatus === "connecting" && (
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-4">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin shrink-0" />
              <p className="text-sm text-zinc-400">Vérification des identifiants iCloud…</p>
            </div>
          )}

          {/* Apple guide */}
          {bridgeOnline !== false && appleStatus === "form" && appleStep === "guide" && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-5 space-y-5">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Apple ne propose pas de connexion OAuth comme Google. Pour accéder à ton Calendrier et tes Contacts, tu dois générer un <strong className="text-white">mot de passe d&apos;app</strong> (2 min).
                </p>

                <div className="space-y-3">
                  {[
                    { n: "1", text: "Va sur appleid.apple.com et connecte-toi" },
                    { n: "2", text: "Connexion et sécurité → Mots de passe spécifiques → +" },
                    { n: "3", text: "Donne un nom (ex : \"Trigr\") → copie le mot de passe généré" },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                      <p className="text-xs text-zinc-400 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all border border-white/[0.08]">
                    <AppleIcon color="white" />
                    Aller sur appleid.apple.com →
                  </a>
                </div>
                <button onClick={() => setAppleStep("form")}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
                  J&apos;ai déjà mon mot de passe d&apos;app
                </button>
              </div>
            </div>
          )}

          {/* Apple formulaire */}
          {bridgeOnline !== false && appleStatus === "form" && appleStep === "form" && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 space-y-4">
                <button onClick={() => setAppleStep("guide")} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Retour au guide
                </button>

                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Apple ID (ton email iCloud)</label>
                  <input type="email" value={appleId} onChange={e => setAppleId(e.target.value)}
                    placeholder="prenom@icloud.com" autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/60 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                    Mot de passe d&apos;app
                    <span className="ml-1 text-zinc-600 font-normal">(format xxxx-xxxx-xxxx-xxxx)</span>
                  </label>
                  <input type="password" value={applePwd} onChange={e => setApplePwd(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx" onKeyDown={e => e.key === "Enter" && appleConnect()}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/60 transition-all font-mono" />
                  <p className="text-xs text-zinc-600 mt-1">Pas ton mot de passe iCloud habituel — celui généré sur appleid.apple.com</p>
                </div>

                {appleError && (
                  <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/>
                    </svg>
                    {appleError}
                  </div>
                )}

                <button onClick={appleConnect} disabled={!appleId || !applePwd}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-all border border-white/[0.08] flex items-center justify-center gap-2">
                  <AppleIcon color="white" />
                  Connecter Apple iCloud
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
