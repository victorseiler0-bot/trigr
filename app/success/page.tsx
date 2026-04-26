"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const params = useSearchParams();
  const product = params.get("product") ?? "ton automatisation";
  const phone = "33600000000";

  const whatsappMsg = encodeURIComponent(
    `Bonjour, je viens d'acheter "${product}" sur Trigr. Pouvez-vous me livrer le fichier ?`
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md w-full text-center">
        {/* Icône succès */}
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" fill="none" stroke="#22c55e" strokeWidth="2.5">
            <path d="M6 18l9 9L30 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Paiement réussi !</h1>
        <p className="text-zinc-400 mb-2">
          Merci pour ton achat de <span className="text-violet-300 font-medium">{product}</span>.
        </p>
        <p className="text-zinc-500 text-sm mb-8">
          Contacte-nous sur WhatsApp pour recevoir ton fichier workflow et ton guide d&apos;installation.
        </p>

        {/* WhatsApp CTA */}
        <a
          href={`https://wa.me/${phone}?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(37,211,102,0.3)] hover:shadow-[0_0_40px_rgba(37,211,102,0.5)] text-base w-full justify-center mb-4"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.12 1.528 5.85L.057 23.292a.75.75 0 00.921.921l5.442-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.21-3.678.994.994-3.678-.21-.355A9.693 9.693 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
          </svg>
          Recevoir mon workflow sur WhatsApp
        </a>

        <p className="text-zinc-600 text-xs mb-8">
          Livraison en moins de 2h · Support inclus 30 jours
        </p>

        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm transition-colors">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
