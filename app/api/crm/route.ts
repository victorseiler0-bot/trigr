import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

const SHEET_TITLE = "Trigr CRM";
const COLUMNS = ["ID", "Nom", "Email", "Entreprise", "Téléphone", "Statut", "Tags", "Dernière interaction", "Notes", "Créé le"];

async function gFetch(url: string, token: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Google API error ${r.status}: ${await r.text()}`);
  return r.json();
}

// Trouve ou crée le spreadsheet CRM dans le Drive de l'utilisateur
async function getOrCreateSheet(token: string): Promise<string> {
  // Cherche le fichier existant
  const search = await fetch(
    `${DRIVE_API}/files?q=name='${SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { files } = await search.json();
  if (files?.length) return files[0].id;

  // Crée le spreadsheet
  const created = await gFetch(SHEETS_API, token, {
    method: "POST",
    body: JSON.stringify({
      properties: { title: SHEET_TITLE },
      sheets: [{
        properties: { title: "Contacts" },
        data: [{ startRow: 0, startColumn: 0, rowData: [{ values: COLUMNS.map(v => ({ userEnteredValue: { stringValue: v } })) }] }],
      }],
    }),
  });
  return created.spreadsheetId;
}

// Lit tous les contacts depuis le sheet
async function readContacts(token: string, sheetId: string) {
  const data = await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A1:J1000`, token);
  const rows: string[][] = data.values ?? [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row) => ({
    id: row[0] ?? "",
    nom: row[1] ?? "",
    email: row[2] ?? "",
    entreprise: row[3] ?? "",
    telephone: row[4] ?? "",
    statut: row[5] ?? "prospect",
    tags: row[6] ?? "",
    derniereInteraction: row[7] ?? "",
    notes: row[8] ?? "",
    creeLe: row[9] ?? "",
  })).filter(c => c.id);
}

// Ajoute un contact
async function addContact(token: string, sheetId: string, contact: Record<string, string>) {
  const id = crypto.randomUUID();
  const now = new Date().toLocaleDateString("fr-FR");
  const row = [id, contact.nom ?? "", contact.email ?? "", contact.entreprise ?? "", contact.telephone ?? "", contact.statut ?? "prospect", contact.tags ?? "", now, contact.notes ?? "", now];
  await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A:J:append?valueInputOption=RAW`, token, {
    method: "POST",
    body: JSON.stringify({ values: [row] }),
  });
  return { id, ...contact, creeLe: now, derniereInteraction: now };
}

// Met à jour un contact (trouve la ligne par ID)
async function updateContact(token: string, sheetId: string, id: string, updates: Record<string, string>) {
  const data = await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A1:J1000`, token);
  const rows: string[][] = data.values ?? [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex < 0) throw new Error("Contact non trouvé");

  const row = rows[rowIndex];
  const merged = [
    row[0],
    updates.nom ?? row[1],
    updates.email ?? row[2],
    updates.entreprise ?? row[3],
    updates.telephone ?? row[4],
    updates.statut ?? row[5],
    updates.tags ?? row[6],
    new Date().toLocaleDateString("fr-FR"),
    updates.notes ?? row[8],
    row[9],
  ];
  await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A${rowIndex + 1}:J${rowIndex + 1}?valueInputOption=RAW`, token, {
    method: "PUT",
    body: JSON.stringify({ values: [merged] }),
  });
  return { success: true };
}

// Supprime un contact (efface la ligne)
async function deleteContact(token: string, sheetId: string, id: string) {
  const data = await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A1:A1000`, token);
  const rows: string[][] = data.values ?? [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex < 0) throw new Error("Contact non trouvé");

  await gFetch(`${SHEETS_API}/${sheetId}:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: 0, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    }),
  });
  return { success: true };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserOauthAccessToken(userId, "google");
    const token = data[0]?.token;
    if (!token) return NextResponse.json({ error: "Connectez-vous avec Google pour accéder au CRM." }, { status: 403 });

    const sheetId = await getOrCreateSheet(token);
    const contacts = await readContacts(token, sheetId);
    return NextResponse.json({ contacts, sheetId });
  } catch (err) {
    console.error("[crm GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const body = await req.json();
    const { action, id, ...data } = body;

    const client = await clerkClient();
    const { data: oauthData } = await client.users.getUserOauthAccessToken(userId, "google");
    const token = oauthData[0]?.token;
    if (!token) return NextResponse.json({ error: "Token Google manquant." }, { status: 403 });

    const sheetId = await getOrCreateSheet(token);

    if (action === "add") return NextResponse.json(await addContact(token, sheetId, data));
    if (action === "update") return NextResponse.json(await updateContact(token, sheetId, id, data));
    if (action === "delete") return NextResponse.json(await deleteContact(token, sheetId, id));

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err) {
    console.error("[crm POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
