import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const INTEGRATIONS = [
  "Gmail", "Google Calendar", "WhatsApp Business", "Apple iCloud",
  "Notion", "Microsoft Outlook", "Microsoft Teams", "Slack (bientôt)",
];

const CAPABILITIES = [
  {
    color: "violet" as const,
    badge: "Emails & Agenda",
    title: "Ton inbox sans effort",
    desc: "Ton assistant lit, trie et propose des réponses à tes emails. Il prépare tes réunions, te brief avant chaque appel et génère les comptes-rendus automatiquement.",
    items: ["Triage & propositions de réponse", "Préparation de réunion auto", "Comptes-rendus post-call", "Suivi des relances client"],
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    color: "cyan" as const,
    badge: "WhatsApp & Canaux",
    title: "Disponible sur WhatsApp 24/7",
    desc: "Contrairement à Lindy (iMessage US uniquement), Trigr s'intègre nativement à WhatsApp Business — le canal n°1 des PME et freelances en France. Aussi via chat web, email ou Slack.",
    items: ["WhatsApp Business natif", "Chat web (ce site)", "Email reply", "Slack DM"],
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    color: "violet" as const,
    badge: "Templates métier FR",
    title: "Dizaines d'automatisations prêtes",
    desc: "Relance prospect, devis en 1 clic, rapport hebdo, rappel RDV — des workflows testés pour les métiers français : artisans, kinés, freelances, agents immo.",
    items: ["Relance et suivi clients", "Devis & facturation auto", "Rapport hebdo business", "Rappel RDV (no-show −60%)"],
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connecte tes outils",
    desc: "Gmail, Google Calendar, WhatsApp Business, Slack — connexion OAuth en 30 secondes. Tes données restent chez toi, hébergées sur ton serveur.",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    n: "02",
    title: "Parle à ton assistant",
    desc: "Via WhatsApp, chat web ou email. \"Quel est mon agenda demain ?\", \"Réponds à cet email\", \"Génère un devis pour Marie\".",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    n: "03",
    title: "Il agit à ta place",
    desc: "L'assistant envoie, planifie, relance et te rapporte. Tu te concentres sur ce qui compte — lui gère le reste.",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  },
];

const PLANS = [
  {
    name: "Gratuit",
    price: "0€",
    period: "7 jours",
    desc: "Tout tester, sans carte",
    features: [
      "Toutes les fonctionnalités",
      "100 messages inclus",
      "1 assistant IA",
      "Chat web",
    ],
    cta: "Démarrer l'essai",
    highlight: false,
    badge: null as string | null,
  },
  {
    name: "Solo",
    price: "9€",
    period: "/mois",
    desc: "Pour les indépendants",
    features: [
      "Messages illimités",
      "Gmail + Google Calendar",
      "Chat web 24/7",
      "Templates de base (10+)",
      "Support email",
    ],
    cta: "Choisir Solo",
    highlight: false,
    badge: null as string | null,
  },
  {
    name: "Pro",
    price: "19€",
    period: "/mois",
    desc: "Avec WhatsApp Business",
    features: [
      "Tout Solo inclus",
      "WhatsApp Business natif",
      "3 assistants IA",
      "Templates Pro (30+)",
      "Computer Use (bêta)",
      "Support prioritaire",
    ],
    cta: "Choisir Pro",
    highlight: true,
    badge: "Populaire" as string | null,
  },
  {
    name: "Équipe",
    price: "49€",
    period: "/mois",
    desc: "Pour les petites équipes",
    features: [
      "Tout Pro inclus",
      "5 utilisateurs",
      "Slack & Microsoft Teams",
      "API access",
      "Onboarding call 30 min",
    ],
    cta: "Choisir Équipe",
    highlight: false,
    badge: null as string | null,
  },
];

const CHANNELS = [
  {
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    label: "WhatsApp Business",
    desc: "Le canal n°1 en France",
    color: "cyan" as const,
    badge: "Différenciateur",
  },
  {
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    label: "Email reply",
    desc: "Réponds depuis ta boîte",
    color: "violet" as const,
    badge: null as string | null,
  },
  {
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    label: "Chat web",
    desc: "Interface sur ce site",
    color: "violet" as const,
    badge: "Déjà dispo" as string | null,
  },
  {
    icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
    label: "Slack DM",
    desc: "Dans ton espace de travail",
    color: "violet" as const,
    badge: null as string | null,
  },
];

