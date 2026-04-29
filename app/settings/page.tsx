"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

type WaStatus = "unknown" | "disconnected" | "connecting" | "qr" | "connected";

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // WhatsApp state
  const [waStatus, setWaStatus] = useState<WaStatus>("unknown");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waName, setWaName] = useState<string | null>(null);
  const [waConnecting, setWaConnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  // Poll WhatsApp bridge status
  useEffect(() => {
    if (!isSignedIn) return;

    async function pollStatus() {
      try {
        const res = await fetch("/api/wa?action=status");
        if (!res.ok) { setWaStatus("disconnected"); return; }
        const data = await res.json();
        setWaStatus(data.status ?? "disconnected");
        setWaPhone(data.phone ?? null);
        setWaName(data.name ?? null);

        if (data.status === "qr") {
          const qrRes = await fetch("/api/wa?action=qr");
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            setWaQr(qrData.qr ?? null);
          }
        } else {
          setWaQr(null);
        }
      } catch {
        setWaStatus("disconnected");
      }
    }

    pollStatus();
    pollRef.current = setInterval(pollStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isSignedIn]);

  async function waDisconnect() {
    setWaConnecting(true);
    await fetch("/api/wa", { method: "DELETE" }).catch(() => {});
    setWaConnecting(false);
    setWaStatus("disconnected");
    setWaPhone(null);
    setWaName(null);
  }

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
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 pt-28 pb-16 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez votre profil et vos comptes connectés</p>
        </div>

        {/* Profile */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
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

        {/* Google + Microsoft */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Email & Agenda</h2>
          <p className="text-xs text-zinc-600 mb-5">
            Connectez Google ou Microsoft pour accéder à vos emails et calendrier.
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

        {/* WhatsApp */}
        <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.543 4.067 1.492 5.782L.057 23.249a.75.75 0 0 0 .917.932l5.578-1.461A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.659-.523-5.166-1.432l-.371-.222-3.852 1.009 1.026-3.744-.242-.386A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">WhatsApp Personnel</h2>
          </div>
          <p className="text-xs text-zinc-600 mb-5">
            Connecte ton compte WhatsApp pour que Trigr lise tes messages, contacts et conversations.
          </p>

          {/* Connected */}
          {waStatus === "connected" && (
            <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.543 4.067 1.492 5.782L.057 23.249a.75.75 0 0 0 .917.932l5.578-1.461A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.659-.523-5.166-1.432l-.371-.222-3.852 1.009 1.026-3.744-.242-.386A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{waName ?? "WhatsApp"}</p>
                  {waPhone && <p className="text-xs text-zinc-500 mt-0.5">+{waPhone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Connecté
                </span>
                <button
                  onClick={waDisconnect}
                  disabled={waConnecting}
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  Déconnecter
                </button>
              </div>
            </div>
          )}

          {/* QR Code display */}
          {(waStatus === "qr" || waStatus === "connecting") && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-sm font-medium text-white mb-1">
                {waStatus === "connecting" ? "Connexion en cours…" : "Scanne le QR code"}
              </p>
              <p className="text-xs text-zinc-500 mb-4">
                Ouvre WhatsApp sur ton téléphone → Appareils liés → Lier un appareil
              </p>
              {waQr ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={waQr} alt="QR Code WhatsApp" className="w-52 h-52 rounded-xl bg-white p-2" />
                </div>
              ) : (
                <div className="flex justify-center items-center w-52 h-52 mx-auto rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
                </div>
              )}
              <p className="text-xs text-zinc-600 text-center mt-3">Le QR expire en 60 s — il se rafraîchit automatiquement</p>
            </div>
          )}

          {/* Disconnected / unknown */}
          {(waStatus === "disconnected" || waStatus === "unknown") && (
            <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#52525b">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.543 4.067 1.492 5.782L.057 23.249a.75.75 0 0 0 .917.932l5.578-1.461A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.893 0-3.659-.523-5.166-1.432l-.371-.222-3.852 1.009 1.026-3.744-.242-.386A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">WhatsApp</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {waStatus === "unknown" ? "Démarrage du bridge…" : "Non connecté"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {waStatus === "unknown" ? (
                  <p className="text-xs text-zinc-600">Lance le bridge d'abord</p>
                ) : (
                  <p className="text-xs text-zinc-500">En attente du bridge local</p>
                )}
              </div>
            </div>
          )}

          {/* Instructions bridge */}
          {waStatus !== "connected" && (
            <div className="mt-4 bg-zinc-900 border border-white/[0.06] rounded-xl p-4">
              <p className="text-xs font-semibold text-zinc-400 mb-2">Pour activer WhatsApp — lance le bridge une fois :</p>
              <div className="space-y-1.5 font-mono text-xs text-zinc-500">
                <p><span className="text-violet-400">cd</span> C:\Users\victo\AppData\Local\Temp\trigr\whatsapp-bridge</p>
                <p><span className="text-violet-400">npm</span> install</p>
                <p><span className="text-violet-400">pm2</span> start server.js --name whatsapp-bridge</p>
              </div>
              <p className="text-xs text-zinc-600 mt-3">Puis reviens ici — le QR code apparaît automatiquement.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
