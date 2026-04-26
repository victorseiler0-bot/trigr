import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
  });
}

async function notifyWhatsApp(productName: string, withInstall: string) {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;

  const msg = encodeURIComponent(
    `🎉 Nouvelle vente Trigr !\n📦 ${productName}${withInstall === "true" ? " + Installation" : ""}\n💬 Contacte l'acheteur pour livraison.`
  );

  await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${msg}&apikey=${apikey}`)
    .catch(() => null);
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const productName = session.metadata?.productName ?? "Automatisation";
    const withInstall = session.metadata?.withInstall ?? "false";
    await notifyWhatsApp(productName, withInstall);
  }

  return NextResponse.json({ received: true });
}
