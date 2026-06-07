"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type DayEntry = { date: string; count: number };
type AutoResult = { id: string; name: string; result: string; date: string };
type Analytics = {
  plan: string;
  todayCount: number;
  limit: number;
  unlimited?: boolean;
  integrationsCount: number;
  integrationsLimit: number;
  integrations: string[];
  history: DayEntry[];
  totalWeek: number;
  gainTempsMinutes?: number;
  automationResults?: AutoResult[];
  crm?: { dealsActifs: number; dealsGagnes: number; caPotentiel: number; caGagne: number };
  rappelsEnRetard?: number;
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: "Gratuit",  color: "text-zinc-400" },
  solo:   { label: "Solo",     color: "text-blue-400" },
  pro:    { label: "Pro",      color: "text-blue-400" },
  equipe: { label: "Équipe",   color: "text-emerald-400" },
};

const INTEGRATION_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  google:    { icon: "G", label: "Google",    color: "bg-red-500/20 text-red-300" },
  microsoft: { icon: "M", label: "Microsoft", color: "bg-blue-500/20 text-blue-300" },
  whatsapp:  { icon: "W", label: "WhatsApp",  color: "bg-green-500/20 text-green-300" },
  notion:    { icon: "N", label: "Notion",    color: "bg-zinc-500/20 text-zinc-300" },
  slack:     { icon: "S", label: "Slack",     color: "bg-blue-500/20 text-blue-300" },
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
                className={`w-full rounded-sm transition-all ${isToday ? "bg-blue-500" : "bg-zinc-700"}`}
                style={{ height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%` }}
                title={`${d.count} action${d.count > 1 ? "s" : ""}`}
              />
            </div>
            <span className={`text-[9px] ${isToday ? "text-blue-400" : "text-zinc-700"}`}>{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-blue-500/30 bg-blue-500/[0.06]" : "border-white/[0.08] bg-white/[0.02]"}`}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-blue-300" : "text-white"}`}>{value}</div>
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
  type Reminder = { id: string; title: string; note?: string; dueAt: string; channel: string };
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
    fetch("/api/reminders")
      .then(r => r.json())
      .then(d => { if (d.reminders) setReminders(d.reminders); })
      .catch(() => {});
  }, [isSignedIn]);

  if (!isLoaded || !isSignedIn) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
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
                <Link href="/pricing" className="ml-1 text-blue-400 hover:text-blue-300">↑ Upgrade</Link>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard
                label="Actions aujourd'hui"
                value={data.unlimited ? `${data.todayCount} / ∞` : `${data.todayCount} / ${data.limit === 999 ? "∞" : data.limit}`}
                sub={data.unlimited ? "illimitées ✨" : data.limit === 999 ? "illimitées" : `${Math.max(data.limit - data.todayCount, 0)} restantes`}
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
                    className={`h-full rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            )}

            {/* 7-day recharts area chart */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-300">Activité — 7 derniers jours</h2>
                  <p className="text-xs text-zinc-600 mt-0.5">{data.totalWeek} actions au total</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 opacity-80" /> Actions IA
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data.history.map(d => ({
                  jour: new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
                  actions: d.count,
                }))}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="jour" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#a1a1aa" }}
                    itemStyle={{ color: "#60a5fa" }}
                    formatter={(v) => [`${v} action${Number(v) > 1 ? "s" : ""}`, ""]}
                  />
                  <Area type="monotone" dataKey="actions" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#60a5fa" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gain de temps + CRM stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 mb-1">⏱ Temps économisé / semaine</p>
                <p className="text-2xl font-black text-blue-400">{(data.gainTempsMinutes ?? data.totalWeek * 5) >= 60 ? `${((data.gainTempsMinutes ?? data.totalWeek * 5) / 60).toFixed(1)}h` : `${data.gainTempsMinutes ?? data.totalWeek * 5} min`}</p>
                <p className="text-xs text-zinc-600 mt-0.5">≈ {Math.round((data.gainTempsMinutes ?? data.totalWeek * 5) * 0.5)} € économisés</p>
              </div>
              {data.crm && data.crm.dealsActifs + data.crm.dealsGagnes > 0 ? (
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 mb-1">💼 Pipeline CRM</p>
                  <p className="text-2xl font-black text-emerald-400">{data.crm.caGagne > 0 ? `${data.crm.caGagne.toLocaleString("fr-FR")} €` : `${data.crm.dealsActifs} deal${data.crm.dealsActifs > 1 ? "s" : ""}`}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{data.crm.caGagne > 0 ? `${data.crm.dealsActifs} actifs` : "en cours"} · {data.crm.dealsGagnes} gagné{data.crm.dealsGagnes > 1 ? "s" : ""}</p>
                </div>
              ) : (
                <Link href="/crm" className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:border-white/[0.15] transition-all group">
                  <span className="text-2xl">💼</span>
                  <p className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">Ouvrir le CRM →</p>
                </Link>
              )}
            </div>

            {/* Rappels en retard */}
            {(data.rappelsEnRetard ?? 0) > 0 && (
              <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">🔴</span>
                  <span className="text-sm font-medium text-red-300">{data.rappelsEnRetard} rappel{(data.rappelsEnRetard ?? 0) > 1 ? "s" : ""} en retard</span>
                </div>
                <Link href="/assistant?prefill=Montre-moi mes tâches en retard" className="text-xs text-red-400 hover:text-red-300">Voir →</Link>
              </div>
            )}

            {/* Connected integrations */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Intégrations connectées</h2>
                <Link href="/settings" className="text-xs text-blue-400 hover:text-blue-300">Gérer →</Link>
              </div>
              {data.integrations.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-zinc-600 mb-3">Aucune app connectée</p>
                  <Link href="/settings" className="text-xs text-blue-400 hover:text-blue-300">Connecter mes apps →</Link>
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

            {/* Quick access prompts */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-300">Accès rapide</h2>
                <Link href="/assistant" className="text-xs text-blue-400 hover:text-blue-300">Assistant →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { icon: "📧", label: "Emails non lus", prompt: "Montre-moi mes emails non lus et résume les plus importants" },
                  { icon: "📅", label: "Agenda du jour", prompt: "Quels sont mes événements du jour ?" },
                  { icon: "💬", label: "Messages WA", prompt: "Quels sont mes derniers messages WhatsApp non lus ?" },
                  { icon: "✍️", label: "Rédiger un email", prompt: "Aide-moi à rédiger un email professionnel" },
                  { icon: "🏢", label: "Infos entreprise", prompt: "Recherche des informations officielles sur l'entreprise " },
                  { icon: "👥", label: "Mes contacts", prompt: "/crm" },
                ] as { icon: string; label: string; prompt: string }[]).map((item, i) => (
                  item.prompt.startsWith("/")
                    ? <Link key={i} href={item.prompt} className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs text-zinc-300">{item.label}</span>
                      </Link>
                    : <Link key={i} href={"/assistant?prefill=" + encodeURIComponent(item.prompt)}
                        className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs text-zinc-300">{item.label}</span>
                      </Link>
                ))}
              </div>
            </div>

            {/* Nav links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/assistant" className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/30 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h4l2-5 2 10 2-5h2" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">Assistant IA</div>
                  <div className="text-xs text-zinc-600">Nouvelle conversation</div>
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
                  <Link href="/settings?tab=automations" className="text-xs text-blue-400 hover:text-blue-300">Gérer →</Link>
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

            {/* Rappels */}
            {reminders.length > 0 && (
              <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <span>⏰</span> Rappels en attente
                  </h2>
                  <Link href="/assistant" className="text-xs text-blue-400 hover:text-blue-300">Gérer →</Link>
                </div>
                <div className="space-y-2">
                  {reminders.slice(0, 5).map(r => {
                    const due = new Date(r.dueAt);
                    const isOverdue = due < new Date();
                    return (
                      <div key={r.id} className={`flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 ${isOverdue ? "border border-red-500/20" : ""}`}>
                        <span className="text-base">{isOverdue ? "🔴" : "⏳"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate">{r.title}</p>
                          <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-zinc-500"}`}>
                            {isOverdue ? "En retard — " : ""}{due.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "done", id: r.id }) });
                            setReminders(prev => prev.filter(x => x.id !== r.id));
                          }}
                          className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                        >
                          ✓ Fait
                        </button>
                      </div>
                    );
                  })}
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
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
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
                  {" "}<Link href="/settings" className="text-blue-400 hover:text-blue-300">Activer la livraison WA →</Link>
                </p>
              )}
            </div>

            {/* Upgrade CTA for free */}
            {data.plan === "free" && (
              <div className="mt-4 border border-blue-500/20 bg-blue-500/[0.05] rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-200">Passez au plan Pro</p>
                  <p className="text-xs text-zinc-500">Actions illimitées + toutes les intégrations pour 19€/mois</p>
                </div>
                <Link href="/pricing" className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
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
