"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type DayEntry = { date: string; count: number };
type AutoResult = { id: string; name: string; result: string; date: string };
type Analytics = {
  plan: string;
  todayCount: number;
  limit: number;
  integrationsCount: number;
  integrationsLimit: number;
  integrations: string[];
  history: DayEntry[];
  totalWeek: number;
  automationResults?: AutoResult[];
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: "Gratuit",  color: "text-zinc-400" },
  solo:   { label: "Solo",     color: "text-blue-400" },
  pro:    { label: "Pro",      color: "text-violet-400" },
  equipe: { label: "Équipe",   color: "text-emerald-400" },
};

const INTEGRATION_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  google:    { icon: "G", label: "Google",    color: "bg-red-500/20 text-red-300" },
  microsoft: { icon: "M", label: "Microsoft", color: "bg-blue-500/20 text-blue-300" },
  whatsapp:  { icon: "W", label: "WhatsApp",  color: "bg-green-500/20 text-green-300" },
  notion:    { icon: "N", label: "Notion",    color: "bg-zinc-500/20 text-zinc-300" },
  slack:     { icon: "S", label: "Slack",     color: "bg-violet-500/20 text-violet-300" },
  instagram: { icon: "I", label: "Instagram", color: "bg-pink-500/20 text-pink-300" },
  apple:     { icon: "A", label: "Apple",     color: "bg-zinc-400/20 text-zinc-200" },
  imap:      { icon: "E", label: "Email Pro", color: "bg-amber-500/20 text-amber-300" },
  github:    { icon: "H", label: "GitHub",    color: "bg-zinc-600/20 text-zinc-300" },
  hubspot:   { icon: "HS", label: "HubSpot", color: "bg-orange-500/20 text-orange-300" },
};

