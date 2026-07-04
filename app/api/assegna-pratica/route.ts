/**
 * Endpoint server-side per l'assegnazione automatica di una pratica.
 *
 * Chiamato dall'admin (es. dal bottone "Assegna pratica") con il pratica_id.
 * Esegue l'algoritmo, scrive il vincitore nel DB e ritorna il risultato.
 *
 * Sicurezza: usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) e verifica che chi
 * chiama sia l'admin tramite header Authorization (sessione utente lato server).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcolaAssegnazione, PraticaDaAssegnare } from '@/lib/assegnazione'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

// Mappa provincia → regione (per identificare la regione dal nome della provincia)
// Stessa logica usata nella mappa, replicata qui sul server.
const PROVINCE_REGIONI: Record<string, string> = {
  'Torino': 'Piemonte', 'Vercelli': 'Piemonte', 'Novara': 'Piemonte', 'Cuneo': 'Piemonte',
  'Asti': 'Piemonte', 'Alessandria': 'Piemonte', 'Biella': 'Piemonte', 'Verbano-Cusio-Ossola': 'Piemonte',
  'Aosta': 'Valle d\'Aosta',
  'Genova': 'Liguria', 'Savona': 'Liguria', 'La Spezia': 'Liguria', 'Imperia': 'Liguria',
  'Milano': 'Lombardia', 'Bergamo': 'Lombardia', 'Brescia': 'Lombardia', 'Como': 'Lombardia',
  'Cremona': 'Lombardia', 'Lecco': 'Lombardia', 'Lodi': 'Lombardia', 'Mantova': 'Lombardia',
  'Monza e della Brianza': 'Lombardia', 'Pavia': 'Lombardia', 'Sondrio': 'Lombardia', 'Varese': 'Lombardia',
  'Bolzano/Bozen': 'Trentino-Alto Adige', 'Trento': 'Trentino-Alto Adige',
  'Venezia': 'Veneto', 'Padova': 'Veneto', 'Treviso': 'Veneto', 'Verona': 'Veneto',
  'Vicenza': 'Veneto', 'Belluno': 'Veneto', 'Rovigo': 'Veneto',
  'Trieste': 'Friuli-Venezia Giulia', 'Udine': 'Friuli-Venezia Giulia',
  'Gorizia': 'Friuli-Venezia Giulia', 'Pordenone': 'Friuli-Venezia Giulia',
  'Bologna': 'Emilia-Romagna', 'Ferrara': 'Emilia-Romagna', 'Forlì-Cesena': 'Emilia-Romagna',
  'Modena': 'Emilia-Romagna', 'Parma': 'Emilia-Romagna', 'Piacenza': 'Emilia-Romagna',
  'Ravenna': 'Emilia-Romagna', 'Reggio nell\'Emilia': 'Emilia-Romagna', 'Rimini': 'Emilia-Romagna',
  'Firenze': 'Toscana', 'Arezzo': 'Toscana', 'Grosseto': 'Toscana', 'Livorno': 'Toscana',
  'Lucca': 'Toscana', 'Massa-Carrara': 'Toscana', 'Pisa': 'Toscana', 'Pistoia': 'Toscana',
  'Prato': 'Toscana', 'Siena': 'Toscana',
  'Perugia': 'Umbria', 'Terni': 'Umbria',
  'Ancona': 'Marche', 'Ascoli Piceno': 'Marche', 'Fermo': 'Marche',
  'Macerata': 'Marche', 'Pesaro e Urbino': 'Marche',
  'Roma': 'Lazio', 'Frosinone': 'Lazio', 'Latina': 'Lazio', 'Rieti': 'Lazio', 'Viterbo': 'Lazio',
  'L\'Aquila': 'Abruzzo', 'Chieti': 'Abruzzo', 'Pescara': 'Abruzzo', 'Teramo': 'Abruzzo',
  'Campobasso': 'Molise', 'Isernia': 'Molise',
  'Napoli': 'Campania', 'Avellino': 'Campania', 'Benevento': 'Campania',
  'Caserta': 'Campania', 'Salerno': 'Campania',
  'Bari': 'Puglia', 'Brindisi': 'Puglia', 'Foggia': 'Puglia', 'Lecce': 'Puglia',
  'Taranto': 'Puglia', 'Barletta-Andria-Trani': 'Puglia',
  'Potenza': 'Basilicata', 'Matera': 'Basilicata',
  'Catanzaro': 'Calabria', 'Cosenza': 'Calabria', 'Crotone': 'Calabria',
  'Reggio di Calabria': 'Calabria', 'Vibo Valentia': 'Calabria',
  'Palermo': 'Sicilia', 'Agrigento': 'Sicilia', 'Caltanissetta': 'Sicilia',
  'Catania': 'Sicilia', 'Enna': 'Sicilia', 'Messina': 'Sicilia',
  'Ragusa': 'Sicilia', 'Siracusa': 'Sicilia', 'Trapani': 'Sicilia',
  'Cagliari': 'Sardegna', 'Nuoro': 'Sardegna', 'Oristano': 'Sardegna',
  'Sassari': 'Sardegna', 'Sud Sardegna': 'Sardegna',
}

/**
 * Calcola la scadenza (8 ore lavorative dopo `da`).
 * Considera lavorativi i giorni feriali (lun-ven) tra le 9 e le 18.
 * Per semplicità: aggiunge 8 ore di calendario saltando i weekend.
 */
