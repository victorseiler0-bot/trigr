"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <header className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-300",
      scrolled ? "bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent")}> 
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.5)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">Trig<span className="text-violet-400">r</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[["#automations","Automatisations"],["#comment","Comment ça marche"],["#tarifs","Tarifs"]].map(([h,l]) => (
            <Link key={h} href={h} className="text-sm text-zinc-400 hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        <Link href="#automations" className="hidden md:inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
          Voir les automatisations
        </Link>
        <button className="md:hidden text-zinc-400 hover:text-white p-2" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? <path d="M5 5l14 14M19 5l-14 14" strokeLinecap="round"/> : <><path d="M3 7h18" strokeLinecap="round"/><path d="M3 12h18" strokeLinecap="round"/><path d="M3 17h18" strokeLinecap="round"/></>}
          </svg>
        </button>
      </nav>
      {open && (
        <div className="md:hidden bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex flex-col gap-3">
          {[["#automations","Automatisations"],["#comment","Comment ça marche"],["#tarifs","Tarifs"]].map(([h,l]) => (
            <Link key={h} href={h} className="text-sm text-zinc-300 py-1" onClick={() => setOpen(false)}>{l}</Link>
          ))}
          <Link href="#automations" className="mt-2 text-center bg-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl" onClick={() => setOpen(false)}>
            Voir les automatisations
          </Link>
        </div>
      )}
    </header>
  );
}