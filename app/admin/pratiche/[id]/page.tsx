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
  tipo_mezzo_altro: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  km: number | null
  tipo_cambio: string | null
  incidentato: boolean | null
  marciante: boolean | null
  va_in_moto: boolean | null
  parti_mancanti: boolean | null
  note_veicolo: string | null
  indirizzo_ritiro: string | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
  cap_ritiro: string | null
  spazio_carro_attrezzi: string | null
  spazio_carro_attrezzi_note: string | null
  codice_fiscale: string | null
  nome_richiedente: string | null
  telefono: string | null
  casistica: string | null
  fermo_amministrativo: string | null
  targhe_presenti: boolean | null
  delegato_nome: string | null
  delegato_telefono: string | null
  numero_eredi: number | null
  nomi_rinunciatari: string | null
  libretto: string | null
  certificato_proprieta: string | null
  demolitore_id: string | null
  data_assegnazione: string | null
  scadenza_proposta_ritiro: string | null
  fee_concordata: number | null
  stato: string
  creato_il: string
}

interface Candidato {
  id: string
  ragione_sociale: string
  citta?: string | null
  distanza_km?: number
  durata_minuti?: number
  velocita_media_giorni?: number
  pratiche_aperte?: number
}

const STATO_META: Record<string, { label: string; bg: string; text: string }> = {
  in_attesa_documenti: { label: 'Attesa documenti', bg: '#FAEEDA', text: '#854F0B' },
  in_attesa_approvazione_admin: { label: 'Documenti da approvare', bg: '#E0EDFB', text: '#1E4E8C' },
  documenti_parzialmente_approvati: { label: 'Documenti da rifare', bg: '#FBE2E2', text: '#9B1C1C' },
  da_assegnare: { label: 'Da assegnare', bg: '#FDEBD9', text: '#92500E' },
  in_assegnazione_manuale: { label: 'Assegnazione manuale', bg: '#FBE2E2', text: '#9B1C1C' },
  assegnata: { label: 'Assegnata', bg: '#E0EDFB', text: '#1E4E8C' },
  in_attesa_conferma_cliente: { label: 'Attesa conferma cliente', bg: '#E0EDFB', text: '#1E4E8C' },
  ritiro_confermato: { label: 'Ritiro confermato', bg: '#E4E4FB', text: '#4338CA' },
  ritirata: { label: 'Veicolo ritirato', bg: '#EDE4FB', text: '#6B21A8' },
  in_attesa_cert_rottamazione: { label: 'Attesa cert. rottamazione', bg: '#DDF2F0', text: '#0F766E' },
  in_attesa_cert_radiazione_pra: { label: 'Attesa cert. PRA', bg: '#DDF2F0', text: '#0F766E' },
  completata: { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43' },
  annullata: { label: 'Annullata', bg: '#E7EAEE', text: '#4B5563' },
}

const NOMI_CASISTICHE: Record<string, string> = {
  persona_fisica: 'Persona fisica', eredi_accettato: 'Eredi (accettata)', eredi_rinuncia: 'Eredi (con rinuncia)',
  societa: 'Società', societa_fallita: 'Società fallita', associazione: 'Associazione',
  non_intestatario: 'Non intestatario', targhe_straniere: 'Targhe straniere',
}

function metaStato(s: string) { return STATO_META[s] || { label: s, bg: '#E7EAEE', text: '#4B5563' } }

// Stile card condiviso (identico alle card della lista pratiche)
const STILE_CARD: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #E5E7EB',
  borderRadius: 14,
  boxShadow: '0 1px 3px rgba(16,24,40,0.07)',
}

