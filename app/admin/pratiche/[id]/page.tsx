'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DocumentiApprovazione from './DocumentiApprovazione'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

// ============================================================
// TIPI
// ============================================================

interface Pratica {
  id: string
  user_id: string | null
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  km: number | null
  incidentato: boolean | null
  marciante: boolean | null
  va_in_moto: boolean | null
  parti_mancanti: boolean | null
  note_veicolo: string | null
  indirizzo_ritiro: string | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
  lat: number | null
  lng: number | null
  codice_fiscale: string | null
  nome_richiedente: string | null
  telefono: string | null
  ruolo_richiedente: string | null
  demolitore_id: string | null
  stato: string
  note_admin: string | null
  creato_il: string
}

// ============================================================
// COMPONENTE
// ============================================================

export default function DettaglioPraticaAdmin() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [pratica, setPratica] = useState<Pratica | null>(null)
  const [loading, setLoading] = useState(true)
  // Tutti i documenti approvati? Aggiornato dal componente DocumentiApprovazione
  const [tuttiApprovati, setTuttiApprovati] = useState(false)
  const [processoInCorso, setProcessoInCorso] = useState(false)
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  // -----------------------------
  // CARICAMENTO
  // -----------------------------
  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('pratiche')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) {
        router.push('/admin')
        return
      }
      setPratica(data)
      setLoading(false)
    }
    if (id) carica()
  }, [id, router])

  // -----------------------------
  // AZIONI DESTINO PRATICA
  // -----------------------------

  async function assegnaDemolizioneStandard() {
    if (!pratica) return
    if (!confirm('Confermi l\'assegnazione automatica al miglior demolitore disponibile?')) return
    setProcessoInCorso(true)
    setMessaggio(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessione scaduta')

      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pratica_id: pratica.id }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        const motivo = data?.motivo || data?.error || 'Errore sconosciuto'
        setMessaggio({ tipo: 'errore', testo: `Assegnazione non riuscita: ${motivo}` })
        // Ricarica la pratica per vedere se è passata a "in_assegnazione_manuale"
        await ricaricaPratica()
        return
      }

      setMessaggio({
        tipo: 'ok',
        testo: `Pratica assegnata a ${data.vincitore?.ragione_sociale ?? 'demolitore'}`,
      })
      await ricaricaPratica()
    } catch (err) {
      console.error('Errore assegnazione:', err)
      setMessaggio({ tipo: 'errore', testo: 'Errore di rete durante l\'assegnazione.' })
    } finally {
      setProcessoInCorso(false)
    }
  }

  async function annullaPratica() {
    if (!pratica) return
    if (!confirm('Sei sicuro di voler ANNULLARE questa pratica? L\'azione è quasi sempre irreversibile.')) return
    setProcessoInCorso(true)
    const { error } = await supabase
      .from('pratiche')
      .update({ stato: 'annullata', aggiornato_il: new Date().toISOString() })
      .eq('id', pratica.id)
    setProcessoInCorso(false)
    if (error) {
      alert('Errore durante l\'annullamento. Riprova.')
      return
    }
    setMessaggio({ tipo: 'ok', testo: 'Pratica annullata' })
    await ricaricaPratica()
  }

  async function ricaricaPratica() {
    const { data } = await supabase.from('pratiche').select('*').eq('id', id).single()
    if (data) setPratica(data)
  }

  // -----------------------------
  // RENDER
  // -----------------------------

  if (loading) return (
    <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Caricamento...</div>
    </main>
  )

  if (!pratica) return null

  const labelStato = etichettaStato(pratica.stato)
  const coloreStato = coloreStatoClasses(pratica.stato)
  const statoDestinoBloccato = !tuttiApprovati || ['assegnata', 'in_assegnazione', 'completata', 'annullata'].includes(pratica.stato)

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      <div className="bg-[#0d2144] px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin')} className="text-blue-300 hover:text-white text-sm transition-colors">
          ← Indietro
        </button>
        <span className="text-white font-medium text-sm">
          Pratica {pratica.targa || '—'} · {pratica.marca || ''} {pratica.modello || ''}
        </span>
        <span className={`ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full ${coloreStato}`}>
          {labelStato}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-3">

        {/* MESSAGGIO FEEDBACK */}
        {messaggio && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${messaggio.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {messaggio.testo}
          </div>
        )}

        {/* STEP 1: DOCUMENTI */}
        <DocumentiApprovazione
          praticaId={pratica.id}
          onStatoCambiato={(approvati) => setTuttiApprovati(approvati)}
        />

        {/* STEP 2: DESTINO PRATICA */}
        <div
          className={`bg-white border border-gray-200 rounded-2xl p-5 transition-opacity ${statoDestinoBloccato ? 'opacity-55' : 'opacity-100'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              {statoDestinoBloccato ? '🔒' : '🚀'} Step 2 · Destino pratica
            </p>
            {statoDestinoBloccato && pratica.demolitore_id == null && (
              <span className="text-[11px] text-gray-400 italic">Si sblocca quando tutti i documenti sono approvati</span>
            )}
            {pratica.demolitore_id && (
              <span className="text-[11px] text-green-700 italic">Già assegnata</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
            <CardDestino
              icona="🔧"
              titolo="Demolizione standard"
              descrizione="Algoritmo sceglie il demolitore migliore"
              disabilitata={statoDestinoBloccato || processoInCorso}
              onClick={assegnaDemolizioneStandard}
              colore="blue"
            />
            <CardDestino
              icona="🔥"
              titolo="Asta demolitori"
              descrizione="Trattativa extra per auto interessanti"
              disabilitata={true}
              onClick={() => alert('In arrivo prossimamente')}
              colore="orange"
            />
            <CardDestino
              icona="💼"
              titolo="Proponi ai commercianti"
              descrizione="Test mercato → poi OK cliente"
              disabilitata={true}
              onClick={() => alert('In arrivo prossimamente')}
              colore="purple"
            />
            <CardDestino
              icona="🛒"
              titolo="Compra per NoiDemoliamo"
              descrizione="Richiede OK cliente"
              disabilitata={true}
              onClick={() => alert('In arrivo prossimamente')}
              colore="green"
            />
          </div>
        </div>

        {/* DATI CLIENTE E VEICOLO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">👤 Cliente</p>
            <DataItem label="Nome" value={pratica.nome_richiedente} />
            <DataItem label="Telefono" value={pratica.telefono} />
            <DataItem label="CF" value={pratica.codice_fiscale} mono />
            <DataItem label="Ruolo" value={pratica.ruolo_richiedente} />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">🚗 Veicolo</p>
            <DataItem label="Targa" value={pratica.targa} />
            <DataItem label="Tipo" value={pratica.tipo_mezzo} />
            <DataItem label="Marca / modello" value={`${pratica.marca || ''} ${pratica.modello || ''}`.trim() || null} />
            <DataItem label="Anno · km" value={`${pratica.anno || '—'} · ${pratica.km?.toLocaleString('it-IT') || '—'}`} />
            <DataItem label="Marciante" value={pratica.marciante ? 'Sì' : 'No'} />
            <DataItem label="Incidentato" value={pratica.incidentato ? 'Sì' : 'No'} />
          </div>
        </div>

        {/* INDIRIZZO RITIRO */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-2">📍 Indirizzo ritiro</p>
          <p className="text-sm text-gray-700">
            {pratica.indirizzo_ritiro || '—'}
            {pratica.comune_ritiro && ` · ${pratica.comune_ritiro}`}
            {pratica.provincia_ritiro && ` (${pratica.provincia_ritiro})`}
          </p>
        </div>

        {/* NOTE VEICOLO */}
        {pratica.note_veicolo && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-800 mb-2">📝 Note del cliente sul veicolo</p>
            <p className="text-sm text-gray-600 italic">{pratica.note_veicolo}</p>
          </div>
        )}

        {/* ANNULLA PRATICA */}
        <div className="flex justify-end pt-2">
          <button
            onClick={annullaPratica}
            disabled={processoInCorso || pratica.stato === 'annullata'}
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Annulla pratica
          </button>
        </div>

      </div>
    </main>
  )
}

// ============================================================
// SOTTOCOMPONENTI
// ============================================================

function DataItem({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  )
}

function CardDestino(props: {
  icona: string
  titolo: string
  descrizione: string
  disabilitata: boolean
  onClick: () => void
  colore: 'blue' | 'orange' | 'purple' | 'green'
}) {
  const coloreIcona = {
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
  }[props.colore]
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabilitata}
      className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 flex items-start gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span className={`text-xl ${coloreIcona}`}>{props.icona}</span>
      <div>
        <div className="text-sm font-medium text-gray-800">{props.titolo}</div>
        <div className="text-xs text-gray-500 mt-0.5">{props.descrizione}</div>
      </div>
    </button>
  )
}

function etichettaStato(stato: string): string {
  const map: Record<string, string> = {
    'in_attesa_documenti': 'Attesa documenti',
    'in_attesa_approvazione_admin': 'Da approvare',
    'da_assegnare': 'Da assegnare',
    'in_assegnazione_manuale': 'Assegnazione manuale',
    'assegnata': 'Assegnata',
    'in_attesa_conferma_cliente': 'Attesa conferma cliente',
    'ritiro_confermato': 'Ritiro confermato',
    'ritirata': 'Veicolo ritirato',
    'in_attesa_cert_rottamazione': 'Attesa cert. rottamazione',
    'in_attesa_cert_radiazione_pra': 'Attesa cert. PRA',
    'completata': 'Completata',
    'annullata': 'Annullata',
  }
  return map[stato] || stato
}

function coloreStatoClasses(stato: string): string {
  if (['completata'].includes(stato)) return 'bg-green-100 text-green-800'
  if (['annullata'].includes(stato)) return 'bg-gray-200 text-gray-600'
  if (['assegnata', 'ritiro_confermato', 'ritirata'].includes(stato)) return 'bg-blue-100 text-blue-800'
  if (stato === 'in_assegnazione_manuale') return 'bg-red-100 text-red-800'
  return 'bg-yellow-100 text-yellow-800'
}