"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";

// ── API endpoints ──────────────────────────────────────────────────────────────
const APPLE_API = "/api/apple/connect";
const NOTION_API = "/api/notion/connect";
const SLACK_API = "/api/slack/connect";
const HUBSPOT_API = "/api/hubspot/connect";
const WHAPI_API = "/api/whapi";
const N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNDE5NDQwZi01NmYxLTQ3YjUtODU5Zi1mZGI5MjQwZDM1NTkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYzdiNmIwOTctOTA1NS00OGQ5LWJhZTktYTE5ZDQ1YWE0YmY0IiwiaWF0IjoxNzc3MzIxMDAyfQ.I4iU0LARlXJVezzrWRbYx4hHoXtxgxEaJCkLxkX2_QY";

// ── Types ──────────────────────────────────────────────────────────────────────
type WaStatus = "idle" | "checking" | "qr" | "connected";
type AppleStatus = "form" | "connecting" | "connected";
type Tab = "integrations" | "profile" | "workflows" | "subscription";

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
}

// ── Brand SVG logos ────────────────────────────────────────────────────────────
function GoogleLogo() {
  return <svg viewBox="0 0 18 18" width="20" height="20" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>;
}
function MicrosoftLogo() {
  return <svg viewBox="0 0 21 21" width="20" height="20" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>;
}
function WhatsAppLogo({ dim = false }: { dim?: boolean }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill={dim ? "#3f3f46" : "#25D366"}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
}
function AppleLogo({ dim = false }: { dim?: boolean }) {
  return <svg viewBox="0 0 814 1000" width="18" height="22" fill={dim ? "#3f3f46" : "white"}><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>;
}
function NotionLogo({ dim = false }: { dim?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill={dim ? "#3f3f46" : "white"}><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg>;
}
function SlackLogo() {
  return <svg viewBox="0 0 122.8 122.8" width="20" height="20"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0S90.5 5.8 90.5 12.9v32.3z" fill="#2EB67D"/><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/></svg>;
}
function HubSpotLogo({ dim = false }: { dim?: boolean }) {
  return <svg viewBox="0 0 512 512" width="22" height="22" fill={dim ? "#3f3f46" : "#FF7A59"}><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 515.3 173.9 515.3s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7zM346.5 368.5c-40.8 0-74-33.2-74-74s33.2-74 74-74 74 33.2 74 74-33.2 74-74 74z"/><path d="M285.1 219.2v-60.3c9.3-4.3 15.8-13.7 15.8-24.6v-.8c0-14.9-12.1-27.1-27.1-27.1h-.8c-14.9 0-27.1 12.1-27.1 27.1v.8c0 10.9 6.4 20.3 15.8 24.6v60.3c-14.2 2.1-27.3 7.7-38.5 16.2L122.5 119.7c.9-3.1 1.4-6.4 1.4-9.8 0-20.3-16.5-36.8-36.8-36.8s-36.8 16.5-36.8 36.8 16.5 36.8 36.8 36.8c8.5 0 16.3-2.9 22.5-7.7l99.8 113.5c-16.4 19.3-26.2 44.3-26.2 71.6 0 60.5 49.1 109.7 109.7 109.7s109.7-49.1 109.7-109.7c0-55.8-41.8-101.9-95.5-108.7z"/></svg>;
}

// ── StatusDot ─────────────────────────────────────────────────────────────────
function StatusDot({ connected, checking = false }: { connected: boolean; checking?: boolean }) {
  if (checking) return <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />;
  return (
    <div className={`w-2 h-2 rounded-full transition-all ${connected ? "status-connected" : "status-disconnected"}`} />
  );
}

// ── IntegrationCard ────────────────────────────────────────────────────────────
function IntegrationCard({
  logo, name, desc, connected, checking, onConnect, onDisconnect, busy, badge,
}: {
  logo: React.ReactNode; name: string; desc: string;
  connected: boolean; checking?: boolean;
  onConnect: () => void; onDisconnect: () => void;
  busy?: boolean; badge?: string;
}) {
  return (
    <div className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 ${
      connected
        ? "border-white/[0.12] bg-white/[0.03] hover:border-white/[0.18]"
        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10]"
    }`}>
      {badge && (
        <span className="absolute top-3 right-3 text-xs bg-violet-500/15 text-violet-300 border border-violet-500/25 px-2 py-0.5 rounded-full font-medium">{badge}</span>
      )}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{name}</span>
            <StatusDot connected={connected} checking={checking} />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
      {connected ? (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 5l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Connecté
          </span>
          <button
            onClick={onDisconnect}
            disabled={busy}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
            Retirer
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={busy || checking}
          className="w-full flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40"
        >
          {busy || checking
            ? <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
            : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
          }
          {busy || checking ? "Connexion…" : "Connecter"}
        </button>
      )}
    </div>
  );
}

// ── N8N WorkflowToggle ─────────────────────────────────────────────────────────
function WorkflowCard({ wf, onToggle, toggling }: { wf: N8nWorkflow; onToggle: (id: string, active: boolean) => void; toggling: string | null }) {
  const isToggling = toggling === wf.id;
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-all ${
      wf.active ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/[0.06] bg-white/[0.02]"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? "status-connected" : "bg-zinc-700"}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{wf.name.replace("Trigr — ", "")}</p>
          <p className="text-xs text-zinc-600">{wf.id}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(wf.id, !wf.active)}
        disabled={isToggling}
        className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
          wf.active ? "bg-emerald-500" : "bg-zinc-700"
        } disabled:opacity-50`}
        title={wf.active ? "Désactiver" : "Activer"}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
          wf.active ? "left-5" : "left-0.5"
        } ${isToggling ? "animate-pulse" : ""}`} />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("integrations");
  const [busy, setBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState("");

  // WhatsApp
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
  const [showAppleForm, setShowAppleForm] = useState(false);

  // Notion / Slack / HubSpot
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionWorkspace, setNotionWorkspace] = useState<string | null>(null);
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState<string | null>(null);
  const [hubspotConnected, setHubspotConnected] = useState(false);

  // Subscription
  const [plan, setPlan] = useState<"free" | "solo" | "pro" | "equipe">("free");
  const [subBusy, setSubBusy] = useState<string | null>(null);

  // Pipedream Connect — comptes connectés { slug: accountId }
  const [pdAccounts, setPdAccounts] = useState<Record<string, string>>({});

  // n8n workflows
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/subscription").then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); }).catch(() => {});
    fetch(NOTION_API).then(r => r.json()).then(d => { if (d.configured) { setNotionConnected(true); setNotionWorkspace(d.workspace); } }).catch(() => {});
    fetch(SLACK_API).then(r => r.json()).then(d => { if (d.configured) { setSlackConnected(true); setSlackTeam(d.team); } }).catch(() => {});
    fetch(HUBSPOT_API).then(r => r.json()).then(d => { if (d.configured) setHubspotConnected(true); }).catch(() => {});
    // Pipedream — liste les comptes connectés
    fetch("/api/pipedream/accounts").then(r => r.json()).then(d => { if (d.connected) setPdAccounts(d.connected); }).catch(() => {});
  }, [isSignedIn]);

  // Load n8n workflows when tab becomes active
  useEffect(() => {
    if (activeTab !== "workflows" || workflows.length > 0) return;
    setWfLoading(true);
    setWfError("");
    fetch("/api/n8n/workflows")
      .then(r => r.json())
      .then(d => { setWorkflows(d.workflows ?? []); })
      .catch(() => setWfError("n8n non accessible. Vérifiez que pm2 tourne."))
      .finally(() => setWfLoading(false));
  }, [activeTab, workflows.length]);

  const checkWhapi = useCallback(async () => {
    setWaStatus("checking");
    try {
      const r = await fetch(`${WHAPI_API}/connect`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) { setWaStatus("idle"); return; }
      const d = await r.json();
      if (d.connected) { setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name); }
      else if (d.qr) { setWaQr(d.qr); setWaStatus("qr"); }
      else { setWaStatus("idle"); }
    } catch { setWaStatus("idle"); }
    fetch(APPLE_API, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(d => { if (d.configured) { setAppleStatus("connected"); setAppleUser(d.email); } })
      .catch(() => {});
  }, []);

  useEffect(() => { if (isSignedIn) checkWhapi(); }, [isSignedIn, checkWhapi]);

  useEffect(() => {
    if (waStatus !== "qr") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const d = await fetch(`${WHAPI_API}/connect`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
        if (d.connected) {
          clearInterval(pollRef.current!); pollRef.current = null;
          setWaStatus("connected"); setWaPhone(d.phone); setWaName(d.name); setWaQr(null);
        } else if (d.qr && d.qr !== waQr) { setWaQr(d.qr); }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [waStatus, waQr]);

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

  async function appleConnect() {
    if (!appleId || !applePwd) return;
    setAppleStatus("connecting"); setAppleError("");
    try {
      const r = await fetch(APPLE_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: appleId, appPassword: applePwd }),
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      if (!r.ok) { setAppleError(d.error ?? "Identifiants invalides"); setAppleStatus("form"); return; }
      setAppleStatus("connected"); setAppleUser(appleId); setAppleId(""); setApplePwd(""); setShowAppleForm(false);
    } catch { setAppleError("Erreur de connexion."); setAppleStatus("form"); }
  }

  async function upgradePlan(targetPlan: string) {
    setSubBusy(targetPlan);
    try {
      const r = await fetch("/api/subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch {} finally { setSubBusy(null); }
  }

  async function toggleWorkflow(id: string, active: boolean) {
    setToggling(id);
    try {
      await fetch("/api/n8n/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active } : w));
    } catch {} finally { setToggling(null); }
  }

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress;
  const googleAccount = user.externalAccounts.find(a => a.provider === "google");
  const microsoftAccount = user.externalAccounts.find(a => a.provider === "microsoft");

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "integrations", label: "Intégrations", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
    { id: "workflows", label: "Workflows n8n", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
    { id: "profile", label: "Profil", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { id: "subscription", label: "Abonnement", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 pt-24 pb-16">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez vos intégrations, workflows et abonnement</p>
        </div>

        <div className="flex gap-8">

          {/* ── Sidebar ───────────────────────────────────────────────────────── */}
          <aside className="w-52 shrink-0">
            {/* User pill */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-sm shrink-0">
                {initials || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  plan === "free" ? "text-zinc-500" :
                  plan === "solo" ? "text-violet-300 bg-violet-500/10" :
                  plan === "pro" ? "text-cyan-300 bg-cyan-500/10" :
                  "text-amber-300 bg-amber-500/10"
                }`}>
                  {plan === "free" ? "Gratuit" : plan === "solo" ? "Solo" : plan === "pro" ? "Pro" : "Équipe"}
                </span>
              </div>
            </div>
            <nav className="space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                    activeTab === tab.id
                      ? "bg-violet-500/[0.12] text-violet-300 border border-violet-500/20"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* ── INTEGRATIONS TAB ───────────────────────────────────────────── */}
            {activeTab === "integrations" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-base font-semibold text-white mb-1">Connectez vos outils</h2>
                  <p className="text-sm text-zinc-500">Chaque connexion est sécurisée via OAuth 2.0 — vos identifiants ne transitent jamais par Trigr.</p>
                </div>

                {oauthError && (
                  <div className="flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 mt-0.5"><path d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {oauthError}
                  </div>
                )}

                {/* Email & Calendriers */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">📧 Email & Calendriers</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <IntegrationCard
                      logo={<GoogleLogo />}
                      name="Google"
                      desc={googleAccount?.emailAddress ?? "Gmail · Google Calendar · Google Drive"}
                      connected={!!googleAccount}
                      checking={busy === "oauth_google"}
                      onConnect={() => connect("oauth_google")}
                      onDisconnect={() => googleAccount && disconnect(googleAccount.id)}
                      busy={busy === "oauth_google" || busy === googleAccount?.id}
                      badge="OAuth 2.0"
                    />
                    <IntegrationCard
                      logo={<MicrosoftLogo />}
                      name="Microsoft"
                      desc={microsoftAccount?.emailAddress ?? "Outlook · Teams · Calendrier"}
                      connected={!!microsoftAccount}
                      checking={busy === "oauth_microsoft"}
                      onConnect={() => connect("oauth_microsoft")}
                      onDisconnect={() => microsoftAccount && disconnect(microsoftAccount.id)}
                      busy={busy === "oauth_microsoft" || busy === microsoftAccount?.id}
                      badge="OAuth 2.0"
                    />
                  </div>
                </div>

                {/* Communication */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">💬 Messagerie</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* WhatsApp */}
                    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                      waStatus === "connected"
                        ? "border-white/[0.12] bg-white/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <WhatsAppLogo dim={waStatus === "idle"} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">WhatsApp</span>
                            <StatusDot connected={waStatus === "connected"} checking={waStatus === "checking"} />
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {waStatus === "connected" ? (waPhone ?? waName ?? "Business connecté") : "WhatsApp Business · Canal n°1 en France"}
                          </p>
                        </div>
                      </div>
                      {waStatus === "idle" && (
                        <button onClick={() => { setWaStatus("checking"); checkWhapi(); }}
                          className="w-full flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                          Connecter
                        </button>
                      )}
                      {waStatus === "checking" && (
                        <div className="flex items-center justify-center gap-2 py-2">
                          <span className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-[#25D366] animate-spin" />
                          <span className="text-xs text-zinc-500">Vérification…</span>
                        </div>
                      )}
                      {waStatus === "connected" && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 5l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Connecté
                          </span>
                          <button onClick={async () => { await fetch(`${WHAPI_API}/connect`, { method: "DELETE" }).catch(() => {}); setWaStatus("idle"); setWaPhone(null); setWaName(null); }}
                            className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1">
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
                            Retirer
                          </button>
                        </div>
                      )}
                      {waStatus === "qr" && (
                        <div className="flex flex-col items-center gap-3 py-2">
                          {waQr ? (
                            <>
                              <div className="bg-white rounded-xl p-2 shadow-[0_0_30px_rgba(37,211,102,0.15)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={waQr} alt="QR WhatsApp" className="w-40 h-40" />
                              </div>
                              <p className="text-xs text-zinc-400 text-center">WhatsApp → ⋮ → Appareils liés → Scanner</p>
                              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                En attente du scan…
                              </div>
                            </>
                          ) : (
                            <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-[#25D366] animate-spin" />
                          )}
                          <button onClick={() => setWaStatus("idle")} className="text-xs text-zinc-600 hover:text-zinc-300">Annuler</button>
                        </div>
                      )}
                    </div>

                    <IntegrationCard
                      logo={<SlackLogo />}
                      name="Slack"
                      desc={slackTeam ?? "Canaux · Messages · Bots"}
                      connected={slackConnected}
                      onConnect={() => { window.location.href = `${SLACK_API}?action=authorize`; }}
                      onDisconnect={async () => { await fetch(SLACK_API, { method: "DELETE" }); setSlackConnected(false); setSlackTeam(null); }}
                      badge="OAuth 2.0"
                    />
                  </div>
                </div>

                {/* Productivité */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">🛠 Productivité & CRM</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <IntegrationCard
                      logo={<NotionLogo dim={!notionConnected} />}
                      name="Notion"
                      desc={notionWorkspace ?? "Pages · Databases · Notes"}
                      connected={notionConnected}
                      onConnect={() => { window.location.href = `${NOTION_API}?action=authorize`; }}
                      onDisconnect={async () => { await fetch(NOTION_API, { method: "DELETE" }); setNotionConnected(false); setNotionWorkspace(null); }}
                      badge="OAuth 2.0"
                    />
                    <IntegrationCard
                      logo={<HubSpotLogo dim={!hubspotConnected} />}
                      name="HubSpot CRM"
                      desc="Contacts · Deals · Pipeline"
                      connected={hubspotConnected}
                      onConnect={() => { window.location.href = `${HUBSPOT_API}?action=authorize`; }}
                      onDisconnect={async () => { await fetch(HUBSPOT_API, { method: "DELETE" }); setHubspotConnected(false); }}
                      badge="OAuth 2.0"
                    />
                  </div>
                </div>

                {/* Pipedream Connect — renvoi vers /integrations */}
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Pipedream Connect</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {Object.keys(pdAccounts).length} app{Object.keys(pdAccounts).length !== 1 ? "s" : ""} connectée{Object.keys(pdAccounts).length !== 1 ? "s" : ""} · Airtable, GitHub, Trello, Linear, Jira, Zoom…
                      </p>
                    </div>
                  </div>
                  <a href="/integrations"
                    className="shrink-0 flex items-center gap-2 text-xs font-semibold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 px-4 py-2 rounded-xl transition-all">
                    Gérer
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </div>

                {/* Apple iCloud */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">🍎 Apple</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                      appleStatus === "connected"
                        ? "border-white/[0.12] bg-white/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                          <AppleLogo dim={appleStatus !== "connected"} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">Apple iCloud</span>
                            <StatusDot connected={appleStatus === "connected"} checking={appleStatus === "connecting"} />
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {appleStatus === "connected" ? (appleUser ?? "iCloud connecté") : "Calendrier · Contacts · CalDAV"}
                          </p>
                        </div>
                      </div>
                      {appleStatus === "connected" && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 5l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Connecté
                          </span>
                          <button onClick={async () => { await fetch(APPLE_API, { method: "DELETE" }).catch(() => {}); setAppleStatus("form"); setAppleUser(null); }}
                            className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1">
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
                            Retirer
                          </button>
                        </div>
                      )}
                      {appleStatus === "form" && !showAppleForm && (
                        <button onClick={() => setShowAppleForm(true)}
                          className="w-full flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                          Connecter
                        </button>
                      )}
                      {appleStatus === "form" && showAppleForm && (
                        <div className="space-y-2.5">
                          <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1.5H10v3M10 1.5L5 6.5M3 4H1.5v7H8.5V9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Générer un mot de passe d&apos;app Apple
                          </a>
                          <input type="email" value={appleId} onChange={e => setAppleId(e.target.value)}
                            placeholder="Apple ID (ex : prenom@icloud.com)"
                            className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/60" />
                          <input type="password" value={applePwd} onChange={e => setApplePwd(e.target.value)}
                            placeholder="Mot de passe d'app (xxxx-xxxx-xxxx-xxxx)"
                            onKeyDown={e => e.key === "Enter" && appleConnect()}
                            className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/60 font-mono" />
                          {appleError && <p className="text-xs text-red-400">{appleError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => setShowAppleForm(false)} className="flex-1 text-xs py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</button>
                            <button onClick={appleConnect} disabled={!appleId || !applePwd}
                              className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-xl transition-all">
                              Connecter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Future integrations teaser */}
                    <div className="rounded-2xl border border-dashed border-white/[0.08] p-5 flex flex-col items-center justify-center gap-2 text-center">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <svg width="14" height="14" fill="none" stroke="#52525b" strokeWidth="1.5"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                      </div>
                      <p className="text-xs font-medium text-zinc-500">+ d&apos;intégrations bientôt</p>
                      <p className="text-xs text-zinc-700">Airtable, Trello, Linear, GitHub…</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── WORKFLOWS TAB ─────────────────────────────────────────────── */}
            {activeTab === "workflows" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1">Workflows n8n</h2>
                    <p className="text-sm text-zinc-500">Activez ou désactivez vos automatisations directement depuis ici.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full status-connected" />
                    <span className="text-xs text-zinc-500">n8n local · :5678</span>
                  </div>
                </div>

                {wfLoading && (
                  <div className="flex items-center gap-3 text-zinc-500 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" />
                    Chargement des workflows…
                  </div>
                )}
                {wfError && (
                  <div className="flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 mt-0.5"><path d="M12 9v3m0 3h.01" strokeLinecap="round"/></svg>
                    {wfError}
                  </div>
                )}
                {!wfLoading && !wfError && workflows.length === 0 && (
                  <p className="text-sm text-zinc-600">Aucun workflow trouvé.</p>
                )}
                {!wfLoading && workflows.length > 0 && (
                  <div className="space-y-2">
                    {/* Active */}
                    {workflows.filter(w => w.active).length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Actifs ({workflows.filter(w => w.active).length})</p>
                        {workflows.filter(w => w.active).map(wf => (
                          <WorkflowCard key={wf.id} wf={wf} onToggle={toggleWorkflow} toggling={toggling} />
                        ))}
                      </>
                    )}
                    {/* Inactive */}
                    {workflows.filter(w => !w.active).length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-5">Inactifs ({workflows.filter(w => !w.active).length})</p>
                        {workflows.filter(w => !w.active).map(wf => (
                          <WorkflowCard key={wf.id} wf={wf} onToggle={toggleWorkflow} toggling={toggling} />
                        ))}
                      </>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-white/[0.05]">
                  <a href="http://localhost:5678" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1.5H10v3M10 1.5L5 6.5M3 4H1.5v7H8.5V9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Ouvrir n8n
                  </a>
                </div>
              </div>
            )}

            {/* ── PROFILE TAB ───────────────────────────────────────────────── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-white">Profil</h2>
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-xl shrink-0">
                      {initials || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">{displayName}</p>
                      <p className="text-sm text-zinc-500">{user.primaryEmailAddress?.emailAddress}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                        plan === "free" ? "bg-zinc-800 text-zinc-400" :
                        plan === "solo" ? "bg-violet-900/40 text-violet-300 border border-violet-500/30" :
                        plan === "pro" ? "bg-cyan-900/40 text-cyan-300 border border-cyan-500/30" :
                        "bg-amber-900/40 text-amber-300 border border-amber-500/30"
                      }`}>
                        Plan {plan === "free" ? "Gratuit" : plan === "solo" ? "Solo" : plan === "pro" ? "Pro" : "Équipe"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Comptes liés</h3>
                  <div className="space-y-3">
                    {user.externalAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          {acc.provider === "google" ? <GoogleLogo /> : <MicrosoftLogo />}
                          <div>
                            <p className="text-sm font-medium text-white capitalize">{acc.provider}</p>
                            <p className="text-xs text-zinc-500">{acc.emailAddress}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Lié
                        </span>
                      </div>
                    ))}
                    {user.externalAccounts.length === 0 && (
                      <p className="text-sm text-zinc-600">Aucun compte externe lié.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── SUBSCRIPTION TAB ─────────────────────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-white mb-1">Abonnement</h2>
                  <p className="text-sm text-zinc-500">Votre plan actuel et les options disponibles.</p>
                </div>
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3">
                  <span className="text-sm text-zinc-400">Plan actuel :</span>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                    plan === "free" ? "bg-zinc-800 text-zinc-400" :
                    plan === "solo" ? "bg-violet-900/40 text-violet-300 border border-violet-500/30" :
                    plan === "pro" ? "bg-cyan-900/40 text-cyan-300 border border-cyan-500/30" :
                    "bg-amber-900/40 text-amber-300 border border-amber-500/30"
                  }`}>
                    {plan === "free" ? "Gratuit" : plan === "solo" ? "Solo" : plan === "pro" ? "Pro" : "Équipe"}
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { id: "solo", name: "Solo", price: "9€/mois", features: ["3 intégrations", "50 actions/jour", "1 utilisateur"], highlight: false },
                    { id: "pro", name: "Pro", price: "19€/mois", features: ["Toutes intégrations", "Illimité", "1 utilisateur"], highlight: true },
                    { id: "equipe", name: "Équipe", price: "49€/mois", features: ["Toutes intégrations", "Illimité", "5 utilisateurs"], highlight: false },
                  ].map(p => (
                    <div key={p.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                      p.highlight ? "border-violet-500/40 bg-violet-500/[0.05]" : "glass"
                    } ${plan === p.id ? "ring-1 ring-violet-400/40" : ""}`}>
                      {p.highlight && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2"><span className="text-xs font-bold text-white bg-violet-600 px-2.5 py-0.5 rounded-full">Populaire</span></div>}
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-sm text-zinc-400">{p.price}</span>
                      </div>
                      <ul className="space-y-1.5 flex-1">
                        {p.features.map(f => (
                          <li key={f} className="text-xs text-zinc-500 flex items-center gap-1.5">
                            <span className="text-emerald-400">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      {plan === p.id ? (
                        <span className="text-xs text-center text-violet-400 font-medium py-2">Plan actuel</span>
                      ) : (
                        <button onClick={() => upgradePlan(p.id)} disabled={!!subBusy}
                          className={`text-xs font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-40 ${
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
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
