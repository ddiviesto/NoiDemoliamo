'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { Pratica } from './page'
import { suTelefono, ZoomImmagine } from './TabDocumenti'

// ============================================================
// ⭐ TAB "RITIRO" (28/07/2026, mockup approvato — idea di Davide):
// la casa di tutto ciò che riguarda il giorno del ritiro, tra
// Documenti e Stato. Sopra il RIQUADRO BLU con data e ora (appare
// quando il demolitore fissa il ritiro), sotto la card bianca con
// gli ORIGINALI da consegnare (aperta fissa: qui è a casa sua) coi
// moduli da scaricare. Il riquadrone verde acqua che stava in fondo
// alla tab Documenti non esiste più.
// ============================================================

interface DocConsegna {
  id: string
  stato: string
  scaricato_il: string | null
  indice_erede: number | null
  codice: string
  nome: string
  descrizione: string | null
  template_pdf: string | null
  per_erede: boolean
  ordine: number
}

// Stati in cui la data fissata è "viva" (dopo il ritiro non ha più senso)
const STATI_DATA_VIVA = ['assegnata', 'in_attesa_conferma_cliente', 'ritiro_confermato']

function formattaDataRitiro(iso: string): string {
  const d = new Date(iso)
  const giorno = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const testo = giorno.charAt(0).toUpperCase() + giorno.slice(1)
  const conOra = d.getHours() !== 0 || d.getMinutes() !== 0
  return conOra ? `${testo} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : testo
}

function ordinaleErede(n: number): string {
  const o = ['', 'Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto', 'Settimo', 'Ottavo', 'Nono', 'Decimo']
  return o[n] || `${n}°`
}

function nomeDoc(d: DocConsegna): string {
  if (d.per_erede && d.indice_erede) return `${d.nome} (${ordinaleErede(d.indice_erede).toLowerCase()} erede)`
  return d.nome
}

// Descrizioni dei moduli (delega e dichiarazioni eredità): le frasi chiave
// vanno in evidenza (fotocopie in grassetto — richiesta Davide 16/07 — e
// l'avviso rosso per chi ha rinunciato — 22/07)
const FRASI_MODULO: { frase: string; colore?: string }[] = [
  { frase: "fotocopie fronte e retro di carta d'identità e codice fiscale del delegato" },
  { frase: "fotocopie fronte e retro della carta d'identità (o patente) e del codice fiscale di ogni erede che ha accettato" },
  { frase: "fotocopie fronte e retro della carta d'identità (o patente) e del codice fiscale di ogni erede" },
  { frase: 'Chi ha rinunciato NON firma nulla e NON allega i suoi documenti.', colore: '#9B1C1C' },
  { frase: 'solo tu' },
]

function descrizioneModulo(desc: string): React.ReactNode {
  const parti: React.ReactNode[] = []
  let resto = desc
  let key = 0
  while (resto.length) {
    let primo: { i: number; f: { frase: string; colore?: string } } | null = null
    for (const f of FRASI_MODULO) {
      const i = resto.toLowerCase().indexOf(f.frase.toLowerCase())
      if (i !== -1 && (!primo || i < primo.i || (i === primo.i && f.frase.length > primo.f.frase.length))) primo = { i, f }
    }
    if (!primo) { parti.push(resto); break }
    if (primo.i > 0) parti.push(resto.slice(0, primo.i))
    parti.push(<b key={key++} style={{ color: primo.f.colore || '#111827', fontWeight: 700 }}>{resto.slice(primo.i, primo.i + primo.f.frase.length)}</b>)
    resto = resto.slice(primo.i + primo.f.frase.length)
  }
  return <>{parti}</>
}

// La descrizione si mostra solo per i moduli che "portano con sé"
// istruzioni di consegna: deleghe e dichiarazioni eredità
function mostraDescrizione(d: DocConsegna): boolean {
  if (!d.descrizione) return false
  return !!d.template_pdf && (d.template_pdf.startsWith('DELEGA') || d.template_pdf.startsWith('DICHIARAZIONE_SOSTITUTIVA_EREDITA'))
}

export default function TabRitiro({ pratica }: { pratica: Pratica }) {
  const [docs, setDocs] = useState<DocConsegna[]>([])
  const [loading, setLoading] = useState(true)
  const [scaricandoId, setScaricandoId] = useState<string | null>(null)

  const carica = useCallback(async (spinnerIniziale = false) => {
    if (spinnerIniziale) setLoading(true)
    const { data } = await supabase
      .from('pratica_documenti_checklist')
      .select('id, stato, scaricato_il, indice_erede, casistiche_documenti(codice, nome, descrizione, richiede_consegna, template_pdf, per_erede, ordine)')
      .eq('pratica_id', pratica.id)
    type Riga = { id: string; stato: string; scaricato_il: string | null; indice_erede: number | null; casistiche_documenti: { codice?: string; nome?: string; descrizione?: string | null; richiede_consegna?: boolean; template_pdf?: string | null; per_erede?: boolean; ordine?: number } | null }
    const lista: DocConsegna[] = ((data || []) as Riga[])
      .filter(r => r.casistiche_documenti?.richiede_consegna)
      // Libretto "da chiarire" (libretto no): fuori dalla lista, come nel resto dell'area
      .filter(r => !(pratica.libretto === 'no' && (r.casistiche_documenti?.codice === 'LIBRETTO_CIRCOLAZIONE' || r.casistiche_documenti?.codice === 'LIBRETTO_ESTERO')))
      .map(r => ({
        id: r.id,
        stato: r.stato,
        scaricato_il: r.scaricato_il,
        indice_erede: r.indice_erede,
        codice: r.casistiche_documenti?.codice || '',
        nome: r.casistiche_documenti?.nome || 'Documento',
        descrizione: r.casistiche_documenti?.descrizione ?? null,
        template_pdf: r.casistiche_documenti?.template_pdf ?? null,
        per_erede: !!r.casistiche_documenti?.per_erede,
        ordine: r.casistiche_documenti?.ordine ?? 0,
      }))
    lista.sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))
    setDocs(lista)
    setLoading(false)
  }, [pratica.id, pratica.libretto])

  useEffect(() => { carica(true) }, [carica])

  // Aggiornamento automatico: se l'admin corregge le dichiarazioni la
  // lista degli originali si adegua da sola, in silenzio
  useAggiornaLive({
    canale: `cliente-ritiro-${pratica.id}`,
    tabelle: [{ tabella: 'pratica_documenti_checklist', filtro: `pratica_id=eq.${pratica.id}` }],
    onCambio: () => carica(),
  })

  // ⭐ 29/07 (punto 5 giro iPhone, mockup approvato): sul TELEFONO il modulo
  // si apre nel PALCO SCURO (pagine come le foto, zoom col pizzico) con le
  // azioni "Condividi o stampa" (menu vero dell'iPhone) e "Scarica". Su PC
  // resta il download diretto di sempre.
  const [moduloAperto, setModuloAperto] = useState<{ titolo: string; nomeFile: string; blob: Blob; pagine: string[]; indice: number } | null>(null)

  function scaricaBlob(blob: Blob, nomeFile: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeFile
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function condividiModulo() {
    if (!moduloAperto) return
    const file = new File([moduloAperto.blob], moduloAperto.nomeFile, { type: 'application/pdf' })
    const nav = navigator as Navigator & { canShare?: (dati: { files: File[] }) => boolean }
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: moduloAperto.titolo })
      } catch { /* condivisione annullata dal cliente: nessun errore */ }
    } else {
      // Browser senza menu di condivisione: almeno il download
      scaricaBlob(moduloAperto.blob, moduloAperto.nomeFile)
    }
  }

  // Scarica un modulo PDF (l'endpoint traccia anche scaricato_il)
  async function scaricaModulo(doc: DocConsegna) {
    setScaricandoId(doc.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessione scaduta')
      const res = await fetch(`/api/modulo-pdf?checklist_id=${encodeURIComponent(doc.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const corpo = await res.json().catch(() => null)
        throw new Error(corpo?.error ? `${corpo.error} (${res.status})` : `Download fallito (${res.status})`)
      }
      const blob = await res.blob()
      if (suTelefono()) {
        // Telefono: palco con le pagine + Condividi/Scarica
        const url = URL.createObjectURL(blob)
        try {
          const { renderPdfPagine } = await import('@/lib/pdfPagine')
          const pagine = await renderPdfPagine(url)
          setModuloAperto({ titolo: nomeDoc(doc), nomeFile: `${doc.nome}.pdf`, blob, pagine, indice: 0 })
        } catch {
          // Conversione fallita: almeno il download classico
          scaricaBlob(blob, `${doc.nome}.pdf`)
        } finally {
          URL.revokeObjectURL(url)
        }
      } else {
        scaricaBlob(blob, `${doc.nome}.pdf`)
      }
      await carica()
    } catch (err) {
      console.error('Errore download modulo:', err)
      alert(err instanceof Error && err.message ? `Errore nel download del modulo: ${err.message}` : 'Errore nel download del modulo. Riprova.')
    }
    setScaricandoId(null)
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const dataViva = !!pratica.data_ritiro_prevista && STATI_DATA_VIVA.includes(pratica.stato)

  return (
    <div className="flex flex-col gap-3">

      {/* ⭐ RIQUADRO DATA IN CELESTE CRM (28/07, mockup approvato: via la
          "botta blu" — informa senza urlare, il blu pieno resta al banner) */}
      {dataViva && (
        <div style={{ background: '#EFF6FF', border: '1.5px solid #DBEAFE', borderRadius: 16, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563eb' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#1D4ED8' }}>Ritiro programmato</span>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, marginTop: 1, color: '#0F1B33' }}>{formattaDataRitiro(pratica.data_ritiro_prevista!)}</span>
            {/* Decisione Davide 28/07: il cliente non deve vedere CHI è il
                demolitore — frase generica, niente nomi */}
            <span style={{ display: 'block', fontSize: 11, color: '#4B5563', marginTop: 1 }}>Il demolitore passa a ritirare il mezzo</span>
          </span>
        </div>
      )}

      {/* CARD ORIGINALI DA CONSEGNARE (aperta fissa) */}
      {docs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p style={{ fontSize: 12.5, color: '#6B7280' }}>Per questa pratica non ci sono documenti da consegnare al ritiro.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>Da portare al ritiro</span>
              <span style={{ display: 'block', fontSize: 12.5, color: '#6B7280', marginTop: 1 }}>Consegnali in originale il giorno del ritiro</span>
            </span>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '2px 10px', flexShrink: 0 }}>{docs.length}</span>
          </div>
          {/* ⭐ 28/07 sera (mockup B): ogni documento in un RIQUADRINO CELESTE
              di famiglia — si vedono meglio delle righe coi filetti; numerino
              e pillolina in bianco per staccare sul celeste */}
          <div style={{ padding: '10px 12px 4px', borderTop: '1px solid #F1F3F6' }}>
            {docs.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 12px', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 12, marginBottom: 8 }}>
                {/* ⭐ 28/07 sera (mockup C): OGNI documento ha il suo numero — il
                    check verde sul modulo scaricato confondeva (sembrava una
                    cosa già fatta in una lista di cose DA portare) */}
                <span style={{ width: 23, height: 23, borderRadius: 999, background: '#fff', color: '#1D4ED8', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>{nomeDoc(d)}</span>
                  {mostraDescrizione(d) && (
                    <span style={{ display: 'block', fontSize: 10.5, color: '#4B5563', marginTop: 3, lineHeight: 1.5 }}>{descrizioneModulo(d.descrizione!)}</span>
                  )}
                  {d.codice === 'ATTO_MORTE' && (
                    <span style={{ display: 'block', fontSize: 10.5, color: '#4B5563', marginTop: 3, lineHeight: 1.5 }}>Basta una copia o fotocopia.</span>
                  )}
                  {/* ⭐ 28/07 sera (mockup C): pillolina CELESTE anche da scaricata
                      — zero verde nella lista */}
                  {d.template_pdf && (
                    <span style={{ display: 'inline-block', background: '#fff', color: '#1D4ED8', fontSize: 9.5, fontWeight: 600, borderRadius: 999, padding: '2px 8px', marginTop: 4 }}>
                      {d.scaricato_il ? 'Scaricata · ora compilala e firmala' : 'Scaricalo, compilalo e firmalo'}
                    </span>
                  )}
                </span>
                {/* ⭐ 28/07 sera (mockup C): via la scritta "Scarica di nuovo" —
                    SIMBOLO di download blu pieno, vale sia per il primo scarico
                    che per riscaricare */}
                {d.template_pdf && (
                  <button
                    onClick={() => scaricaModulo(d)}
                    disabled={scaricandoId === d.id}
                    aria-label={d.scaricato_il ? 'Scarica di nuovo il modulo' : 'Scarica il modulo'}
                    title={d.scaricato_il ? 'Scarica di nuovo' : 'Scarica'}
                    style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, background: '#2563eb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 3px 8px rgba(37,99,235,0.28)', opacity: scaricandoId === d.id ? 0.6 : 1, transition: 'opacity 0.15s' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#6B7280', lineHeight: 1.5, padding: '10px 14px 13px', background: '#F8FAFC', borderTop: '1px solid #F1F3F6' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span>Servono <b style={{ color: '#374151' }}>in originale</b>: senza questi documenti il veicolo non può essere ritirato.{docs.some(d => d.template_pdf) && <> Scarica i moduli, <b style={{ color: '#374151' }}>compilali e firmali</b>.</>}</span>
          </div>
        </div>
      )}

      {/* ⭐ 29/07 (mockup approvato): PALCO del modulo sul telefono — pagine
          con lo zoom col pizzico + "Condividi o stampa" (menu dell'iPhone:
          da lì stampa, salva su File, WhatsApp…) e "Scarica" */}
      {moduloAperto && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#5D6A7E' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexShrink: 0 }}>
            <span style={{ flex: 1, minWidth: 0, color: '#fff', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{moduloAperto.titolo}</span>
            <button onClick={() => setModuloAperto(null)} aria-label="Chiudi" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 24, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
            <ZoomImmagine key={moduloAperto.indice} src={moduloAperto.pagine[moduloAperto.indice]} alt={moduloAperto.titolo} />
          </div>
          {moduloAperto.pagine.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '10px 0 0', flexShrink: 0 }}>
              <button onClick={() => setModuloAperto(m => m ? { ...m, indice: (m.indice - 1 + m.pagine.length) % m.pagine.length } : m)} style={{ color: '#fff', fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>‹ Prec.</button>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>Pagina {moduloAperto.indice + 1} di {moduloAperto.pagine.length}</span>
              <button onClick={() => setModuloAperto(m => m ? { ...m, indice: (m.indice + 1) % m.pagine.length } : m)} style={{ color: '#fff', fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>Succ. ›</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px 18px', flexShrink: 0 }}>
            <button onClick={condividiModulo} className="btn-pagina" style={{ flex: 1, width: 'auto', fontSize: 13.5, padding: '13px 0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
              Condividi o stampa
            </button>
            <button onClick={() => scaricaBlob(moduloAperto.blob, moduloAperto.nomeFile)} className="active:scale-[0.99]" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 13.5, fontWeight: 700, border: 'none', borderRadius: 999, padding: '13px 18px', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Scarica
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
