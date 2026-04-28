import Link from "next/link";

const SOCIAL = [
  {
    label: "X / Twitter",
    href: "https://x.com",
    icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span className="font-bold text-white text-sm">Trig<span className="text-violet-400">r</span></span>
            </Link>
            <p className="text-zinc-600 text-xs max-w-[180px] leading-relaxed">L&apos;assistant IA pour indépendants et PME. RGPD-friendly, auto-hébergeable.</p>
            <div className="flex items-center gap-3">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all"
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Produit */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-medium mb-3">Produit</p>
            <nav className="flex flex-col gap-2">
              {[
                ["/#fonctions", "Fonctionnalités"],
                ["/#tarifs", "Tarifs"],
                ["/assistant", "Assistant IA"],
                ["/#comment", "Comment ça marche"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">{label}</Link>
              ))}
            </nav>
          </div>

          {/* Entreprise */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-medium mb-3">Entreprise</p>
            <nav className="flex flex-col gap-2">
              {[
                ["mailto:victorseiler0@gmail.com", "Contact"],
                ["/signup", "Créer un compte"],
                ["/login", "Se connecter"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">{label}</Link>
              ))}
            </nav>
          </div>

          {/* Légal */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-medium mb-3">Légal</p>
            <nav className="flex flex-col gap-2">
              {[
                ["/privacy", "Politique de confidentialité"],
                ["/terms", "Conditions d'utilisation"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">{label}</Link>
              ))}
            </nav>
            {/* Compliance badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {["RGPD", "CNIL"].map((badge) => (
                <span key={badge} className="text-xs text-zinc-600 border border-white/[0.06] rounded px-2 py-0.5">{badge}</span>
              ))}
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.04]">
          <p className="text-zinc-700 text-xs">© 2026 Trigr — Fait en France 🇫🇷</p>
          <p className="text-zinc-700 text-xs">Données hébergées chez vous · Conforme RGPD</p>
        </div>
      </div>
    </footer>
  );
}
