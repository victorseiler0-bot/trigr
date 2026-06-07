"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Cmd = {
  id: string;
  icon: string;
  label: string;
  desc?: string;
  action: (router: ReturnType<typeof useRouter>) => void;
  keywords?: string;
};

const COMMANDS: Cmd[] = [
  { id: "assistant",   icon: "💬", label: "Assistant IA",       desc: "Ouvrir le chat assistant",           action: r => r.push("/assistant"),   keywords: "chat ai message" },
  { id: "dashboard",   icon: "📊", label: "Tableau de bord",    desc: "Accueil et résumé",                 action: r => r.push("/dashboard"),   keywords: "home accueil stats" },
  { id: "crm",         icon: "👥", label: "CRM Contacts",       desc: "Gérer tes contacts",                action: r => r.push("/crm"),         keywords: "contacts clients prospects" },
  { id: "marketplace", icon: "🛍️", label: "Marketplace",        desc: "Automatisations et templates",      action: r => r.push("/marketplace"), keywords: "templates workflows automatisations" },
  { id: "settings",    icon: "⚙️", label: "Paramètres",         desc: "Compte et intégrations",            action: r => r.push("/settings"),    keywords: "compte google whatsapp" },
  { id: "new-email",   icon: "✉️", label: "Rédiger un email",   desc: "Ouvre l'assistant avec un email",   action: r => r.push("/assistant?prefill=" + encodeURIComponent("Aide-moi à rédiger un email professionnel pour ")), keywords: "email mail gmail" },
  { id: "calendar",    icon: "📅", label: "Mon agenda du jour", desc: "Consulte tes événements",           action: r => r.push("/assistant?prefill=" + encodeURIComponent("Quels sont mes événements du jour ?")), keywords: "agenda calendar réunion" },
  { id: "wa-unread",   icon: "💬", label: "WhatsApp non lus",   desc: "Voir les messages non lus",         action: r => r.push("/assistant?prefill=" + encodeURIComponent("Quels sont mes derniers messages WhatsApp non lus ?")), keywords: "whatsapp messages wa" },
  { id: "devis",       icon: "📋", label: "Créer un devis",     desc: "Génère un devis avec TVA",          action: r => r.push("/assistant?prefill=" + encodeURIComponent("Crée un devis professionnel pour ")), keywords: "devis facture prix" },
  { id: "relance",     icon: "🔔", label: "Relancer un client", desc: "Email de relance poli ou ferme",    action: r => r.push("/assistant?prefill=" + encodeURIComponent("Rédige un email de relance pour un client qui n'a pas encore payé la facture ")), keywords: "relance paiement facture client" },
  { id: "entreprise",  icon: "🏢", label: "Infos entreprise",  desc: "Recherche via SIREN/SIRET",         action: r => r.push("/assistant?prefill=" + encodeURIComponent("Recherche des informations officielles sur l'entreprise ")), keywords: "siren siret entreprise recherche" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? COMMANDS.filter(c =>
        (c.label + " " + (c.desc ?? "") + " " + (c.keywords ?? ""))
          .toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const run = useCallback((cmd: Cmd) => {
    setOpen(false);
    setQuery("");
    cmd.action(router);
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setQuery("");
        setCursor(0);
      }
      if (!open) return;
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && filtered[cursor]) { run(filtered[cursor]); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, cursor, filtered, run]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => { setOpen(false); setQuery(""); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-[#111113] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une action…"
            className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm outline-none" />
          <kbd className="hidden sm:flex text-xs text-zinc-600 border border-white/[0.06] rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="py-1.5 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">Aucune action trouvée</div>
          ) : filtered.map((cmd, i) => (
            <button key={cmd.id} onClick={() => run(cmd)}
              onMouseEnter={() => setCursor(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === cursor ? "bg-blue-600/20 text-white" : "text-zinc-300 hover:bg-white/[0.04]"
              }`}>
              <span className="text-lg w-6 text-center shrink-0">{cmd.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{cmd.label}</div>
                {cmd.desc && <div className="text-xs text-zinc-500 truncate">{cmd.desc}</div>}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-4 text-xs text-zinc-600">
          <span><kbd className="border border-white/[0.07] rounded px-1">↑↓</kbd> naviguer</span>
          <span><kbd className="border border-white/[0.07] rounded px-1">⏎</kbd> ouvrir</span>
          <span className="ml-auto"><kbd className="border border-white/[0.07] rounded px-1">Ctrl K</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}
