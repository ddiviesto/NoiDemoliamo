/**
 * Endpoint AREA DEMOLITORE: cronologia condivisa della pratica (23/07/2026,
 * ⭐ riscritto il 28/07 sera per i CANALI).
 *
 * POST { pratica_id }          → le voci del CANALE CONDIVISO: eventi che lo
 *                                riguardano (assegnazione, ritiro, certificati)
 *                                + note a due voci (sue e di NoiDemoliamo)
 * POST { pratica_id, testo }   → aggiunge una sua nota al canale
 *
 * Regole: il demolitore NON vede mai le note private dell'admin né gli
 * eventi della fase documenti; vede solo le voci con visibile_demolitore
 * legate al SUO demolitore_id (dopo una riassegnazione, il nuovo demolitore
 * non vede le voci del precedente).
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore, praticaDelDemolitore } from '@/lib/demolitoreAuth'

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const body = await req.json().catch(() => ({}))
    const praticaId: string | undefined = body.pratica_id
    const testo: string | undefined = typeof body.testo === 'string' ? body.testo.trim() : undefined
    if (!praticaId) return NextResponse.json({ error: 'Manca la pratica' }, { status: 400 })

    const { pratica, errore } = await praticaDelDemolitore(supabase, praticaId, demolitoreId, 'id, stato')
    if (!pratica) return NextResponse.json({ error: errore }, { status: 404 })

    if (testo) {
      if (pratica.stato === 'annullata') {
        return NextResponse.json({ error: 'La pratica non è più attiva' }, { status: 400 })
      }
      const { error } = await supabase.from('pratiche_note').insert({
        pratica_id: praticaId,
        testo: testo.slice(0, 1000),
        autore: 'demolitore',
        visibile_demolitore: true,
        demolitore_id: demolitoreId,
      })
      if (error) {
        console.error('Errore inserimento nota demolitore:', error)
        return NextResponse.json({ error: 'Errore nel salvataggio della nota' }, { status: 500 })
      }
    }

    // Il canale condiviso: voci visibili al demolitore, legate a LUI
    // (le righe vecchie senza demolitore_id restano visibili per compatibilità)
    const { data: note, error: errN } = await supabase
      .from('pratiche_note')
      .select('id, testo, creato_il, autore, evento, demolitore_id')
      .eq('pratica_id', praticaId)
      .eq('visibile_demolitore', true)
      .order('creato_il', { ascending: false })
    if (errN) {
      console.error('Errore lettura note demolitore:', errN)
      return NextResponse.json({ error: 'Errore nel caricamento delle note' }, { status: 500 })
    }

    const sue = (note || []).filter(n => !n.demolitore_id || n.demolitore_id === demolitoreId)
    return NextResponse.json({ success: true, note: sue })
  } catch (err) {
    console.error('Errore endpoint demolitore-note:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
