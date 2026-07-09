/**
 * Endpoint admin: dopo la telefonata al cliente che "non sa che certificato
 * di proprietà ha" (certificato_proprieta='nessuno'), l'admin registra
 * l'esito con i bottoni Cartaceo / Digitale (/ Smarrito, supportato).
 *
 * Cosa fa (col service role):
 *  1. aggiorna `pratiche.certificato_proprieta`
 *  2. SINCRONIZZA la checklist documenti col catalogo:
 *     - cartaceo → aggiunge "Certificato di Proprietà cartaceo" (condizione
 *       cdc_cartaceo: upload fronte/retro + originale al ritiro)
 *     - smarrito → aggiunge la denuncia (condizione cdc_smarrito)
 *     - digitale → non serve nulla
 *     Le righe della condizione che non vale più vengono tolte SOLO se
 *     ancora "da_fare" e senza file (mai buttare roba caricata dal cliente).
 *  3. ricalcola lo stato della pratica (il nuovo documento può riportarla
 *     "in mano al cliente")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'
const STATI_FASE_DOCUMENTI = ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati', 'da_assegnare']

// Per ogni esito: condizioni del catalogo da AGGIUNGERE e da TOGLIERE
const SYNC: Record<string, { aggiungi: string[]; togli: string[] }> = {
  cartaceo: { aggiungi: ['cdc_cartaceo'], togli: ['cdc_smarrito'] },
  digitale: { aggiungi: [], togli: ['cdc_cartaceo', 'cdc_smarrito'] },
  smarrito: { aggiungi: ['cdc_smarrito'], togli: ['cdc_cartaceo'] },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    const cdc: string | undefined = body.cdc
    if (!praticaId || !cdc || !SYNC[cdc]) {
      return NextResponse.json({ error: 'Servono pratica_id e cdc (cartaceo | digitale | smarrito)' }, { status: 400 })
    }

    // Solo admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: pratica } = await supabase.from('pratiche').select('stato, casistica, numero_eredi').eq('id', praticaId).single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

    // 1. Registra l'esito della telefonata
    await supabase.from('pratiche').update({ certificato_proprieta: cdc, aggiornato_il: new Date().toISOString() }).eq('id', praticaId)

    // 2. Sincronizza la checklist col catalogo
    const { aggiungi, togli } = SYNC[cdc]
    const condizioni = [...aggiungi, ...togli]
    const { data: catalogo } = await supabase
      .from('casistiche_documenti')
      .select('id, condizione, per_erede')
      .eq('casistica', pratica.casistica)
      .in('condizione', condizioni)

    const { data: righeEsistenti } = await supabase
      .from('pratica_documenti_checklist')
      .select('id, documento_id, indice_erede, stato, file_url')
      .eq('pratica_id', praticaId)

    const esistentiPerDoc = new Map<string, { id: string; indice_erede: number | null; stato: string; file_url: string | null }[]>()
    for (const r of righeEsistenti || []) {
      const lista = esistentiPerDoc.get(r.documento_id) || []
      lista.push(r)
      esistentiPerDoc.set(r.documento_id, lista)
    }

    // Aggiunte: una riga per documento (× erede se per_erede)
    const daInserire: { pratica_id: string; documento_id: string; indice_erede: number | null; stato: string }[] = []
    for (const doc of (catalogo || []).filter(c => aggiungi.includes(c.condizione as string))) {
      const esistenti = esistentiPerDoc.get(doc.id as string) || []
      const indici: (number | null)[] = doc.per_erede
        ? Array.from({ length: Math.max(1, pratica.numero_eredi || 1) }, (_, i) => i + 1)
        : [null]
      for (const indice of indici) {
        const giaPresente = esistenti.some(e => (e.indice_erede ?? 0) === (indice ?? 0))
        if (!giaPresente) daInserire.push({ pratica_id: praticaId, documento_id: doc.id as string, indice_erede: indice, stato: 'da_fare' })
      }
    }
    if (daInserire.length > 0) {
      const { error: errIns } = await supabase.from('pratica_documenti_checklist').insert(daInserire)
      if (errIns) throw errIns
    }

    // Rimozioni: SOLO righe ancora da fare e senza file caricati
    const idDaTogliere: string[] = []
    for (const doc of (catalogo || []).filter(c => togli.includes(c.condizione as string))) {
      for (const r of esistentiPerDoc.get(doc.id as string) || []) {
        if (r.stato === 'da_fare' && !r.file_url) idDaTogliere.push(r.id)
      }
    }
    if (idDaTogliere.length > 0) {
      await supabase.from('pratica_documenti_checklist').delete().in('id', idDaTogliere)
    }

    // 3. Ricalcola lo stato della pratica (stesse regole di /api/pratica-stato)
    let nuovoStato = pratica.stato
    if (STATI_FASE_DOCUMENTI.includes(pratica.stato)) {
      const { data: righe } = await supabase.from('pratica_documenti_checklist').select('documento_id, stato').eq('pratica_id', praticaId)
      const docIds = Array.from(new Set((righe || []).map(r => r.documento_id)))
      const richiedeUpload = new Map<string, boolean>()
      if (docIds.length > 0) {
        const { data: cats } = await supabase.from('casistiche_documenti').select('id, richiede_upload').in('id', docIds)
        for (const c of cats || []) richiedeUpload.set(c.id as string, !!c.richiede_upload)
      }
      const daApprovare = (righe || []).filter(r => richiedeUpload.get(r.documento_id))
      if (daApprovare.length > 0) {
        const approvati = daApprovare.filter(r => r.stato === 'approvato').length
        const rifiutati = daApprovare.filter(r => r.stato === 'rifiutato').length
        const daFare = daApprovare.filter(r => r.stato === 'da_fare').length
        if (approvati === daApprovare.length) nuovoStato = 'da_assegnare'
        else if (rifiutati > 0) nuovoStato = 'documenti_parzialmente_approvati'
        else if (daFare === 0) nuovoStato = 'in_attesa_approvazione_admin'
        else nuovoStato = 'in_attesa_documenti'
      }
      if (nuovoStato !== pratica.stato) {
        await supabase.from('pratiche').update({ stato: nuovoStato, aggiornato_il: new Date().toISOString() }).eq('id', praticaId)
      }
    }

    return NextResponse.json({ success: true, cdc, aggiunti: daInserire.length, rimossi: idDaTogliere.length, stato: nuovoStato })
  } catch (err) {
    console.error('Errore impostazione certificato di proprietà:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
