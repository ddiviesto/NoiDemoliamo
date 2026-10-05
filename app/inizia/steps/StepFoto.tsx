'use client'

// ============================================================
// IL PASSO DELLE FOTO — condiviso da demolizione e valutazione
// ⭐ 05/10 (mockup "B1" + veste "Aria" scelti da Davide):
//   · nessuna foto → le due righe "Scatta una foto" / "Carica dalla
//     galleria" sul telefono; sul PC una riga sola "Scegli le foto dal
//     dispositivo" (lì la fotocamera non serve)
//   · dalla prima foto in poi → contatore con la pillola di stato, SOLO le
//     foto vere con la ✕ bianca, le due pillole "Scatta / Galleria" (PC:
//     "Scegli dal dispositivo"), l'incoraggiamento con l'ANELLO che si
//     riempie (1/4, 2/4…), il bottone
//   Niente riquadri tratteggiati, niente posti vuoti, niente foglietto.
// Le uniche differenze tra i flussi sono decise da Davide (ARCHITETTURA,
// regola d'oro 29): in valutazione le foto sono OBBLIGATORIE (`minime`),
// il bottone resta spento finché non ci sono; in demolizione si può
// continuare anche senza.
// ============================================================

import { useRef } from 'react'

const CONSIGLIATE = 4

const IconaCamera = ({ colore = '#1D4ED8', misura = 16 }: { colore?: string; misura?: number }) => (
  <svg width={misura} height={misura} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
)
const IconaGalleria = ({ colore = '#1D4ED8', misura = 16 }: { colore?: string; misura?: number }) => (
  <svg width={misura} height={misura} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
)
const IconaDispositivo = ({ colore = '#1D4ED8', misura = 16 }: { colore?: string; misura?: number }) => (
  <svg width={misura} height={misura} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
)

// La riga iniziale (quadrotto sfumato + freccia nel tondino)
function RigaScelta({ icona, titolo, sotto, onClick, classe = '' }: { icona: React.ReactNode; titolo: string; sotto: string; onClick: () => void; classe?: string }) {
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50/40 active:scale-[0.995] ${classe}`} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: 14, boxShadow: '0 2px 6px rgba(15,27,51,0.05)' }}>
      <span className="flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#DBEAFE,#EFF6FF)' }}>{icona}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[14px] text-gray-900">{titolo}</span>
        <span className="block text-[12px] text-gray-500 mt-0.5">{sotto}</span>
      </span>
      <span className="flex items-center justify-center flex-shrink-0 font-bold" style={{ width: 26, height: 26, borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8' }}>›</span>
    </button>
  )
}
// La pillola per aggiungere (icona nel tondino azzurro)
function PillolaAggiungi({ icona, testo, onClick, classe = '' }: { icona: React.ReactNode; testo: string; onClick: () => void; classe?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 transition-all hover:border-blue-300 active:scale-[0.99] ${classe}`} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 999, padding: '9px 12px 9px 9px', fontSize: 13, fontWeight: 700, color: '#1F2937', boxShadow: '0 2px 6px rgba(15,27,51,0.05)', cursor: 'pointer' }}>
      <span className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 999, background: '#EFF6FF' }}>{icona}</span>{testo}
    </button>
  )
}

