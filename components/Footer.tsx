import Link from "next/link";

const SOCIAL = [
  { label: "X / Twitter", href: "https://x.com", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { label: "LinkedIn", href: "https://linkedin.com", icon: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span className="font-bold text-slate-900 text-sm">Trig<span className="text-violet-600">r</span></span>
            </Link>
            <p className="text-slate-500 text-xs max-w-[180px] leading-relaxed">L&apos;assistant IA pour indépendants et PME. RGPD-friendly, auto-hébergeable.</p>
            <div className="flex items-center gap-2">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon}/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-[0.12em] font-semibold mb-3">Produit</p>
            <nav className="flex flex-col gap-2">
              {[["/#fonctions","Fonctionnalités"],["/#tarifs","Tarifs"],["/assistant","Assistant IA"],["/integrations","Intégrations"]].map(([href,label]) => (
                <Link key={href} href={href} className="text-xs text-slate-500 hover:text-slate-800 transition-colors">{label}</Link>
              ))}
            </nav>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-[0.12em] font-semibold mb-3">Entreprise</p>
            <nav className="flex flex-col gap-2">
              {[["mailto:victorseiler0@gmail.com","Contact"],["/signup","Créer un compte"],["/login","Se connecter"]].map(([href,label]) => (
                <Link key={href} href={href} className="text-xs text-slate-500 hover:text-slate-800 transition-colors">{label}</Link>
              ))}
            </nav>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-[0.12em] font-semibold mb-3">Légal</p>
            <nav className="flex flex-col gap-2">
              {[["/privacy","Confidentialité"],["/terms","CGU"]].map(([href,label]) => (
                <Link key={href} href={href} className="text-xs text-slate-500 hover:text-slate-800 transition-colors">{label}</Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-wrap gap-2">
              {["RGPD","CNIL"].map(b => (
                <span key={b} className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-0.5 bg-slate-50">{b}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
          <p className="text-slate-400 text-xs">© 2026 Trigr — Fait en France 🇫🇷</p>
          <p className="text-slate-400 text-xs">Données hébergées chez vous · Conforme RGPD</p>
        </div>
      </div>
    </footer>
  );
}
