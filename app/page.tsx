import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

// ── Brand logos ────────────────────────────────────────────────────────────────
const LOGOS = [
  { name: "Gmail", svg: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg> },
  { name: "Calendar", svg: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M18.316 5.684H24v12.632h-5.684V5.684zm-12.632 0H24v5.684H5.684V5.684zM0 5.684h5.684v12.632H0V5.684zm5.684 12.632H18.316V24H5.684v-5.684z" fill="#4285F4"/></svg> },
  { name: "WhatsApp", svg: <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg> },
  { name: "Notion", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="#191919"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg> },
  { name: "Slack", svg: <svg viewBox="0 0 122.8 122.8" width="20" height="20"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0S90.5 5.8 90.5 12.9v32.3z" fill="#2EB67D"/><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/></svg> },
  { name: "GitHub", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="#24292f"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
  { name: "HubSpot", svg: <svg viewBox="0 0 512 512" width="20" height="20" fill="#FF7A59"><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 515.3 173.9 515.3s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7z"/><path d="M285.1 219.2v-60.3c9.3-4.3 15.8-13.7 15.8-24.6v-.8c0-14.9-12.1-27.1-27.1-27.1h-.8c-14.9 0-27.1 12.1-27.1 27.1v.8c0 10.9 6.4 20.3 15.8 24.6v60.3c-14.2 2.1-27.3 7.7-38.5 16.2L122.5 119.7c.9-3.1 1.4-6.4 1.4-9.8 0-20.3-16.5-36.8-36.8-36.8s-36.8 16.5-36.8 36.8 16.5 36.8 36.8 36.8c8.5 0 16.3-2.9 22.5-7.7l99.8 113.5c-16.4 19.3-26.2 44.3-26.2 71.6 0 60.5 49.1 109.7 109.7 109.7s109.7-49.1 109.7-109.7c0-55.8-41.8-101.9-95.5-108.7z"/></svg> },
  { name: "Airtable", svg: <svg viewBox="0 0 200 170" width="22" height="20"><path d="M90.039 12.368L24.079 38.66c-4.418 1.748-4.39 7.985.045 9.694l66.26 25.455c6.027 2.314 12.719 2.314 18.746 0l66.261-25.455c4.435-1.71 4.462-7.946.045-9.694L109.416 12.368c-6.231-2.45-13.146-2.45-19.377 0z" fill="#FFBF00"/><path d="M105.382 95.387v67.79c0 3.225 3.245 5.388 6.222 4.19l73.394-28.593c1.73-.674 2.86-2.35 2.86-4.19V66.794c0-3.225-3.246-5.388-6.222-4.19l-73.395 28.593c-1.73.675-2.86 2.35-2.86 4.19z" fill="#18BFFF"/><path d="M88.198 99.55L65.862 89.22l-2.584-1.21L18.8 68.906c-3.006-1.395-6.442.748-6.442 4.08v67.765c0 1.77.963 3.393 2.54 4.205l7.478 3.868 59.868 30.992c3.149 1.63 6.822-.625 6.822-4.205V103.63a4.663 4.663 0 00-2.868-4.08z" fill="#F82B60"/></svg> },
];

// ── Features ───────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    badge: "Email & Agenda",
    title: "Inbox zéro, sans effort",
    desc: "Ton assistant trie tes emails, propose des réponses et prépare tes réunions — automatiquement.",
    items: ["Triage & réponses suggérées", "Brief pré-réunion", "Comptes-rendus auto", "Suivi des relances"],
    accent: "violet",
  },
  {
    badge: "WhatsApp 24/7",
    title: "Disponible sur ton téléphone",
    desc: "WhatsApp Business natif — le canal n°1 des PME françaises. Répond à ta place 24h/24.",
    items: ["WhatsApp Business natif", "Chat web en temps réel", "Email reply auto", "Slack DM (Pro)"],
    accent: "emerald",
  },
  {
    badge: "Workflows métier",
    title: "20+ intégrations prêtes",
    desc: "Slack, Notion, GitHub, Airtable — connecte tous tes outils en 1 clic via OAuth sécurisé.",
    items: ["Relance prospect auto", "Rapport hebdo business", "Rappel RDV (−60% no-show)", "Devis en 1 clic"],
    accent: "blue",
  },
];

// ── Pricing ────────────────────────────────────────────────────────────────────
const PLANS = [
  { name: "Gratuit", price: "0€", period: "7 jours", desc: "Tout tester sans carte", features: ["Toutes les fonctionnalités", "100 messages", "1 assistant", "Chat web"], cta: "Démarrer l'essai", highlight: false, href: "/assistant" },
  { name: "Solo", price: "9€", period: "/mois", desc: "Pour les indépendants", features: ["Messages illimités", "Gmail + Google Calendar", "10+ templates", "Support email"], cta: "Choisir Solo", highlight: false, href: "/pricing" },
  { name: "Pro", price: "19€", period: "/mois", desc: "WhatsApp + toutes intégrations", features: ["Tout Solo inclus", "WhatsApp Business", "20+ intégrations OAuth", "30+ templates", "Support prioritaire"], cta: "Choisir Pro", highlight: true, badge: "Populaire", href: "/pricing" },
  { name: "Équipe", price: "49€", period: "/mois", desc: "Pour les petites équipes", features: ["Tout Pro inclus", "5 utilisateurs", "API access", "Onboarding 30 min"], cta: "Choisir Équipe", highlight: false, href: "/pricing" },
];

const COMPARE = [
  ["Langue", "🇫🇷 Français FR-first", "🇺🇸 100 % anglais"],
  ["Prix d'entrée", "9 €/mois", "50 $/mois"],
  ["WhatsApp", "✅ Natif", "❌ Non dispo"],
  ["Intégrations", "✅ 20+ via OAuth", "✅ 5000+ (Pipedream)"],
  ["RGPD", "✅ Données chez vous", "Stockées aux US"],
  ["Self-hosted", "✅ Docker 1 commande", "❌ SaaS uniquement"],
  ["Templates FR", "✅ Artisans, kinés…", "Templates US"],
];

const CHAT_MSGS = [
  { role: "user", text: "Montre-moi mes emails urgents" },
  { role: "assistant", text: "Tu as 3 emails urgents :\n• 📨 Marie Dupont – Devis en attente\n• 🔴 Facture impayée – Relancer avant 17h\n• 📋 Appel demain – Brief préparé ✓" },
  { role: "user", text: "Relance Marie automatiquement" },
  { role: "assistant", text: "✅ Email envoyé à Marie avec ton template. Rappel dans 48h si pas de réponse." },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-white">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-16 bg-white">
          {/* Subtle gradient top */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-100/60 rounded-full blur-[120px]" />
            <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-20">
            <div className="grid lg:grid-cols-2 gap-14 items-center">

              {/* Left */}
              <div className="animate-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Essai gratuit 7 jours · Aucune carte requise
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-[1.06] tracking-tight mb-6">
                  Ton assistant IA
                  <br />
                  <span className="gradient-text">personnel.</span>
                  <br />
                  <span className="text-slate-500">Données chez toi.</span>
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-xl">
                  Gmail, WhatsApp, Slack — ton assistant automatise tout à ta place.
                  RGPD-friendly, self-hostable, 5× moins cher que Lindy.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link href="/assistant"
                    className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_30px_rgba(124,58,237,0.45)] text-base">
                    Démarrer gratuitement
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                  <Link href="/integrations"
                    className="inline-flex items-center justify-center gap-2 text-slate-700 font-semibold px-6 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-base">
                    Voir les intégrations
                  </Link>
                </div>
                <div className="flex flex-wrap gap-5 text-sm text-slate-500">
                  {["RGPD-friendly", "Auto-hébergeable", "Sans engagement"].map(t => (
                    <span key={t} className="flex items-center gap-1.5">
                      <svg width="14" height="14" fill="none" stroke="#7c3aed" strokeWidth="2.5"><path d="M2 7l3 3 7-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — chat preview */}
              <div className="hidden lg:flex justify-center animate-fade-up-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-slate-200/50 rounded-3xl blur-2xl scale-105" />
                  <div className="relative bg-slate-900 rounded-2xl overflow-hidden w-[360px] shadow-2xl border border-slate-700">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
                      <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/70"/><div className="w-3 h-3 rounded-full bg-amber-500/70"/><div className="w-3 h-3 rounded-full bg-emerald-500/70"/></div>
                      <div className="flex-1 flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full status-connected" />
                        <span className="text-xs text-slate-400 font-medium">Trigr Assistant</span>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="px-4 py-5 space-y-4 min-h-[280px]">
                      {CHAT_MSGS.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          {m.role === "assistant" && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                          <div className={`rounded-2xl px-3.5 py-2.5 max-w-[240px] text-xs leading-relaxed ${
                            m.role === "user" ? "bg-violet-600 text-white rounded-tr-sm" : "bg-slate-800 text-slate-200 rounded-tl-sm"
                          }`} style={{ whiteSpace: "pre-line" }}>{m.text}</div>
                        </div>
                      ))}
                      <div className="flex gap-1.5 items-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0">
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1.5">
                          {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${d}ms` }}/>)}
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                        <span className="flex-1 text-xs text-slate-600">Tape un message…</span>
                        <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
                          <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2"><path d="M2 5h6M5 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-6 top-8 bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 animate-float text-xs font-medium text-slate-700">✅ Email envoyé</div>
                  <div className="absolute -left-6 bottom-12 bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 animate-float-delayed text-xs font-medium text-slate-700">📅 RDV planifié</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── LOGOS ─────────────────────────────────────────────────────────── */}
        <section className="py-12 px-6 bg-slate-50 border-y border-slate-200">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-slate-400 uppercase tracking-[0.2em] text-center mb-8 font-semibold">Compatible avec</p>
            <div className="flex items-center justify-center flex-wrap gap-8">
              {LOGOS.map(l => (
                <div key={l.name} className="flex flex-col items-center gap-2 group cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                    {l.svg}
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────────── */}
        <section id="fonctions" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-3">Fonctionnalités</p>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                Tout ce dont tu as besoin,<br /><span className="gradient-text">rien de superflu</span>
              </h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto">Un assistant IA qui comprend ton contexte et agit — conçu pour les indépendants et PME français.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map(f => (
                <div key={f.badge} className={`rounded-2xl border p-7 flex flex-col gap-5 bg-white hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md ${
                  f.accent === "violet" ? "border-violet-100" : f.accent === "emerald" ? "border-emerald-100" : "border-blue-100"
                }`}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                    f.accent === "violet" ? "bg-violet-50 text-violet-700" : f.accent === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                  }`}>{f.badge}</span>
                  <div>
                    <h3 className="text-slate-900 font-bold text-lg mb-2">{f.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                  <ul className="space-y-2">
                    {f.items.map(item => (
                      <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg className={`shrink-0 ${f.accent === "violet" ? "text-violet-500" : f.accent === "emerald" ? "text-emerald-500" : "text-blue-500"}`} width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
        <section id="comment" className="py-24 px-6 bg-slate-50 border-y border-slate-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-3">Simple</p>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">Opérationnel en <span className="gradient-text">2 minutes</span></h2>
              <p className="text-slate-500 text-lg">Pas de code, pas de setup technique. Connecte, parle, automatise.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: "01", title: "Connecte tes outils", desc: "Gmail, WhatsApp, Slack — connexion OAuth en 30 secondes depuis la page Intégrations. Tes données restent chez toi.", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
                { n: "02", title: "Parle à ton assistant", desc: "Via WhatsApp, chat web ou email. \"Quel est mon agenda demain ?\", \"Réponds à cet email\", \"Génère un devis\".", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
                { n: "03", title: "Il agit à ta place", desc: "L'assistant envoie, planifie, relance et te rapporte. Tu te concentres sur ce qui compte.", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
              ].map(s => (
                <div key={s.n} className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 w-fit">
                      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon}/>
                      </svg>
                    </div>
                    <span className="text-5xl font-black text-slate-100 select-none">{s.n}</span>
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────────────────────────── */}
        <section id="tarifs" className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-3">Tarifs</p>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">5× moins cher <span className="gradient-text">que Lindy</span></h2>
              <p className="text-slate-500 text-lg">Lindy commence à 50 $/mois. Trigr commence à 9 €. Vos données restent chez vous.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLANS.map(p => (
                <div key={p.name} className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
                  p.highlight ? "border-violet-300 bg-violet-50 shadow-lg shadow-violet-100" : "border-slate-200 bg-white shadow-sm"
                }`}>
                  {"badge" in p && p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold text-white bg-violet-600 px-3 py-1 rounded-full shadow-sm">{p.badge}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">{p.name}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-slate-900">{p.price}</span>
                      <span className="text-slate-400 text-sm mb-1">{p.period}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                        <svg className="text-violet-500 shrink-0 mt-0.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={p.href} className={`text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
                    p.highlight ? "bg-violet-600 hover:bg-violet-700 text-white shadow-sm" : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}>{p.cta}</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARE ─────────────────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Trigr vs Lindy</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
                <div className="p-4" />
                <div className="p-4 text-center"><span className="text-sm font-bold text-slate-900">Trigr 🇫🇷</span></div>
                <div className="p-4 text-center border-l border-slate-200"><span className="text-sm font-medium text-slate-500">Lindy 🇺🇸</span></div>
              </div>
              {COMPARE.map(([f, t, l], i) => (
                <div key={f} className={`grid grid-cols-3 hover:bg-slate-50 transition-colors ${i < COMPARE.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="p-4 text-sm text-slate-500 font-medium">{f}</div>
                  <div className="p-4 text-sm text-center text-slate-900">{t}</div>
                  <div className="p-4 text-sm text-center text-slate-400 border-l border-slate-100">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-3xl p-14 relative overflow-hidden shadow-2xl shadow-violet-200">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="relative">
                <h2 className="text-4xl font-bold text-white mb-3">Prêt à déléguer à ton IA ?</h2>
                <p className="text-violet-200 mb-10 text-lg">7 jours gratuits · Sans carte · Annulable en 1 clic</p>
                <Link href="/assistant"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-violet-700 font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-base">
                  Démarrer gratuitement
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
