import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserPlan, PLAN_LIMITS } from "@/lib/subscription";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const [user, plan] = await Promise.all([
    client.users.getUser(userId),
    getUserPlan(userId),
  ]);
  const meta = user.privateMetadata as Record<string, unknown>;
  const limits = PLAN_LIMITS[plan];

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = meta.actionDate as string | undefined;
  const todayCount = lastDate === today ? ((meta.actionCount as number) ?? 0) : 0;

  type DayEntry = { date: string; count: number };
  const history: DayEntry[] = Array.isArray(meta.actionHistory)
    ? (meta.actionHistory as DayEntry[])
    : [];

  // Build last 7 days with zeros for missing days
  const days: DayEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = history.find(e => e.date === key);
    days.push({ date: key, count: found?.count ?? 0 });
  }

  // Count connected integrations
  const integrations: string[] = [];
  if (user.externalAccounts?.some(a => a.provider === "google")) integrations.push("google");
  if (user.externalAccounts?.some(a => a.provider === "microsoft")) integrations.push("microsoft");
  if (meta.notionToken) integrations.push("notion");
  if (meta.slackToken) integrations.push("slack");
  if (meta.hubspotToken) integrations.push("hubspot");
  if (meta.appleEmail) integrations.push("apple");
  if (meta.imap) integrations.push("imap");
  if (meta.igMeta) integrations.push("instagram");
  if (meta.pipedream) {
    const pd = meta.pipedream as Record<string, string>;
    if (pd.whatsapp_business) integrations.push("whatsapp");
    if (pd.github) integrations.push("github");
    if (pd.microsoft_outlook && !integrations.includes("microsoft")) integrations.push("microsoft");
  }

  // Automation results (most recent per automation)
  type Automation = { id: string; name: string };
  const automations = (meta.automations as Automation[] | undefined) ?? [];
  const automationResults = automations
    .map(a => {
      const result = meta[`autoResult_${a.id}`] as string | undefined;
      const date = meta[`autoResultDate_${a.id}`] as string | undefined;
      return result ? { id: a.id, name: a.name, result, date } : null;
    })
    .filter(Boolean)
    .slice(0, 3);

  // Stats CRM
  type Deal = { stage: string; amount?: number };
  const deals = (meta.deals as Deal[]) ?? [];
  const dealsActifs = deals.filter(d => d.stage !== "gagne" && d.stage !== "perdu").length;
  const dealsGagnes = deals.filter(d => d.stage === "gagne").length;
  const caPotentiel = deals.filter(d => d.stage !== "perdu").reduce((s, d) => s + (d.amount ?? 0), 0);
  const caGagne = deals.filter(d => d.stage === "gagne").reduce((s, d) => s + (d.amount ?? 0), 0);

  // Rappels en retard
  type Reminder = { done?: boolean; dueAt: string };
  const reminders = (meta.reminders as Reminder[]) ?? [];
  const rappelsEnRetard = reminders.filter(r => !r.done && new Date(r.dueAt) < new Date()).length;

  // Gain de temps (5 min par action en moyenne)
  const totalWeek = days.reduce((s, d) => s + d.count, 0);
  const gainTempsMinutes = totalWeek * 5;

  const isUnlimited = meta.unlimited === true;

  return NextResponse.json({
    plan,
    todayCount,
    limit: isUnlimited ? 999 : limits.actionsPerDay,
    unlimited: isUnlimited,
    integrationsCount: integrations.length,
    integrationsLimit: isUnlimited ? 999 : limits.integrations,
    integrations,
    history: days,
    totalWeek,
    gainTempsMinutes,
    automationResults,
    crm: { dealsActifs, dealsGagnes, caPotentiel, caGagne },
    rappelsEnRetard,
  });
}
