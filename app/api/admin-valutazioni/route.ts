/**
 * Endpoint admin per le RICHIESTE DI VALUTAZIONE (flusso D).
 *
 * `veicoli_vendita` ha le policy RLS "solo il proprietario vede le sue":
 * l'admin dal browser non vedrebbe niente, quindi la lista e le azioni
 * passano da qui col service role, SOLO admin (stesso schema di
 * /api/pratica-dati).
 *
 * Azioni (POST, body { azione, ...}):
 *   lista                         → tutte le richieste con le foto
 *   rispondi { id, tipo, importo, messaggio }
 *                                 → salva la risposta e mette "risposta_inviata"
 *                                   (tipo 'demolizione' = "Non la paghiamo",
 *                                    tipo 'acquisto' = "Riconosciamo X €")
 *   chiudi { id }                 → "chiusa" (senza seguito)
 *   riapri { id }                 → torna "da_valutare" (anche per cambiare la risposta)
 *   nota { id, testo }            → note_admin
 *
 * ⚠️ Le email al cliente si faranno col lavoro Resend: qui va ricordato
 * che "rispondi" è il momento dell'email "risposta pronta".
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

const CAMPI = 'id, user_id, stato, tipo_mezzo, tipo_mezzo_altro, marca, modello, anno, km, tipo_cambio, alimentazione, incidentato, va_in_moto, marciante, parti_mancanti, note_veicolo, indirizzo, comune, provincia, cap, targa, targhe_presenti, codice_fiscale, intestazione, eredi_rinuncia, societa_fallita, casistica, fermo_amministrativo, nome_richiedente, telefono, offerta_tipo, offerta_importo, offerta_messaggio, offerta_inviata_il, risposta_cliente, risposta_il, pratica_id, note_admin, creato_il, aggiornato_il'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const azione: string = body.azione

    // Solo admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await supabaseUser.auth.getUser(authHeader.substring(7))
    if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    if (azione === 'lista') {
      const { data: righe, error } = await supabase.from('veicoli_vendita').select(CAMPI).order('creato_il', { ascending: false })
      if (error) throw error
      const ids = (righe || []).map(r => r.id)
      const { data: foto } = ids.length
        ? await supabase.from('foto_veicoli_vendita').select('veicolo_vendita_id, url, posizione, creato_il').in('veicolo_vendita_id', ids).order('creato_il')
        : { data: [] }
      const perRichiesta: Record<string, { url: string; posizione: string | null }[]> = {}
      for (const f of foto || []) (perRichiesta[f.veicolo_vendita_id] ||= []).push({ url: f.url, posizione: f.posizione })
      return NextResponse.json({ richieste: (righe || []).map(r => ({ ...r, foto: perRichiesta[r.id] || [] })) })
    }

    const id: string | undefined = body.id
    if (!id) return NextResponse.json({ error: 'Manca id' }, { status: 400 })
    const { data: richiesta } = await supabase.from('veicoli_vendita').select('id, stato').eq('id', id).single()
    if (!richiesta) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })

    const adesso = new Date().toISOString()

    if (azione === 'rispondi') {
      const tipo: string = body.tipo
      if (tipo !== 'demolizione' && tipo !== 'acquisto') return NextResponse.json({ error: 'Tipo di risposta non valido' }, { status: 400 })
      const importo = tipo === 'acquisto' ? Math.round(Number(body.importo)) : null
      if (tipo === 'acquisto' && (!importo || importo <= 0)) return NextResponse.json({ error: 'Scrivi un importo' }, { status: 400 })
      const messaggio = typeof body.messaggio === 'string' ? body.messaggio.trim() : ''
      if (tipo === 'demolizione' && !messaggio) return NextResponse.json({ error: 'Scrivi il motivo: lo legge il cliente' }, { status: 400 })
      if (richiesta.stato === 'passata_demolizione') return NextResponse.json({ error: 'La richiesta è già diventata una pratica' }, { status: 400 })
      const { error } = await supabase.from('veicoli_vendita').update({
        stato: 'risposta_inviata',
        offerta_tipo: tipo,
        offerta_importo: importo,
        offerta_messaggio: messaggio || null,
        offerta_inviata_il: adesso,
        risposta_cliente: null,
        risposta_il: null,
        aggiornato_il: adesso,
      }).eq('id', id)
      if (error) throw error
      // TODO Resend: email "risposta pronta" al cliente
      return NextResponse.json({ ok: true })
    }

    if (azione === 'chiudi') {
      if (richiesta.stato === 'passata_demolizione') return NextResponse.json({ error: 'La richiesta è già diventata una pratica' }, { status: 400 })
      const { error } = await supabase.from('veicoli_vendita').update({ stato: 'chiusa', aggiornato_il: adesso }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (azione === 'riapri') {
      if (richiesta.stato === 'passata_demolizione') return NextResponse.json({ error: 'La richiesta è già diventata una pratica' }, { status: 400 })
      const { error } = await supabase.from('veicoli_vendita').update({
        stato: 'da_valutare', offerta_tipo: null, offerta_importo: null, offerta_messaggio: null, offerta_inviata_il: null,
        risposta_cliente: null, risposta_il: null, aggiornato_il: adesso,
      }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (azione === 'nota') {
      const testo = typeof body.testo === 'string' ? body.testo.trim() : ''
      const { error } = await supabase.from('veicoli_vendita').update({ note_admin: testo || null, aggiornato_il: adesso }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
  } catch (e: unknown) {
    console.error('Errore admin-valutazioni:', e)
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
