'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import DocumentiApprovazione from './DocumentiApprovazione'
import ChatAdmin from './ChatAdmin'
import CronologiaNote from './CronologiaNote'
import AutocompleteIndirizzo from '../../../inizia/steps/AutocompleteIndirizzo'

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
  motivo_annullamento: string | null
  stato: string
  creato_il: string
  aggiornato_il: string | null
  // Pausa sopra lo stato (17/07): quando si riprende, la pratica riparte da dov'era
  in_attesa: boolean | null
  attesa_motivo: string | null
  attesa_dal: string | null
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

// Etichette ALLINEATE alle 6 fasi del flusso del CRM (16/07): stessa
// nomenclatura della lista pratiche (fase · dettaglio).
const STATO_META: Record<string, { label: string; bg: string; text: string }> = {
  in_attesa_documenti: { label: 'In attesa documenti', bg: '#FAEEDA', text: '#854F0B' },
  documenti_parzialmente_approvati: { label: 'In attesa documenti · da rifare', bg: '#FBE2E2', text: '#9B1C1C' },
  in_attesa_approvazione_admin: { label: 'Documenti da verificare', bg: '#E0EDFB', text: '#1E4E8C' },
  da_assegnare: { label: 'Da assegnare', bg: '#FAECE7', text: '#92500E' },
  in_attesa_assegnazione: { label: 'Da assegnare · in corso', bg: '#FAECE7', text: '#92500E' },
  in_assegnazione_manuale: { label: 'Da assegnare · a mano', bg: '#FBE2E2', text: '#9B1C1C' },
  assegnata: { label: 'Assegnata', bg: '#E4E4FB', text: '#4338CA' },
  in_attesa_conferma_cliente: { label: 'Assegnata · attesa cliente', bg: '#E4E4FB', text: '#4338CA' },
  ritiro_confermato: { label: 'Assegnata · ritiro fissato', bg: '#E4E4FB', text: '#4338CA' },
  ritirata: { label: 'Ritirata', bg: '#DDF2F0', text: '#0F766E' },
  in_attesa_recensione_cliente: { label: 'Ritirata · attesa recensione', bg: '#DDF2F0', text: '#0F766E' },
  in_attesa_cert_rottamazione: { label: 'Ritirata · attesa rottamazione', bg: '#DDF2F0', text: '#0F766E' },
  in_attesa_cert_radiazione_pra: { label: 'Ritirata · attesa PRA', bg: '#DDF2F0', text: '#0F766E' },
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

// Fase del flusso (1-6, come le caselle della dashboard) per la testata
function faseDi(stato: string): number {
  if (['in_attesa_documenti', 'documenti_parzialmente_approvati'].includes(stato)) return 1
  if (stato === 'in_attesa_approvazione_admin') return 2
  if (['da_assegnare', 'in_assegnazione_manuale', 'in_attesa_assegnazione'].includes(stato)) return 3
  if (['assegnata', 'in_attesa_conferma_cliente', 'ritiro_confermato'].includes(stato)) return 4
  if (['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra'].includes(stato)) return 5
  if (stato === 'completata') return 6
  return 0
}

// Da quanto tempo è aperta (per la statistica in testata)
function etaPratica(creatoIl: string): string {
  const ore = Math.max(0, Math.floor((Date.now() - new Date(creatoIl).getTime()) / 3600000))
  if (ore < 1) return '<1 h'
  if (ore < 48) return `${ore} h`
  return `${Math.floor(ore / 24)} gg`
}

const CAMBIO_LABEL: Record<string, string> = { manuale: 'Manuale', automatico: 'Automatico', non_so: 'Non so' }
const SPAZIO_LABEL: Record<string, string> = { libero: 'Libero, comodo', stretto: 'Stretto', no: 'No, difficile' }
const FERMO_LABEL: Record<string, string> = { si: 'Sì', no: 'No', non_so: 'Non lo sa' }
const LIBRETTO_LABEL: Record<string, string> = { si: 'Ha l\'originale', denuncia: 'Denuncia di smarrimento', no: 'Non ce l\'ha' }
const CDC_LABEL: Record<string, string> = { digitale: 'Digitale', cartaceo: 'Cartaceo', smarrito: 'Smarrito (denuncia)', nessuno: 'Non lo sa', documento_unico: 'Documento unico' }
function lbl(map: Record<string, string>, v: string | null) { return v ? (map[v] || v) : null }

// ============================================================
// MODIFICA DATI PRATICA (regola "modifica a tasto", solo admin)
// Il salvataggio passa dal server: il browser non scrive su `pratiche`.
// ============================================================

async function salvaDatiPratica(praticaId: string, dati: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/pratica-dati', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
    body: JSON.stringify({ pratica_id: praticaId, dati }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || 'Errore nel salvataggio')
}

// Stesso stile dei campi della scheda demolitore (versione compatta admin)
const INPUT_CLS = 'w-full border-[1.5px] border-gray-200 rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400'

function CampoEdit({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase mb-1" style={{ color: '#5B6779', letterSpacing: 0.4 }}>{label}</div>
      {children}
    </div>
  )
}

function BtnModifica({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-[11.5px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
      Modifica
    </button>
  )
}

function BarraSalva({ modificato, salvando, onSalva, onAnnulla }: { modificato: boolean; salvando: boolean; onSalva: () => void; onAnnulla: () => void }) {
  return (
    <div className="mt-3">
      {modificato && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 mb-2" style={{ background: '#FDF7EA', border: '1px solid #F0DFB8', color: '#854F0B' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          Modifiche non salvate
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onSalva}
          disabled={!modificato || salvando}
          className="flex-1 text-xs font-bold text-white rounded-[10px] px-3 py-2 transition-colors disabled:opacity-40"
          style={{ background: '#2563eb' }}
        >
          {salvando ? 'Salvo…' : 'Salva'}
        </button>
        <button
          onClick={onAnnulla}
          disabled={salvando}
          className="flex-1 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-[10px] px-3 py-2 transition-colors disabled:opacity-40"
          style={{ border: '1.5px solid #E5E7EB' }}
        >
          Annulla
        </button>
      </div>
    </div>
  )
}

// ============================================================
// PAGINA
// ============================================================

export default function DettaglioPraticaAdmin() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [pratica, setPratica] = useState<Pratica | null>(null)
  const [demolitoreNome, setDemolitoreNome] = useState<string | null>(null)
  // Email dell'account del cliente (tabella utenti): sempre aggiornata
  const [emailAccount, setEmailAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [eliminaOpen, setEliminaOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [erroreElimina, setErroreElimina] = useState<string | null>(null)
  const [annullaOpen, setAnnullaOpen] = useState(false)
  const [annullando, setAnnullando] = useState(false)
  const [motivoAnnulla, setMotivoAnnulla] = useState('')
  const [erroreAnnulla, setErroreAnnulla] = useState<string | null>(null)
  // Quando una modifica cambia la checklist (es. fermo) si ricarica la colonna documenti
  const [docsVersion, setDocsVersion] = useState(0)
  // Statistiche documenti per la testata (arrivano dalla card documenti)
  const [docStats, setDocStats] = useState<{ totale: number; approvati: number } | null>(null)
  // Attesa (pausa della pratica) + cronologia note
  const [attesaOpen, setAttesaOpen] = useState(false)
  const [attesaMotivo, setAttesaMotivo] = useState('')
  const [attesaErr, setAttesaErr] = useState<string | null>(null)
  const [attesaBusy, setAttesaBusy] = useState(false)
  const [noteVersion, setNoteVersion] = useState(0)
  // ⭐ 23/07: Documenti, Chat e Cronologia sono a scomparsa e partono CHIUSE
  const [docsAperti, setDocsAperti] = useState(false)
  const [chatAperta, setChatAperta] = useState(false)
  const [cronoAperta, setCronoAperta] = useState(false)
  // Menu unico "Stato pratica" (Attiva / In attesa / Annulla) + riattivazione
  const [menuStato, setMenuStato] = useState(false)
  const [riattivaOpen, setRiattivaOpen] = useState(false)
  const [riattivaBusy, setRiattivaBusy] = useState(false)

  // Nota automatica in cronologia (se la tabella non c'è ancora, pazienza)
  async function notaAutomatica(testo: string) {
    try { await supabase.from('pratiche_note').insert({ pratica_id: id, testo }) } catch { /* tabella assente */ }
  }

  // L'attesa passa dal SERVER (/api/pratica-dati, service role): niente
  // scritture dal browser su `pratiche`, come tutte le altre modifiche.
  async function mettiInAttesa() {
    const motivo = attesaMotivo.trim()
    if (!motivo) { setAttesaErr('Scrivi il motivo: resterà nella cronologia.'); return }
    setAttesaBusy(true)
    try {
      await salvaDatiPratica(id, { in_attesa: true, attesa_motivo: motivo, attesa_dal: new Date().toISOString() })
    } catch {
      setAttesaErr('Errore nel salvataggio. Hai eseguito l\'SQL del 17/07 su Supabase?')
      setAttesaBusy(false)
      return
    }
    await notaAutomatica(`Messa in attesa: ${motivo}`)
    await ricaricaPratica()
    setNoteVersion(v => v + 1)
    setAttesaOpen(false)
    setAttesaMotivo('')
    setAttesaErr(null)
    setAttesaBusy(false)
  }

  async function riprendiPratica() {
    setAttesaBusy(true)
    try {
      await salvaDatiPratica(id, { in_attesa: false, attesa_motivo: null, attesa_dal: null })
      await notaAutomatica('Pratica ripresa')
      await ricaricaPratica()
      setNoteVersion(v => v + 1)
    } catch {
      alert('Errore nella ripresa. Riprova.')
    }
    setAttesaBusy(false)
  }

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
      if (data.user_id) {
        const { data: u } = await supabase.from('utenti').select('email').eq('id', data.user_id).single()
        setEmailAccount(u?.email ?? null)
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

  // Aggiornamento automatico (22/07): la testata e i dati si aggiornano da
  // soli quando il cliente (o il sistema) cambia qualcosa sulla pratica
  useAggiornaLive({
    canale: `admin-pratica-${id}`,
    tabelle: [{ tabella: 'pratiche', filtro: `id=eq.${id}` }],
    onCambio: ricaricaPratica,
    attivo: !!id,
  })

  async function annullaPratica() {
    if (!pratica) return
    const motivo = motivoAnnulla.trim()
    if (!motivo) { setErroreAnnulla('Scrivi il motivo dell\'annullamento: resterà nella cronologia.'); return }
    setAnnullando(true)
    setErroreAnnulla(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-annulla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, motivo }),
      })
      const data = await res.json()
      if (!res.ok) { setErroreAnnulla(data?.error || 'Errore durante l\'annullamento'); setAnnullando(false); return }
      // L'annullamento finisce in cronologia (richiesta Davide 20/07)
      await notaAutomatica(`Pratica annullata: ${motivo}`)
      await ricaricaPratica()
      setNoteVersion(v => v + 1)
      setAnnullaOpen(false)
      setMotivoAnnulla('')
    } catch {
      setErroreAnnulla('Errore di rete.')
    }
    setAnnullando(false)
  }

  // RIATTIVAZIONE (20/07): la pratica torna esattamente dov'era rimasta
  async function riattivaPratica() {
    if (!pratica) return
    setRiattivaBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-annulla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id, riattiva: true }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { alert(data?.error || 'Errore durante la riattivazione'); setRiattivaBusy(false); return }
      await notaAutomatica('Pratica riattivata')
      await ricaricaPratica()
      setNoteVersion(v => v + 1)
      setRiattivaOpen(false)
    } catch {
      alert('Errore di rete durante la riattivazione.')
    }
    setRiattivaBusy(false)
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
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#ECEEF2' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )
  if (!pratica) return null

  const m = metaStato(pratica.stato)

  return (
    <main className="min-h-screen" style={{ background: '#ECEEF2' }}>

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* TESTATA BLU in stile profilo (mockup variante A, 17/07) */}
        <div className="rounded-2xl px-5 py-4 mb-4 text-white" style={{ background: 'linear-gradient(120deg, #1d4ed8, #2563eb, #3b82f6)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1 text-[11.5px] font-bold rounded-[9px] px-3 py-2 transition-colors flex-shrink-0 hover:bg-white"
              style={{ background: 'rgba(255,255,255,0.88)', color: '#1d4ed8' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Pratiche
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-extrabold leading-tight truncate">{pratica.targa || 'Targa mancante'}{pratica.marca && ` · ${pratica.marca} ${pratica.modello || ''}`}</div>
              <div className="text-[11.5px] truncate" style={{ opacity: 0.85 }}>
                {pratica.nome_richiedente || '—'}{pratica.comune_ritiro && ` · ${pratica.comune_ritiro}`}{pratica.provincia_ritiro && ` (${pratica.provincia_ritiro})`} · aperta il {new Date(pratica.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} alle {new Date(pratica.creato_il).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {docStats && docStats.totale > 0 && (
                <div className="rounded-[11px] px-3 py-1.5 text-center" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <div className="text-[15px] font-extrabold leading-tight">{docStats.approvati}/{docStats.totale}</div>
                  <div className="text-[9px] font-bold" style={{ letterSpacing: 0.5, opacity: 0.85 }}>DOCUMENTI</div>
                </div>
              )}
              <div className="rounded-[11px] px-3 py-1.5 text-center" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <div className="text-[15px] font-extrabold leading-tight">{etaPratica(pratica.creato_il)}</div>
                <div className="text-[9px] font-bold" style={{ letterSpacing: 0.5, opacity: 0.85 }}>APERTA DA</div>
              </div>
              {faseDi(pratica.stato) > 0 && (
                <div className="rounded-[11px] px-3 py-1.5 text-center" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <div className="text-[15px] font-extrabold leading-tight">{faseDi(pratica.stato)} / 6</div>
                  <div className="text-[9px] font-bold" style={{ letterSpacing: 0.5, opacity: 0.85 }}>FASE</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {pratica.in_attesa && (
                <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: '#FAEEDA', color: '#854F0B' }}>In attesa</span>
              )}
              <span className="text-[11.5px] font-bold px-3.5 py-1.5 rounded-full" style={{ background: m.bg, color: m.text }}>{m.label}</span>

              {/* MENU UNICO "Stato pratica" (mockup variante A, 20/07):
                  Attiva / Metti in attesa / Annulla in un solo posto */}
              {pratica.stato !== 'completata' && (
                <div className="relative">
                  <button
                    onClick={() => setMenuStato(o => !o)}
                    className="flex items-center gap-1.5 text-[11px] font-bold rounded-[9px] px-3 py-2 transition-colors hover:bg-white/30"
                    style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff' }}
                  >
                    Stato pratica
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: menuStato ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {menuStato && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuStato(false)} />
                      <div className="absolute right-0 z-50 bg-white rounded-xl p-1.5" style={{ top: 'calc(100% + 8px)', width: 262, border: '1.5px solid #E5E7EB', boxShadow: '0 8px 24px rgba(16,24,40,0.16)' }}>
                        {(() => {
                          const annullata = pratica.stato === 'annullata'
                          const attiva = !annullata && !pratica.in_attesa
                          return (
                            <>
                              <button
                                onClick={() => {
                                  setMenuStato(false)
                                  if (annullata) setRiattivaOpen(true)
                                  else if (pratica.in_attesa) riprendiPratica()
                                }}
                                className="w-full text-left flex items-start gap-2.5 rounded-[9px] px-3 py-2.5 transition-colors hover:bg-blue-50"
                                style={attiva ? { background: '#EFF6FF' } : undefined}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={attiva ? '#1D4ED8' : '#1E293B'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                                <span>
                                  <span className="block text-[12.5px] font-bold" style={{ color: attiva ? '#1D4ED8' : '#1E293B' }}>Attiva</span>
                                  <span className="block text-[10.5px] mt-0.5" style={{ color: '#8B95A5' }}>
                                    {annullata ? 'riattiva: torna dov\'era rimasta' : pratica.in_attesa ? 'riprendi da dov\'era rimasta' : 'la pratica segue il flusso normale'}
                                  </span>
                                </span>
                              </button>
                              <button
                                onClick={() => { setMenuStato(false); setAttesaMotivo(''); setAttesaErr(null); setAttesaOpen(true) }}
                                disabled={annullata || !!pratica.in_attesa}
                                className="w-full text-left flex items-start gap-2.5 rounded-[9px] px-3 py-2.5 transition-colors hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent"
                                style={pratica.in_attesa ? { background: '#FDF7EA' } : undefined}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <span>
                                  <span className="block text-[12.5px] font-bold" style={{ color: '#854F0B' }}>Metti in attesa</span>
                                  <span className="block text-[10.5px] mt-0.5" style={{ color: '#8B95A5' }}>pausa col motivo · si riprende quando vuoi</span>
                                </span>
                              </button>
                              <button
                                onClick={() => { setMenuStato(false); setAnnullaOpen(true) }}
                                disabled={annullata}
                                className="w-full text-left flex items-start gap-2.5 rounded-[9px] px-3 py-2.5 transition-colors hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                                style={annullata ? { background: '#F3F4F7' } : undefined}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B1C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                <span>
                                  <span className="block text-[12.5px] font-bold" style={{ color: '#9B1C1C' }}>{annullata ? 'Annullata' : 'Annulla pratica'}</span>
                                  <span className="block text-[10.5px] mt-0.5" style={{ color: '#8B95A5' }}>{annullata ? 'usa Attiva per riattivarla' : 'col motivo · riattivabile in futuro'}</span>
                                </span>
                              </button>
                            </>
                          )
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* COLONNA SINISTRA (il LAVORO): documenti + chat + cronologia.
              ⭐ 23/07 (mockup approvato): card A SCOMPARSA, tutte CHIUSE
              all'apertura della pratica — le estende Davide se vuole */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
            <DocumentiApprovazione
              key={`docs-${docsVersion}`}
              praticaId={pratica.id}
              statoPratica={pratica.stato}
              aperta={docsAperti}
              onToggle={() => setDocsAperti(a => !a)}
              onStatoCambiato={(tutti, totale, approvati) => setDocStats({ totale, approvati })}
              onRicaricaPratica={ricaricaPratica}
            />
            <ChatAdmin praticaId={pratica.id} demolitoreNome={demolitoreNome} aperta={chatAperta} onToggle={() => setChatAperta(a => !a)} />
            <CronologiaNote praticaId={pratica.id} praticaCreataIl={pratica.creato_il} refreshKey={noteVersion} aperta={cronoAperta} onToggle={() => setCronoAperta(a => !a)} />
          </div>

          {/* COLONNA DESTRA: attesa + assegnazione + dati */}
          <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4">

            {/* Nota 21/07: anche il riquadro "In attesa" è stato RIMOSSO
                (come quello dell'annullata): tutto si gestisce dal menu
                "Stato pratica" in testata, motivo e date stanno in cronologia. */}

            {/* Nota 20/07: il riquadro "Pratica annullata" è stato RIMOSSO
                (doppione): motivo e data stanno in Cronologia e note, la
                riattivazione sta nel menu "Stato pratica" in testata. */}

            {pratica.stato !== 'annullata' && <AssegnazioneCard pratica={pratica} demolitoreNome={demolitoreNome} onAssegnato={ricaricaPratica} />}

            <FeePraticaCard pratica={pratica} onAggiornata={ricaricaPratica} />

            <CardCliente pratica={pratica} emailAccount={emailAccount} onSalvata={ricaricaPratica} />

            <CardVeicolo pratica={pratica} onSalvata={ricaricaPratica} />

            <CardRitiro pratica={pratica} onSalvata={ricaricaPratica} />

            <CardDichiarazioni pratica={pratica} onSalvata={async () => { await ricaricaPratica(); setDocsVersion(v => v + 1) }} />

            {/* L'annullamento ora vive nel menu "Stato pratica" in testata:
                qui resta solo l'azione irreversibile — DISCRETA (23/07,
                mockup approvato): scritta piccola in rosso spento, niente
                bottone gigante */}
            <div className="pt-1 flex justify-center">
              <button onClick={() => { setErroreElimina(null); setEliminaOpen(true) }} className="text-[12px] font-medium underline transition-colors hover:text-red-700" style={{ color: '#A65D5D', textUnderlineOffset: 2 }}>
                Elimina definitivamente questa pratica
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MODALE RIATTIVA PRATICA ANNULLATA */}
      {riattivaOpen && pratica.stato === 'annullata' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#DCF3E4' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-center font-semibold text-gray-900">Riattivare questa pratica?</p>
            <p className="text-center text-sm text-gray-500 mt-1">
              La pratica <b>{pratica.targa || 'senza targa'}</b>{' '}torna esattamente allo stato in cui era quando l&apos;hai annullata. La riattivazione resta in cronologia.
            </p>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setRiattivaOpen(false)} disabled={riattivaBusy} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">Annulla</button>
              <button onClick={riattivaPratica} disabled={riattivaBusy} className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50" style={{ background: '#16A34A' }}>
                {riattivaBusy ? 'Un attimo…' : 'Sì, riattiva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE METTI IN ATTESA */}
      {attesaOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#FAEEDA' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <p className="text-center font-semibold text-gray-900">Mettere la pratica in attesa?</p>
            <p className="text-center text-sm text-gray-500 mt-1">
              La pratica esce dal flusso finché non la riprendi (tornerà esattamente dov&apos;era). Il cliente vedrà solo &quot;In attesa&quot;, senza motivi.
            </p>
            <label className="block text-xs font-semibold text-gray-700 mt-4 mb-1.5">Perché va in attesa? <span className="text-gray-400 font-normal">(lo vedi solo tu, in cronologia)</span></label>
            <textarea
              value={attesaMotivo}
              onChange={e => { setAttesaMotivo(e.target.value); setAttesaErr(null) }}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="Es. cliente partito per ferie, torna il 28 luglio"
              autoFocus
            />
            {attesaErr && <p className="text-xs text-red-600 mt-1.5">{attesaErr}</p>}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAttesaOpen(false)} disabled={attesaBusy} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Annulla</button>
              <button onClick={mettiInAttesa} disabled={attesaBusy} className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50" style={{ background: '#B45309' }}>
                {attesaBusy ? 'Un attimo…' : 'Metti in attesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ANNULLA PRATICA */}
      {annullaOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#FAEEDA' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <p className="text-center font-semibold text-gray-900">Annullare questa pratica?</p>
            <p className="text-center text-sm text-gray-500 mt-1">
              La pratica <b>{pratica.targa || 'senza targa'}</b>{' '}resterà nello storico come annullata (non viene cancellata). Il cliente la vedrà come annullata nella sua area.
            </p>
            {pratica.demolitore_id && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3" style={{ background: '#FDF7EA', border: '1.5px solid #F0DFB8' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <span className="text-xs" style={{ color: '#854F0B' }}>È assegnata a <b>{demolitoreNome || 'un demolitore'}</b>: resterà traccia nelle statistiche (sue e tue). Per lui la pratica risulterà annullata.</span>
              </div>
            )}
            <label className="block text-xs font-semibold text-gray-700 mt-4 mb-1.5">Perché la annulli? <span className="text-gray-400 font-normal">(resta nella cronologia)</span></label>
            <textarea
              value={motivoAnnulla}
              onChange={e => { setMotivoAnnulla(e.target.value); setErroreAnnulla(null) }}
              rows={3}
              autoFocus
              placeholder="Es. il cliente ci ha ripensato / veicolo già rottamato / pratica doppia…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500 resize-none placeholder:text-gray-400"
            />
            {erroreAnnulla && <p className="text-[11.5px] text-red-600 mt-1">{erroreAnnulla}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setAnnullaOpen(false); setMotivoAnnulla(''); setErroreAnnulla(null) }} disabled={annullando} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">Indietro</button>
              <button onClick={annullaPratica} disabled={annullando} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#B45309' }}>
                {annullando ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Annullo…</> : 'Sì, annulla pratica'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {pratica.demolitore_id && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3" style={{ background: '#FDF7EA', border: '1.5px solid #F0DFB8' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <span className="text-xs" style={{ color: '#854F0B' }}>Attenzione: è <b>assegnata a {demolitoreNome || 'un demolitore'}</b>. Eliminandola sparirà anche per lui.</span>
              </div>
            )}
            {erroreElimina && <p className="text-center text-xs text-red-600 mt-2">{erroreElimina}</p>}
            {eliminando ? (
              <div className="flex items-center gap-2 justify-center text-sm text-gray-500 py-5"><div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />Elimino…</div>
            ) : (
              <div className="flex flex-col gap-2.5 mt-4">
                <div>
                  <button onClick={() => eliminaDefinitiva(false)} className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl">Elimina solo la pratica</button>
                  <p className="text-[11px] text-gray-500 text-center mt-1">L&apos;account del cliente resta attivo: potrà accedere e fare altre pratiche.</p>
                </div>
                <div>
                  <button onClick={() => eliminaDefinitiva(true)} className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl">Elimina pratica + account cliente</button>
                  <p className="text-[11px] text-gray-500 text-center mt-1">Cancella anche login e accesso del cliente (solo se non ha altre pratiche).</p>
                </div>
                <button onClick={() => setEliminaOpen(false)} className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl">Annulla</button>
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
  const [confermaRimuovi, setConfermaRimuovi] = useState(false)

  async function disassegna() {
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
      setConfermaRimuovi(false)
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
          <>
          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex items-center gap-4">
              <button onClick={() => calcola(true)} disabled={disassegnando} className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">Riassegna a un altro demolitore</button>
              <button onClick={() => setConfermaRimuovi(true)} disabled={disassegnando} className="text-xs font-semibold text-red-500 hover:text-red-700 underline disabled:opacity-50">
                {disassegnando ? 'Rimozione…' : 'Rimuovi assegnazione'}
              </button>
            </div>
            {errore && <p className="text-[11px] text-red-600">{errore}</p>}
          </div>

          {/* MODALE CONFERMA RIMOZIONE ASSEGNAZIONE */}
          {confermaRimuovi && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#FAEEDA' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><line x1="4" y1="4" x2="20" y2="20" /></svg>
                </div>
                <p className="text-center font-semibold text-gray-900">Rimuovere l&apos;assegnazione?</p>
                <p className="text-center text-sm text-gray-500 mt-1">
                  La pratica torna <b>da assegnare</b> e il cliente vedrà il messaggio &quot;stiamo scegliendo un nuovo demolitore&quot;.
                </p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setConfermaRimuovi(false)} disabled={disassegnando} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50">Indietro</button>
                  <button onClick={disassegna} disabled={disassegnando} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#B45309' }}>
                    {disassegnando ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Rimuovo…</> : 'Sì, rimuovi'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
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

function CardInfo({ titolo, azione, children }: { titolo: string; azione?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4" style={STILE_CARD}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <TitoloCard>{titolo}</TitoloCard>
        {azione}
      </div>
      {children}
    </div>
  )
}

// ============================================================
// CARD DATI MODIFICABILI (Cliente / Veicolo / Ritiro / Dichiarazioni)
// Lettura di default; "Modifica" → campi editabili; "Salva" solo se
// qualcosa è cambiato. Salvataggio via /api/pratica-dati (solo admin).
// ============================================================

function CardCliente({ pratica, emailAccount, onSalvata }: { pratica: Pratica; emailAccount: string | null; onSalvata: () => Promise<void> | void }) {
  const [edit, setEdit] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cf, setCf] = useState('')

  function apri() {
    setNome(pratica.nome_richiedente || '')
    setTelefono(pratica.telefono || '')
    setCf(pratica.codice_fiscale || '')
    setEdit(true)
  }
  const modificato = edit && (
    nome.trim() !== (pratica.nome_richiedente || '') ||
    telefono.trim() !== (pratica.telefono || '') ||
    cf.toUpperCase().replace(/\s+/g, '') !== (pratica.codice_fiscale || '')
  )

  async function salva() {
    setSalvando(true)
    try {
      await salvaDatiPratica(pratica.id, { nome_richiedente: nome, telefono, codice_fiscale: cf })
      await onSalvata()
      setEdit(false)
    } catch (e) {
      console.error(e)
      alert('Errore nel salvataggio. Riprova.')
    }
    setSalvando(false)
  }

  return (
    <CardInfo titolo="Cliente" azione={!edit ? <BtnModifica onClick={apri} /> : undefined}>
      {!edit ? (
        <>
          <Riga label="Nome" value={pratica.nome_richiedente} />
          <Riga label="Telefono" value={pratica.telefono} />
          <Riga label="Codice fiscale" value={pratica.codice_fiscale} mono />
          {/* Email dell'ACCOUNT (tabella utenti): sempre quella attuale,
              anche dopo un cambio email fatto dal cliente (22/07) */}
          {emailAccount && <Riga label="Email account" value={emailAccount} />}
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          <CampoEdit label="Nome"><input className={INPUT_CLS} value={nome} onChange={e => setNome(e.target.value)} /></CampoEdit>
          <CampoEdit label="Telefono"><input className={INPUT_CLS} value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" /></CampoEdit>
          <CampoEdit label="Codice fiscale (o P.IVA)"><input className={INPUT_CLS + ' uppercase'} value={cf} onChange={e => setCf(e.target.value)} /></CampoEdit>
          <BarraSalva modificato={modificato} salvando={salvando} onSalva={salva} onAnnulla={() => setEdit(false)} />
        </div>
      )}
    </CardInfo>
  )
}

function CardVeicolo({ pratica, onSalvata }: { pratica: Pratica; onSalvata: () => Promise<void> | void }) {
  const [edit, setEdit] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [targa, setTarga] = useState('')
  const [marca, setMarca] = useState('')
  const [modello, setModello] = useState('')
  const [anno, setAnno] = useState('')
  const [km, setKm] = useState('')

  function apri() {
    setTarga(pratica.targa || '')
    setMarca(pratica.marca || '')
    setModello(pratica.modello || '')
    setAnno(pratica.anno != null ? String(pratica.anno) : '')
    setKm(pratica.km != null ? String(pratica.km) : '')
    setEdit(true)
  }
  const modificato = edit && (
    targa.toUpperCase().replace(/\s+/g, '') !== (pratica.targa || '') ||
    marca.trim() !== (pratica.marca || '') ||
    modello.trim() !== (pratica.modello || '') ||
    anno.trim() !== (pratica.anno != null ? String(pratica.anno) : '') ||
    km.trim() !== (pratica.km != null ? String(pratica.km) : '')
  )

  async function salva() {
    setSalvando(true)
    try {
      await salvaDatiPratica(pratica.id, { targa, marca, modello, anno: anno.trim() || null, km: km.trim() || null })
      await onSalvata()
      setEdit(false)
    } catch (e) {
      console.error(e)
      alert('Errore nel salvataggio. Riprova.')
    }
    setSalvando(false)
  }

  return (
    <CardInfo titolo="Veicolo" azione={!edit ? <BtnModifica onClick={apri} /> : undefined}>
      {!edit ? (
        <>
          <Riga label="Targa" value={pratica.targa} />
          <Riga label="Tipo" value={pratica.tipo_mezzo === 'altro' && pratica.tipo_mezzo_altro ? `Altro: ${pratica.tipo_mezzo_altro}` : pratica.tipo_mezzo} />
          <Riga label="Marca / modello" value={`${pratica.marca || ''} ${pratica.modello || ''}`.trim() || null} />
          <Riga label="Anno · km" value={`${pratica.anno || '—'} · ${pratica.km?.toLocaleString('it-IT') || '—'}`} />
          {pratica.tipo_cambio && <Riga label="Cambio" value={lbl(CAMBIO_LABEL, pratica.tipo_cambio)} />}
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          <CampoEdit label="Targa"><input className={INPUT_CLS + ' uppercase'} value={targa} onChange={e => setTarga(e.target.value)} /></CampoEdit>
          <div className="grid grid-cols-2 gap-2">
            <CampoEdit label="Marca"><input className={INPUT_CLS} value={marca} onChange={e => setMarca(e.target.value)} /></CampoEdit>
            <CampoEdit label="Modello"><input className={INPUT_CLS} value={modello} onChange={e => setModello(e.target.value)} /></CampoEdit>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CampoEdit label="Anno"><input className={INPUT_CLS} value={anno} onChange={e => setAnno(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></CampoEdit>
            <CampoEdit label="Km"><input className={INPUT_CLS} value={km} onChange={e => setKm(e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></CampoEdit>
          </div>
          <BarraSalva modificato={modificato} salvando={salvando} onSalva={salva} onAnnulla={() => setEdit(false)} />
        </div>
      )}
      {/* Condizioni dichiarate dal cliente (non modificabili: sono dichiarazioni sue) */}
      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
        <CondPill valore={pratica.incidentato} buonoSe={false} testoSi="Incidentata" testoNo="Non incidentata" />
        <CondPill valore={pratica.marciante} buonoSe={true} testoSi="Cammina" testoNo="Non cammina" />
        <CondPill valore={pratica.va_in_moto} buonoSe={true} testoSi="Si avvia" testoNo="Non si avvia" />
        <CondPill valore={pratica.parti_mancanti} buonoSe={false} testoSi="Parti mancanti" testoNo="Completo" />
      </div>
      {pratica.note_veicolo && <div className="text-xs text-gray-600 italic mt-2 pt-2 border-t border-gray-100">“{pratica.note_veicolo}”</div>}
    </CardInfo>
  )
}

interface IndirizzoScelto {
  indirizzo: string
  comune?: string
  provincia?: string
  cap?: string
  lat?: number
  lng?: number
}

function CardRitiro({ pratica, onSalvata }: { pratica: Pratica; onSalvata: () => Promise<void> | void }) {
  const [edit, setEdit] = useState(false)
  const [salvando, setSalvando] = useState(false)
  // Indirizzo nuovo SOLO se scelto dai suggerimenti (servono comune e coordinate)
  const [scelto, setScelto] = useState<IndirizzoScelto | null>(null)
  const [spazio, setSpazio] = useState('')
  const [noteSpazio, setNoteSpazio] = useState('')

  function apri() {
    setScelto(null)
    setSpazio(pratica.spazio_carro_attrezzi || '')
    setNoteSpazio(pratica.spazio_carro_attrezzi_note || '')
    setEdit(true)
  }
  const modificato = edit && (
    scelto != null ||
    spazio !== (pratica.spazio_carro_attrezzi || '') ||
    noteSpazio.trim() !== (pratica.spazio_carro_attrezzi_note || '')
  )

  async function salva() {
    setSalvando(true)
    try {
      const dati: Record<string, unknown> = {
        spazio_carro_attrezzi: spazio || null,
        spazio_carro_attrezzi_note: noteSpazio || null,
      }
      if (scelto) {
        dati.indirizzo_ritiro = scelto.indirizzo
        dati.comune_ritiro = scelto.comune || null
        dati.provincia_ritiro = scelto.provincia || null
        dati.cap_ritiro = scelto.cap || null
        dati.lat = scelto.lat ?? null
        dati.lng = scelto.lng ?? null
      }
      await salvaDatiPratica(pratica.id, dati)
      await onSalvata()
      setEdit(false)
    } catch (e) {
      console.error(e)
      alert('Errore nel salvataggio. Riprova.')
    }
    setSalvando(false)
  }

  return (
    <CardInfo titolo="Ritiro" azione={!edit ? <BtnModifica onClick={apri} /> : undefined}>
      {!edit ? (
        <>
          {/* L'indirizzo di Google contiene già comune/CAP/provincia:
              si aggiungono solo se non ci sono già (niente doppioni) */}
          <p className="text-sm text-gray-700">
            {pratica.indirizzo_ritiro || '—'}
            {pratica.comune_ritiro && !(pratica.indirizzo_ritiro || '').toLowerCase().includes(pratica.comune_ritiro.toLowerCase()) && ` · ${pratica.comune_ritiro}${pratica.provincia_ritiro ? ` (${pratica.provincia_ritiro})` : ''}`}
            {pratica.cap_ritiro && !(pratica.indirizzo_ritiro || '').includes(pratica.cap_ritiro) && ` · ${pratica.cap_ritiro}`}
          </p>
          {pratica.spazio_carro_attrezzi && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <Riga label="Spazio carro attrezzi" value={lbl(SPAZIO_LABEL, pratica.spazio_carro_attrezzi)} />
              {pratica.spazio_carro_attrezzi_note && <div className="text-xs text-gray-600 italic mt-1">“{pratica.spazio_carro_attrezzi_note}”</div>}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          <CampoEdit label="Indirizzo dove si trova il veicolo">
            <AutocompleteIndirizzo compatto valoreIniziale={pratica.indirizzo_ritiro || ''} placeholder="Cerca il nuovo indirizzo…" onSelezione={d => setScelto(d)} />
            <p className="text-[11px] mt-1" style={{ color: '#64748b' }}>
              Scegli dai suggerimenti: si aggiornano anche comune, CAP e coordinate (usati da assegnazione e tariffe).
            </p>
          </CampoEdit>
          <CampoEdit label="Spazio carro attrezzi">
            <select className={INPUT_CLS} value={spazio} onChange={e => setSpazio(e.target.value)}>
              <option value="">—</option>
              <option value="libero">Libero, comodo</option>
              <option value="stretto">Stretto</option>
              <option value="no">No, difficile</option>
            </select>
          </CampoEdit>
          <CampoEdit label="Note sullo spazio"><input className={INPUT_CLS} value={noteSpazio} onChange={e => setNoteSpazio(e.target.value)} placeholder="Es. cortile interno, strada chiusa…" /></CampoEdit>
          <BarraSalva modificato={modificato} salvando={salvando} onSalva={salva} onAnnulla={() => setEdit(false)} />
        </div>
      )}
    </CardInfo>
  )
}

// Finché la pratica è in queste fasi l'esito CDC si può ancora cambiare
// (spostato qui dalla card documenti il 17/07: la modifica del certificato
// vive nelle dichiarazioni, non sopra i documenti)
const STATI_FASE_DOCUMENTI = ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati', 'da_assegnare']

function CardDichiarazioni({ pratica, onSalvata }: { pratica: Pratica; onSalvata: () => Promise<void> | void }) {
  const [edit, setEdit] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [libretto, setLibretto] = useState('')
  const [cdc, setCdc] = useState('')
  const [fermo, setFermo] = useState('')
  const [targhe, setTarghe] = useState('') // 'presenti' | 'smarrite'
  const [delegatoNome, setDelegatoNome] = useState('')
  const [delegatoTel, setDelegatoTel] = useState('')

  // TUTTO modificabile TRANNE la casistica (deciso 17/07). Regole:
  // - fermo e targhe non esistono per le targhe straniere (non è al PRA italiano)
  // - il certificato si corregge solo finché la pratica è in fase documenti
  // - la delega non è ammessa per non intestatario e targhe straniere
  // - numero eredi NON modificabile (le casistiche eredi si rivedono a parte)
  const straniere = pratica.casistica === 'targhe_straniere'
  const cdcModificabile = STATI_FASE_DOCUMENTI.includes(pratica.stato) && !straniere
  const targheModificabili = !straniere
  const delegaAmmessa = !straniere && pratica.casistica !== 'non_intestatario'

  function apri() {
    setLibretto(['si', 'denuncia', 'no'].includes(pratica.libretto || '') ? (pratica.libretto as string) : '')
    setCdc(['cartaceo', 'digitale', 'smarrito'].includes(pratica.certificato_proprieta || '') ? (pratica.certificato_proprieta as string) : '')
    setFermo(pratica.fermo_amministrativo === 'si' || pratica.fermo_amministrativo === 'no' ? pratica.fermo_amministrativo : '')
    setTarghe(pratica.targhe_presenti == null ? '' : pratica.targhe_presenti ? 'presenti' : 'smarrite')
    setDelegatoNome(pratica.delegato_nome || '')
    setDelegatoTel(pratica.delegato_telefono || '')
    setEdit(true)
  }

  const librettoCambiato = edit && libretto !== '' && libretto !== (pratica.libretto || '')
  const cdcCambiato = edit && cdcModificabile && cdc !== '' && cdc !== (pratica.certificato_proprieta || '')
  const fermoCambiato = edit && fermo !== '' && fermo !== (pratica.fermo_amministrativo || '')
  const targheCambiate = edit && targheModificabili && targhe !== '' && targhe !== (pratica.targhe_presenti == null ? '' : pratica.targhe_presenti ? 'presenti' : 'smarrite')
  const delegatoCambiato = edit && delegaAmmessa && (delegatoNome.trim() !== (pratica.delegato_nome || '') || delegatoTel.trim() !== (pratica.delegato_telefono || ''))
  const modificato = librettoCambiato || cdcCambiato || fermoCambiato || targheCambiate || delegatoCambiato

  async function salva() {
    setSalvando(true)
    try {
      // 1) Certificato di proprietà: endpoint dedicato (sincronizza la checklist)
      if (cdcCambiato) {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/pratica-cdc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ pratica_id: pratica.id, cdc }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Errore certificato')
      }
      // 2) Tutto il resto in un colpo solo: /api/pratica-dati sincronizza
      //    la checklist per libretto (denuncia), targhe (denuncia) e delegato (delega)
      const dati: Record<string, unknown> = {}
      if (librettoCambiato) dati.libretto = libretto
      if (fermoCambiato) dati.fermo_amministrativo = fermo
      if (targheCambiate) dati.targhe_presenti = targhe === 'presenti'
      if (delegatoCambiato) {
        const nome = delegatoNome.trim()
        dati.delegato_nome = nome || null
        // Senza delegato niente telefono (consegna in prima persona)
        dati.delegato_telefono = nome ? (delegatoTel.trim() || null) : null
      }
      if (Object.keys(dati).length > 0) await salvaDatiPratica(pratica.id, dati)
      await onSalvata()
      setEdit(false)
    } catch (e) {
      console.error(e)
      alert('Errore nel salvataggio. Riprova.')
    }
    setSalvando(false)
  }

  return (
    <CardInfo titolo="Dichiarazioni e casistica" azione={!edit ? <BtnModifica onClick={apri} /> : undefined}>
      {/* La casistica non si tocca: decide documenti e moduli di tutta la pratica */}
      {pratica.casistica && <Riga label="Casistica" value={NOMI_CASISTICHE[pratica.casistica] || pratica.casistica} />}
      {!edit && (
        <>
          {pratica.libretto && <Riga label="Libretto" value={lbl(LIBRETTO_LABEL, pratica.libretto)} />}
          {pratica.certificato_proprieta && <Riga label="Cert. proprietà" value={lbl(CDC_LABEL, pratica.certificato_proprieta)} />}
          {pratica.fermo_amministrativo && <Riga label="Fermo amministrativo" value={lbl(FERMO_LABEL, pratica.fermo_amministrativo)} />}
          {pratica.targhe_presenti != null && <Riga label="Targhe" value={pratica.targhe_presenti ? 'Presenti sul mezzo' : 'Smarrite'} />}
          <Riga label="Delegato" value={pratica.delegato_nome ? `${pratica.delegato_nome}${pratica.delegato_telefono ? ` · ${pratica.delegato_telefono}` : ''}` : 'Consegna in prima persona'} />
        </>
      )}
      {edit && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-2.5">
          <CampoEdit label="Libretto (esito della verifica)">
            {/* "Non ce l'ha" non è un'opzione dell'admin: è la risposta del
                cliente che fa scattare il "Da contattare" — dopo la telefonata
                l'esito è sempre uno di questi due */}
            <select className={INPUT_CLS} value={libretto === 'no' ? '' : libretto} onChange={e => setLibretto(e.target.value)}>
              {(libretto === '' || libretto === 'no') && <option value="" disabled>Scegli…</option>}
              <option value="si">Ha l&apos;originale</option>
              <option value="denuncia">Denuncia di smarrimento</option>
            </select>
          </CampoEdit>
          {cdcModificabile && (
            <CampoEdit label="Certificato di proprietà">
              <select className={INPUT_CLS} value={cdc} onChange={e => setCdc(e.target.value)}>
                {cdc === '' && <option value="" disabled>Scegli…</option>}
                <option value="cartaceo">Cartaceo</option>
                <option value="digitale">Digitale</option>
                <option value="smarrito">Smarrito (denuncia)</option>
              </select>
            </CampoEdit>
          )}
          {!straniere && (
            <CampoEdit label="Fermo amministrativo">
              <select className={INPUT_CLS} value={fermo} onChange={e => setFermo(e.target.value)}>
                {fermo === '' && <option value="" disabled>Scegli…</option>}
                <option value="si">Sì</option>
                <option value="no">No</option>
              </select>
            </CampoEdit>
          )}
          {targheModificabili && (
            <CampoEdit label="Targhe">
              <select className={INPUT_CLS} value={targhe} onChange={e => setTarghe(e.target.value)}>
                {targhe === '' && <option value="" disabled>Scegli…</option>}
                <option value="presenti">Presenti sul mezzo</option>
                <option value="smarrite">Smarrite (denuncia)</option>
              </select>
            </CampoEdit>
          )}
          {delegaAmmessa && (
            <>
              <CampoEdit label="Delegato (vuoto = consegna in prima persona)">
                <input className={INPUT_CLS} value={delegatoNome} onChange={e => setDelegatoNome(e.target.value)} placeholder="Nome e cognome del delegato" />
              </CampoEdit>
              {delegatoNome.trim() !== '' && (
                <CampoEdit label="Telefono delegato">
                  <input className={INPUT_CLS} value={delegatoTel} onChange={e => setDelegatoTel(e.target.value)} placeholder="Numero di telefono" />
                </CampoEdit>
              )}
            </>
          )}
          <p className="text-[11px]" style={{ color: '#64748b', lineHeight: 1.5 }}>
            L&apos;area del cliente si aggiorna da sola: documenti e denunce compaiono o spariscono in base a queste risposte. Ciò che il cliente ha già caricato non si tocca mai.
          </p>
          <BarraSalva modificato={modificato} salvando={salvando} onSalva={salva} onAnnulla={() => setEdit(false)} />
        </div>
      )}
      {pratica.numero_eredi != null && (pratica.casistica === 'eredi_accettato' || pratica.casistica === 'eredi_rinuncia') && <Riga label="Numero eredi" value={String(pratica.numero_eredi)} />}
      {pratica.nomi_rinunciatari && <Riga label="Rinunciatari" value={pratica.nomi_rinunciatari} />}
    </CardInfo>
  )
}

// ⭐ 23/07 (mockup approvato): ETICHETTE in evidenza (scure), DATI del
// cliente più leggeri (grigio normale) — il grassetto pieno resta ai titoli
function Riga({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1.5" style={{ borderBottom: '1px solid #F4F6F8' }}>
      <span className="text-[12.5px] font-semibold flex-shrink-0" style={{ color: '#374151' }}>{label}</span>
      <span className={`text-[12.5px] text-right truncate ${mono ? 'font-mono' : ''}`} style={{ color: '#6B7280', letterSpacing: mono ? 0.8 : 0 }}>{value || '—'}</span>
    </div>
  )
}
