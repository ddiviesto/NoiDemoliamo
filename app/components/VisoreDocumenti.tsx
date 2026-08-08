'use client'

/**
 * VISORE DOCUMENTI CONDIVISO (07/08) — i pezzi del visore del CRM admin
 * messi in comune, così admin e demolitore restano gemelli per sempre:
 *  - ZoomImg: immagine zoomabile (rotella, trascina, barretta − / % / +)
 *  - PdfZoom: le pagine del PDF diventano immagini nello stesso visore
 *  - nomeAdmin: il possessivo del catalogo cliente diventa il RUOLO
 *    secondo la casistica ("Carta d'identità dell'intestatario")
 *  - scaricaPdfVoci: lo scarico del PDF unico pronto da inoltrare
 *  - VisoreDocumenti (default): il pannello che scivola da destra in
 *    SOLA LETTURA — palco scuro, elenco con miniature, frecce a
 *    rotazione, Scarica — SENZA Approva/Rifiuta. Lo usa l'area
 *    demolitore (dati dagli endpoint suoi, URL già firmati dal server).
 */

import { useEffect, useRef, useState } from 'react'

export interface FileVisore {
  url: string
  nome?: string
  lato?: string
}

export interface DocVisore {
  titolo: string
  files: FileVisore[]
}

// ---- nomi col RUOLO della casistica (26/07, spostato qui il 07/08) ----
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

export function nomeAdmin(nome: string, casistica: string | null | undefined): string {
  const ruolo = casistica ? RUOLO_CASISTICA[casistica] : null
  const m = nome.match(/^(la tua|il tuo)\s+(.+)$/i)
  if (m && ruolo) return m[2].charAt(0).toUpperCase() + m[2].slice(1) + ' ' + ruolo
  return nome
}

// ---- helper ----
export function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.pdf($|\?)/i.test(url)
}

function bytesDaDataUrl(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1])
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function nomeFileSicuro(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '').trim()
}

// ============================================================
// VISORE: IMMAGINE ZOOMABILE (26/07, mockup approvato: A + barretta
// della B). Rotella sempre attiva, da ingrandito trascini per
// spostarti, barretta − / % / + / Adatta sempre visibile in basso.
// ============================================================

const SCALE_ZOOM = [1, 1.5, 2, 3, 4]

export function ZoomImg({ src, alt, badge }: { src: string; alt: string; badge?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)

  // La rotella regola lo zoom SEMPRE, appena sei sopra. Listener manuale
  // non-passivo: React registra onWheel come passivo e il preventDefault
  // non avrebbe effetto.
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
// nello STESSO visore delle foto (trascina, rotella, barretta).
// ============================================================

export function PdfZoom({ src, badge }: { src: string; badge?: string }) {
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
// SCARICO PDF (27/07, spostato qui il 07/08): UN PDF unico pronto da
// inoltrare. Immagini su pagina A4 con l'etichetta del documento in
// alto (le FOTO vanno pulite, senza scritte); i PDF caricati dal
// cliente copiati pagina per pagina. Ritorna l'elenco dei file saltati.
// ============================================================

export interface VocePdf {
  titolo: string
  tipo: 'doc' | 'foto'
  files: FileVisore[]
}

export async function scaricaPdfVoci(daIncludere: VocePdf[], targa?: string | null): Promise<string[]> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const out = await PDFDocument.create()
  const font = await out.embedFont(StandardFonts.Helvetica)
  const falliti: string[] = []
  for (const v of daIncludere) {
    for (const f of v.files) {
      const etichetta = f.lato ? `${v.titolo} (${f.lato})` : v.titolo
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
          // Pagina A4 verticale; l'etichetta in alto SOLO sui documenti
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
        console.error('File saltato nel PDF:', f.nome || f.url, e)
        falliti.push(etichetta)
      }
    }
  }
  if (out.getPageCount() === 0) throw new Error('Nessun file incluso')
  // Il nome racconta il contenuto: SOLO FOTO = "Foto", un documento solo =
  // il suo nome, misto = "Documenti"
  const soloFoto = daIncludere.every(v => v.tipo === 'foto')
  const base = daIncludere.length === 1 && !soloFoto ? daIncludere[0].titolo : soloFoto ? 'Foto' : 'Documenti'
  const nomeFile = nomeFileSicuro(`${base}${targa ? ` ${targa}` : ''}`) + '.pdf'
  const blobOut = new Blob([await out.save() as BlobPart], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blobOut)
  link.download = nomeFile
  link.click()
  URL.revokeObjectURL(link.href)
  return falliti
}

