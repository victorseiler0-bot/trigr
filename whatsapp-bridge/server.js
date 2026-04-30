import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import pino from "pino";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fetch as nodeFetch } from "undici";

const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());
const logger = pino({ level: "silent" });

// ── Persistance des données WA ────────────────────────────────────────────────

const DATA_FILE = "./wa-data.json";

function loadWaData() {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = JSON.parse(readFileSync(DATA_FILE, "utf8"));
      return { contacts: raw.contacts ?? {}, chats: raw.chats ?? {}, messages: raw.messages ?? {} };
    }
  } catch {}
  return { contacts: {}, chats: {}, messages: {} };
}

let _saveTimer = null;
function scheduleSave() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try { writeFileSync(DATA_FILE, JSON.stringify({ contacts, chats, messages })); } catch {}
  }, 3000);
}

// ── WhatsApp state ─────────────────────────────────────────────────────────────

let sock = null;
let qrBase64 = null;
let waStatus = "disconnected";
const loaded = loadWaData();
const contacts = loaded.contacts;
const chats = loaded.chats;
const messages = loaded.messages;

function upsertContact(c) {
  if (!c?.id) return;
  contacts[c.id] = {
    id: c.id,
    name: c.name ?? c.notify ?? c.verifiedName ?? contacts[c.id]?.name ?? c.id.split("@")[0],
    phone: c.id.split("@")[0],
  };
  scheduleSave();
}

function upsertChat(c) {
  if (!c?.id) return;
  chats[c.id] = {
    id: c.id,
    name: c.name ?? contacts[c.id]?.name ?? c.id.split("@")[0],
    isGroup: isJidGroup(c.id),
    unread: c.unreadCount ?? chats[c.id]?.unread ?? 0,
    timestamp: Number(c.conversationTimestamp ?? chats[c.id]?.timestamp ?? 0),
  };
  scheduleSave();
}

function getContactName(jid) {
  return contacts[jid]?.name ?? jid?.split("@")[0] ?? "?";
}

function storeMessage(jid, m) {
  if (!jid) return;
  const text =
    m.message?.conversation ??
    m.message?.extendedTextMessage?.text ??
    m.message?.imageMessage?.caption ?? "";
  if (!text) return;
  if (!messages[jid]) messages[jid] = [];
  messages[jid].push({
    id: m.key.id,
    fromMe: m.key.fromMe ?? false,
    from: m.key.fromMe ? "Moi" : getContactName(m.key.remoteJid),
    text,
    timestamp: Number(m.messageTimestamp ?? 0),
  });
  if (messages[jid].length > 50) messages[jid] = messages[jid].slice(-50);
}

let pairingCode = null;
let reconnectDelay = 3000;

