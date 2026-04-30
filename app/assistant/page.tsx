"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Msg = { role: "user" | "assistant"; content: string };

// ── Catalogues d'actions par service ─────────────────────────────────────────

const ALL_ACTIONS: Record<string, { category: string; icon: string; color: string; actions: { label: string; prompt: string }[] }[]> = {
  google: [
    {
      category: "Gmail",
      icon: "✉️",
      color: "violet",
      actions: [
        { label: "Emails non lus", prompt: "Montre-moi mes emails non lus" },
        { label: "Résumé inbox", prompt: "Fais-moi un résumé de mes emails importants du jour" },
        { label: "Emails urgents", prompt: "Y a-t-il des emails urgents dans ma boîte ?" },
      ],
    },
    {
      category: "Agenda Google",
      icon: "📅",
      color: "cyan",
      actions: [
        { label: "Agenda aujourd'hui", prompt: "Quel est mon agenda aujourd'hui ?" },
        { label: "Agenda demain", prompt: "Qu'est-ce que j'ai prévu demain ?" },
        { label: "Prochaine réunion", prompt: "Quelle est ma prochaine réunion ?" },
      ],
    },
  ],
  microsoft: [
    {
      category: "Outlook",
      icon: "📨",
      color: "blue",
      actions: [
        { label: "Emails Outlook", prompt: "Montre-moi mes emails Outlook non lus" },
        { label: "Résumé Outlook", prompt: "Fais-moi un résumé de mes emails Outlook importants" },
        { label: "Envoyer via Outlook", prompt: "Aide-moi à rédiger et envoyer un email via Outlook" },
      ],
    },
    {
      category: "Teams & Agenda",
      icon: "🟪",
      color: "indigo",
      actions: [
        { label: "Messages Teams", prompt: "Montre-moi mes derniers messages Teams" },
        { label: "Agenda Outlook", prompt: "Quel est mon agenda Outlook aujourd'hui ?" },
        { label: "Réunions à venir", prompt: "Quelles sont mes prochaines réunions Outlook ?" },
      ],
    },
  ],
  whatsapp: [
    {
      category: "WhatsApp",
      icon: "💬",
      color: "green",
      actions: [
        { label: "Conversations récentes", prompt: "Montre-moi mes dernières conversations WhatsApp" },
        { label: "Messages non lus", prompt: "Quelles conversations WhatsApp ont des messages non lus ?" },
        { label: "Chercher un contact", prompt: "Montre-moi mes contacts WhatsApp" },
      ],
    },
    {
      category: "Envoyer WA",
      icon: "📤",
      color: "teal",
      actions: [
        { label: "Envoyer un message", prompt: "Aide-moi à envoyer un message WhatsApp" },
        { label: "Répondre à quelqu'un", prompt: "Je veux répondre à une conversation WhatsApp, montre-moi les récentes" },
        { label: "Message rapide", prompt: "Envoie un message rapide via WhatsApp" },
      ],
    },
  ],
  apple: [
    {
      category: "Calendrier Apple",
      icon: "🍎",
      color: "rose",
      actions: [
        { label: "Agenda iCloud", prompt: "Montre-moi mes événements Apple Calendar des prochains jours" },
        { label: "Agenda aujourd'hui", prompt: "Qu'est-ce que j'ai dans mon calendrier Apple aujourd'hui ?" },
        { label: "Créer un événement", prompt: "Aide-moi à créer un événement dans mon calendrier Apple" },
      ],
    },
    {
      category: "Contacts Apple",
      icon: "👤",
      color: "pink",
      actions: [
        { label: "Mes contacts", prompt: "Montre-moi mes contacts Apple" },
        { label: "Chercher un contact", prompt: "Cherche un contact dans mes contacts Apple" },
      ],
    },
  ],
  compose: [
    {
      category: "Rédiger",
      icon: "✍️",
      color: "emerald",
      actions: [
        { label: "Email pro", prompt: "Aide-moi à composer un email professionnel" },
        { label: "Follow-up client", prompt: "Aide-moi à rédiger un email de suivi client" },
        { label: "Refus poli", prompt: "Aide-moi à décliner poliment une invitation ou demande" },
      ],
    },
    {
      category: "Briefing",
      icon: "⚡",
      color: "amber",
      actions: [
        { label: "Briefing du matin", prompt: "Donne-moi mon briefing complet : emails non lus, agenda du jour, messages WhatsApp importants" },
        { label: "Résumé de journée", prompt: "Fais-moi un résumé de ma journée et ce qui reste à faire" },
        { label: "Préparer demain", prompt: "Aide-moi à préparer ma journée de demain" },
      ],
    },
  ],
};

