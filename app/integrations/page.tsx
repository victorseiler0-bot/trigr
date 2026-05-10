"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { PipedreamConnectButton } from "@/components/PipedreamConnect";

// ── Types ──────────────────────────────────────────────────────────────────────
type Category = "Tous" | "Email" | "Messagerie" | "Productivité" | "CRM" | "Dev" | "Finance" | "Vidéo";

interface IntegrationDef {
  slug: string;
  name: string;
  description: string;
  category: Category;
  color: string;
  isPipedream: boolean; // false = OAuth natif (Google, Microsoft, WhatsApp, Apple)
  logo: React.ReactNode;
  connected?: boolean;
  badge?: string;
}

// ── SVG Logos ─────────────────────────────────────────────────────────────────
const GoogleLogo = () => <svg viewBox="0 0 18 18" width="22" height="22" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>;
const MicrosoftLogo = () => <svg viewBox="0 0 21 21" width="20" height="20" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>;
const WhatsAppLogo = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
const NotionLogo = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg>;
const SlackLogo = () => <svg viewBox="0 0 122.8 122.8" width="20" height="20"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0S90.5 5.8 90.5 12.9v32.3z" fill="#2EB67D"/><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/></svg>;
const HubSpotLogo = () => <svg viewBox="0 0 512 512" width="20" height="20" fill="#FF7A59"><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 515.3 173.9 515.3s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7zM346.5 368.5c-40.8 0-74-33.2-74-74s33.2-74 74-74 74 33.2 74 74-33.2 74-74 74z"/><path d="M285.1 219.2v-60.3c9.3-4.3 15.8-13.7 15.8-24.6v-.8c0-14.9-12.1-27.1-27.1-27.1h-.8c-14.9 0-27.1 12.1-27.1 27.1v.8c0 10.9 6.4 20.3 15.8 24.6v60.3c-14.2 2.1-27.3 7.7-38.5 16.2L122.5 119.7c.9-3.1 1.4-6.4 1.4-9.8 0-20.3-16.5-36.8-36.8-36.8s-36.8 16.5-36.8 36.8 16.5 36.8 36.8 36.8c8.5 0 16.3-2.9 22.5-7.7l99.8 113.5c-16.4 19.3-26.2 44.3-26.2 71.6 0 60.5 49.1 109.7 109.7 109.7s109.7-49.1 109.7-109.7c0-55.8-41.8-101.9-95.5-108.7z"/></svg>;
const AirtableLogo = () => <svg viewBox="0 0 200 170" width="22" height="20"><path d="M90.039 12.368L24.079 38.66c-4.418 1.748-4.39 7.985.045 9.694l66.26 25.455c6.027 2.314 12.719 2.314 18.746 0l66.261-25.455c4.435-1.71 4.462-7.946.045-9.694L109.416 12.368c-6.231-2.45-13.146-2.45-19.377 0z" fill="#FFBF00"/><path d="M105.382 95.387v67.79c0 3.225 3.245 5.388 6.222 4.19l73.394-28.593c1.73-.674 2.86-2.35 2.86-4.19V66.794c0-3.225-3.246-5.388-6.222-4.19l-73.395 28.593c-1.73.675-2.86 2.35-2.86 4.19z" fill="#18BFFF"/><path d="M88.198 99.55L65.862 89.22l-2.584-1.21L18.8 68.906c-3.006-1.395-6.442.748-6.442 4.08v67.765c0 1.77.963 3.393 2.54 4.205l7.478 3.868 59.868 30.992c3.149 1.63 6.822-.625 6.822-4.205V103.63a4.663 4.663 0 00-2.868-4.08z" fill="#F82B60"/></svg>;
const GitHubLogo = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>;
const TrelloLogo = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="#0052CC"><path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .794-.645 1.44-1.44 1.44H15c-.795 0-1.44-.646-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/></svg>;
const LinearLogo = () => <svg viewBox="0 0 100 100" width="20" height="20"><defs><linearGradient id="linGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5E6AD2"/><stop offset="100%" stopColor="#8A92E3"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#linGrad)"/><path d="M17.68 62.99L37 82.32a41.06 41.06 0 01-19.32-19.33zM15 54.09L45.91 85a40.99 40.99 0 01-6.55-1.26L16.26 60.65A40.88 40.88 0 0115 54.1zM85 45.91L54.09 15a41.06 41.06 0 0130.91 30.91zM82.32 37L37.01 82.32a41.08 41.08 0 01-19.33-19.33L62.99 17.68A41.06 41.06 0 0182.32 37zM62.99 17.68L17.68 62.99a41 41 0 01-1.42-6.9L56.09 16.26a40.9 40.9 0 016.9 1.42z" fill="white"/></svg>;
const StripeLogo = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>;
const ZoomLogo = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="#2D8CFF"><path d="M4.5 4.5h15A4.5 4.5 0 0124 9v6a4.5 4.5 0 01-4.5 4.5h-15A4.5 4.5 0 010 15V9A4.5 4.5 0 014.5 4.5zm12 3v9l6-3V10.5l-6-3z"/></svg>;
const JiraLogo = () => <svg viewBox="0 0 32 32" width="20" height="20"><path d="M28.226 1.81H15.706L27.7 13.804a2.58 2.58 0 010 3.641L15.706 29.44h12.52A2.58 2.58 0 0030.806 26.86V4.39A2.58 2.58 0 0028.226 1.81z" fill="#2684FF"/><path d="M15.854 15.975L4.168 4.294a2.58 2.58 0 00-3.641 0L.504 4.317v23.47a2.58 2.58 0 002.58 2.58H15.6L3.606 18.373a2.58 2.58 0 010-3.641l12.248-12.244z" fill="#0052CC"/></svg>;
const ShopifyLogo = () => <svg viewBox="0 0 109.5 124.5" width="20" height="22" fill="#96BF48"><path d="M74.7 14.8s-1.4.4-3.7 1.1c-.4-1.3-1-2.8-1.8-4.4-2.6-5-6.5-7.7-11.1-7.7-.3 0-.6 0-1 .1-.1-.2-.3-.3-.4-.5-2-2.1-4.5-3.1-7.6-3-5.9.1-11.8 4.4-16.5 12-3.4 5.3-5.9 12-6.6 17.2l-11.4 3.5c-3.3 1-3.5 1.2-3.9 4.3C10.2 39.5 1 108.9 1 108.9l73.1 12.7V14.5c-.1.1-.3.2-.4.3zm-17.2 5.3c-3.9 1.2-8.2 2.5-12.4 3.8.4-2.4 1.2-4.8 2.3-6.9 1.5-3 3.6-5.4 6-7 2.5 4.7 4.1 10 4.1 10.1z"/><path d="M74.7 14.8s-1.4.4-3.7 1.1c-.4-1.3-1-2.8-1.8-4.4-2.6-5-6.5-7.7-11.1-7.7-.3 0-.6 0-1 .1-.1-.2-.3-.3-.4-.5-2-2.1-4.5-3.1-7.6-3-5.9.1-11.8 4.4-16.5 12-3.4 5.3-5.9 12-6.6 17.2l-11.4 3.5c-3.3 1-3.5 1.2-3.9 4.3C10.2 39.5 1 108.9 1 108.9l73.1 12.7V14.5c-.1.1-.3.2-.4.3z" opacity=".5" fill="#5E8E3E"/><path d="M108.5 37.5l-14.3-3.5s-.4-.3-.9-.7c-1.4-1.2-3.5-1.8-6.3-1.8-4 0-8.9 1.5-10.9 2.1l-.5.2v-.3c0-.1 0-.2-.1-.3L74.7 14.8c-.1.1-.3.2-.4.3v107.5l34.7-7.5S108.5 37.5 108.5 37.5z" fill="#5E8E3E"/></svg>;
const AppleLogo = () => <svg viewBox="0 0 814 1000" width="18" height="22" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 103.8-317.5 200.7-317.5 58.4 0 106.9 41.7 142.9 41.7 34.4 0 88.9-44.2 159.3-44.2 25.4 0 127.3 2.3 197.4 112.4zm-166.3-142.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>;

