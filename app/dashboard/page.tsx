'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Pratica {
  id: string
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  indirizzo_ritiro: string | null
  stato: string
  creato_il: string
}

const STATO_LABEL: Record<string, { label: string; color: string }> = {
  in_attesa_documenti: { label: 'In attesa documenti', color: 'bg-yellow-100 text-yellow-800' },
  in_attesa_assegnazione: { label: 'In attesa assegnazione', color: 'bg-blue-100 text-blue-800' },
  assegnata: { label: 'Demolitore assegnato', color: 'bg-indigo-100 text-indigo-800' },
  ritirata: { label: 'Ritirata', color: 'bg-green-100 text-green-800' },
  certificato_rottamazione_caricato: { label: 'Certificato caricato', color: 'bg-teal-100 text-teal-800' },
  completata: { label: 'Completata', color: 'bg-green-100 text-green-800' },
  annullata: { label: 'Annullata', color: 'bg-red-100 text-red-800' },
}

export default function Dashboard() {
  const router = useRouter()
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [loading, setLoading] = useState(true)
  const [utente, setUtente] = useState<{ nome: string; email: string } | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id

      // Carica dati utente
      const { data: utenteData } = await supabase
        .from('utenti')
        .select('nome, email')
        .eq('id', userId)
        .single()
      if (utenteData) setUtente(utenteData)

      // Carica pratiche
      const { data: praticheData } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, indirizzo_ritiro, stato, creato_il')
        .eq('user_id', userId)
        .order('creato_il', { ascending: false })
      if (praticheData) setPratiche(praticheData)

      setLoading(false)
    }
    carica()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

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
        </div>
        <div className="flex items-center gap-4">
          <span className="text-blue-200 text-sm">Ciao, {utente?.nome || utente?.email || 'Utente'}</span>
          <button onClick={handleLogout} className="text-blue-300 hover:text-white text-sm transition-colors">Esci</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* INTESTAZIONE */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Le tue pratiche</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {pratiche.length === 0 ? 'Nessuna pratica ancora' : `${pratiche.length} pratica${pratiche.length > 1 ? 'he' : 'a'} attiva${pratiche.length > 1 ? 'e' : ''}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/inizia')}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            + Nuova pratica
          </button>
        </div>

        {/* LISTA PRATICHE */}
        {pratiche.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🚗</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Nessuna pratica</h2>
            <p className="text-sm text-gray-500 mb-4">Hai un veicolo da demolire? Inizia subito, è gratuito!</p>
            <button
              onClick={() => router.push('/inizia')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              Inizia ora 🚀
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pratiche.map(p => {
              const stato = STATO_LABEL[p.stato] || { label: p.stato, color: 'bg-gray-100 text-gray-600' }
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/dashboard/${p.id}`)}
                  className="bg-white rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-blue-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-gray-900 tracking-wide">
                        {p.targa || '— Targa da inserire'}
                      </span>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {p.tipo_mezzo ? p.tipo_mezzo.charAt(0).toUpperCase() + p.tipo_mezzo.slice(1) : ''}
                        {p.marca && p.modello ? ` · ${p.marca} ${p.modello}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${stato.color}`}>
                      {stato.label}
                    </span>
                  </div>
                  {p.indirizzo_ritiro && (
                    <p className="text-sm text-gray-400 flex items-center gap-1.5">
                      <span>📍</span> {p.indirizzo_ritiro}
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-2">
                    Aperta il {new Date(p.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}