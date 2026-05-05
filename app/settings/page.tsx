"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const APPLE = "/api/apple/connect";
const NOTION = "/api/notion/connect";
const SLACK = "/api/slack/connect";
const HUBSPOT = "/api/hubspot/connect";
const WHAPI = "/api/whapi";

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

type WaStatus = "idle" | "checking" | "qr" | "connected";
type AppleStatus = "form" | "connecting" | "connected";

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

  // WhatsApp — uniquement Whapi.cloud
  const [waStatus, setWaStatus] = useState<WaStatus>("idle");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waName, setWaName] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apple
  const [appleStatus, setAppleStatus] = useState<AppleStatus>("form");
  const [appleUser, setAppleUser] = useState<string | null>(null);
  const [appleId, setAppleId] = useState("");
  const [applePwd, setApplePwd] = useState("");
  const [appleError, setAppleError] = useState("");

  // Notion
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionWorkspace, setNotionWorkspace] = useState<string | null>(null);

  // Slack
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState<string | null>(null);

  // HubSpot
  const [hubspotConnected, setHubspotConnected] = useState(false);

  // Abonnement
  const [plan, setPlan] = useState<"free" | "solo" | "pro" | "equipe">("free");
  const [subBusy, setSubBusy] = useState<string | null>(null);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/subscription").then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); }).catch(() => {});
    fetch(NOTION).then(r => r.json()).then(d => { if (d.configured) { setNotionConnected(true); setNotionWorkspace(d.workspace); } }).catch(() => {});
    fetch(SLACK).then(r => r.json()).then(d => { if (d.configured) { setSlackConnected(true); setSlackTeam(d.team); } }).catch(() => {});
    fetch(HUBSPOT).then(r => r.json()).then(d => { if (d.configured) setHubspotConnected(true); }).catch(() => {});
  }, [isSignedIn]);

  // ── Vérification initiale Whapi ──────────────────────────────────────────────
  const checkWhapi = useCallback(async () => {
    setWaStatus("checking");
    try {
      const r = await fetch(`${WHAPI}/connect`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) { setWaStatus("idle"); return; }
      const d = await r.json();
      if (d.connected) {
        setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name);
      } else if (d.qr) {
        setWaQr(d.qr); setWaStatus("qr");
      } else {
        setWaStatus("idle");
      }
    } catch { setWaStatus("idle"); }

    // Apple en parallèle
    fetch(APPLE, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(d => { if (d.configured) { setAppleStatus("connected"); setAppleUser(d.email); } })
      .catch(() => {});
  }, []);

  useEffect(() => { if (isSignedIn) checkWhapi(); }, [isSignedIn, checkWhapi]);

  // ── Polling QR jusqu'à connexion ─────────────────────────────────────────────
  useEffect(() => {
    if (waStatus !== "qr") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const d = await fetch(`${WHAPI}/connect`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        if (d.connected) {
          clearInterval(pollRef.current!); pollRef.current = null;
          setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name); setWaQr(null);
        } else if (d.qr && d.qr !== waQr) {
          setWaQr(d.qr);
        }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [waStatus, waQr]);

  // ── Actions WhatsApp ──────────────────────────────────────────────────────────
  async function waConnect() {
    setWaStatus("checking");
    await checkWhapi();
  }

  async function waDisconnect() {
    await fetch(`${WHAPI}/connect`, { method: "DELETE" }).catch(() => {});
    setWaStatus("idle"); setWaQr(null); setWaPhone(null); setWaName(null);
  }

  // ── Actions Apple ─────────────────────────────────────────────────────────────
  async function appleConnect() {
    if (!appleId || !applePwd) return;
    setAppleStatus("connecting"); setAppleError("");
    try {
      const r = await fetch(APPLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: appleId, appPassword: applePwd }),
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      if (!r.ok) { setAppleError(d.error ?? "Identifiants invalides"); setAppleStatus("form"); return; }
      setAppleStatus("connected"); setAppleUser(appleId); setAppleId(""); setApplePwd("");
    } catch {
      setAppleError("Erreur de connexion."); setAppleStatus("form");
    }
  }

  async function appleDisconnect() {
    await fetch(APPLE, { method: "DELETE" }).catch(() => {});
    setAppleStatus("form"); setAppleUser(null);
  }

  // ── Actions OAuth ─────────────────────────────────────────────────────────────
  async function upgradePlan(targetPlan: string) {
    setSubBusy(targetPlan);
    try {
      const r = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch { /* ignore */ } finally { setSubBusy(null); }
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

          {/* Chargement initial */}
          {waStatus === "checking" && (
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5">
              <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-[#25D366] animate-spin shrink-0" />
              <p className="text-sm text-zinc-500">Vérification…</p>
            </div>
          )}

          {/* Non connecté */}
          {waStatus === "idle" && (
            <AccountRow
              icon={<WaIcon color="#52525b" />}
              label="WhatsApp" subtitle="Messages · Contacts"
              connected={false}
              onConnect={waConnect}
              onDisconnect={() => {}}
            />
          )}

          {/* Connecté */}
          {waStatus === "connected" && (
            <AccountRow
              icon={<WaIcon />}
              label={waName ?? "WhatsApp"}
              subtitle={waPhone ?? undefined}
              connected={true}
              onConnect={() => {}}
              onDisconnect={waDisconnect}
            />
          )}

          {/* QR — session expirée, re-scan nécessaire */}
          {waStatus === "qr" && (
            <div className="rounded-xl border border-[#25D366]/20 bg-[#25D366]/[0.03] overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#25D366]/10">
                <div className="flex items-center gap-2">
                  <WaIcon />
                  <p className="text-sm font-medium text-white">Scanner le QR WhatsApp</p>
                </div>
                <button onClick={() => setWaStatus("idle")} className="text-xs text-zinc-600 hover:text-zinc-300">Annuler</button>
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
                      En attente du scan…
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-[#25D366] animate-spin" />
                    <p className="text-sm text-zinc-500">Génération du QR…</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Apple iCloud */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Apple iCloud</h2>
          <p className="text-xs text-zinc-600 mb-5">Calendrier et Contacts Apple dans l&apos;assistant.</p>

          {appleStatus === "connected" && (
            <AccountRow icon={<AppleIcon />} label="Apple iCloud" subtitle={appleUser ?? undefined}
              connected={true} onConnect={() => {}} onDisconnect={appleDisconnect} />
          )}

          {appleStatus === "connecting" && (
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-4">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin shrink-0" />
              <p className="text-sm text-zinc-400">Vérification…</p>
            </div>
          )}

          {appleStatus === "form" && (
            <div className="space-y-3">
              <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] rounded-xl px-4 py-3.5 transition-all group">
                <div className="flex items-center gap-3">
                  <AppleIcon color="white" />
                  <div>
                    <p className="text-sm font-medium text-white">Générer un mot de passe Apple</p>
                    <p className="text-xs text-zinc-500">appleid.apple.com → Connexion et sécurité → Mots de passe spécifiques → +</p>
                  </div>
                </div>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 space-y-3">
                <input type="email" value={appleId} onChange={e => setAppleId(e.target.value)}
                  placeholder="Apple ID (ex : prenom@icloud.com)"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/60 transition-all" />
                <input type="password" value={applePwd} onChange={e => setApplePwd(e.target.value)}
                  placeholder="Mot de passe d'app (xxxx-xxxx-xxxx-xxxx)"
                  onKeyDown={e => e.key === "Enter" && appleConnect()}
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/60 transition-all font-mono" />
                {appleError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{appleError}</p>}
                <button onClick={appleConnect} disabled={!appleId || !applePwd}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-all border border-white/[0.08]">
                  Connecter Apple iCloud
                </button>
              </div>
            </div>
          )}
        </section>
        {/* Notion */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Notion</h2>
          <p className="text-xs text-zinc-600 mb-5">Lis et crée des pages Notion depuis l&apos;assistant.</p>
          {notionConnected ? (
            <AccountRow
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg>}
              label="Notion"
              subtitle={notionWorkspace ?? undefined}
              connected={true}
              onConnect={() => {}}
              onDisconnect={async () => {
                await fetch(NOTION, { method: "DELETE" });
                setNotionConnected(false); setNotionWorkspace(null);
              }}
            />
          ) : (
            <AccountRow
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#52525b"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg>}
              label="Notion"
              subtitle="Pages · Databases"
              connected={false}
              onConnect={() => window.location.href = `${NOTION}?action=authorize`}
              onDisconnect={() => {}}
            />
          )}
        </section>

        {/* Slack */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Slack</h2>
          <p className="text-xs text-zinc-600 mb-5">Lis et envoie des messages Slack depuis l&apos;assistant.</p>
          {slackConnected ? (
            <AccountRow
              icon={<svg width="18" height="18" viewBox="0 0 122.8 122.8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/>
                <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/>
                <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0S90.5 5.8 90.5 12.9v32.3z" fill="#2EB67D"/>
                <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/>
              </svg>}
              label={slackTeam ?? "Slack"}
              subtitle="Canaux · Messages"
              connected={true}
              onConnect={() => {}}
              onDisconnect={async () => { await fetch(SLACK, { method: "DELETE" }); setSlackConnected(false); setSlackTeam(null); }}
            />
          ) : (
            <AccountRow
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#52525b"><path d="M6.194 14.644c0 1.16-.943 2.107-2.097 2.107-1.154 0-2.097-.946-2.097-2.107 0-1.16.943-2.107 2.097-2.107H6.194v2.107zm1.061 0c0-1.16.943-2.107 2.097-2.107 1.154 0 2.097.946 2.097 2.107v5.27c0 1.16-.943 2.107-2.097 2.107-1.154 0-2.097-.946-2.097-2.107v-5.27zm2.097-8.45c-1.154 0-2.097-.946-2.097-2.107C7.255.927 8.198-.02 9.352-.02c1.154 0 2.097.946 2.097 2.107v2.107H9.352zm0 1.061c1.154 0 2.097.946 2.097 2.107 0 1.16-.943 2.107-2.097 2.107H4.097C2.943 11.469 2 10.522 2 9.362c0-1.16.943-2.107 2.097-2.107h5.255zm8.45 2.107c0-1.16.943-2.107 2.097-2.107S22 8.101 22 9.262c0 1.16-.943 2.107-2.097 2.107H17.9V9.362zm-1.061 0c0 1.16-.943 2.107-2.097 2.107-1.154 0-2.097-.946-2.097-2.107V4.093C12.645 2.932 13.588 1.986 14.742 1.986c1.154 0 2.097.946 2.097 2.107v5.27zm-2.097 8.45c1.154 0 2.097.946 2.097 2.107 0 1.16-.943 2.107-2.097 2.107-1.154 0-2.097-.946-2.097-2.107v-2.107h2.097zm0-1.061c-1.154 0-2.097-.946-2.097-2.107 0-1.16.943-2.107 2.097-2.107h5.255C20.057 12.537 21 13.483 21 14.644c0 1.16-.943 2.107-2.097 2.107h-5.255z"/></svg>}
              label="Slack"
              subtitle="Canaux · Messages"
              connected={false}
              onConnect={() => window.location.href = `${SLACK}?action=authorize`}
              onDisconnect={() => {}}
            />
          )}
        </section>

        {/* HubSpot */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">HubSpot CRM</h2>
          <p className="text-xs text-zinc-600 mb-5">Gérez vos contacts et deals HubSpot depuis l&apos;assistant.</p>
          <AccountRow
            icon={<svg width="20" height="20" viewBox="0 0 512 512" fill={hubspotConnected ? "#FF7A59" : "#52525b"}><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 515.3 173.9 515.3s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7zM346.5 368.5c-40.8 0-74-33.2-74-74s33.2-74 74-74 74 33.2 74 74-33.2 74-74 74z"/><path d="M285.1 219.2v-60.3c9.3-4.3 15.8-13.7 15.8-24.6v-.8c0-14.9-12.1-27.1-27.1-27.1h-.8c-14.9 0-27.1 12.1-27.1 27.1v.8c0 10.9 6.4 20.3 15.8 24.6v60.3c-14.2 2.1-27.3 7.7-38.5 16.2L122.5 119.7c.9-3.1 1.4-6.4 1.4-9.8 0-20.3-16.5-36.8-36.8-36.8s-36.8 16.5-36.8 36.8 16.5 36.8 36.8 36.8c8.5 0 16.3-2.9 22.5-7.7l99.8 113.5c-16.4 19.3-26.2 44.3-26.2 71.6 0 60.5 49.1 109.7 109.7 109.7s109.7-49.1 109.7-109.7c0-55.8-41.8-101.9-95.5-108.7z"/></svg>}
            label="HubSpot CRM"
            subtitle="Contacts · Deals · Pipeline"
            connected={hubspotConnected}
            onConnect={() => window.location.href = `${HUBSPOT}?action=authorize`}
            onDisconnect={async () => { await fetch(HUBSPOT, { method: "DELETE" }); setHubspotConnected(false); }}
          />
        </section>

        {/* Abonnement */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Abonnement</h2>
          <p className="text-xs text-zinc-600 mb-5">Votre plan actuel et les options disponibles.</p>

          {/* Plan actuel */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-zinc-300">Plan actuel :</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              plan === "free" ? "bg-zinc-800 text-zinc-400" :
              plan === "solo" ? "bg-violet-900/40 text-violet-300 border border-violet-500/30" :
              plan === "pro" ? "bg-cyan-900/40 text-cyan-300 border border-cyan-500/30" :
              "bg-amber-900/40 text-amber-300 border border-amber-500/30"
            }`}>
              {plan === "free" ? "Gratuit" : plan === "solo" ? "Solo" : plan === "pro" ? "Pro" : "Équipe"}
            </span>
          </div>

          {/* Cards plans */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "solo", name: "Solo", price: "9€/mois", features: ["3 intégrations", "50 actions/jour", "1 utilisateur"] },
              { id: "pro", name: "Pro", price: "19€/mois", features: ["Toutes intégrations", "Illimité", "1 utilisateur"], highlight: true },
              { id: "equipe", name: "Équipe", price: "49€/mois", features: ["Toutes intégrations", "Illimité", "5 utilisateurs"] },
            ].map(p => (
              <div key={p.id} className={`rounded-xl border p-4 flex flex-col gap-3 ${
                p.highlight ? "border-violet-500/40 bg-violet-500/[0.05]" : "border-white/[0.07] bg-white/[0.02]"
              } ${plan === p.id ? "ring-1 ring-violet-400/40" : ""}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-white text-sm">{p.name}</span>
                  <span className="text-xs text-zinc-400">{p.price}</span>
                </div>
                <ul className="space-y-1">
                  {p.features.map(f => (
                    <li key={f} className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {plan === p.id ? (
                  <span className="text-xs text-center text-violet-400 font-medium">Plan actuel</span>
                ) : (
                  <button onClick={() => upgradePlan(p.id)} disabled={!!subBusy}
                    className={`text-xs font-semibold py-1.5 px-3 rounded-lg transition-all disabled:opacity-40 ${
                      p.highlight ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/[0.08]"
                    }`}>
                    {subBusy === p.id
                      ? <span className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Redirection…</span>
                      : "Choisir ce plan"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
