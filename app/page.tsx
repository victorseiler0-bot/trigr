import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import BuyButton from "@/components/BuyButton";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>

        {/* HERO */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/[0.07] rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)", backgroundSize: "60px 60px" }}
            />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-violet-300 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Workflows n8n prêts à installer · Livraison instantanée
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
              Automatise ton{" "}
              <span className="gradient-text">business</span>
              <br />en 10 minutes.
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Des workflows n8n pour les petites entreprises. Relance clients, devis automatiques, rapports — sans coder, sans abonnement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="#automations" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] text-base">
                Voir les automatisations
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link href="#comment" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-white/[0.08] hover:border-white/20 transition-all text-base">
                Comment ça marche
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              {["Fichier + guide installation", "Paiement unique", "Support 30 jours inclus"].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M2 7l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* AUTOMATIONS */}
        <section id="automations" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Catalogue</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">6 automatisations prêtes</h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">Chaque workflow est testé, documenté et livré avec un guide pas-à-pas.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

              <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col gap-4 hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300">
                <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">Populaire</span>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-violet-400 shrink-0">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Prospection</span>
                    <h3 className="text-white font-semibold text-base mt-0.5">Relance prospect auto</h3>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">Un prospect ne répond plus ? L&apos;automatisation détecte l&apos;inactivité et envoie une relance personnalisée. Récupère jusqu&apos;à 30% de prospects perdus.</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div><span className="text-2xl font-bold text-white">39€</span><span className="text-zinc-500 text-xs ml-1">une fois</span></div>
                  <button className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all">Obtenir →</button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col gap-4 hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300">
                <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Bestseller</span>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-cyan-400 shrink-0">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Devis</span>
                    <h3 className="text-white font-semibold text-base mt-0.5">Devis en 1 clic</h3>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">Client remplit le formulaire → devis PDF généré et envoyé en 30 secondes. Fini les devis manuels qui traînent des jours.</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div><span className="text-2xl font-bold text-white">59€</span><span className="text-zinc-500 text-xs ml-1">une fois</span></div>
                  <button className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all">Obtenir →</button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col gap-4 hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-violet-400 shrink-0">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Reporting</span>
                    <h3 className="text-white font-semibold text-base mt-0.5">Rapport hebdo business</h3>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">Chaque lundi matin, reçois un résumé de tes ventes, leads et KPIs de la semaine. Connecté à Google Sheets ou Airtable.</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div><span className="text-2xl font-bold text-white">39€</span><span className="text-zinc-500 text-xs ml-1">une fois</span></div>
                  <button className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all">Obtenir →</button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col gap-4 hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300">
                <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Shopify</span>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-cyan-400 shrink-0">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">E-commerce</span>
                    <h3 className="text-white font-semibold text-base mt-0.5">Panier abandonné Shopify</h3>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">Client part sans payer → relance email 1h après + rappel SMS le lendemain. Récupère en moyenne 15% des paniers perdus.</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div><span className="text-2xl font-bold text-white">49€</span><span className="text-zinc-500 text-xs ml-1">une fois</span></div>
                  <button className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all">Obtenir →</button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col gap-4 hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300">
                <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">Nouveau</span>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-violet-400 shrink-0">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Rendez-vous</span>
                    <h3 className="text-white font-semibold text-base mt-0.5">Rappel RDV automatique</h3>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">24h avant chaque RDV, tes clients reçoivent un rappel email. Réduit les no-shows de 60%. Compatible Doctolib, Calendly, Google Calendar.</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div><span className="text-2xl font-bold text-white">29€</span><span className="text-zinc-500 text-xs ml-1">une fois</span></div>
                  <button className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all">Obtenir →</button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col gap-4 hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-cyan-400 shrink-0">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">CRM</span>
                    <h3 className="text-white font-semibold text-base mt-0.5">Leads vers CRM auto</h3>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed flex-1">Chaque lead Facebook Ads, Google ou formulaire web s&apos;ajoute instantanément dans ton CRM. Zéro saisie manuelle.</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div><span className="text-2xl font-bold text-white">29€</span><span className="text-zinc-500 text-xs ml-1">une fois</span></div>
                  <button className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-violet-600 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-violet-500 transition-all">Obtenir →</button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="comment" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Simple</span>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Opérationnel en 10 minutes</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: "01", title: "Tu choisis", desc: "Sélectionne l'automatisation et règle en ligne. Paiement sécurisé via Stripe.", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
                { n: "02", title: "Tu reçois", desc: "Fichier workflow + guide PDF illustré avec captures d'écran. Disponible immédiatement.", icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                { n: "03", title: "Tu installes", desc: "Tu importes dans n8n (gratuit en auto-hébergé). On est là si tu bloques quelque part.", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
              ].map((s) => (
                <div key={s.n} className="glass rounded-2xl p-7">
                  <div className="flex items-start justify-between mb-5">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                    </div>
                    <span className="text-5xl font-bold text-white/[0.04]">{s.n}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="tarifs" className="py-24 px-6 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.15em] mb-4 block">Tarifs</span>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Simple et transparent</h2>
              <p className="text-zinc-400 text-lg">Pas d&apos;abonnement caché. Tu paies une fois, tu gardes pour toujours.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-8">
                <p className="text-zinc-400 text-sm font-medium mb-2">Template seul</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">29</span>
                  <span className="text-zinc-500 mb-1 ml-1">– 59€</span>
                </div>
                <p className="text-xs text-zinc-600 mb-6">paiement unique</p>
                <ul className="space-y-3 text-sm text-zinc-300">
                  {["Fichier workflow n8n", "Guide installation PDF", "Support email 30 jours", "Mises à jour incluses"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <svg className="text-violet-400 shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative rounded-2xl border border-violet-500/40 bg-violet-500/[0.05] p-8">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold text-violet-900 bg-violet-400 px-3 py-1 rounded-full">Recommandé</span>
                </div>
                <p className="text-zinc-400 text-sm font-medium mb-2">Installation incluse</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">+99€</span>
                </div>
                <p className="text-xs text-zinc-600 mb-6">en plus du template</p>
                <ul className="space-y-3 text-sm text-zinc-300">
                  {["Tout inclus dans Template", "On installe et configure pour toi", "Test complet avant livraison", "Support prioritaire 60 jours"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <svg className="text-violet-400 shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass rounded-3xl p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-cyan-500/5 pointer-events-none" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative">Prêt à automatiser ?</h2>
              <p className="text-zinc-400 mb-8 relative">Rejoins les entrepreneurs qui gagnent des heures chaque semaine.</p>
              <Link href="#automations" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] text-base relative">
                Voir les automatisations
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
