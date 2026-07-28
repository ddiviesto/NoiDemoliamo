'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'

// ============================================================
// APPROVAZIONE DOCUMENTI — nuovo sistema (pratica_documenti_checklist)
// L'admin vede i documenti caricati dal cliente, li approva o rifiuta
// (con motivo). Quando sono tutti approvati la pratica passa a
// "da_assegnare"; se ne rifiuta qualcuno passa a
// "documenti_parzialmente_approvati" e il cliente può ricaricare.
// ============================================================

interface FileCaricato {
  url: string
  nome: string
  lato?: 'fronte' | 'retro'
}

interface DocRiga {
  id: string
  documento_id: string
  indice_erede: number | null
  stato: 'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
  file_url: string | null
  nota_admin: string | null
  codice: string
  nome: string
  per_erede: boolean
  richiede_upload: boolean
  template_pdf: string | null
  ordine: number
}

interface FotoPratica {
  id: string
  url: string
  caricato_il: string
}

// Frase pronta (messaggi_preimpostati, categoria 'rifiuto')
interface Preimpostato {
  id: string
  testo: string
  ordine: number
}

interface DatiPratica {
  libretto: string | null
  certificato_proprieta: string | null
  casistica: string | null
  fermo_amministrativo: string | null
  delegato_nome: string | null
  delegato_telefono: string | null
  numero_eredi: number | null
  targhe_presenti: boolean | null
}

// ⭐ 26/07: NOMI PRECISI per l'admin. Il catalogo parla al cliente ("La tua
// carta d'identità"): qui il possessivo diventa il RUOLO vero secondo la
// casistica, così Davide incrocia il documento coi dati dichiarati.
const RUOLO_CASISTICA: Record<string, string> = {
  persona_fisica: "dell'intestatario",
  eredi_accettato: "dell'erede che gestisce la pratica",
  eredi_rinuncia: "dell'erede che gestisce la pratica",
  societa: 'del legale rappresentante',
  societa_fallita: 'del legale rappresentante',
  associazione: 'del rappresentante',
  non_intestatario: 'del richiedente',
  targhe_straniere: 'del proprietario',
}

// Esportata: la usa anche la scheda Ritiro del CRM (28/07) per la lista
// degli originali da consegnare, così i nomi parlano sempre col ruolo
export function nomeAdmin(nome: string, casistica: string | null | undefined): string {
  const ruolo = casistica ? RUOLO_CASISTICA[casistica] : null
  const m = nome.match(/^(la tua|il tuo)\s+(.+)$/i)
  if (m && ruolo) return m[2].charAt(0).toUpperCase() + m[2].slice(1) + ' ' + ruolo
  return nome
}

interface Props {
  praticaId: string
  statoPratica: string
  // ⭐ 23/07: card A SCOMPARSA — chiusa all'apertura della pratica,
  // la testata (sempre visibile, col riassunto) apre e chiude
  aperta: boolean
  onToggle: () => void
  onStatoCambiato?: (tuttiApprovati: boolean, totale: number, approvati: number) => void
  onRicaricaPratica?: () => void
  // ⭐ 26/07 (variante B su mockup): nella TENDINA del CRM il pannello è una
  // GRIGLIA DI MINIATURE compatta (badge di stato nell'angolo, "Verifica
  // ora"); il lavoro vero resta nel visore. La card intera vive nel dettaglio.
  compatta?: boolean
  // ⭐ 27/07 (mockup definitivo): la testata del visore mostra sempre di chi
  // sono i documenti — targhetta, veicolo e cliente
  targa?: string | null
  veicolo?: string | null
  cliente?: string | null
  // ⭐ 27/07 sera (mockup approvato): modalità SOLO VISORE per la tendina —
  // in pagina non si disegna NULLA (niente riquadro che arriva in ritardo e
  // fa scattare la fila); il visore si apre quando `apriTrigger` cambia
  // (la pillola Documenti lo incrementa), sul primo documento da verificare
  soloVisore?: boolean
  apriTrigger?: number
}

// ---- helper file ----
function leggiFile(fileUrl: string | null): FileCaricato[] {
  if (!fileUrl) return []
  try {
    const parsed = JSON.parse(fileUrl)
    if (Array.isArray(parsed)) return parsed as FileCaricato[]
    return []
  } catch {
    return [{ url: fileUrl, nome: 'File' }]
  }
}

function estraiPathBucket(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length).split('?')[0]
}

function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.pdf($|\?)/i.test(url)
}

function ordinaleErede(n: number): string {
  const o = ['', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°']
  return o[n] || `${n}°`
}

// ---- helper scarico PDF (27/07) ----
function bytesDaDataUrl(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1])
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function nomeFileSicuro(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '').trim()
}

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

// I tre esiti della verifica del certificato di proprietà (telefonata al cliente)
function BottoniCdc({ azione, onScegli }: { azione: boolean; onScegli: (cdc: 'cartaceo' | 'digitale' | 'smarrito') => void }) {
  const stile: React.CSSProperties = { background: '#fff', border: '1.5px solid #E5E7EB', color: '#1E293B' }
  return (
    <>
      <button onClick={() => onScegli('cartaceo')} disabled={azione} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={stile}>Cartaceo</button>
      <button onClick={() => onScegli('digitale')} disabled={azione} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={stile}>Digitale</button>
      <button onClick={() => onScegli('smarrito')} disabled={azione} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={stile}>Smarrito</button>
    </>
  )
}

// ============================================================
// VISORE: IMMAGINE ZOOMABILE (26/07, mockup approvato: A + barretta
// della B). Doppio clic sul punto da leggere = ingrandisce lì; da
// ingrandito trascini per spostarti e la rotella regola; barretta
// − / % / + / Adatta sempre visibile in basso.
// ============================================================

const SCALE_ZOOM = [1, 1.5, 2, 3, 4]

