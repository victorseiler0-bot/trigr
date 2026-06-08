"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const WORKFLOWS = [
  {
    id: "relance-impaye",
    icon: "💸",
    name: "Relance client impayé",
    desc: "Envoie automatiquement un WhatsApp de relance à un client dont la facture est en retard. Personnalisé avec le nom, le montant et la référence.",
    tags: ["WhatsApp", "Finance", "Automatique"],
    color: "from-red-500/10 to-orange-500/10",
    border: "border-red-200",
    trigger: "Webhook (déclenché depuis l'assistant)",
    steps: ["Reçoit les infos de la facture", "Compose un message poli et personnalisé", "Envoie via WhatsApp Business"],
    webhookPath: "relance-impaye",
  },
  {
    id: "nouveau-prospect",
    icon: "🎯",
    name: "Nouveau prospect automatique",
    desc: "Quand un prospect remplit un formulaire, Orbe génère un email de bienvenue personnalisé par IA et l'enregistre dans votre CRM.",
    tags: ["Email IA", "CRM", "Automatique"],
    color: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-200",
    trigger: "Webhook (formulaire web)",
    steps: ["Reçoit les données du formulaire", "Génère un email de bienvenue par IA", "Enregistre dans le CRM"],
    webhookPath: "nouveau-prospect",
  },
  {
    id: "rapport-hebdo",
    icon: "📊",
    name: "Rapport hebdomadaire",
    desc: "Chaque lundi à 8h, génère automatiquement un brief de la semaine : actions prioritaires, emails importants, agenda de la semaine.",
    tags: ["Cron", "Brief", "Automatique"],
    color: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-200",
    trigger: "Cron — chaque lundi à 8h00",
    steps: ["Se déclenche chaque lundi matin", "Appelle l'API Orbe", "Génère le rapport de la semaine"],
    webhookPath: null,
  },
  {
    id: "wa-ia",
    icon: "🤖",
    name: "Réponse IA WhatsApp",
    desc: "Répond automatiquement aux messages WhatsApp entrants avec une IA qui se comporte comme votre assistant personnel. Répond en votre nom.",
    tags: ["WhatsApp", "IA", "Temps réel"],
    color: "from-green-500/10 to-emerald-500/10",
    border: "border-green-200",
    trigger: "Webhook WhatsApp entrant",
    steps: ["Reçoit le message WA entrant", "Filtre les messages texte", "Génère et envoie une réponse IA"],
    webhookPath: "wa-entrant-ai",
  },
  {
    id: "devis-auto",
    icon: "📋",
    name: "Devis → Rappel auto",
    desc: "Après avoir généré un devis dans l'assistant, ce workflow crée automatiquement un rappel de suivi dans 3 jours et archive le devis.",
    tags: ["Devis", "Rappels", "CRM"],
    color: "from-blue-500/10 to-indigo-500/10",
    border: "border-blue-200",
    trigger: "Déclenché par l'assistant",
    steps: ["Devis généré dans l'assistant", "Crée un rappel de suivi J+3", "Archive dans le CRM"],
    webhookPath: null,
    comingSoon: true,
  },
  {
    id: "sync-agenda",
    icon: "📅",
    name: "Sync agenda → WhatsApp",
    desc: "La veille de chaque réunion, envoie automatiquement un rappel WhatsApp au participant avec l'ordre du jour et le lien visio.",
    tags: ["Agenda", "WhatsApp", "Cron"],
    color: "from-amber-500/10 to-yellow-500/10",
    border: "border-amber-200",
    trigger: "Cron — chaque soir à 20h",
    steps: ["Analyse l'agenda du lendemain", "Identifie les réunions avec participants", "Envoie les rappels WA"],
    webhookPath: null,
    comingSoon: true,
  },
];

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 pt-28 pb-20 w-full">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Propulsé par n8n
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Workflows automatiques
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Des automatisations prêtes à l&apos;emploi pour les indépendants et PME françaises.
            Actives en 1 clic, personnalisables à l&apos;infini.
          </p>
        </div>

        {/* Grille workflows */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {WORKFLOWS.map(wf => (
            <div key={wf.id} className={`relative bg-gradient-to-br ${wf.color} border ${wf.border} rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md transition-all ${wf.comingSoon ? "opacity-70" : ""}`}>
              {wf.comingSoon && (
                <div className="absolute top-4 right-4 text-xs font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-full">Bientôt</div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-3xl">{wf.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{wf.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {wf.tags.map(t => (
                      <span key={t} className="text-[10px] font-semibold bg-white/60 border border-white/80 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{wf.desc}</p>
              <div className="bg-white/50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Étapes</p>
                {wf.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-2 border-t border-white/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">{wf.trigger}</span>
                {!wf.comingSoon && (
                  <Link href="/settings?tab=workflows" className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                    Activer →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Créer ton propre workflow</h2>
          <p className="text-blue-100 mb-6 max-w-md mx-auto">
            Tu peux créer des automatisations personnalisées directement depuis l&apos;assistant en langage naturel.
            &ldquo;Crée-moi une automatisation qui...&rdquo;
          </p>
          <Link href="/assistant"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg">
            Aller dans l&apos;assistant →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
