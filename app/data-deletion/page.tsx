import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Suppression des données — Trigr",
  description: "Comment supprimer vos données personnelles de Trigr.",
};

export default function DataDeletionPage({ searchParams }: { searchParams: { code?: string } }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#09090b] pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-4 inline-block">← Retour à l&apos;accueil</Link>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Suppression des données</h1>
            <p className="text-zinc-500 text-sm">Conformément au RGPD et aux politiques Meta</p>
          </div>

          {searchParams.code && (
            <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-green-400 text-sm font-medium">✓ Demande de suppression reçue</p>
              <p className="text-zinc-400 text-xs mt-1">Code de confirmation : <code className="text-zinc-300">{searchParams.code}</code></p>
            </div>
          )}

          <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Supprimer votre compte Trigr</h2>
              <p className="mb-4">Pour supprimer toutes vos données personnelles de Trigr :</p>
              <ol className="space-y-3 list-decimal list-inside text-zinc-400">
                <li>Connectez-vous à votre compte sur <a href="https://trigr-eight.vercel.app" className="text-blue-400 hover:text-blue-300">trigr-eight.vercel.app</a></li>
                <li>Allez dans <strong className="text-zinc-200">Paramètres → Compte</strong></li>
                <li>Cliquez sur <strong className="text-zinc-200">Supprimer mon compte</strong></li>
                <li>Confirmez la suppression</li>
              </ol>
              <p className="mt-4 text-zinc-500">Toutes vos données (conversations, intégrations, préférences) seront supprimées définitivement dans les 30 jours.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Données collectées via Facebook / Meta</h2>
              <p className="mb-3">Si vous avez utilisé Trigr via une intégration Meta (WhatsApp Business), les données suivantes peuvent avoir été collectées :</p>
              <ul className="space-y-2 text-zinc-400">
                <li>• Numéro de téléphone WhatsApp</li>
                <li>• Contenu des messages échangés avec l&apos;assistant IA</li>
                <li>• Nom du profil WhatsApp</li>
              </ul>
              <p className="mt-4">Pour demander la suppression de ces données, envoyez un email à <a href="mailto:victorseiler0@gmail.com" className="text-blue-400 hover:text-blue-300">victorseiler0@gmail.com</a> avec l&apos;objet <strong className="text-zinc-200">[SUPPRESSION] Données WhatsApp</strong>.</p>
              <p className="mt-2 text-zinc-500">Réponse et suppression sous 30 jours.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <p>Email : <a href="mailto:victorseiler0@gmail.com" className="text-blue-400 hover:text-blue-300">victorseiler0@gmail.com</a></p>
                <p className="mt-1 text-zinc-500 text-xs">Objet : [RGPD] Demande suppression de données</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
