import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Trigr — AI Personal Assistant · RGPD-friendly",
  description: "Your AI assistant for freelancers and SMEs. Gmail, WhatsApp Business, Google Calendar. RGPD-compliant, 5× cheaper than Lindy. 7-day free trial.",
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
    <html lang={lang} className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
