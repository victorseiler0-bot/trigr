"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const APPS = [
  { id: "google",    label: "Gmail + Agenda",      icon: "G", color: "from-red-500 to-orange-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-300",    desc: "Emails, calendrier Google" },
  { id: "whatsapp",  label: "WhatsApp",             icon: "W", color: "from-green-500 to-emerald-400", bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-300",  desc: "Messages pro et perso" },
  { id: "microsoft", label: "Outlook + Teams",      icon: "M", color: "from-blue-500 to-cyan-400",     bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-300",   desc: "Email Microsoft, calendrier" },
  { id: "notion",    label: "Notion",               icon: "N", color: "from-zinc-400 to-zinc-300",     bg: "bg-zinc-500/10",   border: "border-zinc-500/30",   text: "text-zinc-300",   desc: "Notes, base de données" },
  { id: "slack",     label: "Slack",                icon: "S", color: "from-blue-500 to-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", desc: "Communication équipe" },
  { id: "instagram", label: "Instagram DMs",        icon: "I", color: "from-pink-500 to-rose-400",     bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-300",   desc: "Messages Instagram" },
  { id: "apple",     label: "iCloud (Apple)",       icon: "A", color: "from-zinc-300 to-zinc-200",     bg: "bg-zinc-400/10",   border: "border-zinc-400/30",   text: "text-zinc-200",   desc: "Calendrier + Contacts" },
  { id: "imap",      label: "Email pro (IMAP)",     icon: "E", color: "from-amber-500 to-yellow-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-300",  desc: "Entreprise, ESME, etc." },
];

const EXAMPLE_PROMPTS: Record<string, string> = {
  google:    "Montre-moi mes emails non lus",
  whatsapp:  "Quels sont mes derniers messages WhatsApp ?",
  microsoft: "Mon agenda Outlook pour demain",
  notion:    "Cherche la page 'Budget Q2' dans Notion",
  slack:     "Résume les messages du canal #général",
  instagram: "Mes conversations Instagram non lues",
  apple:     "Crée un événement Apple demain à 14h",
  imap:      "Lis mes 5 derniers emails pro",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(["google"]));

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  const firstName = user?.firstName ?? "toi";

  if (!isLoaded || !isSignedIn) {
    return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>;
  }

  function toggleApp(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  const firstSelected = APPS.find(a => selected.has(a.id));
  const examplePrompt = firstSelected ? EXAMPLE_PROMPTS[firstSelected.id] : "Quel est mon agenda demain ?";

  const STEPS = [
    { id: "welcome", label: "Bienvenue" },
    { id: "connect", label: "Tes apps" },
    { id: "try",     label: "Essai" },
  ];

  function next() {
    if (step === 1) {
      // Build query string with selected apps to prefill settings
      const params = Array.from(selected).join(",");
      router.push(`/settings?setup=${params}`);
    } else if (step === 2) {
      router.push("/assistant");
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-white text-lg tracking-tight">Auto<span className="text-blue-400">zen</span></span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "w-6 h-6 bg-blue-500 text-white" :
                i === step ? "w-6 h-6 bg-blue-600 text-white ring-2 ring-blue-500/30" :
                "w-6 h-6 bg-zinc-800 text-zinc-600"
              }`}>{i < step ? "✓" : i + 1}</div>
              <span className={`text-xs transition-colors ${i === step ? "text-zinc-300" : "text-zinc-600"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-blue-500/50" : "bg-zinc-800"}`} />}
          </div>
        ))}
      </div>

      {/* Step 0 — Welcome */}
      {step === 0 && (
        <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Bonjour {firstName} !</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Orbe est ton assistant IA personnel en français. En 2 minutes, il sera prêt à gérer tes emails, agenda et messages à ta place.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: "⚡", label: "2 min", sub: "pour démarrer" },
              { icon: "🔒", label: "RGPD", sub: "données chez toi" },
              { icon: "🇫🇷", label: "100%", sub: "en français" },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] rounded-2xl p-3 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-sm font-bold text-white">{s.label}</div>
                <div className="text-xs text-zinc-500">{s.sub}</div>
              </div>
            ))}
          </div>
          <button onClick={next} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            Commencer <span className="ml-1">→</span>
          </button>
        </div>
      )}

      {/* Step 1 — App selection */}
      {step === 1 && (
        <div className="w-full max-w-lg">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 mb-4">
            <h1 className="text-xl font-bold text-white mb-1 text-center">Quelles apps utilises-tu ?</h1>
            <p className="text-xs text-zinc-500 text-center mb-5">Sélectionne les outils que tu veux connecter (tu pourras en ajouter plus tard)</p>
            <div className="grid grid-cols-2 gap-2.5">
              {APPS.map(app => {
                const isOn = selected.has(app.id);
                return (
                  <button
                    key={app.id}
                    onClick={() => toggleApp(app.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isOn
                        ? `${app.bg} ${app.border} shadow-sm`
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${app.bg} ${app.border} border flex items-center justify-center text-sm font-bold ${app.text} shrink-0`}>
                      {app.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">{app.label}</div>
                      <div className="text-xs text-zinc-600">{app.desc}</div>
                    </div>
                    {isOn && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5"><path d="M1 4l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-4 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Retour
            </button>
            <button
              onClick={next}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
            >
              Connecter {selected.size > 1 ? `mes ${selected.size} apps` : `${APPS.find(a => selected.has(a.id))?.label ?? "l'app"}`} →
            </button>
          </div>
          <p className="text-center text-xs text-zinc-700 mt-3">
            <button onClick={() => router.push("/assistant")} className="hover:text-zinc-500 transition-colors">
              Passer cette étape
            </button>
          </p>
        </div>
      )}

      {/* Step 2 — Try it */}
      {step === 2 && (
        <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-3xl">
            🚀
          </div>
          <h1 className="text-xl font-bold text-white mb-2">C&apos;est prêt !</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Ton assistant attend tes instructions. Essaie en lui disant :
          </p>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 mb-6 text-left">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-zinc-200 italic">&ldquo;{examplePrompt}&rdquo;</p>
            </div>
          </div>
          <button
            onClick={next}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            Parler à l&apos;assistant ✨
          </button>
        </div>
      )}

      <Link href="/assistant" className="mt-5 text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
        Aller directement à l&apos;assistant →
      </Link>
    </div>
  );
}
