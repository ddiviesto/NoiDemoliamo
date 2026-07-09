'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pratica } from './page'

// ============================================================
// TIPI
// ============================================================

interface DocChecklist {
  id: string
  pratica_id: string
  documento_id: string
  indice_erede: number | null
  stato: 'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
  file_url: string | null
  scaricato_il: string | null
  caricato_il: string | null
  nota_admin: string | null
  codice: string
  nome: string
  descrizione: string | null
  richiede_upload: boolean
  richiede_consegna: boolean
  template_pdf: string | null
  per_erede: boolean
  ordine: number
}

interface FileCaricato {
  url: string
  nome: string
  lato?: 'fronte' | 'retro'   // valorizzato solo per i documenti fronte/retro caricati in due caselle
}

interface FotoPratica {
  id: string
  pratica_id: string
  url: string
  caricato_il: string
  stato_approvazione?: 'approvato' | 'rifiutato' | 'in_attesa'
  nota_admin?: string | null
}

interface Props {
  pratica: Pratica
  onDocRifiutatiCambiati?: (numero: number) => void
  onStatoCambiato?: () => void
}

// ============================================================
// STATI in cui il cliente PUO' ancora modificare
// ============================================================

const STATI_MODIFICABILI_DA_CLIENTE = [
  'in_attesa_documenti',
  'in_attesa_approvazione_admin',
  'documenti_parzialmente_approvati',
  'da_assegnare',
  'in_attesa_assegnazione',
  'in_assegnazione_manuale',
]

function clientePuoEliminare(stato: string | null | undefined): boolean {
  if (!stato) return true
  return STATI_MODIFICABILI_DA_CLIENTE.includes(stato)
}

// ============================================================
// HELPER FILE
// ============================================================

function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /\.pdf($|\?)/i.test(url)
}

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

function scriviFile(files: FileCaricato[]): string | null {
  if (files.length === 0) return null
  return JSON.stringify(files.map(f => f.lato ? { url: f.url, nome: f.nome, lato: f.lato } : { url: f.url, nome: f.nome }))
}

function estraiPathBucket(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length).split('?')[0]
}

// ============================================================
// ICONE GENERALI (vettoriali sottili)
// ============================================================

