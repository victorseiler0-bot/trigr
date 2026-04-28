import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Conditions Générales d'Utilisation — Trigr",
  description: "Conditions générales d'utilisation du service Trigr. Droits, obligations, abonnements et limitations de responsabilité.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#09090b] pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-4 inline-block">← Retour à l&apos;accueil</Link>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Conditions Générales d&apos;Utilisation</h1>
            <p className="text-zinc-500 text-sm">Dernière mise à jour : 28 avril 2026 · Version 1.0</p>
          </div>

          <div className="space-y-10 text-zinc-300 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. Présentation du service</h2>
              <p className="mb-2">Trigr est un service d&apos;assistant IA personnel pour freelances et PME, permettant d&apos;automatiser la gestion des emails, agendas, relances clients et autres tâches bureautiques via des workflows n8n.</p>
              <p>Éditeur : Victor Seiler — victorseiler0@gmail.com</p>
              <p className="mt-2">L&apos;accès au service se fait via le site web <strong className="text-white">trigr-eight.vercel.app</strong> ainsi que via les interfaces WhatsApp Business, email et chat web configurées par l&apos;utilisateur.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. Acceptation des CGU</h2>
              <p>En créant un compte, en utilisant le service ou en cliquant sur &quot;Accepter&quot;, vous acceptez sans réserve les présentes Conditions Générales d&apos;Utilisation ainsi que notre <Link href="/privacy" className="text-violet-400 hover:text-violet-300">Politique de confidentialité</Link>.</p>
              <p className="mt-2">Si vous n&apos;acceptez pas ces conditions, n&apos;utilisez pas le service.</p>
              <p className="mt-2">Ces CGU s&apos;appliquent à toute personne physique ou morale utilisant Trigr (ci-après &quot;l&apos;Utilisateur&quot;).</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Création de compte</h2>
              <ul className="space-y-2">
                <li>Vous devez avoir au moins 18 ans pour créer un compte.</li>
                <li>Vous vous engagez à fournir des informations exactes, complètes et à les maintenir à jour.</li>
                <li>Vous êtes responsable de la confidentialité de vos identifiants de connexion.</li>
                <li>Vous devez nous informer immédiatement de toute utilisation non autorisée de votre compte à <a href="mailto:victorseiler0@gmail.com" className="text-violet-400 hover:text-violet-300">victorseiler0@gmail.com</a>.</li>
                <li>Un compte est personnel et ne peut pas être partagé, sauf dans le cadre d&apos;un plan Équipe.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Plans et abonnements</h2>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Plan</th>
                      <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Prix</th>
                      <th className="text-left py-2 text-zinc-400 font-medium">Facturation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {[
                      ["Gratuit (essai)", "0 €", "7 jours, sans carte"],
                      ["Solo", "9 € HT", "Mensuel ou annuel"],
                      ["Pro", "19 € HT", "Mensuel ou annuel"],
                      ["Équipe", "49 € HT", "Mensuel ou annuel"],
                    ].map(([plan, prix, facturation]) => (
                      <tr key={plan}>
                        <td className="py-2.5 pr-4 text-zinc-300">{plan}</td>
                        <td className="py-2.5 pr-4 text-white font-medium">{prix}</td>
                        <td className="py-2.5 text-zinc-400">{facturation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2">
                <li>Les abonnements sont tacitement reconduits à chaque échéance, sauf résiliation avant la date de renouvellement.</li>
                <li>Les prix sont indiqués hors taxes. La TVA applicable est celle en vigueur à la date de facturation.</li>
                <li>Les paiements sont traités par <strong className="text-white">Stripe</strong>. En cas d&apos;échec de paiement, le compte est suspendu après une période de grâce de 7 jours.</li>
                <li>Aucun remboursement n&apos;est accordé pour les périodes entamées, sauf disposition légale contraire.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. Droit de rétractation</h2>
              <p>Conformément à l&apos;article L221-18 du Code de la consommation, vous disposez d&apos;un délai de <strong className="text-white">14 jours</strong> à compter de la souscription pour exercer votre droit de rétractation, sans avoir à justifier de motif.</p>
              <p className="mt-2">Pour exercer ce droit, contactez-nous à <a href="mailto:victorseiler0@gmail.com" className="text-violet-400 hover:text-violet-300">victorseiler0@gmail.com</a> avec l&apos;objet &quot;Rétractation&quot;.</p>
              <p className="mt-2">Le remboursement sera effectué dans les 14 jours suivant la réception de votre demande, par le même moyen de paiement que celui utilisé lors de la souscription.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. Utilisation du service</h2>
              <p className="mb-3">Vous vous engagez à utiliser Trigr conformément aux lois en vigueur et aux présentes CGU. Sont notamment interdits :</p>
              <ul className="space-y-2">
                {[
                  "Utiliser le service à des fins illégales, frauduleuses ou nuisibles",
                  "Envoyer du spam, des contenus malveillants ou non sollicités via les automatisations",
                  "Tenter de contourner les mesures de sécurité du service",
                  "Revendre, louer ou sous-licencier l'accès au service sans autorisation",
                  "Automatiser des actions en violation des CGU des services tiers (Gmail, WhatsApp, etc.)",
                  "Collecter des données d'autres utilisateurs sans leur consentement",
                  "Usurper l'identité d'une autre personne ou entité",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-red-400 shrink-0 mt-0.5">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3">Tout manquement peut entraîner la suspension ou la résiliation immédiate du compte, sans préavis ni remboursement.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. Propriété intellectuelle</h2>
              <p className="mb-2">Le service Trigr, incluant son code source, son design, ses marques et ses contenus, est la propriété exclusive de Victor Seiler et est protégé par les lois françaises et internationales sur la propriété intellectuelle.</p>
              <p className="mb-2">Les workflows n8n publiés dans la marketplace Trigr restent la propriété de leurs auteurs respectifs. En les publiant sur Trigr, les auteurs accordent une licence d&apos;utilisation non exclusive à Trigr et à ses utilisateurs.</p>
              <p>Vos contenus (messages, données) restent votre propriété. En utilisant le service, vous accordez à Trigr une licence limitée pour les traiter afin de vous fournir le service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. Disponibilité et garanties</h2>
              <p className="mb-2">Trigr s&apos;efforce de maintenir une disponibilité du service de <strong className="text-white">99,5 %</strong> par mois, hors maintenances planifiées. Les maintenances sont communiquées avec un préavis minimum de 48 heures.</p>
              <p className="mb-2">Le service est fourni &quot;tel quel&quot;. Trigr ne garantit pas que le service sera exempt d&apos;erreurs, ininterrompu, ou adapté à un usage particulier.</p>
              <p>L&apos;intelligence artificielle peut produire des résultats inexacts. Vous restez responsable de vérifier les actions effectuées par l&apos;assistant avant de les envoyer ou de les exécuter.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">9. Limitation de responsabilité</h2>
              <p className="mb-2">Dans les limites autorisées par la loi applicable, la responsabilité totale de Trigr ne saurait excéder les sommes versées par l&apos;Utilisateur au cours des 3 derniers mois précédant l&apos;événement générateur.</p>
              <p>Trigr ne saurait être tenu responsable des dommages indirects, pertes de données, pertes de revenus ou de profits résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">10. Résiliation</h2>
              <p className="mb-2"><strong className="text-zinc-200">Par l&apos;Utilisateur :</strong> Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte ou en contactant victorseiler0@gmail.com. L&apos;accès reste actif jusqu&apos;à la fin de la période en cours.</p>
              <p className="mb-2"><strong className="text-zinc-200">Par Trigr :</strong> Nous pouvons suspendre ou résilier votre compte en cas de violation des présentes CGU, d&apos;impayé persistant, ou de cessation d&apos;activité du service, avec un préavis de 30 jours sauf en cas de faute grave.</p>
              <p>À la résiliation, vos données sont conservées 30 jours puis supprimées définitivement, sauf obligation légale de conservation.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">11. Modifications des CGU</h2>
              <p>Nous nous réservons le droit de modifier les présentes CGU à tout moment. En cas de modification substantielle, vous serez informé par email au moins <strong className="text-white">30 jours avant</strong> l&apos;entrée en vigueur des nouvelles conditions. La poursuite de l&apos;utilisation du service vaut acceptation des nouvelles CGU.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">12. Loi applicable et juridiction</h2>
              <p>Les présentes CGU sont régies par le <strong className="text-white">droit français</strong>. En cas de litige, et à défaut de résolution amiable, les tribunaux compétents sont ceux du ressort de la Cour d&apos;appel de Grenoble.</p>
              <p className="mt-2">Pour les consommateurs résidant dans l&apos;Union européenne, vous pouvez également recourir à la plateforme de résolution en ligne des litiges de la Commission européenne : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">ec.europa.eu/consumers/odr</a></p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
              <div className="glass rounded-xl p-4 text-zinc-400">
                <p>Email : <a href="mailto:victorseiler0@gmail.com" className="text-violet-400 hover:text-violet-300">victorseiler0@gmail.com</a></p>
                <p>Objet recommandé : [CGU] sujet de votre demande</p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
