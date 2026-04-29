"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignUp, useClerk } from "@clerk/nextjs";

export default function SignupPage() {
  const { signUp, fetchStatus } = useSignUp();
  const clerk = useClerk();
  const loading = fetchStatus === "fetching";

  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signUpWithGoogle() {
    setBusy(true);
    setError("");
    try {
      await clerk.client.signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/assistant",
      });
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erreur Google");
      setBusy(false);
    }
  }

  async function sendCode() {
    if (!signUp || !email) return;
    setBusy(true);
    setError("");
    try {
      const { error: createErr } = await signUp.create({ emailAddress: email });
      if (createErr) throw new Error(createErr.message);
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) throw new Error(sendErr.message);
      setStep("otp");
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erreur inscription");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!signUp || !code) return;
    setBusy(true);
    setError("");
    try {
      const { error: verifyErr } = await signUp.verifications.verifyEmailCode({ code });
      if (verifyErr) throw new Error(verifyErr.message);
      await signUp.finalize();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Code invalide");
      setBusy(false);
    }
  }

  const isBusy = busy || loading;

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/[0.07] rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.5)]">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-white text-xl tracking-tight">Trig<span className="text-violet-400">r</span></span>
          </Link>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-violet-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Essai gratuit · Aucune carte requise
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-white mb-1">Créer un compte</h1>
            <p className="text-sm text-zinc-500">Ton assistant IA en 30 secondes</p>
          </div>

          <button
            onClick={signUpWithGoogle}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-900 font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-sm disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            {isBusy && step === "idle" ? "Connexion…" : "Continuer avec Google"}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-zinc-600">ou par email</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {step !== "otp" ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Adresse e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  placeholder="vous@exemple.fr"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                />
                <p className="text-xs text-zinc-600 mt-1.5">N'importe quelle adresse email fonctionne (Gmail, Outlook, Yahoo…)</p>
              </div>
              <button
                onClick={sendCode}
                disabled={!email || isBusy}
                className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)] disabled:opacity-40"
              >
                {isBusy ? "Envoi du code…" : "Créer mon compte →"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Code envoyé à <span className="text-zinc-300">{email}</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all text-center tracking-[0.3em] font-mono text-base"
                />
              </div>
              <button
                onClick={verifyCode}
                disabled={code.length < 6 || isBusy}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-40"
              >
                {isBusy ? "Vérification…" : "Valider le code →"}
              </button>
              <button onClick={() => { setStep("idle"); setCode(""); setError(""); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center">
                ← Utiliser un autre email
              </button>
            </div>
          )}

          {step === "idle" && (
            <div className="mt-5 pt-5 border-t border-white/[0.06]">
              <p className="text-xs text-zinc-500 mb-3 text-center">Inclus dans l'essai gratuit</p>
              <div className="grid grid-cols-2 gap-2">
                {["Assistant IA", "Gmail & Agenda", "Marketplace", "CRM léger"].map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-emerald-400 shrink-0">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-red-400 text-center">{error}</p>}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-5">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Se connecter →</Link>
        </p>
        <p className="text-center text-xs text-zinc-700 mt-2">
          En créant un compte, vous acceptez nos{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-zinc-500">CGU</Link>{" "}
          et notre{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-500">Politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  );
}
