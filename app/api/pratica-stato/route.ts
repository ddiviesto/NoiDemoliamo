/**
 * Endpoint server-side che RICALCOLA lo stato di una pratica in base ai documenti.
 *
 * Usato dopo che l'admin approva/rifiuta i documenti: il browser dell'admin riesce
 * a modificare la checklist dei documenti ma NON lo stato della pratica (permessi DB),
 * quindi il ricalcolo dello stato va fatto qui col service role.
 *
 * Regole (solo se la pratica è ancora nella fase documenti):
 *   - tutti i documenti da caricare APPROVATI  → 'da_assegnare'
 *   - almeno uno RIFIUTATO                      → 'documenti_parzialmente_approvati'
 *   - almeno uno CARICATO (in verifica)         → 'in_attesa_approvazione_admin'
 *   - altrimenti (tutti ancora da fare)         → 'in_attesa_documenti'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'
const STATI_FASE_DOCUMENTI = ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati', 'da_assegnare']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    if (!praticaId) return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })

    // Verifica admin
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

    // Stato attuale
    const { data: pratica } = await supabase.from('pratiche').select('stato').eq('id', praticaId).single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
    if (!STATI_FASE_DOCUMENTI.includes(pratica.stato)) {
      return NextResponse.json({ success: true, stato: pratica.stato, cambiato: false })
    }

    // Checklist + catalogo (per sapere quali documenti richiedono un caricamento)
    const { data: righe } = await supabase.from('pratica_documenti_checklist').select('documento_id, stato').eq('pratica_id', praticaId)
    const docIds = Array.from(new Set((righe || []).map(r => r.documento_id)))
    const richiedeUpload = new Map<string, boolean>()
    if (docIds.length > 0) {
      const { data: cats } = await supabase.from('casistiche_documenti').select('id, richiede_upload').in('id', docIds)
      for (const c of cats || []) richiedeUpload.set(c.id as string, !!c.richiede_upload)
    }

    const daApprovare = (righe || []).filter(r => richiedeUpload.get(r.documento_id))
    let nuovo = pratica.stato
    if (daApprovare.length > 0) {
      const approvati = daApprovare.filter(r => r.stato === 'approvato').length
      const rifiutati = daApprovare.filter(r => r.stato === 'rifiutato').length
      const caricati = daApprovare.filter(r => r.stato === 'caricato').length
      if (approvati === daApprovare.length) nuovo = 'da_assegnare'
      else if (rifiutati > 0) nuovo = 'documenti_parzialmente_approvati'
      else if (caricati > 0) nuovo = 'in_attesa_approvazione_admin'
      else nuovo = 'in_attesa_documenti'
    }

    const cambiato = nuovo !== pratica.stato
    if (cambiato) {
      await supabase.from('pratiche').update({ stato: nuovo, aggiornato_il: new Date().toISOString() }).eq('id', praticaId)
    }

    return NextResponse.json({ success: true, stato: nuovo, cambiato })
  } catch (err) {
    console.error('Errore ricalcolo stato pratica:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
