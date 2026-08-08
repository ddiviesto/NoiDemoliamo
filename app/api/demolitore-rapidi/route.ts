/**
 * Endpoint AREA DEMOLITORE: messaggi rapidi della chat col cliente.
 *
 * Ogni demolitore gestisce le SUE frasi (messaggi_preimpostati con
 * categoria 'chat_demolitore' e il suo demolitore_id). Alla prima
 * richiesta l'endpoint semina le 4 frasi di partenza; da lì il
 * demolitore le modifica, elimina e aggiunge dal "Gestisci" della chat.
 * ⚠️ Se le elimina tutte, alla prossima apertura tornano quelle di
 * partenza (la semina scatta sull'elenco vuoto): comportamento voluto.
 *
 * Finché la colonna demolitore_id non esiste (SQL
 * docs/sql/2026-08-07-rapidi-demolitore.sql) si torna alle frasi fisse
 * NON modificabili (gestibili: false), senza errori in faccia.
 *
 * Azioni (POST):
 *   { azione: 'lista' }                  → elenco (con semina al primo giro)
 *   { azione: 'aggiungi', testo }        → nuova frase in coda
 *   { azione: 'modifica', id, testo }    → cambia il testo
 *   { azione: 'elimina', id }            → via la frase
 * Tutte rispondono con l'elenco aggiornato: { success, gestibili, frasi }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore } from '@/lib/demolitoreAuth'
import type { SupabaseClient } from '@supabase/supabase-js'

const CATEGORIA = 'chat_demolitore'
const LUNGHEZZA_MAX = 300

// Le frasi di partenza (le stesse che erano fisse nella chat)
const FRASI_PARTENZA = [
  'Buongiorno! La chiamo a breve per accordarci sul ritiro.',
  'Posso passare domani mattina: le va bene?',
  'Sono in arrivo.',
  'Sono arrivato: la aspetto al veicolo.',
]

interface Frase { id: string; testo: string; ordine: number }

async function leggiFrasi(supabase: SupabaseClient, demolitoreId: string): Promise<Frase[] | null> {
  const { data, error } = await supabase
    .from('messaggi_preimpostati')
    .select('id, testo, ordine')
    .eq('categoria', CATEGORIA)
    .eq('demolitore_id', demolitoreId)
    .order('ordine', { ascending: true })
  if (error) return null // tipicamente: colonna demolitore_id non ancora creata
  return (data as Frase[]) || []
}

// Frasi fisse quando il DB non è pronto: la chat le mostra senza matita
function rispostaFissa() {
  return NextResponse.json({
    success: true,
    gestibili: false,
    frasi: FRASI_PARTENZA.map((testo, i) => ({ id: `fissa-${i}`, testo, ordine: i + 1 })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const body = await req.json().catch(() => ({}))
    const azione: string = body.azione || 'lista'

    let frasi = await leggiFrasi(supabase, demolitoreId)
    if (frasi === null) return rispostaFissa()

    // Semina delle frasi di partenza (primo giro di questo demolitore)
    if (azione === 'lista' && frasi.length === 0) {
      const { error: errSemina } = await supabase.from('messaggi_preimpostati').insert(
        FRASI_PARTENZA.map((testo, i) => ({ testo, ordine: i + 1, categoria: CATEGORIA, demolitore_id: demolitoreId }))
      )
      if (errSemina) return rispostaFissa()
      frasi = (await leggiFrasi(supabase, demolitoreId)) || []
    }

    if (azione === 'aggiungi' || azione === 'modifica') {
      const testo = String(body.testo || '').trim().slice(0, LUNGHEZZA_MAX)
      if (!testo) return NextResponse.json({ error: 'Scrivi il testo della frase' }, { status: 400 })

      if (azione === 'aggiungi') {
        const ordineMax = frasi.reduce((m, f) => Math.max(m, f.ordine), 0)
        const { error } = await supabase.from('messaggi_preimpostati').insert({
          testo, ordine: ordineMax + 1, categoria: CATEGORIA, demolitore_id: demolitoreId,
        })
        if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
      } else {
        if (!body.id) return NextResponse.json({ error: 'Frase non trovata' }, { status: 400 })
        // Filtro demolitore_id SEMPRE: ognuno tocca solo le sue frasi
        const { error } = await supabase.from('messaggi_preimpostati')
          .update({ testo })
          .eq('id', body.id)
          .eq('categoria', CATEGORIA)
          .eq('demolitore_id', demolitoreId)
        if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
      }
      frasi = (await leggiFrasi(supabase, demolitoreId)) || []
    }

    if (azione === 'elimina') {
      if (!body.id) return NextResponse.json({ error: 'Frase non trovata' }, { status: 400 })
      const { error } = await supabase.from('messaggi_preimpostati')
        .delete()
        .eq('id', body.id)
        .eq('categoria', CATEGORIA)
        .eq('demolitore_id', demolitoreId)
      if (error) return NextResponse.json({ error: 'Errore nell\'eliminazione' }, { status: 500 })
      frasi = (await leggiFrasi(supabase, demolitoreId)) || []
    }

    return NextResponse.json({ success: true, gestibili: true, frasi })
  } catch (err) {
    console.error('Errore endpoint demolitore-rapidi:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
