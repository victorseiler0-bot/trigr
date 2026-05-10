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
      scrolled ? "bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm" : "bg-white/60 backdrop-blur-md"
    )}>
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={isSignedIn ? "/assistant" : "/"} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-[0_2px_8px_rgba(124,58,237,0.35)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">Trig<span className="text-violet-600">r</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href}
              className="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all font-medium">
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isSignedIn ? (
            <>
              <span className="text-xs text-slate-400 truncate max-w-[120px]">{user?.primaryEmailAddress?.emailAddress}</span>
              <SignOutButton>
                <button className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100">
                  Déconnexion
                </button>
              </SignOutButton>
            </>
          ) : (
            <>
              <Link href="/login"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium">
                Se connecter
              </Link>
              <Link href="/signup"
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_16px_rgba(124,58,237,0.4)]">
                Essai gratuit
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open
              ? <path d="M5 5l14 14M19 5l-14 14" strokeLinecap="round"/>
              : <><path d="M3 7h18" strokeLinecap="round"/><path d="M3 12h18" strokeLinecap="round"/><path d="M3 17h18" strokeLinecap="round"/></>
            }
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-2 shadow-lg">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href}
              className="text-sm text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-100 font-medium"
              onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
            {isSignedIn ? (
              <SignOutButton>
                <button className="flex-1 text-center text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl" onClick={() => setOpen(false)}>
                  Déconnexion
                </button>
              </SignOutButton>
            ) : (
              <>
                <Link href="/login" className="flex-1 text-center text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl" onClick={() => setOpen(false)}>
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
