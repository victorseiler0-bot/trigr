import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

// ── Brand logos SVG ────────────────────────────────────────────────────────────
const LOGOS = [
  {
    name: "Gmail",
    svg: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>,
  },
  {
    name: "Google Calendar",
    svg: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M18.316 5.684H24v12.632h-5.684V5.684zm-12.632 0H24v5.684H5.684V5.684zM0 5.684h5.684v12.632H0V5.684zm5.684 12.632H18.316V24H5.684v-5.684zM0 18.316h5.684V24H1.895A1.893 1.893 0 0 1 0 22.105v-3.789zm18.316 0H24v3.79A1.893 1.893 0 0 1 22.105 24H18.316v-5.684zM22.105 0A1.893 1.893 0 0 1 24 1.895v3.789h-5.684V0h3.79zM0 1.895A1.893 1.893 0 0 1 1.895 0H5.684v5.684H0V1.895zM5.684 0H18.316v5.684H5.684V0z" fill="#4285F4"/></svg>,
  },
  {
    name: "WhatsApp",
    svg: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" fill="#25D366"/></svg>,
  },
  {
    name: "Notion",
    svg: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z" fill="white"/></svg>,
  },
  {
    name: "Outlook",
    svg: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.5q0 .46-.3.77-.3.3-.75.3H13.5V12H24zm-12.5-3.5H13V10h-1.5V8.5zM14.5 10H16V8.5h-1.5V10zM16 10h1.5V8.5H16V10zm1.5 0H19V8.5h-1.5V10zm1.5 0h1.5V8.5H19V10zm-7.5 3H13v-1.5h-1.5V13zm1.5 0h1.5v-1.5H13V13zm1.5 0H16v-1.5h-1.5V13zM16 13h1.5v-1.5H16V13zm1.5 0H19v-1.5h-1.5V13zm1.5 0h1.5v-1.5H19V13zM8.08 9.45q-.9 0-1.6.3-.7.29-1.2.82-.49.53-.76 1.27-.26.75-.26 1.67 0 .85.24 1.57.25.72.7 1.24.46.52 1.13.81.67.3 1.53.3.86 0 1.52-.3.67-.29 1.14-.82.47-.52.72-1.25.25-.73.25-1.6 0-.9-.27-1.64-.26-.74-.74-1.27-.48-.52-1.15-.81-.67-.29-1.49-.29zM22 22v-9H13.5v.5H22z" fill="#0078D4"/></svg>,
  },
  {
    name: "Slack",
    svg: <svg viewBox="0 0 122.8 122.8" width="20" height="20"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0S90.5 5.8 90.5 12.9v32.3z" fill="#2EB67D"/><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9S117.2 90.5 110.1 90.5H77.6z" fill="#ECB22E"/></svg>,
  },
  {
    name: "Apple",
    svg: <svg viewBox="0 0 814 1000" width="18" height="22" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>,
  },
  {
    name: "Teams",
    svg: <svg viewBox="0 0 2228.833 2073.333" width="22" height="20"><path d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162-361.975-361.877V828.971a51.485 51.485 0 0 1 51.442-51.471z" fill="#5059C9"/><circle cx="1943.75" cy="440.583" r="233.25" fill="#5059C9"/><circle cx="1218.083" cy="336.917" r="309.25" fill="#7B83EB"/><path d="M1835.896 777.5H642.371c-53.001 1.49-94.577 45.879-93.087 98.883v598.195c-7.442 322.675 247.371 590.0 570.053 597.442 322.675 7.44 590.0-247.371 597.44-570.046.19-9.121.19-18.249 0-27.397V828.971a51.481 51.481 0 0 0-51.442-51.471z" fill="#7B83EB"/><path opacity=".1" d="M1244.083 777.5v838.033c-.27 19.797-12.3 37.425-30.442 45.192-5.813 2.519-12.092 3.786-18.417 3.738h-802.9c-9.225-23.396-17.73-46.867-24.442-70.958-26.52-91.489-27.502-188.687-2.858-280.67V877.154c-1.49-53.009 40.098-97.398 93.093-98.883z"/><path opacity=".2" d="M1205.75 777.5v879.908c.055 6.35-1.215 12.642-3.738 18.441-7.769 18.143-25.397 30.172-45.188 30.442h-765.9c-11.125-23.563-21.571-47.455-30.462-71.882-8.871-24.358-16.446-49.232-22.671-74.526-26.52-91.489-27.502-188.687-2.858-280.67V877.154c-1.49-53.009 40.098-97.398 93.093-98.883z"/><path opacity=".2" d="M1205.75 777.5v796.158c-.149 50.439-40.994 91.283-91.438 91.433H430.9c-26.52-91.489-27.502-188.687-2.858-280.67V877.154c-1.49-53.009 40.098-97.398 93.093-98.883z"/><path opacity=".2" d="M1167.417 777.5v796.158c-.149 50.439-40.992 91.283-91.433 91.433H430.9c-26.52-91.489-27.502-188.687-2.858-280.67V877.154c-1.49-53.009 40.098-97.398 93.093-98.883z"/><path opacity=".1" d="M1244.083 509.25v267.621c-14.7.779-29.179.779-43.879 0-29.221-1.639-58.256-5.946-86.671-12.875a633.993 633.993 0 0 1-170.292-71.558v-.054a624.773 624.773 0 0 1-51.758-37.625c-18.825-15.179-36.536-31.679-52.979-49.358h-.058c-41.546-45.067-72.192-98.512-90.033-156.75H1152.65a91.476 91.476 0 0 1 91.433 91.433v-30.834z"/><path opacity=".2" d="M1205.75 547.583v229.288c-29.221-1.639-58.256-5.946-86.671-12.875a633.993 633.993 0 0 1-170.292-71.558v-.054a624.773 624.773 0 0 1-51.758-37.625c-18.825-15.179-36.536-31.679-52.979-49.358h-.058c-41.546-45.067-72.192-98.512-90.033-156.75h360.354a91.476 91.476 0 0 1 91.437 91.432v-30.834z"/><path opacity=".2" d="M1205.75 547.583v229.288c-29.221-1.639-58.256-5.946-86.671-12.875a633.993 633.993 0 0 1-170.292-71.558v-.054a624.773 624.773 0 0 1-51.758-37.625c-18.825-15.179-36.536-31.679-52.979-49.358h-.058c-41.546-45.067-72.192-98.512-90.033-156.75h360.354a91.476 91.476 0 0 1 91.437 91.432v-30.834z"/><path opacity=".2" d="M1167.417 547.583v229.288a633.993 633.993 0 0 1-170.292-71.558v-.054a624.773 624.773 0 0 1-51.758-37.625c-18.825-15.179-36.536-31.679-52.979-49.358h-.058c-41.546-45.067-72.192-98.512-90.033-156.75h274.687a91.476 91.476 0 0 1 90.433 91.432v-30.834z"/><linearGradient id="a" x1="198.099" y1="1683.0" x2="942.234" y2="394.333" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5a62c3"/><stop offset=".5" stop-color="#4d55bd"/><stop offset="1" stop-color="#3940ab"/></linearGradient><path d="M91.433 547.583h984.717c50.501 0 91.433 40.932 91.433 91.433v984.717c0 50.501-40.932 91.433-91.433 91.433H91.433C40.932 1715.167 0 1674.234 0 1623.733V639.017c0-50.501 40.932-91.434 91.433-91.434z" fill="url(#a)"/><path d="M771.333 828.717H630.371v412.5H525.329v-412.5H384.417V727.5h386.916v101.217z" fill="#FFF"/></svg>,
  },
  {
    name: "HubSpot",
    svg: <svg viewBox="0 0 512 512" width="20" height="20" fill="#FF7A59"><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 515.3 173.9 515.3s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7zM346.5 368.5c-40.8 0-74-33.2-74-74s33.2-74 74-74 74 33.2 74 74-33.2 74-74 74z"/><path d="M285.1 219.2v-60.3c9.3-4.3 15.8-13.7 15.8-24.6v-.8c0-14.9-12.1-27.1-27.1-27.1h-.8c-14.9 0-27.1 12.1-27.1 27.1v.8c0 10.9 6.4 20.3 15.8 24.6v60.3c-14.2 2.1-27.3 7.7-38.5 16.2L122.5 119.7c.9-3.1 1.4-6.4 1.4-9.8 0-20.3-16.5-36.8-36.8-36.8s-36.8 16.5-36.8 36.8 16.5 36.8 36.8 36.8c8.5 0 16.3-2.9 22.5-7.7l99.8 113.5c-16.4 19.3-26.2 44.3-26.2 71.6 0 60.5 49.1 109.7 109.7 109.7s109.7-49.1 109.7-109.7c0-55.8-41.8-101.9-95.5-108.7z"/></svg>,
  },
];

