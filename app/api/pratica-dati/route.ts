/**
 * Endpoint admin: modifica dei dati importanti della pratica
 * (nome/telefono/CF, targa/marca/modello/anno/km, indirizzo di ritiro
 * con coordinate, spazio carro attrezzi, fermo amministrativo).
 *
 * Il browser non può scrivere su `pratiche` (permessi DB): si passa da qui
 * col service role, SOLO admin. Campi in whitelist, targa e CF normalizzati.
 *
 * Caso speciale FERMO: cambiare il fermo tocca la checklist del cliente
 * (condizione 'fermo_si' nel catalogo = dichiarazione stato veicolo con
 * fermo, da fotografare + originale al ritiro). Qui si sincronizza e si
 * ricalcola lo stato pratica. Le righe con file caricati non si toccano mai.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'
const STATI_FASE_DOCUMENTI = ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati', 'da_assegnare']

const CAMPI_TESTO = new Set([
  'nome_richiedente', 'telefono', 'codice_fiscale',
  'targa', 'marca', 'modello',
  'indirizzo_ritiro', 'comune_ritiro', 'provincia_ritiro', 'cap_ritiro',
  'spazio_carro_attrezzi', 'spazio_carro_attrezzi_note',
  'fermo_amministrativo',
  // Dichiarazioni modificabili dall'admin (17/07): sincronizzano la checklist
  'libretto', 'delegato_nome', 'delegato_telefono',
  // Attesa (pausa della pratica, 17/07)
  'attesa_motivo', 'attesa_dal',
])
const CAMPI_NUMERO = new Set(['anno', 'km', 'lat', 'lng'])
const CAMPI_BOOL = new Set(['in_attesa', 'targhe_presenti'])

// La delega non è ammessa per queste casistiche (regola del file casistiche)
const CASISTICHE_SENZA_DELEGA = ['non_intestatario', 'targhe_straniere']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    const dati: Record<string, unknown> = body.dati || {}
    if (!praticaId) return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })

    // Solo admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: pratica } = await supabase
      .from('pratiche')
      .select('stato, casistica, numero_eredi, fermo_amministrativo, libretto, targhe_presenti, delegato_nome')
      .eq('id', praticaId)
      .single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

    // Whitelist + normalizzazioni
    const update: Record<string, unknown> = {}
    for (const [campo, valore] of Object.entries(dati)) {
      if (CAMPI_TESTO.has(campo)) {
        let v = typeof valore === 'string' ? valore.trim() : valore
        if (typeof v === 'string' && v === '') v = null
        if ((campo === 'targa' || campo === 'codice_fiscale') && typeof v === 'string') {
          v = v.toUpperCase().replace(/\s+/g, '')
        }
        update[campo] = v
      } else if (CAMPI_NUMERO.has(campo)) {
        const n = valore === null || valore === '' ? null : Number(valore)
        update[campo] = n != null && Number.isFinite(n) ? n : null
      } else if (CAMPI_BOOL.has(campo)) {
        update[campo] = valore === true
      }
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

    if ('fermo_amministrativo' in update && update.fermo_amministrativo != null && !['si', 'no', 'non_so'].includes(update.fermo_amministrativo as string)) {
      return NextResponse.json({ error: 'Valore fermo non valido' }, { status: 400 })
    }
    if ('spazio_carro_attrezzi' in update && update.spazio_carro_attrezzi != null && !['libero', 'stretto', 'no'].includes(update.spazio_carro_attrezzi as string)) {
      return NextResponse.json({ error: 'Valore spazio carro attrezzi non valido' }, { status: 400 })
    }
    if ('libretto' in update && update.libretto != null && !['si', 'denuncia', 'no'].includes(update.libretto as string)) {
      return NextResponse.json({ error: 'Valore libretto non valido' }, { status: 400 })
    }
    if ('delegato_nome' in update && update.delegato_nome != null && CASISTICHE_SENZA_DELEGA.includes(pratica.casistica || '')) {
      return NextResponse.json({ error: 'La delega non è ammessa per questa casistica' }, { status: 400 })
    }

    update.aggiornato_il = new Date().toISOString()
    const { error: errUpd } = await supabase.from('pratiche').update(update).eq('id', praticaId)
    if (errUpd) throw errUpd

    // ---- SINCRONIZZAZIONE CHECKLIST (17/07: generalizzata a TUTTE le
    // dichiarazioni) ---- Ogni risposta modificata accende o spegne i
    // documenti della sua condizione nel catalogo. Le righe con file
    // caricati dal cliente non si toccano MAI.
    const sync: { condizione: string; attiva: boolean }[] = []
    if (update.fermo_amministrativo !== undefined && update.fermo_amministrativo !== pratica.fermo_amministrativo) {
      sync.push({ condizione: 'fermo_si', attiva: update.fermo_amministrativo === 'si' })
    }
    if (update.libretto !== undefined && update.libretto !== pratica.libretto) {
      sync.push({ condizione: 'libretto_smarrito', attiva: update.libretto === 'denuncia' })
    }
    if (update.targhe_presenti !== undefined && update.targhe_presenti !== pratica.targhe_presenti) {
      sync.push({ condizione: 'targhe_assenti', attiva: update.targhe_presenti === false })
    }
    if (update.delegato_nome !== undefined && !!update.delegato_nome !== !!pratica.delegato_nome) {
      sync.push({ condizione: 'delegato', attiva: !!update.delegato_nome })
    }
    let nuovoStato = pratica.stato

    if (sync.length > 0) {
      const { data: righeEsistenti } = await supabase
        .from('pratica_documenti_checklist')
        .select('id, documento_id, indice_erede, stato, file_url')
        .eq('pratica_id', praticaId)

      for (const s of sync) {
        const { data: catalogo } = await supabase
          .from('casistiche_documenti')
          .select('id, per_erede')
          .eq('casistica', pratica.casistica)
          .eq('condizione', s.condizione)

        if (s.attiva) {
          // Aggiunge i documenti della condizione (se non già presenti)
          const daInserire: { pratica_id: string; documento_id: string; indice_erede: number | null; stato: string }[] = []
          for (const doc of catalogo || []) {
            const esistenti = (righeEsistenti || []).filter(r => r.documento_id === doc.id)
            const indici: (number | null)[] = doc.per_erede
              ? Array.from({ length: Math.max(1, pratica.numero_eredi || 1) }, (_, i) => i + 1)
              : [null]
            for (const indice of indici) {
              if (!esistenti.some(e => (e.indice_erede ?? 0) === (indice ?? 0))) {
                daInserire.push({ pratica_id: praticaId, documento_id: doc.id as string, indice_erede: indice, stato: 'da_fare' })
              }
            }
          }
          if (daInserire.length > 0) {
            const { error: errIns } = await supabase.from('pratica_documenti_checklist').insert(daInserire)
            if (errIns) throw errIns
          }
        } else {
          // Toglie i documenti della condizione SOLO se ancora da fare e senza file
          const idCatalogo = new Set((catalogo || []).map(c => c.id as string))
          const idDaTogliere = (righeEsistenti || [])
            .filter(r => idCatalogo.has(r.documento_id) && r.stato === 'da_fare' && !r.file_url)
            .map(r => r.id)
          if (idDaTogliere.length > 0) {
            await supabase.from('pratica_documenti_checklist').delete().in('id', idDaTogliere)
          }
        }
      }

      // Ricalcola lo stato pratica (stesse regole di /api/pratica-stato)
      if (STATI_FASE_DOCUMENTI.includes(pratica.stato)) {
        const { data: righe } = await supabase.from('pratica_documenti_checklist').select('documento_id, stato').eq('pratica_id', praticaId)
        const docIds = Array.from(new Set((righe || []).map(r => r.documento_id)))
        const richiedeUpload = new Map<string, boolean>()
        if (docIds.length > 0) {
          const { data: cats } = await supabase.from('casistiche_documenti').select('id, richiede_upload').in('id', docIds)
          for (const c of cats || []) richiedeUpload.set(c.id as string, !!c.richiede_upload)
        }
        const daApprovare = (righe || []).filter(r => richiedeUpload.get(r.documento_id))
        if (daApprovare.length > 0) {
          const approvati = daApprovare.filter(r => r.stato === 'approvato').length
          const rifiutati = daApprovare.filter(r => r.stato === 'rifiutato').length
          const daFare = daApprovare.filter(r => r.stato === 'da_fare').length
          if (approvati === daApprovare.length) nuovoStato = 'da_assegnare'
          else if (rifiutati > 0) nuovoStato = 'documenti_parzialmente_approvati'
          else if (daFare === 0) nuovoStato = 'in_attesa_approvazione_admin'
          else nuovoStato = 'in_attesa_documenti'
        }
        if (nuovoStato !== pratica.stato) {
          await supabase.from('pratiche').update({ stato: nuovoStato, aggiornato_il: new Date().toISOString() }).eq('id', praticaId)
        }
      }
    }

    return NextResponse.json({ success: true, stato: nuovoStato, sincronizzate: sync.length })
  } catch (err) {
    console.error('Errore modifica dati pratica:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