async function startWhatsApp() {
  // Ferme proprement le socket précédent avant d'en créer un nouveau
  if (sock) {
    try { sock.ws?.close(); } catch {}
    sock = null;
  }
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version, logger, auth: state,
    browser: ["Trigr", "Chrome", "120.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 2000,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) { qrBase64 = await QRCode.toDataURL(qr); waStatus = "qr"; }
    if (connection === "connecting") { if (waStatus !== "qr") waStatus = "connecting"; }
    if (connection === "open") {
      waStatus = "connected"; qrBase64 = null; pairingCode = null;
      reconnectDelay = 3000; // reset backoff
      console.log("[WA] Connecté :", sock.user?.id);
    }
    if (connection === "close") {
      const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
      const loggedOut = code === DisconnectReason.loggedOut;
      waStatus = "disconnected"; qrBase64 = null; pairingCode = null;
      console.log("[WA] Déconnecté code:", code, "- retry dans", reconnectDelay, "ms");
      // Backoff exponentiel pour éviter les boucles rapides qui causent des 408
      const delay = loggedOut ? 2000 : reconnectDelay;
      reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
      setTimeout(startWhatsApp, delay);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("contacts.upsert", (l) => { console.log("[WA] contacts.upsert:", l.length); l.forEach(upsertContact); });
  sock.ev.on("contacts.update", (l) => l.forEach(upsertContact));
  sock.ev.on("chats.upsert", (l) => { console.log("[WA] chats.upsert:", l.length); l.forEach(upsertChat); });
  sock.ev.on("chats.update", (l) => l.forEach(upsertChat));
  sock.ev.on("chats.set", ({ chats: l, isLatest }) => {
    console.log("[WA] chats.set:", l?.length, "isLatest:", isLatest);
    l?.forEach(upsertChat);
  });
  sock.ev.on("messages.upsert", ({ messages: l, type }) => {
    if (type !== "notify" && type !== "append") return;
    l.forEach((m) => {
      const jid = jidNormalizedUser(m.key.remoteJid ?? "");
      if (!isJidBroadcast(jid)) storeMessage(jid, m);
    });
  });
  sock.ev.on("messaging-history.set", ({ chats: hC, contacts: hCo, messages: hM, isLatest }) => {
    console.log("[WA] messaging-history.set — chats:", hC?.length, "contacts:", hCo?.length, "msgs:", hM?.length, "latest:", isLatest);
    hCo?.forEach(upsertContact);
    hC?.forEach(upsertChat);
    hM?.forEach((m) => {
      const jid = jidNormalizedUser(m.key.remoteJid ?? "");
      if (!isJidBroadcast(jid)) storeMessage(jid, m);
    });
  });
}

// ── Apple iCloud state ─────────────────────────────────────────────────────────

const APPLE_CONFIG_FILE = "./apple-config.json";

function loadAppleConfig() {
  if (!existsSync(APPLE_CONFIG_FILE)) return null;
  try { return JSON.parse(readFileSync(APPLE_CONFIG_FILE, "utf8")); } catch { return null; }
}

function saveAppleConfig(cfg) {
  writeFileSync(APPLE_CONFIG_FILE, JSON.stringify(cfg), "utf8");
}

let appleConfig = loadAppleConfig();

function appleAuth(cfg) {
  return "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
}

async function caldavRequest(url, method, body, cfg, extra = {}) {
  const headers = {
    Authorization: appleAuth(cfg),
    "Content-Type": "application/xml; charset=utf-8",
    Depth: "1",
    ...extra,
  };
  const r = await nodeFetch(url, { method, headers, body: body ?? undefined, redirect: "follow" });
  return { status: r.status, text: await r.text() };
}

// Extrait un href path depuis une réponse XML (gère prefixes DAV: majuscules/minuscules)
function extractHref(xml) {
  // Cherche le premier <href> qui ressemble à un path iCloud (commence par /)
  const matches = [...xml.matchAll(/<[A-Za-z]:href>(\/?[^<]+)<\/[A-Za-z]:href>/g)];
  const paths = matches.map(m => m[1].trim()).filter(p => p.startsWith("/") && p.length > 1);
  return paths[0] ?? null;
}

function extractHrefInsideTag(xml, tag) {
  // Cherche un <href> à l'intérieur d'un tag spécifique (ex: calendar-home-set)
  const tagMatch = xml.match(new RegExp(`<[A-Za-z]:${tag}[^>]*>([\\s\\S]*?)<\\/[A-Za-z]:${tag}>`, "i"));
  if (!tagMatch) return null;
  const inner = tagMatch[1];
  const hrefMatch = inner.match(/<[A-Za-z]:href>([^<]+)<\/[A-Za-z]:href>/);
  return hrefMatch ? hrefMatch[1].trim() : null;
}

async function discoverCalDavHome(cfg) {
  // Étape 1 : Discover principal URL
  const propfind = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`;
  const r = await caldavRequest("https://caldav.icloud.com", "PROPFIND", propfind, cfg, { Depth: "0" });
  if (r.status === 401) throw new Error("Identifiants invalides (401). Vérifie ton Apple ID et ton mot de passe d'app.");
  if (r.status >= 400) throw new Error(`Apple CalDAV erreur ${r.status}`);

  // Cherche le principal dans current-user-principal, sinon prend le premier path valide
  let principalPath = extractHrefInsideTag(r.text, "current-user-principal") ?? extractHref(r.text);
  if (!principalPath) throw new Error("Réponse Apple inattendue — principal URL introuvable");
  const principalUrl = "https://caldav.icloud.com" + principalPath.replace(/^https?:\/\/[^/]+/, "");

  // Étape 2 : Get calendar home set
  const home = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop>
</d:propfind>`;
  const r2 = await caldavRequest(principalUrl, "PROPFIND", home, cfg, { Depth: "0" });
  if (r2.status >= 400) throw new Error(`Apple CalDAV home erreur ${r2.status}`);

  const homePath = extractHrefInsideTag(r2.text, "calendar-home-set") ?? extractHref(r2.text);
  if (!homePath) throw new Error("Réponse Apple inattendue — calendar home introuvable");
  return "https://caldav.icloud.com" + homePath.replace(/^https?:\/\/[^/]+/, "");
}

function parseVEvents(icalText) {
  const events = [];
  const blocks = icalText.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g);
  for (const m of blocks) {
    const b = m[1];
    const get = (k) => {
      const match = b.match(new RegExp(`\\n${k}[^:]*:([^\\r\\n]*)`));
      return match?.[1]?.trim() ?? "";
    };
    const start = get("DTSTART");
    const end = get("DTEND");
    if (!get("SUMMARY") && !start) continue;
    events.push({
      uid: get("UID"),
      summary: get("SUMMARY") || "(sans titre)",
      start: formatDate(start),
      end: formatDate(end),
      location: get("LOCATION"),
      description: get("DESCRIPTION").slice(0, 200),
    });
  }
  return events;
}

function formatDate(dt) {
  if (!dt) return "";
  // YYYYMMDDTHHMMSSZ or YYYYMMDD
  const m = dt.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return dt;
  const [, y, mo, d, h, mi] = m;
  return h ? `${d}/${mo}/${y} ${h}:${mi}` : `${d}/${mo}/${y}`;
}

function parseVCards(text) {
  const cards = [];
  for (const block of text.matchAll(/BEGIN:VCARD([\s\S]*?)END:VCARD/g)) {
    const b = block[1];
    const get = (k) => b.match(new RegExp(`\\n${k}[^:]*:([^\\r\\n]*)`))?.[1]?.trim() ?? "";
    const name = get("FN");
    if (!name) continue;
    cards.push({ name, phone: get("TEL"), email: get("EMAIL") });
  }
  return cards;
}

// ── Routes WhatsApp ───────────────────────────────────────────────────────────

app.get("/", (_, res) => res.json({ service: "Trigr Bridge", wa: waStatus, apple: !!appleConfig }));

app.get("/status", (_, res) => {
  const user = sock?.user;
  res.json({
    status: waStatus,
    phone: user?.id ? user.id.split(":")[0].split("@")[0] : null,
    name: user?.name ?? null,
    pairingCode: pairingCode ?? null,
  });
});

app.get("/qr", (_, res) => {
  if (!qrBase64) return res.status(404).json({ error: "Pas de QR" });
  res.json({ qr: qrBase64 });
});

app.post("/pairing-code", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Numéro requis" });
  if (waStatus === "connected") return res.status(400).json({ error: "Déjà connecté" });

  const digits = phone.replace(/\D/g, "");
  try {
    // Attend que le socket soit prêt (état "connecting" ou "qr")
    let attempts = 0;
    while (!sock?.requestPairingCode && attempts < 10) {
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    const code = await sock.requestPairingCode(digits);
    pairingCode = code;
    waStatus = "pairing";
    qrBase64 = null;
    console.log("[WA] Code couplage :", code);
    res.json({ code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/pairing-code", (_, res) => {
  if (!pairingCode) return res.status(404).json({ error: "Pas de code actif" });
  res.json({ code: pairingCode, status: waStatus });
});

app.post("/logout", async (_, res) => {
  try { await sock?.logout(); } catch {}
  waStatus = "disconnected"; qrBase64 = null;
  res.json({ ok: true });
  // Restart immédiatement pour générer un nouveau QR
  setTimeout(startWhatsApp, 1500);
});

app.get("/chats", (_, res) => {
  if (waStatus !== "connected") return res.status(503).json({ error: "Non connecté" });
  const list = Object.values(chats)
    .filter(c => !isJidBroadcast(c.id) && !c.id.includes("newsletter"))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 25);
  res.json({ chats: list });
});

app.get("/contacts", (_, res) => {
  if (waStatus !== "connected") return res.status(503).json({ error: "Non connecté" });
  const list = Object.values(contacts)
    .filter(c => c.id.endsWith("@s.whatsapp.net") && c.name !== c.phone)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);
  res.json({ contacts: list });
});

app.get("/messages/:jid", (req, res) => {
  if (waStatus !== "connected") return res.status(503).json({ error: "Non connecté" });
  const { jid } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const list = (messages[jid] ?? []).slice(-limit);
  res.json({ messages: list, total: messages[jid]?.length ?? 0 });
});

// Derniers messages envoyés (fromMe) toutes conversations confondues
app.get("/sent", (_, res) => {
  const sent = [];
  for (const [jid, msgs] of Object.entries(messages)) {
    const chat = store.chats.get(jid);
    const chatName = chat?.name ?? getContactName(jid);
    for (const m of msgs) {
      if (m.fromMe) sent.push({ ...m, chatName, jid });
    }
  }
  sent.sort((a, b) => b.timestamp - a.timestamp);
  res.json({ messages: sent.slice(0, 20) });
});

app.post("/send", async (req, res) => {
  if (waStatus !== "connected") return res.status(503).json({ error: "Non connecté" });
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Champs manquants" });
  try {
    const jid = to.includes("@") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    const sent = await sock.sendMessage(jid, { text: message });
    res.json({ ok: true, id: sent?.key?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Routes Apple iCloud ────────────────────────────────────────────────────────

app.post("/apple/configure", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Apple ID et mot de passe requis" });
  try {
    const cfg = { username, password };
    // Test credentials with a PROPFIND
    const test = await caldavRequest("https://caldav.icloud.com", "PROPFIND",
      `<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
      cfg, { Depth: "0" });
    if (test.status === 401) return res.status(401).json({ error: "Identifiants invalides. Utilise un mot de passe d'app spécifique." });
    if (test.status >= 400) return res.status(400).json({ error: `Erreur Apple (${test.status})` });
    appleConfig = cfg;
    saveAppleConfig(cfg);
    res.json({ ok: true, username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/apple/status", (_, res) => {
  res.json({ configured: !!appleConfig, username: appleConfig?.username ?? null });
});

app.delete("/apple/configure", (_, res) => {
  appleConfig = null;
  if (existsSync(APPLE_CONFIG_FILE)) {
    try { writeFileSync(APPLE_CONFIG_FILE, "{}", "utf8"); } catch {}
  }
  res.json({ ok: true });
});

app.get("/apple/calendar", async (req, res) => {
  if (!appleConfig) return res.status(503).json({ error: "Apple non configuré" });
  try {
    const home = await discoverCalDavHome(appleConfig);

    // Get calendar list
    const calList = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">
  <d:prop><d:displayname/><c:supported-calendar-component-set/></d:prop>
</d:propfind>`;
    const calListRes = await caldavRequest(home, "PROPFIND", calList, appleConfig);
    const calUrls = [...calListRes.text.matchAll(/<d:href>([^<]+)<\/d:href>/g)]
      .map(m => m[1])
      .filter(u => u !== home.replace("https://caldav.icloud.com", "") && u.endsWith("/"));

    // Fetch events for next 14 days
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 86400000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const report = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmt(now)}" end="${fmt(end)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

    const events = [];
    for (const calUrl of calUrls.slice(0, 5)) {
      const fullUrl = "https://caldav.icloud.com" + calUrl;
      const r = await caldavRequest(fullUrl, "REPORT", report, appleConfig, { Depth: "1" });
      if (r.status < 400) events.push(...parseVEvents(r.text));
    }

    events.sort((a, b) => a.start.localeCompare(b.start));
    res.json({ events: events.slice(0, 30) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/apple/calendar/create", async (req, res) => {
  if (!appleConfig) return res.status(503).json({ error: "Apple non configuré" });
  const { summary, start, end, location, description } = req.body;
  if (!summary || !start || !end) return res.status(400).json({ error: "summary, start, end requis" });

  try {
    const home = await discoverCalDavHome(appleConfig);
    const toIcal = (dt) => dt.replace(/[^0-9T]/g, "").replace("T", "T").slice(0, 15) + "Z";
    const uid = `trigr-${Date.now()}@trigr.app`;
    const ical = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Trigr//FR",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${toIcal(start)}`,
      `DTEND:${toIcal(end)}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : "",
      description ? `DESCRIPTION:${description}` : "",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");

    const url = `${home.replace(/\/$/, "")}/calendar/${uid}.ics`;
    const r = await nodeFetch(url, {
      method: "PUT",
      headers: { Authorization: appleAuth(appleConfig), "Content-Type": "text/calendar; charset=utf-8" },
      body: ical,
    });
    if (r.status >= 400) return res.status(r.status).json({ error: `Erreur Apple (${r.status})` });
    res.json({ ok: true, uid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/apple/contacts", async (req, res) => {
  if (!appleConfig) return res.status(503).json({ error: "Apple non configuré" });
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Discover CardDAV
    const disc = await nodeFetch("https://contacts.icloud.com/.well-known/carddav", {
      method: "PROPFIND",
      headers: {
        Authorization: appleAuth(appleConfig),
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "0",
      },
      body: `<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
      redirect: "follow",
    });
    const discText = await disc.text();
    const cardHomeMatch = discText.match(/<d:href>([^<]+)<\/d:href>/);
    if (!cardHomeMatch) return res.status(500).json({ error: "CardDAV non trouvé" });

    const cardHome = "https://contacts.icloud.com" + cardHomeMatch[1].replace(/^https?:\/\/[^/]+/, "");
    const report = `<?xml version="1.0" encoding="utf-8"?>
<c:addressbook-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:carddav">
  <d:prop><d:getetag/><c:address-data/></d:prop>
  <c:filter><c:prop-filter name="FN"/></c:filter>
</c:addressbook-query>`;

    const r = await nodeFetch(cardHome, {
      method: "REPORT",
      headers: {
        Authorization: appleAuth(appleConfig),
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "1",
      },
      body: report,
    });
    const text = await r.text();
    const contacts = parseVCards(text).slice(0, limit);
    res.json({ contacts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Démarrage ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`[Bridge] Port ${PORT} | WA: starting | Apple: ${!!appleConfig}`));
startWhatsApp();
