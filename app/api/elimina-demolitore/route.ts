/**
 * Endpoint server-side: ELIMINAZIONE DEFINITIVA di un demolitore.
 *
 * Cancella PER SEMPRE dal database:
 *   - copertura geografica (demolitori_comuni)
 *   - tariffe per zona (demolitori_tariffe)
 *   - note e cronologia (demolitori_note)
 *   - account di accesso all'area demolitore (utenti + login auth)
 *   - la riga demolitori
 *
 * Protezioni:
 *   - BLOCCA se il demolitore ha pratiche APERTE (né completate né annullate):
 *     prima vanno riassegnate o chiuse, altrimenti resterebbero orfane.
 *   - Le pratiche storiche (completate/annullate) NON si toccano: perdono solo
 *     il riferimento al demolitore (demolitore_id → null).
 *
 * Sicurezza: SUPABASE_SERVICE_ROLE_KEY + verifica admin via Authorization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

const TABELLE_COLLEGATE = ['demolitori_comuni', 'demolitori_tariffe', 'demolitori_note']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const demolitoreId: string | undefined = body.demolitore_id
    if (!demolitoreId) {
      return NextResponse.json({ error: 'demolitore_id mancante' }, { status: 400 })
    }

    // Verifica admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Il demolitore esiste?
    const { data: dem } = await supabase.from('demolitori').select('id, ragione_sociale').eq('id', demolitoreId).single()
    if (!dem) {
      return NextResponse.json({ error: 'Demolitore non trovato' }, { status: 404 })
    }

    // BLOCCO: pratiche aperte assegnate a lui
    const { count: aperte } = await supabase
      .from('pratiche')
      .select('id', { count: 'exact', head: true })
      .eq('demolitore_id', demolitoreId)
      .not('stato', 'in', '("completata","annullata")')
    if (aperte && aperte > 0) {
      return NextResponse.json({
        error: `Questo demolitore ha ${aperte} pratic${aperte === 1 ? 'a aperta' : 'he aperte'}: riassegnale o chiudile prima di eliminarlo.`,
      }, { status: 409 })
    }

    // Le pratiche storiche perdono il riferimento (non si cancellano)
    const { error: errPratiche } = await supabase
      .from('pratiche')
      .update({ demolitore_id: null })
      .eq('demolitore_id', demolitoreId)
    if (errPratiche) {
      console.error('Errore scollegamento pratiche storiche:', errPratiche)
      return NextResponse.json({ error: `Errore nello scollegamento delle pratiche storiche: ${errPratiche.message}` }, { status: 500 })
    }

    // Account di accesso del demolitore (utenti + login auth)
    const { data: account } = await supabase.from('utenti').select('id').eq('demolitore_id', demolitoreId)
    for (const a of account || []) {
      await supabase.from('utenti').delete().eq('id', a.id)
      try { await supabase.auth.admin.deleteUser(a.id) } catch (e) { console.warn('deleteUser:', e) }
    }

    // Righe collegate (best effort)
    for (const tabella of TABELLE_COLLEGATE) {
      const { error } = await supabase.from(tabella).delete().eq('demolitore_id', demolitoreId)
      if (error) console.warn(`Delete ${tabella}:`, error.message)
    }

    // La riga demolitori
    const { error: errDem } = await supabase.from('demolitori').delete().eq('id', demolitoreId)
    if (errDem) {
      console.error('Errore delete demolitore:', errDem)
      return NextResponse.json({ error: `Errore durante l'eliminazione: ${errDem.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, eliminato: dem.ragione_sociale })
  } catch (err) {
    console.error('Errore endpoint elimina-demolitore:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
