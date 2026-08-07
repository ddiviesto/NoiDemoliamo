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
import { nomeProvincia } from '@/lib/province'

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
    // disassegna: toglie il demolitore e riporta la pratica in 'da_assegnare'
    const disassegna: boolean = body.disassegna === true
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
      .select('id, comune_ritiro, provincia_ritiro, lat, lng, stato, demolitore_id, fee_concordata')
      .eq('id', praticaId)
      .single()
    if (errPratica || !pratica) {
      return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
    }
    // MODALITÀ "DISASSEGNA": rimuove il demolitore, la pratica torna da assegnare.
    // Segna 'riassegnata' così il cliente vede un messaggio adeguato (non allarmante).
    if (disassegna) {
      if (!pratica.demolitore_id) {
        return NextResponse.json({ error: 'La pratica non è assegnata' }, { status: 400 })
      }
      const { error: errDis } = await supabase
        .from('pratiche')
        .update({
          demolitore_id: null,
          stato: 'da_assegnare',
          data_assegnazione: null,
          scadenza_proposta_ritiro: null,
          data_ritiro_prevista: null,
          riassegnata: true,
          aggiornato_il: new Date().toISOString(),
        })
        .eq('id', praticaId)
      if (errDis) {
        console.error('Errore disassegnazione:', errDis)
        return NextResponse.json({ error: 'Errore durante la disassegnazione' }, { status: 500 })
      }
      // ⭐ 28/07 sera: nel registro (solo admin: il vecchio demolitore vede
      // semplicemente sparire la pratica dalla sua lista)
      await supabase.from('pratiche_note').insert({ pratica_id: praticaId, testo: 'Demolitore rimosso: la pratica torna da assegnare', evento: 'riassegnata' })
      return NextResponse.json({ success: true, disassegnata: true })
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
      const aggiornamento: Record<string, unknown> = {
        demolitore_id: demo.id,
        stato: 'assegnata',
        data_assegnazione: oraA.toISOString(),
        scadenza_proposta_ritiro: scadenzaA.toISOString(),
        data_ritiro_prevista: null,
        assegnazione_manuale: manuale,
        aggiornato_il: oraA.toISOString(),
      }
      // Cambio di demolitore su pratica già assegnata → il cliente vedrà il
      // messaggio "nuovo demolitore in arrivo" (non allarmante).
      if (pratica.demolitore_id && pratica.demolitore_id !== demo.id) {
        aggiornamento.riassegnata = true
      }
      const { error: errAssegna } = await supabase
        .from('pratiche')
        .update(aggiornamento)
        .eq('id', praticaId)
      if (errAssegna) {
        console.error('Errore assegnazione demolitore scelto:', errAssegna)
        return NextResponse.json({ error: 'Errore salvataggio assegnazione' }, { status: 500 })
      }
      // ⭐ 28/07 sera: evento nel registro, CONDIVISO col nuovo demolitore
      // (è l'inizio della sua cronologia: demolitore_id lo lega a lui)
      await supabase.from('pratiche_note').insert({
        pratica_id: praticaId,
        // ⭐ 07/08 (richiesta Davide): SOLO il nome del demolitore, niente code
        testo: demo.ragione_sociale,
        evento: aggiornamento.riassegnata ? 'riassegnata' : 'assegnata',
        visibile_demolitore: true,
        demolitore_id: demo.id,
      })
      return NextResponse.json({ success: true, vincitore: demo, scadenza_proposta_ritiro: scadenzaA.toISOString() })
    }

    // Il calcolo (dry-run) è permesso anche se già assegnata (per riassegnare);
    // l'auto-assegnazione legacy invece blocca se già assegnata.
    if (!dryRun && pratica.demolitore_id) {
      return NextResponse.json({ error: 'Pratica già assegnata' }, { status: 400 })
    }

    // La pratica salva la provincia come sigla (es. "ME"); la copertura usa il nome
    // intero (es. "Messina"). Converto la sigla nel nome prima di cercare i demolitori.
    const provinciaNome = nomeProvincia(pratica.provincia_ritiro)

    const praticaInput: PraticaDaAssegnare = {
      id: pratica.id,
      comune_ritiro: pratica.comune_ritiro,
      provincia_ritiro: provinciaNome,
      lat: pratica.lat,
      lng: pratica.lng,
    }
    const regioneRitiro = provinciaNome ? PROVINCE_REGIONI[provinciaNome] ?? null : null

    // ESEGUE L'ALGORITMO
    const googleKey = process.env.GOOGLE_MAPS_SERVER_KEY!
    if (!googleKey) {
      return NextResponse.json({ error: 'Manca GOOGLE_MAPS_SERVER_KEY nel server' }, { status: 500 })
    }
    const risultato = await calcolaAssegnazione(supabase, praticaInput, googleKey, regioneRitiro)

    // MODALITÀ "CALCOLA E MOSTRA" (dry-run): restituisce la classifica senza
    // scrivere nulla. ⭐ 27/07 (pannello tendina): ogni candidato è arricchito
    // con la FEE APPLICABILE (fee_concordata della pratica, altrimenti tariffa
    // più specifica comune→provincia→regione, altrimenti fee base), la zona
    // della tariffa e il CARICO "da ritirare" (assegnate non ancora ritirate).
    if (dryRun) {
      const cands = risultato.candidati_valutati
      const ids = cands.map(c => c.id)
      let candidatiArricchiti: unknown[] = cands
      if (ids.length > 0) {
        const [{ data: tariffe }, { data: basi }, { data: nonRitirate }] = await Promise.all([
          supabase.from('demolitori_tariffe').select('demolitore_id, tipo, nome, fee').in('demolitore_id', ids),
          supabase.from('demolitori').select('id, fee_per_pratica').in('id', ids),
          supabase.from('pratiche').select('demolitore_id').in('demolitore_id', ids).is('data_ritiro_effettuato', null).not('stato', 'in', '(completata,annullata)'),
        ])
        const basiMap = new Map((basi || []).map(b => [b.id as string, b.fee_per_pratica as number | null]))
        const carico = new Map<string, number>()
        for (const r of nonRitirate || []) carico.set(r.demolitore_id as string, (carico.get(r.demolitore_id as string) || 0) + 1)
        const stesso = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
        candidatiArricchiti = cands.map(c => {
          const mie = (tariffe || []).filter(t => t.demolitore_id === c.id)
          let fee: number | null = null
          let zonaFee: string | null = null
          const tComune = mie.find(t => t.tipo === 'comune' && stesso(t.nome, pratica.comune_ritiro))
          const tProvincia = mie.find(t => t.tipo === 'provincia' && stesso(t.nome, provinciaNome))
          const tRegione = mie.find(t => t.tipo === 'regione' && stesso(t.nome, regioneRitiro))
          if (pratica.fee_concordata != null) { fee = pratica.fee_concordata; zonaFee = 'concordato' }
          else if (tComune) { fee = tComune.fee; zonaFee = 'comune' }
          else if (tProvincia) { fee = tProvincia.fee; zonaFee = 'provincia' }
          else if (tRegione) { fee = tRegione.fee; zonaFee = 'regione' }
          else { fee = basiMap.get(c.id) ?? null; zonaFee = 'base' }
          return { ...c, fee_applicabile: fee, zona_fee: zonaFee, da_ritirare: carico.get(c.id) ?? 0 }
        })
      }
      return NextResponse.json({
        success: true,
        dry_run: true,
        vincitore: risultato.vincitore,
        candidati: candidatiArricchiti,
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

    // ⭐ 28/07 sera: evento nel registro, condiviso col demolitore vincitore
    await supabase.from('pratiche_note').insert({
      pratica_id: praticaId,
      testo: `${risultato.vincitore.ragione_sociale} (automatica, 1ª in classifica)`,
      evento: 'assegnata',
      visibile_demolitore: true,
      demolitore_id: risultato.vincitore.id,
    })

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