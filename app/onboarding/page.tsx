"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const STEPS = [
  {
    id: "welcome",
    title: "Bienvenue sur Trigr 👋",
    desc: "Ton assistant IA personnel en français. En 3 étapes, il sera prêt à gérer tes emails, agenda et messages.",
    cta: "Commencer",
    skip: false,
  },
  {
    id: "connect",
    title: "Connecte tes apps",
    desc: "Trigr a besoin d'accès à tes outils pour agir à ta place. Gmail et Google Calendar sont les plus populaires.",
    cta: "Connecter mes apps",
    skip: true,
    skipLabel: "Je ferai ça plus tard",
  },
  {
    id: "try",
    title: "Essaie l'assistant",
    desc: "Pose une première question à ton assistant. Par exemple : \"Quel est mon agenda demain ?\" ou \"Montre-moi mes emails non lus\".",
    cta: "Parler à l'assistant",
    skip: false,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [step, setStep] = useState(0);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const firstName = user?.firstName ?? "toi";

  if (!isLoaded || !isSignedIn) {
    return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>;
  }

  function next() {
    if (step === 1) {
      router.push("/settings");
    } else if (isLast) {
      router.push("/assistant");
    } else {
      setStep(s => s + 1);
    }
  }

  function skip() {
    setStep(s => s + 1);
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-white text-lg tracking-tight">Trig<span className="text-violet-400">r</span></span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`rounded-full transition-all ${
            i === step ? "w-6 h-2 bg-violet-500" :
            i < step ? "w-2 h-2 bg-violet-500/50" : "w-2 h-2 bg-zinc-700"
          }`} />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 text-center">
        {step === 0 && (
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
            <svg width="32" height="32" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {step === 1 && (
          <div className="flex justify-center gap-3 mb-6">
            {["G", "M", "W"].map((l, i) => (
              <div key={l} className={`w-12 h-12 rounded-xl border flex items-center justify-center text-sm font-bold ${
                i === 0 ? "border-violet-500/30 bg-violet-500/10 text-violet-300" :
                i === 1 ? "border-blue-500/30 bg-blue-500/10 text-blue-300" :
                "border-green-500/30 bg-green-500/10 text-green-300"
              }`}>{l}</div>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3 mb-6 text-left">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-xs text-zinc-300">Quel est mon agenda demain ?</p>
            </div>
            <div className="mt-3 pl-8">
              <p className="text-xs text-zinc-500 italic">Voici ton agenda de demain, {firstName} :<br />→ 9h00 — Appel client Martin<br />→ 14h30 — Réunion équipe</p>
            </div>
          </div>
        )}

        <h1 className="text-xl font-bold text-white mb-3">
          {step === 0 ? `Bonjour ${firstName} !` : current.title}
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">{current.desc}</p>

        <button
          onClick={next}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] mb-3"
        >
          {current.cta}
          {!isLast && step !== 1 && <span className="ml-2">→</span>}
        </button>

        {current.skip && (
          <button onClick={skip} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            {current.skipLabel}
          </button>
        )}
      </div>

      <Link href="/assistant" className="mt-6 text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
        Aller directement à l&apos;assistant →
      </Link>
    </div>
  );
}