function ZoomImg({ src, alt, badge }: { src: string; alt: string; badge?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)

  // Il doppio clic è stato TOLTO (26/07, richiesta Davide): con la rotella
  // sempre attiva non serviva più.

  // La rotella regola lo zoom SEMPRE, appena sei sopra (26/07: prima solo
  // da ingranditi). Listener manuale non-passivo: React registra onWheel
  // come passivo e il preventDefault non avrebbe effetto.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setT(prev => {
        const s = Math.min(5, Math.max(1, prev.s * (e.deltaY < 0 ? 1.15 : 0.87)))
        return s === 1 ? { s: 1, x: 0, y: 0 } : { ...prev, s }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function zoomStep(dir: 1 | -1) {
    setT(prev => {
      let i = SCALE_ZOOM.findIndex(x => x >= prev.s - 0.01)
      if (i === -1) i = SCALE_ZOOM.length - 1
      const s = SCALE_ZOOM[Math.min(SCALE_ZOOM.length - 1, Math.max(0, i + dir))]
      return s === 1 ? { s: 1, x: 0, y: 0 } : { ...prev, s }
    })
  }

  const bottoneBarra: React.CSSProperties = { border: 'none', background: 'transparent', color: '#fff', width: 26, height: 26, borderRadius: 999, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

  return (
    <div
      ref={box}
      onPointerDown={e => { if (t.s > 1 && !(e.target as HTMLElement).closest('[data-barra-zoom]')) { drag.current = { x: e.clientX, y: e.clientY }; box.current?.setPointerCapture(e.pointerId) } }}
      onPointerMove={e => { if (drag.current) { const d = drag.current; drag.current = { x: e.clientX, y: e.clientY }; setT(prev => ({ ...prev, x: prev.x + e.clientX - d.x, y: prev.y + e.clientY - d.y })) } }}
      onPointerUp={() => { drag.current = null }}
      style={{ position: 'relative', width: '100%', height: '100%', background: 'transparent', borderRadius: 12, overflow: 'hidden', touchAction: 'none', cursor: t.s > 1 ? 'grab' : 'default' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transformOrigin: 'center center', userSelect: 'none' }}
      />
      {badge && (
        <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(15,23,42,0.65)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, borderRadius: 20, padding: '2px 9px', zIndex: 2 }}>{badge}</span>
      )}
      {/* Barretta di zoom sempre visibile */}
      <div data-barra-zoom style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 8, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(15,23,42,0.72)', borderRadius: 999, padding: 3, zIndex: 2 }}>
        <button type="button" onClick={() => zoomStep(-1)} style={bottoneBarra}>−</button>
        <span style={{ color: '#fff', fontSize: 10.5, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{Math.round(t.s * 100)}%</span>
        <button type="button" onClick={() => zoomStep(1)} style={bottoneBarra}>+</button>
        <button type="button" onClick={() => setT({ s: 1, x: 0, y: 0 })} style={{ ...bottoneBarra, width: 'auto', padding: '0 9px', fontSize: 10 }}>Adatta</button>
      </div>
    </div>
  )
}

// ============================================================
// PDF NEL VISORE (26/07): le pagine del PDF diventano IMMAGINI e passano
// nello STESSO visore delle foto (doppio clic, trascina, rotella, barretta).
// Via il visore integrato del browser con la sua barra grigia.
// ============================================================

function PdfZoom({ src, badge }: { src: string; badge?: string }) {
  const [pagine, setPagine] = useState<string[] | null>(null)
  const [errore, setErrore] = useState(false)
  const [pagina, setPagina] = useState(0)

  useEffect(() => {
    let vivo = true
    async function rendi() {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const doc = await pdfjs.getDocument({ url: src }).promise
        const urls: string[] = []
        const max = Math.min(doc.numPages, 20)
        for (let i = 1; i <= max; i++) {
          const page = await doc.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: Math.min(3, 1600 / base.width) })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
          urls.push(canvas.toDataURL('image/jpeg', 0.92))
          if (!vivo) return
        }
        if (vivo) setPagine(urls)
      } catch (e) {
        console.error('Errore lettura PDF:', e)
        if (vivo) setErrore(true)
      }
    }
    rendi()
    return () => { vivo = false }
  }, [src])

  // Sul palco scuro (27/07): niente sfondi chiari, testi e rotellina in chiaro
  if (errore) return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <p style={{ fontSize: 12, color: '#E2E8F0' }}>Non riesco a mostrare questo PDF qui.</p>
      <a href={src} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#BFDBFE', textDecoration: 'underline' }}>Aprilo in un&apos;altra scheda</a>
    </div>
  )
  if (!pagine) return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  const bottonePag: React.CSSProperties = { border: 'none', background: 'transparent', color: '#fff', width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ZoomImg key={pagina} src={pagine[pagina]} alt={`Pagina ${pagina + 1}`} badge={badge} />
      {pagine.length > 1 && (
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(15,23,42,0.72)', borderRadius: 999, padding: 3, zIndex: 3 }}>
          <button type="button" onClick={() => setPagina(p => (p - 1 + pagine.length) % pagine.length)} style={bottonePag} aria-label="Pagina precedente">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '0 4px' }}>Pag. {pagina + 1}/{pagine.length}</span>
          <button type="button" onClick={() => setPagina(p => (p + 1) % pagine.length)} style={bottonePag} aria-label="Pagina successiva">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// COMPONENTE
// ============================================================

export default function DocumentiApprovazione({ praticaId, aperta, onToggle, onStatoCambiato, onRicaricaPratica, compatta, targa, veicolo, cliente, soloVisore, apriTrigger }: Props) {
  const [docs, setDocs] = useState<DocRiga[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [dati, setDati] = useState<DatiPratica | null>(null)
  const [signedMap, setSignedMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [azione, setAzione] = useState(false)
  // VISORE: indice della voce aperta (documenti + foto in un'unica fila)
  const [visoreIdx, setVisoreIdx] = useState<number | null>(null)
  // ⭐ 27/07 (mockup definitivo): scarico PDF dal visore — menu del bottone
  // Scarica, selezione con le caselle nell'elenco, PDF unico da inoltrare
  const [menuScarica, setMenuScarica] = useState(false)
  const [selezione, setSelezione] = useState(false)
  const [scelte, setScelte] = useState<Set<string>>(new Set())
  const [pdfInCorso, setPdfInCorso] = useState(false)
  const [pdfErrore, setPdfErrore] = useState<string | null>(null)
  function chiudiVisore() {
    setVisoreIdx(null)
    setMenuScarica(false)
    setSelezione(false)
    setScelte(new Set())
    setPdfErrore(null)
  }
  // ⭐ 27/07 notte (richiesta Davide): chiusura CON animazione — il pannello
  // riscivola verso destra e poi si smonta (clic fuori, ✕, Esc o riclic
  // sulla pillola Documenti)
  const [visoreChiudendo, setVisoreChiudendo] = useState(false)
  function chiudiVisoreAnimato() {
    if (visoreIdx === null || visoreChiudendo) return
    setVisoreChiudendo(true)
    setTimeout(() => { setVisoreChiudendo(false); chiudiVisore() }, 240)
  }
  const [modalRifiuto, setModalRifiuto] = useState<{ id: string; titolo: string } | null>(null)
  const [errRifiuto, setErrRifiuto] = useState<string | null>(null)
  // ⭐ 27/07 (variante A su mockup): frasi pronte del rifiuto (categoria
  // 'rifiuto' in messaggi_preimpostati), modificabili dalla nuvoletta stessa
  const [frasiRifiuto, setFrasiRifiuto] = useState<Preimpostato[]>([])
  async function caricaFrasiRifiuto() {
    const { data } = await supabase
      .from('messaggi_preimpostati')
      .select('id, testo, ordine')
      .eq('categoria', 'rifiuto')
      .order('ordine', { ascending: true })
    setFrasiRifiuto((data as Preimpostato[]) || [])
  }
  useEffect(() => { caricaFrasiRifiuto() }, [])
  const [notaRifiuto, setNotaRifiuto] = useState('')

  const onStatoRef = useRef(onStatoCambiato)
  useEffect(() => { onStatoRef.current = onStatoCambiato }, [onStatoCambiato])
  const signedRef = useRef<Record<string, string>>({})

  useEffect(() => {
    carica(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  // Aggiornamento automatico (22/07): upload/invii del cliente appaiono da
  // soli, senza ricaricare la pagina (ricarica silenziosa, niente spinner)
  useAggiornaLive({
    canale: `admin-doc-${praticaId}`,
    tabelle: [
      { tabella: 'pratica_documenti_checklist', filtro: `pratica_id=eq.${praticaId}` },
      { tabella: 'foto_pratiche', filtro: `pratica_id=eq.${praticaId}` },
    ],
    onCambio: () => carica(),
  })

  // Notifica il padre (per sbloccare lo Step 2) — solo sui documenti che richiedono upload
  useEffect(() => {
    const daApprovare = docs.filter(d => d.richiede_upload)
    const totale = daApprovare.length
    const approvati = daApprovare.filter(d => d.stato === 'approvato').length
    const tutti = totale > 0 && approvati === totale
    onStatoRef.current?.(tutti, totale, approvati)
  }, [docs])

  // ⭐ Apertura del visore SU COMANDO dall'esterno (27/07 sera): la pillola
  // Documenti della tendina incrementa `apriTrigger` e il visore si apre sul
  // primo documento da verificare (altrimenti il primo caricato, poi le foto).
  // ⚠️ Il ref memorizza il valore GIÀ GESTITO partendo da quello del montaggio:
  // se il componente si rimonta (cambio filtro, ricarica lista) il trigger
  // vecchio non deve riaprire il visore da solo.
  const triggerGestito = useRef(apriTrigger ?? 0)
  useEffect(() => {
    if (loading || apriTrigger == null || apriTrigger <= triggerGestito.current) return
    triggerGestito.current = apriTrigger
    // ⭐ Riclic sulla pillola col visore aperto = chiusura animata (toggle)
    if (visoreIdx !== null) { chiudiVisoreAnimato(); return }
    const ordinati = docs
      .filter(d => d.richiede_upload && leggiFile(d.file_url).length > 0)
      .sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))
    const primo = ordinati.find(d => d.stato === 'caricato') || ordinati[0]
    if (primo) setVisoreIdx(ordinati.findIndex(d => d.id === primo.id))
    else if (foto.length > 0) setVisoreIdx(ordinati.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apriTrigger, loading])

  // Col visore aperto la pagina dietro NON scorre (27/07): con la rotella
  // sull'elenco arrivato in fondo lo scroll trapassava alla pagina sotto
  const visoreAperto = visoreIdx !== null
  useEffect(() => {
    if (!visoreAperto) return
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [visoreAperto])

  // VISORE: navigazione da tastiera (← → per scorrere, Esc per chiudere)
  const totVoci = docs.filter(d => d.richiede_upload && leggiFile(d.file_url).length > 0).length + foto.length
  useEffect(() => {
    if (visoreIdx === null) return
    const handler = (e: KeyboardEvent) => {
      // Non navigare mentre si scrive (es. nota di rifiuto)
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      // Frecce A ROTAZIONE (26/07): dall'ultimo si riparte dal primo e viceversa
      if (e.key === 'Escape') chiudiVisoreAnimato()
      if (e.key === 'ArrowRight') setVisoreIdx(i => (i === null || totVoci === 0 ? i : (i + 1) % totVoci))
      if (e.key === 'ArrowLeft') setVisoreIdx(i => (i === null || totVoci === 0 ? i : (i - 1 + totVoci) % totVoci))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visoreIdx, totVoci])

  // La rotellina appare SOLO al primo caricamento: gli aggiornamenti
  // automatici e post-azione avvengono in silenzio (niente sobbalzi)
  async function carica(spinnerIniziale = false) {
    if (spinnerIniziale) setLoading(true)

    const { data: righe } = await supabase
      .from('pratica_documenti_checklist')
      .select('*')
      .eq('pratica_id', praticaId)

    const documentoIds = Array.from(new Set((righe || []).map((r: Record<string, unknown>) => r.documento_id as string)))
    const catalogo = new Map<string, Record<string, unknown>>()
    if (documentoIds.length > 0) {
      const { data: cats } = await supabase.from('casistiche_documenti').select('*').in('id', documentoIds)
      for (const c of cats || []) catalogo.set(c.id as string, c as Record<string, unknown>)
    }

    const lista: DocRiga[] = (righe || []).map((r: Record<string, unknown>) => {
      const cat = catalogo.get(r.documento_id as string) || {}
      return {
        id: r.id as string,
        documento_id: r.documento_id as string,
        indice_erede: (r.indice_erede as number | null) ?? null,
        stato: (r.stato as DocRiga['stato']) || 'da_fare',
        file_url: (r.file_url as string | null) ?? null,
        nota_admin: (r.nota_admin as string | null) ?? null,
        codice: (cat.codice as string) ?? '',
        nome: (cat.nome as string) ?? 'Documento',
        per_erede: !!cat.per_erede,
        richiede_upload: !!cat.richiede_upload,
        template_pdf: (cat.template_pdf as string | null) ?? null,
        ordine: (cat.ordine as number) ?? 0,
      }
    })
    lista.sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))

    // Signed URL per il bucket privato (riusati tra una ricarica e l'altra:
    // niente lampeggi delle immagini durante gli aggiornamenti silenziosi)
    const sm: Record<string, string> = { ...signedRef.current }
    for (const d of lista) {
      for (const f of leggiFile(d.file_url)) {
        if (sm[f.url]) continue
        const path = estraiPathBucket(f.url, 'documenti-pratiche')
        if (!path) continue
        const { data } = await supabase.storage.from('documenti-pratiche').createSignedUrl(path, 3600)
        if (data?.signedUrl) sm[f.url] = data.signedUrl
      }
    }
    signedRef.current = sm
    setSignedMap(sm)

    const { data: fotos } = await supabase
      .from('foto_pratiche')
      .select('*')
      .eq('pratica_id', praticaId)
      .order('caricato_il')

    const { data: prat } = await supabase
      .from('pratiche')
      .select('libretto, certificato_proprieta, casistica, fermo_amministrativo, delegato_nome, delegato_telefono, numero_eredi, targhe_presenti')
      .eq('id', praticaId)
      .single()

    setDocs(lista)
    setFoto((fotos as FotoPratica[]) || [])
    setDati((prat as DatiPratica) || null)
    setLoading(false)

    // Auto-sincronizza lo stato della pratica coi documenti (self-heal all'apertura):
    // se i documenti sono già tutti approvati ma la pratica è rimasta indietro, la sblocca.
    aggiornaStatoPratica()
  }

  // Ricalcola lo stato della pratica in base ai documenti (lato server, col service role).
  // Ricarica la pratica solo se lo stato è effettivamente cambiato.
  async function aggiornaStatoPratica() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-stato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: praticaId }),
      })
      const data = await res.json().catch(() => null)
      if (data && data.cambiato === false) return
    } catch (e) {
      console.error('Errore aggiornamento stato pratica:', e)
    }
    onRicaricaPratica?.()
  }

  // ⭐ 28/07 sera: il traguardo "tutti i documenti approvati" entra da solo
  // nel registro della pratica (una volta sola, quando scatta)
  function segnaTuttiApprovati(aggiornate: DocRiga[]) {
    const daApprovare = aggiornate.filter(d => d.richiede_upload)
    const primaMancava = docs.filter(d => d.richiede_upload).some(d => d.stato !== 'approvato')
    if (primaMancava && daApprovare.length > 0 && daApprovare.every(d => d.stato === 'approvato')) {
      supabase.from('pratiche_note').insert({ pratica_id: praticaId, testo: 'Tutti i documenti sono a posto', evento: 'doc_approvati' }).then(() => {})
    }
  }

  async function approva(doc: DocRiga) {
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'approvato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', doc.id)
    const aggiornate = docs.map(d => d.id === doc.id ? { ...d, stato: 'approvato' as const, nota_admin: null } : d)
    segnaTuttiApprovati(aggiornate)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setAzione(false)
  }

  async function tornaInVerifica(doc: DocRiga) {
    setAzione(true)
    await supabase.from('pratica_documenti_checklist').update({ stato: 'caricato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', doc.id)
    const aggiornate = docs.map(d => d.id === doc.id ? { ...d, stato: 'caricato' as const, nota_admin: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setAzione(false)
  }

  async function confermaRifiuto() {
    if (!modalRifiuto) return
    if (!notaRifiuto.trim()) { setErrRifiuto('Scrivi (o scegli) cosa deve rifare il cliente.'); return }
    setErrRifiuto(null)
    setAzione(true)
    // ⭐ 28/07 sera (deciso con Davide): il rifiuto AZZERA i file — il
    // cliente ritrova il documento come alla prima vista (Scatta fronte/
    // retro o Allega file) col motivo in evidenza. Pulizia del bucket
    // best-effort: se una policy la blocca, la riga è comunque svuotata.
    const daRifiutare = docs.find(d => d.id === modalRifiuto.id)
    const vecchiFile = daRifiutare ? leggiFile(daRifiutare.file_url) : []
    await supabase.from('pratica_documenti_checklist').update({ stato: 'rifiutato', nota_admin: notaRifiuto.trim(), file_url: null, aggiornato_il: new Date().toISOString() }).eq('id', modalRifiuto.id)
    if (vecchiFile.length > 0) {
      supabase.storage.from('documenti-pratiche').remove(vecchiFile.map(f => f.url)).then(() => {})
    }
    // ⭐ 28/07 sera: il rifiuto entra nel registro (documento + motivo)
    supabase.from('pratiche_note').insert({ pratica_id: praticaId, testo: `${modalRifiuto.titolo}: "${notaRifiuto.trim()}"`, evento: 'doc_rifiutato' }).then(() => {})
    const aggiornate = docs.map(d => d.id === modalRifiuto.id ? { ...d, stato: 'rifiutato' as const, nota_admin: notaRifiuto.trim(), file_url: null } : d)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setModalRifiuto(null)
    setNotaRifiuto('')
    setAzione(false)
  }

  // Esito della telefonata "non sa che certificato ha": l'endpoint aggiorna
  // la pratica e sincronizza la checklist (cartaceo → documento da caricare
  // e da consegnare al ritiro; digitale → non serve nulla).
  async function impostaCdc(cdc: 'cartaceo' | 'digitale' | 'smarrito') {
    setAzione(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/pratica-cdc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pratica_id: praticaId, cdc }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Errore')
      await carica()
      onRicaricaPratica?.()
    } catch (e) {
      console.error('Errore impostazione certificato:', e)
      alert('Errore nel salvataggio. Riprova.')
    }
    setAzione(false)
  }

  async function approvaTutti() {
    const daVerificare = docs.filter(d => d.richiede_upload && d.stato === 'caricato')
    if (daVerificare.length === 0) return
    setAzione(true)
    for (const d of daVerificare) {
      await supabase.from('pratica_documenti_checklist').update({ stato: 'approvato', nota_admin: null, aggiornato_il: new Date().toISOString() }).eq('id', d.id)
    }
    const aggiornate = docs.map(d => (d.richiede_upload && d.stato === 'caricato') ? { ...d, stato: 'approvato' as const, nota_admin: null } : d)
    segnaTuttiApprovati(aggiornate)
    setDocs(aggiornate)
    await aggiornaStatoPratica()
    setAzione(false)
  }

  // -----------------------------
  // RENDER
  // -----------------------------

  if (loading) {
    // In modalità solo-visore niente spinner in pagina: il caricamento
    // avviene invisibile e la tendina non balla (27/07 sera)
    if (soloVisore) return null
    return (
      <div className="p-6 flex items-center justify-center" style={STILE_CARD}>
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const daApprovare = docs.filter(d => d.richiede_upload)
  const approvatiCount = daApprovare.filter(d => d.stato === 'approvato').length
  const daVerificareCount = daApprovare.filter(d => d.stato === 'caricato').length
  const daContattare = dati?.libretto === 'no' || dati?.certificato_proprieta === 'nessuno'

  // Documenti da mostrare: quelli che richiedono upload, ordinati per fase (da verificare → rifiutati → approvati → in attesa)
  const peso = (s: DocRiga['stato']) => ({ caricato: 0, rifiutato: 1, approvato: 2, da_fare: 3 }[s])
  const righeVisibili = [...daApprovare].sort((a, b) => peso(a.stato) - peso(b.stato) || a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))

  // ---- VISORE: fila unica documenti (con file) + foto del veicolo ----
  // Ordine STABILE (da catalogo, non per stato): così una voce non cambia
  // posto mentre la si approva dal visore.
  type Voce = { tipo: 'doc'; doc: DocRiga } | { tipo: 'foto'; foto: FotoPratica; n: number }
  const vociDocs = [...daApprovare]
    .sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))
    .filter(d => leggiFile(d.file_url).length > 0)
  const voci: Voce[] = [
    ...vociDocs.map(d => ({ tipo: 'doc' as const, doc: d })),
    ...foto.map((f, i) => ({ tipo: 'foto' as const, foto: f, n: i + 1 })),
  ]
  // Nomi PRECISI per l'admin (26/07): il possessivo del catalogo diventa
  // il ruolo vero della casistica ("Carta d'identità dell'intestatario")
  const nomeDoc = (d: DocRiga) => {
    const base = nomeAdmin(d.nome, dati?.casistica)
    return d.per_erede && d.indice_erede ? `${base} (${ordinaleErede(d.indice_erede)} erede)` : base
  }
  const titoloVoce = (v: Voce) => v.tipo === 'foto'
    ? `Foto del veicolo ${v.n}`
    : nomeDoc(v.doc)
  const apriVisoreDoc = (id: string) => { const i = voci.findIndex(v => v.tipo === 'doc' && v.doc.id === id); if (i >= 0) setVisoreIdx(i) }

  // ⭐ 27/07: SCARICO PDF (mockup definitivo). "Questo documento" oppure
  // selezione dall'elenco → UN PDF unico pronto da inoltrare (WhatsApp,
  // email a un commerciante). Immagini su pagina A4 con l'etichetta del
  // documento in alto; i PDF caricati dal cliente copiati pagina per pagina.
  const chiaveVoce = (v: Voce) => v.tipo === 'doc' ? `doc:${v.doc.id}` : `foto:${v.foto.id}`
  const toggleScelta = (v: Voce) => setScelte(prev => {
    const nuove = new Set(prev)
    const k = chiaveVoce(v)
    if (nuove.has(k)) nuove.delete(k); else nuove.add(k)
    return nuove
  })

  async function scaricaPdf(daIncludere: Voce[]) {
    if (daIncludere.length === 0 || pdfInCorso) return
    setPdfInCorso(true)
    setPdfErrore(null)
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const out = await PDFDocument.create()
      const font = await out.embedFont(StandardFonts.Helvetica)
      const falliti: string[] = []
      for (const v of daIncludere) {
        const titolo = titoloVoce(v)
        const files: { url: string; nome: string; lato?: string }[] = v.tipo === 'doc'
          ? leggiFile(v.doc.file_url).map(f => ({ url: signedMap[f.url] || f.url, nome: f.nome, lato: f.lato }))
          : [{ url: v.foto.url, nome: titolo }]
        for (const f of files) {
          const etichetta = f.lato ? `${titolo} (${f.lato})` : titolo
          try {
            const res = await fetch(f.url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const blob = await res.blob()
            const bytes = new Uint8Array(await blob.arrayBuffer())
            if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
              // È un PDF: pagine copiate così come sono
              const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
              for (const pg of await out.copyPages(src, src.getPageIndices())) out.addPage(pg)
            } else {
              let img
              if (bytes[0] === 0xFF && bytes[1] === 0xD8) img = await out.embedJpg(bytes)
              else if (bytes[0] === 0x89 && bytes[1] === 0x50) img = await out.embedPng(bytes)
              else {
                // Formato non nativo per pdf-lib (es. WebP): passa dal canvas
                const bmp = await createImageBitmap(blob)
                const canvas = document.createElement('canvas')
                canvas.width = bmp.width
                canvas.height = bmp.height
                canvas.getContext('2d')!.drawImage(bmp, 0, 0)
                img = await out.embedJpg(bytesDaDataUrl(canvas.toDataURL('image/jpeg', 0.9)))
              }
              // Pagina A4 verticale; l'etichetta in alto SOLO sui documenti —
              // le FOTO vanno pulite, senza scritte (richiesta Davide 27/07:
              // "solo anteprima, più ordinato")
              const conEtichetta = v.tipo === 'doc'
              const A4W = 595.28, A4H = 841.89, margine = 36
              const page = out.addPage([A4W, A4H])
              if (conEtichetta) page.drawText(etichetta.slice(0, 95), { x: margine, y: A4H - 26, size: 9, font, color: rgb(0.42, 0.47, 0.55) })
              const areaW = A4W - margine * 2
              const areaH = A4H - margine * 2 - (conEtichetta ? 14 : 0)
              const k = Math.min(areaW / img.width, areaH / img.height)
              page.drawImage(img, { x: (A4W - img.width * k) / 2, y: margine + (areaH - img.height * k) / 2, width: img.width * k, height: img.height * k })
            }
          } catch (e) {
            console.error('File saltato nel PDF:', f.nome, e)
            falliti.push(etichetta)
          }
        }
      }
      if (out.getPageCount() === 0) throw new Error('Nessun file incluso')
      // ⭐ 27/07 notte (richiesta Davide): il nome racconta il contenuto —
      // SOLO FOTO (tutte o alcune) = "Foto", un documento solo = il suo
      // nome, misto = "Documenti"
      const soloFoto = daIncludere.every(v => v.tipo === 'foto')
      const base = daIncludere.length === 1 && !soloFoto ? titoloVoce(daIncludere[0]) : soloFoto ? 'Foto' : 'Documenti'
      const nomeFile = nomeFileSicuro(`${base}${targa ? ` ${targa}` : ''}`) + '.pdf'
      const blobOut = new Blob([await out.save() as BlobPart], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blobOut)
      link.download = nomeFile
      link.click()
      URL.revokeObjectURL(link.href)
      if (falliti.length > 0) {
        setPdfErrore(`PDF scaricato, ma senza: ${falliti.join(', ')}.`)
      } else {
        setSelezione(false)
        setScelte(new Set())
      }
    } catch (e) {
      console.error('Errore creazione PDF:', e)
      setPdfErrore('Non sono riuscito a creare il PDF. Riprova.')
    }
    setPdfInCorso(false)
  }

  // La NUVOLETTA del rifiuto (27/07): appare ancorata al bottone "Rifiuta"
  // del documento giusto, ovunque quel bottone sia (visore o riga)
  const nuvolaRifiutoDi = (docId: string) => (modalRifiuto?.id === docId ? (
    <NuvolaRifiuto
      frasi={frasiRifiuto}
      nota={notaRifiuto}
      onNota={v => { setNotaRifiuto(v); setErrRifiuto(null) }}
      err={errRifiuto}
      occupato={azione}
      onAnnulla={() => { setModalRifiuto(null); setNotaRifiuto(''); setErrRifiuto(null) }}
      onConferma={confermaRifiuto}
      onFrasiCambiate={caricaFrasiRifiuto}
    />
  ) : null)
  const apriVisoreFoto = (id: string) => { const i = voci.findIndex(v => v.tipo === 'foto' && v.foto.id === id); if (i >= 0) setVisoreIdx(i) }

  // Approva e passa da solo al prossimo documento ancora da verificare
  async function approvaEAvanti(doc: DocRiga) {
    await approva(doc)
    const idx = visoreIdx ?? 0
    for (let k = 1; k <= voci.length; k++) {
      const j = (idx + k) % voci.length
      const v = voci[j]
      if (v.tipo === 'doc' && v.doc.id !== doc.id && v.doc.stato === 'caricato') { setVisoreIdx(j); return }
    }
  }

  return (
    <>
      {/* ⭐ QUINTA SCHEDA "Documenti" (27/07, variante 3 su mockup): sta IN
          FILA con Cliente · Casistiche · Veicolo · Ritiro, sempre in vista
          appena si apre la tendina (la pillola Documenti è sparita).
          Tesserine piccole senza nome (il nome al passaggio del mouse),
          badge di stato nell'angolo, "Verifica" nella testata apre il visore
          sul primo in attesa, clic su una tessera lo apre su quella. */}
      {compatta && !soloVisore && (
        <div style={{ flex: 1, minWidth: 245, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '11px 13px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 9 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0F1B33', minWidth: 0 }}>
              <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
              Documenti
              <span style={{ fontWeight: 400, fontSize: 10.5, color: '#64748B', whiteSpace: 'nowrap' }}>· {approvatiCount} di {daApprovare.length}{daVerificareCount > 0 ? ` · ${daVerificareCount} da verificare` : ''}</span>
            </span>
            {daVerificareCount > 0 && (
              <button
                onClick={() => { const primo = vociDocs.find(d => d.stato === 'caricato'); if (primo) apriVisoreDoc(primo.id) }}
                className="ml-auto flex items-center gap-1.5 transition-colors hover:bg-blue-700"
                style={{ background: '#2563EB', color: '#fff', border: 'none', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}
              >
                {/* Spunta nel cerchietto (27/07, scelta su mockup): via il play */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="16 9.5 10.7 14.8 8 12.2" /></svg>
                Verifica
              </button>
            )}
          </div>

          {/* Nota 27/07: l'avviso giallo "Da contattare" è stato TOLTO da qui
              (decisione Davide): le cose da chiarire del modulo si leggono
              nell'avviso blu della sezione Casistiche e le corregge l'admin
              con la matita. */}

          {loading ? (
            <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : righeVisibili.length === 0 && foto.length === 0 ? (
            <p className="text-xs" style={{ color: '#9AA7B5' }}>Nessun documento da approvare per questa pratica.</p>
          ) : (
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {[...daApprovare].sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0)).map(doc => {
                const files = leggiFile(doc.file_url)
                const primoFile = files[0]
                const url = primoFile ? (signedMap[primoFile.url] || primoFile.url) : null
                const conImg = !!url && !isPdfUrl(primoFile.nome) && !isPdfUrl(primoFile.url)
                const cliccabile = files.length > 0
                return (
                  <div
                    key={doc.id}
                    onClick={() => { if (cliccabile) apriVisoreDoc(doc.id) }}
                    title={nomeDoc(doc)}
                    className={cliccabile ? 'transition-all hover:!border-blue-300' : ''}
                    style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, background: '#EEF1F5', border: `1.5px ${doc.stato === 'da_fare' ? 'dashed' : 'solid'} #E5E7EB`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA7B5', cursor: cliccabile ? 'pointer' : 'default', overflow: 'visible', flexShrink: 0 }}
                  >
                    {conImg
                      ? /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6.5 }} />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 13, height: 13, borderRadius: 999, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: doc.stato === 'approvato' ? '#16A34A' : doc.stato === 'caricato' ? '#2563EB' : doc.stato === 'rifiutato' ? '#DC2626' : '#C7CCD4' }}>
                      {doc.stato === 'approvato' && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      {doc.stato === 'rifiutato' && <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                    </span>
                  </div>
                )
              })}
              {foto.length > 0 && (
                <div
                  onClick={() => apriVisoreFoto(foto[0].id)}
                  title={`Foto del veicolo · ${foto.length}`}
                  className="transition-all hover:!border-blue-300"
                  style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, border: '1.5px solid #E5E7EB', cursor: 'pointer', flexShrink: 0 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6.5 }} />
                  <span style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(15,23,42,0.65)', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 999, padding: '0px 5px' }}>{foto.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!compatta && !soloVisore && (<>
      {/* ⭐ 26/07: da chiusa TUTTA la card è cliccabile (non solo la testata),
          con accensione al passaggio del mouse */}
      <div
        className={`p-5 ${aperta ? '' : 'cursor-pointer transition-all hover:!border-blue-200 hover:!shadow-[0_2px_8px_rgba(37,99,235,0.10)]'}`}
        style={STILE_CARD}
        onClick={aperta ? undefined : onToggle}
      >
        <div className="flex items-center justify-between gap-3 cursor-pointer select-none" onClick={e => { e.stopPropagation(); onToggle() }}>
          <div>
            <TitoloCard>Documenti</TitoloCard>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>{approvatiCount} di {daApprovare.length} approvati{daVerificareCount > 0 ? ` · ${daVerificareCount} da verificare` : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {daVerificareCount > 0 && (
              <button onClick={e => { e.stopPropagation(); approvaTutti() }} disabled={azione} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50">
                Approva tutti
              </button>
            )}
            <span className="transition-transform" style={{ color: '#9AA7B5', transform: aperta ? 'rotate(180deg)' : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>
        </div>
        {aperta && (<>

        {/* BANNER "DA CONTATTARE" */}
        {daContattare && (
          <div className="flex items-start gap-2.5 mt-3 rounded-xl px-3 py-2.5" style={{ background: '#FDF7EA', border: '1.5px solid #F0DFB8' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div className="flex-1 min-w-0">
              <span className="text-xs" style={{ color: '#854F0B' }}>
                <span className="font-semibold">Da contattare: </span>
                {dati?.libretto === 'no' && 'il cliente non ha il libretto (né denuncia). '}
                {dati?.certificato_proprieta === 'nessuno' && 'il cliente non sa che certificato di proprietà ha. '}
                Chiamalo per capire la situazione prima di procedere.
              </span>
              {/* Esito verifica CDC: aggiorna pratica + checklist del cliente */}
              {dati?.certificato_proprieta === 'nessuno' && (
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  <span className="text-[11px] font-semibold" style={{ color: '#854F0B' }}>Dopo la verifica, che certificato ha?</span>
                  <BottoniCdc azione={azione} onScegli={impostaCdc} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nota 17/07: le pillole casistica e la correzione del CDC sono state
            SPOSTATE nella card "Dichiarazioni e casistica" della pagina (i dati
            stavano in due posti). Qui resta solo il banner "Da contattare". */}

        {/* LISTA DOCUMENTI */}
        {righeVisibili.length === 0 ? (
          <p className="text-sm text-gray-400 mt-4">Nessun documento da approvare per questa pratica.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {righeVisibili.map(doc => (
              <RigaDoc
                key={doc.id}
                doc={doc}
                signedMap={signedMap}
                azione={azione}
                onApri={() => apriVisoreDoc(doc.id)}
                onApprova={() => approva(doc)}
                onRifiuta={() => { setNotaRifiuto(doc.nota_admin || ''); setErrRifiuto(null); setModalRifiuto({ id: doc.id, titolo: nomeDoc(doc) }) }}
                onTornaInVerifica={() => tornaInVerifica(doc)}
                nuvola={nuvolaRifiutoDi(doc.id)}
              />
            ))}
          </div>
        )}
        </>)}
      </div>

      {/* FOTO DEL VEICOLO (sola visione) — segue l'apertura dei documenti */}
      {aperta && foto.length > 0 && (
        <div className="p-5" style={STILE_CARD}>
          <div className="mb-3"><TitoloCard>Foto del veicolo <span style={{ color: '#64748b', fontWeight: 400 }}>· {foto.length}</span></TitoloCard></div>
          <div className="flex flex-wrap gap-2">
            {foto.map((f, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={f.id} src={f.url} alt={`Foto ${idx + 1}`} onClick={() => apriVisoreFoto(f.id)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
            ))}
          </div>
        </div>
      )}
      </>)}

      {/* VISORE DOCUMENTI + FOTO: elenco a sinistra, frecce (anche da
          tastiera), Approva/Rifiuta senza mai chiudere la finestra */}
      {visoreIdx !== null && voci[visoreIdx] && (() => {
        const voce = voci[visoreIdx]
        const files = voce.tipo === 'doc' ? leggiFile(voce.doc.file_url) : []
        const nScelte = voci.filter(v => scelte.has(chiaveVoce(v))).length
        const miStile: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#1E293B', fontWeight: 600, cursor: 'pointer' }
        const mdescStile: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 400, color: '#8A94A3', marginTop: 1 }
        return (
          // ⭐ 27/07 notte (forma 3 su mockup): il visore è un PANNELLO che
          // SCIVOLA DA DESTRA a tutta altezza (via la finestra centrata con lo
          // sfondo scuro) — la pagina resta visibile a sinistra, clic fuori
          // o ✕ chiude. Overlay trasparente solo per il clic-fuori.
          <div className="fixed inset-0 z-50" onClick={chiudiVisoreAnimato}>
            {/* ⭐ Entra scivolando DA DESTRA e esce riscivolando VERSO DESTRA
                (richiesta Davide): animazione al montaggio + transizione in uscita */}
            <style>{'@keyframes visore-drawer{from{transform:translateX(105%)}to{transform:none}}'}</style>
            <div
              className="absolute top-0 right-0 bottom-0 bg-white flex flex-col overflow-hidden"
              style={{ width: 'min(960px, calc(100vw - 230px))', borderLeft: '1.5px solid #E5E7EB', boxShadow: '-18px 0 44px rgba(15,23,42,0.22)', animation: 'visore-drawer .24s ease', transition: 'transform .24s ease', transform: visoreChiudendo ? 'translateX(105%)' : undefined }}
              onClick={e => { e.stopPropagation(); if (menuScarica) setMenuScarica(false) }}
            >

              {/* ⭐ TESTATA gemella della tendina (variante A su mockup): via
                  la targhetta finta — quadratino con l'icona veicolo, targa ·
                  modello · anno nel blu di casa, cliente in grigio sotto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #DBEAFE', background: '#EFF6FF', flexShrink: 0 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="13" height="7" rx="1.5" /><path d="M16 11h3l2 3v2h-2" /><circle cx="7" cy="18" r="1.8" /><circle cx="16.5" cy="18" r="1.8" /></svg>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1D4ED8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[targa, veicolo].filter(Boolean).join(' · ') || 'Documenti'}</span>
                  {cliente && <span style={{ display: 'block', fontSize: 11.5, color: '#4B5563', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cliente}</span>}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuScarica(m => !m) }}
                    disabled={pdfInCorso}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1.5px solid #BFDBFE', borderRadius: 999, padding: '6px 13px', fontSize: 11.5, fontWeight: 700, color: '#1D4ED8', cursor: 'pointer', opacity: pdfInCorso ? 0.6 : 1 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    {pdfInCorso ? 'Preparo il PDF…' : 'Scarica'}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {menuScarica && (
                    <span onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 7px)', right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 10px 30px rgba(15,23,42,0.16)', padding: 5, minWidth: 240, zIndex: 20, display: 'block' }}>
                      <button className="transition-colors hover:bg-blue-50" onClick={() => { setMenuScarica(false); scaricaPdf([voce]) }} style={miStile}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <span>{voce.tipo === 'foto' ? 'Questa foto' : 'Questo documento'}<span style={mdescStile}>PDF di: {titoloVoce(voce)}</span></span>
                      </button>
                      <button className="transition-colors hover:bg-blue-50" onClick={() => { setMenuScarica(false); setSelezione(true); setScelte(new Set([chiaveVoce(voce)])) }} style={miStile}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><rect x="3" y="3" width="18" height="18" rx="4" /><polyline points="8 12 11 15 16 9" /></svg>
                        <span>Scegli cosa scaricare<span style={mdescStile}>Un unico PDF con documenti e foto scelti</span></span>
                      </button>
                    </span>
                  )}
                </span>
                <button onClick={chiudiVisoreAnimato} className="text-gray-400 hover:text-gray-700" style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

              {/* ELENCO A SINISTRA con le MINIATURE (27/07); in modalità
                  selezione compaiono le caselle e il clic sceglie la voce */}
              <div style={{ width: 262, borderRight: '1px solid #EEF1F5', background: '#FAFBFD', overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, padding: '0 16px 8px' }}>DOCUMENTI · {vociDocs.length}</div>
                {/* ⭐ 27/07 notte (variante A su mockup): nomi a peso normale
                    (600 solo sull'attiva) e stato a PALLINO colorato — verde
                    approvato, blu in verifica, rosso rifiutato */}
                {vociDocs.map((doc, i) => {
                  const v = voci[i]
                  const attiva = i === visoreIdx
                  const primoFile = leggiFile(doc.file_url)[0]
                  const thumbUrl = primoFile && !isPdfUrl(primoFile.nome) && !isPdfUrl(primoFile.url) ? (signedMap[primoFile.url] || primoFile.url) : null
                  return (
                    <button
                      key={doc.id}
                      onClick={() => { if (selezione) toggleScelta(v); else setVisoreIdx(i) }}
                      title={`${nomeDoc(doc)} · ${doc.stato === 'approvato' ? 'Approvato' : doc.stato === 'rifiutato' ? 'Rifiutato' : 'In verifica'}`}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9,
                        padding: '7px 14px', fontSize: 12, border: 'none', cursor: 'pointer',
                        background: attiva ? '#EFF6FF' : 'transparent', boxShadow: attiva ? 'inset 3px 0 0 #2563eb' : 'none',
                        color: attiva ? '#1D4ED8' : '#374151', fontWeight: attiva ? 600 : 400,
                      }}
                    >
                      {selezione && (
                        <input type="checkbox" readOnly checked={scelte.has(chiaveVoce(v))} style={{ accentColor: '#2563EB', width: 15, height: 15, flexShrink: 0, pointerEvents: 'none' }} />
                      )}
                      <span style={{ width: 28, height: 36, borderRadius: 5, flexShrink: 0, border: '1px solid #E2E8F0', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B6BFCC' }}>
                        {thumbUrl
                          ? /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeDoc(doc)}</span>
                      <span style={{ width: 9, height: 9, borderRadius: 999, flexShrink: 0, background: doc.stato === 'approvato' ? '#16A34A' : doc.stato === 'rifiutato' ? '#DC2626' : '#2563EB' }} />
                    </button>
                  )
                })}
                {/* ⭐ 27/07 notte (richiesta Davide): le FOTO sono SOLO
                    MINIATURE, niente descrizioni — griglia pulita di immagini */}
                {foto.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, padding: '10px 16px 8px', borderTop: '1px solid #EEF1F5', marginTop: 8 }}>FOTO DEL VEICOLO · {foto.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 14px 8px' }}>
                      {foto.map((f, idx) => {
                        const i = vociDocs.length + idx
                        const v = voci[i]
                        const attiva = i === visoreIdx
                        return (
                          <button
                            key={f.id}
                            onClick={() => { if (selezione) toggleScelta(v); else setVisoreIdx(i) }}
                            title={`Foto del veicolo ${idx + 1}`}
                            style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: attiva ? '2px solid #2563EB' : '1px solid #E2E8F0', boxShadow: attiva ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none', padding: 0, background: '#EEF1F5', cursor: 'pointer', flexShrink: 0 }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {selezione && (
                              <span style={{ position: 'absolute', top: 3, left: 3 }}>
                                <input type="checkbox" readOnly checked={scelte.has(chiaveVoce(v))} style={{ accentColor: '#2563EB', width: 14, height: 14, pointerEvents: 'none' }} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* AREA PRINCIPALE */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', minWidth: 0 }}>
                {/* Titolo a peso medio grigio scuro (variante A): via il nero pieno */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titoloVoce(voce)}</span>
                  <span style={{ fontSize: 11, color: '#9AA7B5', flexShrink: 0 }}>{visoreIdx + 1} di {voci.length}</span>
                </div>

                {/* ⭐ PALCO grigio ardesia (27/07, dosaggio 3 su mockup): FILE
                    (fronte/retro affiancati) o FOTO zoomabili, FRECCE AI LATI
                    trasparenti a metà altezza (restano anche ← → da tastiera) */}
                <div style={{ flex: 1, position: 'relative', minHeight: 0, borderRadius: 12, background: '#5D6A7E', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 12, display: 'flex', gap: 10 }}>
                    {voce.tipo === 'foto' ? (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <ZoomImg key={voce.foto.url} src={voce.foto.url} alt={titoloVoce(voce)} />
                      </div>
                    ) : files.map((f, i) => {
                      const url = signedMap[f.url] || f.url
                      return (
                        <div key={i} style={{ flex: 1, minWidth: 0 }}>
                          {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                            <PdfZoom key={url} src={url} badge={f.lato ? f.lato.toUpperCase() : undefined} />
                          ) : (
                            <ZoomImg key={url} src={url} alt={f.nome} badge={f.lato ? f.lato.toUpperCase() : undefined} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Frecce A ROTAZIONE (26/07): mai bloccate, dall'ultimo si
                      riparte dal primo e viceversa */}
                  <button
                    onClick={() => setVisoreIdx(i => (i === null || voci.length === 0 ? i : (i - 1 + voci.length) % voci.length))}
                    aria-label="Precedente"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 3 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button
                    onClick={() => setVisoreIdx(i => (i === null || voci.length === 0 ? i : (i + 1) % voci.length))}
                    aria-label="Successivo"
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 3 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>

                {pdfErrore && <p style={{ fontSize: 11.5, fontWeight: 600, color: '#C0392B', marginTop: 8, marginBottom: -4 }}>{pdfErrore}</p>}

                {/* AZIONI (nascoste mentre si sceglie cosa scaricare) */}
                {!selezione && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, minHeight: 34 }}>
                  <div style={{ flex: 1 }} />
                  {/* ⭐ 28/07 sera (mockup B): SOLO SIMBOLI — tondo rosso tenue
                      col ✕ per Rifiuta, tondo verde col ✓ per Approva (nome
                      al passaggio del mouse). "Approva" passa da solo al
                      prossimo. */}
                  {voce.tipo === 'doc' && voce.doc.stato === 'caricato' && (
                    <>
                      <span style={{ position: 'relative', display: 'inline-flex' }}>
                        <button onClick={() => { setNotaRifiuto(voce.doc.nota_admin || ''); setErrRifiuto(null); setModalRifiuto({ id: voce.doc.id, titolo: nomeDoc(voce.doc) }) }} disabled={azione} title="Rifiuta" aria-label="Rifiuta" className="transition-transform hover:scale-105" style={{ width: 38, height: 38, borderRadius: 999, background: '#FBE2E2', border: '1.5px solid #F3C8C8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: azione ? 0.5 : 1, cursor: 'pointer' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A94444" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        {nuvolaRifiutoDi(voce.doc.id)}
                      </span>
                      <button onClick={() => approvaEAvanti(voce.doc)} disabled={azione} title="Approva" aria-label="Approva" className="transition-transform hover:scale-105" style={{ width: 38, height: 38, borderRadius: 999, background: '#DCF3E4', border: '1.5px solid #C8E6D5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: azione ? 0.5 : 1, cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </button>
                    </>
                  )}
                  {voce.tipo === 'doc' && voce.doc.stato === 'approvato' && (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#1F7A43' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Approvato
                      </span>
                      <span style={{ position: 'relative', display: 'inline-flex' }}>
                        <button onClick={() => { setNotaRifiuto(voce.doc.nota_admin || ''); setErrRifiuto(null); setModalRifiuto({ id: voce.doc.id, titolo: nomeDoc(voce.doc) }) }} disabled={azione} title="Rifiuta" aria-label="Rifiuta" className="transition-transform hover:scale-105" style={{ width: 38, height: 38, borderRadius: 999, background: '#FBE2E2', border: '1.5px solid #F3C8C8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A94444" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        {nuvolaRifiutoDi(voce.doc.id)}
                      </span>
                    </>
                  )}
                  {voce.tipo === 'doc' && voce.doc.stato === 'rifiutato' && (
                    <>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#C0392B' }}>Rifiutato{voce.doc.nota_admin ? ` · "${voce.doc.nota_admin}"` : ''}</span>
                      <button onClick={() => tornaInVerifica(voce.doc)} disabled={azione} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 500, textDecoration: 'underline', cursor: 'pointer' }}>Rimetti in verifica</button>
                    </>
                  )}
                </div>
                )}

                {/* ⭐ BARRA DI SELEZIONE (27/07, mockup definitivo): solo
                    Annulla e Scarica PDF col conteggio, allineati a destra */}
                {selezione && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginTop: 12, minHeight: 34 }}>
                    <button onClick={() => { setSelezione(false); setScelte(new Set()); setPdfErrore(null) }} style={{ background: 'none', border: 'none', color: '#5B6779', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
                    <button
                      onClick={() => scaricaPdf(voci.filter(v => scelte.has(chiaveVoce(v))))}
                      disabled={nScelte === 0 || pdfInCorso}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: nScelte === 0 || pdfInCorso ? 0.5 : 1 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      {pdfInCorso ? 'Preparo il PDF…' : `Scarica PDF (${nScelte})`}
                    </button>
                  </div>
                )}
              </div>
              </div>

            </div>
          </div>
        )
      })()}

      {/* Nota 27/07: la finestra centrale del rifiuto è stata SOSTITUITA
          dalla NUVOLETTA ancorata ai bottoni "Rifiuta" (variante A su
          mockup), con frasi pronte modificabili lì dentro. */}
    </>
  )
}

// ============================================================
// NUVOLETTA RIFIUTO (27/07, variante A su mockup): ancorata al bottone
// "Rifiuta", col becco, il documento resta in vista. Frasi pronte a
// chips (un tocco riempie il campo, si ritocca e si conferma) e
// GESTIONE IN LINEA delle frasi (matita → elenco modificabile):
// niente finestre sopra la pagina. Frasi in messaggi_preimpostati
// con categoria 'rifiuto' (SQL 2026-07-27-frasi-rifiuto.sql).
// ============================================================

function NuvolaRifiuto({ frasi, nota, onNota, err, occupato, onAnnulla, onConferma, onFrasiCambiate }: {
  frasi: Preimpostato[]
  nota: string
  onNota: (v: string) => void
  err: string | null
  occupato: boolean
  onAnnulla: () => void
  onConferma: () => void
  onFrasiCambiate: () => Promise<void> | void
}) {
  const [gestione, setGestione] = useState(false)
  const [bozze, setBozze] = useState<Record<string, string>>({})
  const [nuova, setNuova] = useState('')
  const [busy, setBusy] = useState(false)

  async function salvaModifica(f: Preimpostato) {
    const t = (bozze[f.id] ?? f.testo).trim()
    if (!t || t === f.testo) { setBozze(b => { const n = { ...b }; delete n[f.id]; return n }); return }
    setBusy(true)
    const { error } = await supabase.from('messaggi_preimpostati').update({ testo: t }).eq('id', f.id)
    if (!error) { setBozze(b => { const n = { ...b }; delete n[f.id]; return n }); await onFrasiCambiate() }
    setBusy(false)
  }

  async function elimina(f: Preimpostato) {
    setBusy(true)
    const { error } = await supabase.from('messaggi_preimpostati').delete().eq('id', f.id)
    if (!error) await onFrasiCambiate()
    setBusy(false)
  }

  async function aggiungi() {
    const t = nuova.trim()
    if (!t) return
    setBusy(true)
    const ordineMax = frasi.reduce((m, f) => Math.max(m, f.ordine), 0)
    const { error } = await supabase.from('messaggi_preimpostati').insert({ testo: t, ordine: ordineMax + 1, categoria: 'rifiuto' })
    if (!error) { setNuova(''); await onFrasiCambiate() }
    setBusy(false)
  }

  const campoSlim = 'flex-1 min-w-0 border-[1.5px] border-gray-200 px-3 py-[6px] text-[11.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400 resize-none'

  return (
    <>
      {/* Strato invisibile: clic fuori = chiudi, la pagina resta viva */}
      <div onClick={() => { if (!occupato && !busy) onAnnulla() }} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
      <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, width: 330, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, boxShadow: '0 14px 40px rgba(15,23,42,0.22)', padding: 12, zIndex: 60, textAlign: 'left', cursor: 'default' }}>
        <div style={{ position: 'absolute', bottom: -6, right: 22, width: 10, height: 10, background: '#fff', borderRight: '1.5px solid #E5E7EB', borderBottom: '1.5px solid #E5E7EB', transform: 'rotate(45deg)' }} />

        {gestione ? (
          <>
            {/* GESTIONE FRASI in linea: freccetta per tornare al rifiuto */}
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <button onClick={() => setGestione(false)} aria-label="Torna al rifiuto" className="flex items-center justify-center transition-colors hover:bg-blue-50" style={{ width: 24, height: 24, borderRadius: 8, background: 'none', border: '1.5px solid #E5E7EB', color: '#1D4ED8', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0F1B33' }}>
                <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
                Frasi pronte del rifiuto
              </span>
            </div>
            <div className="overflow-y-auto flex flex-col gap-1.5" style={{ maxHeight: 190, marginTop: 4 }}>
              {frasi.length === 0 && <p style={{ fontSize: 11, color: '#9AA7B5', padding: '4px 0' }}>Nessuna frase salvata: scrivi la prima qui sotto.</p>}
              {frasi.map(f => {
                const bozza = bozze[f.id] ?? f.testo
                const modificata = bozza.trim() !== f.testo
                return (
                  <div key={f.id} className="flex gap-1.5 items-center">
                    <textarea value={bozza} onChange={e => setBozze(b => ({ ...b, [f.id]: e.target.value }))} rows={1} className={campoSlim} style={{ borderRadius: 15 }} />
                    {modificata && (
                      <button onClick={() => salvaModifica(f)} disabled={busy} className="flex-shrink-0 transition-colors hover:bg-blue-700 disabled:opacity-40" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', border: 'none', cursor: 'pointer' }}>Salva</button>
                    )}
                    <button onClick={() => elimina(f)} disabled={busy} aria-label="Elimina frase" className="flex-shrink-0 flex items-center justify-center transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40" style={{ width: 24, height: 24, borderRadius: 8, background: 'none', border: 'none', color: '#A65D5D', cursor: 'pointer' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1.5 items-center" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F4F8' }}>
              <textarea value={nuova} onChange={e => setNuova(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aggiungi() } }} rows={1} placeholder="Nuova frase pronta…" className={campoSlim} style={{ borderRadius: 15 }} />
              <button onClick={aggiungi} disabled={busy || !nuova.trim()} className="flex-shrink-0 transition-colors hover:bg-blue-700 disabled:opacity-40" style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '5px 12px', border: 'none', cursor: 'pointer' }}>Aggiungi</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2" style={{ marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', flex: 1 }}>Cosa deve rifare il cliente?</span>
              <button onClick={() => setGestione(true)} aria-label="Modifica le frasi pronte" title="Modifica le frasi pronte" className="flex items-center justify-center transition-colors hover:bg-blue-50" style={{ width: 24, height: 24, borderRadius: 8, background: 'none', border: '1.5px solid #E5E7EB', color: '#1D4ED8', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
              </button>
            </div>
            {frasi.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 5, marginBottom: 8 }}>
                {frasi.map(f => (
                  <button key={f.id} onClick={() => onNota(f.testo)} title={f.testo} className="transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700" style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontSize: 10.5, fontWeight: 600, borderRadius: 999, padding: '4px 10px', cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.testo}
                  </button>
                ))}
              </div>
            )}
            <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 10px' }} className="focus-within:!border-blue-300">
              <textarea
                value={nota}
                onChange={e => onNota(e.target.value)}
                rows={2}
                placeholder="Oppure scrivilo con parole tue…"
                autoFocus
                className="w-full outline-none resize-none"
                style={{ border: 'none', background: 'transparent', fontSize: 12.5, color: '#111827' }}
              />
            </div>
            {err && <div style={{ fontSize: 10.5, color: '#DC2626', marginTop: 6 }}>{err}</div>}
            <div className="flex items-center justify-end gap-8" style={{ gap: 8, marginTop: 9 }}>
              <button onClick={onAnnulla} disabled={occupato} className="disabled:opacity-50" style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
              <button onClick={onConferma} disabled={occupato} className="transition-colors hover:!bg-[#D25151] disabled:opacity-50" style={{ background: '#E15E5E', color: '#fff', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                {occupato ? 'Un attimo…' : 'Rifiuta e avvisa il cliente'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ============================================================
// SOTTOCOMPONENTI
// ============================================================

function RigaDoc(props: {
  doc: DocRiga
  signedMap: Record<string, string>
  azione: boolean
  onApri: () => void
  onApprova: () => void
  onRifiuta: () => void
  onTornaInVerifica: () => void
  // Nuvoletta del rifiuto ancorata al bottone di QUESTA riga (27/07)
  nuvola?: React.ReactNode
}) {
  const { doc } = props
  const files = leggiFile(doc.file_url)
  const titolo = doc.per_erede && doc.indice_erede ? `${doc.nome} (${ordinaleErede(doc.indice_erede)} erede)` : doc.nome

  const bordo = doc.stato === 'approvato' ? '#C8E6D5' : doc.stato === 'rifiutato' ? '#F3C8C8' : '#E5E7EB'
  const bg = doc.stato === 'approvato' ? '#F1FAF4' : doc.stato === 'rifiutato' ? '#FEF6F6' : '#fff'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${bordo}`, borderRadius: 12, padding: '10px 12px', background: bg }}>
      {/* Miniature */}
      {files.length > 0 ? (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {files.slice(0, 3).map((f, i) => {
            const url = props.signedMap[f.url] || f.url
            return (
              <button key={i} onClick={() => props.onApri()} style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff', flexShrink: 0, position: 'relative' }} title={f.lato || undefined}>
                {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                  <div style={{ width: '100%', height: '100%', background: '#fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ width: 42, height: 42, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      )}

      {/* Nome + stato */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{titolo}</div>
        {doc.stato === 'caricato' && <span style={{ display: 'inline-block', fontSize: 11, color: '#1E4E8C', background: '#E0EDFB', padding: '2px 8px', borderRadius: 20, marginTop: 3 }}>In verifica</span>}
        {doc.stato === 'approvato' && <div style={{ fontSize: 11, color: '#1F7A43', fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Approvato</div>}
        {doc.stato === 'rifiutato' && (
          <div style={{ marginTop: 3 }}>
            <div style={{ fontSize: 11, color: '#C0392B', fontWeight: 600 }}>Rifiutato</div>
            {doc.nota_admin && <div style={{ fontSize: 11, color: '#B03A2E', fontStyle: 'italic', marginTop: 1 }}>&quot;{doc.nota_admin}&quot;</div>}
          </div>
        )}
        {doc.stato === 'da_fare' && <span style={{ display: 'inline-block', fontSize: 11, color: '#8a98a8', marginTop: 3 }}>In attesa dal cliente</span>}
      </div>

      {/* Azioni */}
      <div style={{ flexShrink: 0 }}>
        {doc.stato === 'caricato' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={props.onApprova} disabled={props.azione} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, opacity: props.azione ? 0.5 : 1 }}>Approva</button>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button onClick={props.onRifiuta} disabled={props.azione} style={{ background: '#fff', color: '#C0392B', border: '1.5px solid #F3C8C8', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, opacity: props.azione ? 0.5 : 1 }}>Rifiuta</button>
              {props.nuvola}
            </span>
          </div>
        )}
        {(doc.stato === 'approvato' || doc.stato === 'rifiutato') && (
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button onClick={doc.stato === 'approvato' ? props.onRifiuta : props.onTornaInVerifica} disabled={props.azione} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
              {doc.stato === 'approvato' ? 'Rifiuta' : 'Rimetti in verifica'}
            </button>
            {doc.stato === 'approvato' ? props.nuvola : null}
          </span>
        )}
      </div>
    </div>
  )
}
