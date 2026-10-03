/**
 * La RISPOSTA DEL CLIENTE alla proposta di valutazione (flusso D).
 * ⭐ 03/10 (mockup A approvato): dalla card nella sua area personale il
 * cliente preme "Accetto" o "No, grazie"; da rifiutata può "cambiare idea".
 *
 * Passa da qui col service role perché `veicoli_vendita` ha solo le policy
 * di lettura e inserimento per il proprietario: lo stato non si tocca dal
 * browser. Si controlla che la richiesta sia SUA e nello stato giusto.
 *
 * Azioni (POST, body { id, azione }):
 *   accetta  → risposta_cliente = accettata (lo stato resta risposta_inviata:
 *              diventa passata_demolizione solo quando completa la pratica)
 *   rifiuta  → stato = rifiutata
 *   riapri   → da rifiutata torna a risposta_inviata (ci ha ripensato)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id: string | undefined = body.id
    const azione: string = body.azione
    if (!id) return NextResponse.json({ error: 'Manca id' }, { status: 400 })

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await supabaseUser.auth.getUser(authHeader.substring(7))
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: r } = await supabase.from('veicoli_vendita').select('id, user_id, stato, risposta_cliente').eq('id', id).single()
    if (!r || r.user_id !== user.id) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })

    const adesso = new Date().toISOString()

    if (azione === 'accetta' || azione === 'rifiuta') {
      if (r.stato !== 'risposta_inviata' || r.risposta_cliente) return NextResponse.json({ error: 'Non c’è una proposta a cui rispondere' }, { status: 400 })
      const { error } = await supabase.from('veicoli_vendita').update(
        azione === 'accetta'
          ? { risposta_cliente: 'accettata', risposta_il: adesso, aggiornato_il: adesso }
          : { stato: 'rifiutata', risposta_cliente: 'rifiutata', risposta_il: adesso, aggiornato_il: adesso }
      ).eq('id', id)
      if (error) throw error
      // TODO Resend: email all'admin "il cliente ha risposto"
      return NextResponse.json({ ok: true })
    }

    if (azione === 'riapri') {
      if (r.stato !== 'rifiutata') return NextResponse.json({ error: 'La richiesta non è rifiutata' }, { status: 400 })
      const { error } = await supabase.from('veicoli_vendita').update({ stato: 'risposta_inviata', risposta_cliente: null, risposta_il: null, aggiornato_il: adesso }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
  } catch (e: unknown) {
    console.error('Errore valutazione-risposta:', e)
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
