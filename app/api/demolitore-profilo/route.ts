/**
 * Endpoint AREA DEMOLITORE: anagrafica propria (23/07/2026).
 * POST → i dati anagrafici del demolitore autenticato, in sola lettura
 * (mostrati nel pannello laterale a tenda; per modifiche si passa da
 * NoiDemoliamo — la scheda la gestisce solo l'admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore } from '@/lib/demolitoreAuth'

const CAMPI = [
  'ragione_sociale', 'piva', 'codice_sdi', 'pec',
  'indirizzo', 'citta', 'provincia', 'cap',
  'telefono_fisso', 'titolare_nome', 'titolare_cellulare',
  'referente_nome', 'referente_cellulare',
  'email_aziendale', 'email_assegnazione',
].join(', ')

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const { data, error } = await supabase
      .from('demolitori')
      .select(CAMPI)
      .eq('id', demolitoreId)
      .single()
    if (error || !data) {
      console.error('Errore lettura profilo demolitore:', error)
      return NextResponse.json({ error: 'Errore nel caricamento del profilo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profilo: data })
  } catch (err) {
    console.error('Errore endpoint demolitore-profilo:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
