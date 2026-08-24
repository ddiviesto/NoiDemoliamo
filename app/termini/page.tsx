import TornaIndietro from '../components/TornaIndietro'

/**
 * TERMINI DI SERVIZIO — bozza operativa.
 * I punti [DA COMPLETARE] vanno riempiti con i dati aziendali di Davide.
 * Testo da far rivedere per la conformità finale.
 */

export const metadata = { title: 'Termini di servizio — NoiDemoliamo' }

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-[15px] font-bold text-gray-900 mb-2">{titolo}</h2>
      <div className="text-[13.5px] text-gray-600 leading-relaxed flex flex-col gap-2">{children}</div>
    </section>
  )
}

export default function Termini() {
  return (
    <main className="min-h-screen flex justify-center p-4 pt-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg overflow-hidden" style={{ alignSelf: 'flex-start' }}>
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <TornaIndietro />
          <div>
            <div className="marchio marchio--chiaro marchio--occhiello text-[10px]">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight">Termini di servizio</div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs text-gray-400 mb-6">Ultimo aggiornamento: luglio 2026</p>

          <Sezione titolo="1. Chi siamo e cosa facciamo">
            <p>
              NoiDemoliamo (<b>[DA COMPLETARE: ragione sociale]</b>, P.IVA <b>[DA COMPLETARE]</b>) è un servizio
              che organizza la demolizione di veicoli mettendo in contatto chi vuole rottamare un mezzo con
              centri di demolizione autorizzati, e seguendo la pratica dall&apos;inizio alla fine: raccolta
              documenti, ritiro a domicilio e certificati di rottamazione e radiazione PRA.
            </p>
          </Sezione>

          <Sezione titolo="2. Il servizio è gratuito per te">
            <p>
              Per il cliente privato la demolizione tramite NoiDemoliamo è <b>gratuita</b>: non ti chiediamo
              alcun pagamento per la richiesta, il ritiro a domicilio o i certificati.
            </p>
            <p className="mt-2">
              La gratuità presuppone che il veicolo sia <b>sostanzialmente completo</b>. Se mancano parti
              importanti (ad esempio motore, cambio, catalizzatore o altri componenti di valore), oppure in
              situazioni particolari (es. zone fuori copertura), il ritiro gratuito potrebbe non essere
              possibile: in questi casi <b>te lo comunichiamo subito</b>, prima di procedere, ed eventualmente
              ti proponiamo un <b>contributo</b> per il ritiro. Nulla ti viene mai richiesto senza il tuo
              <b> accordo esplicito</b>: sei sempre libero di accettare o rinunciare senza alcun costo.
            </p>
          </Sezione>

          <Sezione titolo="3. Cosa ti chiediamo">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Fornire <b>dati e documenti veritieri</b>: la pratica di demolizione è un atto con valore legale.</li>
              <li>Avere il <b>diritto di disporre del veicolo</b> (esserne intestatario, erede o rappresentante autorizzato, come dichiarato nel modulo).</li>
              <li>Consegnare al ritiro i <b>documenti originali</b> indicati nella tua area personale.</li>
              <li>Custodire le credenziali del tuo account: le azioni fatte con il tuo accesso si presumono tue.</li>
            </ul>
          </Sezione>

          <Sezione titolo="4. Come funziona la pratica">
            <p>
              Dopo la richiesta verifichiamo i documenti caricati e assegnamo la pratica a un centro di
              demolizione autorizzato, che concorda con te data e ora del ritiro. Al ritiro consegni il mezzo
              e i documenti originali; il certificato di rottamazione ti viene consegnato dal demolitore (a
              mano o nella tua area personale) e la pratica si conclude con il certificato di radiazione al PRA.
            </p>
          </Sezione>

          <Sezione titolo="5. Responsabilità">
            <p>
              NoiDemoliamo organizza e segue la pratica; la demolizione fisica del veicolo e l&apos;emissione dei
              certificati sono effettuate dal centro di demolizione autorizzato e dagli enti competenti (PRA).
              Non rispondiamo di ritardi o impedimenti causati da dati o documenti incompleti o non veritieri
              forniti dal cliente, né di eventi al di fuori del nostro controllo. Se qualcosa non va come
              previsto, contattaci: il nostro impegno è seguirti fino alla chiusura della pratica.
            </p>
          </Sezione>

          <Sezione titolo="6. Modifiche al servizio e ai termini">
            <p>
              Possiamo aggiornare questi termini per riflettere modifiche del servizio o normative: la versione
              pubblicata su questa pagina è sempre quella vigente. Le modifiche non riducono i diritti sulle
              pratiche già avviate.
            </p>
          </Sezione>

          <Sezione titolo="7. Legge applicabile e contatti">
            <p>
              Questi termini sono regolati dalla legge italiana. Per qualsiasi domanda puoi scriverci a
              <b> [DA COMPLETARE: email di contatto]</b> o contattarci su WhatsApp dall&apos;app.
            </p>
          </Sezione>
        </div>
      </div>
    </main>
  )
}