// ── Stats ──────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "9€", label: "par mois (vs 50$ Lindy)" },
  { value: "8+", label: "intégrations natives" },
  { value: "100%", label: "RGPD-compliant" },
  { value: "2 min", label: "pour démarrer" },
];

// ── Features ───────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    badge: "Emails & Agenda",
    title: "Inbox zéro, sans effort",
    desc: "Ton assistant trie tes emails, propose des réponses et prépare tes réunions — automatiquement, chaque matin.",
    items: ["Triage & réponses suggérées", "Brief pré-réunion", "Comptes-rendus auto", "Suivi des relances"],
    gradient: "from-violet-500/10 to-transparent",
    border: "border-violet-500/20 hover:border-violet-500/40",
    iconBg: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    badgeCls: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    checkCls: "text-violet-400",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    badge: "WhatsApp 24/7",
    title: "Disponible sur ton téléphone",
    desc: "Contrairement à Lindy (iMessage US uniquement), Trigr s'intègre nativement à WhatsApp — le canal n°1 des PME françaises.",
    items: ["WhatsApp Business natif", "Chat web en temps réel", "Email reply auto", "Slack DM (Pro)"],
    gradient: "from-emerald-500/10 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    badgeCls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    checkCls: "text-emerald-400",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    badge: "Workflows métier",
    title: "Templates FR prêts à l'emploi",
    desc: "Relance prospect, devis en 1 clic, rapport hebdo — des automatisations testées pour les indépendants et PME.",
    items: ["Relance prospect auto", "Devis & facturation", "Rapport hebdo business", "Rappel RDV (−60% no-show)"],
    gradient: "from-cyan-500/10 to-transparent",
    border: "border-cyan-500/20 hover:border-cyan-500/40",
    iconBg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    badgeCls: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    checkCls: "text-cyan-400",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
];

