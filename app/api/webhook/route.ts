import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { n8n } from "@/lib/n8n";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
}

const PRODUCT_WORKFLOW: Record<string, string> = {
  rapport: "Pq2hwYZ8u4eZzi2m",
  relance: "",
  devis:   "",
  rdv:     "",
  leads:   "",
  panier:  "",
};

async function saveSubscription(userId: string, plan: string, status: string, subId: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { stripePlan: plan, stripeStatus: status, stripeSubscriptionId: subId },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature invalide" }, { status: 400 });
  }

  // ── Marketplace one-time purchases ───────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Abonnement — sauvegarder dans Clerk
    if (session.mode === "subscription" && session.subscription) {
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan ?? "pro";
      if (userId) {
        await saveSubscription(userId, plan, "active", session.subscription as string);
      }
    }

    // Marketplace workflow one-time
    const productId = session.metadata?.productId ?? "";
    const workflowId = PRODUCT_WORKFLOW[productId];
    if (workflowId) await n8n(`/workflows/${workflowId}/activate`, "POST");
  }

  // ── Subscription lifecycle ────────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    const plan = sub.metadata?.plan ?? "pro";
    if (userId) {
      const status = event.type === "customer.subscription.deleted" ? "cancelled" : sub.status;
      await saveSubscription(userId, plan, status, sub.id);
    }
  }

  return NextResponse.json({ received: true });
}
