// ============================================================
// HOME PUBBLICA — LA PAGINA INTERA, VESTE "ISOLA GALLEGGIANTE"
// ⭐ Struttura A (17/08): la home fa SCEGLIERE con due porte.
// ⭐ Restyling 18/08 (mockup "isola galleggiante", pagina intera n.3):
// barra a pillola di vetro, titolone con la seconda riga in sfumatura,
// due porte, poi la pagina RACCONTA: come funziona in 4 passi, perché è
// gratis con la lista degli 0 €, le domande frequenti. Si chiude in
// punta di piedi (piede discreto, niente fascia scura).
// ⭐ LA SFUMATURA CORRE PER TUTTA LA PAGINA (Davide: sopra c'è, sotto no):
// gli aloni sono sparsi anche in basso e le sezioni non sono bianche
// piene ma pannelli di vetro, così lo sfondo si vede sempre.
// ============================================================

import Link from 'next/link'
import type { Metadata } from 'next'
import AiutoWhatsApp from './components/AiutoWhatsApp'
import SitoBarra from './components/SitoBarra'
import SitoPiede from './components/SitoPiede'
import { Spunta } from './components/SitoPezzi'

export const metadata: Metadata = {
  title: 'NoiDemoliamo — Demolizione auto gratuita in tutta Italia',
  description:
    'Demolizione auto gratuita con ritiro a domicilio, certificato di rottamazione e radiazione PRA inclusi. Oppure scopri gratis quanto vale la tua auto prima di rottamarla.',
}

