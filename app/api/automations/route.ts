import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { generateMorningBrief } from "@/lib/morning-brief";

export type Automation = {
  id: string;
  name: string;
  prompt: string;
  schedule: string; // "daily_8am" | "daily_7am" | "weekly_monday" | "weekly_friday"
  channel: "wa" | "dashboard";
  enabled: boolean;
  lastRun?: string;
};

const SCHEDULE_LABELS: Record<string, string> = {
  daily_7am:      "Tous les jours à 7h",
  daily_8am:      "Tous les jours à 8h",
  daily_9am:      "Tous les jours à 9h",
  daily_6pm:      "Tous les jours à 18h",
  weekly_monday:  "Chaque lundi matin",
  weekly_friday:  "Chaque vendredi soir",
};

export { SCHEDULE_LABELS };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const automations = (user.privateMetadata.automations as Automation[] | undefined) ?? [];
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as { action?: string; automation?: Automation; id?: string };
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  let automations = (user.privateMetadata.automations as Automation[] | undefined) ?? [];

  if (body.action === "delete" && body.id) {
    automations = automations.filter(a => a.id !== body.id);
  } else if (body.action === "toggle" && body.id) {
    automations = automations.map(a => a.id === body.id ? { ...a, enabled: !a.enabled } : a);
  } else if (body.automation) {
    const existing = automations.findIndex(a => a.id === body.automation!.id);
    if (existing >= 0) {
      automations[existing] = body.automation;
    } else {
      if (automations.length >= 10) {
        return NextResponse.json({ error: "Maximum 10 automatisations" }, { status: 400 });
      }
      automations.push(body.automation);
    }
  }

  await clerk.users.updateUserMetadata(userId, { privateMetadata: { automations } });
  return NextResponse.json({ automations });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as { id: string };
  if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const automations = (user.privateMetadata.automations as Automation[] | undefined) ?? [];
  const automation = automations.find(a => a.id === body.id);
  if (!automation) return NextResponse.json({ error: "Non trouvée" }, { status: 404 });

  const brief = await generateMorningBrief(userId);
  const result = brief ?? "Aucune donnée disponible.";

  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: {
      automations: automations.map(a => a.id === body.id ? { ...a, lastRun: new Date().toISOString() } : a),
      lastAutomationResult: result,
    },
  });

  return NextResponse.json({ result });
}