export function StepFoto({ foto, onAggiungi, onRimuovi, onContinua, minime = 0, perChi = 'il demolitore' }: {
  foto: File[]
  onAggiungi: (nuove: File[]) => void
  onRimuovi: (indice: number) => void
  onContinua: () => void
  minime?: number            // valutazione: 4 → senza non si continua
  perChi?: string            // chi guarda le foto, per i testi
}) {
  const refCamera = useRef<HTMLInputElement>(null)
  const refGalleria = useRef<HTMLInputElement>(null)
  const n = foto.length
  const ok = n >= CONSIGLIATE
  const mancano = Math.max(0, CONSIGLIATE - n)
  const bloccato = minime > 0 && n < minime

  function apriCamera() { refCamera.current?.click() }
  function apriGalleria() { refGalleria.current?.click() }

  function presi(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length) onAggiungi(Array.from(e.target.files))
    e.target.value = ''
  }

  const avviso = (
    <div className="flex items-start gap-2 bg-blue-50/60 border-l-[3px] border-blue-500 rounded-r-md py-2.5 px-3 text-sm text-blue-800 mb-4">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
      <span className="text-xs leading-relaxed">Frontale, posteriore, laterali e abitacolo. Non serve che siano perfette.</span>
    </div>
  )


  const testoBottone = bloccato
    ? 'Continua'
    : n === 0 ? 'Continua senza foto, le aggiungo dopo'
      : ok ? `Continua con ${n} foto` : `Continua comunque con ${n} foto`

  return (
    <div>
      {avviso}
      <input ref={refCamera} type="file" accept="image/*" capture="environment" multiple onChange={presi} className="hidden" />
      <input ref={refGalleria} type="file" accept="image/*" multiple onChange={presi} className="hidden" />

      {n === 0 ? (
        <div className="flex flex-col gap-2">
          {/* telefono: fotocamera o galleria · PC: una riga sola */}
          <RigaScelta icona={<IconaCamera misura={20} />} titolo="Scatta una foto" sotto="Apre la fotocamera" onClick={apriCamera} classe="sm:hidden" />
          <RigaScelta icona={<IconaGalleria misura={20} />} titolo="Carica dalla galleria" sotto="Le foto del telefono" onClick={apriGalleria} classe="sm:hidden" />
          <RigaScelta icona={<IconaDispositivo misura={20} />} titolo="Scegli le foto dal dispositivo" sotto="Anche più di una insieme" onClick={apriGalleria} classe="hidden sm:flex" />
          {minime > 0 && <p className="text-[12.5px] text-gray-500 mt-1 px-1">Ne servono almeno {minime}: senza non riusciamo a valutare.</p>}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[14px] font-bold text-gray-900">{n} {n === 1 ? 'foto caricata' : 'foto caricate'}</span>
            <span className="text-[11.5px] font-bold rounded-full px-2.5 py-1" style={{ background: ok ? '#DCF3E4' : '#EFF6FF', color: ok ? '#1F7A43' : '#1D4ED8' }}>{ok ? '✓ Pronte' : `consigliate ${CONSIGLIATE}`}</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {foto.map((f, i) => (
              <div key={i} className="relative overflow-hidden" style={{ aspectRatio: '1', borderRadius: 14, background: '#E5E9F0', boxShadow: '0 2px 8px rgba(15,27,51,0.10)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => onRimuovi(i)} aria-label="Rimuovi foto" className="absolute flex items-center justify-center transition-opacity hover:opacity-80" style={{ top: 6, right: 6, width: 24, height: 24, borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', border: 'none', cursor: 'pointer' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <PillolaAggiungi icona={<IconaCamera />} testo="Scatta" onClick={apriCamera} classe="sm:hidden" />
            <PillolaAggiungi icona={<IconaGalleria />} testo="Galleria" onClick={apriGalleria} classe="sm:hidden" />
            <PillolaAggiungi icona={<IconaDispositivo />} testo="Scegli dal dispositivo" onClick={apriGalleria} classe="hidden sm:flex" />
          </div>

          {/* l'incoraggiamento con l'anello che si riempie */}
          <div className="flex items-center gap-2.5 mt-3" style={{ background: ok ? '#DCF3E4' : '#EFF6FF', border: `1.5px solid ${ok ? '#B7E4C7' : '#BFDBFE'}`, borderRadius: 14, padding: '11px 12px', fontSize: 12.5, color: ok ? '#1F7A43' : '#1E3A8A', lineHeight: 1.5 }}>
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, borderRadius: 999, background: ok ? `conic-gradient(#16A34A 100%, #B7E4C7 0)` : `conic-gradient(#2563eb ${Math.min(n, CONSIGLIATE) * 25}%, #DBEAFE 0)` }}>
              <span className="flex items-center justify-center font-extrabold" style={{ width: 28, height: 28, borderRadius: 999, background: ok ? '#DCF3E4' : '#EFF6FF', fontSize: 11, color: ok ? '#1F7A43' : '#1D4ED8' }}>{ok ? n : `${n}/${CONSIGLIATE}`}</span>
            </span>
            <span>
              {ok
                ? <><strong>Perfetto!</strong> Un buon numero di foto. Puoi continuare o aggiungerne ancora.</>
                : <><strong>Ottimo inizio!</strong> Aggiungi almeno {mancano} {mancano === 1 ? 'altra foto' : 'altre foto'}: frontale, posteriore, laterali, abitacolo. Aiutano {perChi} a capire meglio.</>}
            </span>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onContinua}
        className={`btn-pagina mt-4${bloccato ? ' btn-pagina--spento' : ''}`}
        style={!bloccato && !ok ? { background: '#fff', color: '#1D4ED8', border: '1.5px solid #BFDBFE', boxShadow: 'none' } : undefined}
      >
        {testoBottone}
      </button>
    </div>
  )
}
