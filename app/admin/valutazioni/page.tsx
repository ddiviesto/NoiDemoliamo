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

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '../_components/AdminSidebar'
import IconaVeicolo from '../../components/IconaVeicolo'
import VisoreDocumenti from '../../components/VisoreDocumenti'
import { TessereFlusso, TesseraFase } from '../../components/TessereFlusso'
import { nomeAlimentazione } from '@/types/pratica'
import { STATI_VALUTAZIONE, metaValutazione, NOMI_CASISTICHE, OffertaTipo, EVENTI_VALUTAZIONE, testoOfferta, voceProposta } from '@/lib/statiValutazione'
import { SezTendinaMod, PillCondizioni, NotaClienteVeicolo, FERMO_LABEL, etichettaTarghe, etichettaCambio, indirizzoRitiroCompleto } from '../_components/PezziTendina'
import { VoceCronologia, DettaglioVoce, CampoNota, PillolaCronologia, ICONA_NOTA, PILLOLA_NOTA_PRIVATA } from '../_components/VoceCronologia'

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
  email?: string | null
  offerta_tipo: string | null
  offerta_importo: number | null
  offerta_messaggio: string | null
  offerta_inviata_il: string | null
  risposta_cliente: string | null
  risposta_il: string | null
  pratica_id: string | null
  note_admin: string | null
  creato_il: string
  aggiornato_il?: string | null
  foto: Foto[]
}

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
  return testoOfferta(r.offerta_tipo, r.offerta_importo)
}

