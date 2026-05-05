"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: "0€",
    period: "",
    description: "Pour tester Trigr",
    features: [
      "2 intégrations",
      "10 actions par jour",
      "Assistant IA",
      "1 utilisateur",
    ],
    cta: "Commencer gratuitement",
    highlight: false,
  },
  {
    id: "solo",
    name: "Solo",
    price: "9€",
    period: "/mois",
    description: "Pour les indépendants",
    features: [
      "3 intégrations",
      "50 actions par jour",
      "Assistant IA",
      "WhatsApp, Gmail, Outlook",
      "Apple iCloud",
      "1 utilisateur",
    ],
    cta: "Choisir Solo",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "19€",
    period: "/mois",
    description: "Pour les professionnels",
    features: [
      "Toutes les intégrations",
      "Actions illimitées",
      "Assistant IA prioritaire",
      "WhatsApp, Gmail, Outlook",
      "Apple iCloud, Notion",
      "Support prioritaire",
      "1 utilisateur",
    ],
    cta: "Choisir Pro",
    highlight: true,
    badge: "Le plus populaire",
  },
  {
    id: "equipe",
    name: "Équipe",
    price: "49€",
    period: "/mois",
    description: "Pour les petites équipes",
    features: [
      "Toutes les intégrations",
      "Actions illimitées",
      "5 utilisateurs",
      "Tableau de bord équipe",
      "Workflows partagés",
      "Support dédié",
    ],
    cta: "Choisir Équipe",
    highlight: false,
  },
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function selectPlan(planId: string) {
    if (planId === "free") {
      router.push(isSignedIn ? "/assistant" : "/signup");
      return;
    }
    if (!isSignedIn) {
      router.push(`/signup?redirect=/pricing`);
      return;
    }
    setBusy(planId);
    try {
      const r = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch { /* ignore */ } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-28 pb-20">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Un prix simple,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              sans surprise
            </span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            5× moins cher que Lindy, hébergeable chez vous, RGPD-friendly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.highlight
                  ? "border-violet-500/50 bg-violet-500/[0.06] shadow-[0_0_30px_rgba(139,92,246,0.1)]"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-violet-600 text-white whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-zinc-300 mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-zinc-500">{plan.period}</span>}
                </div>
                <p className="text-xs text-zinc-600 mt-1">{plan.description}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 shrink-0 mt-0.5">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => selectPlan(plan.id)}
                disabled={!!busy}
                className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]"
                }`}
              >
                {busy === plan.id ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Redirection…
                  </>
                ) : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-10">
          Paiement sécurisé par Stripe · Annulation à tout moment · Facture disponible
        </p>
      </main>
      <Footer />
    </div>
  );
}
