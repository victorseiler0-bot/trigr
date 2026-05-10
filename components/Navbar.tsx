"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const PUBLIC_NAV = [
  ["/#fonctions", "Fonctionnalités"],
  ["/#comment", "Comment ça marche"],
  ["/marketplace", "Marketplace"],
  ["/pricing", "Tarifs"],
];

const APP_NAV = [
  ["/assistant", "Assistant"],
  ["/integrations", "Intégrations"],
  ["/marketplace", "Marketplace"],
  ["/settings", "Paramètres"],
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks = isSignedIn ? APP_NAV : PUBLIC_NAV;

  return (
    <header className={cn(
      "fixed top-0 inset-x-0 z-50 transition-all duration-300",
      scrolled ? "bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
    )}>
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href={isSignedIn ? "/assistant" : "/"} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.5)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">Trig<span className="text-violet-400">r</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">{label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          {isSignedIn ? (
            <>
              <span className="text-xs text-zinc-500 truncate max-w-[120px]">{user?.primaryEmailAddress?.emailAddress}</span>
              <Link href="/settings" className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/[0.04]" title="Paramètres">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <SignOutButton>
                <button className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.04]">
                  Déconnexion
                </button>
              </SignOutButton>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.04]">
                Se connecter
              </Link>
              <Link href="/signup" className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
                Essai gratuit
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-zinc-400 hover:text-white p-2" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open
              ? <path d="M5 5l14 14M19 5l-14 14" strokeLinecap="round"/>
              : <><path d="M3 7h18" strokeLinecap="round"/><path d="M3 12h18" strokeLinecap="round"/><path d="M3 17h18" strokeLinecap="round"/></>
            }
          </svg>
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex flex-col gap-3">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href} className="text-sm text-zinc-300 py-1" onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <div className="flex gap-3 mt-2">
            {isSignedIn ? (
              <SignOutButton>
                <button className="flex-1 text-center text-sm text-zinc-300 border border-white/[0.08] py-2.5 rounded-xl" onClick={() => setOpen(false)}>
                  Déconnexion
                </button>
              </SignOutButton>
            ) : (
              <>
                <Link href="/login" className="flex-1 text-center text-sm text-zinc-300 border border-white/[0.08] py-2.5 rounded-xl" onClick={() => setOpen(false)}>
                  Se connecter
                </Link>
                <Link href="/signup" className="flex-1 text-center bg-violet-600 text-white text-sm font-semibold py-2.5 rounded-xl" onClick={() => setOpen(false)}>
                  Essai gratuit
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
