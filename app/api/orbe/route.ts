/**
 * Orbe AI — Propulsé par OpenRouter (50+ modèles dont DeepSeek R1 gratuit)
 * Cerveau : deepseek/deepseek-r1:free (ou tout modèle via OPENROUTER_MODEL)
 * Muscles : Gmail, Calendar, WhatsApp, CRM, n8n, recherche, météo…
 */
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getUserWhapiMeta, whapiChannel } from "@/lib/whapi";
import { sendMetaWaMessage, storeWaMessage, countUnread, type WaMessage } from "@/lib/whatsapp-meta";
import { checkAndIncrementAction } from "@/lib/ratelimit";

export const maxDuration = 60;

const N8N_URL = process.env.N8N_URL || "http://localhost:5678";
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY ?? "placeholder" });
  return _openai;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gFetch(url: string, token: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  return r.json();
}

function encodeBase64url(s: string) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Appel n8n ─────────────────────────────────────────────────────────────────

async function callN8nWorkflow(webhookPath: string, payload: Record<string, unknown>): Promise<string> {
  try {
    const r = await fetch(`${N8N_URL}/webhook/${webhookPath}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return JSON.stringify({ error: `Workflow n8n "${webhookPath}" → ${r.status}` });
    const d = await r.json();
    return typeof d === "string" ? d : JSON.stringify(d);
  } catch (e) {
    return JSON.stringify({ error: `Workflow n8n inaccessible: ${(e as Error).message}` });
  }
}

// ── Exécution des outils ──────────────────────────────────────────────────────

type ToolCtx = {
  userId: string;
  googleToken: string | null;
  whapiToken: string | null;
  waMessages: WaMessage[];
  waMetaToken: string | undefined;
  waPhoneId: string | undefined;
  pdAccountIds: Record<string, string>;
};

async function executeTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<string> {
  const { userId, googleToken, whapiToken, waMessages, waMetaToken, waPhoneId, pdAccountIds } = ctx;
  const hasWa = !!whapiToken || !!waMetaToken || !!pdAccountIds.whatsapp_business;

  // ── n8n ──────────────────────────────────────────────────────────────────
  if (name === "lancer_workflow") {
    const { workflow, donnees } = args as { workflow: string; donnees?: Record<string, unknown> };
    return callN8nWorkflow(workflow, { ...(donnees ?? {}), source: "orbe-ai", userId });
  }
  if (name === "automatiser") {
    const { action, parametres } = args as { action: string; parametres?: Record<string, unknown> };
    const routingMap: Record<string, string> = {
      "relance_client": "orbe-relance-client", "rapport_hebdo": "Orbe — Rapport Hebdo Business",
      "brief_matin": "orbe-brief-matin", "envoyer_newsletter": "orbe-newsletter",
    };
    return callN8nWorkflow(routingMap[action] ?? action, { action, ...(parametres ?? {}), userId });
  }

  // ── Gmail ─────────────────────────────────────────────────────────────────
  if (name === "lire_emails") {
    if (!googleToken) return "❌ Google non connecté. Va dans /integrations.";
    const q = (args.query as string) || "is:unread";
    const max = Math.min((args.max as number) || 10, 20);
    const list = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`, googleToken);
    if (!list.messages?.length) return "Aucun email trouvé.";
    const emails = await Promise.all(list.messages.slice(0, 8).map(async (m: { id: string }) => {
      const msg = await gFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, googleToken);
      const hdr: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
      const h = (n: string) => hdr.find(x => x.name === n)?.value ?? "";
      return `- **${h("Subject") || "(sans objet)"}**\n  De: ${h("From").replace(/<.*>/, "").trim()} — ${h("Date").slice(0, 16)}\n  ${(msg.snippet || "").slice(0, 100)}`;
    }));
    return `📧 **${list.resultSizeEstimate ?? emails.length} email(s):**\n${emails.join("\n\n")}`;
  }
  if (name === "envoyer_email") {
    if (!googleToken) return "❌ Google non connecté.";
    const { to, subject, body } = args as { to: string; subject: string; body: string };
    if (!to?.includes("@")) return `⚠️ Adresse invalide : "${to}".`;
    const raw = encodeBase64url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`);
    const r = await gFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", googleToken, { method: "POST", body: JSON.stringify({ raw }) });
    return r.id ? `✅ Email envoyé à **${to}**.` : `❌ Erreur Gmail: ${JSON.stringify(r)}`;
  }
  if (name === "voir_agenda") {
    if (!googleToken) return "❌ Google non connecté.";
    const now = new Date();
    const tMin = (args.debut as string) || now.toISOString();
    const tMax = (args.fin as string) || new Date(now.getTime() + 7 * 86400000).toISOString();
    const data = await gFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}&maxResults=10&orderBy=startTime&singleEvents=true`, googleToken);
    if (!data.items?.length) return "Aucun événement sur cette période.";
    return `📅 **${data.items.length} événement(s):**\n${data.items.map((e: Record<string, unknown>) => {
      const s = (e.start as Record<string, string>) ?? {};
      const d = s.dateTime ? new Date(s.dateTime).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : s.date ?? "?";
      return `- **${e.summary}** — ${d}`;
    }).join("\n")}`;
  }
  if (name === "creer_evenement") {
    if (!googleToken) return "❌ Google non connecté.";
    const { titre, debut, fin, description } = args as { titre: string; debut: string; fin: string; description?: string };
    const r = await gFetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", googleToken, {
      method: "POST",
      body: JSON.stringify({ summary: titre, description, start: { dateTime: debut, timeZone: "Europe/Paris" }, end: { dateTime: fin, timeZone: "Europe/Paris" } }),
    });
    return r.id ? `✅ Événement **"${titre}"** créé. [Voir →](${r.htmlLink})` : `❌ Erreur Calendar: ${JSON.stringify(r)}`;
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  if (name === "voir_messages_whatsapp") {
    if (!hasWa) return "❌ WhatsApp non connecté. Va dans /integrations.";
    if (waMessages.length > 0) {
      const unread = countUnread(waMessages);
      const bySender = new Map<string, WaMessage[]>();
      for (const m of waMessages) {
        const key = m.incoming ? m.from : "__moi__";
        if (!bySender.has(key)) bySender.set(key, []);
        bySender.get(key)!.push(m);
      }
      const chats = Array.from(bySender.entries()).filter(([k]) => k !== "__moi__")
        .map(([phone, msgs]) => `- **${msgs.find(m => m.fromName !== phone)?.fromName ?? phone}** (+${phone})\n  Dernier: "${msgs[0]?.text?.slice(0, 60)}" — ${new Date((msgs[0]?.timestamp ?? 0) * 1000).toLocaleString("fr-FR")}`)
        .slice(0, 10);
      return `💬 **${chats.length} conversation(s) — ${unread} non lu(s):**\n${chats.join("\n")}`;
    }
    if (whapiToken) {
      const data = await whapiChannel(whapiToken, "chats?count=20");
      if (data?.chats?.length) {
        const chats = (data.chats as Record<string, unknown>[]).slice(0, 10).map(c => {
          const lm = c.last_message as Record<string, unknown> | undefined;
          const phone = String(c.id ?? "").split("@")[0];
          const text = (lm?.text as Record<string, string>)?.body || "";
          return `- **${(c.name as string) || phone}** (+${phone})\n  Dernier: "${text.slice(0, 60)}" — ${c.unread_count ? `🔴 ${c.unread_count} non lu(s)` : "lu"}`;
        });
        return `💬 **${chats.length} conversation(s):**\n${chats.join("\n")}`;
      }
    }
    return "Aucun message WhatsApp reçu pour l'instant.";
  }
  if (name === "lire_conversation_whatsapp") {
    if (!hasWa) return "❌ WhatsApp non connecté.";
    const { numero, limite } = args as { numero?: string; limite?: number };
    const count = limite ?? 20;
    if (whapiToken && numero) {
      const phone = numero.replace(/\D/g, "");
      const chatId = `${phone}@s.whatsapp.net`;
      const data = await whapiChannel(whapiToken, `messages/list/${encodeURIComponent(chatId)}?count=${count}`);
      if (data?.messages?.length) {
        const msgs = (data.messages as Record<string, unknown>[]).slice(-count).map(m => {
          const texte = (m.text as Record<string, string>)?.body ?? "";
          const heure = new Date(Number(m.timestamp ?? 0) * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          return `${m.from_me ? "🟦 Moi" : `🟩 ${m.from_name ?? numero}`} [${heure}]: ${texte}`;
        });
        return `💬 **Conversation avec +${phone}:**\n${msgs.join("\n")}`;
      }
    }
    const msgs = numero ? waMessages.filter(m => m.from === numero.replace(/\D/g, "")).slice(0, count) : waMessages.slice(0, count);
    if (!msgs.length) return `Aucun message trouvé${numero ? ` avec +${numero}` : ""}.`;
    return msgs.map(m => `${m.incoming ? `🟩 ${m.fromName}` : "🟦 Moi"}: ${m.text}`).join("\n");
  }
  if (name === "envoyer_whatsapp") {
    if (!hasWa) return "❌ WhatsApp non connecté.";
    const { to, message } = args as { to: string; message: string };
    if (!to || !message) return `⚠️ Manque : ${!to ? "le numéro" : "le message"}.`;
    const phone = to.replace(/\D/g, "");
    if (phone.length < 8) return `⚠️ Numéro invalide : "${to}"`;
    if (waMetaToken && waPhoneId) {
      const ok = await sendMetaWaMessage(phone, message);
      if (ok) {
        await storeWaMessage({ id: `sent_${Date.now()}`, from: phone, fromName: phone, text: message, timestamp: Math.floor(Date.now() / 1000), incoming: false, read: true }).catch(() => {});
        return `✅ WhatsApp envoyé à +${phone}.`;
      }
    }
    if (whapiToken) {
      const r = await whapiChannel(whapiToken, "messages/text", "POST", { to: phone, body: message });
      if (r?.sent) return `✅ WhatsApp envoyé à +${phone} via Whapi.`;
    }
    return "❌ Envoi WhatsApp échoué. Vérifie la connexion.";
  }

  // ── Contacts & CRM ────────────────────────────────────────────────────────
  if (name === "mes_contacts") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const pm = u.privateMetadata as Record<string, unknown>;
    type Contact = { id: string; name: string; phone?: string; email?: string; notes?: string };
    const contacts = (pm.userContacts as Contact[]) ?? [];
    if (!contacts.length) return "Aucun contact. Utilise ajouter_contact pour en créer.";
    return `👥 **${contacts.length} contacts:**\n${contacts.slice(0, 20).map(c => `- **${c.name}**${c.phone ? ` — WA: +${c.phone}` : ""}${c.email ? ` — ${c.email}` : ""}`).join("\n")}`;
  }
  if (name === "ajouter_contact") {
    const { nom, telephone, email, notes } = args as { nom: string; telephone?: string; email?: string; notes?: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const pm = u.privateMetadata as Record<string, unknown>;
    type Contact = { id: string; name: string; phone?: string; email?: string; notes?: string };
    const existing = (pm.userContacts as Contact[]) ?? [];
    const contact: Contact = { id: Date.now().toString(), name: nom, phone: telephone?.replace(/\D/g, ""), email, notes };
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { ...pm, userContacts: [...existing, contact] } });
    return `✅ Contact **${nom}** ajouté.`;
  }
  if (name === "mon_pipeline") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const pm = u.privateMetadata as Record<string, unknown>;
    type Deal = { id: string; title: string; stage: string; amount?: number; contactName?: string };
    const deals = (pm.deals as Deal[]) ?? [];
    if (!deals.length) return "Pipeline vide. Utilise creer_deal pour commencer.";
    const total = deals.filter(d => d.stage === "gagne").reduce((s, d) => s + (d.amount ?? 0), 0);
    const stages: Record<string, string> = { prospection: "🔵", propose: "🟡", negociation: "🟠", gagne: "🟢", perdu: "🔴" };
    return `💼 **Pipeline (${total.toLocaleString("fr-FR")} € signés):**\n${deals.map(d => `${stages[d.stage] ?? "⚪"} **${d.title}**${d.amount ? ` — ${d.amount.toLocaleString("fr-FR")} €` : ""}${d.contactName ? ` (${d.contactName})` : ""}`).join("\n")}`;
  }
  if (name === "creer_deal") {
    const { titre, montant, contact, etape } = args as { titre: string; montant?: number; contact?: string; etape?: string };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const pm = u.privateMetadata as Record<string, unknown>;
    type Deal = { id: string; title: string; stage: string; amount?: number; contactName?: string; createdAt: string };
    const deals = (pm.deals as Deal[]) ?? [];
    const newDeal: Deal = { id: `deal_${Date.now()}`, title: titre, stage: etape ?? "prospection", amount: montant, contactName: contact, createdAt: new Date().toISOString() };
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { ...pm, deals: [...deals, newDeal] } });
    return `✅ Deal **${titre}** créé${montant ? ` (${montant.toLocaleString("fr-FR")} €)` : ""}.`;
  }
  if (name === "creer_rappel") {
    const { titre, note, dansJours } = args as { titre: string; note?: string; dansJours: number };
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const pm = u.privateMetadata as Record<string, unknown>;
    type Reminder = { id: string; title: string; dueAt: string; note?: string; done?: boolean };
    const reminders = (pm.reminders as Reminder[]) ?? [];
    const dueAt = new Date(Date.now() + dansJours * 86400_000).toISOString();
    await clerk.users.updateUserMetadata(userId, { privateMetadata: { ...pm, reminders: [...reminders, { id: `rem_${Date.now()}`, title: titre, dueAt, note }] } });
    return `⏰ Rappel **"${titre}"** dans ${dansJours} jour${dansJours > 1 ? "s" : ""} (${new Date(dueAt).toLocaleDateString("fr-FR")}).`;
  }
  if (name === "mes_rappels") {
    const clerk = await clerkClient();
    const u = await clerk.users.getUser(userId);
    const pm = u.privateMetadata as Record<string, unknown>;
    type Reminder = { id: string; title: string; dueAt: string; note?: string; done?: boolean };
    const reminders = ((pm.reminders as Reminder[]) ?? []).filter(r => !r.done);
    if (!reminders.length) return "Aucun rappel en attente. 🎉";
    const now = new Date();
    return `⏰ **${reminders.length} rappel(s):**\n${reminders.map(r => `- ${new Date(r.dueAt) < now ? "🔴" : "🟡"} **${r.title}** — ${new Date(r.dueAt).toLocaleDateString("fr-FR")}${r.note ? ` (${r.note})` : ""}`).join("\n")}`;
  }
  if (name === "calculer_tva") {
    const { montant, type, taux } = args as { montant: number; type: "ht" | "ttc"; taux?: number };
    const rate = taux ?? 20;
    const ht = type === "ht" ? montant : montant / (1 + rate / 100);
    const tva = ht * rate / 100;
    return `💶 **TVA ${rate}%** — HT: **${ht.toFixed(2)} €** | TVA: **${tva.toFixed(2)} €** | **TTC: ${(ht + tva).toFixed(2)} €**`;
  }
  if (name === "recherche_web") {
    const { query } = args as { query: string };
    try {
      const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, { headers: { "User-Agent": "Orbe/3.0" } });
      const data = await r.json() as Record<string, unknown>;
      const parts: string[] = [];
      if (data.AbstractText) parts.push(String(data.AbstractText));
      if (data.Answer) parts.push(`**Réponse directe:** ${data.Answer}`);
      if (!parts.length) {
        const wr = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { headers: { "User-Agent": "Orbe/3.0" } });
        if (wr.ok) { const wd = await wr.json() as { extract?: string; title?: string }; if (wd.extract) parts.push(`**${wd.title}** — ${wd.extract.slice(0, 400)}`); }
      }
      return parts.join("\n\n") || `Aucun résultat trouvé pour "${query}".`;
    } catch { return "Erreur recherche web."; }
  }
  if (name === "meteo") {
    const { ville } = args as { ville: string };
    try {
      const r = await fetch(`https://wttr.in/${encodeURIComponent(ville)}?format=j1`, { headers: { "User-Agent": "Orbe/3.0" } });
      const data = await r.json() as Record<string, unknown>;
      const cur = (data.current_condition as Record<string, unknown>[])?.[0];
      if (!cur) return `Météo indisponible pour "${ville}".`;
      return `🌤️ **${ville}** — ${cur.temp_C}°C (ressenti ${cur.FeelsLikeC}°C) | ${(cur.weatherDesc as { value: string }[])?.[0]?.value ?? ""} | Humidité ${cur.humidity}%`;
    } catch { return "Erreur météo."; }
  }
  if (name === "infos_entreprise") {
    const { query } = args as { query: string };
    try {
      const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&page=1&per_page=3`, { headers: { Accept: "application/json" } });
      const data = await r.json() as Record<string, unknown>;
      const results = (data.results as Array<Record<string, unknown>>) ?? [];
      if (!results.length) return `Aucune entreprise trouvée pour "${query}".`;
      return results.slice(0, 2).map(c => {
        const siege = (c.siege as Record<string, unknown>) ?? {};
        return `🏢 **${c.nom_complet}** (${c.siren}) — ${c.activite_principale_libelle} — ${siege.adresse ?? siege.libelle_commune} — ${c.etat_administratif === "A" ? "✅ Actif" : "❌ Fermé"}`;
      }).join("\n\n");
    } catch { return "Erreur recherche entreprise."; }
  }

  return `❓ Outil inconnu : ${name}`;
}

// ── Schémas d'outils OpenAI format ───────────────────────────────────────────

type OAITool = OpenAI.Chat.ChatCompletionTool;

function buildTools(hasGoogle: boolean, hasWa: boolean): OAITool[] {
  const T = (name: string, description: string, properties: Record<string, unknown>, required?: string[]): OAITool => ({
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties, required: required ?? [] },
    },
  });

  const tools: OAITool[] = [
    T("lancer_workflow", "Déclencher un workflow n8n par son nom de webhook. Utilise pour les automatisations avancées.", {
      workflow: { type: "string", description: "Nom du webhook n8n (ex: orbe-relance-client)" },
      donnees:  { type: "object", description: "Données à envoyer au workflow" },
    }, ["workflow"]),
    T("automatiser", "Lancer une automatisation prédéfinie (relance client, rapport, newsletter, etc.)", {
      action:     { type: "string", enum: ["relance_client", "rapport_hebdo", "brief_matin", "envoyer_newsletter"] },
      parametres: { type: "object", description: "Paramètres spécifiques" },
    }, ["action"]),
    T("mes_contacts",    "Voir tous les contacts enregistrés.", {}, []),
    T("ajouter_contact", "Ajouter un contact.", { nom: { type: "string" }, telephone: { type: "string" }, email: { type: "string" }, notes: { type: "string" } }, ["nom"]),
    T("mon_pipeline",    "Voir le pipeline commercial.", {}, []),
    T("creer_deal",      "Créer un deal dans le pipeline.", { titre: { type: "string" }, montant: { type: "number" }, contact: { type: "string" }, etape: { type: "string", enum: ["prospection", "propose", "negociation", "gagne", "perdu"] } }, ["titre"]),
    T("creer_rappel",    "Créer un rappel dans X jours.", { titre: { type: "string" }, note: { type: "string" }, dansJours: { type: "number" } }, ["titre", "dansJours"]),
    T("mes_rappels",     "Voir les rappels en attente.", {}, []),
    T("calculer_tva",    "Calculer HT / TVA / TTC.", { montant: { type: "number" }, type: { type: "string", enum: ["ht", "ttc"] }, taux: { type: "number" } }, ["montant", "type"]),
    T("recherche_web",   "Chercher des informations sur internet.", { query: { type: "string" } }, ["query"]),
    T("meteo",           "Météo en temps réel pour une ville.", { ville: { type: "string" } }, ["ville"]),
    T("infos_entreprise", "Infos sur une entreprise française (SIREN, activité, statut actif/fermé).", { query: { type: "string" } }, ["query"]),
  ];

  if (hasGoogle) tools.push(
    T("lire_emails",     "Lire les emails Gmail.", { query: { type: "string", description: "Filtre Gmail ex: is:unread, from:client@mail.com" }, max: { type: "number" } }),
    T("envoyer_email",   "Envoyer un email via Gmail.", { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, ["to", "subject", "body"]),
    T("voir_agenda",     "Voir Google Calendar.", { debut: { type: "string", description: "ISO 8601" }, fin: { type: "string" } }),
    T("creer_evenement", "Créer un événement Google Calendar.", { titre: { type: "string" }, debut: { type: "string", description: "ISO 8601 ex: 2026-06-10T14:00:00" }, fin: { type: "string" }, description: { type: "string" } }, ["titre", "debut", "fin"]),
  );

  if (hasWa) tools.push(
    T("voir_messages_whatsapp",     "Voir les conversations WhatsApp récentes.", {}, []),
    T("lire_conversation_whatsapp", "Lire l'historique d'une conversation WhatsApp.", { numero: { type: "string", description: "Numéro sans + ni espaces" }, limite: { type: "number" } }),
    T("envoyer_whatsapp",           "Envoyer un message WhatsApp.", { to: { type: "string", description: "Numéro sans + ni espaces" }, message: { type: "string" } }, ["to", "message"]),
  );

  return tools;
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(date: string): string {
  return `Tu es **Orbe**, un assistant IA personnel créé pour gérer la vie pro d'un indépendant ou PME française.
Aujourd'hui : ${date}

## ADAPTATION AUTOMATIQUE
- Réponds TOUJOURS dans la langue de l'utilisateur (français si français, anglais si anglais, etc.)
- Ton technique et précis pour le code/calcul, conversationnel pour les questions ordinaires
- Concis par défaut (≤200 mots) sauf demande de détail

## Tes capacités
📧 **Email** : lire, envoyer, chercher dans Gmail
📅 **Agenda** : voir et créer des événements Google Calendar
💬 **WhatsApp** : voir conversations, lire messages, envoyer
👥 **Contacts & CRM** : gérer contacts, deals, pipeline commercial
⚡ **n8n Automatisation** : déclencher des workflows n8n
💶 **Finance** : TVA, devis, calculs commerciaux
🔍 **Recherche** : internet, entreprises FR (SIREN), météo

## Règles absolues
1. Si une information manque (destinataire, date, montant) → DEMANDE avant d'agir
2. Jamais de placeholder (exemple@mail.com, +33600000000)
3. Toujours confirmer avant une action irréversible
4. Sauvegarde les préférences importantes de l'utilisateur mentalement

## Comportement proactif
- Après un devis → propose creer_rappel (3 jours)
- Après une réunion planifiée → propose de préparer un brief
- Matin → propose voir_agenda du jour`;
}

// ── Handler principal avec streaming OpenRouter ───────────────────────────────

type OAIMessage = OpenAI.Chat.ChatCompletionMessageParam;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const body    = await req.json() as Record<string, unknown>;
    const message = String(body?.message ?? "").slice(0, 4000).trim();
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history)
      ? (body.history as Array<Record<string, unknown>>)
          .slice(-12)
          .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map(m => ({ role: m.role as "user" | "assistant", content: m.content as string }))
      : [];

    if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });

    const { allowed, remaining } = await checkAndIncrementAction(userId);
    if (!allowed) return NextResponse.json({ error: "Limite journalière atteinte.", upgrade: true }, { status: 429 });

    // ── Récupération des tokens ──────────────────────────────────────────────
    let googleToken:  string | null          = null;
    let whapiToken:   string | null          = process.env.WHAPI_TOKEN || null;
    let waMessages:   WaMessage[]            = [];
    let pdAccountIds: Record<string, string> = {};
    const waMetaToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId   = process.env.WHATSAPP_PHONE_NUMBER_ID;

    try {
      const clerk  = await clerkClient();
      const gData  = await clerk.users.getUserOauthAccessToken(userId, "google").catch(() => ({ data: [] }));
      googleToken  = gData.data?.[0]?.token ?? null;
      const u      = await clerk.users.getUser(userId);
      const pm     = u.privateMetadata as Record<string, unknown>;
      waMessages   = (pm.waMessages  as WaMessage[]) ?? [];
      pdAccountIds = (pm.pipedream   as Record<string, string>) ?? {};
      if (!whapiToken) whapiToken = (await getUserWhapiMeta(userId)).token;
    } catch { /* tokens optionnels */ }

    const hasWa  = !!whapiToken || !!waMetaToken || !!pdAccountIds.whatsapp_business;
    const tools  = buildTools(!!googleToken, hasWa);
    const ctx    = { userId, googleToken, whapiToken, waMessages, waMetaToken, waPhoneId, pdAccountIds };
    const date   = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const systemPrompt = buildSystemPrompt(date);

    // Messages history (sans le system prompt — on l'injecte à chaque appel)
    const msgs: OAIMessage[] = [
      ...history.map(m => ({ role: m.role, content: m.content } as OAIMessage)),
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    let finalText = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ── Boucle agentic avec OpenRouter ──────────────────────────────
          for (let turn = 0; turn < 5; turn++) {
            let accText = "";
            const toolCallsAcc: Record<number, { id: string; name: string; args: string }> = {};
            let finishReason: string | null = null;

            const orStream = await getOpenAI().chat.completions.create({
              model:       process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1:free",
              max_tokens:  1536,
              temperature: 0.5,
              messages:    [{ role: "system", content: systemPrompt }, ...msgs],
              tools:       tools.length > 0 ? tools : undefined,
              tool_choice: tools.length > 0 ? "auto" : undefined,
              stream:      true,
            });

            for await (const chunk of orStream) {
              const choice = chunk.choices?.[0];
              if (!choice) continue;
              finishReason = choice.finish_reason ?? finishReason;
              const delta = choice.delta;

              if (delta.content) {
                accText += delta.content;
                send({ c: delta.content });
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { id: "", name: "", args: "" };
                  if (tc.id) toolCallsAcc[idx].id = tc.id;
                  if (tc.function?.name) {
                    if (!toolCallsAcc[idx].name) send({ tool: tc.function.name });
                    toolCallsAcc[idx].name = tc.function.name;
                  }
                  if (tc.function?.arguments) toolCallsAcc[idx].args += tc.function.arguments;
                }
              }
            }

            const toolCalls = Object.values(toolCallsAcc).filter(tc => tc.name);

            if (finishReason !== "tool_calls" || toolCalls.length === 0) {
              finalText = accText;
              break;
            }

            // Assistant message avec tool_calls pour l'historique
            msgs.push({
              role: "assistant",
              content: accText || null,
              tool_calls: toolCalls.map(tc => ({
                id:   tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.args },
              })),
            });

            // Exécuter les outils en parallèle
            const toolResults = await Promise.all(
              toolCalls.map(async tc => {
                let args: Record<string, unknown> = {};
                try { args = JSON.parse(tc.args || "{}"); } catch { /* */ }
                const result = await executeTool(tc.name, args, ctx);
                send({ tool_done: tc.name });
                return { role: "tool" as const, tool_call_id: tc.id, content: result };
              })
            );

            for (const r of toolResults) msgs.push(r);
          }

          send({ done: true, remaining });
        } catch (err) {
          const msg = (err as Error).message ?? String(err);
          send({ c: `\n\n❌ Erreur : ${msg.slice(0, 200)}` });
          send({ done: true, remaining: remaining ?? 0 });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (err) {
    console.error("[orbe]", err);
    return NextResponse.json({ response: `❌ Erreur: ${(err as Error)?.message?.slice(0, 150) ?? "inconnue"}` }, { status: 200 });
  }
}
