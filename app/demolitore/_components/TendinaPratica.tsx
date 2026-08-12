'use client'

/**
 * TENDINA DELLA PRATICA — AREA DEMOLITORE (rifatta da capo 07/08 su
 * richiesta di Davide: FOTOCOPIA dello scheletro del CRM admin).
 * Questo componente è SOLO il contenuto che si srotola sotto la riga
 * (la riga stessa fa da testata e vive nella home): fila azioni sulla
 * coda azzurra della testata, poi le 5 schede in fila gemelle di
 * SezTendinaMod (Cronologia e Note · Cliente · Casistiche · Veicolo ·
 * Ritiro), tutte in SOLA LETTURA. La chat si apre A FINESTRELLA fissa
 * in basso a destra, come nel CRM. Azioni per fase con le nuvolette.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { chiamataDemolitore, caricaCertificato, PraticaDemolitore, gruppoDi, CASISTICA_LABEL } from '../_lib/api'
import ChatDemolitore from './ChatDemolitore'
import NoteDemolitore, { prefetchNote } from './NoteDemolitore'
// ⭐ 07/08: LO STESSO visore dell'admin (palco scuro, zoom, PDF sfogliabili,
// Scarica col PDF unico) in variante SOLA LETTURA, senza Approva/Rifiuta
import VisoreDocumenti, { nomeAdmin } from '@/app/components/VisoreDocumenti'

interface FileDoc { url: string; nome?: string; lato?: string }

interface Dettaglio {
  pratica: {
    stato: string
    telefono: string | null
    delegato_nome: string | null
    delegato_telefono: string | null
    casistica: string | null
    libretto: string | null
    certificato_proprieta: string | null
    fermo_amministrativo: string | null
    targhe_presenti: boolean | null
    fee_concordata: number | null
    tipo_cambio: string | null
    cap_ritiro: string | null
    spazio_carro_attrezzi: string | null
    spazio_carro_attrezzi_note: string | null
    note_veicolo: string | null
    incidentato: boolean | null
    marciante: boolean | null
    va_in_moto: boolean | null
    parti_mancanti: boolean | null
    data_ritiro_prevista: string | null
    km: number | null
  }
  foto: string[]
  documenti_approvati: { nome: string; files: FileDoc[] }[]
  da_consegnare: string[]
  /** ⭐ 08/08: LISTA COMPLETA dei documenti per "Originali da consegnare al
      ritiro" — consegna = originale da farsi consegnare, caricato = il
      cliente l'ha già inviato online (sta in Documenti e Foto) */
  documenti_ritiro?: { nome: string; consegna: boolean; caricato: boolean }[]
  /** viaggio sede → ritiro (Google, dal server, con la cache) */
  viaggio?: { km: number; minuti: number } | null
}

// Una voce della lista "Originali da consegnare al ritiro" (usata anche
// dal pannello Fissa il ritiro); nomi già col ruolo casistica dal padre
export function VoceOriginale({ doc }: { doc: { nome: string; consegna: boolean; caricato: boolean } }) {
  return (
    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#374151', lineHeight: 1.35, opacity: doc.consegna ? 1 : 0.85 }}>
      {doc.consegna ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A94A3" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7l1.5-2.5h5L16 7" /></svg>
      )}
      <span>
        {doc.nome}
        {doc.caricato && <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1D4ED8', borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap' }}>Caricato online</span>}
      </span>
    </span>
  )
}

// ⭐ 07/08 (scena globale, mockup approvato): una voce dell'agenda dei
// ritiri già fissati — la nuvoletta "Fissa il ritiro" la usa per i
// numerini sui giorni, le ore spente e la colonna "La tua giornata"
export interface VoceAgendaRitiro {
  id: string
  quando: string
  targa: string | null
  veicolo: string
  comune: string | null
  nome: string | null
  /** impegno personale del demolitore (non una pratica NoiDemoliamo) */
  personale?: boolean
}

const SPAZIO_LABEL: Record<string, string> = { libero: 'Accesso libero', stretto: 'Spazio stretto', no: 'Non passa' }
const LIBRETTO_LABEL: Record<string, string> = { si: "Ha l'originale", denuncia: 'Denuncia di smarrimento', no: 'Da chiarire' }
const CDC_LABEL: Record<string, string> = { digitale: 'Digitale', cartaceo: 'Cartaceo', smarrito: 'Smarrito (denuncia)', documento_unico: 'Documento unico', nessuno: 'Da chiarire' }

type Nuvola = 'fissa' | 'sposta' | 'ritirata' | 'amano' | null

// ⭐ 07/08 (sobbalzo segnalato da Davide): CACHE dei dettagli + PRECARICO
// al passaggio del mouse sulla riga — al clic la tendina si apre già
// piena, con tutti i dati dentro dal primo fotogramma
const cacheDettagli = new Map<string, Dettaglio>()
const prefetchInCorso = new Set<string>()

export async function prefetchPratica(praticaId: string) {
  // Anche la CRONOLOGIA si precarica all'hover (ha la sua cache e il suo
  // guardiano dentro NoteDemolitore): la scheda si apre già piena
  prefetchNote(praticaId)
  if (cacheDettagli.has(praticaId) || prefetchInCorso.has(praticaId)) return
  prefetchInCorso.add(praticaId)
  try {
    const json = await chiamataDemolitore<Dettaglio>('/api/demolitore-pratiche', { pratica_id: praticaId })
    cacheDettagli.set(praticaId, json)
  } catch { /* silenzioso */ }
  prefetchInCorso.delete(praticaId)
}

