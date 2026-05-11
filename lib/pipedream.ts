import { PipedreamClient } from "@pipedream/sdk";

let _client: PipedreamClient | null = null;

export function getPipedreamClient(): PipedreamClient {
  if (_client) return _client;
  _client = new PipedreamClient({
    clientId: process.env.PIPEDREAM_CLIENT_ID!,
    clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
    projectId: process.env.PIPEDREAM_PROJECT_ID!,
    projectEnvironment: (process.env.PIPEDREAM_ENV ?? "production") as "production" | "development",
  });
  return _client;
}

export type PipedreamApp = {
  slug: string;
  name: string;
  category: string;
  description: string;
};

export const PIPEDREAM_APPS: PipedreamApp[] = [
  { slug: "instagram_business", name: "Instagram", category: "social", description: "DMs · Commentaires · Stories" },
  { slug: "slack", name: "Slack", category: "messaging", description: "Canaux · Messages · Bots" },
  { slug: "notion", name: "Notion", category: "productivity", description: "Pages · Databases · Notes" },
  { slug: "hubspot", name: "HubSpot", category: "crm", description: "Contacts · Deals · Pipeline" },
  { slug: "airtable", name: "Airtable", category: "productivity", description: "Bases de données · Vues" },
  { slug: "github", name: "GitHub", category: "dev", description: "Repos · Issues · PRs" },
  { slug: "trello", name: "Trello", category: "productivity", description: "Boards · Cartes · Listes" },
  { slug: "linear", name: "Linear", category: "dev", description: "Issues · Cycles · Projets" },
  { slug: "salesforce", name: "Salesforce", category: "crm", description: "CRM · Leads · Opportunités" },
  { slug: "stripe", name: "Stripe", category: "finance", description: "Paiements · Abonnements" },
  { slug: "zoom", name: "Zoom", category: "video", description: "Réunions · Webinaires" },
  { slug: "jira", name: "Jira", category: "dev", description: "Issues · Sprints · Projets" },
  { slug: "shopify", name: "Shopify", category: "ecommerce", description: "Produits · Commandes · Clients" },
];
