import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-zinc-800/30 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-700/30 border border-zinc-600/30 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" fill="none" stroke="#71717a" strokeWidth="2">
            <path d="M6 6l16 16M22 6L6 22" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Paiement annulé</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Ton paiement a été annulé. Aucun montant n&apos;a été débité.
        </p>
        <Link
          href="/#automations"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Retour aux automatisations
        </Link>
      </div>
    </div>
  );
}
