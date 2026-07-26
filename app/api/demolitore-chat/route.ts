/**
 * Endpoint AREA DEMOLITORE: chat a DUE canali (23/07, canali 26/07).
 *
 * POST { pratica_id, canale? }           → elenco messaggi del canale
 *                                          (e segna letti quelli diretti al demolitore)
 * POST { pratica_id, canale?, testo }    → invia un messaggio come demolitore
 *
 * canale: 'cliente' (default, demolitore↔cliente) oppure 'noidemoliamo'
 * (demolitore↔admin, canale 26/07 — SQL 2026-07-26-chat-conversazioni.sql).
 * I messaggi vecchi (conversazione NULL) valgono come demolitore↔cliente.
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
    const canale: 'cliente' | 'noidemoliamo' = body.canale === 'noidemoliamo' ? 'noidemoliamo' : 'cliente'
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
        conversazione: canale === 'noidemoliamo' ? 'demolitore_noidemoliamo' : 'cliente_demolitore',
      })
      if (error) {
        console.error('Errore invio messaggio demolitore:', error)
        return NextResponse.json({ error: 'Errore nell\'invio del messaggio' }, { status: 500 })
      }
    }

    // ===== ELENCO (sempre, anche dopo l'invio) =====
    const { data, error: errM } = await supabase
      .from('messaggi_chat')
      .select('id, mittente_tipo, testo, creato_il, conversazione')
      .eq('pratica_id', praticaId)
      .order('creato_il', { ascending: true })
    if (errM) {
      console.error('Errore lettura chat demolitore:', errM)
      return NextResponse.json({ error: 'Errore nel caricamento dei messaggi' }, { status: 500 })
    }
    type Riga = { id: string; mittente_tipo: string; testo: string; creato_il: string; conversazione: string | null }
    const messaggi = ((data || []) as Riga[]).filter(m =>
      canale === 'cliente'
        ? m.conversazione === 'cliente_demolitore' || (m.conversazione == null && (m.mittente_tipo === 'demolitore' || m.mittente_tipo === 'cliente'))
        : m.conversazione === 'demolitore_noidemoliamo'
    )

    // Aprire il canale = leggere: si segnano letti i messaggi diretti al demolitore
    if (canale === 'cliente') {
      await supabase
        .from('messaggi_chat')
        .update({ letto: true })
        .eq('pratica_id', praticaId)
        .eq('mittente_tipo', 'cliente')
        .eq('letto', false)
        .or('conversazione.eq.cliente_demolitore,conversazione.is.null')
    } else {
      await supabase
        .from('messaggi_chat')
        .update({ letto: true })
        .eq('pratica_id', praticaId)
        .eq('mittente_tipo', 'admin')
        .eq('conversazione', 'demolitore_noidemoliamo')
        .eq('letto', false)
    }

    return NextResponse.json({ success: true, messaggi })
  } catch (err) {
    console.error('Errore endpoint demolitore-chat:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
