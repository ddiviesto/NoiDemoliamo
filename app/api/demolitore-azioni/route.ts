/**
 * Endpoint AREA DEMOLITORE: azioni sulla pratica.
 *
 * Azioni:
 *  - fissa_ritiro        { pratica_id, quando (ISO) } → data_ritiro_prevista + stato 'ritiro_confermato'
 *                        (decisione di Davide: la data vale subito, il cliente NON deve confermare;
 *                        vale anche per SPOSTARE una data già fissata)
 *  - segna_ritirata      { pratica_id } → data_ritiro_effettuato + stato 'ritirata' (entra in fatturazione)
 *  - rottamazione_a_mano { pratica_id } → certificato di rottamazione consegnato a mano al ritiro:
 *                        data_certificato_rottamazione + flag, stato 'in_attesa_cert_radiazione_pra'.
 *                        Regola fissa: ciò che COMPLETA la pratica è solo il certificato PRA.
 *
 * Ogni azione verifica che la pratica appartenga al demolitore e che lo
 * stato attuale ammetta l'azione (niente salti di pipeline).
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore, praticaDelDemolitore } from '@/lib/demolitoreAuth'

// Stati da cui ogni azione è ammessa
const STATI_FISSA = ['assegnata', 'in_attesa_conferma_cliente', 'ritiro_confermato']
const STATI_RITIRATA = ['assegnata', 'in_attesa_conferma_cliente', 'ritiro_confermato']
const STATI_ROTTAMAZIONE = ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione']

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const body = await req.json().catch(() => ({}))
    const praticaId: string | undefined = body.pratica_id
    const azione: string | undefined = body.azione
    if (!praticaId || !azione) {
      return NextResponse.json({ error: 'pratica_id o azione mancanti' }, { status: 400 })
    }

    const { pratica, errore } = await praticaDelDemolitore(supabase, praticaId, demolitoreId, 'id, stato')
    if (!pratica) return NextResponse.json({ error: errore }, { status: 404 })
    const stato = pratica.stato as string
    const adesso = new Date().toISOString()

    if (azione === 'fissa_ritiro') {
      if (!STATI_FISSA.includes(stato)) {
        return NextResponse.json({ error: `Non puoi fissare il ritiro in questo stato (${stato})` }, { status: 409 })
      }
      const quando: string | undefined = body.quando
      const dataRitiro = quando ? new Date(quando) : null
      if (!dataRitiro || isNaN(dataRitiro.getTime())) {
        return NextResponse.json({ error: 'Data o ora del ritiro non valide' }, { status: 400 })
      }
      if (dataRitiro.getTime() < Date.now() - 60 * 60 * 1000) {
        return NextResponse.json({ error: 'La data del ritiro è nel passato' }, { status: 400 })
      }
      const { error } = await supabase.from('pratiche').update({
        data_ritiro_prevista: dataRitiro.toISOString(),
        stato: 'ritiro_confermato',
        aggiornato_il: adesso,
      }).eq('id', praticaId)
      if (error) throw error
      return NextResponse.json({ success: true, stato: 'ritiro_confermato' })
    }

    if (azione === 'segna_ritirata') {
      if (!STATI_RITIRATA.includes(stato)) {
        return NextResponse.json({ error: `Non puoi segnare il ritiro in questo stato (${stato})` }, { status: 409 })
      }
      const { error } = await supabase.from('pratiche').update({
        data_ritiro_effettuato: adesso,
        stato: 'ritirata',
        aggiornato_il: adesso,
      }).eq('id', praticaId)
      if (error) throw error
      return NextResponse.json({ success: true, stato: 'ritirata' })
    }

    if (azione === 'rottamazione_a_mano') {
      if (!STATI_ROTTAMAZIONE.includes(stato)) {
        return NextResponse.json({ error: `Azione non ammessa in questo stato (${stato})` }, { status: 409 })
      }
      const { error } = await supabase.from('pratiche').update({
        cert_rottamazione_a_mano: true,
        data_certificato_rottamazione: adesso,
        stato: 'in_attesa_cert_radiazione_pra',
        aggiornato_il: adesso,
      }).eq('id', praticaId)
      if (error) throw error
      return NextResponse.json({ success: true, stato: 'in_attesa_cert_radiazione_pra' })
    }

    return NextResponse.json({ error: `Azione sconosciuta: ${azione}` }, { status: 400 })
  } catch (err) {
    console.error('Errore endpoint demolitore-azioni:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
