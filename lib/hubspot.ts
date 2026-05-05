import { clerkClient } from "@clerk/nextjs/server";

type HubSpotMeta = { accessToken: string; refreshToken: string; portalId: number };

// ── Clerk metadata ────────────────────────────────────────────────────────────

export async function getHubSpotMeta(clerkUserId: string): Promise<HubSpotMeta | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const meta = user.privateMetadata as Record<string, unknown>;
  if (!meta.hubspotToken) return null;
  return {
    accessToken: meta.hubspotToken as string,
    refreshToken: (meta.hubspotRefresh as string) ?? "",
    portalId: (meta.hubspotPortal as number) ?? 0,
  };
}

export async function saveHubSpotMeta(clerkUserId: string, accessToken: string, refreshToken: string, portalId: number) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    privateMetadata: { hubspotToken: accessToken, hubspotRefresh: refreshToken, hubspotPortal: portalId },
  });
}

export async function clearHubSpotMeta(clerkUserId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    privateMetadata: { hubspotToken: null, hubspotRefresh: null, hubspotPortal: null },
  });
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function hsFetch(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return r.json();
}

export async function searchHubSpotContacts(token: string, query: string, limit = 10) {
  const data = await hsFetch(`/crm/v3/objects/contacts/search`, token, {
    method: "POST",
    body: JSON.stringify({
      query,
      limit,
      properties: ["firstname", "lastname", "email", "phone", "company"],
    }),
  });
  return (data.results ?? []).map((c: Record<string, unknown>) => {
    const props = c.properties as Record<string, string>;
    return {
      id: c.id,
      name: [props.firstname, props.lastname].filter(Boolean).join(" ") || "(Sans nom)",
      email: props.email ?? "",
      phone: props.phone ?? "",
      company: props.company ?? "",
    };
  });
}

export async function getHubSpotDeals(token: string, limit = 10) {
  const data = await hsFetch(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate`, token);
  return (data.results ?? []).map((d: Record<string, unknown>) => {
    const props = d.properties as Record<string, string>;
    return {
      id: d.id,
      name: props.dealname ?? "(Sans titre)",
      amount: props.amount ?? "0",
      stage: props.dealstage ?? "",
      closeDate: props.closedate ?? "",
    };
  });
}

export async function createHubSpotContact(token: string, contact: { email: string; firstName?: string; lastName?: string; phone?: string; company?: string }) {
  const data = await hsFetch("/crm/v3/objects/contacts", token, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        email: contact.email,
        firstname: contact.firstName ?? "",
        lastname: contact.lastName ?? "",
        phone: contact.phone ?? "",
        company: contact.company ?? "",
      },
    }),
  });
  return data.id ? { success: true, id: data.id } : { success: false, error: data.message };
}

export async function createHubSpotDeal(token: string, deal: { name: string; amount?: string; stage?: string }) {
  const data = await hsFetch("/crm/v3/objects/deals", token, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        dealname: deal.name,
        amount: deal.amount ?? "",
        dealstage: deal.stage ?? "appointmentscheduled",
        pipeline: "default",
      },
    }),
  });
  return data.id ? { success: true, id: data.id } : { success: false, error: data.message };
}
