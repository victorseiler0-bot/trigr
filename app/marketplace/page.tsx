"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Plan = "gratuit" | "pro" | "business";
type Category = "Tous" | "Email" | "Agenda" | "WhatsApp" | "CRM" | "Productivité";

interface Template {
  id: string;
  name: string;
  desc: string;
  category: Category;
  plan: Plan;
  icon: string;
  accentColor: string;
  n8nId?: string;
  checkoutId?: string;
  price?: number;
  activations: number;
}

const TEMPLATES: Template[] = [
  {
    id: "digest",
    name: "Digest Quotidien",
    desc: "Résumé de tes emails non lus + agenda du jour envoyé à 8h chaque matin.",
    category: "Email",
    plan: "gratuit",
    icon: "☀️",
    accentColor: "violet",
    n8nId: "KKO3oNHkzQ29Z3uK",
    activations: 142,
  },
  {
    id: "triage",
    name: "Triage Emails Urgents",
    desc: "Scan de ta boîte toutes les 30 min — alerte immédiate si email urgent détecté.",
    category: "Email",
    plan: "gratuit",
    icon: "🚨",
    accentColor: "violet",
    n8nId: "Z7DzjY1hhgNGOHK1",
    activations: 98,
  },
  {
    id: "relance",
    name: "Relance Prospect Auto",
    desc: "Relance automatiquement tout prospect sans réponse après 48h avec un message personnalisé.",
    category: "Email",
    plan: "pro",
    icon: "📤",
    accentColor: "violet",
    checkoutId: "relance",
    price: 39,
    activations: 67,
  },
  {
    id: "devis",
    name: "Devis en 1 Clic",
    desc: "Génère et envoie un devis professionnel depuis un template en quelques secondes.",
    category: "Email",
    plan: "pro",
    icon: "📋",
    accentColor: "violet",
    checkoutId: "devis",
    price: 59,
    activations: 45,
  },
  {
    id: "rdv",
    name: "Rappel RDV Automatique",
    desc: "Envoie un email + SMS de rappel 24h avant chaque réunion Google Calendar.",
    category: "Agenda",
    plan: "pro",
    icon: "⏰",
    accentColor: "cyan",
    checkoutId: "rdv",
    price: 29,
    activations: 89,
  },
  {
    id: "rapport",
    name: "Rapport Hebdo Business",
    desc: "Synthèse hebdomadaire de tes KPIs, emails et réunions envoyée chaque lundi à 7h.",
    category: "Productivité",
    plan: "gratuit",
    icon: "📊",
    accentColor: "amber",
    n8nId: "Pq2hwYZ8u4eZzi2m",
    activations: 201,
  },
  {
    id: "whatsapp",
    name: "Assistant WhatsApp",
    desc: "Répond à tes clients sur WhatsApp Business 24h/24 avec un agent IA en français.",
    category: "WhatsApp",
    plan: "pro",
    icon: "💬",
    accentColor: "emerald",
    n8nId: "uutTZeNSP1AenBU3",
    price: 39,
    activations: 34,
  },
  {
    id: "leads",
    name: "Leads vers CRM",
    desc: "Capture et qualifie automatiquement les leads entrants dans Google Sheets.",
    category: "CRM",
    plan: "pro",
    icon: "🎯",
    accentColor: "pink",
    checkoutId: "leads",
    price: 29,
    activations: 78,
  },
  {
    id: "panier",
    name: "Panier Abandonné",
    desc: "Relance les acheteurs Shopify ayant abandonné leur panier avec un email personnalisé.",
    category: "CRM",
    plan: "business",
    icon: "🛒",
    accentColor: "orange",
    checkoutId: "panier",
    price: 49,
    activations: 22,
  },
  {
    id: "email-pa",
    name: "Assistant Email Complet",
    desc: "Agent IA avancé : triage, résumé, rédaction de réponses et suivi de relances chaque matin.",
    category: "Email",
    plan: "business",
    icon: "🤖",
    accentColor: "violet",
    n8nId: "3pghE3msK5OyZXCq",
    price: 99,
    activations: 19,
  },
  {
    id: "sync-sheets",
    name: "Sync Contacts Gmail → Sheets",
    desc: "Synchronise automatiquement tes contacts Gmail vers un Google Sheet CRM chaque jour.",
    category: "CRM",
    plan: "pro",
    icon: "🔄",
    accentColor: "emerald",
    price: 29,
    activations: 56,
  },
  {
    id: "standup",
    name: "Standup IA Quotidien",
    desc: "Prépare ton standup du matin en analysant tes tâches Notion ou Trello + emails.",
    category: "Productivité",
    plan: "pro",
    icon: "⚡",
    accentColor: "amber",
    price: 39,
    activations: 43,
  },
];

const CATEGORIES: Category[] = ["Tous", "Email", "Agenda", "WhatsApp", "CRM", "Productivité"];

const planConfig = {
  gratuit: { label: "Gratuit", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  pro: { label: "Pro", bg: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  business: { label: "Business", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const accentBorder: Record<string, string> = {
  violet: "hover:border-violet-500/40",
  cyan: "hover:border-cyan-500/40",
  emerald: "hover:border-emerald-500/40",
  amber: "hover:border-amber-500/40",
  pink: "hover:border-pink-500/40",
  orange: "hover:border-orange-500/40",
};

export default function MarketplacePage() {
  const [category, setCategory] = useState<Category>("Tous");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = category === "Tous" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  async function handleActivate(t: Template) {
    if (t.plan === "gratuit") {
      window.location.href = "/assistant";
      return;
    }
    if (!t.checkoutId) {
      window.location.href = "/signup";
      return;
    }
    setLoading(t.id);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: t.checkoutId, withInstall: false }),
      });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Erreur lors de la redirection vers le paiement.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 max-w-5xl mx-auto text-center relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-violet-600/[0.05] rounded-full blur-[100px]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-violet-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {TEMPLATES.length} automatisations disponibles
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Marketplace <span className="text-violet-400">Trigr</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Automatisations prêtes à l'emploi pour freelancers et PMEs. Active en 1 clic, fonctionne immédiatement.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-10">
            {[
              { value: TEMPLATES.length + "+", label: "Templates" },
              { value: TEMPLATES.reduce((a, t) => a + t.activations, 0).toString(), label: "Activations" },
              { value: "5", label: "Catégories" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-16 z-30 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.04] px-6 py-3">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 text-sm px-4 py-1.5 rounded-full border transition-all ${
                category === cat
                  ? "bg-violet-600 border-violet-500 text-white font-medium"
                  : "border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-4 transition-all duration-200 ${accentBorder[t.accentColor]}`}
            >
              {/* Icon + badges */}
              <div className="flex items-start justify-between">
                <div className="text-3xl">{t.icon}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${planConfig[t.plan].bg}`}>
                    {planConfig[t.plan].label}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-xs text-zinc-500 mb-1">{t.category}</div>
                <h3 className="font-semibold text-white mb-2">{t.name}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{t.desc}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <span className="text-xs text-zinc-600">{t.activations} activations</span>
                <button
                  onClick={() => handleActivate(t)}
                  disabled={loading === t.id}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-xl transition-all disabled:opacity-50 ${
                    t.plan === "gratuit"
                      ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20"
                      : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]"
                  }`}
                >
                  {loading === t.id
                    ? "…"
                    : t.plan === "gratuit"
                    ? "Activer →"
                    : `${t.price}€ — Activer`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="mt-16 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Tu veux un workflow sur mesure ?</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Décris ton besoin et on te construit une automatisation personnalisée.
          </p>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            Parler à l'assistant IA
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
