'use client'

// ============================================================
// AGGIORNAMENTO AUTOMATICO DELLE PAGINE (22/07/2026)
// Tre livelli, dal più immediato alla rete di sicurezza:
//   1. TEMPO REALE — il database avvisa la pagina nell'istante in cui
//      una tabella osservata cambia (Supabase Realtime; le tabelle vanno
//      abilitate alla pubblicazione, vedi docs/sql/2026-07-22-tempo-reale.sql)
//   2. RITORNO SULLA PAGINA — quando la scheda/finestra torna in primo
//      piano si ricaricano i dati (il caso classico: admin approva,
//      il cliente riapre la sua finestra)
//   3. CONTROLLO PERIODICO — ogni tot secondi, solo a pagina visibile
// La ricarica è SEMPRE quella silenziosa del componente (niente spinner,
// niente sobbalzi — regola di sempre).
// Le pagine del demolitore non hanno accesso diretto al DB (RLS):
// per loro si usa il hook senza tabelle (solo livelli 2 e 3).
// ============================================================

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type TabellaLive = {
  tabella: string
  /** es. `pratica_id=eq.${id}` — senza filtro arrivano tutti i cambi visibili all'utente (RLS) */
  filtro?: string
}

export function useAggiornaLive(opts: {
  /** nome univoco del canale, es. `cliente-doc-${praticaId}` */
  canale: string
  /** tabelle da ascoltare in tempo reale; vuoto/assente = solo focus + polling */
  tabelle?: TabellaLive[]
  /** ricarica silenziosa dei dati del componente */
  onCambio: () => void
  /** rete di sicurezza in millisecondi (default 60s; null = disattivata) */
  pollingMs?: number | null
  /** default true */
  attivo?: boolean
}) {
  // il callback vive in un ref: il canale non va ricreato a ogni render
  const cb = useRef(opts.onCambio)
  cb.current = opts.onCambio
  const ultimaChiamata = useRef(0)

  const { canale, attivo = true } = opts
  const pollingMs = opts.pollingMs === undefined ? 60000 : opts.pollingMs
  const tabelleKey = JSON.stringify(opts.tabelle || [])

  useEffect(() => {
    if (!attivo) return
    const tabelle: TabellaLive[] = JSON.parse(tabelleKey)

    // Eventi a raffica (es. approva tutti) → UNA sola ricarica
    let timer: ReturnType<typeof setTimeout> | null = null
    const richiama = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        ultimaChiamata.current = Date.now()
        cb.current()
      }, 400)
    }

    // 1) TEMPO REALE
    let channel: ReturnType<typeof supabase.channel> | null = null
    if (tabelle.length > 0) {
      channel = supabase.channel(canale)
      for (const t of tabelle) {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: t.tabella, ...(t.filtro ? { filter: t.filtro } : {}) },
          richiama
        )
      }
      channel.subscribe()
    }

    // 2) RITORNO SULLA PAGINA (con paracadute anti-doppione: max una ogni 3s)
    const onVisibile = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - ultimaChiamata.current < 3000) return
      ultimaChiamata.current = Date.now()
      cb.current()
    }
    document.addEventListener('visibilitychange', onVisibile)
    window.addEventListener('focus', onVisibile)

    // 3) CONTROLLO PERIODICO (solo a pagina visibile)
    let intervallo: ReturnType<typeof setInterval> | null = null
    if (pollingMs) {
      intervallo = setInterval(() => {
        if (document.visibilityState !== 'visible') return
        ultimaChiamata.current = Date.now()
        cb.current()
      }, pollingMs)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (intervallo) clearInterval(intervallo)
      document.removeEventListener('visibilitychange', onVisibile)
      window.removeEventListener('focus', onVisibile)
      if (channel) supabase.removeChannel(channel)
    }
  }, [canale, tabelleKey, attivo, pollingMs])
}
