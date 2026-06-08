"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setContacts, setDeals, addDeal, updateDeals, removeContact as removeContactAction, selectCrmStale } from "@/lib/slices/crmSlice";
import type { Contact, Deal, DealStage, Statut } from "@/lib/slices/crmSlice";

const STAGE_CONFIG: Record<DealStage, { label: string; color: string; bg: string }> = {
  prospection: { label: "Prospection", color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
  propose:     { label: "Devis envoyé", color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  negociation: { label: "Négociation",  color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  gagne:       { label: "Gagné ✓",      color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
  perdu:       { label: "Perdu",        color: "text-red-600",    bg: "bg-red-50 border-red-200" },
};

const STATUT_CONFIG: Record<Statut, { label: string; dot: string; badge: string }> = {
  prospect:   { label: "Prospect",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  client:     { label: "Client",     dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactif:    { label: "Inactif",    dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-500 border-slate-200" },
  partenaire: { label: "Partenaire", dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
};

const EMPTY_FORM: Omit<Contact, "id" | "derniereInteraction" | "creeLe"> = {
  nom: "", email: "", entreprise: "", telephone: "", statut: "prospect", tags: "", notes: "",
};

export default function CrmPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const storeContacts = useAppSelector(s => s.crm.contacts);
  const storeDeals    = useAppSelector(s => s.crm.deals);
  const storeSheetId  = useAppSelector(s => s.crm.sheetId);
  const isStale       = useAppSelector(selectCrmStale);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | Statut>("tous");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"contacts" | "pipeline">("contacts");
  const [dealForm, setDealForm] = useState<Partial<Deal>>({ stage: "prospection" });
  const [dealOpen, setDealOpen] = useState(false);
  const [dealSaving, setDealSaving] = useState(false);

  async function load(force = false) {
    if (!force && !isStale && storeContacts.length > 0) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/crm");
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Erreur"); return; }
      dispatch(setContacts({ contacts: data.contacts ?? [], sheetId: data.sheetId }));
    } catch {
      setError("Impossible de charger les contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (storeDeals.length === 0) {
      fetch("/api/crm/deals").then(r => r.json()).then(d => { if (d.deals) dispatch(setDeals(d.deals)); }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveDeal() {
    if (!dealForm.title) return;
    setDealSaving(true);
    try {
      const r = await fetch("/api/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deal: dealForm }) });
      const d = await r.json();
      if (d.deal) { dispatch(addDeal(d.deal)); setDealOpen(false); setDealForm({ stage: "prospection" }); }
    } finally { setDealSaving(false); }
  }

  async function moveDeal(id: string, stage: DealStage) {
    const r = await fetch("/api/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move", id, stage }) });
    const d = await r.json();
    if (d.deals) dispatch(updateDeals(d.deals));
  }

  async function deleteDeal(id: string) {
    await fetch("/api/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    dispatch(updateDeals(storeDeals.filter(d => d.id !== id)));
  }

  const filtered = storeContacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.nom, c.email, c.entreprise, c.tags].some((f) => f.toLowerCase().includes(q));
    const matchStatut = filterStatut === "tous" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  async function handleSave() {
    setSaving(true);
    try {
      const action = selected ? "update" : "add";
      const body = selected ? { action, id: selected.id, ...form } : { action, ...form };
      const r = await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); alert(d.error ?? "Erreur"); return; }
      setShowForm(false);
      setSelected(null);
      setForm(EMPTY_FORM);
      await load(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    setDeleting(id);
    try {
      await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
      dispatch(removeContactAction(id));
      setSelected(null);
    } finally {
      setDeleting("");
    }
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/crm/import-csv", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setImportMsg({ text: d.error ?? "Erreur import CSV", ok: false }); return; }
      setImportMsg({ text: `${d.imported} contact(s) importé(s) depuis CSV`, ok: true });
      await load(true);
    } catch {
      setImportMsg({ text: "Erreur réseau", ok: false });
    } finally {
      setImportingCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
      setTimeout(() => setImportMsg(null), 5000);
    }
  }

  async function handleImportGoogle() {
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await fetch("/api/crm/import-google", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setImportMsg({ text: d.error ?? "Erreur import", ok: false }); return; }
      setImportMsg({ text: d.message, ok: true });
      await load(true);
    } catch {
      setImportMsg({ text: "Erreur réseau", ok: false });
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 5000);
    }
  }

  function openEdit(c: Contact) {
    setSelected(c);
    setForm({ nom: c.nom, email: c.email, entreprise: c.entreprise, telephone: c.telephone, statut: c.statut, tags: c.tags, notes: c.notes });
    setShowForm(true);
  }

  function openNew() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  const stats = {
    total: storeContacts.length,
    clients: storeContacts.filter((c) => c.statut === "client").length,
    prospects: storeContacts.filter((c) => c.statut === "prospect").length,
  };

  const sheetUrl = storeSheetId ? `https://docs.google.com/spreadsheets/d/${storeSheetId}` : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM <span className="text-blue-600">Orbe</span></h1>
            <p className="text-slate-500 mt-1 text-sm">Tes contacts, stockés dans ton Google Drive.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
              <button onClick={() => setViewMode("contacts")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "contacts" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Contacts
              </button>
              <button onClick={() => setViewMode("pipeline")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "pipeline" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Pipeline
              </button>
            </div>
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 bg-white px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Voir dans Sheets
              </a>
            )}
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
            <button onClick={() => csvInputRef.current?.click()} disabled={importingCsv}
              className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm">
              {importingCsv ? (
                <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
              ) : (
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
              {importingCsv ? "Import…" : "CSV"}
            </button>
            <button onClick={handleImportGoogle} disabled={importing}
              className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm">
              {importing ? (
                <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-slate-500"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              )}
              {importing ? "Import…" : "Google Contacts"}
            </button>
            <button onClick={openNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12" strokeLinecap="round"/></svg>
              Ajouter
            </button>
          </div>
        </div>

        {/* Import result */}
        {importMsg && (
          <div className={`mb-5 px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${importMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}>
            {importMsg.ok ? "✓" : "✗"} {importMsg.text}
          </div>
        )}

        {/* ── PIPELINE VIEW ─────────────────────────────────────────────── */}
        {viewMode === "pipeline" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">{storeDeals.filter(d => d.stage !== "gagne" && d.stage !== "perdu").length} deal(s) actifs · {storeDeals.filter(d => d.stage === "gagne").reduce((s, d) => s + (d.amount ?? 0), 0).toLocaleString("fr-FR")} € signés</p>
              <button onClick={() => setDealOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" strokeLinecap="round"/></svg>
                Nouveau deal
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4">
              {(["prospection", "propose", "negociation", "gagne", "perdu"] as DealStage[]).map(stage => {
                const stageDeals = storeDeals.filter(d => d.stage === stage);
                const cfg = STAGE_CONFIG[stage];
                return (
                  <div key={stage} className="flex-shrink-0 w-60">
                    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${cfg.bg}`}>
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="ml-auto text-xs text-slate-400">{stageDeals.length}</span>
                    </div>
                    <div className="space-y-2">
                      {stageDeals.map(deal => (
                        <div key={deal.id} className="bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 hover:shadow-sm transition-all group">
                          <p className="text-sm font-medium text-slate-900 mb-1 leading-snug">{deal.title}</p>
                          {deal.contactName && <p className="text-xs text-slate-400 mb-1">{deal.contactName}</p>}
                          {deal.amount && <p className="text-xs text-blue-600 font-semibold">{deal.amount.toLocaleString("fr-FR")} €</p>}
                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(["prospection", "propose", "negociation", "gagne", "perdu"] as DealStage[]).filter(s => s !== stage).map(s => (
                              <button key={s} onClick={() => moveDeal(deal.id, s)} title={STAGE_CONFIG[s].label}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${STAGE_CONFIG[s].bg} ${STAGE_CONFIG[s].color} hover:opacity-70 transition-opacity`}>
                                → {STAGE_CONFIG[s].label.slice(0, 6)}
                              </button>
                            ))}
                            <button onClick={() => deleteDeal(deal.id)} className="ml-auto text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {dealOpen && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setDealOpen(false); }}>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Nouveau deal</h3>
                  <div className="space-y-3">
                    <input value={dealForm.title ?? ""} onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre du deal *" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <input value={dealForm.contactName ?? ""} onChange={e => setDealForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Client / contact" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <input type="number" value={dealForm.amount ?? ""} onChange={e => setDealForm(f => ({ ...f, amount: Number(e.target.value) || undefined }))} placeholder="Montant (€)" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <select value={dealForm.stage ?? "prospection"} onChange={e => setDealForm(f => ({ ...f, stage: e.target.value as DealStage }))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {(Object.keys(STAGE_CONFIG) as DealStage[]).map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setDealOpen(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all">Annuler</button>
                    <button onClick={saveDeal} disabled={dealSaving || !dealForm.title} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
                      {dealSaving ? "Enregistrement…" : "Créer le deal"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "contacts" && <>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total", value: stats.total, color: "text-slate-900" },
            { label: "Clients", value: stats.clients, color: "text-emerald-600" },
            { label: "Prospects", value: stats.prospects, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contact…"
            className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {(["tous", "prospect", "client", "partenaire", "inactif"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatut(s)}
                className={`text-sm px-3 py-2 rounded-xl border transition-all capitalize ${
                  filterStatut === s ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}>
                {s === "tous" ? "Tous" : STATUT_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">👥</div>
            <div className="text-slate-400 mb-2">{storeContacts.length === 0 ? "Aucun contact pour l'instant" : "Aucun résultat"}</div>
            {storeContacts.length === 0 && (
              <button onClick={openNew} className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline underline-offset-4">
                Ajouter ton premier contact →
              </button>
            )}
          </div>
        ) : (
          /* Table */
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium hidden lg:table-cell">Entreprise</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium hidden md:table-cell">Dernière interaction</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(selected?.id === c.id ? null : c)} className="text-left">
                        <div className="font-medium text-slate-900">{c.nom || "—"}</div>
                        {c.tags && <div className="text-xs text-slate-400 mt-0.5">{c.tags}</div>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {c.email ? <a href={`mailto:${c.email}`} className="hover:text-blue-600 transition-colors">{c.email}</a> : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{c.entreprise || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUT_CONFIG[c.statut]?.badge ?? ""}`}>
                        {STATUT_CONFIG[c.statut]?.label ?? c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{c.derniereInteraction || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all disabled:opacity-40">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Panneau détail contact */}
        {selected && !showForm && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selected.nom}</h2>
                <div className="text-sm text-slate-500">{selected.entreprise}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
              {selected.email && <div><div className="text-xs text-slate-400 mb-1">Email</div><a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a></div>}
              {selected.telephone && <div><div className="text-xs text-slate-400 mb-1">Téléphone</div><span className="text-slate-700">{selected.telephone}</span></div>}
              {selected.tags && <div><div className="text-xs text-slate-400 mb-1">Tags</div><span className="text-slate-600">{selected.tags}</span></div>}
              {selected.derniereInteraction && <div><div className="text-xs text-slate-400 mb-1">Dernière interaction</div><span className="text-slate-600">{selected.derniereInteraction}</span></div>}
              {selected.creeLe && <div><div className="text-xs text-slate-400 mb-1">Ajouté le</div><span className="text-slate-600">{selected.creeLe}</span></div>}
            </div>
            {selected.notes && <div className="text-sm text-slate-500 border-t border-slate-100 pt-4 whitespace-pre-wrap">{selected.notes}</div>}
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => openEdit(selected)} className="text-sm px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all">Modifier</button>
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-all">
                  Ouvrir email
                </a>
              )}
              <button
                onClick={() => {
                  const parts = [`Rédige un message pour ${selected.nom}`];
                  if (selected.entreprise) parts.push(`de ${selected.entreprise}`);
                  if (selected.email) parts.push(`(email : ${selected.email})`);
                  if (selected.telephone) parts.push(`(tél : ${selected.telephone})`);
                  if (selected.notes) parts.push(`— Notes : ${selected.notes}`);
                  const prefill = parts.join(" ");
                  router.push(`/assistant?prefill=${encodeURIComponent(prefill)}`);
                }}
                className="text-sm px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-1.5"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Contacter avec Orbe
              </button>
              {selected.telephone && (
                <button
                  onClick={() => {
                    const phone = selected.telephone.replace(/\D/g, "");
                    const prefill = `Envoie un message WhatsApp à ${selected.nom} (numéro : ${phone}) : `;
                    router.push(`/assistant?prefill=${encodeURIComponent(prefill)}`);
                  }}
                  className="text-sm px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
        </>}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{selected ? "Modifier le contact" : "Nouveau contact"}</h2>
              <button onClick={() => { setShowForm(false); setSelected(null); }} className="text-slate-400 hover:text-slate-700">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {(["nom", "email", "entreprise", "telephone"] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs text-slate-500 capitalize mb-1 block">{f === "nom" ? "Nom *" : f === "telephone" ? "Téléphone" : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input
                    value={form[f]}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    type={f === "email" ? "email" : "text"}
                    placeholder={f === "nom" ? "Jean Dupont" : f === "email" ? "jean@exemple.fr" : ""}
                  />
                </div>
              ))}

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Statut</label>
                <select value={form.statut} onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value as Statut }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  {(Object.keys(STATUT_CONFIG) as Statut[]).map((s) => (
                    <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tags <span className="text-slate-400">(séparés par virgule)</span></label>
                <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="design, inbound, 2026" />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Rencontré au salon, intéressé par le plan Pro…" />
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowForm(false); setSelected(null); }}
                  className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving || !form.nom}
                  className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-40">
                  {saving ? "Enregistrement…" : selected ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
