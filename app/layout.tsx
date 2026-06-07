import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";
import StoreProvider from "@/components/StoreProvider";
import CommandPalette from "@/components/CommandPalette";
import PushInit from "@/components/PushInit";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Trigr — Assistant IA pour indépendants et PME · RGPD-friendly",
  description: "Ton assistant IA personnel : Gmail, WhatsApp Business, Google Calendar, Notion. RGPD-friendly, 5× moins cher que Lindy. Essai gratuit sans carte.",
  keywords: ["assistant IA", "automatisation", "Gmail", "WhatsApp Business", "indépendant", "PME", "France", "RGPD", "workflow"],
  openGraph: {
    title: "Trigr — Ton assistant IA en français",
    description: "Gmail, WhatsApp, Agenda — automatise tout à ta place. RGPD-friendly, sans engagement, 9€/mois.",
    type: "website",
    locale: "fr_FR",
    siteName: "Trigr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trigr — Assistant IA RGPD-friendly pour les pros FR",
    description: "Gmail, WhatsApp, Agenda automatisés en français. 5× moins cher que Lindy.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://trigr-eight.vercel.app" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trigr",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

async function detectLang(): Promise<string> {
  try {
    const hdrs = await headers();
    const al = hdrs.get("accept-language") || "";
    const primary = al.split(",")[0].split(";")[0].split("-")[0].toLowerCase();
    return ["fr", "en", "de", "es", "it", "nl", "pt"].includes(primary) ? primary : "en";
  } catch {
    return "fr";
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await detectLang();
  return (
    <ClerkProvider localization={frFR}>
      <html lang={lang} className={inter.variable} suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#7c3aed" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body className="font-sans antialiased" suppressHydrationWarning>
          <StoreProvider>
            <ToastProvider>
              {children}
              <CookieBanner />
              <CommandPalette />
              <PushInit />
            </ToastProvider>
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
