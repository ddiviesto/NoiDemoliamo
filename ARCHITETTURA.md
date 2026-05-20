# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al 20 maggio 2026.

## 1. Modello di business

Piattaforma italiana di demolizione auto **gratuita** per il privato.
NoiDemoliamo guadagna in 4 modi:

1. **Fee dai demolitori** per ogni pratica di demolizione assegnata (modello standard)
2. **Aste tra demolitori** per auto "interessanti" (chi paga di più la rottamazione vince)
3. **Aste tra commercianti** per auto ancora buone (passaggio di proprietà invece di demolizione)
4. **Acquisto diretto da NoiDemoliamo**: admin può comprare l'auto direttamente per rivenderla privatamente

## 2. Utenti della piattaforma

| Utente | Cosa fa | Come accede |
|---|---|---|
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, conferma data ritiro | Auto-registrazione fine flusso `/inizia` o `/vendi-auto` |
| **Demolitore** | Riceve assegnazioni, fissa ritiro, carica certificati rottamazione e PRA | Invito email da admin → imposta password |
| **Commerciante auto** | Partecipa alle aste rivendita, vede solo dati auto (no cliente), carica documenti passaggio | Invito email da admin → imposta password |
| **Admin (Davide)** | Approva pratiche, decide flusso (demolizione/asta/rivendita/acquisto), gestisce aste, recluta operatori | Login con email autorizzata |
| **Collaboratori** (officine, concessionarie, assicurazioni) | Possono inserire pratiche per conto dei loro clienti | Invito email da admin (futuro) |
| **Enti pubblici** (polizia locale, comuni) | Inseriscono veicoli abbandonati | Invito email da admin (futuro) |

## 3. I 4 flussi della pratica

### Flusso A — Demolizione standard

```
Cliente compila /inizia (10 step) → carica documenti dal suo account
   ↓
Admin verifica documenti → APPROVA + sceglie DESTINO della pratica:
   ┌─ Demolizione standard (algoritmo assegna al miglior demolitore)
   ├─ Asta tra demolitori (Flusso B)
   ├─ Mostra ai commercianti (variante di Flusso C, tempi brevi)
   └─ Acquista direttamente (Flusso D, NoiDemoliamo compra)
   ↓
[se "demolizione standard"]
ALGORITMO ASSEGNAZIONE AUTOMATICA sceglie il demolitore migliore:
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

Usato quando l'auto è interessante e admin vuole monetizzarla con i demolitori.

```
Admin → "Metti in asta demolitori"
   ↓
Admin imposta:
  - Prezzo base (es. 300€)
  - Durata asta (es. 24h)
  - Demolitori invitati: tutti in zona + extra fuori zona (manuali)
   ↓
Demolitori vedono in dashboard "Aste aperte": foto, km, anno, marca, condizioni
(NO dati cliente) (gli arriva notifica)
Possono fare offerta (≥ prezzo corrente) — sistema d'asta vera (chi paga di più)
   ↓
Scadenza asta → admin sceglie il vincitore manualmente
(può preferire chi offre meno per altri motivi, es. velocità storica)
   ↓
Vincitore → pratica assegnata a lui, vede dati cliente, parte flusso normale (A)
Perdenti → notifica "asta chiusa"
Se nessuno offre → admin decide: rilancia con prezzo più basso o assegna in automatico
```

### Flusso C — Asta rivendita commercianti

Usato per auto ancora buone, da rivendere invece di demolire.(il cliente deve essere d'accordo perchè può dire "no io voglio demolire")
io faccio un verifica con i commercianti se riesco a piazzarla in tempi brevi perchè il cliente vuole dmeolire.

```
Origine 1: pratica nata da /inizia (demolizione) ma admin vede che vale
Origine 2: pratica nata da /vendi-auto (Flusso D)
   ↓
Admin → "Metti all'asta commercianti"
   ↓
Admin imposta:
  - Prezzo base
  - Durata asta (tempi BREVI per chiudere trattativa, es. 12-24h)
  - Commercianti invitati: tutti in zona + extra fuori zona
   ↓
Commercianti vedono in dashboard "Aste aperte": foto, km, anno, marca, condizioni
(NO dati cliente)
Fanno offerte progressive
   ↓
Scadenza → admin sceglie vincitore manualmente
   ↓
