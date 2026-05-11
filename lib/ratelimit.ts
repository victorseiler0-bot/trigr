import { clerkClient } from "@clerk/nextjs/server";
import { getUserPlan, PLAN_LIMITS } from "./subscription";

const TODAY_KEY = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

// Admin users bypass le rate limiting complètement
const ADMIN_IDS = (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);

export async function checkAndIncrementAction(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  if (ADMIN_IDS.includes(userId)) return { allowed: true, remaining: 999 };

  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].actionsPerDay;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;

  const today = TODAY_KEY();
  const lastDate = meta.actionDate as string | undefined;
  const count = lastDate === today ? ((meta.actionCount as number) ?? 0) : 0;

  if (count >= limit) return { allowed: false, remaining: 0 };

  await client.users.updateUserMetadata(userId, {
    privateMetadata: { actionDate: today, actionCount: count + 1 },
  });

  return { allowed: true, remaining: limit - count - 1 };
}
