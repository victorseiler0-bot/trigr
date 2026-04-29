"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  {
    category: "Email",
    icon: "✉️",
    color: "violet",
    actions: [
      { label: "Emails non lus", prompt: "Montre-moi mes emails non lus" },
      { label: "Résumé inbox", prompt: "Fais-moi un résumé de mes derniers emails importants" },
      { label: "Emails urgents", prompt: "Y a-t-il des emails urgents dans ma boîte ?" },
    ],
  },
  {
    category: "Agenda",
    icon: "📅",
    color: "cyan",
    actions: [
      { label: "Agenda aujourd'hui", prompt: "Quel est mon agenda aujourd'hui ?" },
      { label: "Agenda demain", prompt: "Qu'est-ce que j'ai demain ?" },
      { label: "Prochaine réunion", prompt: "Quelle est ma prochaine réunion ?" },
    ],
  },
  {
    category: "Rédiger",
    icon: "✍️",
    color: "emerald",
    actions: [
      { label: "Composer un email", prompt: "Aide-moi à composer un email professionnel" },
      { label: "Follow-up client", prompt: "Aide-moi à rédiger un email de suivi client" },
      { label: "Décliner poliment", prompt: "Aide-moi à décliner poliment une invitation" },
    ],
  },
  {
    category: "Briefing",
    icon: "⚡",
    color: "amber",
    actions: [
      { label: "Briefing du matin", prompt: "Donne-moi mon briefing du matin : emails non lus et agenda du jour" },
      { label: "Résumé de journée", prompt: "Fais-moi un résumé de ma journée : qu'est-ce que j'ai accompli et qu'est-ce qui reste ?" },
      { label: "Préparer demain", prompt: "Aide-moi à préparer ma journée de demain" },
    ],
  },
];

const colorMap: Record<string, string> = {
  violet: "border-violet-500/20 bg-violet-500/[0.05] hover:bg-violet-500/[0.10] text-violet-300",
  cyan: "border-cyan-500/20 bg-cyan-500/[0.05] hover:bg-cyan-500/[0.10] text-cyan-300",
  emerald: "border-emerald-500/20 bg-emerald-500/[0.05] hover:bg-emerald-500/[0.10] text-emerald-300",
  amber: "border-amber-500/20 bg-amber-500/[0.05] hover:bg-amber-500/[0.10] text-amber-300",
};

const badgeMap: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-400",
  cyan: "bg-cyan-500/10 text-cyan-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: next.slice(0, -1) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erreur");
      setMessages([...next, { role: "assistant", content: data.response || "(réponse vide)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 pt-24 pb-8 flex flex-col">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Assistant <span className="text-violet-400">IA</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gmail · Google Calendar · Actions automatiques
          </p>
        </div>

        {/* Welcome state: quick action grid */}
        {!hasMessages && !loading && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((cat) => (
              <div
                key={cat.category}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{cat.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeMap[cat.color]}`}>
                    {cat.category}
                  </span>
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
            ))}
          </div>
        )}

        {/* Chat area */}
        {hasMessages && (
          <div
            ref={scrollRef}
            className="flex-1 min-h-[45vh] max-h-[55vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3 mb-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[80%] bg-violet-600/90 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap"
                    : "mr-auto max-w-[85%] bg-white/[0.04] border border-white/[0.06] text-zinc-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto bg-white/[0.04] border border-white/[0.06] text-zinc-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                <span className="inline-block animate-pulse">Trigr réfléchit…</span>
              </div>
            )}
          </div>
        )}

        {/* Quick actions bar when chat is active */}
        {hasMessages && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            {QUICK_ACTIONS.flatMap((cat) =>
              cat.actions.slice(0, 1).map((a) => (
                <button
                  key={a.label}
                  onClick={() => send(a.prompt)}
                  disabled={loading}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${colorMap[cat.color]}`}
                >
                  {cat.icon} {a.label}
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demande-moi n'importe quoi…"
            disabled={loading}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            Envoyer
          </button>
        </form>

        {/* Reset */}
        {hasMessages && (
          <button
            onClick={() => setMessages([])}
            className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center"
          >
            Nouvelle conversation
          </button>
        )}
      </main>
      <Footer />
    </div>
  );
}
