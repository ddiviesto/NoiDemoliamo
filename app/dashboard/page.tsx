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

// Mappa stato → etichetta + colore + emoji
const STATO_INFO: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
  in_attesa_documenti: { label: 'In attesa documenti', bg: 'bg-yellow-100', text: 'text-yellow-800', emoji: '📄' },
  in_attesa_approvazione_admin: { label: 'In verifica', bg: 'bg-blue-100', text: 'text-blue-800', emoji: '🔍' },
  documenti_parzialmente_approvati: { label: 'Documenti da rifare', bg: 'bg-red-100', text: 'text-red-800', emoji: '⚠️' },
  da_assegnare: { label: 'In attesa assegnazione', bg: 'bg-orange-100', text: 'text-orange-800', emoji: '⏳' },
  assegnata: { label: 'Demolitore assegnato', bg: 'bg-blue-100', text: 'text-blue-800', emoji: '🔧' },
  ritiro_confermato: { label: 'Ritiro confermato', bg: 'bg-indigo-100', text: 'text-indigo-800', emoji: '📅' },
  ritirata: { label: 'Veicolo ritirato', bg: 'bg-purple-100', text: 'text-purple-800', emoji: '🚚' },
  in_attesa_cert_rottamazione: { label: 'In attesa certificato', bg: 'bg-teal-100', text: 'text-teal-800', emoji: '⏳' },
  in_attesa_cert_radiazione_pra: { label: 'In attesa PRA', bg: 'bg-teal-100', text: 'text-teal-800', emoji: '⏳' },
  completata: { label: 'Completata', bg: 'bg-green-100', text: 'text-green-800', emoji: '✅' },
  annullata: { label: 'Annullata', bg: 'bg-gray-200', text: 'text-gray-600', emoji: '❌' },
}

function infoStato(stato: string) {
  return STATO_INFO[stato] || { label: stato, bg: 'bg-gray-100', text: 'text-gray-600', emoji: '•' }
}

export default function DashboardCliente() {
  const router = useRouter()
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [loading, setLoading] = useState(true)
  const [nomeUtente, setNomeUtente] = useState<string>('')

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Recupera dati utente
      const { data: utente } = await supabase
        .from('utenti')
        .select('nome')
        .eq('id', session.user.id)
        .single()
      if (utente?.nome) setNomeUtente(utente.nome.split(' ')[0])

      // Recupera pratiche dell'utente
      const { data, error } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, indirizzo_ritiro, stato, creato_il')
        .eq('user_id', session.user.id)
        .order('creato_il', { ascending: false })

      if (!error && data) setPratiche(data)
      setLoading(false)
    }
    carica()
  }, [router])

  async function logout() {
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
      {/* TOPBAR */}
      <div className="bg-[#0d2144] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">N</div>
          <span className="text-white font-medium text-sm">NoiDemoliamo</span>
        </div>
        <div className="flex items-center gap-3">
          {nomeUtente && <span className="text-blue-200 text-sm">Ciao, {nomeUtente}</span>}
          <button onClick={logout} className="text-blue-300 hover:text-white text-sm transition-colors">Esci</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* TITOLO */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Le tue pratiche</h1>
            <p className="text-xs text-gray-500 mt-0.5">{pratiche.length} {pratiche.length === 1 ? 'pratica attiva' : 'pratiche'}</p>
          </div>
          <button
            onClick={() => router.push('/inizia')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <span className="text-lg leading-none">+</span> Nuova
          </button>
        </div>

        {/* LISTA PRATICHE */}
        {pratiche.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">📭</div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Nessuna pratica</h2>
            <p className="text-sm text-gray-500 mb-5">Inizia ora la tua prima richiesta di demolizione gratuita.</p>
            <button
              onClick={() => router.push('/inizia')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-xl"
            >
              Richiedi demolizione
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pratiche.map(p => {
              const s = infoStato(p.stato)
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/dashboard/${p.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-blue-200 text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-gray-900 truncate">
                        {p.targa || '— Targa mancante'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {p.tipo_mezzo && <span className="capitalize">{p.tipo_mezzo}</span>}
                        {p.marca && p.modello && <span> · {p.marca} {p.modello}</span>}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text} flex items-center gap-1`}>
                      <span>{s.emoji}</span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </span>
                  </div>

                  {p.indirizzo_ritiro && (
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <span>📍</span>
                      <span className="truncate">{p.indirizzo_ritiro}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-400 mt-2">
                    {new Date(p.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}