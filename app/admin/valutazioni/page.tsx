'use client'

// ============================================================
// VALUTAZIONI — la lista delle richieste "Voglio sapere quanto vale"
// ⭐ 18/09 (mockup A approvato da Davide): pagina GEMELLA di /admin.
// Stessa barra azzurra, stessa fila di pillole del flusso, stesse righe
// e stessa tendina sotto la riga con le schede in fila: Cronologia e
// Note · Cliente · Veicolo · Foto · Risposta al cliente.
// I dati passano da /api/admin-valutazioni (service role): la tabella
// veicoli_vendita è visibile solo al proprietario.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '../_components/AdminSidebar'
import IconaVeicolo from '../../components/IconaVeicolo'
import { nomeAlimentazione } from '@/types/pratica'
import { STATI_VALUTAZIONE, metaValutazione, NOMI_INTESTAZIONE, NOMI_CASISTICHE, OffertaTipo } from '@/lib/statiValutazione'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

interface Foto { url: string; posizione: string | null }
interface Richiesta {
  id: string
  stato: string
  tipo_mezzo: string | null
  tipo_mezzo_altro: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  km: number | null
  tipo_cambio: string | null
  alimentazione: string | null
  incidentato: boolean | null
  va_in_moto: boolean | null
  marciante: boolean | null
  parti_mancanti: boolean | null
  note_veicolo: string | null
  indirizzo: string | null
  comune: string | null
  provincia: string | null
  cap: string | null
  targa: string | null
  targhe_presenti: boolean | null
  codice_fiscale: string | null
  intestazione: string | null
  casistica: string | null
  fermo_amministrativo: string | null
  nome_richiedente: string | null
  telefono: string | null
  offerta_tipo: string | null
  offerta_importo: number | null
  offerta_messaggio: string | null
  offerta_inviata_il: string | null
  risposta_cliente: string | null
  risposta_il: string | null
  pratica_id: string | null
  note_admin: string | null
  creato_il: string
  foto: Foto[]
}

const NOMI_POSIZIONE: Record<string, string> = { davanti: 'Davanti', dietro: 'Dietro', destro: 'Lato destro', sinistro: 'Lato sinistro', interni: 'Interni', cruscotto: 'Cruscotto' }