// ── Steps ──────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Connecte tes outils",
    desc: "Gmail, WhatsApp, agenda — connexion OAuth en 30 secondes. Tes données restent sur ton serveur.",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    color: "violet",
  },
  {
    n: "02",
    title: "Parle à ton assistant",
    desc: "Via WhatsApp, chat web ou email. \"Quel est mon agenda demain ?\", \"Réponds à cet email\", \"Génère un devis pour Marie\".",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "cyan",
  },
  {
    n: "03",
    title: "Il agit à ta place",
    desc: "L'assistant envoie, planifie, relance et te rapporte. Tu te concentres sur ce qui compte.",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    color: "violet",
  },
];

// ── Pricing ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Gratuit",
    price: "0€",
    period: "7 jours",
    desc: "Tout tester, sans carte",
    features: ["Toutes les fonctionnalités", "100 messages inclus", "1 assistant IA", "Chat web"],
    cta: "Démarrer l'essai",
    highlight: false,
    badge: null as string | null,
    href: "/assistant",
  },
  {
    name: "Solo",
    price: "9€",
    period: "/mois",
    desc: "Pour les indépendants",
    features: ["Messages illimités", "Gmail + Google Calendar", "Chat web 24/7", "Templates de base (10+)", "Support email"],
    cta: "Choisir Solo",
    highlight: false,
    badge: null as string | null,
    href: "/pricing",
  },
  {
    name: "Pro",
    price: "19€",
    period: "/mois",
    desc: "Avec WhatsApp Business",
    features: ["Tout Solo inclus", "WhatsApp Business natif", "3 assistants IA", "Templates Pro (30+)", "Computer Use (bêta)", "Support prioritaire"],
    cta: "Choisir Pro",
    highlight: true,
    badge: "Populaire" as string | null,
    href: "/pricing",
  },
  {
    name: "Équipe",
    price: "49€",
    period: "/mois",
    desc: "Pour les petites équipes",
    features: ["Tout Pro inclus", "5 utilisateurs", "Slack & Microsoft Teams", "API access", "Onboarding call 30 min"],
    cta: "Choisir Équipe",
    highlight: false,
    badge: null as string | null,
    href: "/pricing",
  },
];

// ── Comparison ─────────────────────────────────────────────────────────────────
const COMPARE_ROWS = [
  ["Langue", "🇫🇷 Français FR-first", "🇺🇸 100 % anglais"],
  ["Prix d'entrée", "9 €/mois", "50 $/mois"],
  ["WhatsApp", "✅ Natif", "❌ Non dispo"],
  ["Apple iCloud", "✅ CalDAV direct", "✅ Mac Mini bridge"],
  ["Notion", "✅ OAuth natif", "✅ OAuth natif"],
  ["RGPD", "✅ Données chez vous", "Données stockées US"],
  ["Self-hosted", "✅ Docker 1 commande", "❌ SaaS uniquement"],
  ["Templates FR", "✅ Artisans, kinés…", "Templates US"],
];

