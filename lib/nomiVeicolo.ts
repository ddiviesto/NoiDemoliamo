// ============================================================
// COME SI CHIAMA IL MEZZO NEI TESTI
// ⭐ 19/08: prima queste formule vivevano dentro /inizia/page.tsx e il
// flusso della valutazione diceva sempre "il mezzo": i titoli dei due
// flussi non erano uguali. Ora stanno qui e le usano tutti e due.
// ============================================================

import { TipoMezzo } from '../types/pratica'

/** "l'autovettura", "il motoveicolo"… per i titoli tipo "A chi è intestata *l'autovettura*?" */
export function articolo(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'il veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) return `il ${tipoAltro.trim().toLowerCase()}`
  const map: Record<TipoMezzo, string> = {
    autovettura: "l'autovettura", motoveicolo: 'il motoveicolo', ciclomotore: 'il ciclomotore',
    minicar: 'la minicar', furgone: 'il furgone', imbarcazione: "l'imbarcazione", pullman: 'il pullman',
    camion: 'il camion', velivolo: 'il velivolo', altro: 'il mezzo',
  }
  return map[tipo]
}

/** "dell'autovettura", "del motoveicolo"… */
export function articoloDel(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'del veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) return `del ${tipoAltro.trim().toLowerCase()}`
  const map: Record<TipoMezzo, string> = {
    autovettura: "dell'autovettura", motoveicolo: 'del motoveicolo', ciclomotore: 'del ciclomotore',
    minicar: 'della minicar', furgone: 'del furgone', imbarcazione: "dell'imbarcazione", pullman: 'del pullman',
    camion: 'del camion', velivolo: 'del velivolo', altro: 'del mezzo',
  }
  return map[tipo]
}

/** "tua autovettura", "tuo motoveicolo"… */
export function pronomeTuo(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'tuo veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) return `tuo ${tipoAltro.trim().toLowerCase()}`
  const map: Record<TipoMezzo, string> = {
    autovettura: 'tua autovettura', motoveicolo: 'tuo motoveicolo', ciclomotore: 'tuo ciclomotore',
    minicar: 'tua minicar', furgone: 'tuo furgone', imbarcazione: 'tua imbarcazione', pullman: 'tuo pullman',
    camion: 'tuo camion', velivolo: 'tuo velivolo', altro: 'tuo mezzo',
  }
  return map[tipo]
}

/** "Autovettura", "Motoveicolo"… il nome secco, con la maiuscola. */
export function nomeVeicolo(tipo: TipoMezzo | null, tipoAltro?: string): string {
  if (!tipo) return 'Veicolo'
  if (tipo === 'altro' && tipoAltro?.trim()) {
    const t = tipoAltro.trim()
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
  }
  const map: Record<TipoMezzo, string> = {
    autovettura: 'Autovettura', motoveicolo: 'Motoveicolo', ciclomotore: 'Ciclomotore',
    minicar: 'Minicar', furgone: 'Furgone', imbarcazione: 'Imbarcazione', pullman: 'Pullman',
    camion: 'Camion', velivolo: 'Velivolo', altro: 'Altro mezzo',
  }
  return map[tipo]
}

/** I mezzi per cui ha senso chiedere il tipo di cambio. */
export function veicoloHaCambio(tipo: TipoMezzo | null): boolean {
  if (!tipo) return true
  return tipo === 'autovettura' || tipo === 'minicar' || tipo === 'furgone' || tipo === 'pullman' || tipo === 'camion' || tipo === 'altro'
}

/** Per accordare gli aggettivi: "intestata" o "intestato". */
export function isFemminile(tipo: TipoMezzo | null): boolean {
  if (!tipo) return false
  return tipo === 'autovettura' || tipo === 'minicar' || tipo === 'imbarcazione'
}