function calcolaScadenzaOreLavorative(da: Date, ore: number): Date {
  const result = new Date(da)
  let oreDaAggiungere = ore
  while (oreDaAggiungere > 0) {
    result.setHours(result.getHours() + 1)
    const giorno = result.getDay() // 0=Domenica, 6=Sabato
    const ora = result.getHours()
    if (giorno !== 0 && giorno !== 6 && ora >= 9 && ora <= 18) {
      oreDaAggiungere--
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    // Modalità:
    //  - dry_run: calcola e restituisce la classifica SENZA assegnare
    //  - demolitore_id: assegna quel demolitore specifico (conferma auto o scelta manuale)
    //  - nessuno dei due: comportamento legacy (assegna automaticamente il vincitore)
    const dryRun: boolean = body.dry_run === true
    const demolitoreIdScelto: string | undefined = body.demolitore_id
    const manuale: boolean = body.manuale === true
    if (!praticaId) {
      return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })
    }

    // Verifica autenticazione admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    const token = authHeader.substring(7)

    // Client Supabase per validare il token utente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    // Client Supabase con service role (bypassa RLS per operazioni interne)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Carico la pratica
    const { data: pratica, error: errPratica } = await supabase
      .from('pratiche')
      .select('id, comune_ritiro, provincia_ritiro, lat, lng, stato, demolitore_id')
      .eq('id', praticaId)
      .single()
    if (errPratica || !pratica) {
      return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
    }
    // MODALITÀ "ASSEGNA QUESTO DEMOLITORE" (conferma del suggerito o scelta manuale)
    if (demolitoreIdScelto) {
      const { data: demo } = await supabase
        .from('demolitori')
        .select('id, ragione_sociale')
        .eq('id', demolitoreIdScelto)
        .single()
      if (!demo) {
        return NextResponse.json({ error: 'Demolitore non trovato' }, { status: 404 })
      }
      const oraA = new Date()
      const scadenzaA = calcolaScadenzaOreLavorative(oraA, 8)
      const { error: errAssegna } = await supabase
        .from('pratiche')
        .update({
          demolitore_id: demo.id,
          stato: 'assegnata',
          data_assegnazione: oraA.toISOString(),
          scadenza_proposta_ritiro: scadenzaA.toISOString(),
          assegnazione_manuale: manuale,
          aggiornato_il: oraA.toISOString(),
        })
        .eq('id', praticaId)
      if (errAssegna) {
        console.error('Errore assegnazione demolitore scelto:', errAssegna)
        return NextResponse.json({ error: 'Errore salvataggio assegnazione' }, { status: 500 })
      }
      return NextResponse.json({ success: true, vincitore: demo, scadenza_proposta_ritiro: scadenzaA.toISOString() })
    }

    // Il calcolo (dry-run) è permesso anche se già assegnata (per riassegnare);
    // l'auto-assegnazione legacy invece blocca se già assegnata.
    if (!dryRun && pratica.demolitore_id) {
      return NextResponse.json({ error: 'Pratica già assegnata' }, { status: 400 })
    }

    const praticaInput: PraticaDaAssegnare = {
      id: pratica.id,
      comune_ritiro: pratica.comune_ritiro,
      provincia_ritiro: pratica.provincia_ritiro,
      lat: pratica.lat,
      lng: pratica.lng,
    }
    const regioneRitiro = pratica.provincia_ritiro ? PROVINCE_REGIONI[pratica.provincia_ritiro] ?? null : null

    // ESEGUE L'ALGORITMO
    const googleKey = process.env.GOOGLE_MAPS_SERVER_KEY!
    if (!googleKey) {
      return NextResponse.json({ error: 'Manca GOOGLE_MAPS_SERVER_KEY nel server' }, { status: 500 })
    }
    const risultato = await calcolaAssegnazione(supabase, praticaInput, googleKey, regioneRitiro)

    // MODALITÀ "CALCOLA E MOSTRA" (dry-run): restituisce la classifica senza scrivere nulla
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        vincitore: risultato.vincitore,
        candidati: risultato.candidati_valutati,
        motivo: risultato.motivo_fallimento ?? null,
      })
    }

    // CASO A: nessun demolitore valido → pratica va in assegnazione manuale
    if (!risultato.vincitore) {
      await supabase
        .from('pratiche')
        .update({
          stato: 'in_assegnazione_manuale',
          assegnazione_manuale: true,
          aggiornato_il: new Date().toISOString(),
        })
        .eq('id', praticaId)
      return NextResponse.json({
        success: false,
        motivo: risultato.motivo_fallimento,
        candidati: risultato.candidati_valutati,
      })
    }

    // CASO B: vincitore trovato → scrivo nel DB
    const ora = new Date()
    const scadenzaProposta = calcolaScadenzaOreLavorative(ora, 8)
    const { error: errUpdate } = await supabase
      .from('pratiche')
      .update({
        demolitore_id: risultato.vincitore.id,
        stato: 'assegnata',
        data_assegnazione: ora.toISOString(),
        scadenza_proposta_ritiro: scadenzaProposta.toISOString(),
        assegnazione_manuale: false,
        aggiornato_il: ora.toISOString(),
      })
      .eq('id', praticaId)
    if (errUpdate) {
      console.error('Errore update pratica:', errUpdate)
      return NextResponse.json({ error: 'Errore salvataggio assegnazione' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      vincitore: risultato.vincitore,
      candidati: risultato.candidati_valutati,
      scadenza_proposta_ritiro: scadenzaProposta.toISOString(),
    })
  } catch (err) {
    console.error('Errore endpoint assegnazione:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}