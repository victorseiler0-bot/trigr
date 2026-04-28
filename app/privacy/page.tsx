import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Politique de confidentialité — Trigr",
  description: "Comment Trigr collecte, utilise et protège vos données personnelles. Conformément au RGPD.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#09090b] pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-4 inline-block">← Retour à l&apos;accueil</Link>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Politique de confidentialité</h1>
            <p className="text-zinc-500 text-sm">Dernière mise à jour : 28 avril 2026</p>
          </div>

          <div className="prose-custom space-y-10 text-zinc-300 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. Responsable du traitement</h2>
              <p>Le responsable du traitement des données collectées via le service Trigr est :</p>
              <div className="mt-3 glass rounded-xl p-4 text-zinc-400">
                <p><strong className="text-zinc-200">Victor Seiler</strong></p>
                <p>Email : victorseiler0@gmail.com</p>
                <p>Site : trigr-eight.vercel.app</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. Données collectées</h2>
              <p className="mb-3">Nous collectons les catégories de données suivantes :</p>
              <div className="space-y-3">
                {[
                  {
                    title: "Données de compte",
                    desc: "Nom, adresse email, mot de passe (hashé), date de création du compte. Collectées lors de l'inscription ou via OAuth Google."
                  },
                  {
                    title: "Données d'utilisation",
                    desc: "Messages envoyés à l'assistant IA, historique des conversations, préférences de l'assistant, workflows activés."
                  },
                  {
                    title: "Données de connexion OAuth",
                    desc: "Jetons d'accès OAuth pour Gmail, Google Calendar, Slack, WhatsApp Business. Ces jetons sont chiffrés et jamais partagés avec des tiers."
                  },
                  {
                    title: "Données techniques",
                    desc: "Adresse IP, type de navigateur, système d'exploitation, pages visitées, durée de session. Collectées via des cookies analytiques (avec votre consentement)."
                  },
                  {
                    title: "Données de facturation",
                    desc: "En cas d'abonnement payant, la facturation est gérée par Stripe. Trigr ne stocke jamais vos données bancaires directement."
                  },
                ].map((item) => (
                  <div key={item.title} className="border-l-2 border-violet-500/30 pl-4">
                    <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">{item.title}</p>
                    <p className="text-zinc-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Finalités du traitement</h2>
              <p className="mb-3">Vos données sont utilisées pour :</p>
              <ul className="space-y-2">
                {[
                  "Créer et gérer votre compte utilisateur",
                  "Fournir le service d'assistant IA (traitement des messages, automatisations)",
                  "Connecter vos outils tiers (Gmail, Google Calendar, WhatsApp, Slack)",
                  "Améliorer la qualité du service et personnaliser votre expérience",
                  "Envoyer des communications relatives au compte (notifications, factures)",
                  "Respecter nos obligations légales et contractuelles",
                  "Détecter et prévenir les fraudes et abus",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="text-violet-400 shrink-0 mt-0.5" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Base légale</h2>
              <p>Nous traitons vos données sur les bases légales suivantes (conformément à l&apos;article 6 du RGPD) :</p>
              <ul className="mt-3 space-y-2">
                <li><strong className="text-zinc-200">Exécution du contrat</strong> — traitement nécessaire pour vous fournir le service Trigr.</li>
                <li><strong className="text-zinc-200">Consentement</strong> — pour les cookies analytiques et les communications marketing (révocable à tout moment).</li>
                <li><strong className="text-zinc-200">Intérêt légitime</strong> — sécurité, prévention des fraudes, amélioration du service.</li>
                <li><strong className="text-zinc-200">Obligation légale</strong> — conservation des données comptables et fiscales.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. Durée de conservation</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 pr-6 text-zinc-400 font-medium">Type de données</th>
                      <th className="text-left py-2 text-zinc-400 font-medium">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      ["Données de compte", "Durée du contrat + 3 ans après résiliation"],
                      ["Historique conversations", "12 mois glissants (ou suppression manuelle)"],
                      ["Données de facturation", "10 ans (obligation légale comptable)"],
                      ["Logs techniques", "90 jours"],
                      ["Cookies analytiques", "13 mois maximum (CNIL)"],
                    ].map(([type, duree]) => (
                      <tr key={type}>
                        <td className="py-2.5 pr-6 text-zinc-300">{type}</td>
                        <td className="py-2.5 text-zinc-400">{duree}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. Sous-traitants et transferts</h2>
              <p className="mb-3">Trigr fait appel aux sous-traitants suivants pour fournir le service :</p>
              <div className="space-y-2">
                {[
                  { name: "Anthropic", role: "Modèles IA (Claude)", lieu: "États-Unis", garantie: "Clauses contractuelles types UE" },
                  { name: "Groq", role: "Modèles IA (Llama)", lieu: "États-Unis", garantie: "Clauses contractuelles types UE" },
                  { name: "Vercel", role: "Hébergement frontend", lieu: "États-Unis / UE", garantie: "DPA disponible" },
                  { name: "Stripe", role: "Paiement en ligne", lieu: "États-Unis / UE", garantie: "PCI DSS Level 1" },
                  { name: "Google", role: "OAuth, APIs (Gmail, Calendar)", lieu: "UE (si configuré)", garantie: "RGPD compliant" },
                ].map((st) => (
                  <div key={st.name} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-white font-medium w-24 shrink-0">{st.name}</span>
                    <span className="text-zinc-400 flex-1">{st.role}</span>
                    <span className="text-zinc-600 text-xs">{st.lieu} · {st.garantie}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-zinc-500 text-xs">Vos données ne sont jamais vendues à des tiers et ne sont pas utilisées pour entraîner des modèles d&apos;IA sans votre consentement explicite.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. Vos droits (RGPD)</h2>
              <p className="mb-3">Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { droit: "Droit d'accès (art. 15)", desc: "Obtenir une copie de vos données personnelles." },
                  { droit: "Droit de rectification (art. 16)", desc: "Corriger des données inexactes ou incomplètes." },
                  { droit: "Droit à l'effacement (art. 17)", desc: "Demander la suppression de vos données." },
                  { droit: "Droit à la portabilité (art. 20)", desc: "Recevoir vos données dans un format lisible." },
                  { droit: "Droit d'opposition (art. 21)", desc: "S'opposer à certains traitements (ex : marketing)." },
                  { droit: "Droit de limitation (art. 18)", desc: "Suspendre temporairement un traitement." },
                ].map((r) => (
                  <div key={r.droit} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <p className="text-violet-300 text-xs font-medium mb-1">{r.droit}</p>
                    <p className="text-zinc-400 text-xs">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4">Pour exercer ces droits, contactez-nous à <a href="mailto:victorseiler0@gmail.com" className="text-violet-400 hover:text-violet-300">victorseiler0@gmail.com</a>. Réponse sous 30 jours.</p>
              <p className="mt-2">Vous pouvez également introduire une réclamation auprès de la <strong className="text-zinc-200">CNIL</strong> (Commission Nationale de l&apos;Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">www.cnil.fr</a></p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. Cookies</h2>
              <p className="mb-3">Trigr utilise trois catégories de cookies :</p>
              <div className="space-y-3">
                {[
                  {
                    type: "Cookies essentiels",
                    couleur: "green",
                    desc: "Nécessaires au fonctionnement du service (session, authentification). Ne peuvent pas être refusés.",
                    exemples: "trigr_session, trigr_auth"
                  },
                  {
                    type: "Cookies analytiques",
                    couleur: "yellow",
                    desc: "Mesure d'audience anonymisée pour améliorer le service. Requièrent votre consentement.",
                    exemples: "Vercel Analytics (anonymisé)"
                  },
                  {
                    type: "Cookies de préférences",
                    couleur: "blue",
                    desc: "Mémorisent vos préférences (thème, langue, consentement cookies). Supprimés à la fin de session ou après 13 mois.",
                    exemples: "trigr_cookie_consent"
                  },
                ].map((c) => (
                  <div key={c.type} className="border-l-2 border-violet-500/30 pl-4">
                    <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">{c.type}</p>
                    <p className="text-zinc-400 mb-1">{c.desc}</p>
                    <p className="text-zinc-600 text-xs">Exemples : {c.exemples}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-zinc-500">Vous pouvez modifier vos préférences via la bannière cookie ou en vidant le localStorage de votre navigateur.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">9. Sécurité</h2>
              <p>Nous mettons en œuvre les mesures techniques et organisationnelles suivantes :</p>
              <ul className="mt-3 space-y-2">
                {[
                  "Chiffrement TLS/HTTPS pour toutes les communications",
                  "Mots de passe hashés avec bcrypt",
                  "Jetons OAuth chiffrés au repos",
                  "Accès aux données restreint au personnel autorisé",
                  "Journalisation et monitoring des accès",
                  "Option self-hosted pour conserver vos données sur votre propre serveur",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="text-cyan-400 shrink-0 mt-0.5" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">10. Modifications</h2>
              <p>Nous pouvons mettre à jour cette politique à tout moment. En cas de modification substantielle, vous serez informé par email ou par une notification dans l&apos;application au moins 30 jours avant l&apos;entrée en vigueur des changements.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
              <p>Pour toute question relative à cette politique ou à vos données personnelles :</p>
              <div className="mt-3 glass rounded-xl p-4 text-zinc-400">
                <p>Email : <a href="mailto:victorseiler0@gmail.com" className="text-violet-400 hover:text-violet-300">victorseiler0@gmail.com</a></p>
                <p>Objet du mail : [RGPD] Demande exercice de droits</p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
