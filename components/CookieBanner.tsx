"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("trigr_cookie_consent")) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("trigr_cookie_consent", "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem("trigr_cookie_consent", "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4">
      <div className="max-w-4xl mx-auto glass rounded-2xl border border-white/[0.10] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-[0_-4px_40px_rgba(0,0,0,0.4)]">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Nous utilisons des cookies pour améliorer votre expérience et analyser le trafic.{" "}
            <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
              Politique de confidentialité
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
              CGU
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={reject}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.05]"
          >
            Refuser
          </button>
          <button
            onClick={accept}
            className="text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-all shadow-[0_0_16px_rgba(139,92,246,0.4)]"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
