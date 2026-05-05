import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const PLANS = {
  solo:   { name: "Solo",   priceEnv: "STRIPE_PRICE_SOLO" },
  pro:    { name: "Pro",    priceEnv: "STRIPE_PRICE_PRO" },
  equipe: { name: "Équipe", priceEnv: "STRIPE_PRICE_EQUIPE" },
} as const;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
}

// GET — statut abonnement actuel
export async function GET() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;

  return NextResponse.json({
    plan: (meta.stripePlan as string) ?? "free",
    status: (meta.stripeStatus as string) ?? "inactive",
    subscriptionId: meta.stripeSubscriptionId ?? null,
  });
}

// POST — créer session checkout abonnement
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { plan } = await req.json() as { plan: keyof typeof PLANS };
  if (!PLANS[plan]) return NextResponse.json({ error: "Plan invalide" }, { status: 400 });

  const priceId = process.env[PLANS[plan].priceEnv];
  if (!priceId) return NextResponse.json({ error: "Prix non configuré" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trigr-eight.vercel.app";
  const stripe = getStripe();

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: `${siteUrl}/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/settings`,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  });

  return NextResponse.json({ url: session.url });
}

// DELETE — annuler abonnement
export async function DELETE() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Record<string, unknown>;
  const subId = meta.stripeSubscriptionId as string | undefined;

  if (!subId) return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 400 });

  const stripe = getStripe();
  await stripe.subscriptions.update(subId, { cancel_at_period_end: true });

  return NextResponse.json({ cancelled: true });
}