function SparkBar({ days, max }: { days: DayEntry[]; max: number }) {
  const DAYS_FR = ["D", "L", "M", "M", "J", "V", "S"];
  return (
    <div className="flex items-end gap-1.5 h-16">
      {days.map((d, i) => {
        const pct = max > 0 ? (d.count / max) * 100 : 0;
        const date = new Date(d.date + "T12:00:00");
        const dayLabel = DAYS_FR[date.getDay()];
        const isToday = i === days.length - 1;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full flex flex-col justify-end" style={{ height: 44 }}>
              <div
                className={`w-full rounded-sm transition-all ${isToday ? "bg-violet-500" : "bg-zinc-700"}`}
                style={{ height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%` }}
                title={`${d.count} action${d.count > 1 ? "s" : ""}`}
              />
            </div>
            <span className={`text-[9px] ${isToday ? "text-violet-400" : "text-zinc-700"}`}>{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-violet-500/30 bg-violet-500/[0.06]" : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-violet-300" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  if (!isLoaded || !isSignedIn) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  const planInfo = data ? PLAN_LABELS[data.plan] ?? PLAN_LABELS.free : null;
  const maxBar = data ? Math.max(...data.history.map(d => d.count), data.limit / 4, 1) : 1;
  const usagePct = data ? Math.min((data.todayCount / Math.max(data.limit, 1)) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-24 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Bonjour {user?.firstName ?? ""} 👋</p>
          </div>
          {planInfo && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-semibold ${planInfo.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              Plan {planInfo.label}
              {data?.plan === "free" && (
                <Link href="/pricing" className="ml-1 text-violet-400 hover:text-violet-300">↑ Upgrade</Link>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard
                label="Actions aujourd'hui"
                value={`${data.todayCount} / ${data.limit === 999 ? "∞" : data.limit}`}
                sub={data.limit === 999 ? "illimitées" : `${Math.max(data.limit - data.todayCount, 0)} restantes`}
                accent
              />
              <StatCard
                label="Cette semaine"
                value={data.totalWeek}
                sub={`action${data.totalWeek > 1 ? "s" : ""} au total`}
              />
              <StatCard
                label="Intégrations"
                value={`${data.integrationsCount} / ${data.integrationsLimit === 999 ? "∞" : data.integrationsLimit}`}
                sub={data.integrationsLimit !== 999 && data.integrationsCount >= data.integrationsLimit ? "limite atteinte" : "connectées"}
              />
            </div>

            {/* Usage bar */}
            {data.limit !== 999 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 mb-6">
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>Utilisation aujourd&apos;hui</span>
                  <span>{data.todayCount} / {data.limit} actions</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-violet-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            )}

            {/* 7-day chart */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Activité — 7 derniers jours</h2>
                <span className="text-xs text-zinc-600">{data.totalWeek} actions</span>
              </div>
              <SparkBar days={data.history} max={maxBar} />
            </div>

            {/* Connected integrations */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Intégrations connectées</h2>
                <Link href="/settings" className="text-xs text-violet-400 hover:text-violet-300">Gérer →</Link>
              </div>
              {data.integrations.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-zinc-600 mb-3">Aucune app connectée</p>
                  <Link href="/settings" className="text-xs text-violet-400 hover:text-violet-300">Connecter mes apps →</Link>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.integrations.map(id => {
                    const info = INTEGRATION_ICONS[id];
                    if (!info) return null;
                    return (
                      <div key={id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${info.color} bg-white/[0.03] border border-white/[0.06]`}>
                        <span className="font-bold">{info.icon}</span>
                        {info.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/assistant" className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/30 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h4l2-5 2 10 2-5h2" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">Assistant IA</div>
                  <div className="text-xs text-zinc-600">Poser une question</div>
                </div>
              </Link>
              <Link href="/settings" className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <svg width="16" height="16" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-zinc-300 transition-colors">Paramètres</div>
                  <div className="text-xs text-zinc-600">Gérer les connexions</div>
                </div>
              </Link>
            </div>

            {/* Automation results */}
            {data.automationResults && data.automationResults.length > 0 && (
              <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <span>⚡</span> Dernières automatisations
                  </h2>
                  <Link href="/settings?tab=automations" className="text-xs text-violet-400 hover:text-violet-300">Gérer →</Link>
                </div>
                <div className="space-y-3">
                  {data.automationResults.map(ar => (
                    <div key={ar.id} className="bg-white/[0.03] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-zinc-300">{ar.name}</span>
                        <span className="text-xs text-zinc-600">{new Date(ar.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{ar.result}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brief du Matin */}
            <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">☀️</span>
                  <h2 className="text-sm font-semibold text-zinc-300">Brief du Matin</h2>
                </div>
                <button
                  onClick={async () => {
                    setBriefLoading(true);
                    try {
                      const r = await fetch("/api/brief");
                      const d = await r.json() as { brief?: string; error?: string };
                      if (d.brief) setBrief(d.brief);
                      else setBrief(d.error ?? "Erreur");
                    } finally { setBriefLoading(false); }
                  }}
                  disabled={briefLoading}
                  className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                >
                  {briefLoading ? "Génération…" : "Générer maintenant"}
                </button>
              </div>
              {brief ? (
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{brief}</p>
                </div>
              ) : (
                <p className="text-xs text-zinc-600">
                  Résumé automatique de tes emails, agenda et messages — chaque matin en semaine.
                  {" "}<Link href="/settings" className="text-violet-400 hover:text-violet-300">Activer la livraison WA →</Link>
                </p>
              )}
            </div>

            {/* Upgrade CTA for free */}
            {data.plan === "free" && (
              <div className="mt-4 border border-violet-500/20 bg-violet-500/[0.05] rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-200">Passez au plan Pro</p>
                  <p className="text-xs text-zinc-500">Actions illimitées + toutes les intégrations pour 19€/mois</p>
                </div>
                <Link href="/pricing" className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
                  Voir les plans
                </Link>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-zinc-600">Impossible de charger les données.</p>
        )}
      </main>
    </div>
  );
}