function TitoloCard({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0F1B33', margin: 0 }}>
      <span style={{ width: 3, height: 15, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
      {children}
    </p>
  )
}
function fmtData(x: string | null) {
  if (!x) return '—'
  return new Date(x).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const CAMBIO_LABEL: Record<string, string> = { manuale: 'Manuale', automatico: 'Automatico', non_so: 'Non so' }
const SPAZIO_LABEL: Record<string, string> = { libero: 'Libero, comodo', stretto: 'Stretto', no: 'No, difficile' }
const FERMO_LABEL: Record<string, string> = { si: 'Sì', no: 'No', non_so: 'Non lo sa' }
const LIBRETTO_LABEL: Record<string, string> = { si: 'Ha l\'originale', denuncia: 'Denuncia di smarrimento', no: 'Non ce l\'ha' }
const CDC_LABEL: Record<string, string> = { digitale: 'Digitale', cartaceo: 'Cartaceo', smarrito: 'Smarrito (denuncia)', nessuno: 'Non lo sa', documento_unico: 'Documento unico' }
function lbl(map: Record<string, string>, v: string | null) { return v ? (map[v] || v) : null }

// ============================================================
// PAGINA
// ============================================================

export default function DettaglioPraticaAdmin() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [pratica, setPratica] = useState<Pratica | null>(null)
  const [demolitoreNome, setDemolitoreNome] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [eliminaOpen, setEliminaOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [erroreElimina, setErroreElimina] = useState<string | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }
      const { data, error } = await supabase.from('pratiche').select('*').eq('id', id).single()
      if (error || !data) { router.push('/admin'); return }
      setPratica(data)
      if (data.demolitore_id) {
        const { data: d } = await supabase.from('demolitori').select('ragione_sociale').eq('id', data.demolitore_id).single()
        setDemolitoreNome(d?.ragione_sociale ?? null)
      }
      setLoading(false)
    }
    if (id) carica()
  }, [id, router])

  async function ricaricaPratica() {
    const { data } = await supabase.from('pratiche').select('*').eq('id', id).single()
    if (data) {
      setPratica(data)
      if (data.demolitore_id) {
        const { data: d } = await supabase.from('demolitori').select('ragione_sociale').eq('id', data.demolitore_id).single()
        setDemolitoreNome(d?.ragione_sociale ?? null)
      } else {
        setDemolitoreNome(null)
      }
    }
  }

  async function annullaPratica() {
    if (!pratica) return
    if (!confirm('Sei sicuro di voler ANNULLARE questa pratica?')) return
    await supabase.from('pratiche').update({ stato: 'annullata', aggiornato_il: new Date().toISOString() }).eq('id', pratica.id)
    await ricaricaPratica()
  }

  async function eliminaDefinitiva(eliminaAccount: boolean) {
    if (!pratica) return
    setEliminando(true)
    setErroreElimina(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/elimina-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, elimina_account: eliminaAccount }),
      })
      const data = await res.json()
      if (!res.ok) { setErroreElimina(data?.error || 'Errore durante l\'eliminazione'); setEliminando(false); return }
      if (eliminaAccount && data.account_non_eliminato_motivo) alert(data.account_non_eliminato_motivo)
      router.push('/admin')
    } catch {
      setErroreElimina('Errore di rete durante l\'eliminazione.')
      setEliminando(false)
    }
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )
  if (!pratica) return null

  const m = metaStato(pratica.stato)

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>

      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-xl px-3.5 py-2 transition-colors flex-shrink-0"
          style={{ border: '1.5px solid #E5E7EB' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Indietro
        </button>
        <div style={{ width: 1, height: 32, background: '#E5E7EB', flexShrink: 0 }} />
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-gray-900 leading-tight truncate">{pratica.targa || 'Targa mancante'}{pratica.marca && ` · ${pratica.marca} ${pratica.modello || ''}`}</div>
          <div className="text-[12px] truncate" style={{ color: '#4B5563' }}>
            {pratica.nome_richiedente || '—'}{pratica.comune_ritiro && ` · ${pratica.comune_ritiro}`}{pratica.provincia_ritiro && ` (${pratica.provincia_ritiro})`}
          </div>
        </div>
        <span className="ml-auto text-[11.5px] font-bold px-3.5 py-1.5 rounded-full flex-shrink-0" style={{ background: m.bg, color: m.text }}>{m.label}</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* COLONNA SINISTRA: documenti + foto */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
            <DocumentiApprovazione
              praticaId={pratica.id}
              statoPratica={pratica.stato}
              onRicaricaPratica={ricaricaPratica}
            />
          </div>

          {/* COLONNA DESTRA: assegnazione + dati */}
          <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4">

            <AssegnazioneCard pratica={pratica} demolitoreNome={demolitoreNome} onAssegnato={ricaricaPratica} />

            <FeePraticaCard pratica={pratica} onAggiornata={ricaricaPratica} />

            <CardInfo titolo="Cliente">
              <Riga label="Nome" value={pratica.nome_richiedente} />
              <Riga label="Telefono" value={pratica.telefono} />
              <Riga label="Codice fiscale" value={pratica.codice_fiscale} mono />
            </CardInfo>

            <CardInfo titolo="Veicolo">
              <Riga label="Targa" value={pratica.targa} />
              <Riga label="Tipo" value={pratica.tipo_mezzo === 'altro' && pratica.tipo_mezzo_altro ? `Altro: ${pratica.tipo_mezzo_altro}` : pratica.tipo_mezzo} />
              <Riga label="Marca / modello" value={`${pratica.marca || ''} ${pratica.modello || ''}`.trim() || null} />
              <Riga label="Anno · km" value={`${pratica.anno || '—'} · ${pratica.km?.toLocaleString('it-IT') || '—'}`} />
              {pratica.tipo_cambio && <Riga label="Cambio" value={lbl(CAMBIO_LABEL, pratica.tipo_cambio)} />}
              {/* Condizioni dichiarate dal cliente */}
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                <CondPill valore={pratica.incidentato} buonoSe={false} testoSi="Incidentata" testoNo="Non incidentata" />
                <CondPill valore={pratica.marciante} buonoSe={true} testoSi="Cammina" testoNo="Non cammina" />
                <CondPill valore={pratica.va_in_moto} buonoSe={true} testoSi="Si avvia" testoNo="Non si avvia" />
                <CondPill valore={pratica.parti_mancanti} buonoSe={false} testoSi="Parti mancanti" testoNo="Completo" />
              </div>
              {pratica.note_veicolo && <div className="text-xs text-gray-600 italic mt-2 pt-2 border-t border-gray-100">“{pratica.note_veicolo}”</div>}
            </CardInfo>

            <CardInfo titolo="Ritiro">
              <p className="text-sm text-gray-700">
                {pratica.indirizzo_ritiro || '—'}
                {pratica.comune_ritiro && ` · ${pratica.comune_ritiro}`}
                {pratica.provincia_ritiro && ` (${pratica.provincia_ritiro})`}
                {pratica.cap_ritiro && ` · ${pratica.cap_ritiro}`}
              </p>
              {pratica.spazio_carro_attrezzi && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <Riga label="Spazio carro attrezzi" value={lbl(SPAZIO_LABEL, pratica.spazio_carro_attrezzi)} />
                  {pratica.spazio_carro_attrezzi_note && <div className="text-xs text-gray-600 italic mt-1">“{pratica.spazio_carro_attrezzi_note}”</div>}
                </div>
              )}
            </CardInfo>

            <CardInfo titolo="Dichiarazioni e casistica">
              {pratica.casistica && <Riga label="Casistica" value={NOMI_CASISTICHE[pratica.casistica] || pratica.casistica} />}
              {pratica.libretto && <Riga label="Libretto" value={lbl(LIBRETTO_LABEL, pratica.libretto)} />}
              {pratica.certificato_proprieta && <Riga label="Cert. proprietà" value={lbl(CDC_LABEL, pratica.certificato_proprieta)} />}
              {pratica.fermo_amministrativo && <Riga label="Fermo amministrativo" value={lbl(FERMO_LABEL, pratica.fermo_amministrativo)} />}
              {pratica.targhe_presenti != null && <Riga label="Targhe" value={pratica.targhe_presenti ? 'Presenti sul mezzo' : 'Smarrite'} />}
              {pratica.delegato_nome && <Riga label="Delegato" value={`${pratica.delegato_nome}${pratica.delegato_telefono ? ` · ${pratica.delegato_telefono}` : ''}`} />}
              {pratica.numero_eredi != null && (pratica.casistica === 'eredi_accettato' || pratica.casistica === 'eredi_rinuncia') && <Riga label="Numero eredi" value={String(pratica.numero_eredi)} />}
              {pratica.nomi_rinunciatari && <Riga label="Rinunciatari" value={pratica.nomi_rinunciatari} />}
            </CardInfo>

            <div className="flex gap-2 pt-1">
              {pratica.stato !== 'annullata' && (
                <button onClick={annullaPratica} className="flex-1 text-xs font-semibold text-gray-600 hover:text-amber-700 bg-white hover:bg-amber-50 px-3 py-2.5 rounded-xl transition-colors" style={{ border: '1.5px solid #E5E7EB' }}>
                  Annulla pratica
                </button>
              )}
              <button onClick={() => { setErroreElimina(null); setEliminaOpen(true) }} className="flex-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 px-3 py-2.5 rounded-xl transition-colors" style={{ border: '1.5px solid #F3C8C8' }}>
                Elimina definitivamente
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MODALE ELIMINAZIONE DEFINITIVA */}
      {eliminaOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            </div>
            <p className="text-center font-semibold text-gray-900">Come vuoi eliminare?</p>
            <p className="text-center text-sm text-gray-500 mt-1">
              La pratica <b>{pratica.targa || 'senza targa'}</b>, con documenti, foto e file, sarà cancellata per sempre. Scegli se cancellare anche l&apos;account del cliente.
            </p>
            {erroreElimina && <p className="text-center text-xs text-red-600 mt-2">{erroreElimina}</p>}
            {eliminando ? (
              <div className="flex items-center gap-2 justify-center text-sm text-gray-500 py-5"><div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />Elimino…</div>
            ) : (
              <div className="flex flex-col gap-2 mt-4">
                <button onClick={() => eliminaDefinitiva(false)} className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl">Elimina solo la pratica</button>
                <button onClick={() => eliminaDefinitiva(true)} className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl">Elimina pratica + account cliente</button>
                <button onClick={() => setEliminaOpen(false)} className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl mt-1">Annulla</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

function CondPill({ valore, buonoSe, testoSi, testoNo }: { valore: boolean | null; buonoSe: boolean; testoSi: string; testoNo: string }) {
  if (valore == null) return null
  const buono = valore === buonoSe
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: buono ? '#EAF3DE' : '#FBE2E2', color: buono ? '#27500A' : '#9B1C1C' }}>
      {valore ? testoSi : testoNo}
    </span>
  )
}

