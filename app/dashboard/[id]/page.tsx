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
  anno: number | null
  km: number | null
  incidentato: boolean
  marciante: boolean
  va_in_moto: boolean
  parti_mancanti: boolean
  note_veicolo: string | null
  indirizzo_ritiro: string | null
  codice_fiscale: string | null
  nome_richiedente: string | null
  telefono: string | null
  ruolo_richiedente: string | null
  libretto: string | null
  certificato_proprieta: string | null
  stato: string
  creato_il: string
  demolitore_id: string | null
  data_ritiro_prevista: string | null
}

const TIMELINE = [
  { key: 'in_attesa_documenti', label: 'Pratica aperta' },
  { key: 'in_attesa_assegnazione', label: 'Documenti verificati' },
  { key: 'assegnata', label: 'Demolitore assegnato' },
  { key: 'ritirata', label: 'Veicolo ritirato' },
  { key: 'completata', label: 'Pratica completata' },
]

const STATI_ORDINE = ['in_attesa_documenti', 'in_attesa_assegnazione', 'assegnata', 'ritirata', 'certificato_rottamazione_caricato', 'completata']

export default function DettaglioPratica({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [pratica, setPratica] = useState<Pratica | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState<'operatore' | 'demolitore'>('operatore')
  const [messaggi, setMessaggi] = useState<{ testo: string; mittente: boolean; ora: string }[]>([])
  const [nuovoMessaggio, setNuovoMessaggio] = useState('')

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('pratiche')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', session.user.id)
        .single()

      if (!data) { router.push('/dashboard'); return }
      setPratica(data)
      setLoading(false)
    }
    carica()
  }, [params.id, router])

  function statoIndex() {
    if (!pratica) return 0
    return STATI_ORDINE.indexOf(pratica.stato)
  }

  function inviaMessaggio() {
    if (!nuovoMessaggio.trim()) return
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    setMessaggi(prev => [...prev, { testo: nuovoMessaggio, mittente: true, ora }])
    setNuovoMessaggio('')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Caricamento...</div>
      </main>
    )
  }

  if (!pratica) return null

  const statoIdx = statoIndex()

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      {/* TOP BAR */}
      <div className="bg-[#0d2144] px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-blue-300 hover:text-white transition-colors text-sm flex items-center gap-1.5">
          ← Indietro
        </button>
        <span className="text-white font-medium text-sm">
          Pratica {pratica.targa || '—'}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* DATI VEICOLO */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">🚗</span>
            <span className="font-semibold text-gray-800 text-sm">Dati veicolo</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Tipo mezzo', val: pratica.tipo_mezzo },
              { label: 'Targa', val: pratica.targa },
              { label: 'Anno', val: pratica.anno?.toString() },
              { label: 'Chilometri', val: pratica.km ? `${pratica.km.toLocaleString('it-IT')} km` : null },
              { label: 'Marca', val: pratica.marca },
              { label: 'Modello', val: pratica.modello },
              { label: 'Incidentato', val: pratica.incidentato ? 'Sì' : 'No' },
              { label: 'Marciante', val: pratica.marciante ? 'Sì' : 'No' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{item.label}</div>
                <div className="text-sm font-medium text-gray-800">{item.val || '—'}</div>
              </div>
            ))}
            {pratica.note_veicolo && (
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Annotazioni</div>
                <div className="text-sm text-gray-800">{pratica.note_veicolo}</div>
              </div>
            )}
          </div>
        </div>

        {/* TIMELINE STATO */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">📍</span>
            <span className="font-semibold text-gray-800 text-sm">Stato pratica</span>
          </div>
          <div className="p-5">
            {TIMELINE.map((step, i) => {
              const done = i < statoIdx
              const current = i === statoIdx
              const waiting = i > statoIdx
              return (
                <div key={step.key} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${done ? 'bg-green-500 text-white' : current ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {done ? '✓' : current ? '●' : i + 1}
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 ${done ? 'bg-green-200' : 'bg-gray-100'}`} style={{ minHeight: 16 }} />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <div className={`text-sm font-medium ${waiting ? 'text-gray-300' : 'text-gray-800'}`}>{step.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DATI MANCANTI */}
        {(!pratica.targa || !pratica.codice_fiscale) && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-semibold text-gray-800 text-sm">Dati da completare</span>
            </div>
            <div className="p-5 flex flex-col gap-2">
              {!pratica.targa && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs flex-shrink-0">✗</div>
                  <span className="text-sm font-medium text-gray-800 flex-1">Targa veicolo</span>
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg cursor-pointer">Aggiungi</span>
                </div>
              )}
              {!pratica.codice_fiscale && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs flex-shrink-0">✗</div>
                  <span className="text-sm font-medium text-gray-800 flex-1">Codice fiscale</span>
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg cursor-pointer">Aggiungi</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTI */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">📁</span>
            <span className="font-semibold text-gray-800 text-sm">Documenti da consegnare al ritiro</span>
          </div>
          <div className="p-5 flex flex-col gap-2">
            {[
              { label: 'Carta d\'identità — fronte e retro', ok: false },
              { label: 'Tessera sanitaria — fronte e retro', ok: false },
              { label: pratica.libretto === 'si' ? 'Libretto di circolazione originale' : 'Denuncia smarrimento libretto', ok: false },
              { label: pratica.certificato_proprieta === 'digitale' ? 'Certificato proprietà digitale ✓' : 'Certificato di proprietà', ok: pratica.certificato_proprieta === 'digitale' },
            ].map((doc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${doc.ok ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                  {doc.ok ? '✓' : '✗'}
                </div>
                <span className="text-sm font-medium text-gray-800 flex-1">{doc.label}</span>
                {!doc.ok && (
                  <div className="flex gap-1">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg cursor-pointer">📷</span>
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg cursor-pointer">Carica</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CERTIFICATI */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">📄</span>
            <span className="font-semibold text-gray-800 text-sm">Certificati</span>
          </div>
          <div className="p-5 flex flex-col gap-3">
            {[
              { label: 'Certificato di rottamazione', sub: 'Disponibile dopo il ritiro', ok: pratica.stato === 'completata' },
              { label: 'Radiazione PRA', sub: 'Disponibile dopo 15 giorni dal ritiro', ok: false },
            ].map((cert, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📜</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{cert.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{cert.sub}</div>
                </div>
                <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${cert.ok ? 'bg-blue-600 text-white cursor-pointer' : 'bg-gray-100 text-gray-400'}`}>
                  {cert.ok ? '⬇ Scarica' : 'In attesa'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHAT */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">💬</span>
            <span className="font-semibold text-gray-800 text-sm">Messaggi</span>
          </div>
          <div className="flex border-b border-gray-50">
            <button onClick={() => setActiveChat('operatore')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeChat === 'operatore' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              Operatore NoiDemoliamo
            </button>
            <button onClick={() => setActiveChat('demolitore')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeChat === 'demolitore' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              Demolitore
            </button>
          </div>
          <div className="p-4 min-h-32 flex flex-col gap-2">
            {messaggi.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-300 py-6">
                Nessun messaggio ancora
              </div>
            ) : (
              messaggi.map((m, i) => (
                <div key={i} className={`flex ${m.mittente ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.mittente ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {m.testo}
                    <div className={`text-xs mt-1 ${m.mittente ? 'text-blue-200' : 'text-gray-400'}`}>{m.ora}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 p-4 border-t border-gray-50">
            <input
              type="text"
              value={nuovoMessaggio}
              onChange={e => setNuovoMessaggio(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inviaMessaggio()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
            />
            <button onClick={inviaMessaggio} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-blue-700 transition-colors">
              →
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}