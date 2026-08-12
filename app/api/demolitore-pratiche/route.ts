/**
 * Endpoint AREA DEMOLITORE: lettura pratiche.
 *
 * POST senza pratica_id  → elenco di TUTTE le pratiche del demolitore
 *                          (comprese annullate e completate) con i campi
 *                          per le liste della dashboard.
 * POST con pratica_id    → dettaglio completo di UNA pratica: dati, foto,
 *                          documenti approvati (con URL firmati 1h) e
 *                          lista "da farti consegnare al ritiro".
 *
 * Sicurezza: vedi lib/demolitoreAuth.ts — filtro demolitore_id SEMPRE attivo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore } from '@/lib/demolitoreAuth'
import { calcolaDistanzeStradali } from '@/lib/assegnazione'

// ⭐ 08/08: cache del VIAGGIO (km · minuti, Google Distance Matrix) per non
// pagare una chiamata a ogni apertura del pannello. In memoria: si svuota
// al riavvio del server, va benissimo (il tragitto non cambia).
const cacheViaggi = new Map<string, { km: number; minuti: number } | null>()

// Campi mostrati nelle liste (niente dati superflui in giro)
const CAMPI_LISTA = [
  'id', 'stato', 'targa', 'tipo_mezzo', 'tipo_mezzo_altro', 'marca', 'modello', 'anno', 'km', 'casistica',
  'nome_richiedente', 'telefono', 'codice_fiscale', 'indirizzo_ritiro', 'comune_ritiro', 'provincia_ritiro', 'marciante',
  'delegato_nome', 'data_assegnazione', 'scadenza_proposta_ritiro', 'data_ritiro_prevista',
  'data_ritiro_effettuato', 'data_certificato_rottamazione', 'data_certificato_pra',
  'cert_rottamazione_a_mano', 'motivo_annullamento', 'aggiornato_il', 'creato_il',
].join(', ')

interface FileDoc { url: string; nome?: string; lato?: string }

// ⭐ 07/08 (documenti bianchi nel visore, segnalato da Davide): i file sono
// salvati con l'URL COMPLETO del bucket privato — così com'è non si apre.
// Come fa l'admin: si estrae il percorso dopo /documenti-pratiche/ e si
// firma quello. Torna null se l'URL non è del bucket.
function estraiPathBucket(url: string): string | null {
  const marker = '/documenti-pratiche/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length).split('?')[0]
}

// file_url può essere: array JSON, stringa JSON, o singolo path (legacy)
function leggiFile(fileUrl: unknown): FileDoc[] {
  if (!fileUrl) return []
  if (Array.isArray(fileUrl)) return fileUrl as FileDoc[]
  if (typeof fileUrl === 'string') {
    try {
      const parsed = JSON.parse(fileUrl)
      return Array.isArray(parsed) ? parsed : [{ url: fileUrl }]
    } catch {
      return [{ url: fileUrl }]
    }
  }
  return []
}

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const body = await req.json().catch(() => ({}))
    const praticaId: string | undefined = body.pratica_id

    // ===== ELENCO =====
    if (!praticaId) {
      const { data, error } = await supabase
        .from('pratiche')
        .select(CAMPI_LISTA)
        .eq('demolitore_id', demolitoreId)
        .order('aggiornato_il', { ascending: false })
      if (error) {
        console.error('Errore elenco pratiche demolitore:', error)
        return NextResponse.json({ error: 'Errore nel caricamento delle pratiche' }, { status: 500 })
      }
      // Pallino chat: messaggi del cliente non ancora letti, per pratica.
      // ⭐ 12/08 (deciso con Davide): come per la chat, contano SOLO i
      // messaggi da quando la pratica è del demolitore attuale — quelli
      // dell'era del predecessore non esistono per lui
      const pratiche = (data || []) as unknown as { id: string; data_assegnazione?: string | null; non_letti?: number }[]
      if (pratiche.length > 0) {
        const { data: nonLetti } = await supabase
          .from('messaggi_chat')
          .select('pratica_id, creato_il')
          .in('pratica_id', pratiche.map(p => p.id))
          .eq('mittente_tipo', 'cliente')
          .eq('letto', false)
        const daQuando: Record<string, string | null> = {}
        for (const p of pratiche) daQuando[p.id] = p.data_assegnazione || null
        const conta: Record<string, number> = {}
        for (const m of (nonLetti || []) as { pratica_id: string; creato_il: string }[]) {
          const soglia = daQuando[m.pratica_id]
          if (soglia && m.creato_il < soglia) continue
          conta[m.pratica_id] = (conta[m.pratica_id] || 0) + 1
        }
        for (const p of pratiche) p.non_letti = conta[p.id] || 0

        // ⭐ 12/08 (spia note): le NOTE di NoiDemoliamo non ancora lette,
        // per pratica — accendono la spia sulla riga. Se la colonna letta
        // non esiste ancora, silenzio (niente spie)
        const { data: noteNuove, error: errNote } = await supabase
          .from('pratiche_note')
          .select('pratica_id, demolitore_id')
          .in('pratica_id', pratiche.map(p => p.id))
          .eq('visibile_demolitore', true)
          .eq('letta', false)
          .is('evento', null)
          .neq('autore', 'demolitore')
        if (!errNote) {
          const contaNote: Record<string, number> = {}
          for (const n of (noteNuove || []) as { pratica_id: string; demolitore_id: string | null }[]) {
            if (n.demolitore_id && n.demolitore_id !== demolitoreId) continue
            contaNote[n.pratica_id] = (contaNote[n.pratica_id] || 0) + 1
          }
          for (const p of pratiche as (typeof pratiche[number] & { note_non_lette?: number })[]) p.note_non_lette = contaNote[p.id] || 0
        }
      }
      return NextResponse.json({ success: true, pratiche })
    }

    // ===== DETTAGLIO =====
    const { data: pratica, error: errP } = await supabase
      .from('pratiche')
      .select('*')
      .eq('id', praticaId)
      .eq('demolitore_id', demolitoreId)
      .maybeSingle()
    if (errP || !pratica) {
      return NextResponse.json({ error: 'Pratica non trovata o non assegnata a te' }, { status: 404 })
    }

    // Foto del veicolo (bucket pubblico: gli url sono già pronti)
    const { data: foto } = await supabase
      .from('foto_pratiche')
      .select('url, caricato_il')
      .eq('pratica_id', praticaId)
      .order('caricato_il', { ascending: true })

    // Checklist documenti + catalogo (per approvati e "da consegnare")
    const { data: righe } = await supabase
      .from('pratica_documenti_checklist')
      .select('id, stato, file_url, indice_erede, casistiche_documenti (codice, nome, richiede_consegna, richiede_upload, template_pdf, ordine)')
      .eq('pratica_id', praticaId)

    type RigaChecklist = {
      id: string
      stato: string
      file_url: unknown
      indice_erede: number | null
      casistiche_documenti: { codice: string; nome: string; richiede_consegna: boolean; richiede_upload: boolean; template_pdf: string | null; ordine: number | null } | null
    }
    const checklist = (righe || []) as unknown as RigaChecklist[]

    // Documenti APPROVATI con URL firmati (bucket privato, validità 1 ora)
    const documentiApprovati: { nome: string; files: FileDoc[] }[] = []
    for (const riga of checklist) {
      if (riga.stato !== 'approvato' || !riga.casistiche_documenti) continue
      const files: FileDoc[] = []
      for (const f of leggiFile(riga.file_url)) {
        if (!f.url) continue
        // URL completo del bucket privato O percorso nudo → si firma sempre;
        // un http di un altro dominio passa così com'è
        const path = f.url.startsWith('http') ? estraiPathBucket(f.url) : f.url
        if (path) {
          const { data: firmato } = await supabase.storage.from('documenti-pratiche').createSignedUrl(path, 3600)
          if (firmato?.signedUrl) files.push({ ...f, url: firmato.signedUrl })
        } else if (f.url.startsWith('http')) {
          files.push(f)
        }
      }
      if (files.length > 0) {
        const suffisso = riga.indice_erede != null && riga.indice_erede > 0 ? ` (erede ${riga.indice_erede})` : ''
        documentiApprovati.push({ nome: `${riga.casistiche_documenti.nome}${suffisso}`, files })
      }
    }

    // "Da farti consegnare al ritiro": documenti col flag richiede_consegna.
    // I moduli PDF sono segnalati: il demolitore deve ritirare l'ORIGINALE FIRMATO.
    const daConsegnare: string[] = []
    for (const riga of checklist) {
      const doc = riga.casistiche_documenti
      if (!doc?.richiede_consegna) continue
      // ⭐ 07/08 (regola 11, segnalato da Davide): niente trattini "—" nei
      // testi visibili — al loro posto i due punti
      const nome = doc.template_pdf ? `${doc.nome}: modulo firmato in originale` : doc.nome
      if (!daConsegnare.includes(nome)) daConsegnare.push(nome)
    }

    // ⭐ 08/08 (richiesta Davide): la LISTA COMPLETA dei documenti della
    // pratica per "Originali da consegnare al ritiro" — quelli da farsi
    // consegnare in originale (consegna: true) E quelli che il cliente ha
    // caricato online (caricato: true, li trova in Documenti e Foto).
    // Come nel CRM: libretto fuori lista quando è "da chiarire".
    const documentiRitiro: { nome: string; consegna: boolean; caricato: boolean }[] = []
    const ordinate = [...checklist].sort((a, b) => (a.casistiche_documenti?.ordine ?? 0) - (b.casistiche_documenti?.ordine ?? 0))
    for (const riga of ordinate) {
      const doc = riga.casistiche_documenti
      if (!doc || (!doc.richiede_consegna && !doc.richiede_upload)) continue
      const libretto = doc.codice === 'LIBRETTO_CIRCOLAZIONE' || doc.codice === 'LIBRETTO_ESTERO'
      if (libretto && (pratica as { libretto?: string | null }).libretto === 'no') continue
      const nome = doc.template_pdf && doc.richiede_consegna ? `${doc.nome}: modulo firmato in originale` : doc.nome
      // "Caricato online" = il cliente l'ha INVIATO (stato caricato/approvato)
      const caricato = !!doc.richiede_upload && ['caricato', 'approvato'].includes(riga.stato)
      const esistente = documentiRitiro.find(x => x.nome === nome)
      if (esistente) {
        esistente.consegna = esistente.consegna || !!doc.richiede_consegna
        esistente.caricato = esistente.caricato || caricato
      } else {
        documentiRitiro.push({ nome, consegna: !!doc.richiede_consegna, caricato })
      }
    }

    // ⭐ 08/08: il VIAGGIO sede → indirizzo di ritiro (pillola in testata
    // del pannello Fissa il ritiro), con la cache per pratica
    let viaggio: { km: number; minuti: number } | null = null
    const pr = pratica as { lat?: number | null; lng?: number | null }
    const chiaveViaggio = `${demolitoreId}:${praticaId}`
    if (pr.lat != null && pr.lng != null) {
      if (cacheViaggi.has(chiaveViaggio)) {
        viaggio = cacheViaggi.get(chiaveViaggio) || null
      } else {
        const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY
        const { data: demo } = await supabase.from('demolitori').select('lat, lng').eq('id', demolitoreId).single()
        if (apiKey && demo?.lat != null && demo?.lng != null) {
          const esiti = await calcolaDistanzeStradali(apiKey, pr.lat, pr.lng, [{ lat: demo.lat, lng: demo.lng }])
          viaggio = esiti[0] ? { km: Math.round(esiti[0].km), minuti: Math.round(esiti[0].minuti) } : null
          cacheViaggi.set(chiaveViaggio, viaggio)
        }
      }
    }

    return NextResponse.json({
      success: true,
      pratica,
      foto: (foto || []).map(f => f.url),
      documenti_approvati: documentiApprovati,
      da_consegnare: daConsegnare,
      documenti_ritiro: documentiRitiro,
      viaggio,
    })
  } catch (err) {
    console.error('Errore endpoint demolitore-pratiche:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
