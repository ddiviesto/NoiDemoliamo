/**
 * "COMPLETA LA PRATICA" (flusso D, pezzo 3 — 03/10).
 * Il cliente ha accettato la proposta e ha risposto alle domande che
 * mancavano (spazio per il carro attrezzi, chi consegna, libretto,
 * certificato di proprietà). Qui la richiesta di valutazione DIVENTA una
 * pratica di demolizione: si copia campo per campo in `pratiche` (le
 * colonne hanno gli stessi nomi), si copiano le foto in `foto_pratiche`,
 * e la richiesta passa in `passata_demolizione` col `pratica_id`.
 *
 * Service role perché il browser non scrive su `pratiche`; si controlla
 * che la richiesta sia del cliente e che abbia accettato.
 * Il trigger "commesso automatico" genera la checklist dei documenti
 * dalla casistica, come per una pratica nata da /inizia.
 *
 * ⚠️ Resend: qui andrà l'email "pratica aperta" (la stessa della demolizione).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Casistica, delegaAmmessa } from '../../../types/pratica'

const SPAZI = ['libero', 'stretto', 'no']
const LIBRETTI = ['si', 'denuncia', 'no']
const CDC = ['digitale', 'cartaceo', 'smarrito', 'nessuno']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id: string | undefined = body.id
    if (!id) return NextResponse.json({ error: 'Manca id' }, { status: 400 })

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await supabaseUser.auth.getUser(authHeader.substring(7))
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: r } = await supabase.from('veicoli_vendita').select('*').eq('id', id).single()
    if (!r || r.user_id !== user.id) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
    if (r.pratica_id) return NextResponse.json({ error: 'La pratica è già stata creata', pratica_id: r.pratica_id }, { status: 409 })
    if (r.stato !== 'risposta_inviata' || r.risposta_cliente !== 'accettata') return NextResponse.json({ error: 'Prima devi accettare la proposta' }, { status: 400 })

    const casistica = (r.casistica || null) as Casistica | null

    // Le risposte del cliente
    const spazio: string | null = SPAZI.includes(body.spazio_carro_attrezzi) ? body.spazio_carro_attrezzi : null
    if (!spazio) return NextResponse.json({ error: 'Indica lo spazio per il carro attrezzi' }, { status: 400 })
    const spazioNote = typeof body.spazio_carro_attrezzi_note === 'string' ? body.spazio_carro_attrezzi_note.trim() : ''
    const libretto: string | null = LIBRETTI.includes(body.libretto) ? body.libretto : null
    if (!libretto) return NextResponse.json({ error: 'Rispondi sul libretto' }, { status: 400 })
    const chiedeCdc = casistica !== 'targhe_straniere'
    const cdc: string | null = chiedeCdc ? (CDC.includes(body.cdc) ? body.cdc : null) : null
    if (chiedeCdc && !cdc) return NextResponse.json({ error: 'Rispondi sul certificato di proprietà' }, { status: 400 })
    const conDelega = delegaAmmessa(casistica) && body.consegna === 'delegato'
    const delegatoNome = conDelega && typeof body.delegato_nome === 'string' ? body.delegato_nome.trim() : ''
    const delegatoTelefono = conDelega && typeof body.delegato_telefono === 'string' ? body.delegato_telefono.trim() : ''
    if (conDelega && (!delegatoNome || !delegatoTelefono)) return NextResponse.json({ error: 'Scrivi nome e telefono del delegato' }, { status: 400 })

    // La pratica nasce copiando la richiesta campo per campo
    const { data: pratica, error: errIns } = await supabase.from('pratiche').insert({
      user_id: r.user_id,
      indirizzo_ritiro: r.indirizzo,
      comune_ritiro: r.comune,
      provincia_ritiro: r.provincia,
      cap_ritiro: r.cap,
      lat: r.lat,
      lng: r.lng,
      spazio_carro_attrezzi: spazio,
      spazio_carro_attrezzi_note: spazioNote || null,
      targa: r.targa,
      targhe_presenti: r.targhe_presenti,
      codice_fiscale: r.codice_fiscale,
      tipo_mezzo: r.tipo_mezzo,
      tipo_mezzo_altro: r.tipo_mezzo_altro,
      anno: r.anno,
      km: r.km,
      marca: r.marca,
      modello: r.modello,
      tipo_cambio: r.tipo_cambio,
      alimentazione: r.alimentazione,
      incidentato: r.incidentato === true,
      marciante: r.marciante === true,
      va_in_moto: r.va_in_moto === true,
      parti_mancanti: r.parti_mancanti === true,
      note_veicolo: r.note_veicolo,
      casistica,
      numero_eredi: null,
      nomi_rinunciatari: null,
      fermo_amministrativo: r.fermo_amministrativo,
      delegato_nome: conDelega ? delegatoNome : null,
      delegato_telefono: conDelega ? delegatoTelefono : null,
      libretto,
      certificato_proprieta: cdc,
      nome_richiedente: r.nome_richiedente,
      telefono: r.telefono,
      stato: 'in_attesa_documenti',
    }).select('id').single()
    if (errIns || !pratica) throw errIns || new Error('Pratica non creata')

    // Le foto passano alla pratica (stesso bucket, stesse URL)
    const { data: foto } = await supabase.from('foto_veicoli_vendita').select('url').eq('veicolo_vendita_id', id).order('creato_il')
    if (foto && foto.length) {
      const { error: errFoto } = await supabase.from('foto_pratiche').insert(foto.map(f => ({ pratica_id: pratica.id, url: f.url })))
      if (errFoto) console.error('Errore copia foto in foto_pratiche:', errFoto)
    }

    const adesso = new Date().toISOString()
    const { error: errUpd } = await supabase.from('veicoli_vendita').update({ stato: 'passata_demolizione', pratica_id: pratica.id, aggiornato_il: adesso }).eq('id', id)
    if (errUpd) throw errUpd

    // TODO Resend: email "pratica aperta" al cliente (la stessa della demolizione)
    return NextResponse.json({ ok: true, pratica_id: pratica.id })
  } catch (e: unknown) {
    console.error('Errore valutazione-completa:', e)
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
