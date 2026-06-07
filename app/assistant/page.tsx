"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";

type Msg = { role: "user" | "assistant"; content: string };

// ── Inline markdown renderer ───────────────────────────────────────────────────
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={key++} className="font-semibold text-slate-900">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={key++} className="bg-slate-100 text-blue-700 text-xs px-1 py-0.5 rounded font-mono">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownText({ content, streaming }: { content: string; streaming?: boolean }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let listBuf: string[] = [];
  let isOrdered = false;
  let k = 0;

  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push(
      isOrdered
        ? <ol key={k++} className="list-decimal pl-5 space-y-0.5 my-1.5 text-sm">{listBuf.map((t, i) => <li key={i}>{renderInline(t)}</li>)}</ol>
        : <ul key={k++} className="space-y-1 my-1.5">{listBuf.map((t, i) => <li key={i} className="flex gap-2 text-sm"><span className="text-slate-400 shrink-0 mt-0.5 select-none">•</span><span>{renderInline(t)}</span></li>)}</ul>
    );
    listBuf = [];
  };

  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1;
    if (/^#{1,3} /.test(line)) {
      flushList();
      const level = (line.match(/^#+/) ?? [""])[0].length;
      const txt = line.replace(/^#+\s*/, "");
      const cls = level === 1 ? "text-base font-bold mt-2 mb-1" : "text-sm font-semibold mt-2 mb-0.5";
      nodes.push(<p key={k++} className={cls}>{renderInline(txt)}{streaming && isLast && <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />}</p>);
    } else if (/^[-*•]\s+/.test(line)) {
      if (listBuf.length > 0 && isOrdered) flushList();
      isOrdered = false;
      listBuf.push(line.replace(/^[-*•]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      if (listBuf.length > 0 && !isOrdered) flushList();
      isOrdered = true;
      listBuf.push(line.replace(/^\d+\.\s+/, ""));
    } else if (line.trim() === "---") {
      flushList();
      nodes.push(<hr key={k++} className="border-slate-200 my-2" />);
    } else if (line.trim() === "") {
      flushList();
      if (nodes.length) nodes.push(<div key={k++} className="h-2" />);
    } else {
      flushList();
      nodes.push(
        <p key={k++} className="text-sm leading-relaxed">
          {renderInline(line)}
          {streaming && isLast && <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />}
        </p>
      );
    }
  });
  flushList();
  return <>{nodes}</>;
}

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
  { icon: "🔍", category: "Recherche", prompts: [
    { label: "Actualités", prompt: "Quelles sont les dernières actualités importantes en France ?" },
    { label: "Météo du jour", prompt: "Donne-moi la météo à Paris aujourd'hui" },
    { label: "Infos entreprise", prompt: "Recherche des informations sur une entreprise" },
  ]},
  { icon: "🏢", category: "Entreprises FR", prompts: [
    { label: "Infos société (SIREN)", prompt: "Cherche les informations officielles (SIREN, adresse, activité) de l'entreprise " },
    { label: "Vérifier un fournisseur", prompt: "Vérifie si cette entreprise est bien active et en règle : " },
    { label: "Secteur d'activité", prompt: "Quel est le code NAF et l'activité principale de cette société : " },
  ]},
];

// ── Avatar AI ──────────────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
      title="Copier"
    >
      {copied
        ? <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l3 3 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round"/></svg>
      }
    </button>
  );
}

// ── Smart action detection ─────────────────────────────────────────────────────
type SmartActionType = { type: "email"; subject: string } | { type: "devis" } | { type: "document" } | null;

function detectSmartAction(content: string): SmartActionType {
  const subjectMatch = content.match(/Objet\s*:\s*([^\n]+)/i);
  if (subjectMatch || /Cordialement[,\s]|Bien cordialement|Veuillez agréer/.test(content)) {
    return { type: "email", subject: subjectMatch?.[1]?.trim() ?? "" };
  }
  if (/TOTAL TTC|sous-total HT|TVA 20%/.test(content)) {
    return { type: "devis" };
  }
  if (/Article \d+|Clause \d+|CONTRAT|CONDITIONS GÉNÉRALES/i.test(content)) {
    return { type: "document" };
  }
  return null;
}

