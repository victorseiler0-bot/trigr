import { clerkClient } from "@clerk/nextjs/server";

export type WaMessage = {
  id: string; from: string; fromName: string;
  text: string; timestamp: number; incoming: boolean;
  read?: boolean; // false = non lu, true = lu par l'utilisateur dans l'assistant
};

const ADMIN_ID = () => (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",")[0].trim();

export async function storeWaMessage(msg: WaMessage) {
  const adminId = ADMIN_ID();
  if (!adminId) return;
  try {
    const client  = await clerkClient();
    const user    = await client.users.getUser(adminId);
    const pm      = user.privateMetadata as Record<string, unknown>;
    const prev    = (pm.waMessages as WaMessage[]) ?? [];
    // Les messages entrants arrivent non lus
    const msgWithRead = { ...msg, read: msg.incoming ? false : true };
    const updated = [msgWithRead, ...prev.filter(m => m.id !== msg.id)].slice(0, 150);
    await client.users.updateUserMetadata(adminId, { privateMetadata: { waMessages: updated } });
  } catch { /* non bloquant */ }
}

// Marquer tous les messages d'un contact comme lus dans Clerk
export async function markWaMessagesRead(userId: string, fromPhone?: string) {
  try {
    const client = await clerkClient();
    const user   = await client.users.getUser(userId);
    const pm     = user.privateMetadata as Record<string, unknown>;
    const msgs   = (pm.waMessages as WaMessage[]) ?? [];
    const updated = msgs.map(m =>
      (!fromPhone || m.from === fromPhone) ? { ...m, read: true } : m
    );
    await client.users.updateUserMetadata(userId, { privateMetadata: { waMessages: updated } });
  } catch { /* non bloquant */ }
}

// Nombre de messages non lus
export function countUnread(msgs: WaMessage[]): number {
  return msgs.filter(m => m.incoming && !m.read).length;
}

export async function sendMetaWaMessage(to: string, text: string): Promise<boolean> {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: text } }),
    });
    const d = await r.json();
    return !!d?.messages?.[0]?.id;
  } catch { return false; }
}

export async function markWaRead(messageId: string) {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
  });
}
