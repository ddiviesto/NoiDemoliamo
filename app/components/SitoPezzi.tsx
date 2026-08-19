// ============================================================
// PEZZI COMUNI DEL SITO PUBBLICO (vetrina)
// Li usano la home a due porte, /demolizione e /valutazione.
// ⭐ 17/08 (struttura A approvata da Davide sul mockup): la home
// fa SOLO scegliere il servizio, ogni finestra apre la sua pagina.
// ============================================================

import Link from 'next/link'

// Dove portano i due servizi.
export const LINK_DEMOLIZIONE = '/inizia'
// ⚠️ Il flusso della valutazione (/vendi-auto, flusso D) non esiste ancora:
// per ora il bottone apre WhatsApp col messaggio già scritto, così i contatti
// arrivano lo stesso. Quando il flusso ci sarà, si cambia SOLO questa riga.
export const LINK_VALUTAZIONE =
  'https://wa.me/393518280493?text=' +
  encodeURIComponent('Ciao, vorrei sapere quanto vale la mia auto prima di rottamarla.')

export const WHATSAPP_NUMERO = '351 828 0493'

// ---------- spunta verde ----------
export function Spunta({ size = 16, colore = '#1F7A43' }: { size?: number; colore?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// ⚠️ 17/08 (Davide): NIENTE FRECCE sui bottoni. Il bottone dice dove porta
// con le parole, l'iconcina in coda è stata tolta ovunque.

// ---------- orologio delle pilloline "tempo" ----------
function Orologio({ colore }: { colore: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}

// ---------- bottone blu di pagina ----------
export function BottoneBlu({ href, children, esterno }: { href: string; children: React.ReactNode; esterno?: boolean }) {
  const stile: React.CSSProperties = {
    background: 'linear-gradient(90deg, #1d4ed8, #2563eb)',
    color: '#fff', fontSize: 16, fontWeight: 700, padding: '17px 30px',
    borderRadius: 999, boxShadow: '0 8px 22px rgba(37,99,235,0.34)', lineHeight: 1.2,
  }
  const classi = 'inline-flex items-center justify-center gap-2.5 w-full sm:w-auto transition-all hover:brightness-105 active:scale-[0.99]'
  if (esterno) return <a href={href} target="_blank" rel="noopener" className={classi} style={stile}>{children}</a>
  return <Link href={href} className={classi} style={stile}>{children}</Link>
}

// ---------- riga sotto il bottone ----------
export function SottoCta({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center sm:justify-start gap-2" style={{ fontSize: 12.5, color: '#6B7280', marginTop: 13 }}>
      <Spunta size={15} />{children}
    </p>
  )
}

// ---------- testata di sezione ----------
export function TestaSezione({ occhiello, titolo, testo }: { occhiello: string; titolo: string; testo?: string }) {
  return (
    <div className="text-center mx-auto" style={{ maxWidth: 620, marginBottom: 34 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#1D4ED8' }}>{occhiello}</div>
      <h2 className="text-[22px] sm:text-[27px]" style={{ fontWeight: 700, color: '#0F1B33', letterSpacing: '-0.5px', marginTop: 8, lineHeight: 1.22 }}>{titolo}</h2>
      {testo && <p style={{ fontSize: 15, color: '#5B6779', lineHeight: 1.62, marginTop: 11 }}>{testo}</p>}
    </div>
  )
}

// ---------- card di un passo ("Come funziona") ----------
export function Passo({ numero, titolo, testo, tempo, traguardo }: { numero: number; titolo: string; testo: string; tempo?: string; traguardo?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #E5E9F0', borderRadius: 16, padding: '19px 17px' }}>
      <div className="flex items-center justify-center" style={{ width: 29, height: 29, borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{numero}</div>
      <b style={{ fontSize: 14.5, fontWeight: 700, color: '#0F1B33', display: 'block', marginBottom: 6 }}>{titolo}</b>
      <p style={{ fontSize: 13.5, color: '#5B6779', lineHeight: 1.58 }}>{testo}</p>
      {tempo && (
        <div className="inline-flex items-center gap-1.5" style={{ marginTop: 11, background: traguardo ? '#DCF3E4' : '#EFF6FF', color: traguardo ? '#1F7A43' : '#1D4ED8', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999 }}>
          {traguardo ? <Spunta size={13} /> : <Orologio colore="#1D4ED8" />}
          {tempo}
        </div>
      )}
    </div>
  )
}

// ---------- card di una situazione particolare ----------
export function Caso({ icona, titolo, testo }: { icona: React.ReactNode; titolo: string; testo: string }) {
  return (
    <div className="flex items-start gap-3" style={{ background: '#fff', border: '1.5px solid #E5E9F0', borderRadius: 14, padding: '16px 17px' }}>
      <span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: '#EFF6FF', flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icona}</svg>
      </span>
      <div>
        <b style={{ fontSize: 14, fontWeight: 700, color: '#0F1B33', display: 'block', marginBottom: 5 }}>{titolo}</b>
        <p style={{ fontSize: 13, color: '#5B6779', lineHeight: 1.55 }}>{testo}</p>
      </div>
    </div>
  )
}

// ---------- domanda a tendina ----------
export function Domanda({ domanda, risposta, aperta }: { domanda: string; risposta: string; aperta?: boolean }) {
  return (
    <details open={aperta} style={{ background: '#fff', border: '1.5px solid #E5E9F0', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <summary className="flex items-center justify-between gap-3.5 cursor-pointer" style={{ padding: '16px 19px', fontSize: 15, fontWeight: 600, color: '#1F2937' }}>
        {domanda}
        <span className="piu flex items-center justify-center transition-transform" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', fontSize: 15, fontWeight: 700 }}>+</span>
      </summary>
      <p style={{ padding: '0 19px 17px', fontSize: 14, color: '#5B6779', lineHeight: 1.68 }}>{risposta}</p>
    </details>
  )
}

// ---------- chiusura blu di fine pagina ----------
export function Chiusura({ titolo, testo, bottone, href, esterno, coda }: { titolo: string; testo: string; bottone: string; href: string; esterno?: boolean; coda?: React.ReactNode }) {
  const stile: React.CSSProperties = { background: '#fff', color: '#1D4ED8', fontSize: 16, fontWeight: 700, padding: '16px 30px', borderRadius: 999, boxShadow: '0 10px 26px rgba(8,25,64,0.28)', lineHeight: 1.2 }
  const classi = 'inline-flex items-center justify-center gap-2.5 w-full sm:w-auto transition-all hover:brightness-105 active:scale-[0.99]'
  return (
    <div className="text-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', padding: '58px 0' }}>
      <div className="mx-auto px-5" style={{ maxWidth: 1080 }}>
        <h2 className="text-[22px] sm:text-[27px]" style={{ fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.22 }}>{titolo}</h2>
        <p className="mx-auto" style={{ fontSize: 15.5, color: '#D7E4FF', margin: '13px auto 24px', maxWidth: 500, lineHeight: 1.6 }}>{testo}</p>
        {esterno
          ? <a href={href} target="_blank" rel="noopener" className={classi} style={stile}>{bottone}</a>
          : <Link href={href} className={classi} style={stile}>{bottone}</Link>}
        {coda && <div style={{ marginTop: 15, fontSize: 12.5, color: '#C7DBFF' }}>{coda}</div>}
      </div>
    </div>
  )
}