function IcoCamera({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IcoFile({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function IcoCheck({ size = 21, color = '#1D9E75' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <polyline points="8.5 12 11 14.5 15.5 9.5"/>
    </svg>
  )
}

function IcoClock({ size = 21, color = '#d99412' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <polyline points="12 7 12 12 15.5 13.5"/>
    </svg>
  )
}

function IcoAlert({ size = 14, color = '#c0392b' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <line x1="12" y1="7.5" x2="12" y2="13"/>
      <line x1="12" y1="16.3" x2="12" y2="16.3"/>
    </svg>
  )
}

function IcoSend({ size = 15, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function IcoPackage({ size = 21, color = '#5dca9e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

function IcoChevronDown({ size = 19, color = '#5e7290' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ============================================================
// ICONA PER TIPO DI DOCUMENTO (nel quadratino blu)
// ============================================================

function IconaTipoDocumento({ nome, color }: { nome: string; color: string }) {
  const n = nome.toLowerCase()
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const, stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (n.includes('libretto') || n.includes('circolazione')) {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    )
  }
  if (n.includes('identità') || n.includes('identita') || n.includes('patente')) {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2"/>
        <circle cx="9" cy="11" r="2"/>
        <path d="M6 16c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5"/>
        <line x1="14" y1="10" x2="18" y2="10"/>
        <line x1="14" y1="13" x2="18" y2="13"/>
      </svg>
    )
  }
  if (n.includes('sanitaria') || n.includes('codice fiscale')) {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2"/>
        <path d="M12 8.5v6M9 11.5h6"/>
      </svg>
    )
  }
  if (n.includes('proprietà') || n.includes('proprieta') || n.includes('cdp')) {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <circle cx="12" cy="15" r="2.2"/>
        <path d="M12 12.8v-1.3"/>
      </svg>
    )
  }
  if (n.includes('denuncia') || n.includes('smarrimento')) {
    return (
      <svg {...common}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
  }
  if (n.includes('delega')) {
    return (
      <svg {...common}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      </svg>
    )
  }
  if (n.includes('visura') || n.includes('camerale')) {
    return (
      <svg {...common}>
        <rect x="4" y="2" width="16" height="20" rx="1"/>
        <line x1="9" y1="7" x2="15" y2="7"/>
        <line x1="9" y1="11" x2="15" y2="11"/>
        <path d="M9 22v-4h6v4"/>
      </svg>
    )
  }
  // default: documento generico
  return (
    <svg {...common}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  )
}

// ============================================================
// ANELLO DI PROGRESSO
// ============================================================

function AnelloProgresso({ pronti, totale }: { pronti: number; totale: number }) {
  const r = 27
  const circ = 2 * Math.PI * r
  const perc = totale > 0 ? pronti / totale : 0
  const offset = circ * (1 - perc)
  return (
    <div style={{ position: 'relative', width: 66, height: 66, flexShrink: 0 }}>
      <svg width="66" height="66" viewBox="0 0 66 66">
        <circle cx="33" cy="33" r={r} fill="none" stroke="#eaf0f7" strokeWidth="7" />
        <circle cx="33" cy="33" r={r} fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 33 33)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: '#0d2144', lineHeight: 1 }}>{pronti}</span>
        <span style={{ fontSize: 10, color: '#9aa7b5', lineHeight: 1.3 }}>su {totale}</span>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPALE
// ============================================================

export default function TabDocumenti({ pratica, onDocRifiutatiCambiati, onStatoCambiato }: Props) {
  const [docs, setDocs] = useState<DocChecklist[]>([])
  const [foto, setFoto] = useState<FotoPratica[]>([])
  const [signedMap, setSignedMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [caricandoId, setCaricandoId] = useState<string | null>(null)
  const [inviandoId, setInviandoId] = useState<string | null>(null)
  const [anteprima, setAnteprima] = useState<{ url: string; titolo: string } | null>(null)
  const [confermaElimina, setConfermaElimina] = useState<{ doc: DocChecklist; fileIdx: number } | null>(null)
  const [confermaEliminaFoto, setConfermaEliminaFoto] = useState<FotoPratica | null>(null)
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState(false)
  const [sistematiAperti, setSistematiAperti] = useState(false)
  const [ritiroAperto, setRitiroAperto] = useState(false)

  const puoEliminare = clientePuoEliminare(pratica.stato)

  useEffect(() => {
    carica()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratica.id])

  async function carica() {
    setLoading(true)

    const { data: righe } = await supabase
      .from('pratica_documenti_checklist')
      .select('*')
      .eq('pratica_id', pratica.id)

    const documentoIds = Array.from(new Set((righe || []).map((r: Record<string, unknown>) => r.documento_id as string)))
    const catalogo = new Map<string, Record<string, unknown>>()
    if (documentoIds.length > 0) {
      const { data: cats } = await supabase
        .from('casistiche_documenti')
        .select('*')
        .in('id', documentoIds)
      for (const c of cats || []) {
        catalogo.set(c.id as string, c as Record<string, unknown>)
      }
    }

    const lista: DocChecklist[] = (righe || []).map((r: Record<string, unknown>) => {
      const cat = catalogo.get(r.documento_id as string) || {}
      return {
        id: r.id as string,
        pratica_id: r.pratica_id as string,
        documento_id: r.documento_id as string,
        indice_erede: (r.indice_erede as number | null) ?? null,
        stato: (r.stato as DocChecklist['stato']) || 'da_fare',
        file_url: (r.file_url as string | null) ?? null,
        scaricato_il: (r.scaricato_il as string | null) ?? null,
        caricato_il: (r.caricato_il as string | null) ?? null,
        nota_admin: (r.nota_admin as string | null) ?? null,
        codice: (cat.codice as string) ?? '',
        nome: (cat.nome as string) ?? 'Documento',
        descrizione: (cat.descrizione as string | null) ?? null,
        richiede_upload: !!cat.richiede_upload,
        richiede_consegna: !!cat.richiede_consegna,
        template_pdf: (cat.template_pdf as string | null) ?? null,
        per_erede: !!cat.per_erede,
        ordine: (cat.ordine as number) ?? 0,
      }
    })
    lista.sort((a, b) => a.ordine - b.ordine || (a.indice_erede ?? 0) - (b.indice_erede ?? 0))

    const sm: Record<string, string> = {}
    for (const d of lista) {
      for (const f of leggiFile(d.file_url)) {
        const path = estraiPathBucket(f.url, 'documenti-pratiche')
        if (!path) continue
        const { data } = await supabase.storage.from('documenti-pratiche').createSignedUrl(path, 3600)
        if (data?.signedUrl) sm[f.url] = data.signedUrl
      }
    }
    setSignedMap(sm)

    const { data: fotos } = await supabase
      .from('foto_pratiche')
      .select('*')
      .eq('pratica_id', pratica.id)
      .order('caricato_il')

    const { data: approvazioni } = await supabase
      .from('documenti_approvazione')
      .select('*')
      .eq('pratica_id', pratica.id)

    const mappaApprov = new Map<string, { stato: 'approvato' | 'rifiutato' | 'in_attesa'; nota: string | null }>()
    for (const a of approvazioni || []) {
      mappaApprov.set(a.tipo_documento, { stato: a.stato, nota: a.nota_admin })
    }

    const fotoArricchite: FotoPratica[] = (fotos || []).map((f: Record<string, unknown>) => {
      const appr = mappaApprov.get(`foto:${f.id as string}`)
      return {
        id: f.id as string,
        pratica_id: f.pratica_id as string,
        url: f.url as string,
        caricato_il: f.caricato_il as string,
        stato_approvazione: appr?.stato ?? 'in_attesa',
        nota_admin: appr?.nota ?? null,
      }
    })

    setDocs(lista)
    setFoto(fotoArricchite)
    setLoading(false)
  }

  useEffect(() => {
    if (!onDocRifiutatiCambiati) return
    const n = docs.filter(d => d.stato === 'rifiutato').length
    onDocRifiutatiCambiati(n)
  }, [docs, onDocRifiutatiCambiati])

  // Carica file MA NON invia in verifica: il documento resta "in preparazione"
  // finché il cliente non preme "Ho finito, invia in verifica".
  async function caricaFile(doc: DocChecklist, files: File[], lato?: 'fronte' | 'retro') {
    setCaricandoId(doc.id)
    try {
      const esistenti = leggiFile(doc.file_url)
      // Se sto caricando in una casella (fronte/retro) prendo un solo file e sostituisco quel lato
      const daCaricare = lato ? files.slice(0, 1) : files
      const nuovi: FileCaricato[] = []
      for (const file of daCaricare) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${pratica.id}/${doc.codice}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage
          .from('documenti-pratiche')
          .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
        if (error) throw error
        const { data: pub } = supabase.storage.from('documenti-pratiche').getPublicUrl(path)
        if (pub?.publicUrl) nuovi.push(lato ? { url: pub.publicUrl, nome: file.name, lato } : { url: pub.publicUrl, nome: file.name })
      }
      // In modalità casella: il nuovo file rimpiazza l'eventuale lato già presente
      const base = lato ? esistenti.filter(f => f.lato !== lato) : esistenti
      const tutti = [...base, ...nuovi]
      // Solo file_url: lo stato NON cambia (resta da_fare o rifiutato)
      await supabase
        .from('pratica_documenti_checklist')
        .update({ file_url: scriviFile(tutti) })
        .eq('id', doc.id)
      await carica()
    } catch (err) {
      console.error('Errore upload:', err)
      alert('Errore nel caricamento. Riprova.')
    }
    setCaricandoId(null)
  }

  // Chiede al server di ricalcolare lo stato della pratica (es. tutti i documenti
  // inviati → "in verifica"): così il banner in alto racconta la verità al cliente.
  async function ricalcolaStatoPratica() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/pratica-stato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ pratica_id: pratica.id }),
      })
      const json = await res.json().catch(() => null)
      if (json?.cambiato) onStatoCambiato?.()
    } catch (err) {
      console.error('Errore ricalcolo stato pratica:', err)
    }
  }

  // Invio manuale in verifica: qui il documento diventa "caricato"
  async function inviaInVerifica(doc: DocChecklist) {
    setInviandoId(doc.id)
    try {
      await supabase
        .from('pratica_documenti_checklist')
        .update({
          stato: 'caricato',
          caricato_il: new Date().toISOString(),
          nota_admin: null,
        })
        .eq('id', doc.id)
      await carica()
      await ricalcolaStatoPratica()
    } catch (err) {
      console.error('Errore invio in verifica:', err)
      alert('Errore nell\'invio. Riprova.')
    }
    setInviandoId(null)
  }

  async function eliminaFileConfermato() {
    if (!confermaElimina) return
    setEliminazioneInCorso(true)
    try {
      const { doc, fileIdx } = confermaElimina
      const files = leggiFile(doc.file_url)
      const daRimuovere = files[fileIdx]
      const rimanenti = files.filter((_, i) => i !== fileIdx)
      if (daRimuovere) {
        const path = estraiPathBucket(daRimuovere.url, 'documenti-pratiche')
        if (path) await supabase.storage.from('documenti-pratiche').remove([path])
      }
      // Se il documento era già inviato (caricato) e non restano file, torna da fare.
      // Se era in preparazione (da_fare/rifiutato), lo stato non cambia.
      const nuovoStato = doc.stato === 'caricato' && rimanenti.length === 0 ? 'da_fare' : doc.stato
      await supabase
        .from('pratica_documenti_checklist')
        .update({
          file_url: scriviFile(rimanenti),
          stato: nuovoStato,
          caricato_il: rimanenti.length === 0 ? null : doc.caricato_il,
        })
        .eq('id', doc.id)
      await carica()
      // Se il documento è tornato "da fare" lo stato pratica può regredire
      if (nuovoStato !== doc.stato) await ricalcolaStatoPratica()
    } catch (err) {
      console.error('Errore eliminazione:', err)
      alert('Errore nell\'eliminazione. Riprova.')
    }
    setEliminazioneInCorso(false)
    setConfermaElimina(null)
  }

  async function eliminaFotoConfermato() {
    if (!confermaEliminaFoto) return
    setEliminazioneInCorso(true)
    try {
      const f = confermaEliminaFoto
      const path = estraiPathBucket(f.url, 'foto-pratiche')
      if (path) await supabase.storage.from('foto-pratiche').remove([path])
      await supabase.from('foto_pratiche').delete().eq('id', f.id)
      await carica()
    } catch (err) {
      console.error('Errore eliminazione foto:', err)
      alert('Errore nell\'eliminazione. Riprova.')
    }
    setEliminazioneInCorso(false)
    setConfermaEliminaFoto(null)
  }

  async function uploadFotoExtra(files: File[]) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${pratica.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage
          .from('foto-pratiche')
          .upload(path, file, { contentType: file.type || 'image/jpeg' })
        if (error) throw error
        const { data: pub } = supabase.storage.from('foto-pratiche').getPublicUrl(path)
        if (pub?.publicUrl) {
          await supabase.from('foto_pratiche').insert({ pratica_id: pratica.id, url: pub.publicUrl })
        }
      } catch (err) {
        console.error('Errore foto:', err)
      }
    }
    await carica()
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // --- "Da chiarire insieme": il cliente ha detto di non avere né libretto né denuncia,
  //     o di non sapere che certificato ha → prima lo contatta NoiDemoliamo (telefono/WhatsApp).
  //     Il documento libretto viene tolto dalla lista attiva finché la situazione non è chiarita.
  const librettoDaChiarire = pratica.libretto === 'no'
  const cdcDaChiarire = pratica.certificato_proprieta === 'nessuno'
  const isDocLibretto = (d: DocChecklist) => d.codice === 'LIBRETTO_CIRCOLAZIONE' || d.codice === 'LIBRETTO_ESTERO'
  const docsAttivi = librettoDaChiarire ? docs.filter(d => !isDocLibretto(d)) : docs

  const sistemati = docsAttivi.filter(d => d.stato === 'caricato' || d.stato === 'approvato')
  const daFare = docsAttivi.filter(d => d.stato === 'da_fare' || d.stato === 'rifiutato')
  // WIZARD: tutti i documenti da fotografare in UN'UNICA fila (anche quelli
  // per erede), i rifiutati passano davanti. Moduli PDF e documenti senza
  // caricamento restano fuori dalla fila.
  const codaWizard = [
    ...daFare.filter(d => d.richiede_upload && !d.template_pdf && d.stato === 'rifiutato'),
    ...daFare.filter(d => d.richiede_upload && !d.template_pdf && d.stato !== 'rifiutato'),
  ]
  const docAttivo: DocChecklist | undefined = codaWizard[0]
  const daFareModuli = daFare.filter(d => d.template_pdf)
  const docUpload = docsAttivi.filter(d => d.richiede_upload && !d.template_pdf)
  const inviatiCount = docUpload.filter(d => d.stato === 'caricato' || d.stato === 'approvato').length
  const totaleDocWizard = docUpload.length
  const daConsegnare = docsAttivi.filter(d => d.richiede_consegna)

  const totale = docsAttivi.length
  const pronti = sistemati.length
  const tuttoApprovato = totale > 0 && docsAttivi.every(d => d.stato === 'approvato') && !librettoDaChiarire && !cdcDaChiarire
  // Tutti i documenti della fila sono stati inviati: il cliente ha finito,
  // ora la palla è di NoiDemoliamo (verifica).
  const tuttoInviato = !tuttoApprovato && !docAttivo && totaleDocWizard > 0 && inviatiCount === totaleDocWizard

  return (
    <div className="flex flex-col gap-3">

      {/* ====== STATO ====== */}
      {tuttoApprovato ? (
        <div style={{ background: '#eef7f1', border: '1.5px solid #c8e6d5', borderRadius: 18, padding: 20, textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 12px', background: '#1D9E75', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#0F6E56', margin: 0 }}>Documenti tutti approvati</p>
          <p style={{ fontSize: 12.5, color: '#3c7a60', marginTop: 4, lineHeight: 1.5 }}>È tutto in ordine. Tieni gli originali a portata di mano: ti serviranno il giorno del ritiro.</p>
        </div>
      ) : tuttoInviato ? (
        <div style={{ background: '#EDF4FC', border: '1.5px solid #C7DCF5', borderRadius: 18, padding: 20, textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 12px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#1E4E8C', margin: 0 }}>Hai fatto tutto</p>
          <p style={{ fontSize: 12.5, color: '#4A6FA5', marginTop: 4, lineHeight: 1.5 }}>È tutto in ordine. NoiDemoliamo sta controllando i tuoi documenti: ti avvisiamo al più presto, non devi fare altro.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '6px 6px 2px' }}>
          <AnelloProgresso pronti={pronti} totale={totale} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 16, color: '#0d2144' }}>
              {pronti === 0 ? 'Iniziamo!' : 'Stai andando bene!'}
            </div>
            <div style={{ fontSize: 12.5, color: '#7a8a9a', marginTop: 2, lineHeight: 1.4 }}>
              {daFare.length === 0 ? 'Documenti inviati, in attesa di verifica.' : 'Un documento alla volta: bastano le foto.'}
            </div>
          </div>
        </div>
      )}

      {/* ====== DA CHIARIRE INSIEME (libretto mancante / CDC sconosciuto) ====== */}
      {(librettoDaChiarire || cdcDaChiarire) && (
        <div style={{ background: '#FDF7EA', border: '1.5px solid #F0DFB8', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: '#111827' }}>Da chiarire insieme</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Ti chiamiamo noi al più presto</div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {librettoDaChiarire && (
              <div style={{ fontSize: 12.5, color: '#854F0B', lineHeight: 1.5 }}>
                <strong>Libretto di circolazione</strong>: ci hai detto che non hai né il libretto né la denuncia. Ti spiegheremo come fare, intanto puoi preparare gli altri documenti.
              </div>
            )}
            {cdcDaChiarire && (
              <div style={{ fontSize: 12.5, color: '#854F0B', lineHeight: 1.5 }}>
                <strong>Certificato di proprietà</strong>: lo verifichiamo noi gratuitamente e ti diremo se serve qualcosa.
              </div>
            )}
          </div>
          <a href="https://wa.me/393518280493" target="_blank" rel="noopener noreferrer" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 0', borderRadius: 11, background: '#16A34A', color: '#fff', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.58 15.13L2 22l4.97-1.38A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.19-1.19l-.3-.18-2.95.82.8-2.87-.2-.31A8 8 0 1 1 12 20zm4.42-5.9c-.24-.12-1.43-.7-1.65-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.55 6.55 0 0 1-1.93-1.19 7.24 7.24 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.64 1.64 0 0 0 .24-.4.44.44 0 0 0-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.88.88 0 0 0-.64.3 2.68 2.68 0 0 0-.84 2 4.65 4.65 0 0 0 .98 2.47 10.66 10.66 0 0 0 4.08 3.6 13.68 13.68 0 0 0 1.36.5 3.27 3.27 0 0 0 1.5.1 2.46 2.46 0 0 0 1.61-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.46-.28z"/></svg>
            Preferisci scriverci? Chatta su WhatsApp
          </a>
        </div>
      )}

      {/* ====== INVIATI: pannello richiudibile IN CIMA al filo logico ======
          Chiuso: una riga sottile col conteggio. Aperto (al tocco): una riga per
          documento SENZA miniature. Tocco sulla riga → tutto il pannello si gira
          (flip) e mostra quel documento in grande, con elimina/aggiungi.
          Quando il wizard è finito, le foto del veicolo sono l'ultima riga. */}
      {sistemati.length > 0 && (
        <PannelloInviati
          docs={sistemati}
          foto={foto}
          mostraFoto={!docAttivo}
          signedMap={signedMap}
          aperta={sistematiAperti}
          onToggle={() => setSistematiAperti(a => !a)}
          eliminabile={puoEliminare}
          onApri={(url, titolo) => setAnteprima({ url, titolo })}
          onElimina={(doc, idx) => setConfermaElimina({ doc, fileIdx: idx })}
          onEliminaFoto={f => setConfermaEliminaFoto(f)}
          onUploadFoto={uploadFotoExtra}
        />
      )}

      {/* ====== WIZARD: UN DOCUMENTO ALLA VOLTA ======
          Solo foto (niente file), rifiutati per primi, coda "Dopo questo",
          bottone di pagina "Continua" (stile /inizia) che invia e apre il
          prossimo. Ultimo passo della fila: le foto del veicolo. */}
      {docAttivo && (
        <div>
          <SezioneTitolo testo="Da preparare" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 2px 10px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: '#2563eb', flexShrink: 0 }}>
              DOCUMENTO {Math.min(inviatiCount + 1, totaleDocWizard)} DI {totaleDocWizard}
            </span>
            <div style={{ flex: 1, height: 5, background: '#EAF0F7', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(6, Math.round((inviatiCount / Math.max(1, totaleDocWizard)) * 100))}%`, height: '100%', background: '#2563eb', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <DocCard doc={docAttivo} signedMap={signedMap} caricamento={caricandoId === docAttivo.id} eliminabile={puoEliminare}
            onCarica={(files, lato) => caricaFile(docAttivo, files, lato)} onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(idx) => setConfermaElimina({ doc: docAttivo, fileIdx: idx })} />

          {/* Coda: i prossimi passi, in fila chiusa */}
          {codaWizard.length > 1 && (
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#fff', marginTop: 10 }}>
              <div style={{ padding: '7px 12px', fontSize: 10, fontWeight: 600, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>Dopo questo</div>
              {codaWizard.slice(1).map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < codaWizard.length - 2 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{inviatiCount + i + 2}</span>
                  <span style={{ fontSize: 12.5, color: '#6B7280' }}>{nomeRitiro(d)}</span>
                </div>
              ))}
            </div>
          )}

          {/* CONTINUA di pagina: grigio finché le foto non sono complete */}
          {puoEliminare && (
            <button
              onClick={() => inviaInVerifica(docAttivo)}
              disabled={inviandoId === docAttivo.id || !docCompleto(docAttivo)}
              className="active:scale-[0.99]"
              style={{
                width: '100%', marginTop: 12, padding: '14px 0', border: 'none', borderRadius: 13,
                background: (inviandoId === docAttivo.id || !docCompleto(docAttivo)) ? '#E5E7EB' : '#2563eb',
                color: (inviandoId === docAttivo.id || !docCompleto(docAttivo)) ? '#9CA3AF' : '#fff',
                fontSize: 15, fontWeight: 600,
                cursor: (inviandoId === docAttivo.id || !docCompleto(docAttivo)) ? 'default' : 'pointer',
                boxShadow: (inviandoId === docAttivo.id || !docCompleto(docAttivo)) ? 'none' : '0 4px 12px rgba(37,99,235,0.25)',
                transition: 'all 0.2s',
              }}
            >
              {inviandoId === docAttivo.id ? 'Invio…' : codaWizard.length > 1 ? 'Vai al prossimo documento' : "Invia l'ultimo documento"}
            </button>
          )}
        </div>
      )}

      {/* ====== FOTO DEL VEICOLO (fallback): solo se non c'è il pannello inviati
          che le ospita come riga (es. nessun documento ancora inviato) ====== */}
      {!docAttivo && sistemati.length === 0 && (
        <CardFotoVeicolo foto={foto} eliminabile={puoEliminare} onUpload={uploadFotoExtra}
          onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={f => setConfermaEliminaFoto(f)} />
      )}

      {/* ====== MODULI PDF (informativi, fuori dalla fila) ====== */}
      {daFareModuli.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {daFareModuli.map(d => <ModuloCard key={d.id} doc={d} />)}
        </div>
      )}

      {/* ====== DOCUMENTI ORIGINALI DA PORTARE AL RITIRO ====== */}
      {daConsegnare.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', borderRadius: 16, padding: 16, boxShadow: '0 4px 14px rgba(20,184,166,0.3)' }}>
          <button onClick={() => setRitiroAperto(a => !a)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
            </span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>Documenti originali da portare al ritiro</div>
              <div style={{ color: '#CCFBF1', fontSize: 11.5, marginTop: 2 }}>Consegnali al demolitore il giorno del ritiro</div>
            </div>
            <span style={{ background: '#fff', color: '#0F766E', fontSize: 12.5, fontWeight: 800, borderRadius: 999, padding: '3px 11px', flexShrink: 0 }}>{daConsegnare.length}</span>
            <span style={{ transform: ritiroAperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><IcoChevronDown color="#CCFBF1" /></span>
          </button>
          {ritiroAperto && (
            <div style={{ marginTop: 14 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '4px 14px' }}>
                {daConsegnare.map((d, i) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < daConsegnare.length - 1 ? '1px solid #EEF1F5' : 'none' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#CCFBF1', color: '#0F766E', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>{nomeRitiro(d)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '0 2px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCFBF1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span style={{ color: '#CCFBF1', fontSize: 11.5, lineHeight: 1.5 }}>Servono <b style={{ color: '#fff' }}>in originale</b>: senza questi documenti il veicolo non può essere ritirato.</span>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ====== MODALE ANTEPRIMA ====== */}
      {anteprima && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setAnteprima(null)}>
          <div className="bg-white rounded-2xl p-3 max-w-4xl w-full h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 px-2 flex-shrink-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{anteprima.titolo}</p>
              <button onClick={() => setAnteprima(null)} className="text-gray-400 text-2xl leading-none flex-shrink-0" aria-label="Chiudi anteprima">×</button>
            </div>
            <div className="flex-1 overflow-auto">
              {isPdfUrl(anteprima.url) ? (
                <iframe src={anteprima.url} title={anteprima.titolo} className="w-full h-full rounded-xl border border-gray-200" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={anteprima.url} alt={anteprima.titolo} className="w-full h-auto object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== MODALE CONFERMA ELIMINAZIONE DOCUMENTO ====== */}
      {confermaElimina && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => !eliminazioneInCorso && setConfermaElimina(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Eliminare questo file?</p>
                <p className="text-xs text-gray-500 mt-0.5">L&apos;azione non può essere annullata.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfermaElimina(null)} disabled={eliminazioneInCorso} className="bg-white border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-xs disabled:opacity-50">Annulla</button>
              <button onClick={eliminaFileConfermato} disabled={eliminazioneInCorso} className="bg-red-600 text-white py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
                {eliminazioneInCorso ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Elimino...</> : 'Sì, elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODALE CONFERMA ELIMINAZIONE FOTO ====== */}
      {confermaEliminaFoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => !eliminazioneInCorso && setConfermaEliminaFoto(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Eliminare questa foto?</p>
                <p className="text-xs text-gray-500 mt-0.5">L&apos;azione non può essere annullata.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfermaEliminaFoto(null)} disabled={eliminazioneInCorso} className="bg-white border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-xs disabled:opacity-50">Annulla</button>
              <button onClick={eliminaFotoConfermato} disabled={eliminazioneInCorso} className="bg-red-600 text-white py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
                {eliminazioneInCorso ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Elimino...</> : 'Sì, elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// TITOLO SEZIONE
// ============================================================

function SezioneTitolo({ testo }: { testo: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa7b5', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '4px 2px 12px' }}>{testo}</div>
  )
}

// ============================================================
// FUNZIONI DI SUPPORTO TESTO
// ============================================================

function ordinaleErede(n: number): string {
  const o = ['', 'Primo', 'Secondo', 'Terzo', 'Quarto', 'Quinto', 'Sesto', 'Settimo', 'Ottavo', 'Nono', 'Decimo']
  return o[n] || `${n}°`
}

function nomeRitiro(d: DocChecklist): string {
  if (d.per_erede && d.indice_erede) return `${d.nome} (${ordinaleErede(d.indice_erede).toLowerCase()} erede)`
  return d.nome
}

// ============================================================
// DOCUMENTI FRONTE / RETRO
// Lista precisa presa dal file casistiche (docs/casistiche/Casistiche_Demolizione.md):
// solo questi documenti hanno esattamente due lati. Tutti gli altri
// (denunce, visure, autorizzazioni...) restano a caricamento libero.
// ============================================================

const CODICI_FRONTE_RETRO = new Set([
  'LIBRETTO_CIRCOLAZIONE',
  'LIBRETTO_ESTERO',
  'CERTIFICATO_PROPRIETA_CARTACEO',
  'CARTA_IDENTITA_PROPRIETARIO',
  'CARTA_IDENTITA_EREDE',
  'CARTA_IDENTITA_RAPPRESENTANTE',
  'CARTA_IDENTITA_CURATORE',
  'CARTA_IDENTITA_PRESIDENTE',
  'CARTA_IDENTITA_DELEGATO',
  'TESSERA_SANITARIA_PROPRIETARIO',
  'TESSERA_SANITARIA_EREDE',
  'TESSERA_SANITARIA_RAPPRESENTANTE',
  'TESSERA_SANITARIA_CURATORE',
  'TESSERA_SANITARIA_PRESIDENTE',
  'TESSERA_SANITARIA_DELEGATO',
])

function richiedeFronteRetro(codice: string): boolean {
  if (CODICI_FRONTE_RETRO.has(codice)) return true
  // Robustezza: qualunque futura carta d'identità / tessera sanitaria di un nuovo soggetto
  if (codice.startsWith('CARTA_IDENTITA_')) return true
  if (codice.startsWith('TESSERA_SANITARIA_')) return true
  return false
}

// Le foto del documento sono complete? Governa l'accensione del "Continua".
// Fronte/retro: servono entrambi i lati (un file senza lato = unico, da
// pratiche vecchie: vale come completo). Altri documenti: basta una foto.
function docCompleto(d: DocChecklist): boolean {
  const files = leggiFile(d.file_url)
  if (files.length === 0) return false
  if (!richiedeFronteRetro(d.codice)) return true
  if (files.some(f => !f.lato)) return true
  return files.some(f => f.lato === 'fronte') && files.some(f => f.lato === 'retro')
}

// ============================================================
// BOLLINO AZIONE (Scatta / File)
// ============================================================

function BollinoAzione({ etichetta, bg, colore, onClick, children }: {
  etichetta: string
  bg: string
  colore: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} aria-label={etichetta} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 46, cursor: 'pointer' }}>
      <span style={{ width: 38, height: 38, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: colore, lineHeight: 1 }}>{etichetta}</span>
    </button>
  )
}

// ============================================================
// CARD DOCUMENTO DA PREPARARE
// Stile /inizia: bordo 1.5px, sfondo grigio chiaro, icona nel
// quadratino blu. Le foto NON partono da sole: bottone verde
// "Ho finito, invia in verifica".
// ============================================================

function DocCard(props: {
  doc: DocChecklist
  signedMap: Record<string, string>
  caricamento: boolean
  eliminabile: boolean
  onCarica: (files: File[], lato?: 'fronte' | 'retro') => void
  onApri: (url: string, titolo: string) => void
  onElimina: (fileIdx: number) => void
}) {
  const inputCamFronte = useRef<HTMLInputElement>(null)
  const inputCamRetro = useRef<HTMLInputElement>(null)
  const inputCamLibero = useRef<HTMLInputElement>(null)
  const inputAllega = useRef<HTMLInputElement>(null)

  // Modalità FILE (scansioni/PDF): scelta dall'utente col link "Allega file".
  // Niente fronte/retro: allega quanti file vuole e decide LUI quando ha
  // finito premendo Continua (il sistema non può sapere se un file basta).
  const [modoFile, setModoFile] = useState(false)

  const { doc } = props
  const files = leggiFile(doc.file_url)
  const rifiutato = doc.stato === 'rifiutato'
  const frDoc = richiedeFronteRetro(doc.codice)
  // File senza lato presenti (allegati ora o pratiche vecchie) → modalità file
  const haFileSenzaLato = files.some(f => !f.lato)
  const inModoFile = frDoc && (modoFile || haFileSenzaLato)
  const modoSlot = frDoc && !inModoFile

  const fronteFile = files.find(f => f.lato === 'fronte')
  const retroFile = files.find(f => f.lato === 'retro')
  const completo = docCompleto(doc)

  // Palette: blu di default, rosso se rifiutato (come /inizia con errore)
  const bordo = rifiutato ? '#F3C8C8' : '#E5E7EB'
  const bgCard = rifiutato ? '#FEF6F6' : '#F9FAFB'
  const bgTile = rifiutato ? '#FBDADA' : '#DBEAFE'
  const colTile = rifiutato ? '#C0392B' : '#2563eb'

  function fileFromEvent(e: React.ChangeEvent<HTMLInputElement>): File[] {
    const list = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    return list
  }

  const subtitle = rifiutato && doc.nota_admin
    ? doc.nota_admin
    : inModoFile
      ? 'Allega uno o più file (PDF o immagini)'
      : modoSlot
        ? 'Scatta due foto: fronte e retro'
        : (doc.descrizione || 'Scatta una foto del documento')
  const subColor = rifiutato && doc.nota_admin ? '#B03A2E' : '#6B7280'

  // Con le FOTO il sistema sa contare (fronte+retro); con i FILE no:
  // da 1 file in poi è l'utente che dichiara di aver finito col Continua.
  const hint = props.caricamento
    ? 'Caricamento…'
    : inModoFile
      ? (files.length > 0 ? 'Hai allegato tutto? Premi Continua' : 'Allega almeno un file per continuare')
      : modoSlot
        ? (completo ? 'Foto complete' : !fronteFile ? 'Scatta il fronte per continuare' : 'Scatta il retro per continuare')
        : (completo ? 'Hai caricato tutto? Premi Continua' : 'Scatta una foto per continuare')

  // Miniatura di un file (con ✕ di eliminazione)
  function renderMini(f: FileCaricato, idx: number, size = 56) {
    const url = props.signedMap[f.url] || f.url
    return (
      <div key={idx} style={{ position: 'relative', width: size, height: size }}>
        <button onClick={() => props.onApri(url, doc.nome)} style={{ width: size, height: size, borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff', display: 'block' }}>
          {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
            <div style={{ width: '100%', height: '100%', background: '#fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#c0392b' }}>PDF</div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </button>
        {props.eliminabile && (
          <button onClick={() => props.onElimina(idx)} aria-label="Elimina file" style={{ position: 'absolute', top: -6, right: -6, width: 19, height: 19, background: '#C0392B', color: '#fff', borderRadius: '50%', fontSize: 11, fontWeight: 700, lineHeight: 1, border: `2px solid ${bgCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        )}
      </div>
    )
  }

  // Casella FRONTE o RETRO: un solo gesto possibile, Scatta
  function renderSlot(lato: 'fronte' | 'retro', file: FileCaricato | undefined, camRef: React.RefObject<HTMLInputElement | null>) {
    const idx = file ? files.indexOf(file) : -1
    return (
      <div style={{ flex: 1, minWidth: 0, border: `1.5px ${file ? 'solid #C7D6EC' : 'dashed #B5C6E0'}`, borderRadius: 11, background: '#fff', padding: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colTile, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{lato}</div>
        {file ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>{renderMini(file, idx, 52)}</div>
        ) : props.eliminabile ? (
          <>
            <button onClick={() => camRef.current?.click()} aria-label={`Scatta il ${lato}`} className="active:scale-[0.96]" style={{ width: 42, height: 42, borderRadius: '50%', background: '#2563eb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto', boxShadow: '0 3px 9px rgba(37,99,235,0.25)', transition: 'transform 0.1s' }}>
              <IcoCamera size={18} color="#fff" />
            </button>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#2563eb', marginTop: 5 }}>Scatta</div>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div style={{ background: bgCard, border: `1.5px solid ${bordo}`, borderRadius: 14, padding: 14 }}>
      {/* input nascosti: fotocamera per gli scatti (su PC il browser apre la
          scelta immagine) + allegati liberi per scansioni e PDF */}
      <input ref={inputCamFronte} type="file" accept="image/*" capture="environment" onChange={e => props.onCarica(fileFromEvent(e), 'fronte')} className="hidden" />
      <input ref={inputCamRetro} type="file" accept="image/*" capture="environment" onChange={e => props.onCarica(fileFromEvent(e), 'retro')} className="hidden" />
      <input ref={inputCamLibero} type="file" accept="image/*" capture="environment" multiple onChange={e => props.onCarica(fileFromEvent(e))} className="hidden" />
      <input ref={inputAllega} type="file" accept="image/*,application/pdf" multiple onChange={e => props.onCarica(fileFromEvent(e))} className="hidden" />

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: bgTile, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconaTipoDocumento nome={doc.nome} color={colTile} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14.5, color: '#111827', lineHeight: 1.3 }}>{nomeRitiro(doc)}</span>
            {rifiutato && (
              <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: '#C0392B', background: '#FBDADA', padding: '2px 9px', borderRadius: 20 }}>Da rifare</span>
            )}
          </div>
          {subtitle ? <div style={{ fontSize: 12, color: subColor, marginTop: 2, lineHeight: 1.4 }}>{subtitle}</div> : null}
        </div>

        {props.caricamento ? (
          <div style={{ flexShrink: 0 }}><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (!frDoc && props.eliminabile) ? (
          <div style={{ flexShrink: 0 }}>
            <BollinoAzione etichetta="Scatta" bg="#2563eb" colore="#2563eb" onClick={() => inputCamLibero.current?.click()}>
              <IcoCamera size={18} color="#fff" />
            </BollinoAzione>
          </div>
        ) : null}
      </div>

      {/* CASELLE FRONTE / RETRO */}
      {modoSlot && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {renderSlot('fronte', fronteFile, inputCamFronte)}
          {renderSlot('retro', retroFile, inputCamRetro)}
        </div>
      )}

      {/* MODALITÀ FILE: lista allegati + "Allega un altro file" (quanti ne
          vuole: quando ha finito lo dichiara lui col Continua) */}
      {inModoFile && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {files.map((f, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 11px' }}>
              <button onClick={() => props.onApri(props.signedMap[f.url] || f.url, doc.nome)} style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', background: isPdfUrl(f.nome) || isPdfUrl(f.url) ? '#FBEAEA' : '#f3f5f8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPdfUrl(f.nome) || isPdfUrl(f.url) ? (
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: '#C0392B' }}>PDF</span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={props.signedMap[f.url] || f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome || 'File'}</span>
              {props.eliminabile && (
                <button onClick={() => props.onElimina(idx)} aria-label="Elimina file" style={{ width: 19, height: 19, background: '#C0392B', color: '#fff', borderRadius: '50%', fontSize: 11, fontWeight: 700, lineHeight: 1, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
              )}
            </div>
          ))}
          {props.eliminabile && (
            <button onClick={() => inputAllega.current?.click()} style={{ border: '1.5px dashed #B5C6E0', borderRadius: 10, background: '#fff', padding: '11px 0', fontSize: 12.5, fontWeight: 600, color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              {files.length === 0 ? 'Allega file' : 'Allega un altro file'}
            </button>
          )}
        </div>
      )}

      {/* MINIATURE (documenti a caricamento libero: denunce, visure…) */}
      {!frDoc && files.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {files.map((f, idx) => renderMini(f, idx))}
          <span style={{ fontSize: 11.5, color: '#6B7280' }}>{files.length === 1 ? '1 elemento' : `${files.length} elementi`}</span>
        </div>
      )}

      {/* SUGGERIMENTO: cosa manca per accendere il Continua */}
      {props.eliminabile && (
        <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: completo ? '#1D9E75' : '#9AA7B5' }}>
          {hint}
        </p>
      )}

      {/* POSTICINO ALLEGATI: per chi ha scansioni o PDF invece delle foto */}
      {props.eliminabile && modoSlot && files.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #EEF1F5' }}>
          <button onClick={() => setModoFile(true)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            Hai una scansione o un PDF? <span style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>Allega file</span>
          </button>
        </div>
      )}
      {props.eliminabile && inModoFile && files.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #EEF1F5' }}>
          <button onClick={() => setModoFile(false)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#8a98a8', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
            Preferisco scattare le foto
          </button>
        </div>
      )}
      {props.eliminabile && !frDoc && (
        <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #EEF1F5' }}>
          <button onClick={() => inputAllega.current?.click()} style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            Hai una scansione o un PDF? <span style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>Allega file</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// PANNELLO DOCUMENTI INVIATI — in cima al filo logico del wizard.
// Chiuso: una riga sottile col conteggio e la pillola riassuntiva.
// Aperto (tocco sull'intestazione): una riga per documento SENZA miniature.
// Tocco su una riga: TUTTO il pannello si gira (flip da destra a sinistra)
// e sul retro mostra quel documento in grande (anteprima, elimina, aggiungi).
// Tocco su "Torna ai documenti inviati": il pannello si rigira sulla lista.
// Quando il wizard è concluso, le foto del veicolo sono l'ultima riga.
// ============================================================

function PillolaStato({ approvato }: { approvato: boolean }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, color: approvato ? '#1F7A43' : '#1E4E8C', background: approvato ? '#DCF3E4' : '#E0EDFB', borderRadius: 20, padding: '2px 9px' }}>
      {approvato ? 'Approvato' : 'In verifica'}
    </span>
  )
}

