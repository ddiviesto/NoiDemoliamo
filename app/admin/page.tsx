'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

interface Stats {
  totale_pratiche: number
  in_attesa_documenti: number
  in_attesa_assegnazione: number
  assegnate: number
  completate: number
  totale_utenti: number
}

interface Pratica {
  id: string
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  nome_richiedente: string | null
  telefono: string | null
  indirizzo_ritiro: string | null
  stato: string
  creato_il: string
}

const STATO_LABEL: Record<string, { label: string; color: string }> = {
  in_attesa_documenti: { label: 'Attesa documenti', color: 'bg-yellow-100 text-yellow-800' },
  in_attesa_assegnazione: { label: 'Da assegnare', color: 'bg-orange-100 text-orange-800' },
  assegnata: { label: 'Assegnata', color: 'bg-blue-100 text-blue-800' },
  ritirata: { label: 'Ritirata', color: 'bg-indigo-100 text-indigo-800' },
  certificato_rottamazione_caricato: { label: 'Cert. caricato', color: 'bg-teal-100 text-teal-800' },
  completata: { label: 'Completata', color: 'bg-green-100 text-green-800' },
  annullata: { label: 'Annullata', color: 'bg-red-100 text-red-800' },
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [filtroStato, setFiltroStato] = useState<string>('tutti')
  const [stats, setStats] = useState<Stats>({
    totale_pratiche: 0,
    in_attesa_documenti: 0,
    in_attesa_assegnazione: 0,
    assegnate: 0,
    completate: 0,
    totale_utenti: 0,
  })

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (session.user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }

      const { data: praticheData } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, nome_richiedente, telefono, indirizzo_ritiro, stato, creato_il')
        .order('creato_il', { ascending: false })

      if (praticheData) {
        setPratiche(praticheData)
        setStats({
          totale_pratiche: praticheData.length,
          in_attesa_documenti: praticheData.filter(p => p.stato === 'in_attesa_documenti').length,
          in_attesa_assegnazione: praticheData.filter(p => p.stato === 'in_attesa_assegnazione').length,
          assegnate: praticheData.filter(p => p.stato === 'assegnata').length,
          completate: praticheData.filter(p => p.stato === 'completata').length,
          totale_utenti: 0,
        })
      }

      setLoading(false)
    }
    carica()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const praticheFiltrate = filtroStato === 'tutti'
    ? pratiche
    : pratiche.filter(p => p.stato === filtroStato)

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Caricamento...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      {/* TOP BAR */}
      <div className="bg-[#0d2144] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">N</div>
          <span className="text-white font-medium text-sm">NoiDemoliamo</span>
          <span className="bg-blue-800 text-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
        </div>
        <button onClick={handleLogout} className="text-blue-300 hover:text-white text-sm transition-colors">Esci</button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* TITOLO */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pannello di controllo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestisci pratiche, demolitori e utenti</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Totale pratiche', val: stats.totale_pratiche, icon: '📋', color: 'bg-blue-50 text-blue-700' },
            { label: 'Attesa documenti', val: stats.in_attesa_documenti, icon: '📄', color: 'bg-yellow-50 text-yellow-700' },
            { label: 'Da assegnare', val: stats.in_attesa_assegnazione, icon: '⏳', color: 'bg-orange-50 text-orange-700' },
            { label: 'Completate', val: stats.completate, icon: '✅', color: 'bg-green-50 text-green-700' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`text-2xl mb-1`}>{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.val}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTRI */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['tutti', 'in_attesa_documenti', 'in_attesa_assegnazione', 'assegnata', 'completata', 'annullata'].map(stato => (
            <button
              key={stato}
              onClick={() => setFiltroStato(stato)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filtroStato === stato ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              {stato === 'tutti' ? 'Tutte' : STATO_LABEL[stato]?.label || stato}
            </button>
          ))}
        </div>

        {/* LISTA PRATICHE */}
        <div className="flex flex-col gap-3">
          {praticheFiltrate.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="text-4xl mb-3">📭</div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Nessuna pratica</h2>
              <p className="text-sm text-gray-500">Non ci sono pratiche in questa categoria.</p>
            </div>
          ) : (
            praticheFiltrate.map(p => {
              const stato = STATO_LABEL[p.stato] || { label: p.stato, color: 'bg-gray-100 text-gray-600' }
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/admin/pratiche/${p.id}`)}
                  className="bg-white rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-blue-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-base font-bold text-gray-900">{p.targa || '— Targa mancante'}</span>
                      <span className="text-sm text-gray-400 ml-2">
                        {p.tipo_mezzo} {p.marca && p.modello ? `· ${p.marca} ${p.modello}` : ''}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${stato.color}`}>
                      {stato.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {p.nome_richiedente && <span>👤 {p.nome_richiedente}</span>}
                    {p.telefono && <span>📞 {p.telefono}</span>}
                    {p.indirizzo_ritiro && <span>📍 {p.indirizzo_ritiro}</span>}
                  </div>
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(p.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {/* NAVIGAZIONE SEZIONI */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[
            { label: 'Gestione demolitori', icon: '🏭', path: '/admin/demolitori' },
            { label: 'Gestione collaboratori', icon: '🤝', path: '/admin/collaboratori' },
            { label: 'Gestione utenti', icon: '👥', path: '/admin/utenti' },
            { label: 'Mappa copertura', icon: '🗺️', path: '/admin/copertura' },
            { label: 'Impostazioni', icon: '⚙️', path: '/admin/impostazioni' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => router.push(item.path)}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-transparent hover:border-blue-200"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-gray-800">{item.label}</div>
            </button>
          ))}
        </div>

      </div>
    </main>
  )
}