import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

export type ImapConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
};

// Preset configs pour les serveurs courants
export const IMAP_PRESETS: Record<string, Omit<ImapConfig, "user" | "password">> = {
  "outlook.com / hotmail.com": { host: "outlook.office365.com", port: 993, smtpHost: "smtp.office365.com", smtpPort: 587 },
  "esme.fr / office365": { host: "outlook.office365.com", port: 993, smtpHost: "smtp.office365.com", smtpPort: 587 },
  "gmail.com": { host: "imap.gmail.com", port: 993, smtpHost: "smtp.gmail.com", smtpPort: 587 },
  "yahoo.com": { host: "imap.mail.yahoo.com", port: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 587 },
  "icloud.com": { host: "imap.mail.me.com", port: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587 },
  "autre": { host: "", port: 993, smtpHost: "", smtpPort: 587 },
};

function makeClient(cfg: ImapConfig) {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
    tls: { rejectUnauthorized: false },
  });
}

export async function testImapConnection(cfg: ImapConfig): Promise<{ ok: boolean; error?: string }> {
  const client = makeClient(cfg);
  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function readImapEmails(cfg: ImapConfig, options: { folder?: string; limit?: number; unreadOnly?: boolean } = {}): Promise<Array<{
  uid: number; subject: string; from: string; date: string; preview: string; read: boolean;
}>> {
  const client = makeClient(cfg);
  const results: Array<{ uid: number; subject: string; from: string; date: string; preview: string; read: boolean }> = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock(options.folder ?? "INBOX");
    try {
      const limit = options.limit ?? 10;
      // Prendre les N derniers messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = (client.mailbox as any)?.exists ?? 0;
      if (total === 0) return [];
      const from = Math.max(1, total - limit + 1);
      for await (const msg of client.fetch(`${from}:${total}`, {
        envelope: true, flags: true, bodyStructure: false,
        bodyParts: ["TEXT"],
      })) {
        const isRead = msg.flags?.has("\\Seen") ?? false;
        if (options.unreadOnly && isRead) continue;
        results.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(sans objet)",
          from: msg.envelope?.from?.[0]?.address ?? "",
          date: msg.envelope?.date?.toISOString() ?? "",
          preview: "",
          read: isRead,
        });
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch { /* ignore */ }
  return results.reverse();
}

export async function sendImapEmail(cfg: ImapConfig, to: string, subject: string, body: string): Promise<boolean> {
  try {
    const transport = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpPort === 465,
      auth: { user: cfg.user, pass: cfg.password },
      tls: { rejectUnauthorized: false },
    });
    await transport.sendMail({ from: cfg.user, to, subject, text: body });
    return true;
  } catch { return false; }
}