// ── Couleurs ───────────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  violet: "border-violet-500/20 bg-violet-500/[0.05] hover:bg-violet-500/[0.10] text-violet-300",
  cyan:   "border-cyan-500/20 bg-cyan-500/[0.05] hover:bg-cyan-500/[0.10] text-cyan-300",
  emerald:"border-emerald-500/20 bg-emerald-500/[0.05] hover:bg-emerald-500/[0.10] text-emerald-300",
  amber:  "border-amber-500/20 bg-amber-500/[0.05] hover:bg-amber-500/[0.10] text-amber-300",
  blue:   "border-blue-500/20 bg-blue-500/[0.05] hover:bg-blue-500/[0.10] text-blue-300",
  indigo: "border-indigo-500/20 bg-indigo-500/[0.05] hover:bg-indigo-500/[0.10] text-indigo-300",
  green:  "border-green-500/20 bg-green-500/[0.05] hover:bg-green-500/[0.10] text-green-300",
  teal:   "border-teal-500/20 bg-teal-500/[0.05] hover:bg-teal-500/[0.10] text-teal-300",
  rose:   "border-rose-500/20 bg-rose-500/[0.05] hover:bg-rose-500/[0.10] text-rose-300",
  pink:   "border-pink-500/20 bg-pink-500/[0.05] hover:bg-pink-500/[0.10] text-pink-300",
};

const badgeMap: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-400",
  cyan:   "bg-cyan-500/10 text-cyan-400",
  emerald:"bg-emerald-500/10 text-emerald-400",
  amber:  "bg-amber-500/10 text-amber-400",
  blue:   "bg-blue-500/10 text-blue-400",
  indigo: "bg-indigo-500/10 text-indigo-400",
  green:  "bg-green-500/10 text-green-400",
  teal:   "bg-teal-500/10 text-teal-400",
  rose:   "bg-rose-500/10 text-rose-400",
  pink:   "bg-pink-500/10 text-pink-400",
};

