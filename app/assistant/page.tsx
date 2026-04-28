"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Mon agenda aujourd'hui",
  "Mes emails non lus",
  "Ajoute une réunion demain à 10h",
  "Compose un email à mon équipe",
];

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

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 pt-28 pb-8 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Assistant <span className="text-violet-400">IA</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Demande-moi ton agenda, tes emails, ou de programmer une action.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-[40vh] max-h-[60vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-full px-3 py-1.5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

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
              <span className="inline-block animate-pulse">L'assistant réfléchit…</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris ton message…"
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
      </main>
      <Footer />
    </div>
  );
}
