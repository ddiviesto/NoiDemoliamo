'use client'

// ============================================================
// I PEZZI DELLA "CRONOLOGIA E NOTE" (⭐ 19/11, Davide: la scheda della
// valutazione deve vedersi UGUALE a quella della demolizione).
// Un posto solo per la veste: la riga della cronologia (data a sinistra,
// pillola, testo sotto) e il campo per scrivere una nota. Li usano
// CronologiaNote (pratiche di demolizione) e la scheda delle richieste
// di valutazione: se si cambia qui, cambia in tutte e due.
// ============================================================

export function fmtGiorno(x: string) {
  return new Date(x).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', '')
}
export function fmtOra(x: string) {
  return new Date(x).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export interface PillolaCronologia { label: string; bg: string; col: string }

/** Una riga: giorno e ora a sinistra, la pillola che dice COSA è successo,
 *  e sotto (children) il dettaglio. `evidenza` = riquadro azzurro della nota
 *  appena arrivata; `ultima` = niente filetto sotto; `spenta` = testo grigio
 *  (la voce fissa "Creata"). `quando` vuoto = nessuna data. */
export function VoceCronologia({ quando, pillola, icona, pallino, evidenza, ultima, spenta, children }: {
  quando?: string | null
  pillola?: PillolaCronologia | null
  icona?: React.ReactNode
  pallino?: boolean
  evidenza?: boolean
  ultima?: boolean
  spenta?: boolean
  children?: React.ReactNode
}) {
  return (
    <div style={evidenza
      ? { display: 'flex', gap: 10, padding: '9px 10px', background: '#F7FAFF', border: '1px solid #DBEAFE', borderRadius: 10, marginBottom: 4 }
      : { display: 'flex', gap: 10, padding: '9px 0', borderBottom: ultima ? undefined : '1px solid #F1F4F8' }}>
      <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {quando ? <>{fmtGiorno(quando)}<br />{fmtOra(quando)}</> : null}
      </div>
      <div style={{ flex: 1, fontSize: 12.5, color: spenta ? '#94A3B8' : '#3E4C63', lineHeight: 1.5, minWidth: 0 }}>
        {pillola && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: pillola.bg, color: pillola.col, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', marginRight: 6, verticalAlign: 'middle' }}>
            {icona}
            {pillola.label}
          </span>
        )}
        {pallino && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: '#DC2626', marginLeft: 6, verticalAlign: 'middle' }} />}
        {children}
      </div>
    </div>
  )
}

/** Il dettaglio sotto la pillola, allineato al suo bordo sinistro */
export function DettaglioVoce({ children, unaRiga }: { children: React.ReactNode; unaRiga?: boolean }) {
  return <span style={{ display: 'block', marginTop: 4, ...(unaRiga ? { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' } : {}) }}>{children}</span>
}

/** L'iconcina della matita della pillola "Nota privata" */
export const ICONA_NOTA = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>

export const PILLOLA_NOTA_PRIVATA: PillolaCronologia = { bg: '#EEF1F5', col: '#5B6779', label: 'Nota privata' }
// ⭐ 19/11 (Davide): la pillola "Creata" è solo la parola, senza il "+" davanti
export const PILLOLA_CREATA: PillolaCronologia = { bg: '#EEF1F5', col: '#5B6779', label: 'Creata' }

/** Il campo in fondo: casella a pillola e tondo blu con la matita (Invio = salva) */
export function CampoNota({ valore, onValore, onInvia, occupato, placeholder }: {
  valore: string
  onValore: (v: string) => void
  onInvia: () => void
  occupato?: boolean
  placeholder: string
}) {
  return (
    <div className="flex gap-1.5 mt-2 items-center">
      <input
        value={valore}
        onChange={e => onValore(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onInvia() }}
        placeholder={placeholder}
        className="flex-1 min-w-0 border-[1.5px] border-gray-200 rounded-full px-3.5 py-[7px] text-[12.5px] text-gray-900 bg-white outline-none focus:border-blue-400 transition-all placeholder:text-gray-400"
      />
      <button
        onClick={onInvia}
        disabled={occupato || !valore.trim()}
        className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40 hover:bg-blue-700"
        style={{ background: '#2563eb', width: 32, height: 32, borderRadius: 999, border: 'none', cursor: 'pointer' }}
        aria-label="Aggiungi nota"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
      </button>
    </div>
  )
}
