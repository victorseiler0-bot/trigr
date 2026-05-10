"use client";

// Singleton browser client — chargé une seule fois côté navigateur
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clientPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPipedreamBrowserClient(): Promise<any> {
  if (clientPromise) return clientPromise;
  if (typeof window === "undefined") return Promise.reject(new Error("Pas côté serveur"));

  clientPromise = import("@pipedream/sdk/browser").then(mod => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { createFrontendClient } = mod as any;
    const client = createFrontendClient();
    console.log("[Pipedream] Client browser créé", client);
    return client;
  }).catch(err => {
    console.error("[Pipedream] Erreur de chargement du SDK :", err);
    clientPromise = null; // permettre un retry
    throw err;
  });

  return clientPromise;
}

// Précharge dès que ce module est importé côté client (en parallèle de la page)
if (typeof window !== "undefined") {
  getPipedreamBrowserClient().catch(() => {/* déjà loggé */});
}
