import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/store";

export type Statut = "prospect" | "client" | "inactif" | "partenaire";
export type DealStage = "prospection" | "propose" | "negociation" | "gagne" | "perdu";

export interface Contact {
  id: string;
  nom: string;
  email: string;
  entreprise: string;
  telephone: string;
  statut: Statut;
  tags: string;
  derniereInteraction: string;
  notes: string;
  creeLe: string;
}

export interface Deal {
  id: string;
  title: string;
  contactName?: string;
  amount?: number;
  stage: DealStage;
  notes?: string;
  createdAt: string;
}

const CACHE_TTL = 5 * 60 * 1000;

interface CrmState {
  contacts: Contact[];
  deals: Deal[];
  lastFetched: number | null;
  sheetId: string;
}

const initialState: CrmState = {
  contacts: [],
  deals: [],
  lastFetched: null,
  sheetId: "",
};

export const crmSlice = createSlice({
  name: "crm",
  initialState,
  reducers: {
    setContacts: (s, a: PayloadAction<{ contacts: Contact[]; sheetId?: string }>) => {
      s.contacts = a.payload.contacts;
      if (a.payload.sheetId) s.sheetId = a.payload.sheetId;
      s.lastFetched = Date.now();
    },
    setDeals: (s, a: PayloadAction<Deal[]>) => { s.deals = a.payload; },
    addDeal: (s, a: PayloadAction<Deal>) => { s.deals.push(a.payload); },
    updateDeals: (s, a: PayloadAction<Deal[]>) => { s.deals = a.payload; },
    removeContact: (s, a: PayloadAction<string>) => { s.contacts = s.contacts.filter(c => c.id !== a.payload); },
    invalidate: (s) => { s.lastFetched = null; },
  },
});

export const { setContacts, setDeals, addDeal, updateDeals, removeContact, invalidate } = crmSlice.actions;
export const selectCrmStale = (s: RootState) => !s.crm.lastFetched || Date.now() - s.crm.lastFetched > CACHE_TTL;
export default crmSlice.reducer;
