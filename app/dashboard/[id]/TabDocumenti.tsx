'use client'

import { useEffect, useRef, useState } from 'react'
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
  stato: 'da_fare' | 'caricato' | 'approvato' | 'rifiutato' | 'consegna_a_mano'
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

export default function TabDocumenti({ pratica, onDocRifiutatiCambiati }: Props) {
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
  const [erediAperti, setErediAperti] = useState<Record<number, boolean>>({})
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
    } catch (err) {
      console.error('Errore invio in verifica:', err)
      alert('Errore nell\'invio. Riprova.')
    }
    setInviandoId(null)
  }

  // Il cliente sceglie di consegnare la FOTOCOPIA a mano al ritiro:
  // il documento è "pronto" senza caricamento e finisce nella lista
  // delle cose da consegnare al demolitore. Reversibile con "Annulla".
  async function segnaAMano(doc: DocChecklist) {
    setInviandoId(doc.id)
    try {
      await supabase
        .from('pratica_documenti_checklist')
        .update({ stato: 'consegna_a_mano', nota_admin: null })
        .eq('id', doc.id)
      await carica()
      // Apri il box del ritiro: è lì che il documento è appena "andato"
      setRitiroAperto(true)
    } catch (err) {
      console.error('Errore consegna a mano:', err)
      alert('Errore nel salvataggio. Riprova.')
    }
    setInviandoId(null)
  }

  async function annullaAMano(doc: DocChecklist) {
    setInviandoId(doc.id)
    try {
      await supabase
        .from('pratica_documenti_checklist')
        .update({ stato: 'da_fare' })
        .eq('id', doc.id)
      await carica()
    } catch (err) {
      console.error('Errore annullo consegna a mano:', err)
      alert('Errore nel salvataggio. Riprova.')
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
  const aMano = docsAttivi.filter(d => d.stato === 'consegna_a_mano')
  const daFare = docsAttivi.filter(d => d.stato === 'da_fare' || d.stato === 'rifiutato')
  // Fisarmonica: i rifiutati hanno la precedenza, poi l'ordine del catalogo
  const daFareGenerali = [
    ...daFare.filter(d => !d.per_erede && !d.template_pdf && d.stato === 'rifiutato'),
    ...daFare.filter(d => !d.per_erede && !d.template_pdf && d.stato !== 'rifiutato'),
  ]
  const daFareModuli = daFare.filter(d => !d.per_erede && d.template_pdf)
  const daFareEredi = daFare.filter(d => d.per_erede)
  const indiciEredi = Array.from(new Set(daFareEredi.map(d => d.indice_erede ?? 0))).sort((a, b) => a - b)
  // Lista del ritiro: UNICO posto dove vive tutto ciò che va consegnato.
  // - originali richiesti dalla casistica (se non caricati e scelti "a mano",
  //   restano UNA voce sola: porti l'originale, la fotocopia non serve)
  // - fotocopie dei documenti scelti "a mano" che NON vanno consegnati in originale
  const daConsegnare = docsAttivi.filter(d => d.richiede_consegna)
  const vociRitiro: { chiave: string; testo: string; badge: 'fotocopia' | 'non caricato' | null; docAnnulla: DocChecklist | null }[] = [
    ...daConsegnare.map(d => ({
      chiave: d.id,
      testo: nomeRitiro(d),
      badge: d.stato === 'consegna_a_mano' ? 'non caricato' as const : null,
      docAnnulla: d.stato === 'consegna_a_mano' ? d : null,
    })),
    ...aMano.filter(d => !d.richiede_consegna).map(d => ({
      chiave: `mano-${d.id}`,
      testo: `Fotocopia fronte e retro — ${nomeRitiro(d)}`,
      badge: 'fotocopia' as const,
      docAnnulla: d,
    })),
  ]

  const totale = docsAttivi.length
  const pronti = sistemati.length + aMano.length
  const tuttoApprovato = totale > 0 && docsAttivi.every(d => d.stato === 'approvato' || d.stato === 'consegna_a_mano') && !librettoDaChiarire && !cdcDaChiarire

  return (
    <div className="flex flex-col gap-3">

      {/* ====== STATO ====== */}
      {tuttoApprovato ? (
        <div style={{ background: '#eef7f1', border: '1.5px solid #c8e6d5', borderRadius: 18, padding: 20, textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 12px', background: '#1D9E75', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#0F6E56', margin: 0 }}>Documenti tutti a posto</p>
          <p style={{ fontSize: 12.5, color: '#3c7a60', marginTop: 4, lineHeight: 1.5 }}>
            È tutto in ordine. Tieni gli originali{aMano.length > 0 ? ' e le fotocopie scelte' : ''} a portata di mano: ti serviranno il giorno del ritiro.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '6px 6px 2px' }}>
          <AnelloProgresso pronti={pronti} totale={totale} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 16, color: '#0d2144' }}>
              {pronti === 0 ? 'Iniziamo!' : 'Stai andando bene!'}
            </div>
            <div style={{ fontSize: 12.5, color: '#7a8a9a', marginTop: 2, lineHeight: 1.4 }}>
              {daFare.length === 0 ? 'Documenti inviati, in attesa di verifica.' : `Ti restano ${daFare.length} ${daFare.length === 1 ? 'documento' : 'documenti'} da preparare.`}
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

      {/* ====== DA PREPARARE: GENERALI + MODULI ======
          Fisarmonica: si lavora UN documento alla volta. Aperto solo il
          primo della fila (i rifiutati passano avanti), i prossimi sono
          righe chiuse che si sbloccano da sole. */}
      {(daFareGenerali.length > 0 || daFareModuli.length > 0) && (
        <div>
          <SezioneTitolo testo="Da preparare" />
          <div className="flex flex-col gap-2.5">
            {daFareGenerali.slice(0, 1).map(d => (
              <DocCard key={d.id} doc={d} signedMap={signedMap} caricamento={caricandoId === d.id} invio={inviandoId === d.id} eliminabile={puoEliminare}
                onCarica={(files, lato) => caricaFile(d, files, lato)} onInvia={() => inviaInVerifica(d)} onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(idx) => setConfermaElimina({ doc: d, fileIdx: idx })}
                onAMano={puoConsegnareAMano(d) ? () => segnaAMano(d) : undefined} />
            ))}
            {daFareGenerali.length > 1 && (
              <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '9px 14px', fontSize: 10.5, fontWeight: 600, color: '#94A3B8', letterSpacing: 0.4, textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>Dopo questo</div>
                {daFareGenerali.slice(1).map((d, i) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: i < daFareGenerali.length - 2 ? '1px solid #F3F4F6' : 'none', opacity: 0.75 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 2}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#6B7280' }}>{d.nome}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C0C7D1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                ))}
              </div>
            )}
            {daFareModuli.map(d => <ModuloCard key={d.id} doc={d} />)}
          </div>
        </div>
      )}

      {/* ====== DA PREPARARE: PER EREDE ====== */}
      {indiciEredi.length > 0 && (
        <div>
          <SezioneTitolo testo="Documenti per ogni erede" />
          <div className="flex flex-col gap-2.5">
            {indiciEredi.map(idx => {
              const docsErede = daFareEredi.filter(d => (d.indice_erede ?? 0) === idx)
              const aperto = erediAperti[idx] ?? (indiciEredi.length === 1)
              return (
                <div key={idx} style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                  <button onClick={() => setErediAperti(s => ({ ...s, [idx]: !aperto }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 13, background: '#F9FAFB' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#DBEAFE', color: '#2563eb', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx}</div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{ordinaleErede(idx)} erede</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{docsErede.length} {docsErede.length === 1 ? 'documento' : 'documenti'}</div>
                    </div>
                    <span style={{ transform: aperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><IcoChevronDown color="#8a98a8" /></span>
                  </button>
                  {aperto && (
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {docsErede.map(d => (
                        <DocCard key={d.id} doc={d} signedMap={signedMap} caricamento={caricandoId === d.id} invio={inviandoId === d.id} eliminabile={puoEliminare}
                          onCarica={(files, lato) => caricaFile(d, files, lato)} onInvia={() => inviaInVerifica(d)} onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(i) => setConfermaElimina({ doc: d, fileIdx: i })}
                          onAMano={puoConsegnareAMano(d) ? () => segnaAMano(d) : undefined} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== GIA' SISTEMATI ====== */}
      {sistemati.length > 0 && (
        <div>
          <SezioneTitolo testo="Già sistemati" />
          {!sistematiAperti ? (
            <button onClick={() => setSistematiAperti(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, background: '#fff' }}>
              <IcoCheck size={21} color="#1D9E75" />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                  {sistemati.every(d => d.stato === 'approvato')
                    ? `${sistemati.length} ${sistemati.length === 1 ? 'Documento approvato' : 'Documenti approvati'}`
                    : contaPerStato(sistemati)}
                </div>
              </div>
              <IcoChevronDown color="#8a98a8" />
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sistemati.map(d => (
                <CardSistemato key={d.id} doc={d} signedMap={signedMap} eliminabile={puoEliminare}
                  onApri={(url, titolo) => setAnteprima({ url, titolo })} onElimina={(idx) => setConfermaElimina({ doc: d, fileIdx: idx })} />
              ))}
              <button onClick={() => setSistematiAperti(false)} style={{ alignSelf: 'center', fontSize: 12, color: '#8a98a8', fontWeight: 500, background: 'none', border: 'none', padding: '4px 8px' }}>Nascondi</button>
            </div>
          )}
        </div>
      )}

      {/* ====== DOCUMENTI ORIGINALI DA PORTARE AL RITIRO ====== */}
      {vociRitiro.length > 0 && (
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
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>Documenti da portare al ritiro</div>
              <div style={{ color: '#CCFBF1', fontSize: 11.5, marginTop: 2 }}>Consegnali al demolitore il giorno del ritiro</div>
            </div>
            <span style={{ background: '#fff', color: '#0F766E', fontSize: 12.5, fontWeight: 800, borderRadius: 999, padding: '3px 11px', flexShrink: 0 }}>{vociRitiro.length}</span>
            <span style={{ transform: ritiroAperto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><IcoChevronDown color="#CCFBF1" /></span>
          </button>
          {ritiroAperto && (
            <div style={{ marginTop: 14 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '4px 14px' }}>
                {vociRitiro.map((v, i) => (
                  <div key={v.chiave} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < vociRitiro.length - 1 ? '1px solid #EEF1F5' : 'none' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: v.badge ? '#FEF3C7' : '#CCFBF1', color: v.badge ? '#B45309' : '#0F766E', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>{v.testo}</span>
                    {v.badge && (
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#B45309', background: '#FEF3C7', borderRadius: 999, padding: '2px 8px' }}>{v.badge}</span>
                    )}
                    {v.docAnnulla && puoEliminare && (
                      <button onClick={() => annullaAMano(v.docAnnulla!)} disabled={inviandoId === v.docAnnulla.id} style={{ flexShrink: 0, background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: '#B45309', textDecoration: 'underline', cursor: 'pointer', padding: '2px 0' }}>
                        {inviandoId === v.docAnnulla.id ? '…' : 'Annulla'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '0 2px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCFBF1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span style={{ color: '#CCFBF1', fontSize: 11.5, lineHeight: 1.5 }}>
                  I documenti servono <b style={{ color: '#fff' }}>in originale</b>{vociRitiro.some(v => v.badge === 'fotocopia') ? ', le voci segnate in fotocopia' : ''}: senza, il veicolo non può essere ritirato.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== FOTO DEL VEICOLO ====== */}
      <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 16, padding: 16, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: foto.length > 0 ? 12 : 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Foto del veicolo</span>
          <span style={{ fontSize: 12, color: '#9aa7b5' }}>{foto.length} {foto.length === 1 ? 'foto' : 'foto'}</span>
        </div>
        {foto.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {foto.map((f, idx) => (
              <div key={f.id} style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                <button onClick={() => setAnteprima({ url: f.url, titolo: `Foto ${idx + 1}` })} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#f3f5f8', display: 'block' }}>
                  {isPdfUrl(f.url) ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#c0392b' }}>PDF</div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={f.url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </button>
                {puoEliminare && (
                  <button onClick={() => setConfermaEliminaFoto(f)} aria-label="Elimina foto" style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, background: '#c0392b', color: '#fff', borderRadius: '50%', fontSize: 13, fontWeight: 700, lineHeight: 1, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}
        <UploadFoto onUpload={uploadFotoExtra} />
      </div>

      {/* ====== MODALE ANTEPRIMA ====== */}
      {anteprima && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setAnteprima(null)}>
          <div className="bg-white rounded-2xl p-3 max-w-4xl w-full h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 px-2 flex-shrink-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{anteprima.titolo}</p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a href={anteprima.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium">Apri in nuova scheda</a>
                <button onClick={() => setAnteprima(null)} className="text-gray-400 text-2xl leading-none">×</button>
              </div>
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

function contaPerStato(docs: DocChecklist[]): string {
  const appr = docs.filter(d => d.stato === 'approvato').length
  const inVer = docs.filter(d => d.stato === 'caricato').length
  const parti: string[] = []
  if (appr > 0) parti.push(`${appr} approvat${appr === 1 ? 'o' : 'i'}`)
  if (inVer > 0) parti.push(`${inVer} in verifica`)
  return parti.join(' · ')
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

// ============================================================
// CONSEGNA A MANO
// Il cliente può scegliere di NON caricare un documento e consegnarne
// la fotocopia al demolitore il giorno del ritiro. Escluso il LIBRETTO:
// serve caricato per verificare la casistica prima dell'assegnazione.
// Esclusi anche i moduli PDF (vanno firmati, non fotocopiati).
// ============================================================

function puoConsegnareAMano(doc: DocChecklist): boolean {
  if (doc.codice === 'LIBRETTO_CIRCOLAZIONE' || doc.codice === 'LIBRETTO_ESTERO') return false
  if (doc.template_pdf) return false
  return doc.richiede_upload
}

function IcoMano({ size = 15, color = '#B45309' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0V12" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7l-3.3-5.8a1.5 1.5 0 0 1 .5-2a1.87 1.87 0 0 1 2.3.3L8 13" />
    </svg>
  )
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
  invio: boolean
  eliminabile: boolean
  onCarica: (files: File[], lato?: 'fronte' | 'retro') => void
  onInvia: () => void
  onApri: (url: string, titolo: string) => void
  onElimina: (fileIdx: number) => void
  // Presente solo per i documenti che ammettono la fotocopia a mano al ritiro
  onAMano?: () => void
}) {
  const inputCamFronte = useRef<HTMLInputElement>(null)
  const inputFilFronte = useRef<HTMLInputElement>(null)
  const inputCamRetro = useRef<HTMLInputElement>(null)
  const inputFilRetro = useRef<HTMLInputElement>(null)
  const inputCamLibero = useRef<HTMLInputElement>(null)
  const inputFilLibero = useRef<HTMLInputElement>(null)
  const [toggleUnico, setToggleUnico] = useState(false)

  const { doc } = props
  const files = leggiFile(doc.file_url)
  const rifiutato = doc.stato === 'rifiutato'
  const frDoc = richiedeFronteRetro(doc.codice)

  const haLato = files.some(f => f.lato)
  const senzaLato = files.some(f => !f.lato)
  // Modalità "due caselle": solo documenti fronte/retro, salvo che il cliente scelga
  // "file unico" (o abbia già caricato un file senza lato, es. pratiche vecchie).
  const modoSlot = frDoc && !senzaLato && (haLato || !toggleUnico)

  const fronteFile = files.find(f => f.lato === 'fronte')
  const retroFile = files.find(f => f.lato === 'retro')
  const puoInviare = modoSlot ? (!!fronteFile && !!retroFile) : files.length > 0

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
    : modoSlot
      ? 'Servono due foto: fronte e retro'
      : frDoc
        ? 'Un unico file con fronte e retro'
        : (doc.descrizione || '')
  const subColor = rifiutato && doc.nota_admin ? '#B03A2E' : '#6B7280'

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

  // Casella singola FRONTE o RETRO
  function renderSlot(lato: 'fronte' | 'retro', file: FileCaricato | undefined, camRef: React.RefObject<HTMLInputElement | null>, filRef: React.RefObject<HTMLInputElement | null>) {
    const idx = file ? files.indexOf(file) : -1
    return (
      <div style={{ flex: 1, minWidth: 0, border: `1.5px ${file ? 'solid #C7D6EC' : 'dashed #B5C6E0'}`, borderRadius: 11, background: '#fff', padding: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colTile, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{lato}</div>
        {file ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>{renderMini(file, idx, 52)}</div>
        ) : props.eliminabile ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => camRef.current?.click()} aria-label={`Scatta il ${lato}`} style={{ width: 34, height: 34, borderRadius: '50%', background: bgTile, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IcoCamera size={16} color={colTile} /></button>
            <button onClick={() => filRef.current?.click()} aria-label={`Scegli file per il ${lato}`} style={{ width: 34, height: 34, borderRadius: '50%', background: bgTile, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><IcoFile size={15} color={colTile} /></button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div style={{ background: bgCard, border: `1.5px solid ${bordo}`, borderRadius: 14, padding: 14 }}>
      {/* input nascosti: due per le caselle, due per il caricamento libero */}
      <input ref={inputCamFronte} type="file" accept="image/*" capture="environment" onChange={e => props.onCarica(fileFromEvent(e), 'fronte')} className="hidden" />
      <input ref={inputFilFronte} type="file" accept="image/*,application/pdf" onChange={e => props.onCarica(fileFromEvent(e), 'fronte')} className="hidden" />
      <input ref={inputCamRetro} type="file" accept="image/*" capture="environment" onChange={e => props.onCarica(fileFromEvent(e), 'retro')} className="hidden" />
      <input ref={inputFilRetro} type="file" accept="image/*,application/pdf" onChange={e => props.onCarica(fileFromEvent(e), 'retro')} className="hidden" />
      <input ref={inputCamLibero} type="file" accept="image/*" capture="environment" multiple onChange={e => props.onCarica(fileFromEvent(e))} className="hidden" />
      <input ref={inputFilLibero} type="file" accept="image/*,application/pdf" multiple onChange={e => props.onCarica(fileFromEvent(e))} className="hidden" />

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: bgTile, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconaTipoDocumento nome={doc.nome} color={colTile} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14.5, color: '#111827', lineHeight: 1.3 }}>{doc.nome}</span>
            {rifiutato && (
              <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: '#C0392B', background: '#FBDADA', padding: '2px 9px', borderRadius: 20 }}>Da rifare</span>
            )}
          </div>
          {subtitle ? <div style={{ fontSize: 12, color: subColor, marginTop: 2, lineHeight: 1.4 }}>{subtitle}</div> : null}
        </div>

        {props.caricamento ? (
          <div style={{ flexShrink: 0 }}><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (!modoSlot && props.eliminabile) ? (
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'flex-start' }}>
            <BollinoAzione etichetta="Scatta" bg={bgTile} colore={colTile} onClick={() => inputCamLibero.current?.click()}>
              <IcoCamera size={18} color={colTile} />
            </BollinoAzione>
            <BollinoAzione etichetta="File" bg={bgTile} colore={colTile} onClick={() => inputFilLibero.current?.click()}>
              <IcoFile size={18} color={colTile} />
            </BollinoAzione>
          </div>
        ) : null}
      </div>

      {/* CASELLE FRONTE / RETRO */}
      {modoSlot && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {renderSlot('fronte', fronteFile, inputCamFronte, inputFilFronte)}
          {renderSlot('retro', retroFile, inputCamRetro, inputFilRetro)}
        </div>
      )}

      {/* MINIATURE (caricamento libero / file unico) */}
      {!modoSlot && files.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {files.map((f, idx) => renderMini(f, idx))}
          <span style={{ fontSize: 11.5, color: '#6B7280' }}>{files.length === 1 ? '1 file caricato' : `${files.length} file caricati`}</span>
        </div>
      )}

      {/* LINK cambia modalità: solo documenti fronte/retro e solo finché non c'è nulla di caricato */}
      {frDoc && props.eliminabile && files.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 11, paddingTop: 10, borderTop: '1px solid #EEF1F5' }}>
          {modoSlot ? (
            <button onClick={() => setToggleUnico(true)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Ho un unico file con fronte e retro</button>
          ) : (
            <button onClick={() => setToggleUnico(false)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#8a98a8', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Torna a fronte e retro separati</button>
          )}
        </div>
      )}

      {/* OPPURE: consegna della fotocopia a mano al ritiro (variante C).
          Appare solo finché non è stato caricato nulla. */}
      {props.onAMano && props.eliminabile && files.length === 0 && (
        <div style={{ marginTop: 11, paddingTop: 10, borderTop: '1px solid #EEF1F5' }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9AA7B5', marginBottom: 8 }}>oppure</div>
          <button
            onClick={props.onAMano}
            disabled={props.invio}
            style={{ width: '100%', padding: '11px 0', borderRadius: 11, background: '#fff', border: '1.5px solid #D7DCE5', fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}
          >
            <IcoMano size={15} color="#B45309" />
            Consegno la fotocopia a mano al ritiro
          </button>
          <p style={{ margin: '7px 0 0', textAlign: 'center', fontSize: 10.5, color: '#9AA7B5', lineHeight: 1.4 }}>
            Caricare le foto ora è più veloce: verifichiamo tutto prima del ritiro.
          </p>
        </div>
      )}

      {/* INVIO */}
      {props.eliminabile && files.length > 0 && (
        <>
          <button
            onClick={props.onInvia}
            disabled={props.invio || !puoInviare}
            style={{ width: '100%', marginTop: 12, padding: '11px 0', border: 'none', borderRadius: 11, background: (props.invio || !puoInviare) ? '#B8D9C6' : '#16A34A', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: (props.invio || !puoInviare) ? 'default' : 'pointer' }}
          >
            {props.invio ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Invio...</>
            ) : (
              <><IcoSend size={15} color="#fff" />Ho finito, invia in verifica</>
            )}
          </button>
          <p style={{ margin: '7px 0 0', textAlign: 'center', fontSize: 10.5, color: '#9AA7B5' }}>
            {modoSlot && !puoInviare
              ? (!fronteFile ? 'Carica il fronte per inviare' : 'Carica il retro per inviare')
              : 'Aggiungi tutte le foto necessarie, poi invia'}
          </p>
        </>
      )}
    </div>
  )
}

// ============================================================
// RIGA DOCUMENTO GIA' SISTEMATO (inviato in verifica o approvato)
// ============================================================

function CardSistemato(props: {
  doc: DocChecklist
  signedMap: Record<string, string>
  eliminabile: boolean
  onApri: (url: string, titolo: string) => void
  onElimina: (fileIdx: number) => void
}) {
  const { doc } = props
  const files = leggiFile(doc.file_url)
  const approvato = doc.stato === 'approvato'
  const primo = files[0]
  const url = primo ? (props.signedMap[primo.url] || primo.url) : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, background: '#fff' }}>
      <span style={{ flexShrink: 0 }}>{approvato ? <IcoCheck size={21} color="#1D9E75" /> : <IcoClock size={21} color="#d99412" />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{doc.nome}</div>
        {!approvato && <div style={{ fontSize: 11, color: '#d99412', marginTop: 1 }}>La stiamo verificando{files.length > 1 ? ` · ${files.length} file` : ''}</div>}
      </div>
      {approvato ? (
        <span style={{ fontSize: 11.5, color: '#1D9E75', fontWeight: 600, flexShrink: 0 }}>Approvato</span>
      ) : url ? (
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <button onClick={() => props.onApri(url, doc.nome)} style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#f3f5f8', display: 'block' }}>
            {isPdfUrl(primo?.nome) || isPdfUrl(primo?.url) ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: '#c0392b' }}>PDF</div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </button>
          {props.eliminabile && (
            <button onClick={() => props.onElimina(0)} aria-label="Elimina file" style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, background: '#C0392B', color: '#fff', borderRadius: '50%', fontSize: 11, fontWeight: 700, lineHeight: 1, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          )}
        </div>
      ) : null}
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