// ---------- una delle due porte ----------
// ⚠️ 18/08: le pagine /demolizione e /valutazione sono state cancellate
// (si finisce prima la home): la porta blu porta dritta al modulo e
// quella chiara apre WhatsApp. Bastano due indirizzi da cambiare.
function Porta({ href, esterno, forte, icona, titolo, pillola, testo, punti, bottone }: {
  href: string; esterno?: boolean; forte?: boolean; icona: React.ReactNode; titolo: string
  pillola: string; testo: string; punti: string[]; bottone: string
}) {
  const Contenitore = esterno ? 'a' : Link
  const attributi = esterno ? { href, target: '_blank', rel: 'noopener' } : { href }
  return (
    <Contenitore
      {...attributi}
      className="sito-finestra flex-1 flex flex-col transition-all"
      style={forte
        ? {
            borderRadius: 26, padding: 28, color: '#fff',
            background: 'linear-gradient(150deg, #1B2E6B 0%, #2563eb 100%)',
            boxShadow: '0 22px 58px rgba(37,99,235,0.34)',
          }
        : {
            borderRadius: 26, padding: 28,
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(226,232,245,0.9)',
            boxShadow: '0 18px 50px rgba(15,27,51,0.09)',
          }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 52, height: 52, borderRadius: 17, marginBottom: 18,
          background: forte ? 'rgba(255,255,255,0.16)' : '#EEF4FF',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={forte ? '#fff' : '#1D4ED8'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icona}</svg>
      </span>

      <h2 style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-0.8px', color: forte ? '#fff' : '#0F1B33' }}>{titolo}</h2>
      <span className="inline-flex self-start" style={{
        marginTop: 10, fontSize: 11.5, fontWeight: 600, padding: '5px 12px', borderRadius: 999,
        background: forte ? 'rgba(255,255,255,0.92)' : '#DCF3E4', color: forte ? '#16653C' : '#1F7A43',
      }}>{pillola}</span>
      <p style={{ fontSize: 15, lineHeight: 1.62, margin: '14px 0 16px', color: forte ? '#CFDDFF' : '#5B6779' }}>{testo}</p>

      <ul style={{ marginBottom: 22 }}>
        {punti.map((p) => (
          <li key={p} className="flex items-start gap-2.5" style={{ fontSize: 14, padding: '6px 0', color: forte ? '#E8EFFF' : '#374151' }}>
            <span style={{ marginTop: 3 }}><Spunta size={17} colore={forte ? '#8FE3B0' : '#1F7A43'} /></span>{p}
          </li>
        ))}
      </ul>

      <div
        className="mt-auto flex items-center justify-center"
        style={forte
          ? { fontSize: 15, fontWeight: 700, padding: '16px 22px', borderRadius: 999, background: '#fff', color: '#1B2E6B' }
          : { fontSize: 15, fontWeight: 700, padding: '16px 22px', borderRadius: 999, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', color: '#fff', boxShadow: '0 10px 24px rgba(37,99,235,0.3)' }}
      >
        {bottone}
      </div>
    </Contenitore>
  )
}

// ---------- testata di sezione ----------
function TestaSezione({ occhiello, titolo, testo }: { occhiello: string; titolo: string; testo?: string }) {
  return (
    <div className="text-center mx-auto" style={{ maxWidth: 640, marginBottom: 34 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#2563eb' }}>{occhiello}</div>
      <h2 style={{ fontSize: 'clamp(23px, 3.2vw, 32px)', fontWeight: 700, letterSpacing: '-1px', marginTop: 8, lineHeight: 1.16, color: '#0F1B33' }}>{titolo}</h2>
      {testo && <p style={{ fontSize: 15.5, color: '#5B6779', lineHeight: 1.62, marginTop: 12 }}>{testo}</p>}
    </div>
  )
}

// ---------- card di un passo ----------
// ⭐ 18/08 (Davide: "mi allinei le pillole?"): card ad altezza piena e
// pillolina del tempo spinta in fondo, così stanno tutte sulla stessa riga
// anche se i testi sopra sono di lunghezze diverse.
function Passo({ numero, titolo, testo, tempo }: { numero: number; titolo: string; testo: string; tempo: string }) {
  return (
    <div className="h-full flex flex-col" style={{
      background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(231,235,243,0.9)', borderRadius: 20, padding: '22px 20px',
    }}>
      <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: '#EEF4FF', color: '#2563eb', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{numero}</div>
      <b style={{ fontSize: 16.5, display: 'block', marginBottom: 8, color: '#0F1B33' }}>{titolo}</b>
      <p style={{ fontSize: 14.5, color: '#5B6779', lineHeight: 1.6, marginBottom: 16 }}>{testo}</p>
      {/* ⭐ 18/08 (Davide): FULMINE PIENO. Provati prima l'orologio a linee e
          il cronometro pieno: a quella misura i tratti fini e la lancetta
          ritagliata sembravano sgranati. Il fulmine è una massa unica, quindi
          resta pulito anche piccolo. */}
      <div className="inline-flex items-center gap-1.5 self-start" style={{ marginTop: 'auto', background: '#EEF4FF', color: '#2563eb', fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#2563eb" style={{ flexShrink: 0, marginLeft: -1 }}>
          <path d="M13.5 2 4 13.6h6.1L9.5 22 20 10.2h-6.4z" />
        </svg>
        {tempo}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="flex-1" style={{
      // ⭐ 18/08 (tinta 3 scelta da Davide): base LILLA CHIARA come l'aria del
      // flusso /inizia, con tre aloni sopra (azzurro in alto, viola a destra,
      // lilla più carico in basso). Prima era quasi bianca e il fondo pagina
      // "spariva".
      background: `radial-gradient(1000px 520px at 15% 2%, #E4ECFF 0%, rgba(228,236,255,0) 60%),
                   radial-gradient(900px 520px at 88% 30%, #E9E3FF 0%, rgba(233,227,255,0) 62%),
                   radial-gradient(900px 560px at 30% 92%, #DED6FB 0%, rgba(222,214,251,0) 66%),
                   #F5F3FE`,
    }}>
      <div className="mx-auto px-[22px]" style={{ maxWidth: 1160 }}>
        <SitoBarra />

        {/* ---------- la scena ---------- */}
        <div className="text-center" style={{ padding: '78px 0 42px' }}>
          <h1 style={{ fontSize: 'clamp(34px, 5.6vw, 62px)', lineHeight: 1.04, letterSpacing: '-2.2px', fontWeight: 700, margin: 0, color: '#0F1B33' }}>
            La tua auto da rottamare,<br />
            <span style={{
              background: 'linear-gradient(100deg, #2563eb, #7c3aed)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>ritirata e demolita gratis</span>
          </h1>
          <p className="mx-auto" style={{ fontSize: 17, color: '#5B6779', lineHeight: 1.6, maxWidth: 560, margin: '18px auto 0' }}>
            Pensiamo a tutto Noi: documenti, carro attrezzi e certificati. Oppure, se preferisci,
            prima ti diciamo quanto vale.
          </p>
        </div>

        {/* ---------- le due porte ---------- */}
        <div className="flex flex-col lg:flex-row gap-5 text-left">
          <Porta
            href="/inizia"
            forte
            titolo="Voglio rottamarla"
            pillola="Gratis, anche il ritiro"
            testo="La rottami e non ci pensi più: veniamo a prenderla a casa tua e ti mandiamo tutti i certificati."
            punti={[
              'Ritiro col carro attrezzi, anche se non parte',
              'Certificato di rottamazione e radiazione PRA',
              "Burocrazia gestita da Noi dall'inizio alla fine",
            ]}
            bottone="Vai alla demolizione gratuita"
            icona={<>
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" />
            </>}
          />
          <Porta
            href={'https://wa.me/393518280493?text=' + encodeURIComponent('Ciao, vorrei sapere quanto vale la mia auto prima di rottamarla.')}
            esterno
            titolo="Voglio sapere quanto vale"
            pillola="Valutazione gratuita"
            testo="Prima di rottamarla senti la cifra: se conviene venderla, l'acquirente lo troviamo Noi."
            punti={[
              'Ti chiamiamo Noi con una cifra vera',
              'Nessun impegno: decidi dopo aver sentito',
              'Se non conviene, la demoliamo gratis',
            ]}
            bottone="Chiedi la valutazione gratuita"
            icona={<>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <path d="M7 7h.01" />
            </>}
          />
        </div>

        {/* ---------- come funziona ---------- */}
        <section id="come-funziona" style={{ padding: '76px 0 10px' }}>
          {/* ⭐ 18/08 (versione B approvata da Davide): la promessa sta nel
              TITOLO e nei primi due passi. Regola data da Davide: MAI dire
              come funziona dentro (niente "il sistema", niente automatismi:
              è tecnologia che non si regala ai concorrenti) e MAI elencare
              le casistiche. Il messaggio è "tu compili, a tutto il resto
              pensiamo noi". */}
          <TestaSezione
            occhiello="Come funziona"
            titolo="Tu fai una cosa sola: compilare il modulo"
            testo="Il resto lo facciamo Noi, dalla prima carta al certificato finale."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ⭐ "Noi" con la maiuscola: è NoiDemoliamo che si prende la
                burocrazia, e la parola deve richiamare il marchio. */}
            <Passo numero={1} titolo="Compili il Modulo" tempo="circa 5 minuti"
              testo="Devi solo compilare il modulo, zero stress: non devi preoccuparti di nulla. A tutta la burocrazia ci pensiamo Noi, qualsiasi sia la tua situazione con il mezzo da demolire." />
            <Passo numero={2} titolo="Prepariamo le Carte" tempo="entro 1 ora"
              testo="Ti diciamo cosa serve nel tuo caso e ti mettiamo a disposizione i moduli già pronti da firmare. Tu carichi i documenti, li controlliamo Noi." />
            <Passo numero={3} titolo="Fissiamo il Giorno del Ritiro" tempo="entro 8 ore lavorative"
              testo="Una volta che la documentazione va bene, il Centro di Demolizione Autorizzato ti contatterà entro 8 ore lavorative per fissare data e ora del ritiro. Dovrai semplicemente consegnare la documentazione elencata nella tua Area Personale." />
            <Passo numero={4} titolo="Chiudiamo la Pratica" tempo="pratica chiusa"
              testo="Ritiriamo l'auto col carro attrezzi e ti consegniamo certificato di rottamazione e radiazione dal PRA." />
          </div>
        </section>

        {/* ---------- perché è gratis ---------- */}
        <section className="flex flex-col lg:flex-row items-center gap-9" style={{ padding: '66px 0 10px' }}>
          <div className="flex-1">
            {/* ⚠️ 18/08: l'occhiello NON deve ripetere il titolo ("Nessun costo"
                sopra "Zero Stress, Zero Costi" era un doppione). */}
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#2563eb' }}>La nostra missione</div>
            {/* ⚠️ REGOLA (Davide, 18/08): qui NON si spiega da dove arrivano i
                soldi e non si dice mai che il cliente deve portare il mezzo da
                qualche parte. Si parla solo del peso che gli togliamo. */}
            <h2 style={{ fontSize: 'clamp(23px, 3.2vw, 32px)', fontWeight: 700, letterSpacing: '-1px', marginTop: 8, lineHeight: 1.16, color: '#0F1B33' }}>
              Zero Stress, Zero Costi
            </h2>
            <p style={{ fontSize: 15, color: '#5B6779', lineHeight: 1.68, marginTop: 13 }}>
              Un veicolo da demolire è un peso: occupa spazio e spaventa per la burocrazia.
              NoiDemoliamo se ne fa carico dall&apos;inizio alla fine ed è attiva in tutta Italia.
              Tu compili il modulo, al resto pensiamo Noi.
            </p>

            <blockquote style={{ marginTop: 20, paddingLeft: 18, borderLeft: '3px solid #2563eb' }}>
              <p style={{ fontSize: 16.5, fontWeight: 600, color: '#1B2E6B', lineHeight: 1.5, letterSpacing: '-0.2px' }}>
                «Rendiamo semplice ciò che sembra complicato, alla portata di tutti.»
              </p>
            </blockquote>
          </div>

          <div className="w-full lg:flex-[0.85]" style={{
            background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(231,235,243,0.9)', borderRadius: 22, padding: '8px 22px',
          }}>
            {/* ⭐ 18/08 (ordine chiesto da Davide): la radiazione al PRA viene
                DOPO il certificato di rottamazione, ed è stata aggiunta la
                voce dei costi di burocrazia. */}
            {['Pratica di Demolizione', 'Ritiro col Carro Attrezzi', 'Costi di Burocrazia', 'Certificato di Rottamazione', 'Radiazione al PRA', 'Assistenza fino alla Chiusura'].map((v, i, tutte) => (
              <div key={v} className="flex items-center justify-between gap-3.5" style={{ padding: '15px 0', borderBottom: i === tutte.length - 1 ? 'none' : '1px solid #EEF1F6' }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: '#374151' }}>{v}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1F7A43', background: '#DCF3E4', padding: '5px 13px', borderRadius: 999, whiteSpace: 'nowrap' }}>0 €</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <SitoPiede />
      <AiutoWhatsApp />
    </main>
  )
}
