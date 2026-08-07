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

import { useCallback, useEffect, useRef, useState } from 'react'
import { chiamataDemolitore, caricaCertificato, PraticaDemolitore, gruppoDi, CASISTICA_LABEL } from '../_lib/api'
import ChatDemolitore from './ChatDemolitore'
import NoteDemolitore from './NoteDemolitore'

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
  if (cacheDettagli.has(praticaId) || prefetchInCorso.has(praticaId)) return
  prefetchInCorso.add(praticaId)
  try {
    const json = await chiamataDemolitore<Dettaglio>('/api/demolitore-pratiche', { pratica_id: praticaId })
    cacheDettagli.set(praticaId, json)
  } catch { /* silenzioso */ }
  prefetchInCorso.delete(praticaId)
}

export default function TendinaPratica({ p, onCambiata }: {
  p: PraticaDemolitore
  /** dopo ogni azione: la lista della home si ricarica */
  onCambiata: () => void
}) {
  const gruppo = gruppoDi(p)
  const chiusa = gruppo === 'completate' || gruppo === 'annullate'

  // Parte dalla cache quando c'è (precaricata all'hover): zero sobbalzi
  const [dett, setDett] = useState<Dettaglio | null>(() => cacheDettagli.get(p.id) || null)
  const [docAperti, setDocAperti] = useState(false)
  const [chatAperta, setChatAperta] = useState(false)
  const [nuvola, setNuvola] = useState<Nuvola>(null)
  const [quando, setQuando] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')
  const inputCert = useRef<HTMLInputElement>(null)
  const tipoCert = useRef<'rottamazione' | 'pra'>('rottamazione')

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

  return (
    <>
      {/* ===== FILA AZIONI: seconda riga della testata azzurra (come il CRM) ===== */}
      <div className="relative">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#EFF6FF', padding: '0 16px 12px' }}>

          {gruppo === 'arrivo' && (
            <PillolaAzione grassetto onClick={() => { setNuvola(nuvola === 'fissa' ? null : 'fissa'); setErrore('') }}
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
              <PillolaAzione onClick={() => { setNuvola(nuvola === 'sposta' ? null : 'sposta'); setErrore('') }}
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

          <PillolaAzione attiva={docAperti} onClick={() => setDocAperti(x => !x)}
            icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}>
            Documenti e Foto
            <span style={{ background: '#EFF6FF', borderRadius: 999, fontSize: 10, padding: '1px 7px' }}>{dett ? numDocumenti : '…'}</span>
          </PillolaAzione>

          <PillolaAzione attiva={chatAperta} spia={(p.non_letti || 0) > 0} onClick={() => setChatAperta(x => !x)}
            icona={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>}>
            Chat
          </PillolaAzione>

          {/* ⭐ Trattativa Extra: quando l'admin ha impostato l'importo, il
              demolitore vede la pillola con la cifra */}
          {d?.fee_concordata != null && (
            <span className="flex items-center gap-1.5" style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              Trattativa Extra · {d.fee_concordata}€
            </span>
          )}

          {errore && !nuvola && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 bg-white" style={{ border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>{errore}</span>
          )}
        </div>

        {/* input nascosto per i certificati (PDF o foto) */}
        <input ref={inputCert} type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) certificato(f); e.target.value = '' }} />

        {/* ===== NUVOLETTE ancorate alla fila (regola 20) ===== */}
        {nuvola && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 5 }} onClick={() => { if (!busy) { setNuvola(null); setErrore('') } }} />
            <div className="bg-white" style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 16, width: 320, maxWidth: '92%', border: '1.5px solid #DBEAFE', borderRadius: 14, boxShadow: '0 14px 34px rgba(15,23,42,0.18)', padding: 14, zIndex: 6 }}>

              {nuvola === 'fissa' && (
                <>
                  <div className="text-[13px] font-bold text-gray-900 mb-2">Quando passi a ritirarlo?</div>
                  <input type="datetime-local" value={quando} onChange={e => setQuando(e.target.value)}
                    className="w-full text-base text-gray-900 outline-none" style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px' }} />
                  <p className="text-[11px] mt-2" style={{ color: '#8B95A5', lineHeight: 1.45 }}>La data vale subito: il cliente la vede nella sua area. Chiamalo prima per accordarvi.</p>
                </>
              )}

              {nuvola === 'sposta' && (
                <>
                  <div className="text-[13px] font-bold text-gray-900 mb-2">Sposta il ritiro</div>
                  <input type="datetime-local" value={quando} onChange={e => setQuando(e.target.value)}
                    className="w-full text-base text-gray-900 outline-none" style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px' }} />
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo dello spostamento (obbligatorio)"
                    rows={2} className="w-full text-base text-gray-900 outline-none mt-2" style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', resize: 'none' }} />
                  <p className="text-[11px] mt-1.5" style={{ color: '#8B95A5', lineHeight: 1.45 }}>Il motivo resta nella cronologia che vede NoiDemoliamo.</p>
                </>
              )}

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
                    if (nuvola === 'fissa') azione('fissa_ritiro', { quando: quando ? new Date(quando).toISOString() : '' })
                    else if (nuvola === 'sposta') azione('fissa_ritiro', { quando: quando ? new Date(quando).toISOString() : '', motivo })
                    else if (nuvola === 'ritirata') azione('segna_ritirata')
                    else if (nuvola === 'amano') azione('rottamazione_a_mano')
                  }}
                  className="transition-all hover:brightness-105 disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 15px', cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.3)' }}
                >
                  {busy ? 'Un attimo…' : 'Conferma'}
                </button>
              </div>
            </div>
          </>
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
              {(dett?.da_consegnare.length || 0) > 0 && (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Originali da consegnare al ritiro</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {dett!.da_consegnare.map((voce, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#374151', lineHeight: 1.35 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                        {voce}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* ===== DOCUMENTI E FOTO in linea (sola visione; il visore gemello
          dell'admin è il prossimo pezzo) ===== */}
      {docAperti && dett && (
        <div style={{ padding: '0 12px 12px' }}>
          <div className="bg-white" style={{ border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>Documenti e Foto (sola visione)</span>
            </div>
            {dett.documenti_approvati.length === 0 && dett.foto.length === 0 && (
              <div className="text-[11.5px]" style={{ color: '#8B95A5' }}>Niente da mostrare per ora.</div>
            )}
            {dett.documenti_approvati.map((doc, i) => (
              <div key={i} className="flex items-center justify-between gap-3 flex-wrap" style={{ minHeight: 27, borderBottom: '1px solid #F5F7FA', fontSize: 11.5 }}>
                <span className="font-semibold" style={{ color: '#1E293B' }}>{doc.nome}</span>
                <span className="flex gap-1.5 flex-wrap">
                  {doc.files.map((f, j) => (
                    <a key={j} href={f.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:bg-blue-50" style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1D4ED8', fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '2px 9px', textDecoration: 'none' }}>
                      {f.lato ? f.lato.charAt(0).toUpperCase() + f.lato.slice(1) : `File ${j + 1}`}
                    </a>
                  ))}
                </span>
              </div>
            ))}
            {dett.foto.length > 0 && (
              <>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', margin: '8px 0 6px' }}>Foto del veicolo</div>
                <div className="flex gap-2 flex-wrap">
                  {dett.foto.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Foto ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #E5E7EB' }} /></a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
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