[CASO 1: c'è un vincitore]
Cliente conferma vendita (o se l'auto era da demolizione, lo aveva già accettato)
Commerciante vede dati cliente → si organizza per il passaggio
Commerciante ha 30 GIORNI per completare il passaggio di proprietà
Commerciante carica documentazione passaggio (atto, libretto, ricevuta motorizzazione)
PRATICA COMPLETATA + admin riceve % concordata

[CASO 2: nessuno offre]
Se origine = vendita → admin RIFIUTA acquisto al cliente
  Cliente può comunque accettare demolizione gratuita
Se origine = demolizione → torna a flusso A (demolizione standard)
```

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
│  → Asta tra COMMERCIANTI (Flusso C)
│  → Se nessun commerciante offre abbastanza → admin RIFIUTA acquisto al cliente
│  → Cliente può comunque accettare demolizione gratuita
│
└─ AUTO MOLTO BUONA o ADMIN INTERESSATO
   → Admin compra direttamente per NoiDemoliamo
   → Rivende privatamente
   → Cliente riceve pagamento concordato
```

**Database:** pratiche di vendita vivono nella tabella separata `veicoli_vendita` (già esistente), non in `pratiche`.

### 🔄 Migrazione tra flussi

Una pratica può migrare da un flusso a un altro se cliente e admin sono d'accordo:

- **Da vendita → demolizione**: admin propone demolizione gratuita, cliente accetta → pratica copiata in `pratiche` con stato "in_attesa_assegnazione"
- **Da demolizione → vendita commercianti**: admin vede auto buona, propone ai commercianti → asta veloce, se vince qualcuno torna flusso C; se nessuno, ritorna flusso A
- **Da demolizione → acquisto diretto NoiDemoliamo**: admin compra in autonomia, cliente riceve compenso, auto rivenduta privatamente

## 4. Stati pratica (aggiornati con tutti i flussi)

```
# Pratiche di demolizione (tabella `pratiche`)
in_attesa_documenti               (cliente non ha ancora caricato foto/doc)
in_attesa_approvazione_admin      (cliente ha caricato, admin deve verificare)
in_valutazione_admin              (admin decide destino: demolizione/asta/rivendita/acquisto)

# Ramo demolizione standard
in_attesa_assegnazione            (admin ha scelto demolizione, sistema sta scegliendo)
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
# poi confluisce in "assegnata" del ramo demolizione

# Ramo asta commercianti (da pratica demolizione)
in_attesa_consenso_cliente        (admin contatta cliente, aspetta sì/no)
in_asta_commercianti              (asta aperta tra commercianti)
asta_commercianti_chiusa          (admin deve scegliere vincitore)
in_passaggio_proprieta            (commerciante ha 30 giorni)
passaggio_completato              (doc caricata)

# Ramo acquisto diretto NoiDemoliamo
acquistata_da_noidemoliamo        (admin ha comprato direttamente)

# Stati comuni
annullata                         (cliente o admin annulla)

# Vendite (tabella `veicoli_vendita`)
in_attesa_valutazione             (cliente ha inserito dati, algoritmo deve calcolare)
in_attesa_approvazione_admin      (algoritmo ha proposto, admin deve confermare destino)
proposta_demolizione              (admin propone demolizione gratuita per auto impresentabile)
in_asta_commercianti              (asta aperta)
asta_chiusa                       (admin deve scegliere vincitore o rifiutare)
acquistata_da_noidemoliamo        (NoiDemoliamo compra direttamente)
in_passaggio_proprieta            (commerciante deve completare il passaggio)
rifiutata_da_noidemoliamo         (nessuno l'ha comprata)
completata
migrata_a_demolizione             (cliente ha accettato demolizione, vedi tabella `pratiche`)
```

## 5. Sistema di notifiche

**Canali:**
- **In-app obbligatorie** (campanella, badge, popup) — i demolitori devono attivare le notifiche per ricevere pratiche
- **SMS** per le cose urgenti (assegnazione nuova, scadenze ravvicinate)

**Trigger notifiche per il demolitore:**
- Nuova pratica assegnata
- Scadenza imminente per: data ritiro (8h), certificato rottamazione (24h), certificato PRA (15gg lav.)
- Cliente ha accettato/rifiutato data ritiro
- Nuova asta aperta a lui
- Asta vinta / persa

**Trigger notifiche per il cliente:**
- Pratica demolizione approvata
- Demolitore assegnato + data proposta
- Promemoria giorno prima del ritiro
- Caricamento certificati (rottamazione, PRA)
- Pratica completata
- (vendite) Valutazione pronta da accettare/rifiutare
- (vendite) Proposta di passaggio a demolizione gratuita
- (vendite) Esito asta commercianti

**Trigger notifiche per l'admin:**
- Pratica in "assegnazione manuale" (zona scoperta o saturazione)
- Demolitore sfora i tempi
- Asta scaduta (deve scegliere vincitore)
- Nuova valutazione vendita da approvare
- Cliente ha accettato/rifiutato valutazione o proposta demolizione

**Trigger notifiche per il commerciante:**
- Nuova asta aperta a lui (demolizione o vendita)
- Asta vinta / persa
- Scadenza imminente per il passaggio (30gg)

## 6. Database — modifiche e nuove tabelle necessarie

### Modifiche a tabelle esistenti

- `pratiche`: aggiungere campi per i nuovi stati, scadenze (`data_assegnazione`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`), flag urgenza cliente, prezzo offerto dal demolitore (se vinto in asta), riferimento opzionale a `veicoli_vendita_origine_id` (se la pratica nasce da migrazione)
- `veicoli_vendita`: aggiungere `prezzo_desiderato_cliente`, `valutazione_algoritmo`, `valutazione_admin`, `prezzo_finale`, `stato`, `destino` (asta_commercianti/acquisto_diretto/proposta_demolizione), `commerciante_vincitore_id`, scadenze passaggio, riferimento opzionale a `pratica_migrata_id`
- `utenti`: campo `tipo` esteso ai valori `cliente`, `demolitore`, `commerciante`, `collaboratore`, `ente_pubblico`, `admin`
- `impostazioni`: aggiungere chiave "max_pratiche_aperte_demolitore" (configurabile)

### Nuove tabelle

- `aste` (id, riferimento_id, riferimento_tipo='pratica'|'vendita', tipo='demolitori'|'commercianti', prezzo_base, data_apertura, data_chiusura, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp) — log SMS

## 7. Pagine da costruire (in ordine di priorità)

### Subito (cuore del sistema)
1. **Algoritmo di assegnazione automatica** (funzione TypeScript + integrazione Google Distance Matrix)
2. **Tabella `impostazioni`** + UI configurazione admin
3. **Sezione admin "Pratiche da assegnare"** con bottoni per scegliere il destino (decideremo dopo le regole esatte sulle opzioni disponibili)

### Dopo (flusso quotidiano demolitore)
4. **Sistema invito email** demolitore + pagina `/imposta-password`
5. **Login multi-ruolo** (riconosce admin / cliente / demolitore / commerciante e fa redirect alla dashboard giusta)
6. **Dashboard demolitore** `/dashboard-demolitore`:
   - Ritiri da effettuare (priorità)
   - Calendario smart
   - Scadenze attive
   - Storico
   - Area di copertura
   - Notifiche

### Dopo ancora (monetizzazione)
7. **Sistema notifiche in-app** (campanella, badge, popup, web push API per notifiche browser)
8. **Sistema SMS** (es. Twilio o equivalente)
9. **Sezione admin "Asta demolitori"** + UI per invitare demolitori, vedere offerte, scegliere vincitore
10. **Sezione demolitore "Aste aperte"** in dashboard

### Flusso vendita auto (modello business 4)
11. **Pagina pubblica `/vendi-auto`** (flusso step-by-step, con prezzo desiderato o "valutate voi")
12. **Algoritmo di valutazione automatica** (calcolo prezzo basato su marca/anno/km/condizioni)
13. **Sezione admin "Valutazioni da approvare"** (vede proposta algoritmo, confronta con prezzo cliente, decide destino)
14. **Sezione cliente "Le mie vendite"** in dashboard (vede valutazione, accetta/rifiuta, vede proposte di demolizione)
15. **Sistema migrazione pratiche** (vendita → demolizione e viceversa)

### Più avanti (commercianti)
16. Tutto il flusso commercianti analogo: invito, login, dashboard, aste rivendita, caricamento documenti passaggio
17. **Mappa commercianti** `/admin/copertura-commercianti` (analoga a `/admin/copertura`)

### Migliorie continue
- Google Maps autocomplete indirizzi nel flusso cliente
- Chat in-app cliente ↔ demolitore
- Sistema fatturazione automatica
- Statistiche e report admin
- Dashboard collaboratori ed enti pubblici

## 8. Decisioni da prendere (rimaste aperte)

- **Regole opzioni di destino per pratica**: quando admin vede una pratica, vede sempre tutte le opzioni (demolizione/asta dem/asta com/acquisto)? Oppure cambiano in base all'origine (pratica nata da /inizia vs /vendi-auto)? → Da decidere quando costruiremo la sezione admin "Pratiche da assegnare"

## 9. Stato attuale del progetto (cosa è già fatto)

- ✅ Home + flusso `/inizia` (10 step cliente) + auto-registrazione account cliente
- ✅ Database 16 tabelle + RLS policies
- ✅ Dashboard cliente `/dashboard` + dettaglio pratica
- ✅ Dashboard admin `/admin` con stats e filtri pratiche
- ✅ Login intelligente (admin → /admin, cliente → /dashboard)
- ✅ Gestione demolitori `/admin/demolitori` (lista + form aggiunta)
- ✅ Dettaglio demolitore `/admin/demolitori/[id]` con stato, contratto, area copertura
- ✅ **Mappa demolitore singolo** (MappaComuni.tsx): 3 layer regioni/province/comuni, selezione a cascata, esclusioni puntuali, salvataggio nel DB con tipo, ripristino stato al ricaricamento
- ✅ **Mappa strategica admin** `/admin/copertura`: vista aggregata Italia con copertura totale/parziale/scoperta colorata coerentemente
- ✅ 20 file GeoJSON comuni regionali caricati su Supabase Storage (bucket `geojson-comuni`)
- ✅ Script `scripts/upload-geojson.js` per riupload se serve