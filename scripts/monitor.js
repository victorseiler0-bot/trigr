// monitor.js — Trigr Service Monitor
// Lance avec: pm2 start scripts/monitor.js --name trigr-monitor --cron "*/5 * * * *" --no-autorestart
// Variables d'env requises: TELEGRAM_CHAT_ID (ton user ID Telegram)
// Token bot hardcodé (même bot que Trigr)

const https = require("https");
const http  = require("http");

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN || "8944331290:AAF4XcSBF0sRkoNTEK-4pCpdmP3KCd3V1cI";
const CHAT_ID    = process.env.TELEGRAM_CHAT_ID;

if (!CHAT_ID) {
  console.error("[monitor] TELEGRAM_CHAT_ID non défini — ajouter dans pm2 ecosystem ou env");
  process.exit(1);
}

const SERVICES = [
  { name: "n8n LOCAL",  url: "http://localhost:5678/",        critical: true  },
  { name: "n8n GCP",    url: "http://34.10.163.85:5678/",     critical: false },
  { name: "Trigr site", url: "https://trigr.vercel.app/",     critical: true  },
];

function checkUrl(url, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      resolve({ ok: res.statusCode < 500, status: res.statusCode });
      res.resume();
    });
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, status: "timeout" }); });
    req.on("error",   () => resolve({ ok: false, status: "error" }));
  });
}

function sendTelegram(msg) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: "HTML" });
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => { res.resume(); resolve(); });
    req.on("error", () => resolve());
    req.write(body);
    req.end();
  });
}

async function run() {
  const now    = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" });
  const issues = [];

  for (const svc of SERVICES) {
    const result = await checkUrl(svc.url);
    console.log(`[monitor] ${svc.name}: ${result.ok ? "OK" : "DOWN"} (${result.status})`);
    if (!result.ok) issues.push({ ...svc, ...result });
  }

  if (issues.length > 0) {
    const lines = issues.map(i => `• <b>${i.name}</b> — ${i.status}`).join("\n");
    const critical = issues.some(i => i.critical);
    const emoji    = critical ? "🚨" : "⚠️";
    await sendTelegram(`${emoji} <b>Trigr Monitor — ${now}</b>\n\nService(s) DOWN :\n${lines}\n\n→ Vérifie pm2 ou GCP.`);
    console.log(`[monitor] ${issues.length} alerte(s) envoyée(s) sur Telegram`);
  } else {
    console.log(`[monitor] Tous les services OK à ${now}`);
  }
}

run().then(() => process.exit(0));
