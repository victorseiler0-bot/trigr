// Tunnel SSH pour exposer n8n (port 5678) via localhost.run
// pm2 start n8n-tunnel.js --name n8n-tunnel

const { spawn, execSync } = require("child_process");

let lastUrl = null;

// Quand le tunnel démarre, met à jour N8N_WEBHOOK_URL dans Vercel
function updateVercelN8nUrl(tunnelUrl) {
  if (lastUrl === tunnelUrl) return;
  lastUrl = tunnelUrl;
  console.log("[n8n-tunnel] Tunnel actif:", tunnelUrl);
  console.log("[n8n-tunnel] Webhook n8n:", tunnelUrl + "/webhook/autozen-wa-meta-forward");
  try {
    execSync(
      `echo "${tunnelUrl}" | vercel env add N8N_WEBHOOK_URL production --force`,
      { cwd: __dirname, stdio: "pipe", timeout: 30000, windowsHide: true }
    );
    console.log("[n8n-tunnel] N8N_WEBHOOK_URL mis à jour sur Vercel ✓");
    execSync("vercel --prod --yes", { cwd: __dirname, stdio: "pipe", timeout: 180000, windowsHide: true });
    console.log("[n8n-tunnel] Vercel redéployé ✓");
  } catch (e) {
    console.error("[n8n-tunnel] Erreur Vercel:", e.message?.slice(0, 200));
  }
}

function startTunnel() {
  console.log("[n8n-tunnel] Démarrage tunnel localhost.run pour n8n port 5678...");
  let urlCaptured = false;

  const ssh = spawn("ssh", [
    "-o", "StrictHostKeyChecking=no",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=5",
    "-o", "ExitOnForwardFailure=yes",
    "-R", "80:localhost:5678",
    "nokey@localhost.run",
  ], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });

  function onData(data) {
    const text = data.toString();
    process.stdout.write("[SSH] " + text);
    if (!urlCaptured) {
      // localhost.run tunnel URL appears in "tunneled with tls termination" line
      const match = text.match(/https:\/\/[a-f0-9]+\.lhr\.life/);
      if (match) {
        urlCaptured = true;
        setImmediate(() => updateVercelN8nUrl(match[0]));
      }
    }
  }

  ssh.stdout.on("data", onData);
  ssh.stderr.on("data", onData);

  ssh.on("close", (code) => {
    console.log("[n8n-tunnel] Tunnel fermé (code", code, "). Redémarrage dans 5s...");
    urlCaptured = false;
    lastUrl = null;
    setTimeout(startTunnel, 5000);
  });

  ssh.on("error", (err) => {
    console.error("[n8n-tunnel] Erreur SSH:", err.message);
    setTimeout(startTunnel, 10000);
  });
}

startTunnel();
