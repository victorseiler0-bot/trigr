import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const FEATURES = [
  {
    icon: "✉️",
    title: "Email & Agenda",
    desc: "Trie tes mails, propose des réponses, prépare tes réunions. Zéro effort.",
  },
  {
    icon: "💬",
    title: "SMS & WhatsApp",
    desc: "Brief du matin par SMS, bot qui répond à ta place — même téléphone éteint.",
  },
  {
    icon: "⚡",
    title: "Automatisations",
    desc: "Relances, rapports, rappels — tout tourne en arrière-plan sans que tu touches à rien.",
  },
];

const INTEGRATIONS = ["Gmail", "Google Calendar", "WhatsApp", "Slack", "Notion", "GitHub", "HubSpot", "Airtable"];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-32 pb-24 px-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-100/50 rounded-full blur-[120px]" />
          </div>
          <div className="relative max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Essai gratuit · Aucune carte requise
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-[1.08] tracking-tight mb-6">
              Ton chief of staff IA.<br />
              <span className="gradient-text">Toujours disponible.</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-2xl mx-auto">
              Un assistant personnel qui gère tes emails, ton agenda et tes automatisations.
              Par SMS, WhatsApp ou chat — même quand ton PC est éteint.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/assistant"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(59,130,246,0.35)] text-base">
                Démarrer gratuitement
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h8M7 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center justify-center gap-2 text-slate-600 font-semibold px-6 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-base">
                Voir les tarifs
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">RGPD-friendly · 5× moins cher que Lindy · Données chez toi</p>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────────── */}
        <section id="fonctions" className="py-20 px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map(f => (
                <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm hover:-translate-y-1 transition-all">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-slate-900 font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTEGRATIONS ──────────────────────────────────────────────────── */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-8 font-semibold">Compatible avec</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {INTEGRATIONS.map(name => (
                <span key={name} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 px-4 py-2 rounded-full font-medium">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-blue-600">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Prêt à reprendre le contrôle de ton temps ?
            </h2>
            <p className="text-blue-200 mb-8">7 jours gratuits, sans carte bancaire.</p>
            <Link href="/assistant"
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg text-base">
              Démarrer maintenant
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7h8M7 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