const serviceLabel: Record<string, string> = {
  google: "Google",
  microsoft: "Microsoft",
  whatsapp: "WhatsApp",
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [hasApple, setHasApple] = useState(false);
  const [newServices, setNewServices] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const prevServicesRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const providers = new Set(user?.externalAccounts?.map((a) => a.provider) ?? []);
  const hasGoogle = providers.has("google");
  const hasMicrosoft = providers.has("microsoft");
  const hasAny = hasGoogle || hasMicrosoft || hasWhatsApp || hasApple;

  // Active services list
  const activeServices = [
    ...(hasGoogle ? ["google"] : []),
    ...(hasMicrosoft ? ["microsoft"] : []),
    ...(hasWhatsApp ? ["whatsapp"] : []),
    ...(hasApple ? ["apple"] : []),
    ...((hasGoogle || hasMicrosoft || hasWhatsApp || hasApple) ? ["compose"] : []),
  ];

  // Detect newly connected services → toast + "Nouveau" badge
  useEffect(() => {
    const prev = prevServicesRef.current;
    const current = new Set(activeServices);
    const added = activeServices.filter(s => !prev.has(s) && s !== "compose" && prev.size > 0);

    if (added.length > 0) {
      setNewServices(prev2 => new Set([...prev2, ...added]));
      const label = added.map(s => serviceLabel[s] ?? s).join(" & ");
      setToast(`${label} connecté — nouvelles actions disponibles`);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 4000);
      // Clear "new" badge after 8s
      setTimeout(() => setNewServices(prev2 => {
        const next = new Set(prev2);
        added.forEach(s => next.delete(s));
        return next;
      }), 8000);
    }

    prevServicesRef.current = current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGoogle, hasMicrosoft, hasWhatsApp]);

  // Poll bridge (WA + Apple) every 8s via proxy /api/bridge
  useEffect(() => {
    const check = () => {
      fetch("/api/bridge/status", { signal: AbortSignal.timeout(3000) })
        .then(r => r.json()).then(d => setHasWhatsApp(d?.status === "connected")).catch(() => {});
      fetch("/api/bridge/apple/status", { signal: AbortSignal.timeout(3000) })
        .then(r => r.json()).then(d => setHasApple(d?.configured === true)).catch(() => {});
    };
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, []);

  const quickActions = activeServices.flatMap(s => ALL_ACTIONS[s] ?? []);

  const subtitle = [
    hasGoogle && "Gmail · Calendar",
    hasMicrosoft && "Outlook · Teams",
    hasWhatsApp && "WhatsApp",
    hasApple && "iCloud",
  ].filter(Boolean).join(" · ") || "Aucun compte connecté";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // Pré-récupère les données via le proxy /api/bridge (évite les problèmes HTTPS→HTTP)
    const bridgeData: Record<string, unknown> = {};
    try {
      if (hasWhatsApp) {
        const [chats, contacts] = await Promise.allSettled([
          fetch("/api/bridge/chats", { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
          fetch("/api/bridge/contacts", { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
        ]);
        const chatList = chats.status === "fulfilled" ? (chats.value?.chats ?? []) : [];
        const messagesMap: Record<string, unknown[]> = {};
        await Promise.allSettled(chatList.slice(0, 5).map(async (chat: { id?: string }) => {
          if (chat.id) {
            try {
              const m = await fetch(`/api/bridge/messages/${encodeURIComponent(chat.id)}?limit=15`, { signal: AbortSignal.timeout(4000) }).then(r => r.json());
              if (m?.messages) messagesMap[chat.id] = m.messages;
            } catch {}
          }
        }));
        bridgeData.wa = {
          connected: true,
          chats: chatList,
          contacts: contacts.status === "fulfilled" ? (contacts.value?.contacts ?? []) : [],
          messages: messagesMap,
        };
      }
      if (hasApple) {
        const [calendar, contacts] = await Promise.allSettled([
          fetch("/api/bridge/apple/calendar", { signal: AbortSignal.timeout(6000) }).then(r => r.json()),
          fetch("/api/bridge/apple/contacts", { signal: AbortSignal.timeout(6000) }).then(r => r.json()),
        ]);
        bridgeData.apple = {
          configured: true,
          calendar: calendar.status === "fulfilled" ? (calendar.value?.events ?? []) : [],
          contacts: contacts.status === "fulfilled" ? (contacts.value?.contacts ?? []) : [],
        };
      }
    } catch {}

    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: next.slice(0, -1), bridgeData }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erreur");

      // Exécute les actions qui nécessitent le bridge local (envois WA, création événements Apple)
      if (Array.isArray(data.clientActions) && data.clientActions.length > 0) {
        await Promise.allSettled(data.clientActions.map(async (action: { type: string; to?: string; message?: string; event?: Record<string, unknown> }) => {
          if (action.type === "send_whatsapp" && action.to && action.message) {
            await fetch("/api/bridge/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: action.to, message: action.message }),
              signal: AbortSignal.timeout(5000),
            });
          } else if (action.type === "create_apple_event" && action.event) {
            await fetch("/api/bridge/apple/calendar/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.event),
              signal: AbortSignal.timeout(5000),
            });
          }
        }));
      }

      setMessages([...next, { role: "assistant", content: data.response || "(réponse vide)" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />

      {/* Toast notification */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 bg-zinc-900 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-2.5 rounded-full shadow-xl shadow-black/40">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {toast}
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 pt-24 pb-8 flex flex-col">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Assistant <span className="text-violet-400">IA</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
          </div>
          {hasAny && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-1 justify-end max-w-[180px]">
              {hasGoogle && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  Google
                </span>
              )}
              {hasMicrosoft && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Microsoft
                </span>
              )}
              {hasWhatsApp && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.543 4.067 1.492 5.782L.057 23.249a.75.75 0 0 0 .917.932l5.578-1.461A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.659-.523-5.166-1.432l-.371-.222-3.852 1.009 1.026-3.744-.242-.386A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  WhatsApp
                </span>
              )}
              {!hasAny && (
                <Link href="/settings" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  + Connecter
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Banner: no accounts */}
        {!hasAny && !hasMessages && (
          <div className="mb-6 flex items-start gap-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl px-5 py-4">
            <div className="text-amber-400 mt-0.5 shrink-0">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">Aucun compte connecté</p>
              <p className="text-xs text-zinc-500 mt-0.5">Connecte Google, Microsoft ou WhatsApp pour commencer.</p>
            </div>
            <Link href="/settings" className="shrink-0 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg transition-all">
              Connecter →
            </Link>
          </div>
        )}

        {/* Quick actions grid */}
        {!hasMessages && !loading && hasAny && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            {quickActions.map((cat) => {
              // Determine which service owns this category
              const svc = activeServices.find(s => (ALL_ACTIONS[s] ?? []).some(c => c.category === cat.category));
              const isNew = svc ? newServices.has(svc) : false;
              return (
                <div
                  key={cat.category}
                  className={`rounded-2xl border p-4 space-y-2 transition-all duration-500 ${
                    isNew
                      ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{cat.icon}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeMap[cat.color]}`}>
                      {cat.category}
                    </span>
                    {isNew && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 tracking-wide">
                        NOUVEAU
                      </span>
                    )}
                  </div>
                  {cat.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => send(a.prompt)}
                      className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-colors ${colorMap[cat.color]}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Chat area */}
        {hasMessages && (
          <div ref={scrollRef} className="flex-1 min-h-[45vh] max-h-[55vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3 mb-4">
            {messages.map((m, i) => (
              <div key={i} className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] bg-violet-600/90 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap"
                  : "mr-auto max-w-[85%] bg-white/[0.04] border border-white/[0.06] text-zinc-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm whitespace-pre-wrap"
              }>{m.content}</div>
            ))}
            {loading && (
              <div className="mr-auto bg-white/[0.04] border border-white/[0.06] text-zinc-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                <span className="inline-block animate-pulse">Trigr réfléchit…</span>
              </div>
            )}
          </div>
        )}

        {/* Quick bar in chat */}
        {hasMessages && quickActions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            {quickActions.flatMap((cat) =>
              cat.actions.slice(0, 1).map((a) => (
                <button key={a.label} onClick={() => send(a.prompt)} disabled={loading}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${colorMap[cat.color]}`}>
                  {cat.icon} {a.label}
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasAny ? "Demande-moi n'importe quoi…" : "Connecte un compte pour commencer…"}
            disabled={loading}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-colors"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
            Envoyer
          </button>
        </form>

        {hasMessages && (
          <button onClick={() => setMessages([])} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center">
            Nouvelle conversation
          </button>
        )}
      </main>
      <Footer />
    </div>
  );
}
