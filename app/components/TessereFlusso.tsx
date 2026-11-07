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

export function TessereFlusso({ children, colonne }: { children: React.ReactNode; colonne: number }) {
  return (
    <div className="mb-3" style={{ display: 'grid', gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))`, gap: 6, alignItems: 'stretch' }}>
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
    <div
      className="relative flex flex-col min-w-0 transition-shadow"
      style={{
        background: rossaViva ? '#FCEBEB' : attivo ? '#EFF6FF' : chiusa ? '#F5F7FB' : '#fff',
        border: `1.5px solid ${attivo ? '#2563EB' : rossaViva ? '#F3C8C8' : '#E5E7EB'}`,
        borderRadius: 12,
        boxShadow: attivo ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(16,24,40,0.07)',
        minHeight: 96,
      }}
    >
      <button onClick={onClick} title={title} className="text-left hover:bg-black/[0.02] transition-colors" style={{ padding: '9px 10px 6px', borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: colNumero }}>{valore}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: rossaViva ? '#A32D2D' : '#1E293B' }}>{nome}</div>
      </button>

      {/* le vocine, subito sotto il nome (non in fondo: in "Assegnata" ce n'è una sola) */}
      {vocine && vocine.length > 0 && (
        <div className="flex flex-col" style={{ padding: '0 10px 8px' }}>
          {vocine.map(v => {
            const viva = !!v.rossa && v.valore > 0
            return (
              <button
                key={v.nome}
                onClick={v.onClick}
                title={v.title}
                className="flex items-center justify-between gap-2 text-left transition-colors hover:bg-black/[0.02]"
                style={{ fontSize: 10.5, padding: '4px 0', background: 'none', border: 'none', borderTop: '1px solid #EEF1F5', cursor: 'pointer', color: viva ? '#A32D2D' : v.attivo ? '#1D4ED8' : '#4B5A72', fontWeight: v.attivo ? 700 : 500 }}
              >
                <span className="truncate">{v.nome}</span>
                <span style={{ fontWeight: 700, color: viva ? '#A32D2D' : v.attivo ? '#1D4ED8' : v.valore === 0 ? '#94A3B8' : '#1E293B' }}>{v.valore}</span>
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
