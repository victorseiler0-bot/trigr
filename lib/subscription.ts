import { clerkClient } from "@clerk/nextjs/server";

export type Plan = "free" | "solo" | "pro" | "equipe";

export async function getUserPlan(userId: string): Promise<Plan> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  if (meta.stripeStatus !== "active") return "free";
  return (meta.stripePlan as Plan) ?? "free";
}

export const PLAN_LIMITS: Record<Plan, { actionsPerDay: number; integrations: number; users: number }> = {
  free:   { actionsPerDay: 50,  integrations: 2,   users: 1 },
  solo:   { actionsPerDay: 50,  integrations: 3,   users: 1 },
  pro:    { actionsPerDay: 999, integrations: 999, users: 1 },
  equipe: { actionsPerDay: 999, integrations: 999, users: 5 },
};
