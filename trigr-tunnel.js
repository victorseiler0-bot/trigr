// Script PM2 : démarre le tunnel SSH serveo + met à jour Edge Config automatiquement
// Lance avec : pm2 start trigr-tunnel.js --name trigr-tunnel
// Arrête avec : pm2 stop trigr-tunnel

const { spawn } = require("child_process");
const https = require("https");

const VERCEL_TOKEN = "vca_1bv7UWwUmToT5rBVm3vq4SGLHX8f7tQdpplpBcOR29lUzM0Yyn1RGPmM";
const EDGE_CONFIG_ID = "ecfg_lus1jqr3rmzfi71icffxvnevhqpq";
const TEAM_ID = "victorseiler0-bots-projects";

async function updateEdgeConfig(bridgeUrl) {
  const body = JSON.stringify({ items: [{ operation: "upsert", key: "bridge_url", value: bridgeUrl }] });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.vercel.com",
      path: `/v1/edge-config/${EDGE_CONFIG_ID}/items?teamId=${TEAM_ID}`,
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode < 300) {
          console.log("[Trigr] Edge Config mis à jour :", bridgeUrl);
          resolve();
        } else {
          console.error("[Trigr] Erreur Edge Config:", res.statusCode, data);
          reject(new Error(data));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function startTunnel() {
  console.log("[Trigr] Démarrage du tunnel SSH serveo...");
  let urlCaptured = false;

  const ssh = spawn("ssh", [
    "-o", "StrictHostKeyChecking=no",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=5",
    "-o", "ExitOnForwardFailure=yes",
    "-R", "80:localhost:3001",
    "serveo.net",
  ], { stdio: ["pipe", "pipe", "pipe"] });

  function onData(data) {
    const text = data.toString();
    process.stdout.write("[SSH] " + text);
    if (!urlCaptured) {
      const match = text.match(/https:\/\/[a-z0-9-]+\.serveousercontent\.com/);
      if (match) {
        urlCaptured = true;
        const tunnelUrl = match[0];
        console.log("[Trigr] Tunnel actif :", tunnelUrl);
        updateEdgeConfig(tunnelUrl).catch((e) => console.error("[Trigr] Échec mise à jour Edge Config:", e.message));
      }
    }
  }

  ssh.stdout.on("data", onData);
  ssh.stderr.on("data", onData);

  ssh.on("close", (code) => {
    console.log("[Trigr] Tunnel fermé (code", code, "). Redémarrage dans 5s...");
    setTimeout(startTunnel, 5000);
  });

  ssh.on("error", (err) => {
    console.error("[Trigr] Erreur SSH:", err.message);
    setTimeout(startTunnel, 10000);
  });
}

startTunnel();
