import Link from "next/link";
export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="font-bold text-white text-sm">Trig<span className="text-violet-400">r</span></span>
        </div>
        <p className="text-zinc-600 text-xs">Automatisations n8n pour petites entreprises</p>
        <p className="text-zinc-600 text-xs">© 2026 Trigr</p>
      </div>
    </footer>
  );
}