// ============================================================
// CARD ASSEGNAZIONE
// ============================================================

function AssegnazioneCard({ pratica, demolitoreNome, onAssegnato }: { pratica: Pratica; demolitoreNome: string | null; onAssegnato: () => void }) {
  const [mode, setMode] = useState<'idle' | 'lista'>('idle')
  const [manuale, setManuale] = useState(false)
  const [caricando, setCaricando] = useState(false)
  const [candidati, setCandidati] = useState<Candidato[]>([])
  const [vincitoreId, setVincitoreId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [tuttiDemolitori, setTuttiDemolitori] = useState<Candidato[] | null>(null)
  const [confermandoId, setConfermandoId] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [disassegnando, setDisassegnando] = useState(false)

  async function disassegna() {
    if (!confirm('Rimuovere l\'assegnazione? La pratica tornerà "da assegnare" e il cliente vedrà che stiamo scegliendo un nuovo demolitore.')) return
    setDisassegnando(true)
    setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, disassegna: true }),
      })
      const data = await res.json()
      if (!res.ok) { setErrore(data?.error || 'Errore durante la disassegnazione'); return }
      setMode('idle')
      onAssegnato()
    } catch {
      setErrore('Errore di rete.')
    } finally {
      setDisassegnando(false)
    }
  }

  const assegnata = !!pratica.demolitore_id
  const puoAssegnare = ['da_assegnare', 'in_assegnazione_manuale', 'in_attesa_assegnazione'].includes(pratica.stato)

  async function calcola(perManuale: boolean) {
    setManuale(perManuale)
    setMode('lista')
    setCaricando(true)
    setErrore(null)
    setMotivo(null)
    setTuttiDemolitori(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, dry_run: true }),
      })
      const data = await res.json()
      if (!res.ok) { setErrore(data?.error || 'Errore nel calcolo'); setCandidati([]); return }
      setCandidati(data.candidati || [])
      setVincitoreId(data.vincitore?.id ?? null)
      setMotivo(data.motivo ?? null)
    } catch {
      setErrore('Errore di rete durante il calcolo.')
    } finally {
      setCaricando(false)
    }
  }

  async function caricaTutti() {
    const { data } = await supabase.from('demolitori').select('id, ragione_sociale, citta').eq('stato', 'attivo').order('ragione_sociale')
    setTuttiDemolitori((data as Candidato[]) || [])
  }

  async function conferma(demolitoreId: string) {
    setConfermandoId(demolitoreId)
    setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/assegna-pratica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, demolitore_id: demolitoreId, manuale }),
      })
      const data = await res.json()
      if (!res.ok) { setErrore(data?.error || 'Errore assegnazione'); return }
      setMode('idle')
      onAssegnato()
    } catch {
      setErrore('Errore di rete durante l\'assegnazione.')
    } finally {
      setConfermandoId(null)
    }
  }

  // --- Vista: già assegnata ---
  if (assegnata) {
    return (
      <div className="p-4" style={STILE_CARD}>
        <div className="mb-3"><TitoloCard>Assegnazione</TitoloCard></div>
        <div className="rounded-xl p-3" style={{ background: '#E6F1FB', border: '1px solid #B5D4F4' }}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E4E8C" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>
            <span className="text-sm font-bold" style={{ color: '#0C447C' }}>{demolitoreNome || 'Demolitore'}</span>
          </div>
          <div className="text-[11.5px] mt-2" style={{ color: '#1E4E8C' }}>Assegnata il {fmtData(pratica.data_assegnazione)}</div>
          {pratica.scadenza_proposta_ritiro && <div className="text-[11.5px]" style={{ color: '#1E4E8C' }}>Deve proporre il ritiro entro {fmtData(pratica.scadenza_proposta_ritiro)}</div>}
        </div>
        {mode === 'idle' ? (
          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex items-center gap-4">
              <button onClick={() => calcola(true)} disabled={disassegnando} className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">Riassegna a un altro demolitore</button>
              <button onClick={disassegna} disabled={disassegnando} className="text-xs font-semibold text-red-500 hover:text-red-700 underline disabled:opacity-50">
                {disassegnando ? 'Rimozione…' : 'Rimuovi assegnazione'}
              </button>
            </div>
            {errore && <p className="text-[11px] text-red-600">{errore}</p>}
          </div>
        ) : (
          <ListaCandidati caricando={caricando} candidati={candidati} vincitoreId={manuale ? null : vincitoreId} motivo={motivo} errore={errore} confermandoId={confermandoId} tuttiDemolitori={tuttiDemolitori} onConferma={conferma} onCaricaTutti={caricaTutti} onChiudi={() => setMode('idle')} />
        )}
      </div>
    )
  }

  // --- Vista: non ancora assegnabile (documenti non pronti) ---
  if (!puoAssegnare) {
    return (
      <div className="p-4" style={STILE_CARD}>
        <div className="mb-2"><TitoloCard>Assegnazione</TitoloCard></div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Prima approva tutti i documenti
        </div>
      </div>
    )
  }

  // --- Vista: da assegnare ---
  return (
    <div className="p-4" style={STILE_CARD}>
      <div className="mb-3"><TitoloCard>Assegnazione</TitoloCard></div>
      {mode === 'idle' ? (
        <div className="flex flex-col gap-2">
          <button onClick={() => calcola(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.9 4.9l2.8 2.8m8.6 8.6 2.8 2.8M2 12h4m12 0h4" /><circle cx="12" cy="12" r="3" /></svg>
            Assegna in automatico
          </button>
          <button onClick={() => { calcola(true) }} className="w-full bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Scegli io il demolitore
          </button>
        </div>
      ) : (
        <ListaCandidati caricando={caricando} candidati={candidati} vincitoreId={manuale ? null : vincitoreId} motivo={motivo} errore={errore} confermandoId={confermandoId} tuttiDemolitori={tuttiDemolitori} onConferma={conferma} onCaricaTutti={caricaTutti} onChiudi={() => setMode('idle')} />
      )}
    </div>
  )
}

function ListaCandidati(props: {
  caricando: boolean
  candidati: Candidato[]
  vincitoreId: string | null
  motivo: string | null
  errore: string | null
  confermandoId: string | null
  tuttiDemolitori: Candidato[] | null
  onConferma: (id: string) => void
  onCaricaTutti: () => void
  onChiudi: () => void
}) {
  const { caricando, candidati, vincitoreId, motivo, errore, confermandoId, tuttiDemolitori } = props

  if (caricando) {
    return <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Calcolo in corso…</div>
  }

  return (
    <div className="mt-1">
      {errore && <div className="text-xs text-red-600 mb-2">{errore}</div>}

      {candidati.length > 0 ? (
        <div className="flex flex-col gap-2">
          {candidati.map((c, i) => {
            const consigliato = vincitoreId === c.id
            const vel = c.velocita_media_giorni != null && c.velocita_media_giorni < 999 ? `${c.velocita_media_giorni.toFixed(1)} gg` : 'nuovo'
            return (
              <div key={c.id} className="rounded-xl p-2.5" style={{ border: `1.5px solid ${consigliato ? '#B5D4F4' : '#E5E7EB'}`, background: consigliato ? '#F3F8FE' : '#fff' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400">{i + 1}º</span>
                  <span className="text-[13px] font-semibold text-gray-900 flex-1 truncate">{c.ragione_sociale}</span>
                  {consigliato && <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#2563eb', color: '#fff' }}>Consigliato</span>}
                </div>
                <div className="flex gap-3 mt-1.5 text-[11px] text-gray-500">
                  {c.distanza_km != null && <span><b className="text-gray-700">{Math.round(c.distanza_km)} km</b>{c.durata_minuti != null && ` · ${Math.round(c.durata_minuti)} min`}</span>}
                  <span><b className="text-gray-700">{vel}</b></span>
                  {c.pratiche_aperte != null && <span>{c.pratiche_aperte} aperte</span>}
                </div>
                <button onClick={() => props.onConferma(c.id)} disabled={confermandoId != null} className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50">
                  {confermandoId === c.id ? 'Assegnazione…' : `Assegna a ${c.ragione_sociale}`}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-xs text-gray-500">
          <p className="mb-2">{motivo || 'Nessun demolitore copre questa zona.'}</p>
          {tuttiDemolitori == null ? (
            <button onClick={props.onCaricaTutti} className="text-blue-600 underline font-semibold">Mostra tutti i demolitori attivi</button>
          ) : tuttiDemolitori.length === 0 ? (
            <p className="text-gray-400">Nessun demolitore attivo nel sistema.</p>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              {tuttiDemolitori.map(c => (
                <div key={c.id} className="rounded-xl p-2.5 border border-gray-200 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">{c.ragione_sociale}</div>
                    {c.citta && <div className="text-[11px] text-gray-400">{c.citta}</div>}
                  </div>
                  <button onClick={() => props.onConferma(c.id)} disabled={confermandoId != null} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex-shrink-0">
                    {confermandoId === c.id ? '…' : 'Assegna'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={props.onChiudi} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Chiudi</button>
    </div>
  )
}

// ============================================================
// CARD IMPORTO CONCORDATO (una tantum per la singola pratica)
// Se impostato, in fattura vale questo importo e ignora le tariffe
// del demolitore. Lettura di default, modifica col tasto.
// ============================================================

function FeePraticaCard({ pratica, onAggiornata }: { pratica: Pratica; onAggiornata: () => void }) {
  const [edit, setEdit] = useState(false)
  const [valore, setValore] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function salva(fee: number | null) {
    setSalvando(true)
    setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, fee }),
      })
      const data = await res.json()
      if (!res.ok) { setErrore(data?.error || 'Errore nel salvataggio'); return }
      setEdit(false)
      setValore('')
      onAggiornata()
    } catch {
      setErrore('Errore di rete.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-4" style={STILE_CARD}>
      <div className="flex items-center justify-between mb-2.5">
        <TitoloCard>Importo pratica</TitoloCard>
        {!edit && (
          <button onClick={() => { setValore(pratica.fee_concordata != null ? String(pratica.fee_concordata) : ''); setEdit(true) }} className="text-xs font-bold text-blue-600 hover:text-blue-700 underline">
            {pratica.fee_concordata != null ? 'Modifica' : 'Imposta'}
          </button>
        )}
      </div>

      {!edit ? (
        pratica.fee_concordata != null ? (
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE', borderRadius: 12, padding: '11px 14px' }}>
            <div className="flex items-baseline gap-1.5">
              <span style={{ fontSize: 22, fontWeight: 800, color: '#0C447C' }}>{pratica.fee_concordata} €</span>
              <span className="text-[10.5px] font-bold uppercase" style={{ color: '#5B87BE', letterSpacing: 0.4 }}>concordato · una tantum</span>
            </div>
            <div className="text-[11.5px] mt-1" style={{ color: '#1E4E8C' }}>In fattura per questa pratica vale questo importo.</div>
          </div>
        ) : (
          <p className="text-[12.5px]" style={{ color: '#64748b' }}>Nessun importo speciale: si applicano le tariffe del demolitore.</p>
        )
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={valore}
              onChange={e => { setValore(e.target.value); setErrore(null) }}
              placeholder="Es. 300"
              autoFocus
              className="w-24 rounded-[10px] px-2.5 py-1.5 text-[15px] font-extrabold bg-white outline-none focus:ring-2 focus:ring-blue-100"
              style={{ border: '1.5px solid #93C5FD', color: '#0C447C' }}
            />
            <span className="text-xs" style={{ color: '#64748b' }}>€ per questa pratica</span>
          </div>
          {errore && <p className="text-[11px] text-red-600 mt-1.5">{errore}</p>}
          <div className="flex items-center gap-2 mt-3">
            {pratica.fee_concordata != null && (
              <button onClick={() => salva(null)} disabled={salvando} className="text-[11.5px] font-semibold text-red-600 hover:text-red-700 underline mr-auto">
                Rimuovi importo
              </button>
            )}
            <button onClick={() => { setEdit(false); setErrore(null) }} disabled={salvando} className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[10px] px-4 py-2 transition-colors ml-auto">
              Annulla
            </button>
            <button
              onClick={() => { const f = parseFloat(valore); if (isNaN(f) || f < 0) { setErrore('Scrivi un importo valido'); return } salva(f) }}
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[10px] px-5 py-2 disabled:opacity-40 transition-colors"
            >
              {salvando ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// SOTTOCOMPONENTI DATI
// ============================================================

function CardInfo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="p-4" style={STILE_CARD}>
      <div className="mb-3"><TitoloCard>{titolo}</TitoloCard></div>
      {children}
    </div>
  )
}

function Riga({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3 py-1.5" style={{ borderBottom: '1px solid #F3F5F9' }}>
      <span className="text-[13px] flex-shrink-0" style={{ color: '#64748b' }}>{label}</span>
      <span className={`text-[13.5px] font-semibold text-right truncate ${mono ? 'font-mono !text-[12px]' : ''}`} style={{ color: '#111827' }}>{value || '—'}</span>
    </div>
  )
}
