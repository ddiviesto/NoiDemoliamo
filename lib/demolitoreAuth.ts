/**
 * Autenticazione condivisa degli endpoint dell'AREA DEMOLITORE.
 *
 * Il ruolo demolitore NON ha accesso diretto alle tabelle (RLS):
 * tutti i suoi endpoint passano da qui, che verifica il Bearer token,
 * controlla che l'utente sia tipo 'demolitore' e restituisce il client
 * service-role insieme al suo demolitore_id. Ogni query successiva DEVE
 * filtrare per quel demolitore_id: il demolitore vede solo le SUE pratiche.
 */

import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type AuthDemolitore =
  | { ok: true; supabase: SupabaseClient; demolitoreId: string; userId: string }
  | { ok: false; status: number; messaggio: string }

export async function autenticaDemolitore(req: NextRequest): Promise<AuthDemolitore> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, messaggio: 'Non autorizzato' }
  }
  const token = authHeader.substring(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await supabaseUser.auth.getUser(token)
  if (!user) {
    return { ok: false, status: 401, messaggio: 'Sessione non valida' }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: profilo } = await supabase
    .from('utenti')
    .select('tipo, demolitore_id')
    .eq('id', user.id)
    .single()
  if (profilo?.tipo !== 'demolitore' || !profilo.demolitore_id) {
    return { ok: false, status: 403, messaggio: 'Solo demolitori' }
  }

  return { ok: true, supabase, demolitoreId: profilo.demolitore_id as string, userId: user.id }
}

/**
 * Carica una pratica verificando che appartenga al demolitore autenticato.
 */
export async function praticaDelDemolitore(
  supabase: SupabaseClient,
  praticaId: string,
  demolitoreId: string,
  colonne = '*',
): Promise<{ pratica: Record<string, unknown> | null; errore?: string }> {
  const { data, error } = await supabase
    .from('pratiche')
    .select(colonne)
    .eq('id', praticaId)
    .eq('demolitore_id', demolitoreId)
    .maybeSingle()
  if (error) return { pratica: null, errore: error.message }
  if (!data) return { pratica: null, errore: 'Pratica non trovata o non assegnata a te' }
  return { pratica: data as unknown as Record<string, unknown> }
}
