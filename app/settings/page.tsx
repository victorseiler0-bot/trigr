"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PROVIDERS: { strategy: "oauth_google" | "oauth_microsoft"; label: string; icon: React.ReactNode }[] = [
  {
    strategy: "oauth_google",
    label: "Google",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    strategy: "oauth_microsoft",
    label: "Microsoft",
    icon: (
      <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  async function connect(strategy: "oauth_google" | "oauth_microsoft") {
    setBusy(strategy);
    setError("");
    try {
      const additionalScopes = strategy === "oauth_microsoft"
        ? [
            "https://graph.microsoft.com/Mail.ReadWrite",
            "https://graph.microsoft.com/Mail.Send",
            "https://graph.microsoft.com/Calendars.ReadWrite",
            "https://graph.microsoft.com/Chat.Read",
            "offline_access",
          ]
        : undefined;
      await user!.createExternalAccount({
        strategy,
        redirectUrl: `${window.location.origin}/settings/sso-callback`,
        ...(additionalScopes ? { additionalScopes } : {}),
      });
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erreur connexion");
      setBusy(null);
    }
  }

  async function disconnect(id: string) {
    if (user!.externalAccounts.length <= 1 && !user!.passwordEnabled) {
      setError("Tu ne peux pas supprimer ton seul moyen de connexion.");
      return;
    }
    setBusy(id);
    setError("");
    try {
      const account = user!.externalAccounts.find((a) => a.id === id);
      await account?.destroy();
      await user!.reload();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erreur déconnexion");
    } finally {
      setBusy(null);
    }
  }

  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 pt-28 pb-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez votre profil et vos comptes connectés</p>
        </div>

        {/* Profile card */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mb-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-5">Profil</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-lg shrink-0">
              {initials || "?"}
            </div>
            <div>
              <p className="font-semibold text-white">{displayName}</p>
              <p className="text-sm text-zinc-500">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </section>

        {/* Connected accounts */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Comptes connectés</h2>
          <p className="text-xs text-zinc-600 mb-5">
            Connectez vos comptes pour permettre à Trigr d'accéder à vos emails, agenda et outils.
          </p>

          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const linked = user.externalAccounts.find((a) => a.provider === p.strategy.replace("oauth_", ""));
              const isLinked = !!linked;
              const isBusy = busy === p.strategy || busy === linked?.id;

              return (
                <div
                  key={p.strategy}
                  className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    {p.icon}
                    <div>
                      <p className="text-sm font-medium text-white">{p.label}</p>
                      {isLinked && linked?.emailAddress && (
                        <p className="text-xs text-zinc-500 mt-0.5">{linked.emailAddress}</p>
                      )}
                    </div>
                  </div>

                  {isLinked ? (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Connecté
                      </span>
                      <button
                        onClick={() => linked && disconnect(linked.id)}
                        disabled={!!busy}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {isBusy ? "…" : "Retirer"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => connect(p.strategy)}
                      disabled={!!busy}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-all"
                    >
                      {isBusy ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                      )}
                      Connecter
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
