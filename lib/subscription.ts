import { clerkClient } from "@clerk/nextjs/server";

export type Plan = "free" | "solo" | "pro" | "equipe";

export async function getUserPlan(userId: string): Promise<Plan> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  // Plan défini directement dans les metadata (admin ou Stripe)
  if (meta.plan) return (meta.plan as Plan);
  if (meta.stripeStatus === "active") return (meta.stripePlan as Plan) ?? "pro";
  return "free";
}

export const PLAN_LIMITS: Record<Plan, { actionsPerDay: number; integrations: number; users: number }> = {
  free:   { actionsPerDay: 10,  integrations: 2,   users: 1 },
  solo:   { actionsPerDay: 50,  integrations: 3,   users: 1 },
  pro:    { actionsPerDay: 999, integrations: 999, users: 1 },
  equipe: { actionsPerDay: 999, integrations: 999, users: 5 },
};