const COMPARE_ROWS = [
  ["Langue", "Français FR-first", "100 % anglais"],
  ["Prix d'entrée", "9 €/mois", "50 $/mois"],
  ["WhatsApp", "✅ Natif", "❌ Non dispo"],
  ["Apple iCloud", "✅ CalDAV direct", "✅ Mac Mini bridge"],
  ["Notion", "✅ OAuth natif", "✅ OAuth natif"],
  ["RGPD", "✅ Données chez vous", "Données stockées US"],
  ["Self-hosted", "✅ Docker 1 commande", "❌ SaaS uniquement"],
  ["Templates FR", "✅ Artisans, kinés…", "Templates US"],
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main>

        {/* HERO */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/[0.08] rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.012]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)", backgroundSize: "60px 60px" }}
            />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-violet-300 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Essai gratuit 7 jours · Aucune carte requise
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.06] tracking-tight mb-6">
              Ton assistant IA{" "}
              <span className="gradient-text">personnel.</span>
              <br />Tes données chez toi.
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Gmail, WhatsApp, agenda — ton assistant automatise tout à ta place.
              RGPD-friendly, self-hostable, 5× moins cher que Lindy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] text-base"
              >
                Démarrer gratuitement
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link
                href="#comment"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-white/[0.08] hover:border-white/20 transition-all text-base"
              >
                Voir comment ça marche
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              {["RGPD-friendly · données chez vous", "Auto-hébergeable", "Sans engagement"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M2 7l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* INTEGRATIONS BAR */}
        <section className="py-10 px-6 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-[0.15em] mb-6">Compatible avec</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {INTEGRATIONS.map((name) => (
                <span key={name} className="text-sm text-zinc-500 font-medium hover:text-zinc-300 transition-colors">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section id="fonctions" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Fonctionnalités</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Tout ce dont tu as besoin</h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                Un assistant IA qui gère emails, agenda, WhatsApp et automatisations — conçu pour les freelances et PME français.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  className={`rounded-2xl border p-7 flex flex-col gap-5 hover:-translate-y-1 transition-all duration-300 ${
                    cap.color === "cyan"
                      ? "border-cyan-500/20 bg-cyan-500/[0.02] hover:border-cyan-500/40"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-violet-500/30"
                  }`}
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                    cap.color === "cyan"
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                      : "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                  }`}>{cap.badge}</span>
                  <div className={`p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit ${cap.color === "cyan" ? "text-cyan-400" : "text-violet-400"}`}>
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={cap.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">{cap.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{cap.desc}</p>
                  </div>
                  <ul className="space-y-2">
                    {cap.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                        <svg className={`${cap.color === "cyan" ? "text-cyan-400" : "text-violet-400"} shrink-0`} width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* CHANNELS */}
        <section className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-cyan-400 uppercase tracking-[0.15em] mb-4 block">Multi-canaux</span>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Parle-lui comme tu veux</h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                WhatsApp, email, chat web ou Slack — ton assistant répond sur le canal de ton choix, 24h/24.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              {CHANNELS.map((ch) => (
                <div
                  key={ch.label}
                  className={`relative rounded-2xl border p-6 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-300 ${
                    ch.color === "cyan"
                      ? "border-cyan-500/30 bg-cyan-500/[0.04] hover:border-cyan-500/50"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-violet-500/30"
                  }`}
                >
                  {ch.badge && (
                    <span className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                      ch.color === "cyan"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    }`}>{ch.badge}</span>
                  )}
                  <div className={`p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit ${ch.color === "cyan" ? "text-cyan-400" : "text-violet-400"}`}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={ch.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{ch.label}</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">{ch.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5 flex items-start gap-4">
              <svg className="text-cyan-400 shrink-0 mt-0.5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-zinc-400">
                <span className="text-cyan-300 font-medium">WhatsApp Business</span> est le canal que Lindy n&apos;a pas.
                Lindy propose iMessage (iOS US uniquement) et SMS. Trigr propose WhatsApp — utilisé par 85 % des Français.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="comment" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Simple</span>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Opérationnel en 2 minutes</h2>
              <p className="text-zinc-400 text-lg">Pas de code, pas de setup technique. Connecte, parle, automatise.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((s) => (
                <div key={s.n} className="glass rounded-2xl p-7">
                  <div className="flex items-start justify-between mb-5">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                      </svg>
                    </div>
                    <span className="text-5xl font-bold text-white/[0.04]">{s.n}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="tarifs" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Tarifs</span>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">5× moins cher que Lindy</h2>
              <p className="text-zinc-400 text-lg">
                Lindy commence à 50&nbsp;$/mois. Trigr commence à 9&nbsp;€. Vos données restent chez vous.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 flex flex-col gap-4 ${
                    plan.highlight
                      ? "border border-violet-500/50 bg-violet-500/[0.06] shadow-[0_0_40px_rgba(139,92,246,0.12)]"
                      : "glass"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold text-violet-900 bg-violet-400 px-3 py-1 rounded-full whitespace-nowrap">{plan.badge}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-zinc-400 text-sm font-medium mb-1">{plan.name}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-zinc-500 text-sm mb-0.5">{plan.period}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                        <svg className="text-violet-400 shrink-0 mt-0.5" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.price === "0€" ? "/assistant" : "/pricing"}
                    className={`text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
                      plan.highlight
                        ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]"
                        : "bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-zinc-600 mt-6">
              Computer Use en bêta · Self-hosted disponible (Hetzner CAX11 à 4&nbsp;€/mois) · Annulable à tout moment
            </p>
          </div>
        </section>

        {/* TRIGR VS LINDY */}
        <section className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Comparaison</span>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Trigr vs Lindy</h2>
            </div>
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="grid grid-cols-3 bg-white/[0.02] border-b border-white/[0.06]">
                <div className="p-4" />
                <div className="p-4 text-center">
                  <span className="text-sm font-bold text-white">Trigr</span>
                  <span className="ml-2 text-xs text-violet-400">🇫🇷</span>
                </div>
                <div className="p-4 text-center border-l border-white/[0.06]">
                  <span className="text-sm font-medium text-zinc-400">Lindy</span>
                  <span className="ml-2 text-xs text-zinc-600">🇺🇸</span>
                </div>
              </div>
              {COMPARE_ROWS.map(([feature, trigr, lindy], i) => (
                <div key={feature} className={`grid grid-cols-3 ${i < COMPARE_ROWS.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <div className="p-4 text-sm text-zinc-500">{feature}</div>
                  <div className="p-4 text-sm text-center text-white font-medium">{trigr}</div>
                  <div className="p-4 text-sm text-center text-zinc-500 border-l border-white/[0.04]">{lindy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass rounded-3xl p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-cyan-500/5 pointer-events-none" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative">
                Prêt à déléguer à ton IA ?
              </h2>
              <p className="text-zinc-400 mb-8 relative">7 jours gratuits, sans carte bancaire. Annulable en 1 clic.</p>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] text-base relative"
              >
                Démarrer gratuitement
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