// "2 ore fa", "ieri", "il 15/09"
function daQuanto(iso: string | null): string {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 2) return 'adesso'
  if (min < 60) return `${min} minuti fa`
  const ore = Math.floor(min / 60)
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`
  const giorni = Math.floor(ore / 24)
  if (giorni === 1) return 'ieri'
  if (giorni < 7) return `${giorni} giorni fa`
  return `il ${new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`
}
function dataOra(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
}
function euro(n: number | null): string { return n == null ? '—' : `${n.toLocaleString('it-IT')} €` }

// Com'è scritta la risposta data, in lista e nella scheda
function testoRisposta(r: Richiesta): string {
  if (r.offerta_tipo === 'acquisto') return `Riconosciamo ${euro(r.offerta_importo)}`
  if (r.offerta_tipo === 'demolizione') return 'Demolizione gratuita'
  return '—'
}

export default function Valutazioni() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [filtro, setFiltro] = useState<string>('tutte')
  const [ricerca, setRicerca] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const chiama = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin-valutazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Errore')
    return json
  }, [])

  const ricarica = useCallback(async () => {
    try {
      const json = await chiama({ azione: 'lista' })
      setRichieste(json.richieste || [])
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore di caricamento')
    }
  }, [chiama])

  useEffect(() => {
    async function avvia() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }
      await ricarica()
      setLoading(false)
    }
    avvia()
  }, [router, ricarica])

  // Esc chiude la tendina, come nelle pratiche
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSelId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const conta = (stato: string) => richieste.filter(r => r.stato === stato).length
  const q = ricerca.trim().toLowerCase()
  const visibili = richieste
    .filter(r => filtro === 'tutte' || r.stato === filtro)
    .filter(r => !q || [r.targa, r.marca, r.modello, r.nome_richiedente, r.comune, r.telefono].some(v => (v || '').toLowerCase().includes(q)))

  function cambiaFiltro(f: string) { setFiltro(prev => prev === f ? 'tutte' : f); setSelId(null) }

  if (loading) {
    return (
      <main className="h-screen overflow-hidden flex" style={{ background: '#ECEEF2' }}>
        <AdminSidebar attivo="valutazioni" />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Caricamento…</div>
      </main>
    )
  }

  return (
    <main className="h-screen overflow-hidden flex" style={{ background: '#ECEEF2' }}>
      <AdminSidebar attivo="valutazioni" />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOP BAR azzurra, gemella di "Pratiche" */}
        <div className="border-b px-6 py-3 flex items-center gap-4" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Valutazioni</h1>
            <p className="text-xs text-gray-500 mt-1">{richieste.length} totali · {conta('da_valutare')} da valutare</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-2 w-[210px] focus-within:w-[300px] bg-white border-[#DBEAFE] focus-within:border-blue-300 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-all duration-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca…" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">×</button>}
            </div>
          </div>
        </div>

        <div className="px-6 pt-6 flex-1 min-h-0 flex flex-col">
          {/* FLUSSO: tre fasi in fila con le frecce, poi le due caselle staccate */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso valutazioni</div>
          <div className="mb-3 overflow-x-auto">
            <div className="flex items-center">
              {STATI_VALUTAZIONE.filter(s => s.inFila).map((s, i) => (
                <div key={s.chiave} className="flex items-center">
                  {i > 0 && (
                    <span style={{ width: 22, display: 'flex', justifyContent: 'center', color: '#C0C7D1' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  )}
                  <PillolaFase nome={s.label} valore={conta(s.chiave)} attivo={filtro === s.chiave} onClick={() => cambiaFiltro(s.chiave)} />
                </div>
              ))}
              <div style={{ width: 14, flexShrink: 0 }} />
              {STATI_VALUTAZIONE.filter(s => !s.inFila).map(s => (
                <div key={s.chiave} className="flex items-center" style={{ marginRight: 14 }}>
                  <PillolaFase nome={s.label} valore={conta(s.chiave)} attivo={filtro === s.chiave} grigia onClick={() => cambiaFiltro(s.chiave)} />
                </div>
              ))}
            </div>
          </div>

          {errore && <div className="mb-3 text-sm rounded-xl p-3" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{errore}</div>}

          <div className="overflow-auto flex-1 min-h-0 pb-6">
            {visibili.length === 0 ? (
              <div className="card-admin px-4 py-10 text-center text-sm text-gray-500">Nessuna richiesta in questa vista.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {visibili.map(r => {
                  const m = metaValutazione(r.stato)
                  const aperta = r.id === selId
                  const evidenzia = aperta || hoverId === r.id
                  return (
                    <div key={r.id} style={{ border: `2px solid ${aperta ? '#2563EB' : 'transparent'}`, borderRadius: 16, background: aperta ? '#F7F8FB' : 'transparent', boxShadow: aperta ? '0 4px 16px rgba(37,99,235,0.16)' : 'none', transition: 'all .28s ease' }}>
                      {/* LA RIGA (testata quando è aperta) */}
                      <div
                        onClick={() => setSelId(aperta ? null : r.id)}
                        onMouseEnter={() => setHoverId(r.id)}
                        onMouseLeave={() => setHoverId(null)}
                        className={`cursor-pointer transition-all ${aperta ? '' : 'hover:!bg-[#EFF6FF] hover:!border-[#BFDBFE] hover:shadow-[0_2px_8px_rgba(37,99,235,0.10)] hover:-translate-y-[1px]'}`}
                        style={{ background: aperta ? '#EFF6FF' : '#fff', border: `1.5px solid ${aperta ? 'transparent' : '#E5E7EB'}`, borderRadius: aperta ? '13px 13px 0 0' : 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: aperta ? 'none' : '0 1px 3px rgba(16,24,40,0.07)', opacity: (r.stato === 'chiusa' || r.stato === 'rifiutata') && !aperta ? 0.82 : 1 }}
                      >
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: r.stato === 'passata_demolizione' ? '#DCF3E4' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {r.stato === 'passata_demolizione'
                            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            : <IconaVeicolo tipo={r.tipo_mezzo} />}
                        </div>

                        {/* Veicolo */}
                        <div style={{ flex: 1.6, minWidth: 0 }}>
                          <div className="text-[15px] font-bold truncate" style={{ color: '#111827' }}>
                            {r.targa || 'Targa mancante'}{r.marca && ` · ${r.marca} ${r.modello || ''}`}{r.anno ? ` · ${r.anno}` : ''}{r.km != null ? ` · ${Number(r.km).toLocaleString('it-IT')} km` : ''}
                          </div>
                          <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                            {r.comune ? `${r.comune}${r.provincia ? ` (${r.provincia})` : ''}` : (r.indirizzo || '—')}
                            {r.alimentazione && ` · ${nomeAlimentazione(r.alimentazione).toLowerCase()}`}
                            {r.tipo_cambio && r.tipo_cambio !== 'non_so' && `, ${r.tipo_cambio}`}
                          </div>
                        </div>

                        {/* Cliente: intestazione, targhe e fermo già in vista */}
                        <div style={{ flex: 1.3, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                          <div className="text-[13.5px] font-semibold text-gray-900 truncate">{r.nome_richiedente || '—'}</div>
                          <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                            {r.intestazione ? (NOMI_INTESTAZIONE[r.intestazione] || r.intestazione) : '—'}
                            {r.targhe_presenti === false && ' · targhe smarrite'}
                            {r.fermo_amministrativo === 'si' && ' · fermo'}
                            {r.fermo_amministrativo === 'non_so' && ' · fermo: non lo sa'}
                          </div>
                        </div>

                        {/* Stato + da quanto */}
                        <div style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                          <span className="inline-block text-[11.5px] font-bold rounded-full transition-colors" style={{ background: evidenzia && m.chiave !== 'rifiutata' ? '#fff' : m.bg, color: m.text, border: `1px solid ${evidenzia && m.chiave !== 'rifiutata' ? `${m.text}55` : 'transparent'}`, padding: '3px 11px' }}>{m.label}</span>
                          <div className="text-[11px] mt-1 truncate" style={{ color: '#6B7280' }}>
                            {r.stato === 'da_valutare' && `arrivata ${daQuanto(r.creato_il)}`}
                            {r.stato === 'risposta_inviata' && `inviata ${daQuanto(r.offerta_inviata_il)} · il cliente non ha ancora risposto`}
                            {r.stato === 'passata_demolizione' && `accettata ${daQuanto(r.risposta_il)}`}
                            {r.stato === 'rifiutata' && `rifiutata ${daQuanto(r.risposta_il)}`}
                            {r.stato === 'chiusa' && 'chiusa senza seguito'}
                          </div>
                        </div>

                        {/* La risposta data */}
                        <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                          <div className="text-[12.5px] font-semibold truncate" style={{ color: '#3E4C63' }}>{testoRisposta(r)}</div>
                          {r.stato === 'passata_demolizione' && r.pratica_id && (
                            <button onClick={e => { e.stopPropagation(); router.push('/admin') }} className="text-[11px] font-semibold hover:underline" style={{ color: '#1D4ED8', marginTop: 2 }}>Apri la pratica →</button>
                          )}
                        </div>
                      </div>

                      {/* LA TENDINA */}
                      {aperta && (
                        <Tendina r={r} chiama={chiama} ricarica={ricarica} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

// ============================================================
// LA TENDINA: cinque schede in fila
// ============================================================
function Tendina({ r, chiama, ricarica }: { r: Richiesta; chiama: (b: Record<string, unknown>) => Promise<unknown>; ricarica: () => Promise<void> }) {
  const pieno = r.stato === 'da_valutare' || r.stato === 'chiusa'
  const condizioni = [
    r.va_in_moto === true ? 'va in moto' : r.va_in_moto === false ? 'non va in moto' : null,
    r.marciante === true ? 'cammina' : r.marciante === false ? 'non cammina' : null,
    r.incidentato === true ? 'incidentata' : r.incidentato === false ? 'non incidentata' : null,
    r.parti_mancanti === true ? 'parti mancanti' : null,
  ].filter(Boolean).join(', ')

  return (
    <div style={{ padding: '14px 14px 16px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <SchedaNote key={r.id} r={r} chiama={chiama} ricarica={ricarica} />

        <Scheda titolo="Cliente" righe={[
          { k: 'Nome', v: r.nome_richiedente || '—' },
          { k: 'Telefono', v: r.telefono || '—' },
          { k: 'Intestazione', v: r.intestazione ? (NOMI_INTESTAZIONE[r.intestazione] || r.intestazione) : '—' },
          { k: r.intestazione === 'societa' ? 'Partita IVA / CF' : 'Codice fiscale', v: r.codice_fiscale || '—' },
          { k: 'Casistica', v: r.casistica ? (NOMI_CASISTICHE[r.casistica] || r.casistica) : '—', pillola: !!r.casistica },
        ]} />

        <Scheda titolo="Veicolo" righe={[
          { k: 'Targa', v: r.targa || '—' },
          { k: 'Mezzo', v: `${r.tipo_mezzo_altro || r.tipo_mezzo || '—'}${r.marca ? ` · ${r.marca} ${r.modello || ''}` : ''}` },
          { k: 'Anno · km', v: `${r.anno ?? '—'} · ${r.km != null ? Number(r.km).toLocaleString('it-IT') : '—'}` },
          { k: 'Cambio · alim.', v: `${r.tipo_cambio === 'manuale' ? 'Manuale' : r.tipo_cambio === 'automatico' ? 'Automatico' : '—'} · ${nomeAlimentazione(r.alimentazione)}` },
          { k: 'Condizioni', v: condizioni || '—' },
          { k: 'Targhe', v: r.targhe_presenti == null ? '—' : r.targhe_presenti ? 'Presenti' : 'Smarrite o rubate', pillola: r.targhe_presenti != null },
          { k: 'Fermo', v: r.fermo_amministrativo === 'si' ? 'Sì' : r.fermo_amministrativo === 'no' ? 'No' : r.fermo_amministrativo === 'non_so' ? 'Non lo sa' : '—', pillola: !!r.fermo_amministrativo },
          { k: 'Dove si trova', v: r.indirizzo || '—', multiriga: true },
        ]} extra={r.note_veicolo ? <div style={{ fontSize: 11.5, color: '#6B7280', paddingTop: 6, lineHeight: 1.5 }}><b style={{ color: '#1E293B', fontWeight: 600 }}>Note del cliente:</b> {r.note_veicolo}</div> : undefined} />

        <SchedaFoto foto={r.foto} />

        <SchedaRisposta key={`${r.id}-${r.stato}`} r={r} chiama={chiama} ricarica={ricarica} pieno={pieno} />
      </div>
    </div>
  )
}

function Scheda({ titolo, righe, extra, larga }: { titolo: string; righe: { k: string; v: string; pillola?: boolean; multiriga?: boolean }[]; extra?: React.ReactNode; larga?: boolean }) {
  return (
    <div style={{ flex: larga ? 1.5 : 1, minWidth: 200, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px' }}>
      <TitoloScheda titolo={titolo} />
      {righe.map((x, i) => (
        <div key={x.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, minHeight: 27, padding: '5px 0', borderBottom: i === righe.length - 1 && !extra ? 'none' : '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{x.k}</span>
          {x.pillola && x.v !== '—'
            ? <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, borderRadius: 999, padding: '1px 8px', fontSize: 11 }}>{x.v}</span>
            : <span style={{ flex: 1, minWidth: 0, color: '#6B7280', textAlign: 'right', lineHeight: 1.5, whiteSpace: x.multiriga ? 'normal' : 'nowrap', overflow: x.multiriga ? 'visible' : 'hidden', textOverflow: 'ellipsis' }}>{x.v}</span>}
        </div>
      ))}
      {extra}
    </div>
  )
}

function TitoloScheda({ titolo, destra }: { titolo: string; destra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0F1B33', flex: 1, minWidth: 0 }}>
        <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
        {titolo}
      </span>
      {destra}
    </div>
  )
}

// Cronologia (gli eventi che si ricavano dalle date) + la nota dell'admin con la matita
function SchedaNote({ r, chiama, ricarica }: { r: Richiesta; chiama: (b: Record<string, unknown>) => Promise<unknown>; ricarica: () => Promise<void> }) {
  const [inEdit, setInEdit] = useState(false)
  const [testo, setTesto] = useState(r.note_admin || '')
  const [salvando, setSalvando] = useState(false)

  async function salva() {
    setSalvando(true)
    try { await chiama({ azione: 'nota', id: r.id, testo }); await ricarica(); setInEdit(false) } finally { setSalvando(false) }
  }

  const eventi: { quando: string; cosa: string }[] = [{ quando: dataOra(r.creato_il), cosa: 'Richiesta arrivata' }]
  if (r.offerta_inviata_il) eventi.push({ quando: dataOra(r.offerta_inviata_il), cosa: `Risposta inviata: ${testoRisposta(r)}` })
  if (r.risposta_il) eventi.push({ quando: dataOra(r.risposta_il), cosa: r.risposta_cliente === 'accettata' ? 'Il cliente ha accettato' : 'Il cliente ha rifiutato' })
  if (r.stato === 'chiusa') eventi.push({ quando: '', cosa: 'Chiusa senza seguito' })

  return (
    <div style={{ flex: 1, minWidth: 200, background: '#fff', border: `1.5px solid ${inEdit ? '#93C5FD' : '#E5E7EB'}`, borderRadius: 12, padding: '11px 13px' }}>
      <TitoloScheda titolo="Cronologia e Note" destra={
        inEdit ? (
          <span style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => { setTesto(r.note_admin || ''); setInEdit(false) }} disabled={salvando} style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}>Annulla</button>
            <button onClick={salva} disabled={salvando} style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 11px', cursor: 'pointer' }}>{salvando ? '…' : 'Salva'}</button>
          </span>
        ) : (
          <button onClick={() => setInEdit(true)} aria-label="Modifica note" className="flex items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-200" style={{ width: 22, height: 22, borderRadius: 7, border: '1.5px solid #E5E7EB', background: '#fff', color: '#1D4ED8', cursor: 'pointer' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </button>
        )
      } />
      {eventi.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ color: '#6B7280', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 108 }}>{e.quando}</span>
          <span style={{ color: '#1E293B', fontWeight: 600 }}>{e.cosa}</span>
        </div>
      ))}
      <div style={{ paddingTop: 7 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#5B6779', textTransform: 'uppercase', marginBottom: 4 }}>Note</div>
        {inEdit
          ? <textarea value={testo} onChange={e => setTesto(e.target.value)} rows={3} className="w-full text-[12px] text-gray-900 placeholder:text-gray-400 outline-none" style={{ border: '1.5px solid #93C5FD', borderRadius: 8, padding: '6px 8px', resize: 'vertical' }} placeholder="Appunti solo per noi" />
          : <div style={{ fontSize: 11.5, color: r.note_admin ? '#3E4C63' : '#9CA3AF', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{r.note_admin || '—'}</div>}
      </div>
    </div>
  )
}

function SchedaFoto({ foto }: { foto: Foto[] }) {
  return (
    <div style={{ flex: 1, minWidth: 200, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px' }}>
      <TitoloScheda titolo={`Foto${foto.length ? ` · ${foto.length}` : ''}`} />
      {foto.length === 0 ? (
        <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>Nessuna foto</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {foto.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noreferrer" title="Apri la foto" style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', background: '#E5E9F0', display: 'block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.posizione || `foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {f.posizione && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '2px 6px', fontSize: 9.5, fontWeight: 700, color: '#fff', background: 'rgba(15,23,42,0.55)' }}>{NOMI_POSIZIONE[f.posizione] || f.posizione}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// LA SCHEDA "RISPOSTA AL CLIENTE" (il cuore della pagina)
