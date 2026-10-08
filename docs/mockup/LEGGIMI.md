# I mockup del marchio (tenuti apposta)

> Copie dei mockup usati per decidere marchio, icona e scena della home.
> Servono se un domani si vuole **rimettere mano** a una di queste cose senza
> ricominciare da zero: dentro ci sono già i cursori per regolare e confrontare.

⚠️ **Sono copie di lavoro, non fanno parte del sito.** I mockup vivi stanno in
`public/` (dove sono in .gitignore e possono sparire con una pulizia): questi
qui invece sono al sicuro nella storia di GitHub. Se ne modifichi uno in
`public/`, ricopialo qui.

Per guardarne uno: copialo in `public/` e aprilo su `localhost:3000/nome.html`.

| File | A cosa serve |
|---|---|
| `scritta-fogliolina.html` | Le **proporzioni della fogliolina** sulla "i" di *Noi*: quattro cursori (grandezza, alza/abbassa, sposta, spazio tra le parole) e la scritta mostrata grande, nella barra, su fondo blu e in piccolo. In fondo stampa i quattro numeri da mettere in `app/components/Marchio.tsx`. **Valori scelti il 27/08: larga 0.60 · alto -0.09 · lato 0.07 · spazio 0.15** |
| `icona-app.html` | ⚠️ SUPERATA il 05/10 (vedi `icona-a3.html`). L'**icona dell'app** vecchia, costruita col carattere vero (Outfit) e non con un'immagine generata: nove foglioline tra cui scegliere, cursori per grandezza e posizione, anteprime a 220/180/120/60/32 px, la schermata del telefono, e i bottoni che **scaricano il PNG** in tutte le misure |
| `logo-il-marchio-e-la-scritta.html` | Le tre strade valutate quando si è deciso che **il marchio è la scritta**: solo nome, nome col punto verde, nome con la fogliolina |
| `home-la-500-va-dove-clicchi.html` | La **scena della home** (la 500 che va sul carro attrezzi o dall'acquirente), con la manovra completa |
| `valutazione-undici-passi.html` | Il **nuovo flusso di valutazione** in undici passi, nello stesso ordine della demolizione, con in fondo "Cosa succede dopo" e la lista delle email Resend da fare (03/09/2026) |
| `confronto-demolizione-valutazione.html` | I **due flussi affiancati** riga per riga (16 righe) con le sette note sulle contraddizioni trovate: da qui sono uscite le decisioni di Davide del 03/09 |
| `passo-veicolo-con-alimentazione.html` | Il **passo 3 con l'alimentazione dentro** (PC a due colonne e telefono) e tre nomi tra cui scegliere: A "Informazioni sul veicolo", B "Il tuo veicolo", C "Dati del veicolo" |
| `passo-targa-senza-riquadro.html` | Il **passo della targa** senza riquadro: targa corta, "Le targhe sono sul mezzo?" come campo, nota per le targhe smarrite (valutazione senza nominare la demolizione). Scelta la **A** il 09/09 |
| `valutazioni-in-admin.html` | La **lista Valutazioni nel CRM**: sidebar, flusso a pillole, righe e tendina con la scheda "Risposta al cliente" (A, scelta il 18/09), la variante coi bottoni sulla coda (B) e com'è dopo la risposta (C) |
| `proposta-nell-area-personale.html` | La **card della valutazione nell'area del cliente** nei suoi cinque momenti (in valutazione, proposta gratuita, proposta con la cifra, accettata, rifiutata). Scelta la **A** (tutto nella card) il 03/10 |
| `area-personale-su-pc.html` | L'**area del cliente su PC**: fondo lilla, isola, titolo grande e tre impaginazioni delle pratiche (righe larghe, due colonne, tessere). Scelta la **A** il 05/10 |
| `pratica-e-accesso-su-pc.html` | La **pagina della pratica su PC** (A: linguette sopra e riepilogo a sinistra, scelta il 05/10; B: menu verticale) e l'**accesso** sul fondo lilla con l'isola |
| `icona-dal-marchio.html` · `icona-sul-lilla.html` | La **nuova icona dal marchio della barra** (05/10): prima le quattro vesti (bianca/blu, due righe/una riga), poi la A sul lilla dell'app con "Noi" al centro in cinque varianti. Scelta la **A3** (lilla con gli aloni) |
| `icona-a3.html` | L'**icona nuova (A3)**, disegnata col carattere vero: lettere della barra su due righe centrate sul lilla con gli aloni. I bottoni la scaricano; per rifare i file del sito si usa `scripts/monta-icona.mjs` con lo strato delle lettere (`stratoBase64(1024)`) |
| `foglia-linguetta-e-installa-app.html` | La **fogliolina nella linguetta del browser** (quattro modi, scelta la **C** sul quadratino lilla il 05/10) e il **tasto "Installa l'app"**: striscia sul sito, voce nelle impostazioni, cosa succede su Android/PC, iPhone e ad app già installata |
| `testata-blu-e-foglia-linguetta.html` | Il **marchio vero nelle testate blu** (scelta la **C**: marchio a sinistra, titolo della pagina a destra, 05/10) e la **foglia della linguetta più grande** (scelta la **C2**: a filo del quadratino lilla) |
| `sezione-installa-e-foglia-intera.html` | La **sezione "Installa l'app"** in tre modi (scelta la **B**, card di vetro col telefono, 05/10) e la **foglia intera nella linguetta** (scelta la **D1**, contorno verde e dentro bianco) |
| `foto-tre-modi.html` · `foto-b1-rifinita.html` · `foto-aria.html` | Il **passo delle foto** rifatto il 05/10: i tre modi (griglia guidata, una posizione alla volta, libera), la B1 rifinita (righe all'inizio, poi solo le foto vere con la ✕ e le pillole, "Scegli dal dispositivo" su PC) e la veste **Aria** scelta (tondini, anello che si riempie). Componente condiviso `StepFoto.tsx` |
| `pratica-pc-due-strade.html` · `pratica-pc-senza-colonna.html` | La **pagina della pratica su PC rifinita** (05/10): A "Pulita" vs B "Guidata", poi senza la colonna a sinistra in tre modi. Scelta la **C**: niente riepilogo in pagina (sta in "Stato"), colonna sola centrata, banner bianco "Cosa fare adesso", linguette a segmento, tessere documento piene con "Scegli dal dispositivo", i documenti da preparare come tessere numerate |
| `pratica-pc-allineata.html` · `pratica-pc-versione-c.html` | La **pagina della pratica su PC allineata** (08/10): prima tre modi (A tutto a 1000, B a 860, C tessere numerate con il retro in attesa), poi la **C alla larghezza della A** vista in sei momenti: inizio, mentre trascini il file, fronte caricato, caricamento fallito (avviso in riga), ritiro fissato (si apre su Ritiro), pratica completata (si apre su Stato, certificati in fondo al percorso). Scelta e fatta tutta |
| `pratica-pc-tre-ritocchi.html` | **Tre ritocchi su PC** (08/10): "Aggiungi un altro veicolo" come la riga del telefono (sì), le tessere fronte/retro uguali e più basse (scelta la **A**, a tutta card), sotto solo la lista "Dopo questo" senza riquadro, "Vai al prossimo documento" al centro |
| `accedi-installa-tre-modi.html` · `accedi-installa-testi.html` · `accedi-installa-un-solo-blu.html` | **"Installa l'app" nella pagina di accesso** (08/10): prima dove metterla (striscia, riga, card), poi tre testi per convincere (scelto "Hai già l'app?"), poi il giro con **un solo bottone blu** e il gancio dei certificati. Scelta la **A**: striscia sotto la scatola col telefonino piccolo e la pillola bianca |
| `installa-pc.html` | Le **istruzioni "Installa l'app" su PC** (08/10): nuvoletta ancorata al bottone, striscia che si apre sul posto, riquadro centrato. Scelta la **A** (nuvoletta col becco, come le altre nuvolette dell'app) |
