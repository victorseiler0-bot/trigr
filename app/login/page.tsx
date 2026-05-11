"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn, useClerk } from "@clerk/nextjs";

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const loading = fetchStatus === "fetching";

  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    setBusy(true); setError("");
    try {
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/assistant",
      });
    } catch (e: unknown) { setError((e as Error)?.message ?? "Erreur Google"); setBusy(false); }
  }

  async function signInWithMicrosoft() {
    setBusy(true); setError("");
    try {
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: "oauth_microsoft",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/assistant",
      });
    } catch (e: unknown) { setError((e as Error)?.message ?? "Erreur Microsoft"); setBusy(false); }
  }

  async function sendCode() {
    if (!signIn || !email) return;
    setBusy(true); setError("");
    try {
      await signIn.create({ identifier: email });
      const { error: err } = await signIn.emailCode.sendCode();
      if (err) throw new Error(err.message);
      setStep("otp");
    } catch (e: unknown) { setError((e as Error)?.message ?? "Erreur envoi code"); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    if (!signIn || !code) return;
    setBusy(true); setError("");
    try {
      const { error: err } = await signIn.emailCode.verifyCode({ code });
      if (err) throw new Error(err.message);
      await signIn.finalize();
    } catch (e: unknown) { setError((e as Error)?.message ?? "Code invalide"); setBusy(false); }
  }

  const isBusy = busy || loading;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_4px_16px_rgba(139,92,246,0.35)]">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-xl tracking-tight">Trig<span className="text-violet-600">r</span></span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Se connecter</h1>
            <p className="text-sm text-slate-500">Bienvenue sur Trigr</p>
          </div>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 font-semibold text-sm px-4 py-3 rounded-xl transition-all shadow-sm disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            {isBusy && step === "idle" ? "Connexion…" : "Continuer avec Google"}
          </button>

          {/* Microsoft */}
          <button
            onClick={signInWithMicrosoft}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-all mt-3 disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Continuer avec Microsoft
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">ou par email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {step !== "otp" ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Adresse e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  placeholder="vous@exemple.fr"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
              </div>
              <button
                onClick={sendCode}
                disabled={!email || isBusy}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-all disabled:opacity-40"
              >
                {isBusy ? "Envoi du code…" : "Continuer par email →"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Code envoyé à <span className="text-slate-800 font-semibold">{email}</span>
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all text-center tracking-[0.3em] font-mono text-base"
                />
              </div>
              <button
                onClick={verifyCode}
                disabled={code.length < 6 || isBusy}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-all disabled:opacity-40"
              >
                {isBusy ? "Vérification…" : "Valider le code →"}
              </button>
              <button onClick={() => { setStep("idle"); setCode(""); setError(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors text-center">
                ← Utiliser un autre email
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-red-500 text-center">{error}</p>}
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-violet-600 hover:text-violet-700 font-medium transition-colors">S'inscrire gratuitement →</Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          En continuant, vous acceptez nos{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-600">CGU</Link>{" "}
          et notre{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-600">Politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  );
}
