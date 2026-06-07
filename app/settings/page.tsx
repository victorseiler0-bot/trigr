"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";

type Tab = "account" | "templates" | "workflows" | "automations" | "subscription";
type WaStatus = "idle" | "checking" | "connected";
type HealthResult = { ok: boolean; message: string };
type HealthMap = Record<string, HealthResult & { loading?: boolean }>;

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
}

// ── Google logo ───────────────────────────────────────────────────────────────
function GoogleLogo() {
  return <svg viewBox="0 0 18 18" width="20" height="20" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>;
}

function WorkflowToggle({ wf, onToggle, toggling }: { wf: N8nWorkflow; onToggle: (id: string, active: boolean) => void; toggling: string | null }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all ${
      wf.active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${wf.active ? "status-connected" : "status-disconnected"}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{wf.name.replace("Autozen — ", "")}</p>
          <p className="text-xs text-slate-400">{wf.id}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(wf.id, !wf.active)}
        disabled={toggling === wf.id}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-all ${wf.active ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-50`}
        title={wf.active ? "Désactiver" : "Activer"}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${wf.active ? "left-5" : "left-0.5"} ${toggling === wf.id ? "animate-pulse" : ""}`} />
      </button>
    </div>
  );
}

// ── Email Templates ────────────────────────────────────────────────────────────

const EMAIL_TEMPLATES = [
  {
    id: "devis",
    icon: "📋",
    name: "Devis commercial",
    subject: "Devis n°[NUMERO] — [SERVICE]",
    body: `Bonjour [PRÉNOM],

Suite à notre échange du [DATE], je vous adresse ci-dessous le devis pour [DESCRIPTION DU SERVICE].

**Détail de la prestation :**
- [LIGNE 1] : [PRIX] €
- [LIGNE 2] : [PRIX] €

**Total HT : [TOTAL] €**
**TVA 20% : [TVA] €**
**Total TTC : [TOTAL TTC] €**

Ce devis est valable 30 jours à compter de sa date d'émission.

Pour accepter ce devis, il vous suffit de me retourner ce document signé avec la mention "Bon pour accord".

N'hésitez pas à me contacter pour toute question.

Cordialement,
[VOTRE NOM]`,
  },
  {
    id: "relance",
    icon: "🔔",
    name: "Relance impayé (poli)",
    subject: "Relance facture n°[NUMERO]",
    body: `Bonjour [PRÉNOM],

Je me permets de vous contacter au sujet de la facture n°[NUMERO] d'un montant de [MONTANT] €, émise le [DATE] et dont l'échéance était le [ECHEANCE].

Sauf erreur de ma part, cette facture semble être restée impayée à ce jour.

Pourriez-vous me confirmer qu'elle a bien été prise en compte et me communiquer une date de règlement prévisionnelle ?

Dans l'attente de votre retour,

Cordialement,
[VOTRE NOM]`,
  },
  {
    id: "confirmation_rdv",
    icon: "📅",
    name: "Confirmation de RDV",
    subject: "Confirmation de notre rendez-vous du [DATE]",
    body: `Bonjour [PRÉNOM],

Je vous confirme notre rendez-vous du **[DATE] à [HEURE]** [LIEU/LIEN VISIO].

**Ordre du jour :**
- [POINT 1]
- [POINT 2]
- [POINT 3]

Si vous avez des questions en amont ou souhaitez modifier l'horaire, n'hésitez pas à me contacter.

À très bientôt,
[VOTRE NOM]`,
  },
  {
    id: "prospection",
    icon: "🎯",
    name: "Prospection (1er contact)",
    subject: "Une solution pour [PROBLÈME]",
    body: `Bonjour [PRÉNOM],

Je me permets de vous contacter car j'ai vu que [ENTREPRISE/CONTEXTE] et je pense pouvoir vous aider.

Chez [VOTRE ENTREPRISE], nous aidons [TYPE DE CLIENTS] à [BÉNÉFICE CLÉ] grâce à [SOLUTION].

**Résultats concrets :** [EXEMPLE CHIFFRÉ]

Seriez-vous disponible 15 minutes cette semaine pour en discuter ? Je vous propose le [JOUR] à [HEURE] ou le [JOUR2] à [HEURE2].

Cordialement,
[VOTRE NOM]`,
  },
  {
    id: "remerciement",
    icon: "🙏",
    name: "Remerciement client",
    subject: "Merci pour votre confiance",
    body: `Bonjour [PRÉNOM],

Je voulais prendre un moment pour vous remercier sincèrement de votre confiance.

[CONTEXTE SPÉCIFIQUE : ex. "Ce projet a été passionnant à réaliser" / "Votre retour positif m'a fait très plaisir"]

N'hésitez pas à me faire part de tout retour ou besoin futur. Ce sera toujours un plaisir de travailler avec vous.

En vous souhaitant une excellente journée,

[VOTRE NOM]`,
  },
  {
    id: "refus_poli",
    icon: "🚫",
    name: "Refus poli",
    subject: "Suite à votre demande",
    body: `Bonjour [PRÉNOM],

Merci pour votre message et l'intérêt que vous portez à [SUJET].

Après réflexion, je ne suis malheureusement pas en mesure de [DONNER SUITE / ACCEPTER] pour les raisons suivantes : [RAISON].

Je vous souhaite bonne continuation dans vos recherches et reste disponible pour toute autre demande qui pourrait correspondre davantage à mon domaine.

Cordialement,
[VOTRE NOM]`,
  },
];

