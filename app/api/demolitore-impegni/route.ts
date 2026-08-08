/**
 * Endpoint AREA DEMOLITORE: impegni personali dell'agenda Ritiri.
 *
 * Gli impegni sono PRIVATI del demolitore (ritiri e commissioni sue,
 * fuori da NoiDemoliamo): tabella demolitori_impegni, sempre filtrata
 * per il demolitore autenticato. Nemmeno l'admin ci passa.
 *
 * Finché la tabella non esiste (SQL docs/sql/2026-08-08-impegni-demolitore.sql)
 * si risponde con l'elenco vuoto e pronta:false, senza errori in faccia
 * (la pagina nasconde il bottone "Aggiungi impegno").
 *
 * Azioni (POST):
 *   { azione: 'lista' }                          → tutti gli impegni
 *   { azione: 'aggiungi', quando, titolo, luogo? } → nuovo impegno
 *   { azione: 'elimina', id }                    → via l'impegno
 * Tutte rispondono con l'elenco aggiornato: { success, pronta, impegni }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore } from '@/lib/demolitoreAuth'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Impegno { id: string; quando: string; titolo: string; luogo: string | null }

async function leggiImpegni(supabase: SupabaseClient, demolitoreId: string): Promise<Impegno[] | null> {
  const { data, error } = await supabase
    .from('demolitori_impegni')
    .select('id, quando, titolo, luogo')
    .eq('demolitore_id', demolitoreId)
    .order('quando', { ascending: true })
  if (error) return null // tipicamente: tabella non ancora creata
  return (data as Impegno[]) || []
}

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const body = await req.json().catch(() => ({}))
    const azione: string = body.azione || 'lista'

    let impegni = await leggiImpegni(supabase, demolitoreId)
    if (impegni === null) return NextResponse.json({ success: true, pronta: false, impegni: [] })

    if (azione === 'aggiungi') {
      const titolo = String(body.titolo || '').trim().slice(0, 200)
      const luogo = String(body.luogo || '').trim().slice(0, 200) || null
      const quando = new Date(String(body.quando || ''))
      if (!titolo) return NextResponse.json({ error: 'Scrivi cosa devi fare' }, { status: 400 })
      if (isNaN(quando.getTime())) return NextResponse.json({ error: 'Scegli giorno e ora' }, { status: 400 })
      const { error } = await supabase.from('demolitori_impegni').insert({
        demolitore_id: demolitoreId, quando: quando.toISOString(), titolo, luogo,
      })
      if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
      impegni = (await leggiImpegni(supabase, demolitoreId)) || []
    }

    if (azione === 'elimina') {
      if (!body.id) return NextResponse.json({ error: 'Impegno non trovato' }, { status: 400 })
      // Filtro demolitore_id SEMPRE: ognuno tocca solo i suoi impegni
      const { error } = await supabase.from('demolitori_impegni')
        .delete()
        .eq('id', body.id)
        .eq('demolitore_id', demolitoreId)
      if (error) return NextResponse.json({ error: 'Errore nell\'eliminazione' }, { status: 500 })
      impegni = (await leggiImpegni(supabase, demolitoreId)) || []
    }

    return NextResponse.json({ success: true, pronta: true, impegni })
  } catch (err) {
    console.error('Errore endpoint demolitore-impegni:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
