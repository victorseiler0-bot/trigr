// Script PM2 : démarre le tunnel SSH serveo + met à jour WHATSAPP_BRIDGE_URL via Vercel CLI
// Lance avec : pm2 start Autozen-tunnel.js --name Autozen-tunnel
// Arrête avec : pm2 stop Autozen-tunnel

const { spawn, execSync } = require("child_process");

let lastTunnelUrl = null;

function updateVercelBridgeUrl(bridgeUrl) {
  if (lastTunnelUrl === bridgeUrl) return; // pas de changement
  lastTunnelUrl = bridgeUrl;
  try {
    // Met à jour l'env var Vercel (CLI OAuth, pas besoin de token)
    execSync(
      `echo "${bridgeUrl}" | vercel env add WHATSAPP_BRIDGE_URL production --force`,
      { cwd: __dirname, stdio: "pipe", timeout: 30000, windowsHide: true }
    );
    console.log("[Autozen] WHATSAPP_BRIDGE_URL mis à jour sur Vercel :", bridgeUrl);

    // Redéploiement automatique pour que le changement soit pris en compte
    console.log("[Autozen] Déploiement Vercel en cours...");
    execSync("vercel --prod --yes", { cwd: __dirname, stdio: "pipe", timeout: 180000, windowsHide: true });
    console.log("[Autozen] Déploiement Vercel terminé ✓");
  } catch (e) {
    console.error("[Autozen] Erreur mise à jour Vercel :", e.message?.slice(0, 200));
  }
}

function startTunnel() {
  console.log("[Autozen] Démarrage du tunnel SSH serveo...");
  let urlCaptured = false;

  const ssh = spawn("ssh", [
    "-o", "StrictHostKeyChecking=no",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=5",
    "-o", "ExitOnForwardFailure=yes",
    "-R", "80:localhost:3001",
    "serveo.net",
  ], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });

  function onData(data) {
    const text = data.toString();
    process.stdout.write("[SSH] " + text);
    if (!urlCaptured) {
      const match = text.match(/https:\/\/[a-z0-9-]+\.serveousercontent\.com/);
      if (match) {
        urlCaptured = true;
        const tunnelUrl = match[0];
        console.log("[Autozen] Tunnel actif :", tunnelUrl);
        // Lance la mise à jour en arrière-plan pour ne pas bloquer
        setImmediate(() => updateVercelBridgeUrl(tunnelUrl));
      }
    }
  }

  ssh.stdout.on("data", onData);
  ssh.stderr.on("data", onData);

  ssh.on("close", (code) => {
    console.log("[Autozen] Tunnel fermé (code", code, "). Redémarrage dans 5s...");
    urlCaptured = false;
    setTimeout(startTunnel, 5000);
  });

  ssh.on("error", (err) => {
    console.error("[Autozen] Erreur SSH:", err.message);
    setTimeout(startTunnel, 10000);
  });
}

startTunnel();