function TwentyCrmSection() {
  const [url, setUrl]   = useState("");
  const [key, setKey]   = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus]   = useState<null | { ok: boolean; msg: string }>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("autozen_twenty");
      if (stored) { const d = JSON.parse(stored); setUrl(d.url ?? ""); setKey(d.key ?? ""); }
    } catch { /* ignore */ }
  }, []);

  function save() {
    localStorage.setItem("autozen_twenty", JSON.stringify({ url, key }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    if (!url || !key) return;
    setTesting(true);
    setStatus(null);
    try {
      const base = url.replace(/\/$/, "");
      const r = await fetch(`${base}/metadata`, { headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } });
      if (r.ok) setStatus({ ok: true, msg: "Connexion réussie ✓" });
      else setStatus({ ok: false, msg: `Erreur ${r.status} — vérifie l'URL et le token.` });
    } catch {
      setStatus({ ok: false, msg: "Impossible de joindre l'instance Twenty." });
    } finally { setTesting(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white text-sm font-bold">20</div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Twenty CRM <span className="text-xs text-slate-400 font-normal ml-1">(optionnel)</span></h2>
          <p className="text-xs text-slate-400">Connecte ton instance Twenty open-source comme CRM alternatif.</p>
        </div>
        <a href="https://twenty.com" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-blue-600 hover:underline">twenty.com →</a>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">URL de l&apos;instance</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://app.twenty.com ou https://ton-instance.com"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">API Token</label>
          <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="eyJhbGci…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <p className="text-xs text-slate-400 mt-1">Settings → API → Generate Token dans ton workspace Twenty.</p>
        </div>
        {status && (
          <p className={`text-xs px-3 py-2 rounded-lg ${status.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{status.msg}</p>
        )}
        <div className="flex gap-2">
          <button onClick={testConnection} disabled={testing || !url || !key}
            className="text-sm px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all">
            {testing ? "Test…" : "Tester"}
          </button>
          <button onClick={save} disabled={!url || !key}
            className="text-sm px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 transition-all">
            {saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyTemplate(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Modèles d&apos;emails</h2>
        <p className="text-sm text-slate-500 mb-5">Modèles professionnels prêts à l&apos;emploi. Cliquez pour copier ou utiliser directement dans l&apos;assistant.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EMAIL_TEMPLATES.map(tpl => (
            <div key={tpl.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tpl.icon}</span>
                  <span className="text-sm font-semibold text-slate-900">{tpl.name}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3 truncate">Objet : {tpl.subject}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => copyTemplate(tpl.id, `Objet : ${tpl.subject}\n\n${tpl.body}`)}
                  className="flex-1 text-xs border border-slate-200 bg-white hover:border-slate-300 text-slate-600 hover:text-slate-900 py-2 rounded-xl transition-all font-medium"
                >
                  {copied === tpl.id ? "✓ Copié !" : "Copier"}
                </button>
                <button
                  onClick={() => {
                    const prefill = `Aide-moi à rédiger un email de type "${tpl.name}". Voici le modèle de base :\n\nObjet : ${tpl.subject}\n\n${tpl.body.slice(0, 300)}…\n\nAdapte-le à ma situation.`;
                    router.push(`/assistant?prefill=${encodeURIComponent(prefill)}`);
                  }}
                  className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl transition-all font-medium"
                >
                  Utiliser avec Autozen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-5 text-center">
        <p className="text-sm text-slate-500 mb-1">💡 Conseil</p>
        <p className="text-xs text-slate-400">Dans l&apos;assistant, vous pouvez demander <span className="text-blue-600 font-medium">&ldquo;Rédige-moi un devis pour [client]&rdquo;</span> et Autozen adaptera automatiquement le modèle à votre contexte.</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [oauthError, setOauthError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);

  // n8n workflows
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // Subscription
  const [plan, setPlan] = useState<"free" | "solo" | "pro" | "equipe">("free");
  const [subBusy, setSubBusy] = useState<string | null>(null);

  // Integration health checks
  const [health, setHealth] = useState<HealthMap>({});

  async function testIntegration(name: string) {
    setHealth(h => ({ ...h, [name]: { ...h[name], loading: true, ok: false, message: "" } }));
    try {
      const r = await fetch("/api/integration-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: name }),
      });
      const d = await r.json() as HealthResult;
      setHealth(h => ({ ...h, [name]: { ok: d.ok, message: d.message, loading: false } }));
    } catch {
      setHealth(h => ({ ...h, [name]: { ok: false, message: "Erreur réseau", loading: false } }));
    }
  }

  // User profile
  type UserProfile = { businessName?: string; profession?: string; city?: string; tone?: "formal" | "informal"; context?: string };
  const [profile, setProfile] = useState<UserProfile>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  async function saveProfile() {
    setProfileSaving(true);
    try {
      const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (r.ok) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); }
    } finally { setProfileSaving(false); }
  }

  // Brief du Matin
  const [briefEnabled, setBriefEnabled] = useState(false);
  const [briefWaNumber, setBriefWaNumber] = useState("");
  const [briefSaving, setBriefSaving] = useState(false);

  async function saveBrief() {
    setBriefSaving(true);
    try {
      await fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: briefEnabled, waNumber: briefWaNumber }) });
    } finally { setBriefSaving(false); }
  }

  // Contacts
  type Contact = { id: string; name: string; phone?: string; email?: string; notes?: string };
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "" });
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);

  async function saveContact() {
    setContactSaving(true);
    try {
      const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact: contactForm }) });
      const d = await r.json();
      if (d.contacts) { setContacts(d.contacts); setContactOpen(false); setContactForm({ name: "", phone: "", email: "" }); }
    } finally { setContactSaving(false); }
  }

  async function deleteContact(id: string) {
    const r = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    if (r.ok) setContacts(prev => prev.filter(c => c.id !== id));
  }

  // Automations
  type Automation = { id: string; name: string; prompt: string; schedule: string; channel: "wa" | "dashboard"; enabled: boolean; lastRun?: string };
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [autoForm, setAutoForm] = useState<Partial<Automation>>({ schedule: "daily_8am", channel: "dashboard", enabled: true });
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoRunning, setAutoRunning] = useState<string | null>(null);

  const SCHEDULE_OPTS = [
    { value: "daily_7am", label: "Tous les jours à 7h" },
    { value: "daily_8am", label: "Tous les jours à 8h" },
    { value: "daily_9am", label: "Tous les jours à 9h" },
    { value: "daily_6pm", label: "Tous les jours à 18h" },
    { value: "weekly_monday", label: "Chaque lundi matin" },
    { value: "weekly_friday", label: "Chaque vendredi soir" },
  ];

  async function saveAutomation() {
    if (!autoForm.name || !autoForm.prompt || !autoForm.schedule) return;
    setAutoSaving(true);
    const automation: Automation = {
      id: autoForm.id ?? `auto_${Date.now()}`,
      name: autoForm.name,
      prompt: autoForm.prompt,
      schedule: autoForm.schedule,
      channel: autoForm.channel ?? "dashboard",
      enabled: autoForm.enabled ?? true,
    };
    try {
      const r = await fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ automation }) });
      const d = await r.json();
      if (d.automations) { setAutomations(d.automations); setAutoOpen(false); setAutoForm({ schedule: "daily_8am", channel: "dashboard", enabled: true }); }
    } finally { setAutoSaving(false); }
  }

  async function toggleAutomation(id: string) {
    const r = await fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id }) });
    if (r.ok) { const d = await r.json(); setAutomations(d.automations); }
  }

  async function deleteAutomation(id: string) {
    const r = await fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    if (r.ok) setAutomations(prev => prev.filter(a => a.id !== id));
  }

  async function runAutomation(id: string) {
    setAutoRunning(id);
    try {
      const r = await fetch("/api/automations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = await r.json();
      if (d.result) toast(d.result, "success");
    } finally { setAutoRunning(null); }
  }

  // WA Rules (trigger-based auto-replies)
  type WaRule = { id: string; trigger: string; triggerType: "contains" | "exact" | "starts"; action: "reply_template" | "reply_ai" | "ignore"; replyText?: string; enabled: boolean };
  const [waRules, setWaRules] = useState<WaRule[]>([]);
  const [waRuleOpen, setWaRuleOpen] = useState(false);
  const [waRuleForm, setWaRuleForm] = useState<Partial<WaRule>>({ triggerType: "contains", action: "reply_template", enabled: true });
  const [waRuleSaving, setWaRuleSaving] = useState(false);

  async function saveWaRule() {
    if (!waRuleForm.trigger) return;
    setWaRuleSaving(true);
    const rule: WaRule = {
      id: waRuleForm.id ?? `rule_${Date.now()}`,
      trigger: waRuleForm.trigger,
      triggerType: waRuleForm.triggerType ?? "contains",
      action: waRuleForm.action ?? "reply_template",
      replyText: waRuleForm.replyText,
      enabled: waRuleForm.enabled ?? true,
    };
    try {
      const r = await fetch("/api/wa-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rule }) });
      const d = await r.json();
      if (d.rules) { setWaRules(d.rules); setWaRuleOpen(false); setWaRuleForm({ triggerType: "contains", action: "reply_template", enabled: true }); }
    } finally { setWaRuleSaving(false); }
  }

  async function toggleWaRule(id: string) {
    const r = await fetch("/api/wa-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id }) });
    if (r.ok) { const d = await r.json(); setWaRules(d.rules); }
  }

  async function deleteWaRule(id: string) {
    const r = await fetch("/api/wa-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    if (r.ok) setWaRules(prev => prev.filter(r => r.id !== id));
  }

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Pipedream accounts count
  const [pdCount, setPdCount] = useState(0);

  // IMAP
  const [imapEmail, setImapEmail] = useState<string | null>(null);

  // Instagram Meta Direct
  const [igPageName, setIgPageName] = useState<string | null>(null);
  const [igForm, setIgForm] = useState({ token: "", pageId: "" });
  const [igBusy, setIgBusy] = useState(false);
  const [igError, setIgError] = useState("");
  const [igOpen, setIgOpen] = useState(false);
  const [imapForm, setImapForm] = useState({ host: "outlook.office365.com", port: "993", user: "", password: "", smtpHost: "smtp.office365.com", smtpPort: "587" });
  const [imapBusy, setImapBusy] = useState(false);
  const [imapError, setImapError] = useState("");
  const [imapOpen, setImapOpen] = useState(false);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    import("@/lib/push").then(m => m.isPushEnabled().then(e => setPushEnabled(e)));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      const { subscribePush, unsubscribePush } = await import("@/lib/push");
      if (pushEnabled) {
        await unsubscribePush();
        setPushEnabled(false);
      } else {
        const ok = await subscribePush();
        setPushEnabled(ok);
        if (ok) toast("Notifications activées ✓", "success");
        else toast("Permission refusée par le navigateur", "error");
      }
    } finally { setPushBusy(false); }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/subscription").then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); }).catch(() => {});
    fetch("/api/pipedream/accounts").then(r => r.json()).then(d => {
      if (d.connected) setPdCount(Object.keys(d.connected).length);
    }).catch(() => {});
    fetch("/api/imap").then(r => r.json()).then(d => { if (d.email) setImapEmail(d.email); }).catch(() => {});
    fetch("/api/instagram").then(r => r.json()).then(d => { if (d.pageName) setIgPageName(d.pageName); }).catch(() => {});
    fetch("/api/contacts").then(r => r.json()).then(d => { if (d.contacts) setContacts(d.contacts); }).catch(() => {});
    fetch("/api/automations").then(r => r.json()).then(d => { if (d.automations) setAutomations(d.automations); }).catch(() => {});
    fetch("/api/wa-rules").then(r => r.json()).then(d => { if (d.rules) setWaRules(d.rules); }).catch(() => {});
    fetch("/api/profile").then(r => r.json()).then(d => { if (d.profile) setProfile(d.profile); }).catch(() => {});
  }, [isSignedIn]);

  async function saveImap() {
    setImapBusy(true); setImapError("");
    try {
      const r = await fetch("/api/imap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...imapForm, port: Number(imapForm.port), smtpPort: Number(imapForm.smtpPort) }) });
      const d = await r.json();
      if (!r.ok) { setImapError(d.error ?? "Erreur"); return; }
      setImapEmail(imapForm.user); setImapOpen(false); setImapForm(f => ({ ...f, password: "" }));
    } catch { setImapError("Erreur réseau"); }
    finally { setImapBusy(false); }
  }

  async function saveIgMeta() {
    setIgBusy(true); setIgError("");
    try {
      const r = await fetch("/api/instagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(igForm) });
      const d = await r.json();
      if (!r.ok) { setIgError(d.error ?? "Erreur"); return; }
      setIgPageName(d.pageName); setIgOpen(false); setIgForm({ token: "", pageId: "" });
    } catch { setIgError("Erreur réseau"); }
    finally { setIgBusy(false); }
  }

  async function disconnectIg() {
    await fetch("/api/instagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
    setIgPageName(null);
  }

  async function disconnectImap() {
    await fetch("/api/imap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
    setImapEmail(null);
  }

  useEffect(() => {
    if (activeTab !== "workflows" || workflows.length > 0) return;
    setWfLoading(true); setWfError("");
    fetch("/api/n8n/workflows").then(r => r.json()).then(d => { setWorkflows(d.workflows ?? []); })
      .catch(() => setWfError("n8n non accessible. Vérifiez que pm2 tourne."))
      .finally(() => setWfLoading(false));
  }, [activeTab, workflows.length]);

  async function connectGoogle() {
    if (!user) return;
    setGoogleBusy(true); setOauthError("");
    try {
      await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/settings/sso-callback`,
      });
    } catch (e: unknown) { setOauthError((e as Error)?.message ?? "Erreur"); setGoogleBusy(false); }
  }

  async function disconnectGoogle(id: string) {
    if (!user) return;
    setGoogleBusy(true); setOauthError("");
    try { await user.externalAccounts.find(a => a.id === id)?.destroy(); await user.reload(); }
    catch (e: unknown) { setOauthError((e as Error)?.message ?? "Erreur"); }
    finally { setGoogleBusy(false); }
  }

  async function toggleWorkflow(id: string, active: boolean) {
    setToggling(id);
    try {
      await fetch("/api/n8n/workflows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active } : w));
    } finally { setToggling(null); }
  }

  async function upgradePlan(p: string) {
    setSubBusy(p);
    try {
      const r = await fetch("/api/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p }) });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } finally { setSubBusy(null); }
  }

  if (!isLoaded || !isSignedIn || !user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );

  const initials = (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress;
  const googleAccount = user.externalAccounts.find(a => (a.provider === "google" || a.provider === "oauth_google"));
  const totalConnected = (googleAccount ? 1 : 0) + (imapEmail ? 1 : 0) + (igPageName ? 1 : 0) + pdCount;
  const INTEGRATION_LIMITS: Record<string, number> = { free: 2, solo: 3, pro: 999, equipe: 999 };
  const integrationLimit = INTEGRATION_LIMITS[plan] ?? 999;
  const atIntegrationLimit = plan !== "pro" && plan !== "equipe" && integrationLimit < 999 && totalConnected >= integrationLimit;

  const TABS: { id: Tab; label: string }[] = [
    { id: "account", label: "Compte" },
    { id: "templates", label: "Modèles" },
    { id: "automations", label: "Automatisations" },
    { id: "workflows", label: "Workflows n8n" },
    { id: "subscription", label: "Abonnement" },
  ];

  const PLAN_COLORS = {
    free: "bg-slate-100 text-slate-600",
    solo: "bg-blue-100 text-blue-700",
    pro: "bg-cyan-100 text-cyan-700",
    equipe: "bg-amber-100 text-amber-700",
  };
  const PLAN_LABELS = { free: "Gratuit", solo: "Solo", pro: "Pro", equipe: "Équipe" };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez votre compte, intégrations et workflows</p>
        </div>

        <div className="flex gap-8">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="w-48 shrink-0">
            {/* Avatar */}
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                {initials || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${PLAN_COLORS[plan]}`}>
                  {PLAN_LABELS[plan]}
                </span>
              </div>
            </div>
            <nav className="space-y-1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left flex items-center px-3 py-2.5 rounded-xl text-sm transition-all font-medium ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main ────────────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* ── COMPTE ─────────────────────────────────────────────────── */}
            {activeTab === "account" && (
              <>
                {/* Profil */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Profil</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
                      {initials || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">{displayName}</p>
                      <p className="text-sm text-slate-500">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Profil business */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Personnalisation de l&apos;assistant</h2>
                  <p className="text-xs text-slate-400 mb-5">Ces informations permettent à Autozen de vous répondre de façon plus pertinente.</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Votre métier / poste</label>
                      <input
                        value={profile.profession ?? ""}
                        onChange={e => setProfile(p => ({ ...p, profession: e.target.value }))}
                        placeholder="Consultant, Kiné, Artisan…"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Entreprise / activité</label>
                      <input
                        value={profile.businessName ?? ""}
                        onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))}
                        placeholder="Nom de votre entreprise"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Ville</label>
                      <input
                        value={profile.city ?? ""}
                        onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                        placeholder="Paris, Lyon…"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Ton préféré</label>
                      <select
                        value={profile.tone ?? "formal"}
                        onChange={e => setProfile(p => ({ ...p, tone: e.target.value as "formal" | "informal" }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none bg-white"
                      >
                        <option value="formal">Formel (vouvoyer)</option>
                        <option value="informal">Informel (tutoyer)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Contexte supplémentaire <span className="text-slate-400 font-normal">(optionnel)</span></label>
                    <textarea
                      value={profile.context ?? ""}
                      onChange={e => setProfile(p => ({ ...p, context: e.target.value }))}
                      rows={2}
                      placeholder="Ex : Je travaille principalement avec des PME dans le BTP, mes clients sont souvent peu à l'aise avec les outils numériques."
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl disabled:opacity-40 transition-all"
                  >
                    {profileSaved ? "✓ Sauvegardé !" : profileSaving ? "Sauvegarde…" : "Sauvegarder le profil"}
                  </button>
                </div>

                {/* Push notifications */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg">🔔</div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Notifications push</h2>
                        <p className="text-xs text-slate-400">Brief du matin, messages WA, alertes — sur mobile et desktop</p>
                      </div>
                    </div>
                    <button
                      onClick={togglePush}
                      disabled={pushBusy}
                      className={`relative w-12 h-6 rounded-full transition-all disabled:opacity-50 ${pushEnabled ? "bg-blue-600" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${pushEnabled ? "left-6" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* Integration limit banner */}
                {atIntegrationLimit && (
                  <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Limite d&apos;intégrations atteinte ({totalConnected}/{integrationLimit})
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {plan === "free" ? "Passez au plan Solo (9€/mois) pour 3 apps, ou Pro pour tout débloquer." : "Passez au plan Pro pour des intégrations illimitées."}
                      </p>
                    </div>
                    <Link href="/pricing" className="shrink-0 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                      Voir les plans
                    </Link>
                  </div>
                )}

                {/* Google — connexion native */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email & Agenda Google</h2>
                  <p className="text-xs text-slate-400 mb-5">Gmail · Google Calendar — connexion officielle via Clerk OAuth.</p>
                  {oauthError && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{oauthError}</div>
                  )}
                  {googleAccount ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <GoogleLogo />
                          <div>
                            <p className="text-sm font-medium text-slate-900">Google</p>
                            <p className="text-xs text-slate-500">{googleAccount.emailAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => testIntegration("google")} disabled={health.google?.loading}
                            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2 py-1 rounded-lg transition-all disabled:opacity-40">
                            {health.google?.loading ? "Test…" : "Tester"}
                          </button>
                          <button onClick={() => disconnectGoogle(googleAccount.id)} disabled={googleBusy}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40">
                            Retirer
                          </button>
                        </div>
                      </div>
                      {health.google && !health.google.loading && (
                        <p className={`text-xs px-3 py-1.5 rounded-lg ${health.google.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {health.google.ok ? "✓" : "✗"} {health.google.message}
                        </p>
                      )}
                    </div>
                  ) : atIntegrationLimit ? (
                    <Link href="/pricing" className="flex items-center justify-center gap-2 w-full border border-dashed border-amber-300 bg-amber-50 text-amber-600 text-sm font-semibold px-4 py-3 rounded-xl hover:bg-amber-100 transition-all">
                      🔒 Limite atteinte — Voir les plans
                    </Link>
                  ) : (
                    <button onClick={connectGoogle} disabled={googleBusy}
                      className="flex items-center gap-3 w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all disabled:opacity-50">
                      {googleBusy
                        ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        : <GoogleLogo />
                      }
                      {googleBusy ? "Connexion…" : "Se connecter avec Google"}
                    </button>
                  )}
                </div>

                {/* ── Email IMAP (comptes entreprise/école) ───────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Email IMAP</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Pour les comptes entreprise/école non compatibles OAuth (ESME, etc.)</p>
                    </div>
                    {imapEmail && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>

                  {imapEmail ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{imapEmail}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Connecté via IMAP</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => testIntegration("imap")} disabled={health.imap?.loading}
                            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2 py-1 rounded-lg transition-all disabled:opacity-40">
                            {health.imap?.loading ? "Test…" : "Tester"}
                          </button>
                          <button onClick={disconnectImap} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Déconnecter</button>
                        </div>
                      </div>
                      {health.imap && !health.imap.loading && (
                        <p className={`text-xs px-3 py-1.5 rounded-lg ${health.imap.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {health.imap.ok ? "✓" : "✗"} {health.imap.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {!imapOpen ? (
                        atIntegrationLimit ? (
                          <Link href="/pricing" className="flex items-center justify-center gap-2 w-full border border-dashed border-amber-300 bg-amber-50 text-amber-600 text-sm py-3 rounded-xl hover:bg-amber-100 transition-all font-semibold">
                            🔒 Limite atteinte — Voir les plans
                          </Link>
                        ) : (
                          <button onClick={() => setImapOpen(true)}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 text-sm py-3 rounded-xl transition-all">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
                            Connecter un email IMAP
                          </button>
                        )
                      ) : (
                        <div className="space-y-3">
                          {/* Preset */}
                          <select onChange={e => {
                            const presets: Record<string, { host: string; smtpHost: string }> = {
                              esme: { host: "outlook.office365.com", smtpHost: "smtp.office365.com" },
                              gmail: { host: "imap.gmail.com", smtpHost: "smtp.gmail.com" },
                              yahoo: { host: "imap.mail.yahoo.com", smtpHost: "smtp.mail.yahoo.com" },
                            };
                            const p = presets[e.target.value];
                            if (p) setImapForm(f => ({ ...f, ...p }));
                          }} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="">Choisir un preset…</option>
                            <option value="esme">ESME / Outlook / Office365</option>
                            <option value="gmail">Gmail (mot de passe app)</option>
                            <option value="yahoo">Yahoo Mail</option>
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={imapForm.host} onChange={e => setImapForm(f => ({ ...f, host: e.target.value }))} placeholder="Serveur IMAP" className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 col-span-2" />
                            <input value={imapForm.user} onChange={e => setImapForm(f => ({ ...f, user: e.target.value }))} placeholder="Email (ex: victor@esme.fr)" className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 col-span-2" />
                            <input value={imapForm.password} type="password" onChange={e => setImapForm(f => ({ ...f, password: e.target.value }))} placeholder="Mot de passe" className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 col-span-2" />
                          </div>
                          {imapError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{imapError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => { setImapOpen(false); setImapError(""); }} className="flex-1 text-sm text-slate-500 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-all">Annuler</button>
                            <button onClick={saveImap} disabled={imapBusy} className="flex-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 font-semibold transition-all disabled:opacity-50">
                              {imapBusy ? "Test…" : "Tester et sauvegarder"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 text-center">Le mot de passe est chiffré dans Clerk. Pour ESME/Office365 : utilise ton mot de passe habituel.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ── Instagram Direct (Meta page token) ──────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Instagram Direct (Meta)</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Pour les DMs via ton Page Access Token Meta. Nécessite un compte Business + Page Facebook.</p>
                    </div>
                    {igPageName && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>

                  {igPageName ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{igPageName}</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Connecté via Meta Graph API</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => testIntegration("instagram")} disabled={health.instagram?.loading}
                            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2 py-1 rounded-lg transition-all disabled:opacity-40">
                            {health.instagram?.loading ? "Test…" : "Tester"}
                          </button>
                          <button onClick={disconnectIg} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Déconnecter</button>
                        </div>
                      </div>
                      {health.instagram && !health.instagram.loading && (
                        <p className={`text-xs px-3 py-1.5 rounded-lg ${health.instagram.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {health.instagram.ok ? "✓" : "✗"} {health.instagram.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {!igOpen ? (
                        atIntegrationLimit ? (
                          <Link href="/pricing" className="flex items-center justify-center gap-2 w-full border border-dashed border-amber-300 bg-amber-50 text-amber-600 text-sm py-3 rounded-xl hover:bg-amber-100 transition-all font-semibold">
                            🔒 Limite atteinte — Voir les plans
                          </Link>
                        ) : (
                          <button onClick={() => setIgOpen(true)}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 text-sm py-3 rounded-xl transition-all">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
                            Connecter Instagram avec token Meta
                          </button>
                        )
                      ) : (
                        <div className="space-y-3">
                          <input value={igForm.pageId} onChange={e => setIgForm(f => ({ ...f, pageId: e.target.value }))} placeholder="Page ID Facebook (ex: 123456789)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                          <input value={igForm.token} onChange={e => setIgForm(f => ({ ...f, token: e.target.value }))} placeholder="Page Access Token (de developers.facebook.com)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                          {igError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{igError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => { setIgOpen(false); setIgError(""); }} className="flex-1 text-sm text-slate-500 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-all">Annuler</button>
                            <button onClick={saveIgMeta} disabled={igBusy} className="flex-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 font-semibold transition-all disabled:opacity-50">
                              {igBusy ? "Vérification…" : "Sauvegarder"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 text-center">Token visible sur developers.facebook.com → ton app → Outils → Explorateur de token</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Autres intégrations → /integrations */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Toutes vos intégrations</h2>
                      <p className="text-xs text-slate-400">
                        {totalConnected} / {integrationLimit === 999 ? "∞" : integrationLimit} app{totalConnected !== 1 ? "s" : ""} connectée{totalConnected !== 1 ? "s" : ""} · Outlook, WhatsApp, Slack, Notion, GitHub…
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${totalConnected > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                      {totalConnected}
                    </div>
                  </div>
                  <Link href="/integrations"
                    className="flex items-center justify-between gap-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md font-semibold text-sm">
                    <div className="flex items-center gap-2.5">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Gérer mes intégrations
                    </div>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Connexion OAuth sécurisée via Pipedream Connect — 20+ apps disponibles
                  </p>
                </div>
                {/* Contacts */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Mes contacts</h2>
                      <p className="text-xs text-slate-400 mt-0.5">L&apos;assistant résoudra les noms pour envoyer des messages (&ldquo;envoie à Marc&rdquo;)</p>
                    </div>
                    <button onClick={() => setContactOpen(o => !o)}
                      className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all">
                      + Ajouter
                    </button>
                  </div>

                  {contactOpen && (
                    <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom (ex: Marc)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      <input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="WhatsApp (ex: 33612345678)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      <input value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optionnel)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      <div className="flex gap-2">
                        <button onClick={() => { setContactOpen(false); setContactForm({ name: "", phone: "", email: "" }); }} className="flex-1 text-xs text-slate-500 border border-slate-200 rounded-xl py-2 hover:bg-slate-100 transition-all">Annuler</button>
                        <button onClick={saveContact} disabled={contactSaving || !contactForm.name} className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 font-semibold disabled:opacity-40 transition-all">
                          {contactSaving ? "Sauvegarde…" : "Enregistrer"}
                        </button>
                      </div>
                    </div>
                  )}

                  {contacts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Aucun contact enregistré</p>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-500">{[c.phone && `WA: ${c.phone}`, c.email].filter(Boolean).join(" · ")}</p>
                          </div>
                          <button onClick={() => deleteContact(c.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── TWENTY CRM ─────────────────────────────────────────────── */}
            {activeTab === "account" && <TwentyCrmSection />}

            {/* ── MODÈLES D'EMAIL ────────────────────────────────────────── */}
            {activeTab === "templates" && (
              <TemplatesTab router={router} />
            )}

            {/* ── AUTOMATISATIONS ─────────────────────────────────────────── */}
            {activeTab === "automations" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 mb-1">Automatisations planifiées</h2>
                    <p className="text-sm text-slate-500">Des prompts exécutés automatiquement selon un planning.</p>
                  </div>
                  <button
                    onClick={() => { setAutoForm({ schedule: "daily_8am", channel: "dashboard", enabled: true }); setAutoOpen(true); }}
                    className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all"
                  >
                    + Nouvelle
                  </button>
                </div>

                {automations.length === 0 && !autoOpen && (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
                    <p className="text-sm text-slate-400 mb-2">Aucune automatisation</p>
                    <p className="text-xs text-slate-300">Exemple : &ldquo;Chaque matin, envoie-moi un résumé de mes emails&rdquo;</p>
                  </div>
                )}

                <div className="space-y-3">
                  {automations.map(auto => (
                    <div key={auto.id} className={`rounded-2xl border p-4 flex items-start gap-3 ${auto.enabled ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900 truncate">{auto.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${auto.enabled ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            {auto.enabled ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-1">{auto.prompt}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>🕐 {SCHEDULE_OPTS.find(s => s.value === auto.schedule)?.label ?? auto.schedule}</span>
                          <span>{auto.channel === "wa" ? "📱 WhatsApp" : "💻 Dashboard"}</span>
                          {auto.lastRun && <span>Dernier : {new Date(auto.lastRun).toLocaleDateString("fr-FR")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => runAutomation(auto.id)}
                          disabled={autoRunning === auto.id}
                          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-all"
                          title="Exécuter maintenant"
                        >
                          {autoRunning === auto.id ? "…" : "▶"}
                        </button>
                        <button
                          onClick={() => toggleAutomation(auto.id)}
                          className={`relative w-10 h-5 rounded-full shrink-0 transition-all ${auto.enabled ? "bg-blue-500" : "bg-slate-300"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${auto.enabled ? "left-5" : "left-0.5"}`} />
                        </button>
                        <button
                          onClick={() => deleteAutomation(auto.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Supprimer"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {autoOpen && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Nouvelle automatisation</h3>
                    <input
                      value={autoForm.name ?? ""}
                      onChange={e => setAutoForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nom (ex: Brief du matin)"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <textarea
                      value={autoForm.prompt ?? ""}
                      onChange={e => setAutoForm(f => ({ ...f, prompt: e.target.value }))}
                      placeholder="Prompt (ex: Donne-moi un résumé de mes emails non lus et de mon agenda du jour)"
                      rows={3}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Planning</label>
                        <select
                          value={autoForm.schedule ?? "daily_8am"}
                          onChange={e => setAutoForm(f => ({ ...f, schedule: e.target.value }))}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none bg-white"
                        >
                          {SCHEDULE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Livraison</label>
                        <select
                          value={autoForm.channel ?? "dashboard"}
                          onChange={e => setAutoForm(f => ({ ...f, channel: e.target.value as "wa" | "dashboard" }))}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none bg-white"
                        >
                          <option value="dashboard">Dashboard</option>
                          <option value="wa">WhatsApp</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveAutomation}
                        disabled={autoSaving || !autoForm.name || !autoForm.prompt}
                        className="flex-1 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl disabled:opacity-40 transition-all"
                      >
                        {autoSaving ? "Sauvegarde…" : "Créer l'automatisation"}
                      </button>
                      <button
                        onClick={() => setAutoOpen(false)}
                        className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* ── WA Auto-Rules ─────────────────────────────────────── */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        Règles WhatsApp auto-réponse
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Si message contient un mot-clé → réponse automatique ou IA.</p>
                    </div>
                    <button
                      onClick={() => { setWaRuleForm({ triggerType: "contains", action: "reply_template", enabled: true }); setWaRuleOpen(true); }}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl transition-all"
                    >
                      + Règle
                    </button>
                  </div>

                  {waRules.length === 0 && !waRuleOpen && (
                    <p className="text-xs text-slate-400 italic">Aucune règle. Exemple : &ldquo;devis&rdquo; → réponse avec template tarifaire.</p>
                  )}

                  <div className="space-y-2">
                    {waRules.map(rule => (
                      <div key={rule.id} className={`rounded-xl border p-3 flex items-center gap-3 text-sm ${rule.enabled ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-700">
                            {rule.triggerType === "contains" ? "Contient" : rule.triggerType === "starts" ? "Commence par" : "Exact"} &ldquo;{rule.trigger}&rdquo;
                          </span>
                          <span className="text-slate-400 mx-1.5">→</span>
                          <span className="text-slate-600">
                            {rule.action === "ignore" ? "Ignorer" : rule.action === "reply_ai" ? "Réponse IA" : `"${(rule.replyText ?? "").slice(0, 40)}…"`}
                          </span>
                        </div>
                        <button onClick={() => toggleWaRule(rule.id)}
                          className={`relative w-9 h-5 rounded-full shrink-0 transition-all ${rule.enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${rule.enabled ? "left-4" : "left-0.5"}`} />
                        </button>
                        <button onClick={() => deleteWaRule(rule.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l7 7M10 3l-7 7" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {waRuleOpen && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-slate-800">Nouvelle règle WA</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={waRuleForm.triggerType ?? "contains"}
                          onChange={e => setWaRuleForm(f => ({ ...f, triggerType: e.target.value as WaRule["triggerType"] }))}
                          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white"
                        >
                          <option value="contains">Contient</option>
                          <option value="starts">Commence par</option>
                          <option value="exact">Exactement</option>
                        </select>
                        <input
                          value={waRuleForm.trigger ?? ""}
                          onChange={e => setWaRuleForm(f => ({ ...f, trigger: e.target.value }))}
                          placeholder="Mot-clé (ex: devis, rdv, prix…)"
                          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <select
                        value={waRuleForm.action ?? "reply_template"}
                        onChange={e => setWaRuleForm(f => ({ ...f, action: e.target.value as WaRule["action"] }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white"
                      >
                        <option value="reply_template">Répondre avec un template</option>
                        <option value="reply_ai">Laisser l&apos;IA répondre</option>
                        <option value="ignore">Ne pas répondre</option>
                      </select>
                      {waRuleForm.action === "reply_template" && (
                        <textarea
                          value={waRuleForm.replyText ?? ""}
                          onChange={e => setWaRuleForm(f => ({ ...f, replyText: e.target.value }))}
                          placeholder="Texte de réponse automatique…"
                          rows={3}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                        />
                      )}
                      <div className="flex gap-2">
                        <button onClick={saveWaRule} disabled={waRuleSaving || !waRuleForm.trigger}
                          className="flex-1 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl disabled:opacity-40 transition-all">
                          {waRuleSaving ? "Sauvegarde…" : "Créer la règle"}
                        </button>
                        <button onClick={() => setWaRuleOpen(false)}
                          className="text-sm text-slate-500 px-4 py-2 rounded-xl border border-slate-200 transition-all">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── WORKFLOWS N8N ───────────────────────────────────────────── */}
            {activeTab === "workflows" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 mb-1">Workflows n8n</h2>
                    <p className="text-sm text-slate-500">Activez ou désactivez vos automatisations en temps réel.</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full status-connected" />n8n local · :5678
                  </div>
                </div>

                {wfLoading && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                    Chargement…
                  </div>
                )}
                {wfError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{wfError}</div>
                )}
                {!wfLoading && !wfError && (
                  <div className="space-y-2">
                    {workflows.filter(w => w.active).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Actifs</p>
                        {workflows.filter(w => w.active).map(wf => <WorkflowToggle key={wf.id} wf={wf} onToggle={toggleWorkflow} toggling={toggling} />)}
                      </div>
                    )}
                    {workflows.filter(w => !w.active).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inactifs</p>
                        {workflows.filter(w => !w.active).map(wf => <WorkflowToggle key={wf.id} wf={wf} onToggle={toggleWorkflow} toggling={toggling} />)}
                      </div>
                    )}
                    {workflows.length === 0 && <p className="text-sm text-slate-400">Aucun workflow trouvé.</p>}
                  </div>
                )}
                <a href="http://localhost:5678" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1.5H10v3M10 1.5L5 6.5M3 4H1.5v7H8.5V9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Ouvrir n8n
                </a>
              </div>
            )}

            {/* ── ABONNEMENT ──────────────────────────────────────────────── */}
            {activeTab === "subscription" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 mb-1">Abonnement</h2>
                  <p className="text-sm text-slate-500">Plan actuel et options disponibles.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Plan actuel :</span>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan]}</span>
                </div>
                {/* Brief du Matin */}
                <div className="border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">☀️ Brief du Matin</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Digest automatique chaque matin (lun–ven à 8h) par WhatsApp.</p>
                    </div>
                    <button
                      onClick={() => setBriefEnabled(e => !e)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-all ${briefEnabled ? "bg-blue-500" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${briefEnabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                  {briefEnabled && (
                    <div className="space-y-2">
                      <input
                        value={briefWaNumber}
                        onChange={e => setBriefWaNumber(e.target.value)}
                        placeholder="Numéro WhatsApp (ex: 33612345678)"
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button onClick={saveBrief} disabled={briefSaving}
                        className="w-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl transition-all disabled:opacity-50">
                        {briefSaving ? "Sauvegarde…" : "Sauvegarder"}
                      </button>
                      <p className="text-xs text-slate-400">Nécessite WhatsApp Token configuré sur le serveur. Numéro sans + ni espaces.</p>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {([
                    { id: "solo", name: "Solo", price: "9€/mois", features: ["3 intégrations", "50 actions/jour", "1 utilisateur"] },
                    { id: "pro", name: "Pro", price: "19€/mois", features: ["Toutes intégrations", "Illimité", "1 utilisateur"], highlight: true },
                    { id: "equipe", name: "Équipe", price: "49€/mois", features: ["Toutes intégrations", "Illimité", "5 utilisateurs"] },
                  ] as const).map(p => (
                    <div key={p.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
                      "highlight" in p && p.highlight ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                    } ${plan === p.id ? "ring-2 ring-blue-400" : ""}`}>
                      {"highlight" in p && p.highlight && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="text-xs font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-full">Populaire</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-sm text-slate-500">{p.price}</span>
                      </div>
                      <ul className="space-y-1.5 flex-1">
                        {p.features.map(f => (
                          <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="text-emerald-500">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      {plan === p.id ? (
                        <span className="text-xs text-center text-blue-600 font-semibold py-2">Plan actuel</span>
                      ) : (
                        <button onClick={() => upgradePlan(p.id)} disabled={!!subBusy}
                          className={`text-xs font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-40 ${"highlight" in p && p.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}>
                          {subBusy === p.id
                            ? <span className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Redirection…</span>
                            : "Choisir"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