function SmartActionBar({ content }: { content: string }) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const action = detectSmartAction(content);
  if (!action) return null;

  function copyWithLabel(label: string) {
    navigator.clipboard.writeText(content);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  }

  function downloadTxt(filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const greenBtn = "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
  const blueBtn  = "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100";
  const slateBtn = "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";

  if (action.type === "email") {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(action.subject)}&body=${encodeURIComponent(content)}`;
    return (
      <div className="flex gap-2 mt-2 flex-wrap ml-0.5">
        <button onClick={() => copyWithLabel("email")} className={greenBtn}>
          {copiedLabel === "email" ? "✅ Copié !" : "📋 Copier l'email"}
        </button>
        <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className={blueBtn}>
          ✉️ Ouvrir dans Gmail
        </a>
      </div>
    );
  }

  if (action.type === "devis") {
    return (
      <div className="flex gap-2 mt-2 flex-wrap ml-0.5">
        <button onClick={() => copyWithLabel("devis")} className={greenBtn}>
          {copiedLabel === "devis" ? "✅ Copié !" : "📋 Copier le devis"}
        </button>
        <button onClick={() => downloadTxt("devis.txt")} className={slateBtn}>
          ⬇️ Télécharger .txt
        </button>
      </div>
    );
  }

  if (action.type === "document") {
    return (
      <div className="flex gap-2 mt-2 flex-wrap ml-0.5">
        <button onClick={() => copyWithLabel("doc")} className={greenBtn}>
          {copiedLabel === "doc" ? "✅ Copié !" : "📋 Copier le document"}
        </button>
        <button onClick={() => downloadTxt("document.txt")} className={slateBtn}>
          ⬇️ Télécharger .txt
        </button>
      </div>
    );
  }

  return null;
}

// ── Session history ─────────────────────────────────────────────────────────────
type ConvSession = { id: string; title: string; messages: Msg[]; ts: number };

function saveSession(msgs: Msg[]) {
  if (msgs.length === 0) return;
  const title = msgs.find(m => m.role === "user")?.content.slice(0, 55) ?? "Conversation";
  const session: ConvSession = { id: Date.now().toString(), title, messages: msgs.slice(-30), ts: Date.now() };
  try {
    const stored = localStorage.getItem("autozen_sessions");
    const sessions: ConvSession[] = stored ? JSON.parse(stored) : [];
    sessions.unshift(session);
    localStorage.setItem("autozen_sessions", JSON.stringify(sessions.slice(0, 15)));
  } catch { /* ignore */ }
}

function loadSessions(): ConvSession[] {
  try {
    const stored = localStorage.getItem("autozen_sessions");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}


function exportConversation(msgs: Msg[]) {
  if (msgs.length === 0) return;
  const date = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  const lines: string[] = ["Conversation Autozen — " + date, "=".repeat(40), ""];
  for (const m of msgs) {
    lines.push(m.role === "user" ? "Vous :" : "Autozen :");
    lines.push(m.content);
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Autozen-conversation-" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AssistantPage() {
  const { user } = useUser();
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [sessions, setSessions] = useState<ConvSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Load sessions + history on mount + ?prefill= URL param
  useEffect(() => {
    try {
      const saved = localStorage.getItem("autozen_history");
      if (saved) {
        const parsed = JSON.parse(saved) as Msg[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch { /* ignore */ }
    setSessions(loadSessions());
    setHistoryLoaded(true);

    // Pre-fill input from URL param (e.g. from CRM "Contacter avec Autozen")
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("prefill");
    if (prefill) {
      setInput(decodeURIComponent(prefill));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // Save history to localStorage on change
  useEffect(() => {
    if (!historyLoaded) return;
    try { localStorage.setItem("autozen_history", JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
  }, [messages, historyLoaded]);

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
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message: trimmed, history: next.slice(0, -1) }),
      });

      if (r.status === 429) {
        const data = await r.json();
        setError(`${data.error} → <upgrade>`);
        return;
      }
      if (!r.ok) throw new Error("Erreur serveur");

      const contentType = r.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const data = await r.json();
        setMessages([...next, { role: "assistant", content: data.response || "(réponse vide)" }]);
        return;
      }

      // SSE streaming
      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulated = "";
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.c) {
              accumulated += evt.c;
              if (!streamStarted) {
                streamStarted = true;
                setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
              } else {
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: accumulated };
                  return copy;
                });
              }
            } else if (evt.done) {
              if (typeof evt.remaining === "number") setRemaining(evt.remaining);
            }
          } catch { /* ignore malformed chunks */ }
        }
      }
      if (!streamStarted) {
        setMessages(prev => [...prev, { role: "assistant", content: "(réponse vide)" }]);
      }
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

  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast("La reconnaissance vocale n'est pas supportée par ce navigateur.", "error"); return; }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (evt: any) => {
      const transcript = evt.results[0][0].transcript as string;
      setInput(prev => (prev ? prev + " " + transcript : transcript));
      inputRef.current?.focus();
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  const hasMessages = messages.length > 0;
  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");
  const displayName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  // Helpers sidebar
  function refreshSessions() { setSessions(loadSessions()); }

  function handleNewConversation() {
    if (messages.length > 0) {
      saveSession(messages);
      refreshSessions();
    }
    setMessages([]);
    setActiveSessionId(null);
    try { localStorage.removeItem("autozen_history"); } catch { /* */ }
  }

  function handleLoadSession(s: ConvSession) {
    if (messages.length > 0) { saveSession(messages); refreshSessions(); }
    setMessages(s.messages);
    setActiveSessionId(s.id);
    try { localStorage.setItem("autozen_history", JSON.stringify(s.messages)); } catch { /* */ }
  }

  function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem("autozen_sessions");
      const arr: ConvSession[] = stored ? JSON.parse(stored) : [];
      const updated = arr.filter(s => s.id !== id);
      localStorage.setItem("autozen_sessions", JSON.stringify(updated));
      setSessions(updated);
      if (activeSessionId === id) { setMessages([]); setActiveSessionId(null); }
    } catch { /* */ }
  }

  const filteredSessions = sessions.filter(s =>
    !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions by date
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400_000).toDateString();
  const groups: { label: string; items: ConvSession[] }[] = [];
  const todayItems = filteredSessions.filter(s => new Date(s.ts).toDateString() === todayStr);
  const yesterdayItems = filteredSessions.filter(s => new Date(s.ts).toDateString() === yesterdayStr);
  const olderItems = filteredSessions.filter(s => new Date(s.ts).toDateString() !== todayStr && new Date(s.ts).toDateString() !== yesterdayStr);
  if (todayItems.length) groups.push({ label: "Aujourd'hui", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "Hier", items: yesterdayItems });
  if (olderItems.length) groups.push({ label: "Plus ancien", items: olderItems });

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/20 flex flex-col">
      {!focusMode && <Navbar />}

      <div className={`flex flex-1 ${focusMode ? "pt-0" : "pt-16"}`}>

        {/* ── SIDEBAR GAUCHE ──────────────────────────────────────────────────── */}
        <aside className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 transition-all duration-300 overflow-hidden`}>
          <div className="w-64 h-[calc(100vh-4rem)] sticky top-16 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
            {/* Header sidebar */}
            <div className="p-3 border-b border-slate-100">
              <button
                onClick={handleNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12" strokeLinecap="round"/></svg>
                Nouvelle conversation
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 shrink-0" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="flex-1 text-xs bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none min-w-0"
                />
              </div>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto py-2">
              {groups.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-8 px-4">Aucune conversation</p>
              ) : groups.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">{group.label}</p>
                  {group.items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSession(s)}
                      className={`w-full text-left px-3 py-2 group flex items-start gap-2 hover:bg-slate-50 transition-colors rounded-lg mx-1 ${activeSessionId === s.id ? "bg-blue-50 text-blue-700" : ""}`}
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${activeSessionId === s.id ? "text-blue-700" : "text-slate-700"}`}>{s.title}</p>
                        <p className="text-[10px] text-slate-400">{new Date(s.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <button
                        onClick={e => handleDeleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0 p-0.5 rounded"
                        title="Supprimer"
                      >
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l7 7M9 2l-7 7" strokeLinecap="round"/></svg>
                      </button>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer sidebar */}
            <div className="p-3 border-t border-slate-100">
              <Link href="/settings" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <span className={`w-2 h-2 rounded-full ${connectedCount > 0 ? "status-connected" : "status-disconnected"}`} />
                {connectedCount} intégration{connectedCount !== 1 ? "s" : ""} connectée{connectedCount !== 1 ? "s" : ""}
              </Link>
            </div>
          </div>
        </aside>

        {/* ── MAIN CHAT ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 pt-8 pb-6 flex flex-col">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              title={sidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18" strokeLinecap="round"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {hasMessages ? (activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title?.slice(0, 40) ?? "Conversation" : "Conversation") : `Bonjour ${displayName ?? ""} 👋`}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={() => exportConversation(messages)}
                className="text-xs text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-all"
                title="Exporter (.txt)"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M12 15l-3-3m3 3l3-3m-3 3V9M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => { setFocusMode(f => !f); setSidebarOpen(false); }}
              className={`p-2 rounded-lg transition-all text-xs font-medium ${focusMode ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
              title={focusMode ? "Quitter le mode Focus" : "Mode Focus (plein écran)"}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                {focusMode
                  ? <path d="M9 9L4 4M4 4h5M4 4v5M15 9l5-5M20 4h-5M20 4v5M9 15l-5 5M4 20h5M4 20v-5M15 15l5 5M20 20h-5M20 20v-5" strokeLinecap="round"/>
                  : <path d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2M14 4h2a2 2 0 012 2v2M14 20h2a2 2 0 002-2v-2" strokeLinecap="round"/>
                }
              </svg>
            </button>
          </div>
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
            <Link href="/settings" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all">
              Connecter
            </Link>
          </div>
        )}

        {/* Suggestions (sans messages) */}
        {!hasMessages && !loading && (
          <div className="mb-6 flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                <span className="text-white font-black text-2xl">A</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Comment puis-je t&apos;aider ?</h2>
              <p className="text-sm text-slate-500 mt-1">Pose-moi n&apos;importe quelle question ou demande-moi d&apos;agir pour toi.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {QUICK_SUGGESTIONS.flatMap(cat => cat.prompts.slice(0, 2)).map(p => (
                <button key={p.label} onClick={() => send(p.prompt)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-blue-200 bg-white text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat zone */}
        {hasMessages && (
          <div ref={scrollRef}
            className="flex-1 min-h-[40vh] max-h-[60vh] overflow-y-auto space-y-5 mb-5 px-1">
            {messages.map((m, i) => {
              const isStreamingMsg = loading && i === messages.length - 1 && m.role === "assistant";
              return (
                <div key={i} className={`flex gap-3 animate-fade-up ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "user" ? <UserAvatar initials={initials} /> : <BotAvatar />}
                  <div className={`group relative max-w-[78%] flex items-start gap-0 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`px-4 py-2.5 rounded-2xl ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-md text-sm leading-relaxed"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-md shadow-sm"
                    }`}>
                      {m.role === "user"
                        ? m.content
                        : <MarkdownText content={m.content} streaming={isStreamingMsg} />
                      }
                    </div>
                    {m.role === "assistant" && !isStreamingMsg && m.content && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={m.content} />
                        {!feedbackSent.has(i) ? (
                          <>
                            <button
                              onClick={() => {
                                fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIndex: i, rating: "up", content: m.content.slice(0, 200) }) });
                                setFeedbackSent(prev => new Set([...prev, i]));
                              }}
                              className="p-1 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 transition-all" title="Bonne réponse"
                            >👍</button>
                            <button
                              onClick={() => {
                                fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIndex: i, rating: "down", content: m.content.slice(0, 200) }) });
                                setFeedbackSent(prev => new Set([...prev, i]));
                              }}
                              className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Mauvaise réponse"
                            >👎</button>
                          </>
                        ) : <span className="text-xs text-slate-400 ml-1">Merci ✓</span>}
                      </div>
                    )}
                  </div>
                  {m.role === "assistant" && !isStreamingMsg && m.content && (
                    <SmartActionBar content={m.content} />
                  )}
                </div>
              );
            })}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
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
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-blue-700 font-medium">{error.replace(" → <upgrade>", "")}</p>
              <Link href="/pricing" className="shrink-0 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all">
                Passer Pro →
              </Link>
            </div>
          ) : (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>
          )
        )}

        {/* Input — glassmorphism style */}
        <form onSubmit={e => { e.preventDefault(); send(input); }}
          className="relative bg-white/80 backdrop-blur-md border border-blue-200/60 rounded-2xl shadow-[0_4px_24px_rgba(59,130,246,0.12)] focus-within:border-blue-400 focus-within:shadow-[0_4px_32px_rgba(59,130,246,0.22)] transition-all">
          <div className="flex items-end gap-2 px-4 py-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connectedCount > 0 ? "Demande-moi n'importe quoi…" : "Connecte un compte d'abord pour commencer…"}
              disabled={loading}
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 py-1 max-h-[200px]"
            />
            <button
              type="button"
              onClick={toggleVoice}
              title={listening ? "Arrêter l'écoute" : "Dicter un message"}
              className={`shrink-0 p-2 rounded-xl transition-all ${listening ? "bg-red-100 text-red-500 animate-pulse" : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button type="submit" disabled={loading || !input.trim()}
              className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shadow-sm">
              {loading
                ? <span className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l14-7-7 14-2-5-5-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          </div>
          <div className="px-4 pb-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>{listening ? <span className="text-red-500 font-medium">🎙 Écoute en cours…</span> : "⏎ envoyer · ⇧⏎ nouvelle ligne"}</span>
            <div className="flex items-center gap-3">
              {remaining !== null && remaining !== -1 && remaining < 20 && (
                <span className={remaining === 0 ? "text-red-500 font-medium" : "text-amber-500"}>
                  {remaining} action{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
                </span>
              )}
              {hasMessages && (
                <button type="button" onClick={handleNewConversation}
                  className="text-blue-500 hover:text-blue-700 transition-colors font-medium">
                  + Nouvelle
                </button>
              )}
            </div>
          </div>
        </form>

        <p className="text-xs text-slate-400 text-center mt-3">
          Autozen peut faire des erreurs. Vérifie les infos importantes.
        </p>
      </main>
      </div>
    </div>
  );
}
