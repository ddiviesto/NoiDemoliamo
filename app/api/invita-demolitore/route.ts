/**
 * Endpoint server-side: INVITA un demolitore alla sua area riservata.
 *
 * Flusso:
 *   1. L'admin preme "Invita all'area" nella scheda demolitore.
 *   2. Qui creiamo (o ritroviamo) l'utente auth con l'email di assegnazione
 *      e generiamo il link di invito Supabase che porta a /imposta-password.
 *   3. Mandiamo l'email con Resend. Se Resend non è configurato o fallisce,
 *      restituiamo il link all'admin che può inviarlo a mano (WhatsApp).
 *
 * Se l'utente esiste già (re-invito), generiamo un link di tipo "recovery":
 * porta alla stessa pagina /imposta-password per scegliere una nuova password.
 *
 * Sicurezza: SUPABASE_SERVICE_ROLE_KEY + verifica admin via Authorization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { inviaEmail, templateEmail } from '@/lib/email'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

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

    // Demolitore ed email di destinazione
    const { data: dem, error: errDem } = await supabase
      .from('demolitori')
      .select('id, ragione_sociale, email_assegnazione, email_aziendale')
      .eq('id', demolitoreId)
      .single()
    if (errDem || !dem) {
      return NextResponse.json({ error: 'Demolitore non trovato' }, { status: 404 })
    }
    const email = (dem.email_assegnazione || dem.email_aziendale || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Il demolitore non ha un'email: aggiungi prima l'email assegnazioni pratiche in anagrafica." }, { status: 400 })
    }

    // Link di ritorno: la pagina dove il demolitore imposta la password
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
    const redirectTo = `${siteUrl}/imposta-password`

    // Genera il link: invito per i nuovi, recovery per chi è già registrato
    let giaRegistrato = false
    let { data: linkData, error: errLink } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo },
    })
    if (errLink) {
      const msg = (errLink.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('exist') || msg.includes('registered')) {
        giaRegistrato = true
        const retry = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo },
        })
        linkData = retry.data
        errLink = retry.error
      }
    }
    if (errLink || !linkData?.user || !linkData.properties?.action_link) {
      console.error('Errore generazione link invito:', errLink)
      return NextResponse.json({ error: 'Impossibile generare il link di invito' }, { status: 500 })
    }
    const userId = linkData.user.id
    const actionLink = linkData.properties.action_link

    // Guardia: se questa email appartiene già a un CLIENTE non la trasformiamo
    const { data: esistente } = await supabase.from('utenti').select('id, tipo').eq('id', userId).maybeSingle()
    if (esistente?.tipo && esistente.tipo !== 'demolitore') {
      return NextResponse.json({ error: `Questa email è già usata da un account "${esistente.tipo}". Usa un'email dedicata al demolitore.` }, { status: 409 })
    }

    // Riga utenti collegata al demolitore (upsert: il re-invito non duplica)
    const { error: errUp } = await supabase.from('utenti').upsert({
      id: userId,
      email,
      nome: dem.ragione_sociale,
      tipo: 'demolitore',
      demolitore_id: dem.id,
    }, { onConflict: 'id' })
    if (errUp) {
      console.error('Errore upsert utenti:', errUp)
      // Endpoint solo-admin: mostriamo il dettaglio vero del DB per diagnosi
      return NextResponse.json({ error: `Collegamento account-demolitore fallito: ${errUp.message}${errUp.details ? ` — ${errUp.details}` : ''}` }, { status: 500 })
    }

    // Traccia dell'invito sulla scheda demolitore
    await supabase.from('demolitori').update({ invito_inviato_il: new Date().toISOString() }).eq('id', dem.id)

    // Email di invito
    const html = templateEmail({
      titolo: `Benvenuto su NoiDemoliamo, ${dem.ragione_sociale}`,
      corpo: giaRegistrato
        ? 'Ecco il link per reimpostare la password della tua area demolitore. Premi il bottone e scegli la nuova password: da lì gestirai le pratiche assegnate.'
        : 'Ti abbiamo preparato la tua area riservata: qui riceverai le pratiche assegnate, fisserai i ritiri e caricherai i certificati. Premi il bottone per scegliere la tua password.',
      bottoneTesto: giaRegistrato ? 'Reimposta la password' : 'Imposta la password',
      bottoneUrl: actionLink,
    })
    const esito = await inviaEmail({
      a: email,
      oggetto: giaRegistrato ? 'NoiDemoliamo — reimposta la tua password' : 'NoiDemoliamo — attiva la tua area demolitore',
      html,
    })

    return NextResponse.json({
      success: true,
      email,
      gia_registrato: giaRegistrato,
      email_inviata: esito.inviata,
      // Se l'email non è partita l'admin riceve il link per inviarlo a mano
      link: esito.inviata ? undefined : actionLink,
      errore_email: esito.inviata ? undefined : esito.errore,
    })
  } catch (err) {
    console.error('Errore endpoint invita-demolitore:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
