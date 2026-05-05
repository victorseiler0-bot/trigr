import { clerkClient } from "@clerk/nextjs/server";

type SlackMeta = { accessToken: string; teamName: string; userId: string };

// ── Clerk metadata ────────────────────────────────────────────────────────────

export async function getSlackMeta(clerkUserId: string): Promise<SlackMeta | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const meta = user.privateMetadata as Record<string, unknown>;
  if (!meta.slackToken) return null;
  return {
    accessToken: meta.slackToken as string,
    teamName: (meta.slackTeam as string) ?? "",
    userId: (meta.slackUserId as string) ?? "",
  };
}

export async function saveSlackMeta(clerkUserId: string, accessToken: string, teamName: string, userId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    privateMetadata: { slackToken: accessToken, slackTeam: teamName, slackUserId: userId },
  });
}

export async function clearSlackMeta(clerkUserId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    privateMetadata: { slackToken: null, slackTeam: null, slackUserId: null },
  });
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function slackFetch(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`https://slack.com/api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return r.json();
}

export async function getSlackChannels(token: string) {
  const data = await slackFetch("/conversations.list?types=public_channel,private_channel&limit=20", token);
  if (!data.ok) return [];
  return (data.channels ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    name: c.name,
    isPrivate: c.is_private,
    memberCount: c.num_members,
  }));
}

export async function getSlackMessages(token: string, channelId: string, limit = 10) {
  const data = await slackFetch(`/conversations.history?channel=${channelId}&limit=${limit}`, token);
  if (!data.ok) return [];
  return (data.messages ?? []).map((m: Record<string, unknown>) => ({
    text: m.text as string,
    timestamp: m.ts as string,
    user: m.user as string,
  }));
}

export async function sendSlackMessage(token: string, channel: string, text: string) {
  const data = await slackFetch("/chat.postMessage", token, {
    method: "POST",
    body: JSON.stringify({ channel, text }),
  });
  return data.ok;
}

export async function getSlackDMs(token: string) {
  const data = await slackFetch("/conversations.list?types=im&limit=10", token);
  if (!data.ok) return [];
  return (data.channels ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    userId: c.user,
  }));
}
