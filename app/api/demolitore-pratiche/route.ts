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

// Campi mostrati nelle liste (niente dati superflui in giro)
const CAMPI_LISTA = [
  'id', 'stato', 'targa', 'tipo_mezzo', 'tipo_mezzo_altro', 'marca', 'modello',
  'nome_richiedente', 'comune_ritiro', 'provincia_ritiro', 'marciante',
  'data_assegnazione', 'scadenza_proposta_ritiro', 'data_ritiro_prevista',
  'data_ritiro_effettuato', 'data_certificato_rottamazione', 'data_certificato_pra',
  'cert_rottamazione_a_mano', 'motivo_annullamento', 'aggiornato_il', 'creato_il',
].join(', ')

interface FileDoc { url: string; nome?: string; lato?: string }

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
      return NextResponse.json({ success: true, pratiche: data || [] })
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
      .select('id, stato, file_url, indice_erede, casistiche_documenti (codice, nome, richiede_consegna, richiede_upload, template_pdf)')
      .eq('pratica_id', praticaId)

    type RigaChecklist = {
      id: string
      stato: string
      file_url: unknown
      indice_erede: number | null
      casistiche_documenti: { codice: string; nome: string; richiede_consegna: boolean; richiede_upload: boolean; template_pdf: string | null } | null
    }
    const checklist = (righe || []) as unknown as RigaChecklist[]

    // Documenti APPROVATI con URL firmati (bucket privato, validità 1 ora)
    const documentiApprovati: { nome: string; files: FileDoc[] }[] = []
    for (const riga of checklist) {
      if (riga.stato !== 'approvato' || !riga.casistiche_documenti) continue
      const files: FileDoc[] = []
      for (const f of leggiFile(riga.file_url)) {
        if (!f.url) continue
        if (f.url.startsWith('http')) {
          files.push(f)
        } else {
          const { data: firmato } = await supabase.storage.from('documenti-pratiche').createSignedUrl(f.url, 3600)
          if (firmato?.signedUrl) files.push({ ...f, url: firmato.signedUrl })
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
      const nome = doc.template_pdf ? `${doc.nome} — modulo firmato in originale` : doc.nome
      if (!daConsegnare.includes(nome)) daConsegnare.push(nome)
    }

    return NextResponse.json({
      success: true,
      pratica,
      foto: (foto || []).map(f => f.url),
      documenti_approvati: documentiApprovati,
      da_consegnare: daConsegnare,
    })
  } catch (err) {
    console.error('Errore endpoint demolitore-pratiche:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
