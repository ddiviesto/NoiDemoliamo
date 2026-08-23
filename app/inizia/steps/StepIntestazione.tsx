'use client'

// ============================================================
// STEP "A CHI È INTESTATO IL MEZZO" — CONDIVISO
// Lo usano il flusso demolizione (/inizia) e quello della valutazione
// (/vendi-auto): stesse sei scelte, stesse icone, stesse parole.
// ⚠️ Se si aggiunge o si cambia una scelta, si fa QUI e vale per tutti e due.
// ============================================================

import { Intestazione } from '../../../types/pratica'
import { RuoloButton, ErrorBadge } from './PezziFlusso'

const SCELTE: { valore: Intestazione; label: string; sub: string; icona: React.ReactNode }[] = [
  {
    valore: 'me',
    label: 'A un privato cittadino',
    sub: "Il proprietario è una persona, non un'azienda",
    icona: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  },
  {
    valore: 'societa',
    label: 'A una società o azienda',
    sub: 'Mezzo intestato a una ditta con partita IVA',
    icona: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1" /><line x1="9" y1="7" x2="10" y2="7" /><line x1="14" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="10" y2="11" /><line x1="14" y1="11" x2="15" y2="11" /><path d="M9 22v-4h6v4" /></svg>,
  },
  {
    valore: 'deceduto',
    label: 'A una persona deceduta',
    sub: 'Il proprietario è venuto a mancare',
    icona: <svg width="20" height="20" viewBox="0 0 2048 2048" fill="currentColor"><path d="M1504 128q113 0 212 43t173 116t116 173t43 212q0 109-41 209t-118 176l-865 864l-865-864Q83 981 42 881T0 672q0-112 42-211t117-173t173-117t212-43q83 0 148 19t120 52t106 81t106 103q55-56 105-103t106-80t121-53t148-19m294 838q59-59 90-135t31-159q0-87-32-162t-88-131t-132-87t-163-32q-84 0-149 26t-120 70t-105 97t-106 111q-54-54-105-109t-106-99t-121-72t-148-28q-86 0-162 32t-132 89t-89 133t-33 162q0 83 31 159t91 135l774 774z" /></svg>,
  },
  {
    valore: 'associazione',
    label: "A un'associazione",
    sub: 'Mezzo intestato a un ente o associazione',
    icona: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" /><path d="M19 15a4 4 0 0 1 3 4v2" /></svg>,
  },
  {
    valore: 'altra_persona',
    label: 'Passaggio di proprietà non completato',
    sub: 'Non risulto proprietario sui documenti',
    icona: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M21 3l-7 7" /><path d="M8 21H3v-5" /><path d="M3 21l7-7" /></svg>,
  },
  {
    valore: 'targhe_straniere',
    label: 'Il mezzo ha targhe straniere',
    sub: "Veicolo immatricolato all'estero",
    icona: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20" /></svg>,
  },
]

export function StepIntestazione({ valore, onScegli, onContinua, errore }: {
  valore: Intestazione | null
  onScegli: (v: Intestazione) => void
  onContinua: () => void
  errore: boolean
}) {
  return (
    <>
      {errore && <div className="mb-3"><ErrorBadge>Seleziona a chi è intestato il mezzo per continuare.</ErrorBadge></div>}
      {/* ⭐ 28/07 sera (mockup B): righe di griglia TUTTE uguali — ogni
          riquadro alto quanto il più alto, a qualsiasi larghezza */}
      <div className="grid gap-2" style={{ gridAutoRows: '1fr' }}>
        {SCELTE.map(s => (
          <RuoloButton
            key={s.valore}
            iconSvg={s.icona}
            label={s.label}
            sub={s.sub}
            selected={valore === s.valore}
            onClick={() => onScegli(s.valore)}
            errorBorder={errore}
            uniforme
          />
        ))}
      </div>
      <button onClick={onContinua} className="btn-pagina mt-4">Continua</button>
    </>
  )
}
