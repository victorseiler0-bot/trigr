"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Tab = "account" | "workflows" | "subscription";
type WaStatus = "idle" | "checking" | "connected";

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
}

// ── Google logo ───────────────────────────────────────────────────────────────
function GoogleLogo() {
  return <svg viewBox="0 0 18 18" width="20" height="20" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>;
}

function WorkflowToggle({ wf, onToggle, toggling }: { wf: N8nWorkflow; onToggle: (id: string, active: boolean) => void; toggling: string | null }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all ${
      wf.active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? "status-connected" : "status-disconnected"}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{wf.name.replace("Trigr — ", "")}</p>
          <p className="text-xs text-slate-400">{wf.id}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(wf.id, !wf.active)}
        disabled={toggling === wf.id}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-all ${wf.active ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-50`}
        title={wf.active ? "Désactiver" : "Activer"}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${wf.active ? "left-5" : "left-0.5"} ${toggling === wf.id ? "animate-pulse" : ""}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [oauthError, setOauthError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);

  // n8n workflows
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // Subscription
  const [plan, setPlan] = useState<"free" | "solo" | "pro" | "equipe">("free");
  const [subBusy, setSubBusy] = useState<string | null>(null);

  // Pipedream accounts count
  const [pdCount, setPdCount] = useState(0);

  // IMAP
  const [imapEmail, setImapEmail] = useState<string | null>(null);

  // Instagram Meta Direct
  const [igPageName, setIgPageName] = useState<string | null>(null);
  const [igForm, setIgForm] = useState({ token: "", pageId: "" });
  const [igBusy, setIgBusy] = useState(false);
  const [igError, setIgError] = useState("");
  const [igOpen, setIgOpen] = useState(false);
  const [imapForm, setImapForm] = useState({ host: "outlook.office365.com", port: "993", user: "", password: "", smtpHost: "smtp.office365.com", smtpPort: "587" });
  const [imapBusy, setImapBusy] = useState(false);
  const [imapError, setImapError] = useState("");
  const [imapOpen, setImapOpen] = useState(false);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/subscription").then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); }).catch(() => {});
    fetch("/api/pipedream/accounts").then(r => r.json()).then(d => {
      if (d.connected) setPdCount(Object.keys(d.connected).length);
    }).catch(() => {});
    fetch("/api/imap").then(r => r.json()).then(d => { if (d.email) setImapEmail(d.email); }).catch(() => {});
    fetch("/api/instagram").then(r => r.json()).then(d => { if (d.pageName) setIgPageName(d.pageName); }).catch(() => {});
  }, [isSignedIn]);

  async function saveImap() {
    setImapBusy(true); setImapError("");
    try {
      const r = await fetch("/api/imap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...imapForm, port: Number(imapForm.port), smtpPort: Number(imapForm.smtpPort) }) });
      const d = await r.json();
      if (!r.ok) { setImapError(d.error ?? "Erreur"); return; }
      setImapEmail(imapForm.user); setImapOpen(false); setImapForm(f => ({ ...f, password: "" }));
    } catch { setImapError("Erreur réseau"); }
    finally { setImapBusy(false); }
  }

  async function saveIgMeta() {
    setIgBusy(true); setIgError("");
    try {
      const r = await fetch("/api/instagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(igForm) });
      const d = await r.json();
      if (!r.ok) { setIgError(d.error ?? "Erreur"); return; }
      setIgPageName(d.pageName); setIgOpen(false); setIgForm({ token: "", pageId: "" });
    } catch { setIgError("Erreur réseau"); }
    finally { setIgBusy(false); }
  }

  async function disconnectIg() {
    await fetch("/api/instagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
    setIgPageName(null);
  }

  async function disconnectImap() {
    await fetch("/api/imap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
    setImapEmail(null);
  }

  useEffect(() => {
    if (activeTab !== "workflows" || workflows.length > 0) return;
    setWfLoading(true); setWfError("");
    fetch("/api/n8n/workflows").then(r => r.json()).then(d => { setWorkflows(d.workflows ?? []); })
      .catch(() => setWfError("n8n non accessible. Vérifiez que pm2 tourne."))
      .finally(() => setWfLoading(false));
  }, [activeTab, workflows.length]);

  async function connectGoogle() {
    if (!user) return;
    setGoogleBusy(true); setOauthError("");
    try {
      await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/settings/sso-callback`,
      });
    } catch (e: unknown) { setOauthError((e as Error)?.message ?? "Erreur"); setGoogleBusy(false); }
  }

  async function disconnectGoogle(id: string) {
    if (!user) return;
    setGoogleBusy(true); setOauthError("");
    try { await user.externalAccounts.find(a => a.id === id)?.destroy(); await user.reload(); }
    catch (e: unknown) { setOauthError((e as Error)?.message ?? "Erreur"); }
    finally { setGoogleBusy(false); }
  }

  async function toggleWorkflow(id: string, active: boolean) {
    setToggling(id);
    try {
      await fetch("/api/n8n/workflows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active } : w));
    } finally { setToggling(null); }
  }

  async function upgradePlan(p: string) {
    setSubBusy(p);
    try {
      const r = await fetch("/api/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p }) });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } finally { setSubBusy(null); }
  }

  if (!isLoaded || !isSignedIn || !user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  );

  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress;
  const googleAccount = user.externalAccounts.find(a => a.provider === "google");
  const totalConnected = (googleAccount ? 1 : 0) + pdCount;

  const TABS: { id: Tab; label: string }[] = [
    { id: "account", label: "Compte" },
    { id: "workflows", label: "Workflows n8n" },
    { id: "subscription", label: "Abonnement" },
  ];

  const PLAN_COLORS = {
    free: "bg-slate-100 text-slate-600",
    solo: "bg-violet-100 text-violet-700",
    pro: "bg-cyan-100 text-cyan-700",
    equipe: "bg-amber-100 text-amber-700",
  };
  const PLAN_LABELS = { free: "Gratuit", solo: "Solo", pro: "Pro", equipe: "Équipe" };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez votre compte, intégrations et workflows</p>
        </div>

        <div className="flex gap-8">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="w-48 shrink-0">
            {/* Avatar */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                {initials || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${PLAN_COLORS[plan]}`}>
                  {PLAN_LABELS[plan]}
                </span>
              </div>
            </div>
            <nav className="space-y-1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left flex items-center px-3 py-2.5 rounded-xl text-sm transition-all font-medium ${
                    activeTab === tab.id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main ────────────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* ── COMPTE ─────────────────────────────────────────────────── */}
            {activeTab === "account" && (
              <>
                {/* Profil */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Profil</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-xl shrink-0">
                      {initials || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">{displayName}</p>
                      <p className="text-sm text-slate-500">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Google — connexion native */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email & Agenda Google</h2>
                  <p className="text-xs text-slate-400 mb-5">Gmail · Google Calendar — connexion officielle via Clerk OAuth.</p>
                  {oauthError && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{oauthError}</div>
                  )}
                  {googleAccount ? (
                    <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <GoogleLogo />
                        <div>
                          <p className="text-sm font-medium text-slate-900">Google</p>
                          <p className="text-xs text-slate-500">{googleAccount.emailAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full status-connected" />Connecté
                        </span>
                        <button onClick={() => disconnectGoogle(googleAccount.id)} disabled={googleBusy}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40">
                          Retirer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={connectGoogle} disabled={googleBusy}
                      className="flex items-center gap-3 w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all disabled:opacity-50">
                      {googleBusy
                        ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <GoogleLogo />
                      }
                      {googleBusy ? "Connexion…" : "Se connecter avec Google"}
                    </button>
                  )}
                </div>

                {/* ── Email IMAP (comptes entreprise/école) ───────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Email IMAP</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Pour les comptes entreprise/école non compatibles OAuth (ESME, etc.)</p>
                    </div>
                    {imapEmail && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>

                  {imapEmail ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{imapEmail}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Connecté via IMAP</p>
                      </div>
                      <button onClick={disconnectImap} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Déconnecter</button>
                    </div>
                  ) : (
                    <>
                      {!imapOpen ? (
                        <button onClick={() => setImapOpen(true)}
                          className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-violet-400 text-slate-500 hover:text-violet-600 text-sm py-3 rounded-xl transition-all">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
                          Connecter un email IMAP
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {/* Preset */}
                          <select onChange={e => {
                            const presets: Record<string, { host: string; smtpHost: string }> = {
                              esme: { host: "outlook.office365.com", smtpHost: "smtp.office365.com" },
                              gmail: { host: "imap.gmail.com", smtpHost: "smtp.gmail.com" },
                              yahoo: { host: "imap.mail.yahoo.com", smtpHost: "smtp.mail.yahoo.com" },
                            };
                            const p = presets[e.target.value];
                            if (p) setImapForm(f => ({ ...f, ...p }));
                          }} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                            <option value="">Choisir un preset…</option>
                            <option value="esme">ESME / Outlook / Office365</option>
                            <option value="gmail">Gmail (mot de passe app)</option>
                            <option value="yahoo">Yahoo Mail</option>
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={imapForm.host} onChange={e => setImapForm(f => ({ ...f, host: e.target.value }))} placeholder="Serveur IMAP" className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 col-span-2" />
                            <input value={imapForm.user} onChange={e => setImapForm(f => ({ ...f, user: e.target.value }))} placeholder="Email (ex: victor@esme.fr)" className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 col-span-2" />
                            <input value={imapForm.password} type="password" onChange={e => setImapForm(f => ({ ...f, password: e.target.value }))} placeholder="Mot de passe" className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 col-span-2" />
                          </div>
                          {imapError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{imapError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => { setImapOpen(false); setImapError(""); }} className="flex-1 text-sm text-slate-500 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-all">Annuler</button>
                            <button onClick={saveImap} disabled={imapBusy} className="flex-1 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2.5 font-semibold transition-all disabled:opacity-50">
                              {imapBusy ? "Test…" : "Tester et sauvegarder"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 text-center">Le mot de passe est chiffré dans Clerk. Pour ESME/Office365 : utilise ton mot de passe habituel.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ── Instagram Direct (Meta page token) ──────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Instagram Direct (Meta)</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Pour les DMs via ton Page Access Token Meta. Nécessite un compte Business + Page Facebook.</p>
                    </div>
                    {igPageName && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>

                  {igPageName ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{igPageName}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Connecté via Meta Graph API</p>
                      </div>
                      <button onClick={disconnectIg} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Déconnecter</button>
                    </div>
                  ) : (
                    <>
                      {!igOpen ? (
                        <button onClick={() => setIgOpen(true)}
                          className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-violet-400 text-slate-500 hover:text-violet-600 text-sm py-3 rounded-xl transition-all">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
                          Connecter Instagram avec token Meta
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <input value={igForm.pageId} onChange={e => setIgForm(f => ({ ...f, pageId: e.target.value }))} placeholder="Page ID Facebook (ex: 123456789)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                          <input value={igForm.token} onChange={e => setIgForm(f => ({ ...f, token: e.target.value }))} placeholder="Page Access Token (de developers.facebook.com)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                          {igError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{igError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => { setIgOpen(false); setIgError(""); }} className="flex-1 text-sm text-slate-500 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-all">Annuler</button>
                            <button onClick={saveIgMeta} disabled={igBusy} className="flex-1 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2.5 font-semibold transition-all disabled:opacity-50">
                              {igBusy ? "Vérification…" : "Sauvegarder"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 text-center">Token visible sur developers.facebook.com → ton app → Outils → Explorateur de token</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Autres intégrations → /integrations */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Toutes vos intégrations</h2>
                      <p className="text-xs text-slate-400">
                        {totalConnected} app{totalConnected !== 1 ? "s" : ""} connectée{totalConnected !== 1 ? "s" : ""} · Outlook, WhatsApp, Slack, Notion, GitHub, Airtable…
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${totalConnected > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                      {totalConnected}
                    </div>
                  </div>
                  <Link href="/integrations"
                    className="flex items-center justify-between gap-4 w-full bg-violet-600 hover:bg-violet-700 text-white px-5 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md font-semibold text-sm">
                    <div className="flex items-center gap-2.5">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Gérer mes intégrations
                    </div>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Connexion OAuth sécurisée via Pipedream Connect — 20+ apps disponibles
                  </p>
                </div>
              </>
            )}

            {/* ── WORKFLOWS N8N ───────────────────────────────────────────── */}
            {activeTab === "workflows" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 mb-1">Workflows n8n</h2>
                    <p className="text-sm text-slate-500">Activez ou désactivez vos automatisations en temps réel.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full status-connected" />n8n local · :5678
                  </div>
                </div>

                {wfLoading && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin" />
                    Chargement…
                  </div>
                )}
                {wfError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{wfError}</div>
                )}
                {!wfLoading && !wfError && (
                  <div className="space-y-2">
                    {workflows.filter(w => w.active).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Actifs</p>
                        {workflows.filter(w => w.active).map(wf => <WorkflowToggle key={wf.id} wf={wf} onToggle={toggleWorkflow} toggling={toggling} />)}
                      </div>
                    )}
                    {workflows.filter(w => !w.active).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inactifs</p>
                        {workflows.filter(w => !w.active).map(wf => <WorkflowToggle key={wf.id} wf={wf} onToggle={toggleWorkflow} toggling={toggling} />)}
                      </div>
                    )}
                    {workflows.length === 0 && <p className="text-sm text-slate-400">Aucun workflow trouvé.</p>}
                  </div>
                )}
                <a href="http://localhost:5678" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1.5H10v3M10 1.5L5 6.5M3 4H1.5v7H8.5V9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Ouvrir n8n
                </a>
              </div>
            )}

            {/* ── ABONNEMENT ──────────────────────────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 mb-1">Abonnement</h2>
                  <p className="text-sm text-slate-500">Plan actuel et options disponibles.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Plan actuel :</span>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan]}</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {([
                    { id: "solo", name: "Solo", price: "9€/mois", features: ["3 intégrations", "50 actions/jour", "1 utilisateur"] },
                    { id: "pro", name: "Pro", price: "19€/mois", features: ["Toutes intégrations", "Illimité", "1 utilisateur"], highlight: true },
                    { id: "equipe", name: "Équipe", price: "49€/mois", features: ["Toutes intégrations", "Illimité", "5 utilisateurs"] },
                  ] as const).map(p => (
                    <div key={p.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
                      "highlight" in p && p.highlight ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"
                    } ${plan === p.id ? "ring-2 ring-violet-400" : ""}`}>
                      {"highlight" in p && p.highlight && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="text-xs font-bold text-white bg-violet-600 px-2.5 py-0.5 rounded-full">Populaire</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-sm text-slate-500">{p.price}</span>
                      </div>
                      <ul className="space-y-1.5 flex-1">
                        {p.features.map(f => (
                          <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="text-emerald-500">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      {plan === p.id ? (
                        <span className="text-xs text-center text-violet-600 font-semibold py-2">Plan actuel</span>
                      ) : (
                        <button onClick={() => upgradePlan(p.id)} disabled={!!subBusy}
                          className={`text-xs font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-40 ${"highlight" in p && p.highlight ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}>
                          {subBusy === p.id
                            ? <span className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Redirection…</span>
                            : "Choisir"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
