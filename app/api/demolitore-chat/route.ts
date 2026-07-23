/**
 * Endpoint AREA DEMOLITORE: chat col cliente (23/07/2026).
 *
 * POST { pratica_id }                    → elenco messaggi demolitore↔cliente
 *                                          (e segna letti quelli del cliente)
 * POST { pratica_id, testo }             → invia un messaggio come demolitore
 *
 * Il cliente vede questi messaggi nella sua linguetta "Demolitore";
 * l'admin li legge (sola lettura) dalla chat del dettaglio pratica.
 * Sicurezza: la pratica deve essere assegnata al demolitore autenticato.
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore, praticaDelDemolitore } from '@/lib/demolitoreAuth'

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId, userId } = auth

    const body = await req.json().catch(() => ({}))
    const praticaId: string | undefined = body.pratica_id
    const testo: string | undefined = typeof body.testo === 'string' ? body.testo.trim() : undefined
    if (!praticaId) return NextResponse.json({ error: 'Manca la pratica' }, { status: 400 })

    const { pratica, errore } = await praticaDelDemolitore(supabase, praticaId, demolitoreId, 'id, stato')
    if (!pratica) return NextResponse.json({ error: errore }, { status: 404 })

    // ===== INVIO =====
    if (testo) {
      if (pratica.stato === 'annullata' || pratica.stato === 'completata') {
        return NextResponse.json({ error: 'La chat è chiusa per questa pratica' }, { status: 400 })
      }
      const { error } = await supabase.from('messaggi_chat').insert({
        pratica_id: praticaId,
        mittente_id: userId,
        mittente_tipo: 'demolitore',
        testo: testo.slice(0, 2000),
        letto: false,
      })
      if (error) {
        console.error('Errore invio messaggio demolitore:', error)
        return NextResponse.json({ error: 'Errore nell\'invio del messaggio' }, { status: 500 })
      }
    }

    // ===== ELENCO (sempre, anche dopo l'invio) =====
    const { data: messaggi, error: errM } = await supabase
      .from('messaggi_chat')
      .select('id, mittente_tipo, testo, creato_il')
      .eq('pratica_id', praticaId)
      .in('mittente_tipo', ['demolitore', 'cliente'])
      .order('creato_il', { ascending: true })
    if (errM) {
      console.error('Errore lettura chat demolitore:', errM)
      return NextResponse.json({ error: 'Errore nel caricamento dei messaggi' }, { status: 500 })
    }

    // Aprire la chat = leggere: i messaggi del cliente vengono segnati letti
    await supabase
      .from('messaggi_chat')
      .update({ letto: true })
      .eq('pratica_id', praticaId)
      .eq('mittente_tipo', 'cliente')
      .eq('letto', false)

    return NextResponse.json({ success: true, messaggi: messaggi || [] })
  } catch (err) {
    console.error('Errore endpoint demolitore-chat:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
