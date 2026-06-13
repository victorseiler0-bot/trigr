"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
type TraceEv =
  | { type: "tool_call"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: string }
  | { type: "thinking"; text: string };

type Turn = {
  id: string;
  userMsg: string;
  trace: TraceEv[];
  liveText: string;
  finalText: string;
  done: boolean;
};

type SavedSession = { id: string; name: string; ts: number };

const SESS_KEY = "orbe_ae_sessions_v1";

// ── Markdown renderer ──────────────────────────────────────────────────────────
function renderMarkdown(raw: string): string {
  // Extract code blocks first to avoid escaping their content
  const blocks: string[] = [];
  let text = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const esc = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    blocks.push(
      `<div style="margin:12px 0;border-radius:8px;overflow:hidden;border:1px solid #2a3040">` +
      `<div style="display:flex;align-items:center;padding:6px 14px;background:#1a1e25;border-bottom:1px solid #2a3040">` +
      `<span style="font-family:monospace;font-size:11px;color:#4a5568">${lang || "plaintext"}</span></div>` +
      `<pre style="margin:0;padding:14px;overflow-x:auto;background:#0d1117;font-family:monospace;font-size:13px;line-height:1.55;color:#e2e8f0;white-space:pre-wrap;word-break:break-word">${esc}</pre></div>`
    );
    return `\x00BLK${blocks.length - 1}\x00`;
  });

  // Escape rest
  text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code style="font-family:monospace;font-size:13px;background:#1a1e25;border:1px solid #2a3040;padding:1px 5px;border-radius:4px">$1</code>');
  // Headers
  text = text.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:650;margin:18px 0 7px">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:650;margin:20px 0 8px">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;margin:22px 0 10px">$1</h1>');
  // Bold / italic
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:650">$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em style="color:#c8d8f0">$1</em>');
  // HR
  text = text.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #1f2530;margin:20px 0">');
  // Lists
  text = text.replace(/^[-*•] (.+)$/gm, '<li style="margin:4px 0;line-height:1.6;padding-left:2px">$1</li>');
  text = text.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, m => `<ul style="margin:10px 0;padding-left:20px;list-style:disc">${m}</ul>`);
  text = text.replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;line-height:1.6">$1</li>');
  // Tables: basic
  text = text.replace(/\|(.+)\|\n\|[-: |]+\|\n((?:\|.+\|\n?)*)/g, (_m, header, rows) => {
    const th = header.split("|").filter(Boolean).map((c: string) => `<th style="background:#1a1e25;padding:8px 12px;text-align:left;border:1px solid #2a3040;font-weight:600">${c.trim()}</th>`).join("");
    const trs = rows.trim().split("\n").map((row: string) =>
      `<tr>${row.split("|").filter(Boolean).map((c: string) => `<td style="padding:7px 12px;border:1px solid #1f2530">${c.trim()}</td>`).join("")}</tr>`
    ).join("");
    return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  // Paragraphs
  text = text.replace(/\n\n/g, '</p><p style="margin:10px 0;line-height:1.7">');
  text = `<p style="margin:0;line-height:1.7">${text}</p>`;
  // Restore code blocks
  text = text.replace(/\x00BLK(\d+)\x00/g, (_m, i) => blocks[parseInt(i)]);
  return text;
}

// ── Trace item component ───────────────────────────────────────────────────────
function TraceItem({ ev }: { ev: TraceEv }) {
  const [open, setOpen] = useState(false);

  if (ev.type === "thinking") {
    const [expanded, setExpanded] = useState(false);
    return (
      <div style={{ position: "relative", padding: "6px 0 6px 22px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, background: "rgba(110,168,254,.06)", margin: "3px 0", borderRadius: "0 6px 6px 0", animation: "fadein .25s ease" }}>
        <span style={{ position: "absolute", left: -4, top: 13, width: 7, height: 7, borderRadius: "50%", background: "#6ea8fe", display: "block" }} />
        <span style={{ color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: ".1em", fontSize: 10, marginRight: 7 }}>réflexion</span>
        <div style={{ color: "#a8c4f0", fontStyle: "italic", fontSize: 12, lineHeight: 1.55, maxHeight: expanded ? 600 : 80, overflow: "hidden", transition: "max-height .3s" }}>
          {ev.text}
        </div>
        {ev.text.length > 100 && (
          <span onClick={() => setExpanded(e => !e)} style={{ color: "#6ea8fe", cursor: "pointer", fontSize: 10, textDecoration: "underline", textUnderlineOffset: 2, display: "block", marginTop: 3 }}>
            {expanded ? "voir moins" : "voir plus"}
          </span>
        )}
      </div>
    );
  }

  if (ev.type === "tool_call") {
    const args = JSON.stringify(ev.input, null, 2);
    return (
      <div style={{ position: "relative", padding: "6px 0 6px 22px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, animation: "fadein .25s ease" }}>
        <span style={{ position: "absolute", left: -4, top: 13, width: 7, height: 7, borderRadius: "50%", background: "#f6a623", boxShadow: "0 0 6px #f6a623", display: "block" }} />
        <span style={{ color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: ".1em", fontSize: 10, marginRight: 7 }}>appel</span>
        <span style={{ color: "#f6a623", fontWeight: 700 }}>{ev.name}</span>
        {ev.input && Object.keys(ev.input).length > 0 && (
          <span style={{ display: "block", marginTop: 4, padding: "6px 10px", background: "rgba(246,166,35,.08)", border: "1px solid rgba(246,166,35,.2)", borderRadius: 6, color: "#8892a4", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11.5 }}>
            {args}
          </span>
        )}
      </div>
    );
  }

  if (ev.type === "tool_result") {
    const isErr = ev.result?.toLowerCase().includes('"error"') || ev.result?.toLowerCase().includes("erreur");
    const hasContent = ev.result && ev.result.length > 0;
    return (
      <div style={{ position: "relative", padding: "6px 0 6px 22px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, animation: "fadein .25s ease" }}>
        <span style={{ position: "absolute", left: -4, top: 13, width: 7, height: 7, borderRadius: "50%", background: isErr ? "#f87171" : "#4ade80", display: "block" }} />
        <span style={{ color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: ".1em", fontSize: 10, marginRight: 7 }}>{isErr ? "échec" : "résultat"}</span>
        <span style={{ color: isErr ? "#f87171" : "#4ade80" }}>{ev.name}</span>
        {hasContent && (
          <span onClick={() => setOpen(o => !o)} style={{ color: "#4a5568", textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer", marginLeft: 8, fontSize: 10 }}>
            {open ? "cacher ▴" : "voir ▾"}
          </span>
        )}
        {open && hasContent && (
          <div style={{ maxHeight: 300, overflow: "auto", padding: "7px 10px", marginTop: 4, background: "#0a0c10", border: "1px solid #2a3040", borderRadius: 6, fontSize: 11.5, color: "#8892a4", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {ev.result}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Turn view ──────────────────────────────────────────────────────────────────
function TurnView({ turn, userInitial }: { turn: Turn; userInitial: string }) {
  return (
    <div style={{ padding: "24px 0", borderBottom: "1px solid #1f2530", animation: "fadein .25s ease" }}>
      {/* User message */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#f6a623,#e07b10)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0d0f12", flexShrink: 0, marginTop: 2 }}>
          {userInitial}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, paddingTop: 4, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {turn.userMsg}
        </div>
      </div>

      {/* Trace */}
      {turn.trace.length > 0 && (
        <div style={{ marginLeft: 42, borderLeft: "1px solid #1f2530" }}>
          {turn.trace.map((ev, i) => <TraceItem key={i} ev={ev} />)}
        </div>
      )}

      {/* Live streaming */}
      {turn.liveText && !turn.finalText && (
        <div style={{ marginLeft: 42, fontSize: 15, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: 24 }}>
          {turn.liveText}<span style={{ color: "#f6a623", animation: "blink 1s step-end infinite" }}>▌</span>
        </div>
      )}

      {/* Working indicator */}
      {!turn.done && !turn.finalText && !turn.liveText && (
        <div style={{ marginLeft: 42, display: "flex", alignItems: "center", gap: 10, fontFamily: "monospace", fontSize: 12, color: "#f6a623" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 0.12, 0.24, 0.36].map((delay, i) => (
              <i key={i} style={{ display: "block", width: 3, height: 11, background: "#f6a623", borderRadius: 2, animation: `eq 1s ease-in-out ${delay}s infinite`, opacity: 0.8 }} />
            ))}
          </div>
          <span>Réflexion en cours…</span>
        </div>
      )}

      {/* Final answer */}
      {turn.finalText && (
        <div style={{ marginLeft: 42 }}>
          <div style={{ fontSize: 15, lineHeight: 1.7, animation: "fadein .3s ease" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.finalText) }} />
          <CopyBtn text={turn.finalText} />
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      style={{ marginTop: 12, background: "none", border: "1px solid #2a3040", color: copied ? "#4ade80" : "#4a5568", fontFamily: "monospace", fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, transition: "all .15s" }}>
      {copied ? "✓ Copié !" : "⎘ Copier la réponse"}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AssistantPage() {
  const { user } = useUser();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    try { setSessions(JSON.parse(localStorage.getItem(SESS_KEY) || "[]")); } catch {}
  }, []);

  const scroll = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    });
  }, []);

  function newSession() {
    setTurns([]);
    inputRef.current?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setInput("");

    const turnId = `t_${Date.now()}`;
    const newTurn: Turn = { id: turnId, userMsg: text, trace: [], liveText: "", finalText: "", done: false };

    let prevTurns: Turn[] = [];
    setTurns(prev => { prevTurns = prev; return [...prev, newTurn]; });

    // Save session on first message
    if (prevTurns.length === 0) {
      const existing: SavedSession[] = (() => { try { return JSON.parse(localStorage.getItem(SESS_KEY) || "[]"); } catch { return []; } })();
      const updated = [{ id: turnId, name: text.slice(0, 55), ts: Date.now() }, ...existing].slice(0, 30);
      localStorage.setItem(SESS_KEY, JSON.stringify(updated));
      setSessions(updated);
    }

    const history = prevTurns.filter(t => t.done).flatMap(t => [
      { role: "user" as const, content: t.userMsg },
      { role: "assistant" as const, content: t.finalText || t.liveText },
    ]);

    abortRef.current = new AbortController();
    const upd = (fn: (t: Turn) => Turn) => setTurns(prev => prev.map(t => t.id === turnId ? fn(t) : t));

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message: text, history }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        upd(t => ({ ...t, finalText: d.error || "Limite journalière atteinte.", done: true }));
        return;
      }
      if (!res.ok) {
        upd(t => ({ ...t, finalText: "Erreur serveur.", done: true }));
        return;
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(line); } catch { continue; }

          if (ev.type === "text_delta") {
            accumulated += ev.text as string;
            upd(t => ({ ...t, liveText: accumulated }));
            scroll();
          } else if (ev.type === "tool_call") {
            upd(t => ({ ...t, trace: [...t.trace, { type: "tool_call" as const, name: ev.name as string, input: (ev.input ?? {}) as Record<string, unknown> }] }));
            scroll();
          } else if (ev.type === "tool_result") {
            upd(t => ({ ...t, trace: [...t.trace, { type: "tool_result" as const, name: ev.name as string, result: ev.result as string }] }));
            scroll();
          } else if (ev.type === "final") {
            const finalText = (ev.text as string) || accumulated;
            upd(t => ({ ...t, liveText: "", finalText, done: true }));
            if (typeof ev.remaining === "number") setRemaining(ev.remaining as number);
            scroll();
          } else if (ev.type === "done") {
            upd(t => t.done ? t : { ...t, done: true });
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        upd(t => ({ ...t, finalText: "Erreur de connexion.", done: true }));
      } else {
        upd(t => ({ ...t, liveText: "", finalText: t.liveText || t.finalText, done: true }));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
      abortRef.current = null;
      setTurns(prev => prev.map(t => t.id === turnId && !t.done ? { ...t, done: true, finalText: t.liveText } : t));
      scroll();
    }
  }

  const seeds = [
    "Lis mes derniers emails non lus",
    "Qu'est-ce que j'ai à faire aujourd'hui ?",
    "Génère un devis professionnel",
    "Cherche les dernières infos sur l'IA",
    "Montre mon pipeline commercial",
    "Envoie un message WhatsApp à [contact]",
  ];

  const userInitial = user?.firstName?.[0]?.toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0d0f12", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0, background: "#090b0e", borderRight: sidebarOpen ? "1px solid #1f2530" : "none", display: "flex", flexDirection: "column", transition: "all .22s cubic-bezier(.4,0,.2,1)", overflow: "hidden", zIndex: 20 }}>
        <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid #1f2530", flexShrink: 0 }}>
          <button onClick={newSession} style={{ width: "100%", padding: "9px 14px", background: "#14171c", border: "1px solid #2a3040", color: "#e2e8f0", fontFamily: "monospace", fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
            + Nouvelle conversation
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {sessions.map(s => (
            <div key={s.id} style={{ padding: "8px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12.5, color: "#8892a4", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}
              title={s.name}>
              {s.name}
            </div>
          ))}
        </div>
        {remaining !== null && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid #1f2530", fontSize: 11, color: "#4a5568", fontFamily: "monospace" }}>
            {remaining} actions restantes
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateRows: "auto 1fr auto", height: "100vh", overflow: "hidden", minWidth: 0 }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: "1px solid #1f2530", background: "#14171c", flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "none", color: "#8892a4", fontSize: 17, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}>☰</button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, letterSpacing: "-.02em" }}>Orbe</span>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: ".18em" }}>assistant</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            {busy && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f6a623", boxShadow: "0 0 8px #f6a623", animation: "pulsate 1.2s ease-in-out infinite" }} />
            )}
            {user && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4a5568" }}>{user.firstName || userInitial}</span>}
            <Link href="/dashboard" style={{ fontFamily: "monospace", fontSize: 11, color: "#4a5568", textDecoration: "none" }}>← dashboard</Link>
          </div>
        </header>

        {/* Chat area */}
        <div ref={chatRef} style={{ overflowY: "auto", padding: "0 0 32px", scrollBehavior: "smooth" }}>
          <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px" }}>

            {/* Welcome screen */}
            {turns.length === 0 && (
              <div style={{ maxWidth: 820, margin: "80px auto 0" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 10 }}>Donne-lui un objectif.</h2>
                <p style={{ color: "#8892a4", fontSize: 14.5, lineHeight: 1.6, maxWidth: 520 }}>
                  L'agent utilise tes outils connectés (Gmail, WhatsApp, Notion, CRM…) et résout le problème de bout en bout. Chaque étape est visible en temps réel.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
                  {seeds.map(seed => (
                    <button key={seed} onClick={() => { setInput(seed); setTimeout(() => inputRef.current?.focus(), 0); }}
                      style={{ fontFamily: "monospace", fontSize: 12, color: "#8892a4", border: "1px solid #2a3040", background: "#14171c", padding: "9px 13px", borderRadius: 8, cursor: "pointer", lineHeight: 1.4, transition: "all .15s" }}>
                      {seed}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map(turn => (
              <TurnView key={turn.id} turn={turn} userInitial={userInitial} />
            ))}
          </div>
        </div>

        {/* Footer / Composer */}
        <footer style={{ borderTop: "1px solid #1f2530", background: "#14171c", padding: "14px 20px", flexShrink: 0 }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Envoie un message… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
                rows={1}
                style={{ flex: 1, resize: "none", minHeight: 46, maxHeight: 180, background: "#0d0f12", border: "1px solid #2a3040", color: "#e2e8f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 15, lineHeight: 1.5, padding: "12px 14px", borderRadius: 10, outline: "none", transition: "border-color .15s" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                {busy && (
                  <button onClick={() => abortRef.current?.abort()}
                    style={{ background: "none", border: "1px solid #f87171", color: "#f87171", fontFamily: "monospace", fontSize: 12, height: 46, padding: "0 14px", borderRadius: 10, cursor: "pointer", transition: "all .15s" }}>
                    ■ Stop
                  </button>
                )}
                <button onClick={send} disabled={busy || !input.trim()}
                  style={{ background: busy || !input.trim() ? "rgba(246,166,35,.2)" : "#f6a623", color: busy || !input.trim() ? "#4a5568" : "#1a0f00", border: "none", fontFamily: "monospace", fontWeight: 700, fontSize: 13, padding: "0 18px", height: 46, borderRadius: 10, cursor: busy || !input.trim() ? "not-allowed" : "pointer", transition: "all .15s" }}>
                  Envoyer ↵
                </button>
              </div>
            </div>
            <p style={{ textAlign: "center", fontFamily: "monospace", fontSize: 10, color: "#4a5568", marginTop: 8 }}>
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
            </p>
          </div>
        </footer>
      </div>

      {/* Global keyframe animations */}
      <style>{`
        @keyframes pulsate { 0%,100%{box-shadow:0 0 8px #f6a623} 50%{box-shadow:0 0 16px #f6a623} }
        @keyframes fadein { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:none} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes eq { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(1)} }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a3040; border-radius: 3px; }
      `}</style>
    </div>
  );
}
