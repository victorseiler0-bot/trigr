import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

// Lazy init — évite l'erreur "apiKey not provided" au build
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
  });
}

const PRODUCTS: Record<string, { name: string; price: number; priceId: string }> = {
  relance: { name: "Relance prospect automatique", price: 3900, priceId: process.env.STRIPE_PRICE_RELANCE! },
  devis: { name: "Devis en 1 clic", price: 5900, priceId: process.env.STRIPE_PRICE_DEVIS! },
  rapport: { name: "Rapport hebdo business", price: 3900, priceId: process.env.STRIPE_PRICE_RAPPORT! },
  panier: { name: "Panier abandonné Shopify", price: 4900, priceId: process.env.STRIPE_PRICE_PANIER! },
  rdv: { name: "Rappel RDV automatique", price: 2900, priceId: process.env.STRIPE_PRICE_RDV! },
  leads: { name: "Leads vers CRM auto", price: 2900, priceId: process.env.STRIPE_PRICE_LEADS! },
};

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { productId, withInstall } = await req.json();

    const product = PRODUCTS[productId];
    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trigr-eight.vercel.app";
    const stripe = getStripe();

    const lineItems = [
      { price: product.priceId, quantity: 1 as const },
    ];

    if (withInstall) {
      lineItems.push({ price: process.env.STRIPE_PRICE_INSTALL!, quantity: 1 as const });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${siteUrl}/success?product=${encodeURIComponent(product.name)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancel`,
      metadata: {
        productId,
        productName: product.name,
        withInstall: withInstall ? "true" : "false",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Erreur lors de la création du paiement." }, { status: 500 });
  }
}
