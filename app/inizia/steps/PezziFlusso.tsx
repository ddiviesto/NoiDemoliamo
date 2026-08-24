'use client'

// ============================================================
// PEZZI CONDIVISI DEI FLUSSI (demolizione e valutazione)
// ⭐ 19/08: prima vivevano dentro /inizia/page.tsx e il flusso della
// valutazione se li era ricostruiti simili ma non uguali, quindi le due
// schermate erano diverse. Ora stanno qui e li usano tutti e due: se si
// cambiano, cambiano in entrambi i flussi.
// ============================================================

// ⭐ 28/07 sera (mockup B): `uniforme` = tutti i riquadri della lista alla
// stessa altezza (quella del più alto coi testi a capo) — niente più riquadro
// che spicca perché il suo titolo va su due righe
export function RuoloButton({ iconSvg, label, sub, selected, onClick, errorBorder, uniforme }: { iconSvg: React.ReactNode; label: string; sub: string; selected: boolean; onClick: () => void; errorBorder?: boolean; uniforme?: boolean }) {
  // Opzione più "solida" e leggibile: bordo netto, icona grande, titolo scuro protagonista.
  // La selezionata è inconfondibile: bordo blu pieno, sfondo azzurro, icona blu piena.
  const baseBg = selected ? 'bg-[#EFF6FF]' : errorBorder ? 'bg-white' : 'bg-white hover:bg-blue-50/40'
  const borderStyle: React.CSSProperties = selected
    ? { border: '2px solid #1D4ED8', boxShadow: '0 2px 8px rgba(37,99,235,0.12)' }
    : errorBorder
      ? { border: '2px solid #FCA5A5' }
      : { border: '2px solid #D7DCE5' }
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3.5 rounded-[13px] text-left transition-all active:scale-[0.995] ${baseBg}`} style={{ ...borderStyle, minHeight: uniforme ? 92 : undefined }}>
      <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-[#DBEAFE] text-blue-600'}`}>
        {iconSvg}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px] leading-snug" style={{ color: '#0F172A' }}>{label}</div>
        <div className="text-[12.5px] mt-0.5" style={{ color: selected ? '#1E4E8C' : '#4B5563' }}>{sub}</div>
      </div>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
        {selected && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </button>
  )
}

// ============================================================
// IL CAMPO DA COMPILARE (⭐ 24/08, mockup B approvato)
// Etichetta piccola FUORI, pillola bianca sotto. Prima era un riquadro
// grigio con l'etichetta dentro: pesava e faceva a pugni col resto.
// La veste sta in globals.css (.campo-pillola), qui c'è solo l'impaginazione.
// ============================================================
export function CampoModulo({ id, label, aiuto, aiutoTipo, errore, dentroRiquadro, classe, children }: {
  id?: string
  label?: string
  aiuto?: React.ReactNode
  aiutoTipo?: 'ok' | 'errore'
  errore?: string
  dentroRiquadro?: boolean       // etichetta senza rientro (quando la pillola sta dentro un box)
  classe?: string
  children: React.ReactNode
}) {
  return (
    <div id={id} className={classe}>
      {label && <label className={`campo-etichetta${dentroRiquadro ? ' campo-etichetta--dentro' : ''}`}>{label}</label>}
      {children}
      {errore
        ? <span className="campo-aiuto campo-aiuto--errore">{errore}</span>
        : aiuto && <span className={`campo-aiuto${aiutoTipo ? ' campo-aiuto--' + aiutoTipo : ''}`}>{aiuto}</span>}
    </div>
  )
}

/** Le classi della pillola da scrivere: `classeCampo(errore)` sull'input. */
export function classeCampo(errore?: boolean, extra?: string) {
  return `campo-pillola${errore ? ' campo-pillola--errore' : ''}${extra ? ' ' + extra : ''}`
}

// ============================================================
// LA SCELTA A PILLOLA (⭐ 24/08, mockup B approvato)
// Tutte le scelte del flusso (Sì/No, accesso libero, tipo di cambio…)
// sono pillole bianche che si accendono di BLU con la spunta.
// ⚠️ Niente verde/ambra/rosso: il "va bene / non va bene" serve a noi in
// ufficio, non al cliente mentre compila.
// ============================================================
export function SceltaPillola({ label, presa, errore, larga, onClick }: {
  label: string
  presa: boolean
  errore?: boolean
  larga?: boolean               // occupa tutto lo spazio disponibile in fila
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={presa}
      className={`scelta-pillola${presa ? ' scelta-pillola--presa' : ''}${errore && !presa ? ' scelta-pillola--errore' : ''}${larga ? ' flex-1' : ''}`}
    >
      {presa && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {label}
    </button>
  )
}

export function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl p-3 text-[13.5px] leading-relaxed" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
      <span>{children}</span>
    </div>
  )
}

export function ErrorBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl p-3 text-[13.5px] leading-relaxed" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
      <span>{children}</span>
    </div>
  )
}

/** Barra di avanzamento sottile sotto la testata blu. */
export function BarraAvanzamento({ percento }: { percento: number }) {
  return (
    <div className="h-1 bg-gray-100 rounded-full mb-5 mt-1 overflow-hidden">
      <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${percento}%` }} />
    </div>
  )
}

/**
 * Titolo del passo: le parti tra *asterischi* diventano blu sul telefono e
 * in SFUMATURA blu-viola su PC (regola in globals.css, .flusso-titolo .parola).
 */
export function TitoloPasso({ titolo, sotto }: { titolo: string; sotto?: string }) {
  return (
    <>
      <h1 className="flusso-titolo text-[21px] sm:text-[36px] font-extrabold text-[#0F172A] tracking-tight sm:tracking-[-1.2px] leading-tight mb-1 sm:mb-3">
        {titolo.split('*').map((p, i) => (i % 2 === 1 ? <span key={i} className="parola" style={{ color: '#1D4ED8' }}>{p}</span> : p))}
      </h1>
      {sotto && <p className="text-[14px] sm:text-[16px] text-gray-700 leading-relaxed mb-4 sm:mb-7 sm:max-w-[560px]">{sotto}</p>}
    </>
  )
}

/**
 * FASCETTA "DOVE SONO": striscia azzurra sotto la testata blu che dice al
 * cliente in che richiesta si trova e con che mezzo.
 * ⭐ 19/08 (rifinitura 2 approvata da Davide): azzurra chiara come le barre
 * del CRM, così sembra parte della card e non un secondo pezzo di testata.
 */
export function FascettaServizio({ servizio, mezzo }: { servizio: string; mezzo: string }) {
  return (
    <div
      className="-mx-7 -mt-5 mb-5 px-4 flex items-center gap-2"
      style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', padding: '9px 16px' }}
    >
      {/* ⚠️ 19/08 (Davide): niente puntino di separazione, dava fastidio.
          Servizio e mezzo si separano con lo spazio e col colore. */}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1D4ED8' }}>{servizio}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3E4C63', marginLeft: 6 }}>{mezzo}</span>
    </div>
  )
}
