import TornaIndietro from '../components/TornaIndietro'

/**
 * INFORMATIVA PRIVACY — bozza operativa.
 * I punti [DA COMPLETARE] vanno riempiti con i dati aziendali di Davide
 * prima della pubblicità del servizio. Testo da far rivedere per la
 * conformità finale.
 */

export const metadata = { title: 'Informativa privacy — NoiDemoliamo' }

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[15px] font-bold text-gray-900 mb-2">{titolo}</h2>
      <div className="text-[13.5px] text-gray-600 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <main className="min-h-screen flex justify-center p-4 pt-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg overflow-hidden" style={{ alignSelf: 'flex-start' }}>
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <TornaIndietro />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight">Informativa privacy</div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs text-gray-400 mb-6">Ultimo aggiornamento: luglio 2026</p>

          <Sezione titolo="1. Titolare del trattamento">
            <p>
              Il titolare del trattamento dei dati è <b>[DA COMPLETARE: ragione sociale]</b>,
              P.IVA <b>[DA COMPLETARE]</b>, con sede in <b>[DA COMPLETARE: indirizzo]</b>.
              Per qualsiasi richiesta sulla privacy puoi scrivere a <b>[DA COMPLETARE: email di contatto]</b>.
            </p>
          </Sezione>

          <Sezione titolo="2. Quali dati raccogliamo">
            <p>Per gestire la tua richiesta di demolizione raccogliamo solo i dati necessari:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><b>Dati di contatto</b>: nome e cognome, telefono, email.</li>
              <li><b>Dati del veicolo</b>: tipo di mezzo, marca, modello, anno, chilometri, targa, condizioni e foto.</li>
              <li><b>Dati per la pratica</b>: codice fiscale (o partita IVA) dell&apos;intestatario, indirizzo dove si trova il veicolo, informazioni sulla proprietà (es. eredità, società).</li>
              <li><b>Documenti caricati da te</b>: libretto di circolazione, certificato di proprietà, documento d&apos;identità e gli altri documenti richiesti dalla tua casistica.</li>
              <li><b>Dati dell&apos;account</b>: email e password (la password è conservata in forma cifrata, non possiamo leggerla).</li>
            </ul>
          </Sezione>

          <Sezione titolo="3. Perché li usiamo">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Gestire la tua pratica di demolizione dall&apos;inizio alla fine (base giuridica: esecuzione del servizio che ci hai richiesto).</li>
              <li>Coordinare il ritiro del veicolo con il centro di demolizione autorizzato.</li>
              <li>Adempiere agli obblighi di legge legati alla radiazione del veicolo al PRA.</li>
              <li>Inviarti comunicazioni di servizio sulla tua pratica (mai marketing senza il tuo consenso).</li>
            </ul>
          </Sezione>

          <Sezione titolo="4. Con chi li condividiamo">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><b>Il centro di demolizione autorizzato</b> assegnato alla tua pratica: riceve solo i dati necessari al ritiro e alla pratica (contatti, indirizzo, dati del veicolo, documenti approvati).</li>
              <li><b>Fornitori tecnici</b> che ospitano i nostri sistemi (hosting del sito e del database, servizi di mappa per l&apos;indirizzo di ritiro). Trattano i dati solo per nostro conto.</li>
              <li><b>Autorità e enti pubblici</b> quando richiesto dalla legge (es. pratiche PRA).</li>
            </ul>
            <p>Non vendiamo i tuoi dati a nessuno e non li usiamo per pubblicità di terzi.</p>
          </Sezione>

          <Sezione titolo="5. Per quanto li conserviamo">
            <p>
              Conserviamo i dati per il tempo necessario a completare la pratica e, dopo, per il periodo
              richiesto dagli obblighi di legge (fiscali e documentali). Puoi chiedere in ogni momento la
              cancellazione di ciò che non siamo obbligati a conservare.
            </p>
          </Sezione>

          <Sezione titolo="6. I tuoi diritti">
            <p>
              In qualsiasi momento puoi chiederci: accesso ai tuoi dati, correzione, cancellazione,
              limitazione del trattamento, portabilità, oppure opporti al trattamento. Basta scrivere a
              <b> [DA COMPLETARE: email di contatto]</b>. Hai anche il diritto di presentare reclamo al
              Garante per la protezione dei dati personali.
            </p>
          </Sezione>

          <Sezione titolo="7. Sicurezza">
            <p>
              I dati e i documenti sono conservati su sistemi protetti, con accessi riservati: i documenti
              della tua pratica sono visibili solo a te, a NoiDemoliamo e al demolitore assegnato.
            </p>
          </Sezione>

          <p className="text-xs text-gray-400 mt-8">
            Questa informativa può essere aggiornata: la versione pubblicata su questa pagina è sempre quella vigente.
          </p>
        </div>
      </div>
    </main>
  )
}
