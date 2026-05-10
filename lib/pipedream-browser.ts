"use client";

// Cache de clients Pipedream par externalUserId
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clients: Map<string, Promise<any>> = new Map();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPipedreamBrowserClient(externalUserId: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Pas côté serveur"));
  if (!externalUserId) return Promise.reject(new Error("externalUserId requis"));

  const existing = clients.get(externalUserId);
  if (existing) return existing;

  const p = import("@pipedream/sdk/browser").then(mod => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { createFrontendClient } = mod as any;
    const client = createFrontendClient({
      externalUserId,
      tokenCallback: async () => {
        const r = await fetch("/api/pipedream/token", { method: "POST" });
        if (!r.ok) throw new Error(`Token fetch ${r.status}`);
        const body = await r.json();
        // Le SDK attend { token, expiresAt, connectLinkUrl }
        return {
          token: body.token,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 3600_000),
          connectLinkUrl: body.connectLinkUrl ?? "",
        };
      },
    });
    console.log("[Pipedream] Client browser créé pour user:", externalUserId.slice(0, 8));
    return client;
  }).catch(err => {
    console.error("[Pipedream] Erreur de chargement du SDK :", err);
    clients.delete(externalUserId); // permettre un retry
    throw err;
  });

  clients.set(externalUserId, p);
  return p;
}