// ============================================================
// VISORE IN SOLA LETTURA (default) — il pannello del CRM senza
// Approva/Rifiuta. Si apre quando `apriTrigger` cambia (la pillola
// "Documenti e Foto" lo incrementa); riclic a visore aperto = chiusura
// animata (toggle), come nel CRM. Esc, ✕ e clic fuori chiudono.
// ============================================================

export default function VisoreDocumenti({ apriTrigger, documenti, foto, targa, veicolo, cliente, onStatoAperto }: {
  apriTrigger: number
  documenti: DocVisore[]
  foto: string[]
  targa?: string | null
  veicolo?: string | null
  cliente?: string | null
  /** per tenere accesa la pillola che l'ha aperto */
  onStatoAperto?: (aperto: boolean) => void
}) {
  type Voce = { tipo: 'doc'; doc: DocVisore } | { tipo: 'foto'; url: string; n: number }
  const voci: Voce[] = [
    ...documenti.map(d => ({ tipo: 'doc' as const, doc: d })),
    ...foto.map((url, i) => ({ tipo: 'foto' as const, url, n: i + 1 })),
  ]
  const titoloVoce = (v: Voce) => v.tipo === 'foto' ? `Foto del veicolo ${v.n}` : v.doc.titolo

  const [visoreIdx, setVisoreIdx] = useState<number | null>(null)
  const [visoreChiudendo, setVisoreChiudendo] = useState(false)
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
  function chiudiVisoreAnimato() {
    if (visoreIdx === null || visoreChiudendo) return
    setVisoreChiudendo(true)
    setTimeout(() => { setVisoreChiudendo(false); chiudiVisore() }, 240)
  }

  // Apertura su comando dall'esterno; il ref parte dal valore del montaggio
  // così un trigger vecchio non riapre il visore al rimontaggio
  const triggerGestito = useRef(apriTrigger ?? 0)
  useEffect(() => {
    if (apriTrigger == null || apriTrigger <= triggerGestito.current) return
    triggerGestito.current = apriTrigger
    if (visoreIdx !== null) { chiudiVisoreAnimato(); return }
    if (voci.length > 0) setVisoreIdx(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apriTrigger])

  const visoreAperto = visoreIdx !== null
  const statoRef = useRef(onStatoAperto)
  useEffect(() => { statoRef.current = onStatoAperto }, [onStatoAperto])
  useEffect(() => { statoRef.current?.(visoreAperto) }, [visoreAperto])

  // Col visore aperto la pagina dietro NON scorre
  useEffect(() => {
    if (!visoreAperto) return
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [visoreAperto])

  // Navigazione da tastiera (← → a rotazione, Esc per chiudere)
  useEffect(() => {
    if (visoreIdx === null) return
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      if (e.key === 'Escape') chiudiVisoreAnimato()
      if (e.key === 'ArrowRight') setVisoreIdx(i => (i === null || voci.length === 0 ? i : (i + 1) % voci.length))
      if (e.key === 'ArrowLeft') setVisoreIdx(i => (i === null || voci.length === 0 ? i : (i - 1 + voci.length) % voci.length))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visoreIdx, voci.length])

  const chiaveVoce = (v: Voce) => v.tipo === 'doc' ? `doc:${v.doc.titolo}` : `foto:${v.url}`
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
      const items: VocePdf[] = daIncludere.map(v => v.tipo === 'doc'
        ? { titolo: v.doc.titolo, tipo: 'doc' as const, files: v.doc.files }
        : { titolo: titoloVoce(v), tipo: 'foto' as const, files: [{ url: v.url, nome: titoloVoce(v) }] })
      const falliti = await scaricaPdfVoci(items, targa)
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

  if (visoreIdx === null || !voci[visoreIdx]) return null

  const voce = voci[visoreIdx]
  const files = voce.tipo === 'doc' ? voce.doc.files : []
  const nScelte = voci.filter(v => scelte.has(chiaveVoce(v))).length
  const nDocs = documenti.length
  const miStile: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: '#1E293B', fontWeight: 600, cursor: 'pointer' }
  const mdescStile: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 400, color: '#8A94A3', marginTop: 1 }

  return (
    // Il visore è un PANNELLO che SCIVOLA DA DESTRA a tutta altezza — la
    // pagina resta visibile a sinistra, clic fuori o ✕ chiude. Overlay
    // trasparente solo per il clic-fuori.
    <div className="fixed inset-0 z-50" onClick={chiudiVisoreAnimato}>
      <style>{'@keyframes visore-drawer{from{transform:translateX(105%)}to{transform:none}}'}</style>
      <div
        className="absolute top-0 right-0 bottom-0 bg-white flex flex-col overflow-hidden"
        style={{ width: 'min(960px, calc(100vw - 230px))', minWidth: 'min(100vw, 520px)', borderLeft: '1.5px solid #E5E7EB', boxShadow: '-18px 0 44px rgba(15,23,42,0.22)', animation: 'visore-drawer .24s ease', transition: 'transform .24s ease', transform: visoreChiudendo ? 'translateX(105%)' : undefined }}
        onClick={e => { e.stopPropagation(); if (menuScarica) setMenuScarica(false) }}
      >

        {/* TESTATA gemella della tendina: quadratino con l'icona veicolo,
            targa · modello · anno nel blu di casa, cliente in grigio sotto */}
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

          {/* ELENCO A SINISTRA con le miniature; in modalità selezione
              compaiono le caselle e il clic sceglie la voce. Niente pallini
              di stato: qui è tutto già approvato */}
          <div style={{ width: 262, borderRight: '1px solid #EEF1F5', background: '#FAFBFD', overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px 0', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, padding: '0 16px 8px' }}>DOCUMENTI · {nDocs}</div>
            {documenti.map((doc, i) => {
              const v = voci[i]
              const attiva = i === visoreIdx
              const primoFile = doc.files[0]
              const thumbUrl = primoFile && !isPdfUrl(primoFile.nome) && !isPdfUrl(primoFile.url) ? primoFile.url : null
              return (
                <button
                  key={i}
                  onClick={() => { if (selezione) toggleScelta(v); else setVisoreIdx(i) }}
                  title={doc.titolo}
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
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titolo}</span>
                </button>
              )
            })}
            {/* Le FOTO sono SOLO MINIATURE, griglia pulita di immagini */}
            {foto.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.6, padding: '10px 16px 8px', borderTop: '1px solid #EEF1F5', marginTop: 8 }}>FOTO DEL VEICOLO · {foto.length}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 14px 8px' }}>
                  {foto.map((url, idx) => {
                    const i = nDocs + idx
                    const v = voci[i]
                    const attiva = i === visoreIdx
                    return (
                      <button
                        key={idx}
                        onClick={() => { if (selezione) toggleScelta(v); else setVisoreIdx(i) }}
                        title={`Foto del veicolo ${idx + 1}`}
                        style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: attiva ? '2px solid #2563EB' : '1px solid #E2E8F0', boxShadow: attiva ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none', padding: 0, background: '#EEF1F5', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titoloVoce(voce)}</span>
              <span style={{ fontSize: 11, color: '#9AA7B5', flexShrink: 0 }}>{visoreIdx + 1} di {voci.length}</span>
            </div>

            {/* PALCO grigio ardesia: FILE (fronte/retro affiancati) o FOTO
                zoomabili, FRECCE AI LATI a rotazione (anche ← → da tastiera) */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0, borderRadius: 12, background: '#5D6A7E', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 12, display: 'flex', gap: 10 }}>
                {voce.tipo === 'foto' ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ZoomImg key={voce.url} src={voce.url} alt={titoloVoce(voce)} />
                  </div>
                ) : files.map((f, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 0 }}>
                    {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                      <PdfZoom key={f.url} src={f.url} badge={f.lato ? f.lato.toUpperCase() : undefined} />
                    ) : (
                      <ZoomImg key={f.url} src={f.url} alt={f.nome || titoloVoce(voce)} badge={f.lato ? f.lato.toUpperCase() : undefined} />
                    )}
                  </div>
                ))}
              </div>
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

            {pdfErrore && <p style={{ fontSize: 11.5, fontWeight: 600, color: '#C0392B', marginTop: 8 }}>{pdfErrore}</p>}

            {/* BARRA DI SELEZIONE: solo Annulla e Scarica PDF col conteggio */}
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
}
