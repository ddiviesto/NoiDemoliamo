'use client'

// ============================================================
// I PEZZI DELLA TENDINA (⭐ 19/11, Davide: "i dati devono rimanere negli
// stessi posti" in demolizione e in valutazione).
// Le schede a righe (Cliente, Casistiche, Veicolo, Ritiro…), le pillole
// delle condizioni, la nota del cliente e le parole delle etichette
// stanno QUI, in un posto solo: le usano la lista delle pratiche
// (/admin) e quella delle richieste di valutazione (/admin/valutazioni).
// Se si cambia qui, cambia in tutte e due.
// ============================================================

export const FERMO_LABEL: Record<string, string> = { si: 'Sì', no: 'No', non_so: 'Da verificare' }

export function etichettaTarghe(v: boolean | null | undefined): string {
  return v == null ? '—' : v ? 'Presenti sul mezzo' : 'Smarrite o rubate'
}
export function etichettaCambio(v: string | null | undefined): string {
  return v === 'manuale' ? 'Manuale' : v === 'automatico' ? 'Automatico' : v === 'non_so' ? 'Non lo sa' : '—'
}

// L'indirizzo su due righe pulite: via e civico, poi CAP e comune
export function indirizzoRitiroCompleto(p: { indirizzo_ritiro: string | null; comune_ritiro: string | null; provincia_ritiro: string | null; cap_ritiro: string | null }) {
  const intero = (p.indirizzo_ritiro || '').trim()
  const daCampi = [p.cap_ritiro, p.comune_ritiro ? `${p.comune_ritiro}${p.provincia_ritiro ? ` (${p.provincia_ritiro})` : ''}` : ''].filter(Boolean).join(' ')

  // Dove spezzare la prima riga (via e civico)? 1° tentativo: al CAP.
  // ⭐ 06/08 (doppioni trovati da Davide): 2° tentativo alla ", comune"
  // (gli indirizzi Google SENZA civico spesso non hanno il CAP).
  let taglio = intero.search(/,?\s*\d{5}\b/)
  if (taglio < 0 && p.comune_ritiro) {
    const idx = intero.toLowerCase().indexOf(`, ${p.comune_ritiro.toLowerCase()}`)
    if (idx >= 0) taglio = idx
  }
  let viaCivico: string
  let coda = ''
  if (taglio >= 0) {
    viaCivico = intero.slice(0, taglio).trim().replace(/,$/, '')
    coda = intero.slice(taglio).replace(/^,?\s*/, '')
  } else {
    viaCivico = intero.replace(/,$/, '')
  }

  // Rete di sicurezza anti-doppione: se il comune è già scritto nella
  // prima riga, la seconda non si stampa proprio
  const comuneGiaDentro = !!p.comune_ritiro && viaCivico.toLowerCase().includes(p.comune_ritiro.toLowerCase())
  const secondaRiga = comuneGiaDentro ? '' : (daCampi || coda)
  const righe = [viaCivico, secondaRiga].filter(Boolean)
  return righe.length ? righe.join('\n') : '—'
}

export function PillCond({ buono, children }: { buono: boolean; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', background: buono ? '#EAF3DE' : '#FBE2E2', color: buono ? '#27500A' : '#9B1C1C', fontSize: 9.5, fontWeight: 600, borderRadius: 20, padding: '2px 8px', margin: '3px 3px 0 0' }}>{children}</span>
  )
}

/** Le quattro pillole delle condizioni del mezzo, in lettura (verde = buono) */
export function PillCondizioni({ v }: { v: { incidentato: boolean | null; va_in_moto: boolean | null; marciante: boolean | null; parti_mancanti: boolean | null } }) {
  return (
    <>
      {v.incidentato != null && <PillCond buono={!v.incidentato}>{v.incidentato ? 'Incidentata' : 'Non incidentata'}</PillCond>}
      {v.va_in_moto != null && <PillCond buono={v.va_in_moto}>{v.va_in_moto ? 'Si avvia' : 'Non si avvia'}</PillCond>}
      {v.marciante != null && <PillCond buono={v.marciante}>{v.marciante ? 'Cammina' : 'Non cammina'}</PillCond>}
      {v.parti_mancanti != null && <PillCond buono={!v.parti_mancanti}>{v.parti_mancanti ? 'Parti mancanti' : 'Completo'}</PillCond>}
    </>
  )
}

/** ⭐ 28/07 sera (mockup B): le NOTE del cliente sul veicolo in un blocchetto
 *  celeste, solo quando esistono */
