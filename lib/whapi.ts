import { clerkClient } from "@clerk/nextjs/server";

const WHAPI_BASE = "https://gate.whapi.cloud";

export async function whapiChannel(token: string, path: string, method = "GET", body?: unknown) {
  if (!token) return null;
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const r = await fetch(`${WHAPI_BASE}/${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

type WhapiMeta = { token: string | null; channelId: string | null };

export async function getUserWhapiMeta(userId: string): Promise<WhapiMeta> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.privateMetadata as Record<string, string>;
    return {
      token: meta?.whapiToken || process.env.WHAPI_TOKEN || null,
      channelId: meta?.whapiChannelId || null,
    };
  } catch {
    return { token: process.env.WHAPI_TOKEN || null, channelId: null };
  }
}

export async function setUserWhapiMeta(userId: string, token: string, channelId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { whapiToken: token, whapiChannelId: channelId },
  });
}

export async function clearUserWhapiMeta(userId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { whapiToken: null, whapiChannelId: null },
  });
}