export default function Valutazioni() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [filtro, setFiltro] = useState<string>('tutte')
  const [ricerca, setRicerca] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  // ⭐ 07/11 ("super fluido", Davide): la tendina resta montata finché si
  // riavvolge (320 ms), così la chiusura è morbida come l'apertura
  const [renderId, setRenderId] = useState<string | null>(null)
  function chiudi() {
    const id = selId
    setSelId(null)
    if (id) setTimeout(() => setRenderId(r => (r === id ? null : r)), 320)
  }
  function apriChiudi(id: string) {
    if (selId === id) chiudi()
    else { setRenderId(id); setSelId(id) }
  }
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
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') chiudi() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const conta = (stato: string) => richieste.filter(r => r.stato === stato).length
  const q = ricerca.trim().toLowerCase()
  const visibili = richieste
    .filter(r => filtro === 'tutte' || r.stato === filtro)
    .filter(r => !q || [r.targa, r.marca, r.modello, r.nome_richiedente, r.comune, r.telefono].some(v => (v || '').toLowerCase().includes(q)))

  function cambiaFiltro(f: string) { setFiltro(prev => prev === f ? 'tutte' : f); chiudi() }

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
          {/* FLUSSO: le stesse tessere del flusso pratiche (⭐ 07/11, Davide:
              "come in demolizione"): tre fasi in fila con le frecce, poi
              Rifiutata e Chiusa senza freccia. Parole e ordine invariati. */}
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Flusso valutazioni</div>
          <TessereFlusso colonne={5} filtroAttivo={filtro !== 'tutte'}>
            {STATI_VALUTAZIONE.map((s, i, tutti) => (
              <TesseraFase
                key={s.chiave}
                nome={s.label}
                valore={conta(s.chiave)}
                attivo={filtro === s.chiave}
                freccia={s.inFila && !!tutti[i + 1]?.inFila}
                chiusa={s.chiave === 'passata_demolizione'}
                grigia={s.chiave === 'chiusa'}
                rossa={s.chiave === 'rifiutata'}
                onClick={() => cambiaFiltro(s.chiave)}
              />
            ))}
          </TessereFlusso>

          {/* FILTRI RAPIDI, come nelle pratiche (⭐ 07/11, mockup B) */}
          <div className="flex gap-1.5 mb-3 flex-wrap text-xs">
            <ChipFiltro attivo={filtro === 'tutte'} onClick={() => setFiltro('tutte')}>Tutte {richieste.filter(r => r.stato !== 'chiusa').length}</ChipFiltro>
            <ChipFiltro attivo={filtro === 'chiusa'} onClick={() => cambiaFiltro('chiusa')}>Chiuse {conta('chiusa')}</ChipFiltro>
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
                        onClick={() => apriChiudi(r.id)}
                        onMouseEnter={() => setHoverId(r.id)}
                        onMouseLeave={() => setHoverId(null)}
                        className={`cursor-pointer transition-all ${aperta ? '' : 'hover:!bg-[#EFF6FF] hover:!border-[#BFDBFE] hover:shadow-[0_2px_8px_rgba(37,99,235,0.10)] hover:-translate-y-[1px]'}`}
                        style={{ background: aperta ? '#EFF6FF' : '#fff', border: `1.5px solid ${aperta ? 'transparent' : '#E5E7EB'}`, borderRadius: aperta ? '13px 13px 0 0' : 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: aperta ? 'none' : '0 1px 3px rgba(16,24,40,0.07)', opacity: (r.stato === 'chiusa' || r.stato === 'rifiutata') && !aperta ? 0.82 : 1 }}
                      >
                        {/* ⭐ 19/11 (Davide): sempre l'icona del MEZZO, come nelle pratiche (prima, se passata a demolizione, c'era una spunta verde: lo stato lo dice già la pillola) */}
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IconaVeicolo tipo={r.tipo_mezzo} />
                        </div>

                        {/* Veicolo */}
                        <div style={{ flex: 1.6, minWidth: 0 }}>
                          <div className="text-[15px] font-bold truncate" style={{ color: '#111827' }}>
                            {r.targa || 'Targa mancante'}{r.marca && ` · ${r.marca} ${r.modello || ''}`}{r.anno ? ` · ${r.anno}` : ''}{r.km != null ? ` · ${Number(r.km).toLocaleString('it-IT')} km` : ''}
                          </div>
                          <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                            {/* ⭐ 19/11 (Davide): come nelle pratiche, il comune; se manca, il tipo di mezzo */}
                            {r.comune ? `${r.comune}${r.provincia ? ` (${r.provincia})` : ''}` : (r.tipo_mezzo_altro || r.tipo_mezzo || '—')}
                          </div>
                        </div>

                        {/* Cliente: sotto il nome la casistica, come nelle pratiche (targhe e fermo stanno nella scheda Casistiche) */}
                        <div style={{ flex: 1.3, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                          <div className="text-[13.5px] font-semibold text-gray-900 truncate">{r.nome_richiedente || '—'}</div>
                          <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>
                            {r.casistica ? (NOMI_CASISTICHE[r.casistica] || r.casistica) : (r.tipo_mezzo || '—')}
                          </div>
                        </div>

                        {/* Stato: SOLO la pillola, come nelle pratiche (⭐ 19/11, Davide: via "accettata il…"
                            e "Apri la pratica", così spazi e misure sono quelli della lista pratiche).
                            Quello che è successo si legge nella Cronologia. */}
                        <div style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
                          <span className="inline-block text-[11.5px] font-bold rounded-full transition-colors" style={{ background: evidenzia && m.chiave !== 'rifiutata' ? '#fff' : m.bg, color: m.text, border: `1px solid ${evidenzia && m.chiave !== 'rifiutata' ? `${m.text}55` : 'transparent'}`, padding: '3px 11px' }}>{m.label}</span>
                        </div>

                        {/* ⭐ 19/11 (Davide): la pillola dello stato sta a destra come nelle pratiche;
                            la colonna con "Demolizione gratuita" è tolta, l'offerta la dice già il riquadro */}

                        {/* RIQUADRO A DESTRA, come nelle pratiche (⭐ 07/11, mockup B):
                            prima della risposta i giorni, dopo la cifra offerta */}
                        <MetricaValutazione r={r} />
                      </div>

                      {/* LA TENDINA: si srotola e si riavvolge morbida (grid 0fr↔1fr, come le pratiche) */}
                      <div style={{ display: 'grid', gridTemplateRows: aperta ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
                        <div style={{ overflow: 'hidden' }}>
                          {(aperta || r.id === renderId) && (
                            <Tendina r={r} chiama={chiama} ricarica={ricarica} />
                          )}
                        </div>
                      </div>
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
// I filtri rapidi sotto le tessere (gemelli di quelli delle pratiche)
function ChipFiltro({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full font-medium transition-all ${attivo ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
      {children}
    </button>
  )
}

// Il riquadro a destra della riga (⭐ 07/11, mockup B): giorni da quando è
// arrivata finché non rispondi, poi la cifra offerta (o "Gratis" se hai
// proposto la demolizione gratuita); rifiutate e chiuse: spazio vuoto come
// le pratiche chiuse, così le righe restano allineate
function giorniDa(iso: string): number { return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) }

function MetricaValutazione({ r }: { r: Richiesta }) {
  const giorni = giorniDa(r.creato_il)
  if (r.stato === 'da_valutare') {
    const tardi = giorni >= 2
    return (
      <div style={{ flexShrink: 0, textAlign: 'center', background: tardi ? '#FCEBEB' : '#F3F5F9', borderRadius: 10, padding: '6px 12px', minWidth: 74 }}>
        <div className="text-[14px] font-bold" style={{ color: tardi ? '#A32D2D' : '#374151' }}>{giorni}g</div>
        <div className="text-[10px] font-semibold uppercase" style={{ color: tardi ? '#A32D2D' : '#6B7280' }}>da valutare</div>
      </div>
    )
  }
  if (r.stato === 'risposta_inviata' || r.stato === 'passata_demolizione') {
    const cifra = r.offerta_tipo === 'acquisto' && r.offerta_importo ? euro(r.offerta_importo) : 'Gratis'
    return (
      <div style={{ flexShrink: 0, textAlign: 'center', background: '#EFF6FF', borderRadius: 10, padding: '6px 12px', minWidth: 74 }}>
        <div className="text-[14px] font-bold" style={{ color: '#1D4ED8' }}>{cifra}</div>
        <div className="text-[10px] font-semibold uppercase" style={{ color: '#1D4ED8' }}>offerta</div>
      </div>
    )
  }
  return <div style={{ flexShrink: 0, minWidth: 74 }} />
}

function Tendina({ r, chiama, ricarica }: { r: Richiesta; chiama: (b: Record<string, unknown>) => Promise<unknown>; ricarica: () => Promise<void> }) {
  const pieno = r.stato === 'da_valutare' || r.stato === 'chiusa'
  // ⭐ 19/11 (Davide): le foto si aprono dalla pillola "Documenti e Foto",
  // nel visore, come nelle pratiche (il riquadro "Foto" nella fila è tolto)
  const [triggerDoc, setTriggerDoc] = useState(0)
  const [docAperti, setDocAperti] = useState(false)
  const nFoto = r.foto.length
  return (
    <>
    {/* FILA AZIONI: seconda riga della testata azzurra, come nelle pratiche.
        Per ora una pillola sola; Chat ed Elimina arrivano dopo. */}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#EFF6FF', padding: '0 16px 12px' }}>
      <button
        onClick={() => { if (nFoto > 0) setTriggerDoc(x => x + 1) }}
        disabled={nFoto === 0}
        title={nFoto === 0 ? 'Il cliente non ha caricato foto' : undefined}
        className={`flex items-center gap-1.5 transition-all ${nFoto > 0 ? 'hover:bg-blue-100' : ''}`}
        style={{ position: 'relative', background: docAperti ? '#DBEAFE' : '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap', cursor: nFoto > 0 ? 'pointer' : 'default', opacity: nFoto > 0 ? 1 : 0.6 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        Documenti e Foto
        <span style={{ background: '#EFF6FF', borderRadius: 999, fontSize: 10, padding: '1px 7px' }}>{nFoto}</span>
      </button>
    </div>
    <VisoreDocumenti
      apriTrigger={triggerDoc}
      documenti={[]}
      foto={r.foto.map(x => x.url)}
      targa={r.targa}
      veicolo={[[r.marca, r.modello].filter(Boolean).join(' '), r.anno].filter(Boolean).join(' · ') || null}
      cliente={r.nome_richiedente}
      onStatoAperto={setDocAperti}
    />
    <div style={{ padding: '14px 14px 16px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <SchedaNote key={r.id} r={r} />

        {/* ⭐ 19/11 (Davide, mockup "dati-due-liste"): I DATI NEGLI STESSI POSTI
            della tendina delle pratiche, con le stesse schede (SezTendinaMod),
            gli stessi nomi dei campi e lo stesso ordine: Cliente · Casistiche ·
            Veicolo · Dove si trova. Mancano solo i dati che il cliente dice
            dopo, completando la pratica (libretto, certificato di proprietà,
            delegato, spazio per il carro). Per ora in sola lettura. */}
        <SezTendinaMod soloLettura titolo="Cliente" righe={[
          { k: 'Nome', vista: r.nome_richiedente || '—' },
          { k: 'Telefono', vista: r.telefono || '—' },
          { k: r.casistica === 'societa' || r.casistica === 'societa_fallita' ? 'P.IVA' : 'CF', vista: r.codice_fiscale || '—' },
          { k: 'Email', vista: r.email || '—' },
        ]} />

        <SezTendinaMod soloLettura titolo="Casistiche" righe={[
          { k: 'Casistica', vista: r.casistica ? (NOMI_CASISTICHE[r.casistica] || r.casistica) : '—' },
          { k: 'Fermo Amministrativo', vista: r.fermo_amministrativo ? (FERMO_LABEL[r.fermo_amministrativo] || r.fermo_amministrativo) : '—', pillola: true },
          { k: 'Targhe', vista: etichettaTarghe(r.targhe_presenti), pillola: true },
        ]} />

        <SezTendinaMod soloLettura titolo="Veicolo" righe={[
          { k: 'Targa', vista: r.targa || '—' },
          { k: 'Marca', vista: r.marca || '—' },
          { k: 'Modello', vista: r.modello || '—' },
          { k: 'Anno', vista: r.anno ? String(r.anno) : '—' },
          { k: 'Km', vista: r.km ? Number(r.km).toLocaleString('it-IT') : '—' },
          { k: 'Cambio', vista: etichettaCambio(r.tipo_cambio) },
          { k: 'Alimentazione', vista: nomeAlimentazione(r.alimentazione) },
        ]} extra={
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingTop: 5 }}>
              <PillCondizioni v={r} />
            </div>
            <NotaClienteVeicolo testo={r.note_veicolo} />
          </>
        } />

        <SezTendinaMod soloLettura titolo="Dove si trova" righe={[
          { k: 'Indirizzo', vista: indirizzoRitiroCompleto({ indirizzo_ritiro: r.indirizzo, comune_ritiro: r.comune, provincia_ritiro: r.provincia, cap_ritiro: r.cap }) || '—', multiriga: true },
        ]} />

        {/* ⭐ 19/11 (Davide): quando la richiesta è passata a demolizione la scheda era
            solo un riassunto, e quello lo dice già la Cronologia: non si mostra.
            Negli altri stati resta, perché è lì che si scrive la risposta, la si
            cambia o si chiude la richiesta. */}
        {r.stato !== 'passata_demolizione' && (
          <SchedaRisposta key={`${r.id}-${r.stato}`} r={r} chiama={chiama} ricarica={ricarica} pieno={pieno} />
        )}
      </div>
    </div>
    </>
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

// ⭐ 19/11 (Davide): la scheda "Cronologia e Note" si vede UGUALE a quella delle
// pratiche di demolizione, perché è fatta con gli stessi pezzi (VoceCronologia):
// giorno e ora a sinistra, pillola, dettaglio sotto, e in fondo il campo per
// le note private (tante, ognuna con la sua data; prima era una nota sola con
// la matita). Gli eventi si ricavano dalle date della richiesta; le note stanno
// in `pratiche_note` con `veicolo_vendita_id` (SQL del 19/11).
interface NotaValutazione { id: string; testo: string; creato_il: string }

function SchedaNote({ r }: { r: Richiesta }) {
  const [note, setNote] = useState<NotaValutazione[]>([])
  const [sqlMancante, setSqlMancante] = useState(false)
  const [nuova, setNuova] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    let vivo = true
    supabase.from('pratiche_note').select('id, testo, creato_il').eq('veicolo_vendita_id', r.id).order('creato_il', { ascending: false })
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) setSqlMancante(true)
        else { setSqlMancante(false); setNote((data as NotaValutazione[]) || []) }
      })
    return () => { vivo = false }
  }, [r.id])

  async function aggiungi() {
    const testo = nuova.trim()
    if (!testo) return
    setSalvando(true)
    setErrore('')
    const { data, error } = await supabase.from('pratiche_note').insert({ veicolo_vendita_id: r.id, testo }).select('id, testo, creato_il').single()
    if (!error && data) { setNote(prev => [data as NotaValutazione, ...prev]); setNuova('') }
    else setErrore('Nota non salvata. Riprova.')
    setSalvando(false)
  }

  // tutto in una lista sola, dal più recente; le voci senza data stanno in cima
  // ⭐ 19/11 (Davide): la storia della richiesta, con le pillole di
  // lib/statiValutazione. La frase sotto c'è SOLO dove aggiunge qualcosa: nella
  // proposta di una cifra (quanto, e le due righe scritte al cliente) e nelle
  // note. Le altre pillole dicono già cosa è successo, compresa "Proposta
  // demolizione gratuita" (20/11, Davide: sotto non ci va niente).
  const voci: { chiave: string; quando: string | null; pillola: PillolaCronologia; icona?: React.ReactNode; righe?: string[] }[] =
    note.map(n => ({ chiave: n.id, quando: n.creato_il, pillola: PILLOLA_NOTA_PRIVATA, icona: ICONA_NOTA, righe: [n.testo] }))
  // la nota unica di prima (finché l'SQL del 19/11 non la sposta tra le note)
  if (r.note_admin && r.note_admin.trim()) voci.push({ chiave: 'nota-di-prima', quando: null, pillola: PILLOLA_NOTA_PRIVATA, icona: ICONA_NOTA, righe: [r.note_admin] })
  if (r.offerta_inviata_il) {
    const proposta = voceProposta(r.offerta_tipo, r.offerta_importo)
    const righe = proposta.demolizione ? [] : [proposta.frase]
    if (!proposta.demolizione && r.offerta_messaggio) righe.push(`Scritto al cliente: “${r.offerta_messaggio}”`)
    voci.push({ chiave: 'risposta', quando: r.offerta_inviata_il, pillola: proposta.pillola, righe: righe.length ? righe : undefined })
  }
  if (r.risposta_il) voci.push({ chiave: 'cliente', quando: r.risposta_il, pillola: r.risposta_cliente === 'accettata' ? EVENTI_VALUTAZIONE.val_accettata : EVENTI_VALUTAZIONE.val_rifiutata })
  if (r.stato === 'passata_demolizione') voci.push({ chiave: 'passata', quando: r.aggiornato_il || null, pillola: EVENTI_VALUTAZIONE.val_passata })
  if (r.stato === 'chiusa') voci.push({ chiave: 'chiusa', quando: r.aggiornato_il || null, pillola: EVENTI_VALUTAZIONE.val_chiusa })
  // ⭐ 19/11 (Davide): si legge COME UNA CHAT, la prima cosa in alto e l'ultima in
  // basso, sopra il campo della nota (le voci senza data vanno in fondo); il
  // riquadro scende da solo sull'ultima, come nella cronologia delle pratiche
  voci.sort((x, y) => {
    if (!x.quando && !y.quando) return 0
    if (!x.quando) return 1
    if (!y.quando) return -1
    return new Date(x.quando).getTime() - new Date(y.quando).getTime()
  })
  const fondoRef = useRef<HTMLDivElement>(null)
  const quanteVoci = voci.length
  useEffect(() => {
    const el = fondoRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [quanteVoci])

  return (
    <div style={{ flex: 1.25, minWidth: 250, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>Cronologia e Note</span>
      </div>
      <div className="mt-2">
        <div ref={fondoRef} className="overflow-y-auto" style={{ maxHeight: 150, overscrollBehavior: 'contain' }}>
          {/* la prima voce: la stessa pillola che la pratica mostra in cima alla sua storia */}
          <VoceCronologia quando={r.creato_il} pillola={EVENTI_VALUTAZIONE.val_arrivata} ultima={voci.length === 0} />
          {voci.map((v, i) => (
            <VoceCronologia key={v.chiave} quando={v.quando} pillola={v.pillola} icona={v.icona} ultima={i === voci.length - 1}>
              {v.righe && v.righe.length > 0 && <DettaglioVoce>{v.righe.map((riga, n) => <span key={n} style={{ display: 'block' }}>{riga}</span>)}</DettaglioVoce>}
            </VoceCronologia>
          ))}
        </div>
        {sqlMancante ? (
          <p className="text-xs mt-2" style={{ color: '#854F0B', background: '#FDF7EA', border: '1px solid #F0DFB8', borderRadius: 10, padding: '8px 12px' }}>
            Per scrivere le note esegui su Supabase l&apos;SQL <b>docs/sql/2026-11-19-note-valutazioni.sql</b>
          </p>
        ) : (
          <CampoNota valore={nuova} onValore={setNuova} onInvia={aggiungi} occupato={salvando} placeholder="Scrivi una nota privata…" />
        )}
        {errore && <p className="text-[11.5px] mt-1.5" style={{ color: '#A32D2D' }}>{errore}</p>}
      </div>
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
            {r.risposta_cliente === 'accettata' ? <b style={{ color: '#1F7A43' }}>Il cliente ha accettato {daQuanto(r.risposta_il)}: sta completando la pratica.</b> : 'Il cliente non ha ancora risposto.'}
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