const CATEGORIES: Category[] = ["Tous", "Email", "Messagerie", "Productivité", "CRM", "Dev", "Finance", "Vidéo"];

const PIPEDREAM_APPS = [
  { slug: "airtable", name: "Airtable", description: "Bases de données · Vues · Grilles · Automatisations", category: "Productivité" as Category, color: "#FFBF00", logo: <AirtableLogo /> },
  { slug: "github", name: "GitHub", description: "Repos · Issues · Pull Requests · Actions", category: "Dev" as Category, color: "#f0f6fc", logo: <GitHubLogo /> },
  { slug: "trello", name: "Trello", description: "Boards · Cartes · Listes · Automatisations", category: "Productivité" as Category, color: "#0052CC", logo: <TrelloLogo /> },
  { slug: "linear", name: "Linear", description: "Issues · Cycles · Projets · Roadmap", category: "Dev" as Category, color: "#5E6AD2", logo: <LinearLogo /> },
  { slug: "jira", name: "Jira", description: "Issues · Sprints · Epics · Projets Agile", category: "Dev" as Category, color: "#2684FF", logo: <JiraLogo /> },
  { slug: "zoom", name: "Zoom", description: "Réunions · Webinaires · Recordings · Transcriptions", category: "Vidéo" as Category, color: "#2D8CFF", logo: <ZoomLogo /> },
  { slug: "stripe", name: "Stripe", description: "Paiements · Abonnements · Factures · Webhooks", category: "Finance" as Category, color: "#635BFF", logo: <StripeLogo /> },
  { slug: "shopify", name: "Shopify", description: "Produits · Commandes · Clients · Inventaire", category: "Finance" as Category, color: "#96BF48", logo: <ShopifyLogo /> },
];

