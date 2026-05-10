"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";

type Msg = { role: "user" | "assistant"; content: string };

// ── Quick suggestions ──────────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  { icon: "✉️", category: "Email", prompts: [
    { label: "Mes emails non lus", prompt: "Montre-moi mes emails non lus" },
    { label: "Résumé de la matinée", prompt: "Fais-moi un résumé de mes emails importants du jour" },
    { label: "Urgences", prompt: "Y a-t-il des emails urgents dans ma boîte ?" },
  ]},
  { icon: "📅", category: "Agenda", prompts: [
    { label: "Mon agenda du jour", prompt: "Quel est mon agenda aujourd'hui ?" },
    { label: "Demain", prompt: "Qu'est-ce que j'ai prévu demain ?" },
    { label: "Prochaine réunion", prompt: "Quelle est ma prochaine réunion ?" },
  ]},
  { icon: "✍️", category: "Rédaction", prompts: [
    { label: "Email pro", prompt: "Aide-moi à composer un email professionnel" },
    { label: "Follow-up client", prompt: "Aide-moi à rédiger un email de suivi client" },
    { label: "Refus poli", prompt: "Aide-moi à décliner poliment une invitation" },
  ]},
  { icon: "⚡", category: "Briefing", prompts: [
    { label: "Briefing du matin", prompt: "Donne-moi mon briefing complet : emails, agenda, messages" },
    { label: "Résumé journée", prompt: "Fais-moi un résumé de ma journée et ce qui reste à faire" },
    { label: "Préparer demain", prompt: "Aide-moi à préparer ma journée de demain" },
  ]},
];

// ── Avatar AI ──────────────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0 shadow-sm">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── User Avatar (initials) ─────────────────────────────────────────────────────
function UserAvatar({ initials }: { initials: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 text-slate-700 font-semibold text-xs">
      {initials || "?"}
    </div>
  );
}

export default function AssistantPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Detect connected integrations
  const hasGoogle = !!user?.externalAccounts.find(a => a.provider === "google");

  useEffect(() => {
    fetch("/api/pipedream/accounts").then(r => r.json()).then(d => {
      setConnectedCount((hasGoogle ? 1 : 0) + Object.keys(d.connected ?? {}).length);
    }).catch(() => setConnectedCount(hasGoogle ? 1 : 0));
  }, [hasGoogle]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: next.slice(0, -1) }),
      });
      const data = await r.json();
      if (r.status === 429) {
        setError(`${data.error} → <upgrade>`);
        return;
      }
      if (!r.ok) throw new Error(data?.error || "Erreur");
      setMessages([...next, { role: "assistant", content: data.response || "(réponse vide)" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const hasMessages = messages.length > 0;
  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");
  const displayName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 pt-24 pb-6 flex flex-col">

        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">Assistant IA</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {hasMessages ? "Conversation" : `Bonjour ${displayName ?? ""} 👋`}
            </h1>
            {!hasMessages && (
              <p className="text-sm text-slate-500 mt-1">Comment puis-je t&apos;aider aujourd&apos;hui ?</p>
            )}
          </div>
          <Link href="/integrations"
            className="shrink-0 flex items-center gap-2 text-xs font-medium bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl transition-all shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${connectedCount > 0 ? "status-connected" : "status-disconnected"}`} />
            {connectedCount} connectée{connectedCount !== 1 ? "s" : ""}
          </Link>
        </div>

        {/* État sans connexions */}
        {!hasMessages && connectedCount === 0 && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <svg width="16" height="16" fill="none" stroke="#d97706" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Aucune intégration connectée</p>
              <p className="text-xs text-amber-700 mt-0.5">Connecte Gmail, Slack ou Notion pour que l&apos;assistant puisse vraiment t&apos;aider.</p>
            </div>
            <Link href="/integrations" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all">
              Connecter
            </Link>
          </div>
        )}

        {/* Suggestions (sans messages) */}
        {!hasMessages && !loading && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_SUGGESTIONS.map(cat => (
              <div key={cat.category}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-semibold text-slate-700">{cat.category}</span>
                </div>
                <div className="space-y-1.5">
                  {cat.prompts.map(p => (
                    <button key={p.label} onClick={() => send(p.prompt)}
                      className="w-full text-left text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-2.5 py-2 rounded-lg transition-all">
                      → {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat zone */}
        {hasMessages && (
          <div ref={scrollRef}
            className="flex-1 min-h-[40vh] max-h-[60vh] overflow-y-auto space-y-5 mb-5 px-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 animate-fade-up ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "user" ? <UserAvatar initials={initials} /> : <BotAvatar />}
                <div className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl ${
                  m.role === "user"
                    ? "bg-violet-600 text-white rounded-tr-md"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-md shadow-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 animate-fade-up">
                <BotAvatar />
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm flex gap-1.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {error && (
          error.includes("<upgrade>") ? (
            <div className="mb-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-violet-700 font-medium">{error.replace(" → <upgrade>", "")}</p>
              <Link href="/pricing" className="shrink-0 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-all">
                Passer Pro →
              </Link>
            </div>
          ) : (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>
          )
        )}

        {/* Input */}
        <form onSubmit={e => { e.preventDefault(); send(input); }}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/15 transition-all">
          <div className="flex items-end gap-2 px-3 py-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connectedCount > 0 ? "Demande-moi n'importe quoi…" : "Connecte un compte d'abord pour commencer…"}
              disabled={loading}
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 py-1.5 px-2 max-h-[200px]"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all">
              {loading
                ? <span className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l14-7-7 14-2-5-5-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          </div>
          <div className="px-4 pb-2 flex items-center justify-between text-xs text-slate-400">
            <span>⏎ pour envoyer · ⇧⏎ pour aller à la ligne</span>
            {hasMessages && (
              <button type="button" onClick={() => { setMessages([]); setError(null); }}
                className="text-slate-400 hover:text-slate-700 transition-colors">
                Nouvelle conversation
              </button>
            )}
          </div>
        </form>

        <p className="text-xs text-slate-400 text-center mt-3">
          Trigr peut faire des erreurs. Vérifie les infos importantes.
        </p>
      </main>
    </div>
  );
}
