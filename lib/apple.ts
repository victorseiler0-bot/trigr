import { createDAVClient } from "tsdav";
import { clerkClient } from "@clerk/nextjs/server";

type AppleMeta = { email: string; appPassword: string };

// ── Clerk metadata ────────────────────────────────────────────────────────────

export async function getAppleMeta(userId: string): Promise<AppleMeta | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  if (!meta.appleEmail || !meta.appleAppPassword) return null;
  return { email: meta.appleEmail as string, appPassword: meta.appleAppPassword as string };
}

export async function saveAppleMeta(userId: string, email: string, appPassword: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { appleEmail: email, appleAppPassword: appPassword },
  });
}

export async function clearAppleMeta(userId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { appleEmail: null, appleAppPassword: null },
  });
}

// ── DAV client factory ────────────────────────────────────────────────────────

async function davClient(email: string, appPassword: string) {
  return createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: email, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

// ── Test connexion ────────────────────────────────────────────────────────────

export async function testAppleConnection(email: string, appPassword: string): Promise<boolean> {
  try {
    const client = await davClient(email, appPassword);
    const calendars = await client.fetchCalendars();
    return Array.isArray(calendars);
  } catch {
    return false;
  }
}

// ── Calendrier ────────────────────────────────────────────────────────────────

export async function getAppleCalendar(email: string, appPassword: string, days = 14) {
  try {
    const client = await davClient(email, appPassword);
    const calendars = await client.fetchCalendars();
    if (!calendars.length) return [];

    const now = new Date();
    const later = new Date(now.getTime() + days * 86400000);

    const objects = await client.fetchCalendarObjects({
      calendar: calendars[0],
      timeRange: { start: now.toISOString(), end: later.toISOString() },
    });

    return objects
      .map((obj) => {
        const raw = obj.data ?? "";
        const summary = raw.match(/SUMMARY:(.*)/)?.[1]?.trim() ?? "(Sans titre)";
        const dtstart = raw.match(/DTSTART[^:]*:(.*)/)?.[1]?.trim() ?? "";
        const dtend = raw.match(/DTEND[^:]*:(.*)/)?.[1]?.trim() ?? "";
        const location = raw.match(/LOCATION:(.*)/)?.[1]?.trim() ?? "";
        return { summary, start: formatIcalDate(dtstart), end: formatIcalDate(dtend), location };
      })
      .filter((e) => e.start)
      .sort((a, b) => a.start.localeCompare(b.start));
  } catch {
    return [];
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getAppleContacts(email: string, appPassword: string) {
  try {
    const client = await createDAVClient({
      serverUrl: "https://contacts.icloud.com",
      credentials: { username: email, password: appPassword },
      authMethod: "Basic",
      defaultAccountType: "carddav",
    });
    const books = await client.fetchAddressBooks();
    if (!books.length) return [];

    const cards = await client.fetchVCards({ addressBook: books[0] });
    return cards.slice(0, 50).map((card: { data?: string }) => {
      const raw = card.data ?? "";
      const fn = raw.match(/^FN:(.*)/m)?.[1]?.trim() ?? "";
      const tel = raw.match(/^TEL[^:]*:(.*)/m)?.[1]?.trim() ?? "";
      const email_ = raw.match(/^EMAIL[^:]*:(.*)/m)?.[1]?.trim() ?? "";
      return { name: fn, phone: tel, email: email_ };
    }).filter((c: { name: string }) => c.name);
  } catch {
    return [];
  }
}

// ── Créer événement ───────────────────────────────────────────────────────────

export async function createAppleEvent(
  email: string,
  appPassword: string,
  event: { summary: string; start: string; end: string; location?: string; description?: string }
) {
  try {
    const client = await davClient(email, appPassword);
    const calendars = await client.fetchCalendars();
    if (!calendars.length) return false;

    const uid = `trigr-${Date.now()}@icloud.com`;
    const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const startFmt = toIcalDate(event.start);
    const endFmt = toIcalDate(event.end);

    const esc = (s: string) => s.replace(/[\r\n]/g, " ").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Trigr//FR",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${startFmt}`,
      `DTEND:${endFmt}`,
      `SUMMARY:${esc(event.summary)}`,
      event.location ? `LOCATION:${esc(event.location)}` : "",
      event.description ? `DESCRIPTION:${esc(event.description)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    await client.createCalendarObject({
      calendar: calendars[0],
      filename: `${uid}.ics`,
      iCalString: ical,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIcalDate(s: string): string {
  if (!s) return "";
  // YYYYMMDDTHHMMSSZ → ISO
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  // YYYYMMDD (all-day)
  const d = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d) return `${d[1]}-${d[2]}-${d[3]}`;
  return s;
}

function toIcalDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace("Z", "") + "Z";
}
