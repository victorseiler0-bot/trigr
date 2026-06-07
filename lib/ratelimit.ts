import { clerkClient } from "@clerk/nextjs/server";
import { getUserPlan, PLAN_LIMITS } from "./subscription";

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

const ADMIN_IDS = [
  "user_3D1aU2AT2pTj6fsgiLmRtha2o5L", // victorseiler0@gmail.com — toujours illimité
  ...(process.env.ADMIN_CLERK_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean),
];

type DayEntry = { date: string; count: number };

function isUnlimited(userId: string, meta: Record<string, unknown>): boolean {
  if (ADMIN_IDS.includes(userId)) return true;
  if (meta.unlimited === true || meta.unlimited === "true") return true;
  return false;
}

export async function checkAndIncrementAction(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;

  // Illimité → retourne immédiatement, ne compte pas les actions
  if (isUnlimited(userId, meta)) return { allowed: true, remaining: -1 };

  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].actionsPerDay;

  const today = TODAY_KEY();
  const lastDate = meta.actionDate as string | undefined;
  const count = lastDate === today ? ((meta.actionCount as number) ?? 0) : 0;

  if (count >= limit) return { allowed: false, remaining: 0 };

  // Maintain 7-day history
  const history: DayEntry[] = Array.isArray(meta.actionHistory) ? (meta.actionHistory as DayEntry[]) : [];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = history.filter(e => e.date >= cutoffStr);
  const todayEntry = filtered.find(e => e.date === today);
  if (todayEntry) todayEntry.count = count + 1;
  else filtered.push({ date: today, count: count + 1 });

  await client.users.updateUserMetadata(userId, {
    privateMetadata: { actionDate: today, actionCount: count + 1, actionHistory: filtered },
  });

  return { allowed: true, remaining: limit - count - 1 };
}
