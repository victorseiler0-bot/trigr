import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidGroup,
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
const store = makeInMemoryStore({ logger });

let sock = null;
let qrBase64 = null;
let status = "disconnected"; // disconnected | connecting | qr | connected

// ── Bridge WhatsApp ────────────────────────────────────────────────────────────

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: ["Trigr Assistant", "Chrome", "120.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  store.bind(sock.ev);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrBase64 = await QRCode.toDataURL(qr);
      status = "qr";
      console.log("[WhatsApp] QR code prêt — scanne depuis l'app");
    }

    if (connection === "connecting") {
      status = "connecting";
    }

    if (connection === "open") {
      status = "connected";
      qrBase64 = null;
      console.log("[WhatsApp] Connecté :", sock.user?.id);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : 0;
      const reconnect = code !== DisconnectReason.loggedOut;
      status = "disconnected";
      qrBase64 = null;
      console.log("[WhatsApp] Déconnecté, code:", code, "reconnexion:", reconnect);
      if (reconnect) setTimeout(start, 4000);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// ── Routes REST ────────────────────────────────────────────────────────────────

app.get("/status", (req, res) => {
  const user = sock?.user;
  res.json({
    status,
    phone: user?.id ? user.id.split(":")[0].split("@")[0] : null,
    name: user?.name ?? null,
  });
});

app.get("/qr", (req, res) => {
  if (!qrBase64) return res.status(404).json({ error: "Pas de QR disponible" });
  res.json({ qr: qrBase64 });
});

app.post("/logout", async (req, res) => {
  try {
    await sock?.logout();
  } catch {}
  status = "disconnected";
  qrBase64 = null;
  res.json({ ok: true });
});

app.get("/chats", (req, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const all = store.chats.all() ?? [];
  const chats = all
    .filter(c => !isJidBroadcast(c.id))
    .map(c => {
      const contact = store.contacts[c.id];
      return {
        id: c.id,
        name: c.name ?? contact?.name ?? contact?.notify ?? c.id.split("@")[0],
        isGroup: isJidGroup(c.id),
        unread: c.unreadCount ?? 0,
        timestamp: c.conversationTimestamp ?? 0,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 25);
  res.json({ chats });
});

app.get("/contacts", (req, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const contacts = Object.values(store.contacts ?? {})
    .filter(c => c.id?.endsWith("@s.whatsapp.net"))
    .map(c => ({
      id: c.id,
      name: c.name ?? c.notify ?? c.verifiedName ?? c.id.split("@")[0],
      phone: c.id.split("@")[0],
    }))
    .filter(c => c.name !== c.phone)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);
  res.json({ contacts });
});

app.get("/messages/:jid", (req, res) => {
  if (status !== "connected") return res.status(503).json({ error: "Non connecté" });
  const { jid } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const msgList = store.messages[jid];
  const raw = msgList?.array?.slice(-limit) ?? [];
  const messages = raw
    .map(m => ({
      id: m.key.id,
      fromMe: m.key.fromMe ?? false,
      from: m.key.fromMe
        ? (sock?.user?.name ?? "Moi")
        : (store.contacts[m.key.remoteJid]?.name ?? m.key.remoteJid?.split("@")[0] ?? "Inconnu"),
      text:
        m.message?.conversation ??
        m.message?.extendedTextMessage?.text ??
        m.message?.imageMessage?.caption ??
        "",
      timestamp: Number(m.messageTimestamp ?? 0),
      type: Object.keys(m.message ?? {})[0] ?? "unknown",
    }))
    .filter(m => m.text);
  res.json({ messages });
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

app.listen(PORT, () => console.log(`[WhatsApp Bridge] Port ${PORT}`));
start();
