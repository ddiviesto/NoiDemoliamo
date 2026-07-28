/**
 * Endpoint server-side che RICALCOLA lo stato di una pratica in base ai documenti.
 *
 * Chiamato dall'admin (dopo approva/rifiuta) e dal CLIENTE proprietario (dopo
 * l'invio in verifica di un documento): il browser non può modificare lo stato
 * della pratica (permessi DB), quindi il ricalcolo va fatto qui col service role.
 *
 * Regole (solo se la pratica è ancora nella fase documenti):
 *   - tutti i documenti da caricare APPROVATI    → 'da_assegnare'
 *   - almeno uno RIFIUTATO                        → 'documenti_parzialmente_approvati'
 *   - TUTTI inviati (nessuno più in mano cliente) → 'in_attesa_approvazione_admin'
 *   - altrimenti (il cliente sta ancora caricando)→ 'in_attesa_documenti'
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

    // Verifica utente: admin oppure cliente proprietario della pratica
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Stato attuale
    const { data: pratica } = await supabase.from('pratiche').select('stato, user_id').eq('id', praticaId).single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
    const isAdmin = user.email === ADMIN_EMAIL
    if (!isAdmin && pratica.user_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
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
      const daFare = daApprovare.filter(r => r.stato === 'da_fare').length
      if (approvati === daApprovare.length) nuovo = 'da_assegnare'
      else if (rifiutati > 0) nuovo = 'documenti_parzialmente_approvati'
      // "In verifica" solo quando il cliente ha inviato TUTTO: finché resta
      // anche un solo documento da fare, la pratica è ancora in mano sua.
      else if (daFare === 0) nuovo = 'in_attesa_approvazione_admin'
      else nuovo = 'in_attesa_documenti'
    }

    const cambiato = nuovo !== pratica.stato
    if (cambiato) {
      await supabase.from('pratiche').update({ stato: nuovo, aggiornato_il: new Date().toISOString() }).eq('id', praticaId)
      // ⭐ 28/07 sera: il cambio di stato entra da solo nel REGISTRO della
      // pratica (evento 'stato', il testo è il codice — la pillola vera la
      // disegna la cronologia). Se la colonna non c'è ancora, pazienza.
      await supabase.from('pratiche_note').insert({ pratica_id: praticaId, testo: nuovo, evento: 'stato' })
    }

    return NextResponse.json({ success: true, stato: nuovo, cambiato })
  } catch (err) {
    console.error('Errore ricalcolo stato pratica:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
