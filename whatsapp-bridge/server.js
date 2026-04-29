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

const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());

const logger = pino({ level: "silent" });

let sock = null;
let qrBase64 = null;
let status = "disconnected";

// In-memory store (remplace makeInMemoryStore)
const contacts = {};   // { jid: { id, name, phone } }
const chats = {};      // { jid: { id, name, isGroup, unread, timestamp } }
const messages = {};   // { jid: [msg, ...] (max 50) }

function upsertContact(c) {
  if (!c.id) return;
  contacts[c.id] = {
    id: c.id,
    name: c.name ?? c.notify ?? c.verifiedName ?? contacts[c.id]?.name ?? c.id.split("@")[0],
    phone: c.id.split("@")[0],
  };
}

function upsertChat(c) {
  if (!c.id) return;
  chats[c.id] = {
    id: c.id,
    name: c.name ?? contacts[c.id]?.name ?? c.id.split("@")[0],
    isGroup: isJidGroup(c.id),
    unread: c.unreadCount ?? chats[c.id]?.unread ?? 0,
    timestamp: c.conversationTimestamp ?? chats[c.id]?.timestamp ?? 0,
  };
}

function storeMessage(jid, m) {
  if (!jid) return;
  if (!messages[jid]) messages[jid] = [];
  const text =
    m.message?.conversation ??
    m.message?.extendedTextMessage?.text ??
    m.message?.imageMessage?.caption ?? "";
  if (!text) return;
  messages[jid].push({
    id: m.key.id,
    fromMe: m.key.fromMe ?? false,
    from: m.key.fromMe ? "Moi" : (contacts[m.key.remoteJid]?.name ?? m.key.remoteJid?.split("@")[0] ?? "?"),
    text,
    timestamp: Number(m.messageTimestamp ?? 0),
  });
  if (messages[jid].length > 50) messages[jid] = messages[jid].slice(-50);

  // Update chat timestamp
  if (chats[jid]) chats[jid].timestamp = Number(m.messageTimestamp ?? chats[jid].timestamp);
}

// ── Bridge ─────────────────────────────────────────────────────────────────────

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ["Trigr", "Chrome", "120.0"],
    syncFullHistory: true,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });

  // ── Events ──────────────────────────────────────────────────────────────────

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrBase64 = await QRCode.toDataURL(qr);
      status = "qr";
      console.log("[WA] QR prêt");
    }

    if (connection === "connecting") status = "connecting";

    if (connection === "open") {
      status = "connected";
      qrBase64 = null;
      console.log("[WA] Connecté :", sock.user?.id);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : 0;
      const reconnect = code !== DisconnectReason.loggedOut;
      status = "disconnected";
      qrBase64 = null;
      console.log("[WA] Déconnecté code:", code);
      if (reconnect) setTimeout(start, 4000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("contacts.upsert", (list) => list.forEach(upsertContact));
  sock.ev.on("contacts.update", (list) => list.forEach(upsertContact));

  sock.ev.on("chats.upsert", (list) => list.forEach(upsertChat));
  sock.ev.on("chats.update", (list) => list.forEach(upsertChat));
  sock.ev.on("chats.set", ({ chats: list }) => list?.forEach(upsertChat));

  sock.ev.on("messages.upsert", ({ messages: list, type }) => {
    if (type !== "notify" && type !== "append") return;
    list.forEach((m) => {
      const jid = jidNormalizedUser(m.key.remoteJid ?? "");
      if (!isJidBroadcast(jid)) storeMessage(jid, m);
    });
  });

  // History sync
  sock.ev.on("messaging-history.set", ({ chats: hChats, contacts: hContacts, messages: hMsgs }) => {
    hContacts?.forEach(upsertContact);
    hChats?.forEach(upsertChat);
    hMsgs?.forEach((m) => {
      const jid = jidNormalizedUser(m.key.remoteJid ?? "");
      if (!isJidBroadcast(jid)) storeMessage(jid, m);
    });
  });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

app.get("/status", (_, res) => {
  const user = sock?.user;
  res.json({
    status,
    phone: user?.id ? user.id.split(":")[0].split("@")[0] : null,
    name: user?.name ?? null,
  });
});

app.get("/qr", (_, res) => {
  if (!qrBase64) return res.status(404).json({ error: "Pas de QR" });
  res.json({ qr: qrBase64 });
});

app.post("/logout", async (_, res) => {
  try { await sock?.logout(); } catch {}
  status = "disconnected";
  qrBase64 = null;
  res.json({ ok: true });
});

app.get("/chats", (_, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const list = Object.values(chats)
    .filter(c => !isJidBroadcast(c.id))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 25);
  res.json({ chats: list });
});

app.get("/contacts", (_, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const list = Object.values(contacts)
    .filter(c => c.id.endsWith("@s.whatsapp.net") && c.name !== c.phone)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);
  res.json({ contacts: list });
});

app.get("/messages/:jid", (req, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const { jid } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const list = (messages[jid] ?? []).slice(-limit);
  res.json({ messages: list });
});

app.post("/send", async (req, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Champs manquants" });
  try {
    const jid = to.includes("@") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Démarrage ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`[WA Bridge] Port ${PORT}`));
start();