// ── Native connection card (non-Pipedream) ─────────────────────────────────────
function NativeCard({
  logo, name, description, category, color, connected, onConnect, onDisconnect, badge,
}: {
  logo: React.ReactNode; name: string; description: string; category: string;
  color: string; connected: boolean;
  onConnect: () => void; onDisconnect: () => void;
  badge?: string;
}) {
  return (
    <div className={`relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${
      connected
        ? "border-white/[0.14] bg-white/[0.025] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
        : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.13] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    }`}>
      {connected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      )}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              connected ? "bg-white/[0.06] border border-white/[0.1]" : "bg-white/[0.04] border border-white/[0.07]"
            }`}>{logo}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{name}</span>
                <span className={`w-2 h-2 rounded-full transition-all ${connected ? "status-connected" : "bg-zinc-700"}`} />
              </div>
              <span className="text-xs text-zinc-600">{category}</span>
            </div>
          </div>
          <span className="text-xs text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded font-mono shrink-0">
            {badge ?? "OAuth"}
          </span>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
        {connected ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1.5 5.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Connecté
            </span>
            <button onClick={onDisconnect} className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1">
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
              Déconnecter
            </button>
          </div>
        ) : (
          <button onClick={onConnect}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.18] text-white text-xs font-semibold py-2.5 rounded-xl transition-all">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
            Connecter
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>("Tous");
  const [pdAccounts, setPdAccounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Native connections state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn || !user) return;
    setGoogleConnected(!!user.externalAccounts.find(a => a.provider === "google"));
    setMicrosoftConnected(!!user.externalAccounts.find(a => a.provider === "microsoft"));
    Promise.all([
      fetch("/api/pipedream/accounts").then(r => r.json()),
      fetch("/api/notion/connect").then(r => r.json()),
      fetch("/api/slack/connect").then(r => r.json()),
      fetch("/api/hubspot/connect").then(r => r.json()),
    ]).then(([pd, notion, slack, hs]) => {
      if (pd.connected) setPdAccounts(pd.connected);
      if (notion.configured) setNotionConnected(true);
      if (slack.configured) setSlackConnected(true);
      if (hs.configured) setHubspotConnected(true);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isSignedIn, user]);

  async function connectOAuth(strategy: "oauth_google" | "oauth_microsoft") {
    if (!user) return;
    setOauthBusy(strategy);
    try {
      const scopes = strategy === "oauth_microsoft"
        ? ["https://graph.microsoft.com/Mail.ReadWrite", "https://graph.microsoft.com/Mail.Send",
           "https://graph.microsoft.com/Calendars.ReadWrite", "offline_access"]
        : undefined;
      await user.createExternalAccount({
        strategy, redirectUrl: `${window.location.origin}/settings/sso-callback`,
        ...(scopes ? { additionalScopes: scopes } : {}),
      });
    } catch { setOauthBusy(null); }
  }

  async function disconnectOAuth(id: string) {
    if (!user) return;
    setOauthBusy(id);
    try { await user.externalAccounts.find(a => a.id === id)?.destroy(); await user.reload(); }
    finally { setOauthBusy(null); }
  }

  const totalConnected =
    (googleConnected ? 1 : 0) +
    (microsoftConnected ? 1 : 0) +
    (notionConnected ? 1 : 0) +
    (slackConnected ? 1 : 0) +
    (hubspotConnected ? 1 : 0) +
    Object.keys(pdAccounts).length;

  const googleAcc = user?.externalAccounts.find(a => a.provider === "google");
  const microsoftAcc = user?.externalAccounts.find(a => a.provider === "microsoft");

  // All native integrations
  const NATIVE: IntegrationDef[] = [
    { slug: "google", name: "Google", description: "Gmail · Google Calendar · Google Drive · Google Meet", category: "Email", color: "#4285F4", isPipedream: false, logo: <GoogleLogo />, connected: googleConnected, badge: "Clerk OAuth" },
    { slug: "microsoft", name: "Microsoft", description: "Outlook · Teams · Calendrier · OneDrive", category: "Email", color: "#00A4EF", isPipedream: false, logo: <MicrosoftLogo />, connected: microsoftConnected, badge: "Clerk OAuth" },
    { slug: "whatsapp", name: "WhatsApp Business", description: "Messagerie · Contacts · Canal n°1 en France", category: "Messagerie", color: "#25D366", isPipedream: false, logo: <WhatsAppLogo />, connected: false, badge: "Whapi" },
    { slug: "apple", name: "Apple iCloud", description: "Calendrier · Contacts · CalDAV natif", category: "Productivité", color: "#f5f5f7", isPipedream: false, logo: <AppleLogo />, badge: "App Password" },
    { slug: "notion", name: "Notion", description: "Pages · Databases · Notes · Projets", category: "Productivité", color: "#f5f5f7", isPipedream: false, logo: <NotionLogo />, connected: notionConnected },
    { slug: "slack", name: "Slack", description: "Canaux · Messages · Bots · Notifications", category: "Messagerie", color: "#E01E5A", isPipedream: false, logo: <SlackLogo />, connected: slackConnected },
    { slug: "hubspot", name: "HubSpot CRM", description: "Contacts · Deals · Pipeline · Séquences", category: "CRM", color: "#FF7A59", isPipedream: false, logo: <HubSpotLogo />, connected: hubspotConnected },
  ];

  const filterApps = (list: IntegrationDef[]) =>
    activeCategory === "Tous" ? list : list.filter(a => a.category === activeCategory);

  const filterPd = () =>
    activeCategory === "Tous" ? PIPEDREAM_APPS : PIPEDREAM_APPS.filter(a => a.category === activeCategory);

  if (!isLoaded || !isSignedIn) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="pt-24 pb-10 px-6 border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <svg width="18" height="18" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-violet-400 uppercase tracking-widest">Intégrations</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Connectez vos outils</h1>
              <p className="text-zinc-400 text-base max-w-lg">
                Chaque connexion est sécurisée via OAuth 2.0 — vos identifiants ne transitent jamais par Trigr.
              </p>
            </div>
            {/* Stats */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalConnected}</div>
                <div className="text-xs text-zinc-500">connectées</div>
              </div>
              <div className="w-px h-10 bg-white/[0.07]" />
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{NATIVE.length + PIPEDREAM_APPS.length}+</div>
                <div className="text-xs text-zinc-500">disponibles</div>
              </div>
              <div className="w-px h-10 bg-white/[0.07]" />
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full status-connected" />
                <span>Pipedream Connect actif</span>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 mt-8 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {loading && (
          <div className="flex items-center gap-3 text-zinc-600 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
            Chargement des connexions…
          </div>
        )}

        {/* ── Native integrations ─────────────────────────────────────────── */}
        {filterApps(NATIVE).length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-semibold text-zinc-300">Intégrations natives</h2>
              <div className="flex-1 h-px bg-white/[0.05]" />
              <span className="text-xs text-zinc-600">{filterApps(NATIVE).length} apps</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterApps(NATIVE).map(app => (
                <NativeCard key={app.slug}
                  logo={app.logo} name={app.name} description={app.description}
                  category={app.category} color={app.color}
                  connected={app.connected ?? false}
                  badge={app.badge}
                  onConnect={() => {
                    if (app.slug === "google") connectOAuth("oauth_google");
                    else if (app.slug === "microsoft") connectOAuth("oauth_microsoft");
                    else if (app.slug === "notion") window.location.href = "/api/notion/connect?action=authorize";
                    else if (app.slug === "slack") window.location.href = "/api/slack/connect?action=authorize";
                    else if (app.slug === "hubspot") window.location.href = "/api/hubspot/connect?action=authorize";
                    else if (app.slug === "whatsapp" || app.slug === "apple") router.push("/settings");
                  }}
                  onDisconnect={() => {
                    if (app.slug === "google" && googleAcc) disconnectOAuth(googleAcc.id);
                    else if (app.slug === "microsoft" && microsoftAcc) disconnectOAuth(microsoftAcc.id);
                    else if (app.slug === "notion") fetch("/api/notion/connect", { method: "DELETE" }).then(() => setNotionConnected(false));
                    else if (app.slug === "slack") fetch("/api/slack/connect", { method: "DELETE" }).then(() => setSlackConnected(false));
                    else if (app.slug === "hubspot") fetch("/api/hubspot/connect", { method: "DELETE" }).then(() => setHubspotConnected(false));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Pipedream Connect ───────────────────────────────────────────── */}
        {filterPd().length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h2 className="text-sm font-semibold text-zinc-300">Via Pipedream Connect</h2>
              </div>
              <div className="flex-1 h-px bg-white/[0.05]" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600">{filterPd().length} apps</span>
                <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-medium">OAuth sécurisé</span>
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-violet-500/[0.06] border border-violet-500/15 rounded-xl px-4 py-3.5 mb-5">
              <svg width="16" height="16" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="shrink-0 mt-0.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-zinc-400 leading-relaxed">
                En cliquant <span className="text-white font-medium">Connecter</span>, une fenêtre OAuth officielle s'ouvre — vous vous authentifiez directement sur le service. Pipedream stocke le token chiffré, Trigr reçoit uniquement un identifiant de compte anonymisé.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterPd().map(app => (
                <PipedreamConnectButton
                  key={app.slug}
                  userId={user!.id}
                  appSlug={app.slug}
                  appName={app.name}
                  appColor={app.color}
                  description={app.description}
                  category={app.category}
                  logo={app.logo}
                  connected={!!pdAccounts[app.slug]}
                  accountId={pdAccounts[app.slug]}
                  onConnected={(id) => setPdAccounts(prev => ({ ...prev, [app.slug]: id }))}
                  onDisconnected={() => setPdAccounts(prev => { const n = { ...prev }; delete n[app.slug]; return n; })}
                />
              ))}
            </div>
          </div>
        )}

        {filterApps(NATIVE).length === 0 && filterPd().length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">Aucune intégration dans cette catégorie.</div>
        )}
      </div>
    </div>
  );
}
