"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const WA = "http://localhost:3001";

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

type WaStatus = "idle" | "connecting" | "qr" | "pairing" | "connected" | "error";
type AppleStatus = "idle" | "form" | "connecting" | "connected" | "error";

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

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState("");

  // WhatsApp
  const [waStatus, setWaStatus] = useState<WaStatus>("idle");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waName, setWaName] = useState<string | null>(null);
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [waPhoneInput, setWaPhoneInput] = useState("");
  const [waMode, setWaMode] = useState<"choose" | "qr" | "phone">("choose");
  const [waError, setWaError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apple — formulaire visible par défaut, remplacé par "connected" si déjà configuré
  const [appleStatus, setAppleStatus] = useState<AppleStatus>("form");
  const [appleUser, setAppleUser] = useState<string | null>(null);
  const [appleId, setAppleId] = useState("");
  const [applePwd, setApplePwd] = useState("");
  const [appleError, setAppleError] = useState("");

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  // Check initial WA + Apple status
  useEffect(() => {
    if (!isSignedIn) return;
    fetch(`${WA}/status`, { signal: AbortSignal.timeout(2000) })
      .then(r => r.json()).then(d => {
        if (d.status === "connected") { setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name); }
        else if (d.status === "qr") { setWaStatus("qr"); fetchQr(); }
        else {
          // Bridge accessible mais non connecté → démarrer QR directement
          setWaMode("qr"); setWaStatus("connecting");
        }
      }).catch(() => {
        // Bridge inaccessible → garder "idle" pour montrer bouton Connecter
      });
    fetch(`${WA}/apple/status`, { signal: AbortSignal.timeout(2000) })
      .then(r => r.json()).then(d => {
        if (d.configured) { setAppleStatus("connected"); setAppleUser(d.username); }
        // Sinon reste "form" (état initial)
      }).catch(() => {
        // Bridge inaccessible → garde "form" pour montrer le formulaire
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Poll WA when in connecting/qr/pairing state
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
      if (q.qr) setWaQr(q.qr);
    } catch {}
  }

  function waStartConnect() {
    // Va directement en mode QR
    setWaMode("qr"); setWaQr(null); setWaPairingCode(null); setWaError("");
    waChooseQr();
  }

  async function waChooseQr() {
    setWaMode("qr"); setWaStatus("connecting"); setWaQr(null); setWaError("");
    try {
      const d = await fetch(`${WA}/status`, { signal: AbortSignal.timeout(3000) }).then(r => r.json());
      if (d.status === "connected") { setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name); return; }
      if (d.status === "qr") { setWaStatus("qr"); fetchQr(); return; }
    } catch {}
  }

  async function waRequestPairing() {
    const digits = waPhoneInput.replace(/\D/g, "");
    if (!digits) return;
    setWaError(""); setWaMode("phone"); setWaStatus("pairing"); setWaPairingCode(null);
    try {
      const r = await fetch(`${WA}/pairing-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }), signal: AbortSignal.timeout(15000),
      });
      const d = await r.json();
      if (!r.ok) { setWaError(d.error ?? "Erreur"); setWaStatus("idle"); setWaMode("choose"); return; }
      setWaPairingCode(d.code);
    } catch (e) { setWaError((e as Error).message); setWaStatus("idle"); setWaMode("choose"); }
  }

  async function waDisconnect() {
    await fetch(`${WA}/logout`, { method: "POST" }).catch(() => {});
    setWaStatus("idle"); setWaMode("choose"); setWaQr(null); setWaPhone(null); setWaName(null); setWaPairingCode(null);
  }

  async function appleConnect() {
    if (!appleId || !applePwd) return;
    setAppleStatus("connecting"); setAppleError("");
    try {
      const r = await fetch(`${WA}/apple/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: appleId, password: applePwd }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      if (!r.ok) { setAppleError(d.error ?? "Erreur"); setAppleStatus("form"); return; }
      setAppleStatus("connected"); setAppleUser(appleId); setAppleId(""); setApplePwd("");
    } catch (e) {
      setAppleError((e as Error).message ?? "Bridge inaccessible"); setAppleStatus("form");
    }
  }

  async function appleDisconnect() {
    await fetch(`${WA}/apple/configure`, { method: "DELETE" }).catch(() => {});
    setAppleStatus("idle"); setAppleUser(null);
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
          <p className="text-xs text-zinc-600 mb-5">Lis et envoie des messages WhatsApp depuis l'assistant.</p>

          {/* WA icon helper */}
          {(() => {
            const WaIcon = ({ color = "#25D366" }: { color?: string }) => (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.543 4.067 1.492 5.782L.057 23.249a.75.75 0 0 0 .917.932l5.578-1.461A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.659-.523-5.166-1.432l-.371-.222-3.852 1.009 1.026-3.744-.242-.386A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            );

            if (waStatus === "connected") return (
              <AccountRow icon={<WaIcon />} label={waName ?? "WhatsApp"} subtitle={waPhone ? `+${waPhone}` : undefined}
                connected={true} onConnect={() => {}} onDisconnect={waDisconnect} />
            );

            if (waStatus === "idle" || waStatus === "error") return (
              <>
                {waStatus === "error" && (
                  <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 mb-3">
                    Bridge inaccessible. Vérifie que pm2 tourne.
                  </p>
                )}
                <AccountRow icon={<WaIcon color="#52525b" />} label="WhatsApp" subtitle="Messages · Contacts"
                  connected={false} onConnect={waStartConnect} onDisconnect={() => {}} />
              </>
            );

            // (pas d'écran de choix — on va direct en QR)

            // Formulaire numéro de téléphone (option alternative, visible en overlay dans le QR panel)
            if (waMode === "phone" && waStatus !== "pairing") return (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
                  <div className="flex items-center gap-2"><WaIcon color="#25D366" /><p className="text-sm font-medium text-white">Connexion par numéro</p></div>
                  <button onClick={waChooseQr} className="text-xs text-zinc-500 hover:text-zinc-300">← Retour au QR</button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Ton numéro WhatsApp</label>
                    <input type="tel" value={waPhoneInput} onChange={e => setWaPhoneInput(e.target.value)}
                      placeholder="+33 6 12 34 56 78" onKeyDown={e => e.key === "Enter" && waRequestPairing()}
                      className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/50 transition-all" />
                  </div>
                  {waError && <p className="text-xs text-red-400">{waError}</p>}
                  <button onClick={waRequestPairing} disabled={!waPhoneInput}
                    className="w-full bg-[#25D366] hover:bg-[#1fb855] disabled:opacity-40 text-black text-sm font-semibold py-2.5 rounded-xl transition-all">
                    Recevoir le code →
                  </button>
                </div>
              </div>
            );

            // Code de couplage affiché
            if (waStatus === "pairing") return (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
                  <div className="flex items-center gap-2"><WaIcon color="#25D366" /><p className="text-sm font-medium text-white">Entre ce code sur ton téléphone</p></div>
                  <button onClick={() => { setWaStatus("idle"); setWaMode("choose"); setWaPairingCode(null); }} className="text-xs text-zinc-600 hover:text-zinc-300">Annuler</button>
                </div>
                <div className="px-6 py-6 flex flex-col items-center gap-4">
                  {waPairingCode ? (
                    <>
                      <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl px-8 py-4">
                        <p className="text-3xl font-bold tracking-[0.25em] text-[#25D366] font-mono">{waPairingCode}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-white">WhatsApp → Appareils liés</p>
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
            );

            // QR mode (mode principal)
            if (waStatus === "qr" || (waStatus === "connecting" && waMode === "qr")) return (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
                  <div className="flex items-center gap-2"><WaIcon color="#25D366" /><p className="text-sm font-medium text-white">Connecter WhatsApp</p></div>
                  <button onClick={() => { setWaStatus("idle"); setWaMode("qr"); setWaQr(null); }} className="text-xs text-zinc-600 hover:text-zinc-300">Annuler</button>
                </div>
                <div className="px-6 py-6 flex flex-col items-center gap-4">
                  {waQr ? (
                    <>
                      <div className="bg-white rounded-2xl p-3 shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={waQr} alt="QR WhatsApp" className="w-52 h-52" />
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
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-[#25D366] animate-spin" />
                      <p className="text-sm text-zinc-500">Génération du QR code…</p>
                    </div>
                  )}
                  <button onClick={() => { setWaMode("phone"); setWaStatus("connecting"); }}
                    className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors underline underline-offset-2 mt-1">
                    Par numéro de téléphone
                  </button>
                </div>
              </div>
            );

            return null;
          })()}
        </section>

        {/* Apple iCloud */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" className="text-zinc-400">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
            </svg>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Apple iCloud</h2>
          </div>
          <p className="text-xs text-zinc-600 mb-5">Connecte iCloud pour accéder à ton Calendrier et tes Contacts Apple.</p>

          {/* Apple — connecté */}
          {appleStatus === "connected" && (
            <AccountRow
              icon={<svg width="20" height="20" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>}
              label="Apple iCloud" subtitle={appleUser ?? undefined}
              connected={true} onConnect={() => {}} onDisconnect={appleDisconnect}
            />
          )}

          {/* Apple — vérification */}
          {appleStatus === "connecting" && (
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-4">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin shrink-0" />
              <p className="text-sm text-zinc-400">Vérification des identifiants iCloud…</p>
            </div>
          )}

          {/* Apple — formulaire identifiants (visible par défaut) */}
          {appleStatus === "form" && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3.5 flex items-center gap-2 border-b border-white/[0.06]">
                <svg width="16" height="16" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
                <p className="text-sm font-medium text-white">Connexion Apple iCloud</p>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Apple ID</label>
                  <input type="email" value={appleId} onChange={e => setAppleId(e.target.value)}
                    placeholder="prenom@icloud.com" autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                    Mot de passe d'app spécifique
                    <a href="https://appleid.apple.com" target="_blank" rel="noreferrer" className="ml-2 text-violet-400 hover:underline font-normal normal-case">
                      Générer →
                    </a>
                  </label>
                  <input type="password" value={applePwd} onChange={e => setApplePwd(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx" onKeyDown={e => e.key === "Enter" && appleConnect()}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all font-mono" />
                  <p className="text-xs text-zinc-600 mt-1.5">appleid.apple.com → Sécurité → Mots de passe spécifiques → <span className="text-zinc-400">+</span> → "Trigr"</p>
                </div>
                {appleError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{appleError}</p>}
                <button onClick={appleConnect} disabled={!appleId || !applePwd}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
                  Connecter iCloud →
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