function PannelloInviati(props: {
  docs: DocChecklist[]
  foto: FotoPratica[]
  mostraFoto: boolean
  signedMap: Record<string, string>
  aperta: boolean
  onToggle: () => void
  eliminabile: boolean
  onApri: (url: string, titolo: string) => void
  onElimina: (doc: DocChecklist, fileIdx: number) => void
  onEliminaFoto: (f: FotoPratica) => void
  onUploadFoto: (files: File[]) => void
}) {
  const { docs, foto, mostraFoto } = props
  // Cosa c'è sul retro: 'foto', l'id di un documento, o null (lista davanti)
  const [girata, setGirata] = useState<string | null>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const inputFoto = useRef<HTMLInputElement>(null)
  const [altezza, setAltezza] = useState(46)

  const docGirato = girata && girata !== 'foto' ? docs.find(d => d.id === girata) : undefined

  // Se il documento sul retro sparisce (es. eliminato l'ultimo file) si torna alla lista
  useEffect(() => {
    if (girata && girata !== 'foto' && !docs.some(d => d.id === girata)) setGirata(null)
    if (girata === 'foto' && !mostraFoto) setGirata(null)
  }, [girata, docs, mostraFoto])

  // Le due facce sono sovrapposte: l'altezza del pannello segue quella visibile
  useLayoutEffect(() => {
    const faccia = girata ? backRef.current : frontRef.current
    if (faccia) setAltezza(faccia.scrollHeight)
  }, [girata, props.aperta, docs, foto, mostraFoto])

  useEffect(() => {
    function misura() {
      const faccia = girata ? backRef.current : frontRef.current
      if (faccia) setAltezza(faccia.scrollHeight)
    }
    window.addEventListener('resize', misura)
    return () => window.removeEventListener('resize', misura)
  }, [girata])

  const inVerifica = docs.some(d => d.stato === 'caricato')
  const fotoApprovate = foto.length > 0 && foto.every(f => f.stato_approvazione === 'approvato')

  const facciaStile: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, right: 0,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    background: '#fff', borderRadius: 12, overflow: 'hidden',
  }

  function Riga({ nome, approvato, onClick }: { nome: string; approvato: boolean; onClick: () => void }) {
    return (
      <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
          <div style={{ marginTop: 3 }}><PillolaStato approvato={approvato} /></div>
        </div>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </span>
      </button>
    )
  }

  const cellaX = (onClick: () => void) => (
    <button onClick={onClick} aria-label="Elimina file" style={{ position: 'absolute', top: -7, right: -7, width: 21, height: 21, background: '#C0392B', color: '#fff', borderRadius: '50%', fontSize: 13, fontWeight: 700, lineHeight: 1, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
  )

  return (
    <div style={{ perspective: 1100 }}>
      <div style={{ position: 'relative', height: altezza, transition: 'transform 0.55s, height 0.35s', transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d', transform: girata ? 'rotateY(-180deg)' : 'rotateY(0deg)' }}>

        {/* ============ FRONTE: la lista ============ */}
        <div ref={frontRef} style={{ ...facciaStile, border: '1px solid #E5E7EB', pointerEvents: girata ? 'none' : 'auto' }}>
          <button onClick={props.onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#DCF3E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
              {docs.length === 1 ? '1 documento inviato' : `${docs.length} documenti inviati`}
            </span>
            {!props.aperta && (
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, color: inVerifica ? '#1E4E8C' : '#1F7A43', background: inVerifica ? '#E0EDFB' : '#DCF3E4', borderRadius: 20, padding: '2px 9px', flexShrink: 0 }}>
                {inVerifica ? 'In verifica' : docs.length === 1 ? 'Approvato' : 'Approvati'}
              </span>
            )}
            <span style={{ transform: props.aperta ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><IcoChevronDown size={16} color="#9AA7B5" /></span>
          </button>

          {props.aperta && docs.map(d => (
            <Riga key={d.id} nome={nomeRitiro(d)} approvato={d.stato === 'approvato'} onClick={() => setGirata(d.id)} />
          ))}
          {props.aperta && mostraFoto && foto.length > 0 && (
            <Riga nome="Foto del veicolo" approvato={fotoApprovate} onClick={() => setGirata('foto')} />
          )}
        </div>

        {/* ============ RETRO: il documento in grande ============ */}
        <div ref={backRef} style={{ ...facciaStile, border: '1px solid #C7DCF5', transform: 'rotateY(180deg)', pointerEvents: girata ? 'auto' : 'none' }}>
          <button onClick={() => setGirata(null)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#EFF3F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Torna ai documenti inviati</span>
          </button>

          {docGirato && (() => {
            const files = leggiFile(docGirato.file_url)
            const approvato = docGirato.stato === 'approvato'
            return (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{nomeRitiro(docGirato)}</span>
                  <PillolaStato approvato={approvato} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {files.map((f, idx) => {
                    const url = props.signedMap[f.url] || f.url
                    const pdf = isPdfUrl(f.nome) || isPdfUrl(f.url)
                    return (
                      <div key={idx} style={{ position: 'relative', width: 'calc(50% - 5px)' }}>
                        <button onClick={() => props.onApri(url, nomeRitiro(docGirato))} style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#f3f5f8', display: 'block', padding: 0, cursor: 'pointer' }}>
                          {pdf ? (
                            <div style={{ width: '100%', height: '100%', background: '#fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </button>
                        {f.lato && (
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#6B7280', textAlign: 'center', marginTop: 3, textTransform: 'capitalize' }}>{f.lato}</div>
                        )}
                        {props.eliminabile && !approvato && cellaX(() => props.onElimina(docGirato, idx))}
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#9AA7B5', margin: '10px 0 0', lineHeight: 1.4 }}>
                  {approvato ? 'Documento approvato: non serve fare altro.' : 'Toccalo per vederlo a schermo intero. Con la ✕ lo elimini e puoi ricaricarlo.'}
                </p>
              </div>
            )
          })()}

          {girata === 'foto' && (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>Foto del veicolo</span>
                <PillolaStato approvato={fotoApprovate} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {foto.map((f, idx) => (
                  <div key={f.id} style={{ position: 'relative', width: 'calc(50% - 5px)' }}>
                    <button onClick={() => props.onApri(f.url, `Foto ${idx + 1}`)} style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#f3f5f8', display: 'block', padding: 0, cursor: 'pointer' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                    {props.eliminabile && cellaX(() => props.onEliminaFoto(f))}
                  </div>
                ))}
                {props.eliminabile && (
                  <button onClick={() => inputFoto.current?.click()} style={{ width: 'calc(50% - 5px)', aspectRatio: '4 / 3', borderRadius: 12, border: '1.5px dashed #B5C4D6', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#2563eb', cursor: 'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Aggiungi</span>
                  </button>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#9AA7B5', margin: '10px 0 0', lineHeight: 1.4 }}>Tocca una foto per vederla a schermo intero.</p>
            </div>
          )}
        </div>

      </div>

      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) props.onUploadFoto(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ============================================================
// CARD MODULO PDF (in preparazione)
// ============================================================

function ModuloCard({ doc }: { doc: DocChecklist }) {
  return (
    <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 14, background: '#F9FAFB' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconaTipoDocumento nome={doc.nome} color="#2563eb" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14.5, color: '#111827', lineHeight: 1.3 }}>{doc.nome}</span>
            <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: '#2563eb', background: '#DBEAFE', padding: '2px 9px', borderRadius: 20 }}>Modulo</span>
          </div>
          {doc.descrizione && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 1.4 }}>{doc.descrizione}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: '#fbf3e3', border: '1px solid #f2e2c0', borderRadius: 10, padding: '9px 11px' }}>
        <span style={{ flexShrink: 0 }}><IcoClock size={15} color="#b5820f" /></span>
        <span style={{ fontSize: 11.5, color: '#9a6c0c', fontWeight: 500 }}>Questo modulo sarà disponibile a breve. Ti avviseremo.</span>
      </div>
    </div>
  )
}

// ============================================================
// CARD FOTO DEL VEICOLO — ultimo passo del wizard documenti.
// Stesso vestito delle card documento: griglia foto + Scatta/Galleria.
// ============================================================

function CardFotoVeicolo({ foto, eliminabile, onUpload, onApri, onElimina }: {
  foto: FotoPratica[]
  eliminabile: boolean
  onUpload: (files: File[]) => void
  onApri: (url: string, titolo: string) => void
  onElimina: (f: FotoPratica) => void
}) {
  return (
    <div style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
            <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: '#111827' }}>Foto del veicolo</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
            {foto.length > 0 ? `${foto.length} foto caricate: controlla o aggiungine` : 'Aggiungi qualche foto del veicolo'}
          </div>
        </div>
      </div>
      {foto.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {foto.map((f, idx) => (
            <div key={f.id} style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
              <button onClick={() => onApri(f.url, `Foto ${idx + 1}`)} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#fff', display: 'block' }}>
                {isPdfUrl(f.url) ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={f.url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
              {eliminabile && (
                <button onClick={() => onElimina(f)} aria-label="Elimina foto" style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, background: '#c0392b', color: '#fff', borderRadius: '50%', fontSize: 13, fontWeight: 700, lineHeight: 1, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {eliminabile && <UploadFoto onUpload={onUpload} />}
    </div>
  )
}

// ============================================================
// UPLOAD FOTO VEICOLO (due opzioni visibili, senza popup)
// ============================================================

function UploadFoto({ onUpload }: { onUpload: (files: File[]) => void }) {
  const inputCamera = useRef<HTMLInputElement>(null)
  const inputFile = useRef<HTMLInputElement>(null)
  const [caricando, setCaricando] = useState(false)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    setCaricando(true)
    await onUpload(Array.from(e.target.files))
    setCaricando(false)
    e.target.value = ''
  }

  return (
    <>
      <input ref={inputCamera} type="file" accept="image/*" capture="environment" multiple onChange={handle} className="hidden" />
      <input ref={inputFile} type="file" accept="image/*,application/pdf" multiple onChange={handle} className="hidden" />
      {caricando ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', border: '1.5px dashed #C9D3DF', borderRadius: 12, color: '#2563eb', fontSize: 12.5, fontWeight: 500 }}>
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Caricamento...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => inputCamera.current?.click()} className="active:scale-[0.98]" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 8px', border: 'none', borderRadius: 12, background: '#2563eb', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.22)', transition: 'transform 0.1s' }}>
            <IcoCamera size={16} color="#fff" />Scatta foto
          </button>
          <button onClick={() => inputFile.current?.click()} className="active:scale-[0.98]" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 8px', border: '1.5px solid #BFDBFE', borderRadius: 12, background: '#EFF6FF', color: '#1E4E8C', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'transform 0.1s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>Dalla galleria
          </button>
        </div>
      )}
    </>
  )
}