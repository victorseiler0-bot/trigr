import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEET_TITLE = "Autozen CRM";

async function gFetch(url: string, token: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
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

  const COLUMNS = ["ID", "Nom", "Email", "Entreprise", "Téléphone", "Statut", "Tags", "Dernière interaction", "Notes", "Créé le"];
  const created = await gFetch(SHEETS_API, token, {
    method: "POST",
    body: JSON.stringify({
      properties: { title: SHEET_TITLE },
      sheets: [{ properties: { title: "Contacts" }, data: [{ startRow: 0, startColumn: 0, rowData: [{ values: COLUMNS.map(v => ({ userEnteredValue: { stringValue: v } })) }] }] }],
    }),
  });
  return created.spreadsheetId;
}

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  return lines.map(line => {
    const row: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; continue; }
      if (c === "," && !inQuote) { row.push(cur.trim()); cur = ""; continue; }
      if (c === ";" && !inQuote) { row.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    row.push(cur.trim());
    return row;
  });
}

// Maps common CSV column names to CRM fields
function detectColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const rules: [keyof typeof map, RegExp][] = [
    ["nom",         /^(nom|name|prenom|prénom|full.?name|contact)/i],
    ["email",       /^(email|courriel|mail|e-mail)/i],
    ["entreprise",  /^(entreprise|company|société|org|organisation)/i],
    ["telephone",   /^(tel|phone|téléphone|mobile|portable|numero)/i],
    ["statut",      /^(statut|status|type|catégorie)/i],
    ["tags",        /^(tags?|labels?|groupes?)/i],
    ["notes",       /^(notes?|commentaires?|description|infos?)/i],
  ];
  headers.forEach((h, i) => {
    for (const [field, regex] of rules) {
      if (regex.test(h) && !(field in map)) { map[field] = i; break; }
    }
  });
  return map;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const pm = user.privateMetadata as Record<string, unknown>;
  const googleToken = pm.googleToken as string | undefined;
  if (!googleToken) return NextResponse.json({ error: "Connectez-vous avec Google pour utiliser le CRM." }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: "CSV vide ou invalide" }, { status: 400 });

  const [headerRow, ...dataRows] = rows;
  const colMap = detectColumns(headerRow);

  const sheetId = await getOrCreateSheet(googleToken);
  const now = new Date().toLocaleDateString("fr-FR");
  let imported = 0;
  const skipped: string[] = [];

  const batchRows: string[][] = [];

  for (const row of dataRows) {
    const nom = colMap.nom !== undefined ? row[colMap.nom] : row[0];
    if (!nom?.trim()) { skipped.push(row.join(",")); continue; }

    const id = crypto.randomUUID();
    batchRows.push([
      id,
      nom.trim(),
      colMap.email !== undefined ? row[colMap.email]?.trim() ?? "" : "",
      colMap.entreprise !== undefined ? row[colMap.entreprise]?.trim() ?? "" : "",
      colMap.telephone !== undefined ? row[colMap.telephone]?.trim() ?? "" : "",
      colMap.statut !== undefined ? row[colMap.statut]?.trim() ?? "prospect" : "prospect",
      colMap.tags !== undefined ? row[colMap.tags]?.trim() ?? "" : "",
      now,
      colMap.notes !== undefined ? row[colMap.notes]?.trim() ?? "" : "",
      now,
    ]);
    imported++;
  }

  if (batchRows.length > 0) {
    await gFetch(`${SHEETS_API}/${sheetId}/values/Contacts!A:J:append?valueInputOption=RAW`, googleToken, {
      method: "POST",
      body: JSON.stringify({ values: batchRows }),
    });
  }

  return NextResponse.json({ imported, skipped: skipped.length, sheetId });
}
