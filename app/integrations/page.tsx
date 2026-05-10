"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { PipedreamConnectButton } from "@/components/PipedreamConnect";

type Category = "Tout" | "Communication" | "Productivité" | "CRM" | "Dev" | "Finance";

interface AppDef {
  slug: string;
  name: string;
  description: string;
  category: Category;
  color: string; // couleur de la marque
  logo: React.ReactNode;
  popular?: boolean;
}

// ── Logos SVG ─────────────────────────────────────────────────────────────────
const L = {
  Google: () => <svg viewBox="0 0 18 18" width="24" height="24" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>,
  Outlook: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.5q0 .46-.3.77-.3.3-.75.3H13.5V12H24zm-12.5-3.5H13V10h-1.5V8.5zM14.5 10H16V8.5h-1.5V10zM16 10h1.5V8.5H16V10zm1.5 0H19V8.5h-1.5V10zm1.5 0h1.5V8.5H19V10zm-7.5 3H13v-1.5h-1.5V13zm1.5 0h1.5v-1.5H13V13zm1.5 0H16v-1.5h-1.5V13zM16 13h1.5v-1.5H16V13zm1.5 0H19v-1.5h-1.5V13zm1.5 0h1.5v-1.5H19V13zM8.08 9.45q-.9 0-1.6.3-.7.29-1.2.82-.49.53-.76 1.27-.26.75-.26 1.67 0 .85.24 1.57.25.72.7 1.24.46.52 1.13.81.67.3 1.53.3.86 0 1.52-.3.67-.29 1.14-.82.47-.52.72-1.25.25-.73.25-1.6 0-.9-.27-1.64-.26-.74-.74-1.27-.48-.52-1.15-.81-.67-.29-1.49-.29zM22 22v-9H13.5v.5H22z" fill="#0078D4"/></svg>,
  WhatsApp: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>,
  Slack: () => <svg viewBox="0 0 122.8 122.8" width="22" height="22"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0S90.5 5.8 90.5 12.9v32.3z" fill="#2EB67D"/><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/></svg>,
  Notion: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#191919"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.824 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.222-.187z"/></svg>,
  HubSpot: () => <svg viewBox="0 0 512 512" width="22" height="22" fill="#FF7A59"><path d="M267.4 211.6c-25.1 17.2-42.5 47.8-42.5 83.1 0 26.7 10.1 51.2 26.8 69.9l-56.2 56.2c-6.5-3-13.9-4.7-21.6-4.7-27.4 0-49.6 22.2-49.6 49.6S146.5 515.3 173.9 515.3s49.6-22.2 49.6-49.6c0-7.9-1.9-15.3-5.1-21.9l55.5-55.5c19.3 17.4 44.7 28 72.7 28 60.5 0 109.7-49.1 109.7-109.7s-49.1-109.7-109.7-109.7c-28.5 0-54.6 10.8-74.3 28.7zM346.5 368.5c-40.8 0-74-33.2-74-74s33.2-74 74-74 74 33.2 74 74-33.2 74-74 74z"/><path d="M285.1 219.2v-60.3c9.3-4.3 15.8-13.7 15.8-24.6v-.8c0-14.9-12.1-27.1-27.1-27.1h-.8c-14.9 0-27.1 12.1-27.1 27.1v.8c0 10.9 6.4 20.3 15.8 24.6v60.3c-14.2 2.1-27.3 7.7-38.5 16.2L122.5 119.7c.9-3.1 1.4-6.4 1.4-9.8 0-20.3-16.5-36.8-36.8-36.8s-36.8 16.5-36.8 36.8 16.5 36.8 36.8 36.8c8.5 0 16.3-2.9 22.5-7.7l99.8 113.5c-16.4 19.3-26.2 44.3-26.2 71.6 0 60.5 49.1 109.7 109.7 109.7s109.7-49.1 109.7-109.7c0-55.8-41.8-101.9-95.5-108.7z"/></svg>,
  Airtable: () => <svg viewBox="0 0 200 170" width="22" height="20"><path d="M90.039 12.368L24.079 38.66c-4.418 1.748-4.39 7.985.045 9.694l66.26 25.455c6.027 2.314 12.719 2.314 18.746 0l66.261-25.455c4.435-1.71 4.462-7.946.045-9.694L109.416 12.368c-6.231-2.45-13.146-2.45-19.377 0z" fill="#FFBF00"/><path d="M105.382 95.387v67.79c0 3.225 3.245 5.388 6.222 4.19l73.394-28.593c1.73-.674 2.86-2.35 2.86-4.19V66.794c0-3.225-3.246-5.388-6.222-4.19l-73.395 28.593c-1.73.675-2.86 2.35-2.86 4.19z" fill="#18BFFF"/><path d="M88.198 99.55L65.862 89.22l-2.584-1.21L18.8 68.906c-3.006-1.395-6.442.748-6.442 4.08v67.765c0 1.77.963 3.393 2.54 4.205l7.478 3.868 59.868 30.992c3.149 1.63 6.822-.625 6.822-4.205V103.63a4.663 4.663 0 00-2.868-4.08z" fill="#F82B60"/></svg>,
  GitHub: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#24292f"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>,
  Trello: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#0052CC"><path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .794-.645 1.44-1.44 1.44H15c-.795 0-1.44-.646-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/></svg>,
  Linear: () => <svg viewBox="0 0 100 100" width="22" height="22"><defs><linearGradient id="lG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#5E6AD2"/><stop offset="100%" stopColor="#8A92E3"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(#lG)"/><path d="M17.68 62.99L37 82.32a41.06 41.06 0 01-19.32-19.33zM15 54.09L45.91 85a40.99 40.99 0 01-6.55-1.26L16.26 60.65A40.88 40.88 0 0115 54.1zM85 45.91L54.09 15a41.06 41.06 0 0130.91 30.91zM82.32 37L37.01 82.32a41.08 41.08 0 01-19.33-19.33L62.99 17.68A41.06 41.06 0 0182.32 37zM62.99 17.68L17.68 62.99a41 41 0 01-1.42-6.9L56.09 16.26a40.9 40.9 0 016.9 1.42z" fill="white"/></svg>,
  Zoom: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#2D8CFF"><path d="M4.5 4.5h15A4.5 4.5 0 0124 9v6a4.5 4.5 0 01-4.5 4.5h-15A4.5 4.5 0 010 15V9A4.5 4.5 0 014.5 4.5zm12 3v9l6-3V10.5l-6-3z"/></svg>,
  Stripe: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#635BFF"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>,
  Salesforce: () => <svg viewBox="0 0 256 181" width="26" height="18" fill="#00A1E0"><path d="M106.5 21.4A46.8 46.8 0 01138 9.3c18.7 0 35 10.9 43.2 26.9a52.7 52.7 0 0121-4.3C228.4 31.9 256 59.7 256 94c0 34.4-27.6 62.3-61.8 62.3H64C28.7 156.3 0 127.4 0 91.9c0-31 21.4-57.1 50.2-63.8a46 46 0 0156.3-6.7z"/></svg>,
  Asana: () => <svg viewBox="0 0 512 512" width="22" height="22" fill="#F06A6A"><path d="M383.5 264a128.5 128.5 0 11-256.9 0 128.5 128.5 0 01256.9 0zm-255 0a126.5 126.5 0 10253 0 126.5 126.5 0 00-253 0zm170.2-149.3a85.7 85.7 0 11-171.4 0 85.7 85.7 0 01171.4 0z"/></svg>,
  Jira: () => <svg viewBox="0 0 32 32" width="22" height="22"><path d="M28.226 1.81H15.706L27.7 13.804a2.58 2.58 0 010 3.641L15.706 29.44h12.52A2.58 2.58 0 0030.806 26.86V4.39A2.58 2.58 0 0028.226 1.81z" fill="#2684FF"/><path d="M15.854 15.975L4.168 4.294a2.58 2.58 0 00-3.641 0L.504 4.317v23.47a2.58 2.58 0 002.58 2.58H15.6L3.606 18.373a2.58 2.58 0 010-3.641l12.248-12.244z" fill="#0052CC"/></svg>,
  ClickUp: () => <svg viewBox="0 0 24 24" width="22" height="22"><path d="M3.173 11.927L0 8.666l4.337-3.913c2.143 2.366 4.306 3.558 7.667 3.558 3.353 0 5.51-1.186 7.643-3.545l4.353 3.9-3.18 3.261c-2.5-2.44-5.184-3.81-8.816-3.81-3.627 0-6.301 1.366-8.83 3.81z" fill="url(#cu1)"/><path d="M12 24L4.337 16.47 7.517 13.2l4.483 4.37 4.483-4.37 3.18 3.268L12 24z" fill="url(#cu2)"/><defs><linearGradient id="cu1" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#8930FD"/><stop offset="100%" stopColor="#49CCF9"/></linearGradient><linearGradient id="cu2" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#FF02F0"/><stop offset="100%" stopColor="#FFC800"/></linearGradient></defs></svg>,
  Calendly: () => <svg viewBox="0 0 256 256" width="22" height="22" fill="#006BFF"><path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm0 230.4C70.3 230.4 25.6 185.7 25.6 128S70.3 25.6 128 25.6 230.4 70.3 230.4 128 185.7 230.4 128 230.4zm44.5-121.4h-32V83.5c0-6.9-5.6-12.5-12.5-12.5s-12.5 5.6-12.5 12.5v38c0 6.9 5.6 12.5 12.5 12.5h44.5c6.9 0 12.5-5.6 12.5-12.5s-5.6-12.5-12.5-12.5z"/></svg>,
  Discord: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.128 18.113a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>,
  Shopify: () => <svg viewBox="0 0 87.3 100" width="20" height="24" fill="#95BF47"><path d="M74.7 14.8s-1.4.4-3.7 1.1c-.4-1.3-1-2.8-1.8-4.4-2.6-5-6.5-7.7-11.1-7.7-.3 0-.6 0-1 .1-.1-.2-.3-.3-.4-.5-2-2.1-4.5-3.1-7.6-3-5.9.1-11.8 4.4-16.5 12-3.4 5.3-5.9 12-6.6 17.2l-11.4 3.5c-3.3 1-3.5 1.2-3.9 4.3C10.2 39.5 0 108.9 0 108.9l73.1 12.7V14.5l-1.4.3-.3-1c.3.3.3.3.3.3l3-.9-.7 1.9-.4.4zm-17.2 5.3c-3.9 1.2-8.2 2.5-12.4 3.8.4-2.4 1.2-4.8 2.3-6.9 1.5-3 3.6-5.4 6-7 2.5 4.7 4.1 10 4.1 10.1z"/></svg>,
};

// ── 19 apps définies (slugs vérifiés contre Pipedream API) ─────────────────────
const APPS: AppDef[] = [
  // Google = natif (traité séparément)
  { slug: "microsoft_outlook", name: "Microsoft Outlook", description: "Emails, calendrier et Teams en un seul compte Microsoft.", category: "Communication", color: "#0078D4", logo: <L.Outlook />, popular: true },
  { slug: "whatsapp_business", name: "WhatsApp Business", description: "Connexion via clé API Meta — pas OAuth iframe.", category: "Communication", color: "#25D366", logo: <L.WhatsApp />, popular: true },
  { slug: "slack", name: "Slack", description: "Canaux, messages directs et notifications dans ton espace de travail.", category: "Communication", color: "#E01E5A", logo: <L.Slack />, popular: true },
  { slug: "discord", name: "Discord", description: "Serveurs, canaux vocaux et messages Discord.", category: "Communication", color: "#5865F2", logo: <L.Discord /> },
  { slug: "notion", name: "Notion", description: "Pages, databases, notes et projets Notion.", category: "Productivité", color: "#191919", logo: <L.Notion />, popular: true },
  { slug: "airtable_oauth", name: "Airtable", description: "Bases de données, vues et automatisations.", category: "Productivité", color: "#FFBF00", logo: <L.Airtable />, popular: true },
  { slug: "trello", name: "Trello", description: "Boards, cartes et listes pour gérer vos projets.", category: "Productivité", color: "#0052CC", logo: <L.Trello /> },
  { slug: "clickup", name: "ClickUp", description: "Tâches, documents et objectifs en une seule plateforme.", category: "Productivité", color: "#7B68EE", logo: <L.ClickUp /> },
  { slug: "calendly_v2", name: "Calendly", description: "Prise de rendez-vous automatique et gestion de disponibilités.", category: "Productivité", color: "#006BFF", logo: <L.Calendly /> },
  { slug: "hubspot", name: "HubSpot CRM", description: "Contacts, deals, pipeline et séquences marketing.", category: "CRM", color: "#FF7A59", logo: <L.HubSpot />, popular: true },
  { slug: "salesforce_rest_api", name: "Salesforce", description: "CRM enterprise, leads, opportunités et rapports.", category: "CRM", color: "#00A1E0", logo: <L.Salesforce /> },
  { slug: "asana", name: "Asana", description: "Tâches, projets et workflows d'équipe.", category: "CRM", color: "#F06A6A", logo: <L.Asana /> },
  { slug: "github", name: "GitHub", description: "Repos, issues, pull requests et actions CI/CD.", category: "Dev", color: "#24292f", logo: <L.GitHub />, popular: true },
  { slug: "linear", name: "Linear", description: "Issues, cycles et roadmap pour les équipes produit.", category: "Dev", color: "#5E6AD2", logo: <L.Linear /> },
  { slug: "jira", name: "Jira", description: "Issues, sprints, epics et projets Agile.", category: "Dev", color: "#2684FF", logo: <L.Jira /> },
  { slug: "zoom", name: "Zoom", description: "Réunions, webinaires, recordings et transcriptions.", category: "Communication", color: "#2D8CFF", logo: <L.Zoom /> },
  { slug: "stripe", name: "Stripe", description: "Connexion via clé API Stripe — pas OAuth iframe.", category: "Finance", color: "#635BFF", logo: <L.Stripe />, popular: true },
  { slug: "shopify", name: "Shopify", description: "Produits, commandes, clients et inventaire.", category: "Finance", color: "#96BF47", logo: <L.Shopify /> },
];

const CATEGORIES: Category[] = ["Tout", "Communication", "Productivité", "CRM", "Dev", "Finance"];

// ── IntegrationCard light ──────────────────────────────────────────────────────
function AppCard({ app, userId, connected, accountId, onConnected, onDisconnected }: {
  app: AppDef; userId: string; connected: boolean; accountId?: string;
  onConnected: (id: string) => void; onDisconnected: () => void;
}) {
  return (
    <PipedreamConnectButton
      userId={userId}
      appSlug={app.slug}
      appName={app.name}
      appColor={app.color}
      description={app.description}
      category={app.category}
      logo={app.logo}
      connected={connected}
      accountId={accountId}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
    />
  );
}

// ── Google native card ─────────────────────────────────────────────────────────
function GoogleCard({ connected, email, onConnect, onDisconnect }: {
  connected: boolean; email?: string; onConnect: () => void; onDisconnect: () => void;
}) {
  return (
    <div className={`relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${
      connected ? "border-slate-200 bg-white shadow-md" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
    }`}>
      {connected && <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, #4285F430, transparent)" }} />}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0"><L.Google /></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">Google</span>
                <span className={`w-2 h-2 rounded-full ${connected ? "status-connected" : "status-disconnected"}`} />
              </div>
              <span className="text-xs text-slate-400">Email & Agenda</span>
            </div>
          </div>
          <span className="text-xs text-slate-400 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded font-mono shrink-0">Natif</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {email ? `Connecté en tant que ${email}` : "Gmail · Google Calendar · Google Meet"}
        </p>
        {connected ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1.5 5.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Connecté
            </span>
            <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/></svg>
              Déconnecter
            </button>
          </div>
        ) : (
          <button onClick={onConnect}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-all">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" strokeLinecap="round"/></svg>
            Connecter avec Google
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>("Tout");
  const [search, setSearch] = useState("");
  const [pdAccounts, setPdAccounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [oauthBusy, setOauthBusy] = useState(false);

  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/pipedream/accounts")
      .then(r => r.json())
      .then(d => { if (d.connected) setPdAccounts(d.connected); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const googleAccount = user?.externalAccounts.find(a => a.provider === "google");
  const googleConnected = !!googleAccount;

  async function connectGoogle() {
    if (!user) return;
    setOauthBusy(true);
    try {
      await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/settings/sso-callback`,
      });
    } catch { setOauthBusy(false); }
  }

  async function disconnectGoogle() {
    if (!googleAccount) return;
    setOauthBusy(true);
    try { await googleAccount.destroy(); await user!.reload(); }
    finally { setOauthBusy(false); }
  }

  const filtered = useMemo(() => {
    let apps = APPS;
    if (activeCategory !== "Tout") apps = apps.filter(a => a.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    return apps;
  }, [activeCategory, search]);

  const totalConnected = (googleConnected ? 1 : 0) + Object.keys(pdAccounts).length;
  const popular = APPS.filter(a => a.popular);

  if (!isLoaded || !isSignedIn) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  );

  const showGoogle = activeCategory === "Tout" || activeCategory === "Communication";
  const showGoogleSearch = search === "" || "google gmail calendar".includes(search.toLowerCase());

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 pt-24 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Intégrations</p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                Connectez vos outils
              </h1>
              <p className="text-slate-500 text-base">
                Connexion OAuth sécurisée — vos identifiants ne transitent jamais par Trigr.
              </p>
            </div>
            {/* Stats */}
            <div className="flex items-center gap-5 shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{totalConnected}</div>
                <div className="text-xs text-slate-400">connectée{totalConnected !== 1 ? "s" : ""}</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{APPS.length + 1}</div>
                <div className="text-xs text-slate-400">disponibles</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full status-connected" />
                OAuth actif
              </div>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Chercher une app…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {loading && (
          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin" />
            Chargement de vos connexions…
          </div>
        )}

        {/* ── Populaires (sans recherche) ──────────────────────────────────── */}
        {!search && activeCategory === "Tout" && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-semibold text-slate-700">⭐ Les plus utilisées</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Google toujours en premier dans les populaires */}
              <GoogleCard
                connected={googleConnected}
                email={googleAccount?.emailAddress}
                onConnect={connectGoogle}
                onDisconnect={disconnectGoogle}
              />
              {popular.map(app => (
                <AppCard key={app.slug} app={app} userId={user!.id}
                  connected={!!pdAccounts[app.slug]} accountId={pdAccounts[app.slug]}
                  onConnected={id => setPdAccounts(p => ({ ...p, [app.slug]: id }))}
                  onDisconnected={() => setPdAccounts(p => { const n = { ...p }; delete n[app.slug]; return n; })}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Toutes les apps (filtrées) ────────────────────────────────────── */}
        {(search || activeCategory !== "Tout") && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-semibold text-slate-700">
                {search ? `Résultats pour "${search}"` : activeCategory}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">
                {(showGoogle && showGoogleSearch ? 1 : 0) + filtered.length} app{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {showGoogle && showGoogleSearch && (
                <GoogleCard
                  connected={googleConnected}
                  email={googleAccount?.emailAddress}
                  onConnect={connectGoogle}
                  onDisconnect={disconnectGoogle}
                />
              )}
              {filtered.map(app => (
                <AppCard key={app.slug} app={app} userId={user!.id}
                  connected={!!pdAccounts[app.slug]} accountId={pdAccounts[app.slug]}
                  onConnected={id => setPdAccounts(p => ({ ...p, [app.slug]: id }))}
                  onDisconnected={() => setPdAccounts(p => { const n = { ...p }; delete n[app.slug]; return n; })}
                />
              ))}
              {filtered.length === 0 && (!showGoogle || !showGoogleSearch) && (
                <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                  Aucune intégration trouvée pour &quot;{search}&quot;
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Toutes les apps sans filtre ─────────────────────────────────── */}
        {!search && activeCategory === "Tout" && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-semibold text-slate-700">Toutes les intégrations</span>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">{APPS.length + 1} apps</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <GoogleCard
                connected={googleConnected}
                email={googleAccount?.emailAddress}
                onConnect={connectGoogle}
                onDisconnect={disconnectGoogle}
              />
              {APPS.map(app => (
                <AppCard key={app.slug} app={app} userId={user!.id}
                  connected={!!pdAccounts[app.slug]} accountId={pdAccounts[app.slug]}
                  onConnected={id => setPdAccounts(p => ({ ...p, [app.slug]: id }))}
                  onDisconnected={() => setPdAccounts(p => { const n = { ...p }; delete n[app.slug]; return n; })}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Info sécurité ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" fill="none" stroke="#7c3aed" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Connexions 100 % sécurisées</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chaque connexion passe par OAuth 2.0 officiel — vous vous authentifiez directement sur le service (Google, Slack, etc.), jamais sur Trigr.
              Les tokens sont chiffrés par Pipedream Connect et stockés sous votre identifiant anonymisé. Trigr ne voit jamais vos mots de passe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
