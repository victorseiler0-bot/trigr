"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Note = { id: string; titre: string; contenu: string; tags?: string[]; createdAt: string };

export default function NotesPage() {
  const { isSignedIn } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/notes").then(r => r.json()).then(d => { if (d.notes) setNotes(d.notes); }).finally(() => setLoading(false));
  }, [isSignedIn]);

  async function deleteNote(id: string) {
    await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const filtered = notes.filter(n => !search || n.titre.toLowerCase().includes(search.toLowerCase()) || n.contenu.toLowerCase().includes(search.toLowerCase()) || n.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex pt-16 max-w-6xl mx-auto w-full px-6 py-8 gap-6">

        {/* Sidebar notes */}
        <aside className="w-72 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">📝 Mes notes</h1>
            <Link href="/assistant?prefill=Prends une note : " className="text-xs text-blue-600 hover:text-blue-500 font-medium">+ Nouvelle →</Link>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-3">Aucune note</p>
              <Link href="/assistant?prefill=Prends une note : " className="text-xs text-blue-600 hover:underline">Créer via l&apos;assistant →</Link>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
              {filtered.map(n => (
                <button key={n.id} onClick={() => setSelected(n)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${selected?.id === n.id ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:border-blue-200"}`}>
                  <p className="text-sm font-semibold text-slate-900 truncate">{n.titre}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{n.contenu.slice(0, 60)}…</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    {n.tags?.slice(0, 2).map(t => <span key={t} className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full">{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Contenu note */}
        <main className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 min-h-[500px]">
          {selected ? (
            <div className="h-full flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.titre}</h2>
                  <p className="text-xs text-slate-400 mt-1">{new Date(selected.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  {selected.tags?.length ? (
                    <div className="flex gap-1.5 mt-2">{selected.tags.map(t => <span key={t} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>)}</div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Link href={`/assistant?prefill=${encodeURIComponent("Reprends cette note et améliore-la : " + selected.titre)}`}
                    className="text-xs text-blue-600 hover:text-blue-500 border border-blue-200 px-3 py-1.5 rounded-lg">
                    Améliorer avec l&apos;IA →
                  </Link>
                  <button onClick={() => deleteNote(selected.id)} className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg">
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="flex-1 prose prose-sm max-w-none overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">{selected.contenu}</pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <span className="text-5xl">📝</span>
              <h2 className="text-lg font-semibold text-slate-900">Tes notes Autozen</h2>
              <p className="text-sm text-slate-500 max-w-sm">Dis à l&apos;assistant "Prends une note sur..." et retrouve tout ici. Tes notes restent privées et chiffrées.</p>
              <Link href="/assistant?prefill=Prends une note : " className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
                Créer ma première note →
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
