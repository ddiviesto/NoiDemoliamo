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
        // ⭐ 07/11 (Davide): si colora SOLO la parte cliccata (la fase o la
        // vocina), non tutta la tessera; il bordo blu dice che qui c'è il filtro
        background: rossaViva ? '#FCEBEB' : chiusa ? '#F5F7FB' : '#fff',
        border: `1.5px solid ${attivo || vocine?.some(v => v.attivo) ? '#2563EB' : rossaViva ? '#F3C8C8' : '#E5E7EB'}`,
        borderRadius: 12,
        boxShadow: attivo || vocine?.some(v => v.attivo) ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 3px rgba(16,24,40,0.07)',
        minHeight: 96,
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <div className="text-left" style={{ padding: '9px 10px 7px', background: attivo ? '#EFF6FF' : 'transparent', flex: vocine && vocine.length > 0 ? 'none' : 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: colNumero }}>{valore}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: rossaViva ? '#A32D2D' : attivo ? '#1D4ED8' : '#1E293B' }}>{nome}</div>
      </div>

      {/* le vocine, subito sotto il nome, con LO STESSO DISEGNO della fase
          (⭐ 07/11, Davide): numero grande e nome, separate da un filo. Il
          colore della vocina attiva copre tutta la sua fascia, da bordo a bordo */}
      {vocine && vocine.length > 0 && (
        <div className="flex flex-col">
          {vocine.map(v => {
            const viva = !!v.rossa && v.valore > 0
            const colN = viva ? '#A32D2D' : v.valore === 0 ? '#94A3B8' : '#1D4ED8'
            return (
              <button
                key={v.nome}
                onClick={e => { e.stopPropagation(); v.onClick() }}
                title={v.title}
                className="text-left w-full transition-colors hover:bg-black/[0.02]"
                style={{ padding: '8px 10px 7px', background: v.attivo ? '#EFF6FF' : 'transparent', border: 'none', borderTop: '1px solid #EEF1F5', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: colN }}>{v.valore}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: viva ? '#A32D2D' : v.attivo ? '#1D4ED8' : '#1E293B' }}>{v.nome}</div>
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
