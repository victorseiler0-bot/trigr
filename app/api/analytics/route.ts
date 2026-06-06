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

  return NextResponse.json({
    plan,
    todayCount,
    limit: limits.actionsPerDay,
    integrationsCount: integrations.length,
    integrationsLimit: limits.integrations,
    integrations,
    history: days,
    totalWeek: days.reduce((s, d) => s + d.count, 0),
  });
}
