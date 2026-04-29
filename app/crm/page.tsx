"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Statut = "prospect" | "client" | "inactif" | "partenaire";

interface Contact {
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

const STATUT_CONFIG: Record<Statut, { label: string; dot: string; badge: string }> = {
  prospect:   { label: "Prospect",   dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  client:     { label: "Client",     dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  inactif:    { label: "Inactif",    dot: "bg-zinc-500",    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  partenaire: { label: "Partenaire", dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};

const EMPTY_FORM: Omit<Contact, "id" | "derniereInteraction" | "creeLe"> = {
  nom: "", email: "", entreprise: "", telephone: "", statut: "prospect", tags: "", notes: "",
};

export default function CrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | Statut>("tous");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const sheetUrl = useRef<string>("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/crm");
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Erreur"); return; }
      setContacts(data.contacts ?? []);
      if (data.sheetId) sheetUrl.current = `https://docs.google.com/spreadsheets/d/${data.sheetId}`;
    } catch {
      setError("Impossible de charger les contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = contacts.filter((c) => {
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
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    setDeleting(id);
    try {
      await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
      setSelected(null);
      await load();
    } finally {
      setDeleting("");
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
    total: contacts.length,
    clients: contacts.filter((c) => c.statut === "client").length,
    prospects: contacts.filter((c) => c.statut === "prospect").length,
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM <span className="text-violet-400">Trigr</span></h1>
            <p className="text-zinc-400 mt-1 text-sm">Tes contacts, stockés dans ton Google Drive.</p>
          </div>
          <div className="flex items-center gap-3">
            {sheetUrl.current && (
              <a href={sheetUrl.current} target="_blank" rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 border border-white/[0.07] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Voir dans Sheets
              </a>
            )}
            <button onClick={openNew}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12" strokeLinecap="round"/></svg>
              Ajouter
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Clients", value: stats.clients, color: "text-emerald-400" },
            { label: "Prospects", value: stats.prospects, color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contact…"
            className="flex-1 min-w-[200px] bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40"
          />
          <div className="flex gap-2 flex-wrap">
            {(["tous", "prospect", "client", "partenaire", "inactif"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatut(s)}
                className={`text-sm px-3 py-2 rounded-xl border transition-all capitalize ${
                  filterStatut === s ? "bg-violet-600 border-violet-500 text-white" : "border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                }`}>
                {s === "tous" ? "Tous" : STATUT_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] text-red-400 text-sm">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">👥</div>
            <div className="text-zinc-400 mb-2">{contacts.length === 0 ? "Aucun contact pour l'instant" : "Aucun résultat"}</div>
            {contacts.length === 0 && (
              <button onClick={openNew} className="mt-4 text-sm text-violet-400 hover:text-violet-300 underline underline-offset-4">
                Ajouter ton premier contact →
              </button>
            )}
          </div>
        ) : (
          /* Table */
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Entreprise</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Dernière interaction</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(selected?.id === c.id ? null : c)} className="text-left">
                        <div className="font-medium text-white">{c.nom || "—"}</div>
                        {c.tags && <div className="text-xs text-zinc-500 mt-0.5">{c.tags}</div>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {c.email ? <a href={`mailto:${c.email}`} className="hover:text-white transition-colors">{c.email}</a> : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{c.entreprise || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUT_CONFIG[c.statut]?.badge ?? ""}`}>
                        {STATUT_CONFIG[c.statut]?.label ?? c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{c.derniereInteraction || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                          className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/[0.06] transition-all disabled:opacity-40">
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
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.nom}</h2>
                <div className="text-sm text-zinc-400">{selected.entreprise}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white p-1">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
              {selected.email && <div><div className="text-xs text-zinc-500 mb-1">Email</div><a href={`mailto:${selected.email}`} className="text-violet-400 hover:underline">{selected.email}</a></div>}
              {selected.telephone && <div><div className="text-xs text-zinc-500 mb-1">Téléphone</div><span>{selected.telephone}</span></div>}
              {selected.tags && <div><div className="text-xs text-zinc-500 mb-1">Tags</div><span className="text-zinc-300">{selected.tags}</span></div>}
              {selected.derniereInteraction && <div><div className="text-xs text-zinc-500 mb-1">Dernière interaction</div><span>{selected.derniereInteraction}</span></div>}
              {selected.creeLe && <div><div className="text-xs text-zinc-500 mb-1">Ajouté le</div><span>{selected.creeLe}</span></div>}
            </div>
            {selected.notes && <div className="text-sm text-zinc-400 border-t border-white/[0.06] pt-4 whitespace-pre-wrap">{selected.notes}</div>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => openEdit(selected)} className="text-sm px-3 py-1.5 border border-white/[0.08] rounded-xl text-zinc-300 hover:text-white hover:border-white/20 transition-all">Modifier</button>
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="text-sm px-3 py-1.5 bg-violet-600/20 border border-violet-500/20 rounded-xl text-violet-400 hover:bg-violet-600/30 transition-all">
                  Envoyer un email
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#111113] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{selected ? "Modifier le contact" : "Nouveau contact"}</h2>
              <button onClick={() => { setShowForm(false); setSelected(null); }} className="text-zinc-500 hover:text-white">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {(["nom", "email", "entreprise", "telephone"] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs text-zinc-400 capitalize mb-1 block">{f === "nom" ? "Nom *" : f === "telephone" ? "Téléphone" : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input
                    value={form[f]}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40"
                    type={f === "email" ? "email" : "text"}
                    placeholder={f === "nom" ? "Jean Dupont" : f === "email" ? "jean@exemple.fr" : ""}
                  />
                </div>
              ))}

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Statut</label>
                <select value={form.statut} onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value as Statut }))}
                  className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40">
                  {(Object.keys(STATUT_CONFIG) as Statut[]).map((s) => (
                    <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Tags <span className="text-zinc-600">(séparés par virgule)</span></label>
                <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40"
                  placeholder="design, inbound, 2026" />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none"
                  placeholder="Rencontré au salon, intéressé par le plan Pro…" />
              </div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowForm(false); setSelected(null); }}
                  className="flex-1 py-2.5 text-sm border border-white/[0.08] rounded-xl text-zinc-400 hover:text-white transition-all">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving || !form.nom}
                  className="flex-1 py-2.5 text-sm bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all disabled:opacity-40">
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