// Due tessere: "Non la paghiamo" (proponiamo la demolizione gratuita,
// col motivo che il cliente legge) e "Riconosciamo una cifra"
// (NoiDemoliamo la compra, con l'importo). Dopo l'invio mostra la
// risposta data e permette di cambiarla o chiudere.
// ============================================================
function SchedaRisposta({ r, chiama, ricarica, pieno }: { r: Richiesta; chiama: (b: Record<string, unknown>) => Promise<unknown>; ricarica: () => Promise<void>; pieno: boolean }) {
  const [tipo, setTipo] = useState<OffertaTipo>(r.offerta_tipo === 'acquisto' ? 'acquisto' : 'demolizione')
  const [importo, setImporto] = useState(r.offerta_importo ? String(r.offerta_importo) : '')
  const [messaggio, setMessaggio] = useState(r.offerta_messaggio || '')
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [conferma, setConferma] = useState<'chiudi' | 'riapri' | null>(null)
  // (la scheda è montata con key = id + stato: a ogni cambio di stato
  // riparte pulita coi valori della richiesta, senza effetti)

  async function azione(body: Record<string, unknown>) {
    setLavoro(true); setErrore(null)
    try { await chiama({ ...body, id: r.id }); await ricarica(); setConferma(null) }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Errore') }
    finally { setLavoro(false) }
  }

  const tessera = (t: OffertaTipo, titolo: string, sotto: string) => (
    <button type="button" onClick={() => { setTipo(t); setErrore(null) }} style={{ textAlign: 'left', border: `1.5px solid ${tipo === t ? '#2563EB' : '#E5E7EB'}`, background: tipo === t ? '#EFF6FF' : '#fff', color: tipo === t ? '#1D4ED8' : '#1F2937', borderRadius: 10, padding: '9px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
      {titolo}<span style={{ display: 'block', fontWeight: 500, color: '#6B7280', fontSize: 11, marginTop: 2 }}>{sotto}</span>
    </button>
  )
  const etichetta = (t: string) => <div style={{ fontSize: 10.5, fontWeight: 700, color: '#5B6779', textTransform: 'uppercase', marginBottom: 4 }}>{t}</div>
  const bottone = (testo: string, onClick: () => void, blu?: boolean) => (
    <button type="button" onClick={onClick} disabled={lavoro} className="disabled:opacity-50 transition-colors" style={{ borderRadius: 999, fontSize: 11.5, fontWeight: 700, padding: '7px 14px', border: `1.5px solid ${blu ? '#2563EB' : '#E5E7EB'}`, background: blu ? '#2563EB' : '#fff', color: blu ? '#fff' : '#1F2937', cursor: 'pointer' }}>{testo}</button>
  )

  return (
    <div style={{ flex: 1.5, minWidth: 260, background: '#fff', border: '1.5px solid #93C5FD', borderRadius: 12, padding: '11px 13px' }}>
      <TitoloScheda titolo="Risposta al cliente" />

      {r.stato === 'passata_demolizione' && (
        <div style={{ fontSize: 12, color: '#1F7A43', background: '#DCF3E4', border: '1.5px solid #B7E4C7', borderRadius: 9, padding: '9px 11px', lineHeight: 1.55 }}>
          <b>{testoRisposta(r)}</b> · il cliente ha accettato {daQuanto(r.risposta_il)}.<br />La richiesta è diventata una pratica di demolizione.
        </div>
      )}

      {r.stato === 'rifiutata' && (
        <>
          <div style={{ fontSize: 12, color: '#A94444', background: '#F3D9D9', border: '1.5px solid #E8BFBF', borderRadius: 9, padding: '9px 11px', lineHeight: 1.55 }}>
            <b>{testoRisposta(r)}</b> · il cliente ha rifiutato {daQuanto(r.risposta_il)}.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>{bottone('Fai una nuova proposta', () => azione({ azione: 'riapri' }))}</div>
        </>
      )}

      {r.stato === 'risposta_inviata' && (
        <>
          <div style={{ fontSize: 12, color: '#1E3A8A', background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 9, padding: '9px 11px', lineHeight: 1.55 }}>
            <b style={{ color: '#1D4ED8' }}>{testoRisposta(r)}</b> · inviata {dataOra(r.offerta_inviata_il)}<br />
            {r.offerta_messaggio && <span style={{ color: '#3E4C63' }}>“{r.offerta_messaggio}”<br /></span>}
            Il cliente non ha ancora risposto.
          </div>
          {conferma === null ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {bottone('Cambia la risposta', () => setConferma('riapri'))}
              {bottone('Chiudi senza seguito', () => setConferma('chiudi'))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', fontSize: 11.5, color: '#3E4C63' }}>
              {conferma === 'riapri' ? 'La risposta inviata sparisce dall’area del cliente. Vai avanti?' : 'La richiesta si chiude senza seguito. Vai avanti?'}
              {bottone('Sì', () => azione({ azione: conferma }), true)}
              {bottone('No', () => setConferma(null))}
            </div>
          )}
        </>
      )}

      {pieno && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            {tessera('demolizione', 'Non la paghiamo', 'proponiamo la demolizione gratuita')}
            {tessera('acquisto', 'Riconosciamo una cifra', 'NoiDemoliamo la compra')}
          </div>
          {tipo === 'acquisto' ? (
            <>
              <div style={{ marginTop: 8 }}>
                {etichetta('Importo')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input value={importo} onChange={e => setImporto(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="250" className="text-[12.5px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400" style={{ width: 110, border: '1.5px solid #E5E7EB', borderRadius: 9, padding: '7px 10px', fontWeight: 700 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3E4C63' }}>€</span>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                {etichetta('Due righe per il cliente (facoltativo)')}
                <textarea value={messaggio} onChange={e => setMessaggio(e.target.value)} rows={2} placeholder="Es. Ritiro a domicilio gratuito, pagamento al ritiro." className="w-full text-[12.5px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400" style={{ border: '1.5px solid #E5E7EB', borderRadius: 9, padding: '7px 10px', resize: 'vertical' }} />
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              {etichetta('Motivo (lo legge il cliente)')}
              <textarea value={messaggio} onChange={e => setMessaggio(e.target.value)} rows={2} placeholder="Es. Anno e chilometri: il valore di mercato non copre i costi di ritiro e pratica." className="w-full text-[12.5px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400" style={{ border: '1.5px solid #E5E7EB', borderRadius: 9, padding: '7px 10px', resize: 'vertical' }} />
            </div>
          )}
          {errore && <div style={{ fontSize: 11.5, color: '#9B1C1C', marginTop: 8 }}>{errore}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            {bottone(lavoro ? 'Invio…' : 'Invia la risposta', () => azione({ azione: 'rispondi', tipo, importo: importo ? Number(importo) : null, messaggio }), true)}
            {r.stato === 'chiusa' && <span style={{ fontSize: 11, color: '#6B7280' }}>La richiesta è chiusa: inviando una risposta si riapre.</span>}
          </div>
          <div style={{ fontSize: 11.5, color: '#1E3A8A', background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 9, padding: '8px 10px', marginTop: 8, lineHeight: 1.5 }}>
            Il cliente la trova nella sua area personale. Se accetta la demolizione, la richiesta diventa una pratica e lui completa le domande che mancano.
          </div>
        </>
      )}
    </div>
  )
}

function PillolaFase({ nome, valore, attivo, grigia, onClick }: { nome: string; valore: number; attivo: boolean; grigia?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 transition-all hover:shadow-md flex-shrink-0"
      style={{ background: attivo ? '#EFF6FF' : '#fff', border: `1.5px solid ${attivo ? '#2563eb' : '#E5E7EB'}`, borderRadius: 999, padding: '8px 14px 8px 9px', whiteSpace: 'nowrap', boxShadow: attivo ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(16,24,40,0.07)' }}
    >
      <span className="flex items-center justify-center rounded-full" style={{ minWidth: 26, height: 26, padding: '0 6px', background: grigia ? '#EDF0F5' : '#EFF4FF', color: grigia ? '#64748B' : '#1D4ED8', fontSize: 13, fontWeight: 800 }}>{valore}</span>
      <span className="text-[13px] font-bold" style={{ color: '#1F2937' }}>{nome}</span>
    </button>
  )
}
