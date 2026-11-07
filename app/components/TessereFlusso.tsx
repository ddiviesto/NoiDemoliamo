'use client'

// ============================================================
// IL FLUSSO PRATICHE A TESSERE (⭐ 07/11, mockup C scelto da Davide)
// Una riga di tessere TUTTE UGUALI (stessa larghezza, stessa altezza):
// numero grande, nome della fase, e dentro la tessera le "vocine" che
// prima stavano sotto come pillole (Allerta 8 ore dentro Assegnata;
// Attesa Certificati e Attesa PRA dentro Ritirata), come righe di testo
// col numero a destra. Le parole e l'ordine sono quelli di sempre.
// Condiviso tra il CRM admin e l'area demolitore: stesse parole.
// ============================================================

export type Vocina = {
  nome: string
  valore: number
  attivo: boolean
  rossa?: boolean   // rossa solo quando conta qualcosa
  title?: string
  onClick: () => void
}

// Le tessere hanno la STESSA larghezza in tutte le aree (⭐ 07/11, Davide):
// la misura di riferimento è quella delle nove tessere del flusso pratiche,
// quindi una fila più corta occupa solo la sua parte di riga.
const COLONNE_RIFERIMENTO = 9

export function TessereFlusso({ children, colonne }: { children: React.ReactNode; colonne: number }) {
  const quota = Math.min(1, colonne / COLONNE_RIFERIMENTO)
  return (
    <div className="mb-3" style={{ display: 'grid', gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))`, gap: 6, alignItems: 'stretch', width: `calc(${quota * 100}% - ${(1 - quota) * 6}px)` }}>
      {children}
    </div>
  )
}

export function TesseraFase({ nome, valore, attivo, rossa, chiusa, freccia, title, onClick, vocine }: {
  nome: string
  valore: number
  attivo: boolean
  rossa?: boolean     // "Da contattare" e simili: rossa quando conta qualcosa
  chiusa?: boolean    // "Completata": fondo grigio chiaro e numero verde
  freccia?: boolean   // il trattino verso la tessera dopo (solo tra le fasi vere)
  title?: string
  onClick: () => void
  vocine?: Vocina[]
}) {
  const rossaViva = !!rossa && valore > 0
  const colNumero = rossaViva ? '#A32D2D' : valore === 0 ? '#94A3B8' : chiusa ? '#1F7A43' : '#1D4ED8'
  return (
    // ⭐ 07/11 (Davide): TUTTA la tessera è cliccabile, non solo il numero e
    // il nome; le vocine dentro fermano il clic per conto loro
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      title={title}
      className="relative flex flex-col min-w-0 transition-all hover:shadow-md"
      style={{
        background: rossaViva ? '#FCEBEB' : attivo ? '#EFF6FF' : chiusa ? '#F5F7FB' : '#fff',
        border: `1.5px solid ${attivo ? '#2563EB' : rossaViva ? '#F3C8C8' : '#E5E7EB'}`,
        borderRadius: 12,
        boxShadow: attivo ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(16,24,40,0.07)',
        minHeight: 96,
        cursor: 'pointer',
      }}
    >
      <div className="text-left" style={{ padding: '9px 10px 6px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: colNumero }}>{valore}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: rossaViva ? '#A32D2D' : '#1E293B' }}>{nome}</div>
      </div>

      {/* le vocine, subito sotto il nome (non in fondo: in "Assegnata" ce n'è una sola) */}
      {vocine && vocine.length > 0 && (
        <div className="flex flex-col" style={{ padding: '0 10px 8px' }}>
          {vocine.map(v => {
            const viva = !!v.rossa && v.valore > 0
            return (
              <button
                key={v.nome}
                onClick={e => { e.stopPropagation(); v.onClick() }}
                title={v.title}
                className="flex items-baseline gap-1.5 text-left transition-colors hover:bg-black/[0.02]"
                style={{ fontSize: 10.5, padding: '4px 0', background: 'none', border: 'none', borderTop: '1px solid #EEF1F5', cursor: 'pointer', color: viva ? '#A32D2D' : v.attivo ? '#1D4ED8' : '#4B5A72', fontWeight: v.attivo ? 700 : 500 }}
              >
                {/* ⭐ 07/11 (mockup B): il numero STA A SINISTRA, prima del nome, come nella tessera grande */}
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 10, color: viva ? '#A32D2D' : v.attivo ? '#1D4ED8' : v.valore === 0 ? '#94A3B8' : '#1D4ED8' }}>{v.valore}</span>
                <span className="truncate">{v.nome}</span>
              </button>
            )
          })}
        </div>
      )}

      {freccia && (
        <span aria-hidden="true" style={{ position: 'absolute', right: -7, top: 26, width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid #C3CBD9' }} />
      )}
    </div>
  )
}
