/**
 * Endpoint AREA DEMOLITORE: note cronologiche del demolitore (23/07/2026).
 *
 * POST { pratica_id }          → elenco delle SUE note sulla pratica
 * POST { pratica_id, testo }   → aggiunge una nota ("chiamato, non risponde")
 *
 * Le note finiscono in `pratiche_note` con autore='demolitore': l'admin le
 * vede nella cronologia del dettaglio pratica (pillola dedicata). Il
 * demolitore vede SOLO le proprie note — mai quelle interne dell'admin.
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
      })
      if (error) {
        console.error('Errore inserimento nota demolitore:', error)
        return NextResponse.json({ error: 'Errore nel salvataggio della nota' }, { status: 500 })
      }
    }

    const { data: note, error: errN } = await supabase
      .from('pratiche_note')
      .select('id, testo, creato_il')
      .eq('pratica_id', praticaId)
      .eq('autore', 'demolitore')
      .order('creato_il', { ascending: false })
    if (errN) {
      console.error('Errore lettura note demolitore:', errN)
      return NextResponse.json({ error: 'Errore nel caricamento delle note' }, { status: 500 })
    }

    return NextResponse.json({ success: true, note: note || [] })
  } catch (err) {
    console.error('Errore endpoint demolitore-note:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