export default function TendinaPratica({ p, agenda = [], onCambiata }: {
  p: PraticaDemolitore
  /** l'agenda dei ritiri già fissati (tutte le pratiche), per la scena globale */
  agenda?: VoceAgendaRitiro[]
  /** dopo ogni azione: la lista della home si ricarica */
  onCambiata: () => void
}) {
  const gruppo = gruppoDi(p)
  const chiusa = gruppo === 'completate' || gruppo === 'annullate'

  // Parte dalla cache quando c'è (precaricata all'hover): zero sobbalzi
  const [dett, setDett] = useState<Dettaglio | null>(() => cacheDettagli.get(p.id) || null)
  // Visore documenti: la pillola incrementa il trigger (riclic = chiude),
  // `docAperti` serve solo a tenere accesa la pillola
  const [triggerDoc, setTriggerDoc] = useState(0)
  const [docAperti, setDocAperti] = useState(false)
  const [chatAperta, setChatAperta] = useState(false)
  const [nuvola, setNuvola] = useState<Nuvola>(null)
  const [quando, setQuando] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')
  const inputCert = useRef<HTMLInputElement>(null)
  const tipoCert = useRef<'rottamazione' | 'pra'>('rottamazione')
  // ⭐ 08/08 (nuvoletta tagliata, segnalato da Davide): la nuvoletta vive
  // in un PORTALE sul body — il sipario dell'animazione della tendina
  // (overflow nascosto) non può più tagliarla. La posizione si calcola
  // dalla fila delle pillole quando si apre.
  const filaRef = useRef<HTMLDivElement>(null)
  const [posNuvola, setPosNuvola] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    if (!nuvola || !filaRef.current) { setPosNuvola(null); return }
    const rect = filaRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.left + 16, window.innerWidth - 320 - 16))
    setPosNuvola({ top: rect.bottom + 2, left })
  }, [nuvola])

  // ⭐ 08/08 (concept approvato da Davide): Fissa/Sposta il ritiro è un
  // PANNELLO che scivola da destra come Documenti e Foto — chiusura con
  // l'animazione e pagina bloccata dietro finché è aperto
  const pannelloAperto = nuvola === 'fissa' || nuvola === 'sposta'
  const [chiudendoPannello, setChiudendoPannello] = useState(false)
  function chiudiPannello() {
    if (busy || chiudendoPannello) return
    setChiudendoPannello(true)
    setTimeout(() => { setChiudendoPannello(false); setNuvola(null); setErrore('') }, 240)
  }
  useEffect(() => {
    if (!pannelloAperto) return
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [pannelloAperto])

  const carica = useCallback(async () => {
    try {
      const json = await chiamataDemolitore<Dettaglio>('/api/demolitore-pratiche', { pratica_id: p.id })
      cacheDettagli.set(p.id, json)
      setDett(json)
    } catch { /* silenzioso */ }
  }, [p.id])

  useEffect(() => { carica() }, [carica])

  async function azione(nome: string, extra?: Record<string, unknown>) {
    if (busy) return
    setBusy(true)
    setErrore('')
    try {
      await chiamataDemolitore('/api/demolitore-azioni', { pratica_id: p.id, azione: nome, ...extra })
      setNuvola(null)
      setQuando('')
      setMotivo('')
      await carica()
      onCambiata()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    }
    setBusy(false)
  }

  async function certificato(file: File) {
    if (busy) return
    setBusy(true)
    setErrore('')
    try {
      await caricaCertificato(p.id, tipoCert.current, file)
      await carica()
      onCambiata()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore nel caricamento del file')
    }
    setBusy(false)
  }

  const d = dett?.pratica
  const numDocumenti = (dett?.documenti_approvati.length || 0) + (dett?.foto.length || 0)

  // ⭐ 08/08: LISTA COMPLETA per "Originali da consegnare al ritiro"
  // (nomenclatura unica: nomi col ruolo casistica, come admin). Se la
  // cache è vecchia e non ha documenti_ritiro, si ripiega su da_consegnare
  const listaRitiro = (dett?.documenti_ritiro || (dett?.da_consegnare || []).map(n => ({ nome: n, consegna: true, caricato: false })))
    .map(x => ({ ...x, nome: nomeAdmin(x.nome, d?.casistica) }))

  // Indirizzo in DUE righe come nel CRM (via e civico sopra, CAP e comune
  // sotto), reso con white-space pre-line
  const indirizzoDueRighe = (() => {
    const intero = (p.indirizzo_ritiro || '').trim()
    const daCampi = [d?.cap_ritiro, p.comune_ritiro ? `${p.comune_ritiro}${p.provincia_ritiro ? ` (${p.provincia_ritiro})` : ''}` : ''].filter(Boolean).join(' ')
    let taglio = intero.search(/,?\s*\d{5}\b/)
    if (taglio < 0 && p.comune_ritiro) {
      const idx = intero.toLowerCase().indexOf(`, ${p.comune_ritiro.toLowerCase()}`)
      if (idx >= 0) taglio = idx
    }
    let viaCivico: string
    let coda = ''
    if (taglio >= 0) {
      viaCivico = intero.slice(0, taglio).trim().replace(/,$/, '')
      coda = intero.slice(taglio).replace(/^,?\s*/, '')
    } else {
      viaCivico = intero.replace(/,$/, '')
    }
    const comuneGiaDentro = !!p.comune_ritiro && viaCivico.toLowerCase().includes(p.comune_ritiro.toLowerCase())
    const secondaRiga = comuneGiaDentro ? '' : (daCampi || coda)
    const righe = [viaCivico, secondaRiga].filter(Boolean)
    return righe.length ? righe.join('\n') : '—'
  })()

  // Condizioni del veicolo a pillole (stessa lingua della tab Stato)
  const condizioni: { label: string; buona: boolean }[] = []
  if (d) {
    if (d.incidentato !== null) condizioni.push({ label: d.incidentato ? 'Incidentata' : 'Non incidentata', buona: !d.incidentato })
    if (d.marciante !== null) condizioni.push({ label: d.marciante ? 'Marciante' : 'Non marciante', buona: !!d.marciante })
    if (d.va_in_moto !== null) condizioni.push({ label: d.va_in_moto ? 'Va in moto' : 'Non va in moto', buona: !!d.va_in_moto })
    if (d.parti_mancanti !== null) condizioni.push({ label: d.parti_mancanti ? 'Parti mancanti' : 'Completa', buona: !d.parti_mancanti })
  }

  // Il telefono operativo: quello del DELEGATO quando c'è (regola del progetto)
  const telefonoDaChiamare = d?.delegato_nome && d?.delegato_telefono ? d.delegato_telefono : d?.telefono || p.telefono
  const nomeDaChiamare = d?.delegato_nome && d?.delegato_telefono ? `${d.delegato_nome} (delegato)` : (p.nome_richiedente || 'Cliente')

  // ⭐ 08/08 (concept approvato): la card "UTILE MENTRE SEI AL TELEFONO"
  // del pannello Fissa/Sposta — il pannello copre le schede, quindi porta
  // dentro tutto ciò che serve mentre ci si accorda col cliente
  const rigaUtile: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 26, borderBottom: '1px solid #EAEFF5', fontSize: 11 }
  const cardUtile = d ? (
    <div style={{ background: '#fff', border: '1.5px solid #E5E9F0', borderRadius: 13, overflow: 'hidden' }}>
      {/* ⭐ 08/08 (richiesta Davide): si chiama "Informazioni per il ritiro" */}
      <div className="flex items-center" style={{ gap: 7, padding: '9px 12px', background: '#F1F5FA', borderBottom: '1px solid #E5E9F0' }}>
        <span style={{ color: '#2563eb', display: 'flex', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </span>
        <b style={{ fontSize: 11.5, fontWeight: 700, color: '#0F1B33' }}>Informazioni per il ritiro</b>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <div style={rigaUtile}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Chiama</span>
          {telefonoDaChiamare ? (
            <a href={`tel:${telefonoDaChiamare}`} className="inline-flex items-center transition-colors hover:bg-blue-50" style={{ gap: 5, background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              {nomeDaChiamare} · {telefonoDaChiamare}
            </a>
          ) : <span style={{ color: '#6B7280' }}>—</span>}
        </div>
        {condizioni.length > 0 && (
          <div style={{ ...rigaUtile, alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
            <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Condizioni</span>
            <span className="flex flex-wrap justify-end" style={{ gap: 4 }}>
              {condizioni.map(c => (
                <span key={c.label} style={{ fontSize: 9.5, fontWeight: 700, borderRadius: 999, padding: '2px 8px', background: c.buona ? '#EAF3DE' : '#FBDADA', color: c.buona ? '#27500A' : '#9B1C1C', whiteSpace: 'nowrap' }}>{c.label}</span>
              ))}
            </span>
          </div>
        )}
        {d.spazio_carro_attrezzi && (
          <div style={rigaUtile}>
            <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Spazio carro</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, borderRadius: 999, padding: '2px 8px', background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1D4ED8', whiteSpace: 'nowrap' }}>{SPAZIO_LABEL[d.spazio_carro_attrezzi] || d.spazio_carro_attrezzi}</span>
          </div>
        )}
        {d.casistica && (
          <div style={rigaUtile}>
            <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Casistica</span>
            <span style={{ color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CASISTICA_LABEL[d.casistica] || d.casistica}</span>
          </div>
        )}
        {listaRitiro.length > 0 && (
          <>
            <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 11, padding: '6px 0 4px' }}>Originali da consegnare al ritiro</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {listaRitiro.map((doc, i) => <VoceOriginale key={i} doc={doc} />)}
            </div>
            <p style={{ fontSize: 9, color: '#9AA7B5', lineHeight: 1.5, marginTop: 6, paddingTop: 6, borderTop: '1px solid #EAEFF5' }}>Spunta blu = fatti consegnare l&apos;originale · &quot;Caricato online&quot; = ce l&apos;hai in Documenti e Foto</p>
          </>
        )}
      </div>
    </div>
  ) : null

  return (
    <>
      {/* ===== FILA AZIONI: seconda riga della testata azzurra (come il CRM) ===== */}
      <div className="relative" ref={filaRef}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#EFF6FF', padding: '0 16px 12px' }}>

          {/* ⭐ 07/08 (richiesta Davide): ordine fisso della fila —
              Documenti e Foto · Chat · azione della fase */}
          <PillolaAzione attiva={docAperti} onClick={() => { if (dett) setTriggerDoc(t => t + 1) }}
            icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}>
            Documenti e Foto
            <span style={{ background: '#EFF6FF', borderRadius: 999, fontSize: 10, padding: '1px 7px' }}>{dett ? numDocumenti : '…'}</span>
          </PillolaAzione>

          <PillolaAzione attiva={chatAperta} spia={(p.non_letti || 0) > 0} onClick={() => setChatAperta(x => !x)}
            icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>}>
            Chat
          </PillolaAzione>

          {gruppo === 'arrivo' && (
            <PillolaAzione grassetto onClick={() => { setNuvola(nuvola === 'fissa' ? null : 'fissa'); setQuando(''); setErrore('') }}
              icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}>
              Fissa il ritiro
            </PillolaAzione>
          )}
          {gruppo === 'fissato' && (
            <>
              <PillolaAzione grassetto onClick={() => { setNuvola(nuvola === 'ritirata' ? null : 'ritirata'); setErrore('') }}
                icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}>
                Veicolo ritirato
              </PillolaAzione>
              <PillolaAzione onClick={() => { setNuvola(nuvola === 'sposta' ? null : 'sposta'); setQuando(''); setMotivo(''); setErrore('') }}
                icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}>
                Sposta il ritiro
              </PillolaAzione>
            </>
          )}
          {gruppo === 'rottamazione' && (
            <>
              <PillolaAzione grassetto onClick={() => { tipoCert.current = 'rottamazione'; inputCert.current?.click() }}
                icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}>
                {busy ? 'Carico…' : 'Carica certificato rottamazione'}
              </PillolaAzione>
              <PillolaAzione onClick={() => { setNuvola(nuvola === 'amano' ? null : 'amano'); setErrore('') }}
                icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}>
                Consegnato a mano al ritiro
              </PillolaAzione>
            </>
          )}
          {gruppo === 'targhe' && (
            <PillolaAzione grassetto onClick={() => { tipoCert.current = 'pra'; inputCert.current?.click() }}
              icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}>
              {busy ? 'Carico…' : 'Carica cancellazione targhe'}
            </PillolaAzione>
          )}

          {/* ⭐ Trattativa: quando l'admin ha impostato l'importo, il
              demolitore vede la pillola con la cifra */}
          {/* ⭐ 12/08 (richiesta Davide): niente simbolo, solo testo e importo */}
          {d?.fee_concordata != null && (
            <span style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>
              Trattativa · {d.fee_concordata}€
            </span>
          )}

          {errore && !nuvola && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 bg-white" style={{ border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{errore}</span>
          )}
        </div>

        {/* input nascosto per i certificati (PDF o foto) */}
        <input ref={inputCert} type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) certificato(f); e.target.value = '' }} />

        {/* ===== NUVOLETTE ancorate alla fila (regola 20) — nel PORTALE sul
            body, così il sipario dell'animazione della tendina non le
            taglia; se lo schermo è basso scorrono al loro interno ===== */}
        {nuvola && posNuvola && createPortal(
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: pannelloAperto ? 'rgba(15,23,42,0.10)' : 'transparent' }} onClick={() => { if (!busy) { if (pannelloAperto) chiudiPannello(); else { setNuvola(null); setErrore('') } } }} />

            {pannelloAperto ? (
              /* ⭐ 08/08 (concept approvato): PANNELLO da destra a tutta
                  altezza come Documenti e Foto — testata azzurra col viaggio,
                  scena globale + card "Utile mentre sei al telefono", piede
                  a barra. Entra ed esce scivolando (regola 6.7) */
              <div className="fixed top-0 right-0 bottom-0 bg-white flex flex-col overflow-hidden" style={{ width: 'min(900px, calc(100vw - 230px))', minWidth: 'min(100vw, 560px)', borderLeft: '1.5px solid #E5E7EB', boxShadow: '-18px 0 44px rgba(15,23,42,0.22)', animation: 'pannello-ritiro .24s ease', transition: 'transform .24s ease', transform: chiudendoPannello ? 'translateX(105%)' : undefined, zIndex: 56 }}>
                <style>{'@keyframes pannello-ritiro{from{transform:translateX(105%)}to{transform:none}}'}</style>

                {/* Testata gemella del visore: icona, titolo, veicolo e la
                    pillola del VIAGGIO (km · minuti dal server) */}
                <div className="flex items-center" style={{ gap: 12, padding: '10px 16px', background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', flexShrink: 0 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: '#DBEAFE', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1D4ED8', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nuvola === 'fissa' ? 'Fissa il ritiro' : 'Sposta il ritiro'}</b>
                    <span style={{ display: 'block', fontSize: 11.5, color: '#4B5563', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[p.targa, [p.marca, p.modello].filter(Boolean).join(' '), p.indirizzo_ritiro || p.comune_ritiro].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span style={{ flex: 1 }} />
                  {/* ⭐ 08/08 (richiesta Davide): solo testo, niente icona */}
                  {dett?.viaggio && (
                    <span className="flex-shrink-0" style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 14px', whiteSpace: 'nowrap' }}>
                      {dett.viaggio.km} km · circa {dett.viaggio.minuti} min
                    </span>
                  )}
                  <button onClick={chiudiPannello} className="text-gray-400 hover:text-gray-700 flex-shrink-0" style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                {/* Corpo scorrevole: picker con a fianco giornata + card utile.
                    ⭐ Sfondo GRIGIO delle aree di lavoro (richiesta Davide):
                    le card bianche staccano come nel CRM */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 16px', background: '#ECEEF2' }}>
                  {/* key={nuvola}: il picker riparte pulito a ogni apertura */}
                  <PickerRitiro
                    key={nuvola}
                    agenda={agenda.filter(v => v.id !== p.id)}
                    nuovoTarga={p.targa}
                    nuovoNome={p.nome_richiedente}
                    nuovoComune={p.comune_ritiro}
                    latoExtra={cardUtile}
                    pannello
                    onScelta={iso => setQuando(iso || '')}
                  />
                  {nuvola === 'sposta' && (
                    <div style={{ marginTop: 13 }}>
                      <SezTesta label="Motivo dello spostamento" icona={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>} />
                      <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Scrivi il motivo (obbligatorio): resta nella cronologia che vede NoiDemoliamo"
                        rows={2} className="w-full text-base sm:text-[12.5px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-300 transition-colors" style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', resize: 'none' }} />
                    </div>
                  )}
                  {errore && (
                    <div className="text-[11.5px] font-semibold mt-2" style={{ color: '#9B1C1C' }}>{errore}</div>
                  )}
                </div>

                {/* Piede a barra: la nota (o il riepilogo blu a scelta
                    completa) a sinistra, Annulla e Conferma a destra */}
                <div className="flex items-center flex-shrink-0" style={{ gap: 10, padding: '11px 16px', borderTop: '1px solid #EEF1F5', background: '#FCFDFE' }}>
                  {quando ? (
                    <span className="flex items-center" style={{ gap: 7, fontSize: 12, fontWeight: 700, color: '#1D4ED8', minWidth: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      <span className="truncate">Ritiro {fraseQuando(quando)}</span>
                    </span>
                  ) : (
                    /* ⭐ 08/08 (richiesta Davide): via il "la data vale subito" */
                    <span style={{ fontSize: 10, color: '#9AA7B5', lineHeight: 1.4, minWidth: 0 }}>Chiama prima il cliente per accordarvi:<br />vedrà la data nella sua area.</span>
                  )}
                  <button onClick={chiudiPannello} disabled={busy} className="ml-auto flex-shrink-0 transition-colors hover:bg-gray-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>Annulla</button>
                  <button
                    disabled={busy || !quando || (nuvola === 'sposta' && !motivo.trim())}
                    onClick={() => {
                      if (nuvola === 'fissa') azione('fissa_ritiro', { quando })
                      else azione('fissa_ritiro', { quando, motivo })
                    }}
                    className="flex-shrink-0 transition-all hover:brightness-105 disabled:opacity-60"
                    style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '7px 16px', cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.3)' }}
                  >
                    {busy ? 'Un attimo…' : 'Conferma'}
                  </button>
                </div>
              </div>
            ) : (
                /* Nuvolette piccole (ritirata / consegnato a mano), ancorate
                   alla fila delle pillole come sempre */
                <div className="bg-white" style={{ position: 'fixed', top: posNuvola.top, left: posNuvola.left, width: 320, maxWidth: 'calc(100vw - 16px)', maxHeight: `calc(100vh - ${posNuvola.top + 12}px)`, overflowY: 'auto', overscrollBehavior: 'contain', border: '1.5px solid #DBEAFE', borderRadius: 16, boxShadow: '0 18px 44px rgba(15,23,42,0.20)', padding: 14, zIndex: 56 }}>
                  {nuvola === 'ritirata' && (
                    <div className="text-[13px] text-gray-900" style={{ lineHeight: 1.5 }}>
                      Confermi di aver <b>ritirato il veicolo</b> e gli originali del cliente?
                    </div>
                  )}

                  {nuvola === 'amano' && (
                    <div className="text-[13px] text-gray-900" style={{ lineHeight: 1.5 }}>
                      Confermi di aver <b>consegnato a mano</b> il certificato di rottamazione al ritiro? La pratica passa all&apos;attesa della cancellazione targhe.
                    </div>
                  )}

                  {errore && (
                    <div className="text-[11.5px] font-semibold mt-2" style={{ color: '#9B1C1C' }}>{errore}</div>
                  )}

                  <div className="flex gap-2 justify-end mt-3">
                    <button onClick={() => { setNuvola(null); setErrore('') }} disabled={busy} className="transition-colors hover:bg-gray-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 13px', cursor: 'pointer' }}>Annulla</button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (nuvola === 'ritirata') azione('segna_ritirata')
                        else if (nuvola === 'amano') azione('rottamazione_a_mano')
                      }}
                      className="transition-all hover:brightness-105 disabled:opacity-60"
                      style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 15px', cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.3)' }}
                    >
                      {busy ? 'Un attimo…' : 'Conferma'}
                    </button>
                  </div>
                </div>
              )}
          </>,
          document.body,
        )}
      </div>

      {/* ===== LE 5 SCHEDE IN FILA (stesso contenitore del CRM).
          ⭐ 07/08 (richiesta Davide): TUTTE ALLA STESSA ALTEZZA — le schede
          si stirano fino alla più alta, la fila resta pari ===== */}
      <div style={{ padding: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>

        {/* CRONOLOGIA E NOTE: prima scheda, gemella di quella del CRM.
            ⭐ 07/08 (scatto segnalato da Davide): ALTEZZA FISSA — dà la
            misura a tutta la fila fin dal primo fotogramma, così i dati
            che arrivano un attimo dopo riempiono uno spazio già riservato
            e l'apertura resta morbida fino in fondo */}
        <div style={{ flex: 1.25, minWidth: 250, height: 300, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>Cronologia e Note</span>
          </div>
          <NoteDemolitore praticaId={p.id} bloccata={chiusa} />
        </div>

        <SchedaSolaLettura
          titolo="Cliente"
          righe={[
            { k: 'Nome', vista: p.nome_richiedente || '—' },
            { k: 'Telefono', vista: d?.telefono || p.telefono || '—' },
            // Stessa logica del CRM: per le casistiche senza delega la pillola
            // dice "Nessun delegato" (corta e leggibile)
            { k: 'Delegato per la consegna', vista: d?.casistica === 'non_intestatario' || d?.casistica === 'targhe_straniere' ? 'Nessun delegato' : (d?.delegato_nome || 'Consegna in prima persona'), pillola: true },
            ...(d?.delegato_nome ? [{ k: 'Tel. delegato', vista: d.delegato_telefono || '—', pillola: true }] : []),
          ]}
          extra={telefonoDaChiamare && !chiusa ? (
            <div className="flex items-center justify-between gap-2" style={{ paddingTop: 8 }}>
              <span className="text-[10px]" style={{ color: '#8B95A5', lineHeight: 1.4 }}>
                {d?.delegato_nome ? 'C’è un delegato: fai riferimento a LUI.' : 'Per accordarti sul ritiro.'}
              </span>
              <a href={`tel:${telefonoDaChiamare.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 flex-shrink-0 transition-colors hover:bg-blue-50" style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '3px 10px', textDecoration: 'none' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Chiama
              </a>
            </div>
          ) : undefined}
        />

        <SchedaSolaLettura
          titolo="Casistiche"
          righe={[
            { k: 'Casistica', vista: d?.casistica ? (CASISTICA_LABEL[d.casistica] || d.casistica) : '—' },
            { k: 'Libretto', vista: d?.libretto ? (LIBRETTO_LABEL[d.libretto] || d.libretto) : '—' },
            { k: 'Cert. proprietà', vista: d?.certificato_proprieta ? (CDC_LABEL[d.certificato_proprieta] || d.certificato_proprieta) : '—' },
            { k: 'Fermo Amministrativo', vista: d?.fermo_amministrativo === 'si' ? 'Sì' : d?.fermo_amministrativo === 'no' ? 'No' : '—', pillola: true },
            { k: 'Targhe', vista: d?.targhe_presenti == null ? '—' : d.targhe_presenti ? 'Presenti sul mezzo' : 'Smarrite', pillola: true },
          ]}
        />

        <SchedaSolaLettura
          titolo="Veicolo"
          righe={[
            { k: 'Targa', vista: p.targa || '—' },
            { k: 'Marca', vista: p.marca || '—' },
            { k: 'Modello', vista: p.modello || '—' },
            { k: 'Anno', vista: p.anno != null ? String(p.anno) : '—' },
            { k: 'Km', vista: (d?.km ?? p.km) != null ? (d?.km ?? p.km)!.toLocaleString('it-IT') : '—' },
            { k: 'Cambio', vista: d?.tipo_cambio === 'manuale' ? 'Manuale' : d?.tipo_cambio === 'automatico' ? 'Automatico' : '—' },
          ]}
          extra={(condizioni.length > 0 || d?.note_veicolo) ? (
            <div style={{ paddingTop: 8 }}>
              {condizioni.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {condizioni.map((c, i) => (
                    <span key={i} style={{ fontSize: 9.5, fontWeight: 600, padding: '2.5px 9px', borderRadius: 999, background: c.buona ? '#EAF3DE' : '#FBE2E2', color: c.buona ? '#27500A' : '#9B1C1C', whiteSpace: 'nowrap' }}>{c.label}</span>
                  ))}
                </div>
              )}
              {d?.note_veicolo && (
                <div style={{ marginTop: 8, background: '#F8FAFC', border: '1px solid #F1F3F6', borderRadius: 10, padding: '7px 10px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Note del cliente</div>
                  <div style={{ fontSize: 11, color: '#4B5563', fontStyle: 'italic', lineHeight: 1.5 }}>{d.note_veicolo}</div>
                </div>
              )}
            </div>
          ) : undefined}
        />

        <SchedaSolaLettura
          titolo="Ritiro"
          righe={[
            { k: 'Indirizzo', vista: indirizzoDueRighe, multiriga: true },
            { k: 'Data del ritiro', vista: d?.data_ritiro_prevista ? new Date(d.data_ritiro_prevista).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Da fissare', pillola: !d?.data_ritiro_prevista },
            { k: 'Spazio carro', vista: d?.spazio_carro_attrezzi ? (SPAZIO_LABEL[d.spazio_carro_attrezzi] || d.spazio_carro_attrezzi) : '—', pillola: true },
          ]}
          extra={
            <>
              {d?.spazio_carro_attrezzi_note && (
                <div style={{ marginTop: 8, background: '#F8FAFC', border: '1px solid #F1F3F6', borderRadius: 10, padding: '7px 10px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Nota sullo spazio</div>
                  <div style={{ fontSize: 11, color: '#4B5563', fontStyle: 'italic', lineHeight: 1.5 }}>{d.spazio_carro_attrezzi_note}</div>
                </div>
              )}
              {listaRitiro.length > 0 && (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Originali da consegnare al ritiro</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {listaRitiro.map((doc, i) => <VoceOriginale key={i} doc={doc} />)}
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* ===== VISORE DOCUMENTI E FOTO: lo stesso pannello del CRM che
          scivola da destra, in SOLA LETTURA (niente Approva/Rifiuta).
          I nomi dei documenti parlano col RUOLO della casistica, come
          li vede l'admin ===== */}
      {dett && (
        <VisoreDocumenti
          apriTrigger={triggerDoc}
          documenti={dett.documenti_approvati.map(doc => ({ titolo: nomeAdmin(doc.nome, d?.casistica), files: doc.files }))}
          foto={dett.foto}
          targa={p.targa}
          veicolo={[[p.marca, p.modello].filter(Boolean).join(' '), p.anno].filter(Boolean).join(' · ') || null}
          cliente={p.nome_richiedente}
          onStatoAperto={setDocAperti}
        />
      )}

      {/* ===== CHAT A FINESTRELLA fissa in basso a destra (come il CRM) ===== */}
      {chatAperta && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', alignItems: 'flex-end', zIndex: 50 }}>
          <ChatDemolitore
            praticaId={p.id}
            bloccata={chiusa}
            finestra
            titolo={`${p.nome_richiedente || 'Cliente'} · ${p.targa || 'senza targa'}`}
            onChiudi={() => setChatAperta(false)}
          />
        </div>
      )}
    </>
  )
}

// ============================================================
// PICKER DEL RITIRO CON LA SCENA GLOBALE (07-08/08, veste B approvata):
// niente campo coi trattini — GIORNO a pillole (7 giorni col numerino
// dei ritiri già fissati + "Altro giorno…" che srotola il calendarietto
// con le CELLE CHE SI SCALDANO di celeste col carico, variante C), ORE
// ordinate in MATTINA e POMERIGGIO (le già prese sono sbarrate), e a
// destra "La tua giornata" come card vera: i ritiri in agenda del giorno
// scelto, col NUOVO che entra al suo posto appena scegli l'ora.
// Il calendarietto RESTA APERTO scegliendo un giorno: si sfoglia
// l'agenda e la giornata a destra si aggiorna.
// ============================================================

const ORE_MATTINA = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']
const ORE_POMERIGGIO = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']
const GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function chiaveGiorno(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function oraLocale(iso: string) { return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }

// "ven 14 agosto, ore 10:00" — per il riepilogo nel piede della nuvoletta
export function fraseQuando(iso: string): string {
  const d = new Date(iso)
  return `${GIORNI_BREVI[d.getDay()]} ${d.getDate()} ${MESI_LUNGHI[d.getMonth()]}, ore ${oraLocale(iso)}`
}

// La cella del calendario si SCALDA di celeste col carico (variante C
// approvata da Davide: "fa vedere subito dove ci sono i buchi")
function tintaCarico(n: number): { bg: string; testo: string } | null {
  if (n <= 0) return null
  if (n >= 10) return { bg: '#A5C8F5', testo: '#0E2F73' }
  if (n >= 7) return { bg: '#BFD8F9', testo: '#123B8F' }
  if (n >= 4) return { bg: '#D4E5FB', testo: '#1E3A8A' }
  if (n >= 2) return { bg: '#E5EFFD', testo: '#374151' }
  return { bg: '#F3F8FF', testo: '#374151' }
}

// Testata di sezione della nuvoletta: iconcina blu + etichetta + filo
// (esportata: la usa anche la nuvoletta "Aggiungi impegno" dei Ritiri)
export function SezTesta({ icona, label }: { icona: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 7, marginBottom: 7 }}>
      <span style={{ color: '#2563eb', display: 'flex', flexShrink: 0 }}>{icona}</span>
      <b style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.7, color: '#5B6779', textTransform: 'uppercase' }}>{label}</b>
      <span style={{ flex: 1, height: 1, background: '#EEF1F5' }} />
    </div>
  )
}

export function PickerRitiro({ agenda, nuovoTarga = null, nuovoNome = null, nuovoComune = null, senzaGiornata, latoExtra, pannello, onScelta }: {
  /** i ritiri già fissati delle ALTRE pratiche (la propria è esclusa dal padre) */
  agenda: VoceAgendaRitiro[]
  nuovoTarga?: string | null
  nuovoNome?: string | null
  nuovoComune?: string | null
  /** solo la colonna della scelta, senza "La tua giornata" (nuvoletta impegni) */
  senzaGiornata?: boolean
  /** card in più sotto "La tua giornata" (es. "Informazioni per il ritiro") */
  latoExtra?: React.ReactNode
  /** ⭐ layout PANNELLO (Fissa/Sposta): calendario protagonista sempre
      aperto + ore a SLOT PARLANTI (gli occupati dicono cosa c'è) */
  pannello?: boolean
  onScelta: (iso: string | null) => void
}) {
  const oggi = new Date()
  const [giorno, setGiorno] = useState<Date | null>(null)
  const [ora, setOra] = useState<string | null>(null)
  const [calAperto, setCalAperto] = useState(false)
  const [meseVista, setMeseVista] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1))

  const traGiorni = (n: number) => { const d = new Date(oggi); d.setDate(oggi.getDate() + n); return d }
  const delGiorno = (d: Date) => agenda
    .filter(v => chiaveGiorno(new Date(v.quando)) === chiaveGiorno(d))
    .sort((a, b) => a.quando.localeCompare(b.quando))

  function etichettaGiorno(d: Date) {
    if (chiaveGiorno(d) === chiaveGiorno(oggi)) return 'Oggi'
    if (chiaveGiorno(d) === chiaveGiorno(traGiorni(1))) return 'Domani'
    return `${GIORNI_BREVI[d.getDay()]} ${d.getDate()}`
  }

  function scegli(d: Date | null, o: string | null) {
    setGiorno(d)
    setOra(o)
    if (d && o) {
      const [hh, mm] = o.split(':').map(Number)
      onScelta(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm).toISOString())
    } else {
      onScelta(null)
    }
  }

  // Il giorno scelto è "lontano" se non sta tra le 7 pillole
  const traSette = giorno && Array.from({ length: 7 }, (_, i) => chiaveGiorno(traGiorni(i))).includes(chiaveGiorno(giorno))
  const giornoLontano = giorno && !traSette ? giorno : null

  // ⭐ 08/08 (sobbalzo segnalato da Davide): la griglia del calendarietto è
  // SEMPRE di 6 righe (42 celle) — cambiando mese l'altezza non cambia mai
  const vuoteCal = (new Date(meseVista.getFullYear(), meseVista.getMonth(), 1).getDay() + 6) % 7
  const giorniNelMese = new Date(meseVista.getFullYear(), meseVista.getMonth() + 1, 0).getDate()
  const codaCal = 42 - vuoteCal - giorniNelMese

  // Le ore del giorno scelto: già prese dall'agenda o già passate (oggi)
  const orePrese = giorno ? delGiorno(giorno).map(v => oraLocale(v.quando)) : []
  function oraSpenta(o: string): string | null {
    if (!giorno) return null
    if (orePrese.includes(o)) return `Hai già un ritiro alle ${o}`
    if (chiaveGiorno(giorno) === chiaveGiorno(oggi)) {
      const [hh, mm] = o.split(':').map(Number)
      if (new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), hh, mm) <= new Date()) return 'Ora già passata'
    }
    return null
  }

  // La giornata scelta: i ritiri in agenda + il NUOVO al posto giusto
  const vociGiornata = giorno
    ? [
        ...delGiorno(giorno).map(v => ({ ora: oraLocale(v.quando), targa: v.targa, nome: v.nome, comune: v.comune, veicolo: v.veicolo, nuovo: false, personale: !!v.personale })),
        ...(ora ? [{ ora, targa: nuovoTarga, nome: nuovoNome, comune: nuovoComune, veicolo: '', nuovo: true, personale: false }] : []),
      ].sort((a, b) => a.ora.localeCompare(b.ora))
    : []

  const stileChip = (sel: boolean, spenta?: boolean): React.CSSProperties => ({
    position: 'relative',
    background: sel ? '#2563eb' : '#fff',
    border: `1.5px ${spenta ? 'dashed' : 'solid'} ${sel ? '#2563eb' : '#E5E7EB'}`,
    color: sel ? '#fff' : spenta ? '#C2CAD6' : '#374151',
    fontSize: 11.5, fontWeight: 600, borderRadius: 11, padding: '6px 10px',
    cursor: spenta ? 'default' : 'pointer', transition: 'all .15s',
    boxShadow: sel ? '0 3px 8px rgba(37,99,235,0.25)' : 'none',
  })

  // Un gruppetto di ore con l'etichetta laterale (MATT. / POM.)
  const gruppoOre = (etichetta: string, ore: string[]) => (
    <div className="flex items-start" style={{ gap: 9, marginBottom: 6 }}>
      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.5, color: '#9AA7B5', textTransform: 'uppercase', width: 34, flexShrink: 0, paddingTop: 8, textAlign: 'right' }}>{etichetta}</span>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {ore.map(o => {
          const spentaPerche = oraSpenta(o)
          const sel = ora === o
          return (
            <button
              key={o}
              type="button"
              title={spentaPerche || undefined}
              onClick={spentaPerche ? undefined : () => scegli(giorno, o)}
              className={sel || spentaPerche ? '' : 'hover:!border-blue-300 hover:!text-blue-700'}
              style={{ ...stileChip(sel, !!spentaPerche), minWidth: 52, textAlign: 'center', fontVariantNumeric: 'tabular-nums', textDecoration: spentaPerche ? 'line-through' : 'none', textDecorationColor: '#D8DEE7' }}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ⭐ SLOT PARLANTI del pannello: colonna verticale di orari dove gli
  // occupati DICONO COSA C'È ("CK456ZY · Milano") e lo slot scelto dice
  // "il tuo nuovo ritiro" — l'agenda della giornata è dentro la scelta
  const slotOre = (etichetta: string, ore: string[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.5, color: '#9AA7B5', textTransform: 'uppercase', marginBottom: 5 }}>{etichetta}</div>
      {ore.map(o => {
        const occupatoDa = giorno ? delGiorno(giorno).find(v => oraLocale(v.quando) === o) : undefined
        const spentaPerche = oraSpenta(o)
        const sel = ora === o
        return (
          <button
            key={o}
            type="button"
            title={spentaPerche || undefined}
            onClick={spentaPerche ? undefined : () => scegli(giorno, o)}
            className={sel || spentaPerche ? '' : 'hover:!border-blue-300'}
            // ⭐ 08/08 (richiesta Davide): righe SOTTILI — la pillola non deve
            // essere più grande del suo contenuto
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
              border: `1.5px ${spentaPerche ? 'dashed' : 'solid'} ${sel ? '#2563eb' : '#E5E7EB'}`,
              background: sel ? '#2563eb' : spentaPerche ? '#F6F8FB' : '#fff',
              borderRadius: 9, padding: '3px 9px', marginBottom: 4,
              cursor: spentaPerche ? 'default' : 'pointer',
              boxShadow: sel ? '0 3px 8px rgba(37,99,235,0.25)' : 'none', transition: 'all .13s',
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 700, color: sel ? '#fff' : spentaPerche ? '#C2CAD6' : '#1E293B', fontVariantNumeric: 'tabular-nums', width: 38, flexShrink: 0, lineHeight: 1.6, textDecoration: occupatoDa ? 'line-through' : 'none', textDecorationColor: '#D8DEE7' }}>{o}</span>
            <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: occupatoDa ? 600 : 400, color: sel ? 'rgba(255,255,255,0.85)' : occupatoDa ? '#8A94A3' : '#C6CDD8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {occupatoDa
                ? [occupatoDa.targa || occupatoDa.veicolo, occupatoDa.comune].filter(Boolean).join(' · ')
                : sel ? 'il tuo nuovo ritiro' : spentaPerche === 'Ora già passata' ? 'passata' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="flex gap-4 flex-wrap">
      {/* ===== Colonna della scelta ===== */}
      <div style={{ flex: 1.25, minWidth: 250 }}>
        <SezTesta label="Giorno" icona={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
        {/* Nel PANNELLO niente fila dei giorni: il calendario è protagonista */}
        {!pannello && (
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => traGiorni(i)).map(d => {
            const sel = !!giorno && chiaveGiorno(d) === chiaveGiorno(giorno)
            const eOggi = chiaveGiorno(d) === chiaveGiorno(oggi)
            const n = delGiorno(d).length
            return (
              <button
                key={chiaveGiorno(d)}
                type="button"
                onClick={() => { setCalAperto(false); scegli(d, null) }}
                className={sel ? '' : 'hover:!border-blue-300 hover:!text-blue-700'}
                // ⭐ 08/08 (richiesta Davide): "Oggi" veste il celeste chiaro
                // di casa (non selezionata), così il demolitore si orienta
                style={{ ...stileChip(sel), ...(eOggi && !sel ? { background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8' } : {}), textAlign: 'center', minWidth: 54, padding: '6px 9px' }}
              >
                {etichettaGiorno(d)}
                <span style={{ display: 'block', fontSize: 8.5, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 }}>{d.getDate()} {MESI_LUNGHI[d.getMonth()].slice(0, 3)}</span>
                {n > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -4, background: sel ? '#fff' : '#1D4ED8', color: sel ? '#1D4ED8' : '#fff', fontSize: 8.5, fontWeight: 800, minWidth: 14, height: 14, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${sel ? '#2563eb' : '#fff'}`, padding: '0 3px' }}>{n}</span>
                )}
              </button>
            )
          })}
          {/* "Altro giorno…": tratteggiata, apre il calendarietto; scelto un
              giorno lontano si accende con la data (come una pillola vera) */}
          <button
            type="button"
            onClick={() => setCalAperto(x => !x)}
            style={{ ...stileChip(!!giornoLontano), borderStyle: giornoLontano ? 'solid' : 'dashed', color: giornoLontano ? '#fff' : '#1D4ED8', textAlign: 'center', minWidth: 54, padding: '6px 9px' }}
          >
            {giornoLontano ? `${GIORNI_BREVI[giornoLontano.getDay()]} ${giornoLontano.getDate()}` : 'Altro giorno…'}
            <span style={{ display: 'block', fontSize: 8.5, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 }}>
              {giornoLontano ? `${giornoLontano.getDate()} ${MESI_LUNGHI[giornoLontano.getMonth()].slice(0, 3)}` : 'calendario'}
            </span>
          </button>
        </div>
        )}

        {/* Calendarietto: nel PANNELLO è SEMPRE aperto (protagonista);
            nella nuvoletta si srotola morbido da "Altro giorno…". Le celle
            si SCALDANO col carico e il numerino dice quanti impegni */}
        <div style={pannello ? undefined : { display: 'grid', gridTemplateRows: calAperto ? '1fr' : '0fr', transition: 'grid-template-rows .22s ease' }}>
          <div style={pannello ? undefined : { overflow: 'hidden' }}>
            <div style={{ background: '#fff', border: '1.5px solid #E5E9F0', borderRadius: 13, padding: '10px 12px 12px', marginTop: 8 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  disabled={meseVista.getFullYear() === oggi.getFullYear() && meseVista.getMonth() === oggi.getMonth()}
                  onClick={() => setMeseVista(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  style={{ width: 26, height: 26, borderRadius: 999, border: '1.5px solid #DBEAFE', background: '#fff', color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  className="disabled:!text-gray-300 disabled:!border-gray-200 disabled:cursor-default"
                  aria-label="Mese precedente"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <b style={{ fontSize: 12.5, color: '#0F1B33', textTransform: 'capitalize' }}>{MESI_LUNGHI[meseVista.getMonth()]} {meseVista.getFullYear()}</b>
                <button
                  type="button"
                  onClick={() => setMeseVista(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  style={{ width: 26, height: 26, borderRadius: 999, border: '1.5px solid #DBEAFE', background: '#fff', color: '#1D4ED8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Mese successivo"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map(g => (
                  <div key={g} style={{ fontSize: 9, fontWeight: 800, color: '#9AA7B5', textAlign: 'center', padding: '3px 0 6px', textTransform: 'uppercase' }}>{g}</div>
                ))}
                {Array.from({ length: vuoteCal }, (_, i) => <div key={`v${i}`} />)}
                {Array.from({ length: giorniNelMese }, (_, i) => {
                  const d = new Date(meseVista.getFullYear(), meseVista.getMonth(), i + 1)
                  const passato = d < new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
                  const sel = !!giorno && chiaveGiorno(d) === chiaveGiorno(giorno)
                  const n = passato ? 0 : delGiorno(d).length
                  const tinta = tintaCarico(n)
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={passato}
                      // ⭐ Il calendario RESTA aperto scegliendo un giorno: si
                      // sfoglia l'agenda e la giornata a destra si aggiorna
                      onClick={() => scegli(d, null)}
                      title={n > 0 ? `${n} ${n === 1 ? 'impegno' : 'impegni'} in agenda` : undefined}
                      className={passato || sel || tinta ? '' : 'hover:!bg-[#EFF6FF] hover:!text-blue-700'}
                      style={{
                        position: 'relative', border: 'none', borderRadius: 10, padding: '6px 0 15px',
                        fontSize: 11.5, fontWeight: sel || n >= 7 ? 700 : 600, fontVariantNumeric: 'tabular-nums',
                        background: sel ? '#2563eb' : tinta ? tinta.bg : 'none',
                        color: sel ? '#fff' : passato ? '#C7CCD4' : tinta ? tinta.testo : '#374151',
                        boxShadow: sel ? '0 3px 8px rgba(37,99,235,0.25)' : chiaveGiorno(d) === chiaveGiorno(oggi) ? 'inset 0 0 0 1.5px #93B8F5' : 'none',
                        cursor: passato ? 'default' : 'pointer',
                      }}
                    >
                      {i + 1}
                      {n > 0 && (
                        <span style={{ position: 'absolute', left: 0, right: 0, bottom: 4, display: 'flex', justifyContent: 'center' }}>
                          <span style={{ fontSize: 8, fontWeight: 800, color: '#1D4ED8', background: 'rgba(255,255,255,0.8)', borderRadius: 999, padding: '0.5px 5px', lineHeight: 1.3 }}>{n}</span>
                        </span>
                      )}
                    </button>
                  )
                })}
                {/* Celle di coda invisibili: completano le 6 righe fisse
                    (stesse misure delle celle vere, così la riga ha altezza) */}
                {Array.from({ length: codaCal }, (_, i) => (
                  <div key={`c${i}`} style={{ padding: '6px 0 15px', fontSize: 11.5, fontWeight: 600, visibility: 'hidden' }}>0</div>
                ))}
              </div>
              {/* Legendina del carico: chiaro = leggero, scuro = pieno */}
              <div className="flex items-center flex-wrap" style={{ gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid #E9EEF4' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9AA7B5' }}>più chiaro = giornata leggera</span>
                <span className="flex" style={{ gap: 2 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: '#F3F8FF', border: '1px solid #E1EAF6' }} />
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: '#D4E5FB' }} />
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: '#A5C8F5' }} />
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9AA7B5' }}>più scuro = piena</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 13 }}>
          <SezTesta label="Ora" icona={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
          {pannello ? (
            giorno ? (
              <div className="flex" style={{ gap: 12 }}>
                {slotOre('Mattina', ORE_MATTINA)}
                {slotOre('Pomeriggio', ORE_POMERIGGIO)}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#9AA7B5', padding: '2px 0' }}>Scegli un giorno dal calendario: qui compaiono gli slot con la tua agenda.</p>
            )
          ) : (
            <>
              {gruppoOre('Matt.', ORE_MATTINA)}
              {gruppoOre('Pom.', ORE_POMERIGGIO)}
            </>
          )}
        </div>
      </div>

      {/* ===== Colonna di destra: "La tua giornata" (card vera con testata
          e stati curati) + l'eventuale card extra del pannello ===== */}
      {!senzaGiornata && (
      <div style={{ flex: 1, minWidth: 210, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', border: '1.5px solid #E5E9F0', borderRadius: 13, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 170 }}>
        <div className="flex items-center" style={{ gap: 7, padding: '9px 12px', background: '#F1F5FA', borderBottom: '1px solid #E5E9F0', flexShrink: 0 }}>
          <span style={{ color: '#2563eb', display: 'flex', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </span>
          <b style={{ fontSize: 11.5, fontWeight: 700, color: '#0F1B33' }}>
            {giorno ? `${etichettaGiorno(giorno)}, ${giorno.getDate()} ${MESI_LUNGHI[giorno.getMonth()]}` : 'La tua giornata'}
          </b>
          {giorno && vociGiornata.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, background: '#DBEAFE', color: '#1D4ED8', borderRadius: 999, padding: '2px 8px' }}>{vociGiornata.length}</span>
          )}
        </div>
        <div style={{ flex: 1, padding: '8px 12px' }}>
        {!giorno ? (
          <div className="h-full flex flex-col items-center justify-center text-center" style={{ gap: 4, padding: '16px 10px' }}>
            <span style={{ width: 44, height: 44, borderRadius: 999, background: '#EDF2F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A9B6C8', marginBottom: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </span>
            <b style={{ fontSize: 11, color: '#7C8798', fontWeight: 700 }}>Scegli un giorno</b>
            <span style={{ fontSize: 10, color: '#A9B6C8', lineHeight: 1.5 }}>Qui vedrai i ritiri già in agenda,<br />per incastrare bene il nuovo.</span>
          </div>
        ) : vociGiornata.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center" style={{ gap: 4, padding: '16px 10px' }}>
            <span style={{ width: 44, height: 44, borderRadius: 999, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B8A3C', marginBottom: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <b style={{ fontSize: 11, color: '#7C8798', fontWeight: 700 }}>Giornata libera</b>
            <span style={{ fontSize: 10, color: '#A9B6C8', lineHeight: 1.5 }}>Nessun ritiro fissato:<br />scegli l&apos;ora che preferisci.</span>
          </div>
        ) : (
          vociGiornata.map((v, i) => (
            <div
              key={i}
              className="flex items-center"
              style={v.nuovo
                ? { gap: 8, background: '#EFF6FF', border: '1px dashed #93B8F5', borderRadius: 10, padding: '7px 9px', marginTop: 5 }
                : { gap: 8, padding: '7px 0', borderBottom: '1px solid #EAEFF5' }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 800, color: v.personale ? '#5B6779' : '#1D4ED8', width: 40, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{v.ora}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <b style={{ display: 'block', fontSize: 11, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[v.targa, v.nuovo ? v.nome : v.veicolo].filter(Boolean).join(' · ') || v.nome || 'Ritiro'}
                </b>
                <span style={{ display: 'block', fontSize: 9.5, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.comune || ''}</span>
              </span>
              {v.nuovo && (
                <span style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 0.5, borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>NUOVO</span>
              )}
              {v.personale && (
                <span style={{ marginLeft: 'auto', background: '#E8ECF3', color: '#5B6779', fontSize: 7.5, fontWeight: 800, letterSpacing: 0.5, borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>PERSONALE</span>
              )}
            </div>
          ))
        )}
        </div>
      </div>
      {latoExtra}
      </div>
      )}
    </div>
  )
}

// ============================================================
// Pezzi gemelli del CRM
// ============================================================

// Pillola-azione della testata (gemella di quelle del CRM: 11.5/700,
// bianca bordata celeste, icona 13, attiva #DBEAFE, spia rossa)
function PillolaAzione({ children, icona, onClick, attiva, grassetto, spia }: {
  children: React.ReactNode
  icona?: React.ReactNode
  onClick: () => void
  attiva?: boolean
  grassetto?: boolean
  spia?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 transition-all hover:bg-blue-100"
      style={{ position: 'relative', background: attiva ? '#DBEAFE' : '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: grassetto ? 700 : 600, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap', cursor: 'pointer' }}
    >
      {icona}
      {children}
      {spia && <span style={{ position: 'absolute', top: -3, right: -1, width: 10, height: 10, borderRadius: 999, background: '#DC2626', border: '2px solid #EFF6FF' }} />}
    </button>
  )
}

// Scheda in SOLA LETTURA, gemella di SezTendinaMod del CRM (stesse misure:
// flex 1, minWidth 215, righe alte 27, pillolina celeste bordata) ma senza
// matita: i dati li modifica solo NoiDemoliamo
function SchedaSolaLettura({ titolo, righe, extra }: {
  titolo: string
  righe: { k: string; vista: string; pillola?: boolean; multiriga?: boolean }[]
  extra?: React.ReactNode
}) {
  return (
    <div style={{ flex: 1, minWidth: 215, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, height: 22 }}>
        <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>{titolo}</span>
      </div>
      {righe.map((r, i) => r.multiriga ? (
        <div key={r.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, minHeight: 27, padding: '5px 0', borderBottom: i === righe.length - 1 && !extra ? 'none' : '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.k}</span>
          <span style={{ flex: 1, minWidth: 0, color: '#6B7280', lineHeight: 1.5, whiteSpace: 'pre-line', textAlign: 'right' }}>{r.vista}</span>
        </div>
      ) : (
        <div key={r.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 27, borderBottom: i === righe.length - 1 && !extra ? 'none' : '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.k}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.vista}>
            {r.pillola && r.vista !== '—' && r.vista !== '…' ? (
              <span style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1D4ED8', fontWeight: 600, fontSize: 10.5, borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.vista}</span>
            ) : r.vista}
          </span>
        </div>
      ))}
      {extra}
    </div>
  )
}
