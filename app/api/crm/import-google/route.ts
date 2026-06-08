import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API  = "https://www.googleapis.com/drive/v3";
const PEOPLE_API = "https://people.googleapis.com/v1";

const SHEET_TITLE = "Autozen CRM";
const COLUMNS = ["ID","Nom","Email","Entreprise","Téléphone","Statut","Tags","Dernière interaction","Notes","Créé le"];

type GContact = {
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  organizations?: Array<{ name?: string }>;
};

async function gFetch(url: string, token: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`Google API ${r.status}: ${await r.text()}`);
  return r.json();
}

async function getOrCreateSheet(token: string): Promise<string> {
  const search = await fetch(
    `${DRIVE_API}/files?q=name='${SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { files } = await search.json();
  if (files?.length) return files[0].id;
  const created = await gFetch(SHEETS_API, token, {
    method: "POST",
    body: JSON.stringify({
      properties: { title: SHEET_TITLE },
      sheets: [{ properties: { title: "Contacts" }, data: [{ startRow: 0, startColumn: 0, rowData: [{ values: COLUMNS.map(v => ({ userEnteredValue: { stringValue: v } })) }] }] }],
    }),
  });
  return created.spreadsheetId;
}

export async function POST(req: NextRequest) {
  void req;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const client = await clerkClient();
    const { data: oauthData } = await client.users.getUserOauthAccessToken(userId, "google");
    const token = oauthData[0]?.token;
    if (!token) return NextResponse.json({ error: "Connectez-vous avec Google pour importer vos contacts." }, { status: 403 });

    // Fetch all Google Contacts (paginated)
    let allContacts: GContact[] = [];
    let pageToken: string | undefined;
    let page = 0;
    do {
      const url = `${PEOPLE_API}/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await gFetch(url, token);
      allContacts = allContacts.concat(res.connections ?? []);
      pageToken = res.nextPageToken;
      page++;
    } while (pageToken && page < 10); // max 10k contacts

    // Get existing emails to skip duplicates
    const sheetId = await getOrCreateSheet(token);
    const existing = await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!C2:C5000`, token).catch(() => ({ values: [] }));
    const existingEmails = new Set<string>(((existing.values ?? []) as string[][]).flat().map(e => e.toLowerCase()).filter(Boolean));

    // Map contacts
    const now = new Date().toLocaleDateString("fr-FR");
    const toImport = allContacts
      .map((c) => ({
        name:    c.names?.[0]?.displayName ?? "",
        email:   c.emailAddresses?.[0]?.value ?? "",
        phone:   c.phoneNumbers?.[0]?.value ?? "",
        company: c.organizations?.[0]?.name ?? "",
      }))
      .filter(c => c.name.trim() && !existingEmails.has(c.email.toLowerCase()));

    if (toImport.length === 0) {
      return NextResponse.json({ imported: 0, skipped: allContacts.length, message: "Tous les contacts Google sont déjà dans le CRM." });
    }

    // Batch append
    const rows = toImport.map(c => [crypto.randomUUID(), c.name, c.email, c.company, c.phone, "prospect", "", now, "", now]);
    await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A:J:append?valueInputOption=RAW`, token, {
      method: "POST",
      body: JSON.stringify({ values: rows }),
    });

    return NextResponse.json({
      imported: toImport.length,
      skipped: allContacts.length - toImport.length,
      message: `${toImport.length} contact${toImport.length > 1 ? "s importés" : " importé"} depuis Google Contacts.`,
    });
  } catch (err) {
    console.error("[crm/import-google]", err);
    return NextResponse.json({ error: "Erreur lors de l'import depuis Google Contacts." }, { status: 500 });
  }
}