export function NotaClienteVeicolo({ testo }: { testo: string | null | undefined }) {
  if (!testo) return null
  return (
    <div style={{ marginTop: 10, background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#1D4ED8', textTransform: 'uppercase', marginBottom: 3 }}>Nota cliente sul veicolo</div>
      <div style={{ fontSize: 11.5, color: '#1E3A5F', lineHeight: 1.5 }}>{testo}</div>
    </div>
  )
}

// La scheda a righe con la matita (modifica sul posto, 27/07)
export function SezTendinaMod({ titolo, inEdit = false, salvando = false, errore, onMatita, onAnnulla, onSalva, righe, extra, avviso, soloLettura }: {
  titolo: string
  inEdit?: boolean
  salvando?: boolean
  errore?: string | null
  onMatita?: () => void
  onAnnulla?: () => void
  onSalva?: () => void
  // ⭐ 19/11: la scheda delle richieste di valutazione è la stessa, per ora
  // senza matita (la modifica sul posto arriva dopo)
  soloLettura?: boolean
  // ⭐ 28/07 sera (mockup Pillola 1): `pillola` = valore evidenziato nella
  // pillolina celeste di famiglia (dati operativi chiave: delegato, fermo,
  // targhe, spazio carro). Il trattino dei valori mancanti resta grigio.
  // `multiriga` = il valore sta su più righe (es. indirizzo di ritiro:
  // via+civico, poi CAP e comune) — etichetta e valore restano in parallelo
  righe: { k: string; vista: string; campo?: React.ReactNode; pillola?: boolean; multiriga?: boolean }[]
  extra?: React.ReactNode
  // ⭐ 27/07 (variante B su mockup): avviso blu tenue sotto la testata
  // (es. le risposte "critiche" del modulo nella scheda Casistiche)
  avviso?: React.ReactNode
}) {
  const fade = (visibile: boolean): React.CSSProperties => ({
    opacity: visibile ? 1 : 0,
    pointerEvents: visibile ? 'auto' : 'none',
    transition: 'opacity .18s ease',
  })
  return (
    <div style={{ flex: 1, minWidth: 215, background: '#fff', border: `1.5px solid ${inEdit ? '#93C5FD' : '#E5E7EB'}`, borderRadius: 12, padding: '11px 13px', transition: 'border-color .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0F1B33', flex: 1, minWidth: 0 }}>
          <span style={{ width: 3, height: 13, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          {titolo}
        </span>
        {/* Matita ↔ Annulla · Salva: larghezza riservata, dissolvenza */}
        {!soloLettura && (
        <span style={{ position: 'relative', width: 98, height: 22, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end', ...fade(!inEdit) }}>
            <button onClick={onMatita} aria-label={`Modifica ${titolo}`} className="flex items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-200" style={{ width: 22, height: 22, borderRadius: 7, border: '1.5px solid #E5E7EB', background: '#fff', color: '#1D4ED8', cursor: 'pointer' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            </button>
          </span>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center', ...fade(inEdit) }}>
            <button onClick={onAnnulla} disabled={salvando} className="disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}>Annulla</button>
            <button onClick={onSalva} disabled={salvando} className="transition-colors hover:bg-blue-700 disabled:opacity-50" style={{ background: '#2563EB', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 11px', cursor: 'pointer' }}>{salvando ? '…' : 'Salva'}</button>
          </span>
        </span>
        )}
      </div>
      {avviso}
      {righe.map((r, i) => r.multiriga ? (
        // ⭐ 28/07 sera: riga MULTIRIGA — etichetta sopra, valore sotto
        // ALLINEATO A SINISTRA su più righe pulite (via+civico, poi
        // cap/comune: le righe le decide `vista` coi suoi a-capo)
        // Etichetta a sinistra e valore a destra IN PARALLELO come le altre
        // righe: solo che qui il valore sta su due righe (via+civico, poi
        // CAP e comune) e la riga si alza di conseguenza
        <div key={r.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, minHeight: 27, padding: '5px 0', borderBottom: i === righe.length - 1 && !extra ? 'none' : '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.k}</span>
          {inEdit && r.campo ? (
            <span style={{ flex: 1, minWidth: 0 }}>{r.campo}</span>
          ) : (
            <span style={{ flex: 1, minWidth: 0, color: '#6B7280', lineHeight: 1.5, whiteSpace: 'pre-line', textAlign: 'right' }}>{r.vista}</span>
          )}
        </div>
      ) : (
        <div key={r.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 27, borderBottom: i === righe.length - 1 && !extra ? 'none' : '1px solid #F5F7FA', fontSize: 11.5 }}>
          <span style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.k}</span>
          <span style={{ position: 'relative', flex: 1, minWidth: 0, height: 22 }}>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...fade(!inEdit || !r.campo) }} title={r.vista}>
              {r.pillola && r.vista !== '—' && r.vista !== '…' ? (
                <span style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1D4ED8', fontWeight: 600, fontSize: 10.5, borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.vista}</span>
              ) : r.vista}
            </span>
            {r.campo && (
              <span style={{ position: 'absolute', inset: 0, ...fade(inEdit) }}>{r.campo}</span>
            )}
          </span>
        </div>
      ))}
      {inEdit && errore && <div style={{ fontSize: 10.5, color: '#DC2626', marginTop: 6 }}>{errore}</div>}
      {extra}
    </div>
  )
}
