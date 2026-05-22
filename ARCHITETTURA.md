# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al 20 maggio 2026.

## 0. Principio cardine: VELOCITÀ

Tutto il sistema deve puntare alla **rapidità di risposta** verso il cliente.
Se ci mettiamo troppo a rispondere, perdiamo la pratica.

Tempi obiettivo:
- **Approvazione documenti**: istantanea (entro 3 ore dall'invio del cliente)
- **Decisione del destino**: veloce (admin lo decide entro poche ore)
- **Conferma demolitore (dopo assegnazione)**: 8 ore lavorative per proporre data ritiro
- **Trattativa commercianti**: rapida (non lasciare il cliente in attesa)

## 1. Modello di business

Piattaforma italiana di demolizione auto **gratuita** per il privato.
NoiDemoliamo guadagna in 4 modi:

1. **Fee dai demolitori** per ogni pratica di demolizione assegnata (modello standard)
2. **Aste tra demolitori** per auto "interessanti" (chi paga di più la rottamazione vince)
3. **Vendita ai commercianti** per auto ancora buone (passaggio di proprietà invece di demolizione)
4. **Acquisto diretto da NoiDemoliamo**: admin può comprare l'auto direttamente per rivenderla privatamente

## 2. Utenti della piattaforma

| Utente | Cosa fa | Come accede |
|---|---|---|
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, conferma data ritiro, chatta con admin | Auto-registrazione fine flusso `/inizia` o `/vendi-auto` |
| **Demolitore** | Riceve assegnazioni, fissa ritiro, carica certificati rottamazione e PRA | Invito email da admin → imposta password |
| **Commerciante auto** | Vede aste auto disponibili, fa offerte, chatta con cliente per ritiro, scarica documenti operativi | Invito email da admin → imposta password |
| **Admin (Davide)** | Approva pratiche, gestisce destino, gestisce aste, recluta operatori, chatta con cliente | Login con email autorizzata |
| **Collaboratori** (officine, concessionarie, assicurazioni) | Inseriscono pratiche per conto dei loro clienti | Invito email da admin (futuro) |
| **Enti pubblici** (polizia locale, comuni) | Inseriscono veicoli abbandonati | Invito email da admin (futuro) |

## 3. I 4 flussi della pratica

### Flusso A — Demolizione standard

```
Cliente compila /inizia (10 step) → crea account → carica documenti dalla sua dashboard
   ↓
Admin riceve pratica in lista "in_attesa_approvazione"
   ↓
Admin entra nella pagina dettaglio pratica e vede TUTTO:
  - Dati cliente, dati veicolo, indirizzo
  - Documenti caricati (uno per uno: libretto, certificato, foto del veicolo)
  - Chat con il cliente
   ↓
APPROVAZIONE DOCUMENTI (uno per uno, non in blocco):
  - Per ogni documento: tasto verde (approva) o tasto rosso (rifiuta + nota libera per spiegare)
  - Esempio: libretto ok, certificato ok, foto front ok, foto retro da rifare
  - Quando un documento è rifiutato → notifica al cliente con elenco preciso di cosa rifare
   ↓
Quando TUTTI i documenti sono approvati → la pratica diventa "da_assegnare"
Si sblocca il box "Destino pratica" con 4 opzioni.
   ↓
Admin sceglie: DEMOLIZIONE STANDARD
   ↓
ALGORITMO ASSEGNAZIONE AUTOMATICA:
  1. Filtra demolitori che coprono il comune del cliente (mappa copertura)
  2. Esclude chi è sopra la soglia "max pratiche aperte" (configurabile)
  3. Calcola distanza stradale via Google Maps Distance Matrix API
  4. Ordina per: velocità storica → distanza → carico settimanale
  5. Assegna al primo della lista
   ↓
Demolitore ha 8 ORE LAVORATIVE per proporre data/ora ritiro
   ↓
Cliente conferma/rifiuta (può comunicare via chat in-app)
   ↓
Giorno del ritiro → demolitore clicca "✅ Veicolo ritirato"
   ↓
Demolitore ha 24 ORE per caricare certificato rottamazione
   ↓
Demolitore ha 15 GIORNI LAVORATIVI per caricare certificato radiazione PRA
   ↓
PRATICA COMPLETATA
```

**Caso edge:** nessun demolitore valido (zona scoperta o tutti saturi) → pratica va in **"Assegnazione manuale"** in admin; tu contatti un demolitore "di favore" oppure accordi col cliente di aspettare.

### Flusso B — Asta tra demolitori

Usato quando l'auto è interessante e admin vuole monetizzarla con i demolitori (rottamazione "pagata" più del normale).

```
Admin sceglie destino: ASTA DEMOLITORI
   ↓
Admin imposta:
  - Prezzo base (es. 300€)
  - Durata asta (rapida, es. 24h)
  - Demolitori invitati: tutti in zona + extra fuori zona (manuali)
   ↓
Demolitori vedono in dashboard "Aste aperte": foto, città (no indirizzo completo),
marca, anno, km, condizioni (NO dati cliente)
Possono fare offerta (≥ prezzo corrente) — sistema d'asta vera
   ↓
Scadenza asta → admin sceglie il vincitore manualmente
(può preferire chi offre meno per altri motivi, es. velocità storica)
   ↓
Vincitore → pratica assegnata a lui, vede dati cliente, parte flusso normale (A)
Perdenti → notifica "asta chiusa"
Se nessuno offre → admin decide: rilancia con prezzo più basso o assegna in automatico
```

### Flusso C — Vendita ai commercianti

Per auto ancora buone, da rivendere invece di demolire.

**Strategia operativa:** tu admin **prima** testi il mercato proponendo l'auto ai commercianti, **poi** se vedi interesse contatti il cliente per ottenere il suo OK. Questo evita di chiamare il cliente per nulla se poi nessun commerciante è interessato.

```
ORIGINE 1: pratica nata da /inizia (demolizione) ma admin vede che vale
ORIGINE 2: pratica nata da /vendi-auto (Flusso D)
   ↓
STEP 1 — Admin clicca "Proponi ai Commercianti"
   ↓
Si apre form admin:
  - Prezzo richiesto da NoiDemoliamo (es. 1500€)
  - Eventuale somma da dare al cliente (es. 100€) — opzionale
  - Durata trattativa (rapida)
   ↓
STEP 2 — La pratica diventa visibile a TUTTI i commercianti registrati
(zona + fuori zona — molti commercianti vengono anche dall'altra parte d'Italia per auto buone).

I commercianti vedono:
  ✅ Foto della macchina
  ✅ Marca, modello, anno, km, condizioni
  ✅ Solo la CITTÀ (no indirizzo completo)
  ❌ Niente libretto, niente certificato proprietà
  ❌ Niente dati cliente (nome, telefono, CF)
   ↓
STEP 3 — Commercianti fanno offerte:
  - Accettano il prezzo proposto
  - Oppure controproposta (es. 1200€)
   ↓
STEP 4 — Se admin vede interesse → CONTATTA IL CLIENTE
(chat in-app o telefonata) con messaggio del tipo:
  "Abbiamo visto la sua auto, pensiamo possa valere la pena ripararla invece
   di demolirla. Possiamo prendercene carico noi: a nostre spese la mettiamo
   a posto e facciamo passaggio di proprietà. Lei non spende nulla.
   [Se applicabile: e le diamo 100€ di rimborso simbolico]. È d'accordo?"
   ↓
STEP 5A — Cliente ACCETTA:
  Admin sceglie quale commerciante "ingaggiare" (chi offre di più, chi è
  più affidabile, ecc.)
  Solo a quel punto il commerciante riceve:
    - Dati completi del cliente
    - Indirizzo completo
  Commerciante e cliente si organizzano tramite chat in-app per ritiro.
  Commerciante va sul posto, paga il cliente DIRETTAMENTE (no NoiDemoliamo
  come intermediario) e ritira l'auto.
  Commerciante paga NoiDemoliamo il prezzo concordato (1500€).
  PRATICA COMPLETATA.

STEP 5B — Cliente RIFIUTA (non vuole vendere, vuole rottamare):
  Admin chiude la trattativa commercianti (notifica "annullata" ai partecipanti).
  Pratica torna a flusso A (demolizione standard).
  Admin può eventualmente fare anche asta demolitori (Flusso B).

STEP 5C — Nessun commerciante è interessato:
  Admin decide: comprarla per NoiDemoliamo / mandare a demolizione / asta demolitori.
```

**Garanzia anti-furbi:** il commerciante NON ha incentivo a bypassare NoiDemoliamo perché se sgarra → admin lo **disattiva** dalla piattaforma → perde accesso a tutte le auto future.

### Flusso D — Vendita auto su richiesta cliente

Cliente non vuole rottamare, vuole vendere e ricevere soldi.

```
Cliente in home clicca "Vendi auto" → flusso /vendi-auto (separato da /inizia)
   ↓
Cliente inserisce:
  - Dati auto (marca, modello, anno, km)
  - Condizioni (marciante/non, danni, manutenzione)
  - Foto interno/esterno/motore/documenti
  - PREZZO: può inserire quello che vuole realizzare (es. 1000€)
    OPPURE può dire "fatemi una valutazione voi"
   ↓
ALGORITMO NOIDEMOLIAMO calcola valutazione automatica
(basata su marca/anno/km/condizioni)
   ↓
Admin vede la richiesta + valutazione algoritmo + prezzo desiderato cliente
   ↓
Admin decide il destino in base a 3 casi tipo:

┌─ AUTO IMPRESENTABILE (prezzo cliente irrealistico, auto scarsa)
│  → Admin FORZA la demolizione
│  → Cliente vede proposta: "non possiamo acquistarla, ti offriamo demolizione gratis"
│  → Se accetta → pratica MIGRA al flusso A (demolizione standard)
│  → Se rifiuta → pratica annullata
│
├─ AUTO BUONA (cliente vuole 1000€, l'auto vale circa quello)
│  → Asta tra COMMERCIANTI (Flusso C — meccanica analoga)
│  → Se nessun commerciante offre abbastanza → admin RIFIUTA acquisto al cliente
│  → Cliente può comunque accettare demolizione gratuita
│
└─ AUTO MOLTO BUONA o ADMIN INTERESSATO
   → Admin compra direttamente per NoiDemoliamo
   → Rivende privatamente
   → Cliente riceve pagamento concordato
```

**Database:** pratiche di vendita vivono nella tabella separata `veicoli_vendita`, non in `pratiche`.

### 🔄 Migrazione tra flussi

Una pratica può migrare se cliente e admin sono d'accordo:

- **Da vendita → demolizione**: admin propone demolizione gratuita, cliente accetta → pratica copiata in `pratiche` con stato "da_assegnare"
- **Da demolizione → vendita commercianti**: admin vede auto buona, propone ai commercianti → se cliente OK e qualcuno offre, passa a flusso C
- **Da demolizione → acquisto diretto NoiDemoliamo**: admin compra in autonomia (sempre con OK cliente perché serve passaggio di proprietà)

## 4. Pagina dettaglio pratica (admin) — `/admin/pratiche/[id]` ✅ COSTRUITA

Cuore operativo del lavoro admin. Quando clicchi su una pratica dalla lista, si apre questa pagina con tutte le info e tutte le azioni possibili.

### Struttura attuale (già funzionante)

**Barra superiore blu scuro** — "← Indietro" + targa + marca/modello + badge stato

**1. Step 1 — Documenti e foto caricate** (in alto)
- Griglia con tutte le foto del veicolo + documenti
- Per ogni elemento: tasto verde ✓ (approva) e tasto rosso ✗ (rifiuta + nota libera)
- Click sull'anteprima → si apre in grande (modal)
- Stati visivi: bordo verde se approvato, bordo rosso se rifiutato (con nota visibile)
- Contatore "X/Y approvati" in alto a destra

**2. Step 2 — Destino pratica** (disponibile solo dopo approvazione documenti completa)
- 4 card cliccabili in griglia 2x2:
  - 🔧 **Demolizione standard** — algoritmo sceglie il demolitore migliore (✅ collegato)
  - 🔥 **Asta demolitori** — in arrivo prossimamente
  - 💼 **Proponi ai commercianti** — in arrivo prossimamente
  - 🛒 **Compra per NoiDemoliamo** — in arrivo prossimamente

**3. Box "Dati cliente"** — Nome, telefono, CF, ruolo

**4. Box "Dati veicolo"** — Targa, tipo, marca/modello, anno, km, marciante, incidentato

**5. Box "Indirizzo ritiro"** — Via, comune, provincia

**6. Box "Note del cliente sul veicolo"** (se presenti)

**7. Bottone "Annulla pratica"** (in basso, isolato e poco visibile)

### Da aggiungere ancora
- **Chat con il cliente** (WhatsApp-like in fondo) + messaggi preimpostati
- Modale di conferma sui bottoni asta/commercianti/acquisto

## 5. Stati pratica

```
# Pratiche di demolizione (tabella `pratiche`)
in_attesa_documenti               (cliente non ha ancora caricato foto/doc)
in_attesa_approvazione_admin      (cliente ha caricato, admin deve verificare doc per doc)
documenti_parzialmente_approvati  (alcuni sì, alcuni no — cliente deve rifare i rifiutati)
da_assegnare                      (tutti documenti ok, admin deve scegliere destino)

# Ramo demolizione standard
in_attesa_assegnazione            (admin ha cliccato "Demolizione standard", sistema sta scegliendo)
in_assegnazione_manuale           (nessun demolitore valido, admin lavora a mano)
assegnata                         (demolitore deve proporre data ritiro - max 8h)
in_attesa_conferma_cliente        (demolitore ha proposto, cliente deve accettare)
ritiro_confermato                 (data fissata)
ritirata                          (demolitore ha cliccato "veicolo ritirato")
in_attesa_cert_rottamazione       (max 24h dal ritiro)
in_attesa_cert_radiazione_pra     (max 15 giorni lavorativi)
completata

# Ramo asta demolitori
in_asta_demolitori                (asta aperta)
asta_demolitori_chiusa            (admin deve scegliere vincitore)

# Ramo asta commercianti
in_proposta_commercianti          (admin ha aperto trattativa, commercianti fanno offerte)
in_attesa_consenso_cliente        (admin ha visto interesse, contatta cliente)
trattativa_commercianti_accettata (cliente ha detto sì, admin sceglie vincitore)
in_passaggio_proprieta            (commerciante deve completare il passaggio)
passaggio_completato              (doc caricata)

# Ramo acquisto diretto NoiDemoliamo
in_attesa_consenso_cliente        (admin propone acquisto, aspetta sì del cliente)
acquistata_da_noidemoliamo        (cliente ha accettato, NoiDemoliamo ha comprato)

# Stati comuni
annullata                         (cliente o admin annulla)
```

## 6. Sistema di notifiche (da costruire)

**Canali previsti:**
- **In-app obbligatorie** (campanella, badge, popup, web push)
- **SMS** per le cose urgenti
- **Email** per comunicazioni meno urgenti

(Vedi sezione 6 della precedente versione per la lista completa dei trigger per ogni utente)

## 7. Dashboard commerciante — sezioni necessarie (da costruire)

1. **Aste aperte**
2. **Le mie offerte**
3. **Trattative in corso**
4. **Storico**
5. **Documenti operativi** ⭐ Slot dove il commerciante scarica:
   - Contratto di collaborazione firmato (PDF)
   - Delega "opera per conto di NoiDemoliamo" (PDF)
   - Altri documenti operativi
6. **Profilo**

## 8. Database — modifiche e nuove tabelle

### Tabelle esistenti già nel DB
collaboratori, commercianti, demolitori, demolitori_comuni, documenti, documenti_approvazione, fatture, foto_pratiche, impostazioni, interessi_commercianti, messaggi, messaggi_chat, notifiche, pratiche, solleciti, utenti, veicoli_vendita, veicoli_vendita_foto

### Modifiche fatte in questa sessione
- ✅ Tabella `pratiche`: aggiunte colonne urgente, scadenza_proposta_ritiro, scadenza_cert_rottamazione, scadenza_cert_pra, assegnazione_manuale
- ✅ Tabella `impostazioni`: aggiunta chiave `max_pratiche_aperte_demolitore=15`
- ✅ Nuova tabella `documenti_approvazione` (id, pratica_id, tipo_documento, stato, nota_admin, timestamps)
- ✅ Nuova tabella `messaggi_chat` (id, pratica_id, mittente_id, mittente_tipo, testo, letto, timestamps)
- ✅ Bucket Storage `foto-pratiche` (pubblico) creato con policy
- ✅ Bucket Storage `documenti-pratiche` (privato) creato con policy

### Ancora da creare
- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `messaggi_preimpostati` (id, categoria, titolo, testo)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

## 9. Stato attuale del progetto (cosa è già FATTO)

- ✅ Home `/` — bottone "Richiedi la demolizione gratuita ora" + accedi, con logo, sfondo sfumato, benefit pills
- ✅ Flusso `/inizia` (10 step cliente) + auto-registrazione account cliente
- ✅ **Upload foto VERO su Supabase Storage** (funzionante, testato in questa sessione)
- ✅ Login intelligente (admin → /admin, cliente → /dashboard)
- ✅ Dashboard cliente `/dashboard` + dettaglio pratica (struttura base, da rifare bella)
- ✅ Dashboard admin `/admin` con stats e filtri pratiche
- ✅ **Pagina dettaglio pratica admin `/admin/pratiche/[id]` COMPLETA** con approvazione granulare foto/documenti, step 2 destino, dati, indirizzo
- ✅ Gestione demolitori `/admin/demolitori` (lista + form aggiunta + dettaglio)
- ✅ **Mappa demolitore singolo** (MappaComuni.tsx): 3 layer regioni/province/comuni, selezione a cascata, esclusioni puntuali
- ✅ **Mappa strategica admin** `/admin/copertura`: vista aggregata Italia con copertura totale/parziale/scoperta
- ✅ 20 file GeoJSON comuni regionali su Supabase Storage (bucket `geojson-comuni`)
- ✅ Bottone "Mappa copertura" nella dashboard admin
- ✅ Tabelle `documenti_approvazione` e `messaggi_chat` + RLS
- ✅ Bucket Storage `foto-pratiche` (pubblico) + `documenti-pratiche` (privato) + policy
- ✅ **Algoritmo di assegnazione automatica** (`lib/assegnazione.ts` + `app/api/assegna-pratica/route.ts`) — pronto, ancora da TESTARE
- ✅ Google Maps Server Key creata e limitata a Distance Matrix + Geocoding

## 10. ⏳ Cose da fare (in ordine di priorità)

### PROSSIMO STEP (priorità massima)

**🔜 RIFARE BELLA LA DASHBOARD CLIENTE**

La dashboard cliente attualmente è "vecchia stile" e ha 3 problemi:
1. Le foto del veicolo caricate dal cliente NON si vedono
2. Il bottone "Carica" per i documenti (libretto, cert. proprietà, ecc.) NON funziona
3. Il design è meno bello/professionale rispetto alla dashboard admin

Va rifatta seguendo lo stesso stile della pagina dettaglio admin:
- Topbar blu scuro coerente
- Box bianchi arrotondati
- Sezioni chiare e organizzate

**Domande aperte (Davide deve rispondere):**
- Struttura: una sola pagina con tutto? O lista pratiche + dettaglio separati come admin?
- Tutto in una pagina con scorrimento? O tab? O sezioni espandibili?
- Cosa è PIÙ importante in cima per il cliente? (stato attuale / documenti / chat / dati)

**Sezioni necessarie nella dashboard cliente:**
- **Stato pratica** chiaro (cosa devo fare ora?)
- **Documenti caricati** con stato (✅ approvato, ❌ da rifare con nota, ⏳ in attesa)
- **Documenti da consegnare al ritiro** (libretto, certificato, carta d'identità) con bottone "Carica" FUNZIONANTE
- **Foto del veicolo** già caricate (galleria + bottone "aggiungi altre")
- **Chat con NoiDemoliamo** (operatore admin)
- **Dati veicolo** (riepilogo)
- **Certificati** (rottamazione + PRA, in arrivo dopo il ritiro)

### Dopo (in ordine)

- 🔜 **Sistema chat in-app cliente ↔ admin** (componente riusabile per admin + cliente, usa tabella `messaggi_chat` già creata)
- 🔜 **Sistema messaggi preimpostati** per admin
- 🔜 **Google Maps autocomplete indirizzi** nel flusso /inizia (importante: senza coordinate precise l'algoritmo di assegnazione non funziona bene)
- 🔜 **Testare bottone "Demolizione standard"** che lancia algoritmo assegnazione automatica (creare almeno un demolitore di test con zona di copertura prima)
- 🔜 **Sezione admin "Assegnazione manuale"** per pratiche dove l'algoritmo non trova demolitori
- 🔜 **Sistema invito email** demolitore + pagina `/imposta-password`
- 🔜 **Login multi-ruolo** che riconosce admin / cliente / demolitore / commerciante e fa redirect alla dashboard giusta
- 🔜 **Dashboard demolitore** `/dashboard-demolitore` con:
  - Ritiri da effettuare (priorità)
  - Calendario smart
  - Scadenze attive
  - Storico
  - Area di copertura
  - Notifiche
- 🔜 **Sistema notifiche in-app** (campanella, badge, popup, web push)
- 🔜 **Sistema SMS** (Twilio o equivalente)
- 🔜 **Flusso "Asta demolitori"** completo (Flusso B)
- 🔜 **Flusso "Proponi ai commercianti"** completo (Flusso C) con:
  - Form admin con prezzo e somma cliente
  - Visibilità limitata per commercianti (foto + città, no dati cliente)
  - Sistema offerte
  - Conferma cliente DOPO le offerte
- 🔜 **Flusso "Compra per NoiDemoliamo"** (admin acquista direttamente)
- 🔜 **Flusso Vendita auto** `/vendi-auto` (Flusso D) — pagina pubblica + algoritmo valutazione
- 🔜 **Dashboard commerciante** completa con 6 sezioni (vedi sezione 7)
- 🔜 **Slot documenti operativi commercianti** (PDF scaricabili: contratto, delega)
- 🔜 **Mappa commercianti** `/admin/copertura-commercianti` (analoga a /admin/copertura)
- 🔜 **Sistema fatturazione automatica**
- 🔜 **Statistiche e report admin**
- 🔜 **Dashboard collaboratori ed enti pubblici**
- 🔜 **Migrare GOOGLE_MAPS_SERVER_KEY** anche su Vercel (variabili d'ambiente produzione)

## 11. ⚠️ Problemi noti e fix futuri

- ⚠️ Avviso console "1 Issue" rimasto: errore RLS quando si crea l'utente in tabella `utenti` durante `/inizia` — da indagare, ma NON blocca il flusso (la pratica viene creata correttamente, le foto vengono caricate, l'utente esiste)
- ⚠️ Box di `/inizia` un po' troppo in alto rispetto a home e login — sistemare allineamento
- ⚠️ Dashboard cliente: foto caricate non visibili, bottone "Carica" documenti non funzionante (problema noto, da risolvere in PROSSIMO STEP)

## 12. Configurazioni chiave

### File `.env.local` (locale)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (referrer-limited, per browser)
- `GOOGLE_MAPS_SERVER_KEY` (server-side, per Distance Matrix + Geocoding)
- `SUPABASE_SERVICE_ROLE_KEY`

### Da migrare a Vercel
- `GOOGLE_MAPS_SERVER_KEY` (per produzione, non ancora aggiunta)

### Buckets Storage attivi
- `geojson-comuni` (pubblico) — file mappa
- `foto-pratiche` (pubblico) — foto veicoli
- `documenti-pratiche` (privato) — libretto, certificato proprietà, ecc.

## 13. Decisioni operative chiarite in questa sessione

1. **Approvazione documenti**: granulare (uno per uno), non in blocco
2. **Documenti**: tutti uguali nell'UI (libretto, certificato, foto auto) → tutti hanno ✓ e ✗
3. **Velocità**: approvazione e decisione destino DEVONO essere quasi istantanee
4. **Pagamento commerciante → cliente**: diretto al ritiro, no NoiDemoliamo intermediario
5. **Commercianti vedono**: foto + città (no indirizzo completo), niente dati cliente, niente libretto/cert. proprietà
6. **Strategia "Proponi ai commercianti"**: prima testo il mercato con i commercianti, POI contatto il cliente se vedo interesse
7. **Eventuale 100€ al cliente**: quando il cliente "mangia la foglia" e capisce che l'auto vale qualcosa
8. **Slot documenti operativi commercianti**: contratto + delega + altri PDF, scaricabili dalla loro dashboard