// ── Chat mockup messages ────────────────────────────────────────────────────────
const CHAT_PREVIEW = [
  { role: "user", text: "Montre-moi mes emails urgents" },
  { role: "assistant", text: "Tu as 3 emails urgents aujourd'hui :\n• 📨 Marie Dupont – Devis en attente\n• 🔴 Facture impayée – Relancer avant 17h\n• 📋 Appel de demain – Brief préparé ✓" },
  { role: "user", text: "Relance Marie automatiquement" },
  { role: "assistant", text: "✅ Email de relance envoyé à Marie Dupont avec ton template personnalisé. Rappel dans 48h si pas de réponse." },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ─────────────────────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          {/* Gradient orbs */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute top-1/4 left-1/3 w-[800px] h-[600px] bg-violet-600/[0.07] rounded-full blur-[140px] animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[120px] animate-float-delayed" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-800/[0.04] rounded-full blur-[80px]" />
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.015]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Left — text */}
              <div className="animate-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.08] text-violet-300 text-xs font-medium mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Essai gratuit 7 jours · Aucune carte requise
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                  Ton assistant IA
                  <br />
                  <span className="gradient-text">personnel.</span>
                  <br />
                  <span className="text-white/60">Tes données chez toi.</span>
                </h1>
                <p className="text-xl text-zinc-400 leading-relaxed mb-10 max-w-xl">
                  Gmail, WhatsApp, agenda — ton assistant automatise tout à ta place.
                  RGPD-friendly, self-hostable, 5× moins cher que Lindy.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
                  <Link
                    href="/assistant"
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] text-base"
                  >
                    Démarrer gratuitement
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                  <Link
                    href="#comment"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-5 py-3.5 rounded-xl border border-white/[0.09] hover:border-white/20 transition-all text-base"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Comment ça marche
                  </Link>
                </div>
                <div className="flex flex-wrap gap-5 text-sm text-zinc-500">
                  {["RGPD-friendly", "Auto-hébergeable", "Sans engagement"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2.5"><path d="M2 7l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — chat mockup */}
              <div className="hidden lg:flex justify-center items-center animate-fade-up-2">
                <div className="relative">
                  {/* Glow behind */}
                  <div className="absolute inset-0 bg-violet-500/10 rounded-3xl blur-3xl scale-110" />
                  <div className="relative bg-[#111113] border border-white/[0.09] rounded-2xl overflow-hidden w-[360px] shadow-2xl">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/60" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-connected" />
                        <span className="text-xs text-zinc-500 font-medium">Trigr Assistant</span>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="px-4 py-5 space-y-4 min-h-[300px]">
                      {CHAT_PREVIEW.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                          <div className={`rounded-2xl px-3.5 py-2.5 max-w-[260px] text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-violet-600 text-white rounded-tr-sm"
                              : "bg-white/[0.05] border border-white/[0.07] text-zinc-200 rounded-tl-sm"
                          }`}
                            style={{ whiteSpace: "pre-line" }}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {/* Typing indicator */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0">
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                    {/* Input */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                        <span className="flex-1 text-xs text-zinc-600">Tape un message…</span>
                        <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
                          <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2"><path d="M2 5h6M5 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Floating badges */}
                  <div className="absolute -right-8 top-12 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 animate-float text-xs">
                    <span className="text-emerald-300 font-medium">✅ Email envoyé</span>
                  </div>
                  <div className="absolute -left-8 bottom-16 bg-violet-500/10 border border-violet-500/25 rounded-xl px-3 py-2 animate-float-delayed text-xs">
                    <span className="text-violet-300 font-medium">📅 RDV planifié</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────────────── */}
        <section className="py-12 px-6 border-y border-white/[0.05]">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {STATS.map((s) => (
                <div key={s.value} className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-1">{s.value}</div>
                  <div className="text-xs text-zinc-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LOGOS ────────────────────────────────────────────────────────────── */}
        <section className="py-12 px-6 border-b border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs text-zinc-600 uppercase tracking-[0.2em] text-center mb-8">Connecté à tes outils préférés</p>
            <div className="flex items-center justify-center flex-wrap gap-8">
              {LOGOS.map((l) => (
                <div key={l.name} className="flex flex-col items-center gap-2 group cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center transition-all group-hover:bg-white/[0.07] group-hover:border-white/[0.12] group-hover:-translate-y-0.5">
                    {l.svg}
                  </div>
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
        <section id="fonctions" className="py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-fade-up">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.2em] mb-4 block">Fonctionnalités</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
                Tout ce dont tu as besoin,<br />
                <span className="gradient-text">rien de superflu</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                Un assistant IA qui comprend ton contexte et agit — conçu pour les freelances et PME français.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <div
                  key={f.badge}
                  className={`relative rounded-2xl border p-7 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1 card-glow overflow-hidden ${f.border} bg-white/[0.02]`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${f.gradient} pointer-events-none`} />
                  <div className="relative z-10">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${f.badgeCls}`}>{f.badge}</span>
                  </div>
                  <div className={`relative z-10 p-2.5 rounded-xl bg-white/[0.04] border w-fit ${f.iconBg}`}>
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                  <ul className="relative z-10 space-y-2.5">
                    {f.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                        <svg className={`${f.checkCls} shrink-0`} width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
        <section id="comment" className="py-28 px-6 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-medium text-cyan-400 uppercase tracking-[0.2em] mb-4 block">Simple</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
                Opérationnel en <span className="gradient-text">2 minutes</span>
              </h2>
              <p className="text-zinc-400 text-lg">Pas de code, pas de setup technique. Connecte, parle, automatise.</p>
            </div>
            <div className="relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-12 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-violet-500/30" />
              <div className="grid md:grid-cols-3 gap-8">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="glass rounded-2xl p-7 flex flex-col gap-4 relative">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl border w-fit ${s.color === "cyan" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400"}`}>
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                        </svg>
                      </div>
                      <span className="text-5xl font-black text-white/[0.04] select-none">{s.n}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                          <path d="M8 2v12M3 9l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────────── */}
        <section id="tarifs" className="py-28 px-6 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-medium text-violet-400 uppercase tracking-[0.2em] mb-4 block">Tarifs</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
                5× moins cher<br />
                <span className="gradient-text">que Lindy</span>
              </h2>
              <p className="text-zinc-400 text-lg">
                Lindy commence à 50 $/mois. Trigr commence à 9 €. Vos données restent chez vous.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 ${
                    plan.highlight
                      ? "border border-violet-500/50 bg-violet-500/[0.06] shadow-[0_0_60px_rgba(139,92,246,0.12)] hover:-translate-y-1"
                      : "glass hover:-translate-y-0.5"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold text-white bg-violet-600 px-3 py-1 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)]">{plan.badge}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-zinc-400 text-sm font-medium mb-1">{plan.name}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-zinc-500 text-sm mb-1">{plan.period}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                        <svg className="text-violet-400 shrink-0 mt-0.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 6-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
                      plan.highlight
                        ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)]"
                        : "bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 border border-white/[0.09]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-zinc-600 mt-8">
              Computer Use en bêta · Self-hosted disponible (Hetzner CAX11 à 4 €/mois) · Annulable à tout moment
            </p>
          </div>
        </section>

        {/* ── COMPARISON ───────────────────────────────────────────────────────── */}
        <section className="py-28 px-6 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-[0.2em] mb-4 block">Comparaison</span>
              <h2 className="text-4xl font-bold text-white tracking-tight">Trigr vs Lindy</h2>
            </div>
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-white/[0.03]">
                <div className="p-5 border-b border-white/[0.06]" />
                <div className="p-5 text-center border-b border-white/[0.06]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7h4l2-5 2 10 2-5h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-sm font-bold text-white">Trigr</span>
                  </div>
                </div>
                <div className="p-5 text-center border-b border-white/[0.06] border-l border-white/[0.04]">
                  <span className="text-sm font-medium text-zinc-500">Lindy</span>
                </div>
              </div>
              {COMPARE_ROWS.map(([feature, trigr, lindy], i) => (
                <div key={feature} className={`grid grid-cols-3 ${i < COMPARE_ROWS.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-white/[0.01] transition-colors`}>
                  <div className="p-4 text-sm text-zinc-500 font-medium">{feature}</div>
                  <div className="p-4 text-sm text-center text-white">{trigr}</div>
                  <div className="p-4 text-sm text-center text-zinc-500 border-l border-white/[0.04]">{lindy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────────── */}
        <section className="py-28 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-violet-800/20 to-cyan-900/20" />
              <div className="absolute inset-0 border border-violet-500/20 rounded-3xl" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-500/20 rounded-full blur-3xl" />
              <div className="relative z-10 text-center py-16 px-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.1] text-violet-300 text-xs font-medium mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  7 jours gratuits, sans carte
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                  Prêt à déléguer<br />
                  <span className="gradient-text">à ton IA ?</span>
                </h2>
                <p className="text-zinc-400 mb-10 text-lg">Annulable en 1 clic. Tes données restent chez toi.</p>
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:shadow-[0_0_60px_rgba(139,92,246,0.7)] text-base"
                >
                  Démarrer gratuitement
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
