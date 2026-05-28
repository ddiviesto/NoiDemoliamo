# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al **25 maggio 2026** (notte).
> Questo è l'unico file da leggere per capire dove siamo, dove andiamo, e come si lavora.

---

# 📍 PARTE 1 — IDENTITÀ DEL PROGETTO

## 1.1 Cosa è NoiDemoliamo

Piattaforma italiana di **demolizione auto gratuita** per il privato.
Il cliente:
1. Va su `noi-demoliamo.vercel.app`
2. Compila un flusso di mini-step (`/inizia`) — ora 12-13 step (dipende dal tipo veicolo)
3. Carica foto e documenti
4. Riceve assegnato un demolitore
5. Aspetta il ritiro a casa
6. Riceve i certificati di rottamazione e radiazione PRA

**Tutto gratis per il cliente.** NoiDemoliamo guadagna dai demolitori e dai commercianti.

## 1.2 Modello di business (4 modi per guadagnare)

1. **Fee dai demolitori** per ogni pratica assegnata (modello standard, base del fatturato)
2. **Aste tra demolitori** per auto interessanti (chi paga di più la rottamazione vince)
3. **Vendita ai commercianti** per auto ancora buone (passaggio di proprietà invece di demolizione)
4. **Acquisto diretto da NoiDemoliamo**: admin compra l'auto direttamente per rivenderla privatamente

## 1.3 Principio cardine: VELOCITÀ

Tutto il sistema deve puntare alla **rapidità di risposta** verso il cliente.
Se ci mettiamo troppo a rispondere, perdiamo la pratica.

Tempi obiettivo:
- **Approvazione documenti**: entro 1 ora dall'invio del cliente (comunicato nel flusso `/inizia`)
- **Decisione del destino**: poche ore
- **Conferma demolitore (dopo assegnazione)**: 8 ore lavorative per proporre data ritiro
- **Certificato rottamazione**: 24 ore dal ritiro
- **Radiazione PRA**: 15 giorni lavorativi dal ritiro
- **Trattativa commercianti**: rapida, non lasciare il cliente in attesa

## 1.4 Utenti della piattaforma

| Utente | Cosa fa | Come accede |
|---|---|---|
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, conferma data ritiro, chatta con NoiDemoliamo e con demolitore, lascia recensioni a fine pratica | Auto-registrazione fine flusso `/inizia` o `/vendi-auto` |
| **Demolitore** | Riceve assegnazioni, fissa ritiro, carica certificati rottamazione e PRA, chatta con cliente | Invito email da admin → imposta password |
| **Commerciante auto** | Vede aste auto disponibili, fa offerte, chatta con cliente per ritiro, scarica documenti operativi | Invito email da admin → imposta password |
| **Admin (Davide)** | Approva pratiche, gestisce destino, gestisce aste, recluta operatori, chatta con cliente | Login con email autorizzata `ddiviesto@gmail.com` |
| **Collaboratori** (officine, concessionarie, assicurazioni) | Inseriscono pratiche per conto dei loro clienti | Invito email da admin (futuro) |
| **Enti pubblici** (polizia locale, comuni) | Inseriscono veicoli abbandonati | Invito email da admin (futuro) |

⚠️ **Nota**: Davide non esclude che in futuro ce ne saranno altri (es. periti, gestori flotte aziendali). Architettura flessibile.

---

# 🛠️ PARTE 2 — STACK E AMBIENTE TECNICO

## 2.1 Stack

- **Frontend**: Next.js 16.2.6 (Turbopack) + React + TypeScript
- **Styling**: Tailwind CSS (no font custom — rimossi Geist Sans/Mono il 25/05/2026)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoidemoliaMo`
- **Live**: https://noi-demoliamo.vercel.app

## 2.2 Cartella locale e ambiente sviluppo

**Cartella progetto**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`

**Strumenti che Davide usa**:
- **VS Code** per editing (Ctrl+A → Ctrl+V → Ctrl+S, Ctrl+H per trova/sostituisci)
- **PowerShell** come terminale Windows
- **GitHub Desktop** OPPURE comandi PowerShell git che Claude gli prepara
- **Supabase SQL Editor** per query e modifiche DB
- **Browser Chrome** per testing (F12 → Ctrl+Shift+M per modalità mobile)
- **iPhone** per testing reale (Davide è su iPhone, PC è HP)

**Comandi essenziali**:
```powershell
# Avviare il server di sviluppo
npm run dev

# Creare nuovo file
New-Item -Path "app\percorso\file.tsx" -ItemType File

# Push veloce all in one
git add . ; git commit -m "messaggio" ; git push origin main

# Verificare contenuto cartella
dir app\dashboard

# Vedere struttura completa del progetto (salva in struttura.txt)
tree /F /A | findstr /V "node_modules" > struttura.txt
```

📁 **STRUTTURA COMPLETA DEL PROGETTO**: Davide ha il comando per generare l'albero completo con `tree /F /A`. Se la nuova chat ha bisogno della struttura esatta (con tutti i file), chiederla a Davide che genererà `struttura.txt` e potrà condividerla.

## 2.3 Variabili d'ambiente

### File `.env.local` (locale)
```
NEXT_PUBLIC_SUPABASE_URL=https://egsufeczoroxqnagzqfq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...   ⚠️ NOMINATA CORRETTAMENTE (con _API_ in mezzo)
GOOGLE_MAPS_SERVER_KEY=...            (server-side, per Distance Matrix + Geocoding)
SUPABASE_SERVICE_ROLE_KEY=...
```

⚠️ **Nota nomenclatura**: la variabile **DEVE** chiamarsi `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (non `NEXT_PUBLIC_GOOGLE_MAPS_KEY`) perché il pattern Next.js standard la richiede così.

### Su Vercel (produzione)
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurata correttamente
- ⚠️ **PENDING**: `GOOGLE_MAPS_SERVER_KEY` ancora da aggiungere su Vercel produzione

### Google Cloud Console
- ✅ Abilitata sia **Places API** che **Places API (New)** — entrambe necessarie
- ✅ Chiave browser limitata a referrer `noi-demoliamo.vercel.app/*` + `localhost:3000/*`

## 2.4 Supabase

**URL**: https://egsufeczoroxqnagzqfq.supabase.co
**Admin email hardcoded**: `ddiviesto@gmail.com`

### Buckets Storage attivi

| Bucket | Visibilità | Contenuto |
|---|---|---|
| `geojson-comuni` | Pubblico | 20 file GeoJSON regioni italiane (per mappa copertura demolitori) |
| `foto-pratiche` | Pubblico | Foto veicoli caricate dai clienti |
| `documenti-pratiche` | Privato | Libretto, certificato proprietà, carta identità, ecc. (signed URL 1h) |

### Policy RLS attive su Storage

- ✅ DELETE su `foto_pratiche` e `documenti` (solo proprietario pre-assegnazione)
- ✅ DELETE su `storage.objects` (usa `split_part(name, '/', 1)` per matchare pratica_id)
- ✅ Admin full access su tutte le tabelle

---

# 🗄️ PARTE 3 — DATABASE COMPLETO

## 3.1 Tabelle esistenti nel DB Supabase

Tutte queste tabelle sono già presenti e funzionanti:

`collaboratori`, `commercianti`, `demolitori`, `demolitori_comuni`, `documenti`, `documenti_approvazione`, `fatture`, `foto_pratiche`, `impostazioni`, `interessi_commercianti`, `messaggi`, `messaggi_chat`, `notifiche`, `pratiche`, `solleciti`, `utenti`, `veicoli_vendita`, `veicoli_vendita_foto`

Inoltre tabelle anagrafiche: `comuni`, `province`, `regioni` (intoccabili, usate per autocomplete e mappa).

## 3.2 Tabella `pratiche` — 46+ colonne

Tabella centrale del progetto. Contiene tutte le pratiche di demolizione.

**Colonne principali**:
- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo` (vedi valori sotto), `tipo_mezzo_altro` (text), `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`, **`tipo_cambio`** (text: manuale/automatico/non_so) 🆕
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng` ✅ (salvati da Google Maps Autocomplete), **`spazio_carro_attrezzi`** (text: libero/stretto/no), **`spazio_carro_attrezzi_note`** (text libero) 🆕
- **Cliente**: `codice_fiscale`, `nome_richiedente`, `telefono`, `ruolo_richiedente` (proprietario/delegato/deceduto)
- **Documenti dichiarati**: `libretto` (si/denuncia/no), `certificato_proprieta` (cartaceo/digitale/documento_unico/smarrito/nessuno) 🆕 esteso, `eredita` (accetta/rinuncia/null)
- **Workflow**: `demolitore_id`, `data_ritiro_prevista`, `data_certificato_rottamazione`, `data_certificato_pra`, `stato`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`, `assegnazione_manuale`

### Valori ammessi per `tipo_mezzo` (NO check constraint, text libero):
```
autovettura
motoveicolo      ← rinominato da 'motociclo' il 24/05/2026
ciclomotore
minicar
furgone          ← aggiunto 25/05/2026
imbarcazione
pullman
camion
velivolo
altro            ← se selezionato, vedere campo tipo_mezzo_altro per dettaglio testuale
```

### ⚠️ Vincoli CHECK confermati il 25/05/2026 (query pg_constraint):

Esistono CHECK solo su queste colonne:
- `pratiche_certificato_proprieta_check` → ANY (ARRAY['digitale','cartaceo','documento_unico','smarrito','nessuno']) 🆕 esteso 25/05
- `pratiche_eredita_check` → ANY (ARRAY['accetta','rinuncia',...])
- `pratiche_libretto_check` → ANY (ARRAY['si','denuncia','no',...])
- `pratiche_ruolo_richiedente_check` → ANY (ARRAY['proprietario','delegato',...])
- `pratiche_stato_check` → ANY (ARRAY['in_attesa_documenti', 'in_attesa_a...',...])

**Nessun CHECK** su `tipo_mezzo`, `tipo_cambio`, `spazio_carro_attrezzi` → si può salvare qualsiasi valore senza modificare DB.

### ⚠️ Da verificare/aggiungere in `pratiche`:
- `data_assegnazione` (da aggiungere se manca, serve per algoritmo)
- `data_ritiro_effettuato` (da aggiungere se manca, serve per algoritmo)

### SQL eseguito il 24/05/2026
```sql
ALTER TABLE pratiche
  ADD COLUMN tipo_cambio TEXT,
  ADD COLUMN spazio_carro_attrezzi TEXT,
  ADD COLUMN spazio_carro_attrezzi_note TEXT;
```

### SQL eseguito il 25/05/2026 (notte)
```sql
ALTER TABLE pratiche
  DROP CONSTRAINT IF EXISTS pratiche_certificato_proprieta_check;

ALTER TABLE pratiche
  ADD CONSTRAINT pratiche_certificato_proprieta_check
  CHECK (certificato_proprieta IN ('digitale', 'cartaceo', 'documento_unico', 'smarrito', 'nessuno'));
```

## 3.3 Tabella `documenti`

Contiene i documenti **ufficiali** caricati per ogni pratica (NON le foto del veicolo).

```
id            uuid          PK
pratica_id    uuid          FK → pratiche.id
tipo          text          es. 'carta_identita', 'tessera_sanitaria', 'libretto', 'certificato_proprieta', 'delega', ecc.
url           text          link pubblico al file su Storage
nome_file     text          nome originale del file
verificato    boolean       default false (legacy, ora sostituito da documenti_approvazione)
caricato_il   timestamp
```

⚠️ **Importante**: dal 22/05/2026 questa tabella supporta **più righe dello stesso `tipo`** per la stessa pratica (es. 2 foto per "libretto" = fronte + retro).

## 3.4 Tabella `foto_pratiche`

Foto **del veicolo** (esterno, interno, motore, ecc.). Diversa da `documenti`.

```
id             uuid          PK
pratica_id     uuid          FK → pratiche.id
url            text          link pubblico al file su Storage (bucket foto-pratiche)
caricato_il    timestamp
```

## 3.5 Tabella `documenti_approvazione`

Tracking granulare dell'approvazione di ogni documento/foto da parte dell'admin.

```
id                uuid          PK
pratica_id        uuid          FK → pratiche.id
tipo_documento    text          per documenti = tipo. Per foto veicolo = 'foto:<id_foto>'
stato             text          'approvato' | 'rifiutato' | 'in_attesa'
nota_admin        text          motivo del rifiuto (libero), nullable
creato_il         timestamp
aggiornato_il     timestamp
```

RLS: admin full access + cliente solo lettura.

## 3.6 Tabella `messaggi_chat`

Chat persistente tra cliente, admin, demolitore, commerciante.

```
id              uuid          PK
pratica_id      uuid          FK → pratiche.id
mittente_id     uuid          chi ha scritto (user_id)
mittente_tipo   text          'cliente' | 'admin' | 'demolitore' | 'commerciante'
testo           text
letto           boolean       default false
creato_il       timestamp
```

RLS: admin + cliente possono leggere/scrivere. Demolitore e commerciante in futuro.

⚠️ **Real-time non ancora implementato** — i messaggi appaiono solo ricaricando. Miglioria futura.

## 3.7 Tabella `impostazioni`

Chiave-valore per configurazioni globali.

Esempio attuale: `max_pratiche_aperte_demolitore=15`

## 3.8 Tabella `demolitori`

Anagrafica demolitori. Colonne usate dall'algoritmo: `id, ragione_sociale, indirizzo, citta, provincia, lat, lng, stato`.

## 3.9 Tabella `demolitori_comuni`

Copertura geografica demolitori.

```
demolitore_id   uuid          FK → demolitori.id
comune          text          nome (o codice) di regione/provincia/comune
provincia       text          provincia di riferimento
tipo            text          'regione' | 'provincia' | 'provincia_esclusa' | 'comune_incluso' | 'comune_escluso'
```

## 3.10 Altre tabelle rilevanti

- `utenti`: profilo utente (collegato a Supabase Auth via id)
- `veicoli_vendita`: pratiche del flusso D (vendita) — separate da `pratiche`
- `veicoli_vendita_foto`: foto delle pratiche di vendita

## 3.11 Tabelle ANCORA DA CREARE

- 🔥🆕 **`documenti_richiesti`** o **`pratica_documenti_checklist`** — Sistema casistiche documenti (vedi PARTE 8.2 STEP 1, dettagli da definire con Davide quando manda lista casistiche)
- 🆕 `recensioni` (id, pratica_id, cliente_id, demolitore_id, tipo, stelle, commento, creata_il)
- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `messaggi_preimpostati` (id, categoria, titolo, testo)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

---

# 🔄 PARTE 4 — I 4 FLUSSI DELLA PRATICA

## 4.1 Flusso A — Demolizione standard ✅ FUNZIONANTE

```
Cliente compila /inizia (12-13 mini-step) → crea account → carica documenti
   ↓
Admin riceve pratica in "in_attesa_approvazione"
   ↓
APPROVAZIONE DOCUMENTI (granulare, uno per uno)
   ↓
Quando TUTTI documenti ok → stato "da_assegnare", Step 2 sbloccato
   ↓
Admin sceglie: DEMOLIZIONE STANDARD
   ↓
2 MODALITÀ DI ASSEGNAZIONE:
  → AUTOMATICA: algoritmo sceglie il demolitore migliore (vedi 4.7)
  → MANUALE: admin sceglie a mano da mappa demolitori (vedi 4.8)
   ↓
Demolitore ha 8 ORE per proporre data/ora ritiro
   ↓
Cliente conferma/rifiuta (via chat in-app)
   ↓
Giorno del ritiro → demolitore clicca "✅ Veicolo ritirato"
   ↓
🆕 SISTEMA RECENSIONI (vedi 4.9):
   Cliente OBBLIGATO a lasciare 2 recensioni (demolitore + NoiDemoliamo)
   PRIMA di poter ricevere il certificato di rottamazione
   ↓
Demolitore ha 24 ORE per certificato rottamazione
   ↓
Demolitore ha 15 GIORNI per certificato radiazione PRA
   ↓
PRATICA COMPLETATA
```

## 4.2 Flusso B — Asta tra demolitori (DA COSTRUIRE)

Per auto interessanti dove vogliamo monetizzare di più.

```
Admin sceglie destino: ASTA DEMOLITORI
   ↓
Admin imposta: prezzo base, durata asta, demolitori invitati
   ↓
Demolitori vedono in dashboard "Aste aperte": foto, città, marca, anno, km, condizioni
(NO dati cliente, NO indirizzo completo)
   ↓
Demolitori fanno offerte ≥ prezzo corrente
   ↓
Scadenza → admin sceglie vincitore
   ↓
Vincitore → pratica assegnata, parte flusso A
Perdenti → notifica "asta chiusa"
Nessuno offre → admin rilancia o passa a standard
```

## 4.3 Flusso C — Vendita ai commercianti (DA COSTRUIRE)

**Strategia**: admin **prima** testa il mercato con i commercianti, **poi** se vede interesse contatta il cliente.

```
STEP 1 — Admin clicca "Proponi ai Commercianti"
Form admin: prezzo richiesto, somma cliente (opzionale), durata trattativa
   ↓
STEP 2 — Pratica visibile a TUTTI i commercianti (zona + fuori zona)
Vedono: foto + città + marca/modello/anno/km/condizioni
NO libretto, NO cert. proprietà, NO dati cliente
   ↓
STEP 3 — Commercianti fanno offerte
   ↓
STEP 4 — Se admin vede interesse → CONTATTA IL CLIENTE
"Abbiamo visto la sua auto, pensiamo possa valere la pena ripararla...
 Lei non spende nulla. [Eventuale +100€]"
   ↓
STEP 5A — Cliente ACCETTA:
  Admin sceglie commerciante vincitore
  Solo a lui: dati completi cliente + indirizzo
  Commerciante e cliente si organizzano via chat in-app
  Commerciante paga DIRETTAMENTE il cliente al ritiro
  Commerciante paga NoiDemoliamo il prezzo concordato
  PRATICA COMPLETATA

STEP 5B — Cliente RIFIUTA: pratica torna a flusso A
STEP 5C — Nessun commerciante: admin decide (NoiDemoliamo / demolizione / asta)
```

**Anti-furbi**: commerciante che bypassa NoiDemoliamo → disattivato → perde accesso futuro.

## 4.4 Flusso D — Vendita auto su richiesta cliente (DA COSTRUIRE)

```
Cliente clicca "Vendi auto" su home → /vendi-auto
   ↓
Cliente inserisce dati + foto + prezzo desiderato OPPURE "valutate voi"
   ↓
Algoritmo NoiDemoliamo calcola valutazione automatica
   ↓
Admin decide 3 casi:

┌─ AUTO IMPRESENTABILE: admin propone demolizione gratuita
├─ AUTO BUONA: asta tra COMMERCIANTI (flusso C)
└─ AUTO MOLTO BUONA: admin compra direttamente per NoiDemoliamo
```

DB: pratiche di vendita in `veicoli_vendita`, non in `pratiche`.

## 4.5 Migrazione tra flussi

- **Vendita → demolizione**: pratica copiata in `pratiche` con stato `da_assegnare`
- **Demolizione → vendita commercianti**: passa a flusso C
- **Demolizione → acquisto NoiDemoliamo**: admin compra (con OK cliente)

## 4.6 Stati pratica (in `pratiche.stato`)

```
# Pratiche di demolizione
in_attesa_documenti
in_attesa_approvazione_admin
documenti_parzialmente_approvati
da_assegnare

# Ramo demolizione standard
in_attesa_assegnazione
in_assegnazione_manuale
assegnata
in_attesa_conferma_cliente
ritiro_confermato
ritirata
in_attesa_recensione_cliente   🆕 (dopo ritiro, prima certificato)
in_attesa_cert_rottamazione
in_attesa_cert_radiazione_pra
completata

# Ramo asta demolitori
in_asta_demolitori
asta_demolitori_chiusa

# Ramo asta commercianti
in_proposta_commercianti
in_attesa_consenso_cliente
trattativa_commercianti_accettata
in_passaggio_proprieta
passaggio_completato

# Ramo acquisto diretto
acquistata_da_noidemoliamo

# Comuni
annullata
```

## 4.7 Algoritmo di assegnazione AUTOMATICA

Implementato in `lib/assegnazione.ts` + endpoint `/api/assegna-pratica/route.ts`.

⚠️ **STATO**: codice scritto ma **DA REVISIONARE E TESTARE INSIEME**.

### Funzionamento

```
1. CONTROLLA prerequisiti (comune + provincia + lat/lng)
2. TROVA demolitori che coprono il comune (regole da demolitori_comuni)
3. FILTRA solo stato='attivo'
4. ESCLUDE saturi (oltre max_pratiche_aperte_demolitore, default 15)
5. CALCOLA distanza stradale (Google Distance Matrix in batch)
6. CALCOLA velocità storica (media giorni tra data_assegnazione e data_ritiro_effettuato
   sulle ultime 20 pratiche completate. Default 999 se 0 pratiche)
7. ORDINA per: velocità → distanza → pratiche aperte
8. RESTITUISCE vincitore + lista completa per debug
```

### ⚠️ Cose da fixare insieme

1. **Velocità storica**: codice usa `data_certificato_rottamazione` ma deve usare `data_ritiro_effettuato`. Fix in `lib/assegnazione.ts`.
2. **Colonne da verificare/aggiungere in `pratiche`**: `data_assegnazione`, `data_ritiro_effettuato` (lat/lng già presenti)
3. **Colonna `stato` in `demolitori`** — verificare esista
4. **Pesi dello scoring**: aggiungere **media recensioni** come fattore (dopo creato sistema recensioni)
5. **Fallback nessun demolitore**: endpoint deve mettere pratica in `in_assegnazione_manuale`

## 4.8 Assegnazione MANUALE (DA COSTRUIRE) 🆕

Admin vuole SEMPRE poter assegnare lui stesso, anche quando l'algoritmo automatico è disponibile.

### Funzionamento

```
Admin clicca "Demolizione standard"
   ↓
Modale con 2 opzioni:
  → 🤖 Assegnazione automatica
  → 🗺️ Scelgo io il demolitore
   ↓
Se "Scelgo io": apre MAPPA INTERATTIVA con:
  - Pin del cliente (indirizzo di ritiro)
  - Pin di TUTTI i demolitori attivi
  - Etichetta: ragione_sociale + città
  - Colorazione:
      verde = copre il comune del cliente
      giallo = NON copre (zona scoperta)
      grigio = saturo
  - Linea distanza diretta dal cliente
   ↓
Admin clicca demolitore → card laterale con:
  - Dati anagrafici (ragione sociale, indirizzo, telefono)
  - Distanza dal cliente
  - Pratiche aperte attuali
  - Velocità storica
  - 🆕 Media recensioni clienti
  - Bottone "Assegna a questo demolitore"
   ↓
Conferma → pratica assegnata, stato → 'assegnata'
```

### Componenti da costruire
- Modale di scelta automatica/manuale (in `/admin/pratiche/[id]/page.tsx`)
- Componente `MappaSceltaDemolitore.tsx`
- Endpoint API per assegnazione manuale (update semplice su `pratiche`)

## 4.9 Sistema RECENSIONI (DA COSTRUIRE) 🆕

Cliente lascia **2 recensioni a fine pratica**: una per il demolitore, una per NoiDemoliamo. **OBBLIGATORIE** prima del certificato di rottamazione → altissima percentuale di review.

### Workflow

```
Demolitore clicca "✅ Veicolo ritirato"
   ↓
Pratica entra in stato 'in_attesa_recensione_cliente'
   ↓
Cliente riceve notifica (in-app + SMS) "Hai 2 recensioni da lasciare"
   ↓
Cliente apre dashboard pratica → banner BLOCCANTE:
  "Per ricevere il certificato di rottamazione, lascia le tue recensioni"
   ↓
Pagina recensioni mostra 2 card:
  1. RECENSIONE DEMOLITORE
     - Stelle 1-5 (obbligatorio)
     - Commento libero (opzionale)
  2. RECENSIONE NOIDEMOLIAMO
     - Stelle 1-5 (obbligatorio)
     - Commento libero (opzionale)
   ↓
Cliente compila e invia → entrambe salvate in tabella `recensioni`
   ↓
Pratica passa a 'in_attesa_cert_rottamazione' (sblocca il certificato)
   ↓
🆕 STRATEGIA MARKETING (gestita da admin):
   - Se recensione NoiDemoliamo ≥ 4 stelle: email/SMS automatico con
     "Ci aiuti? Recensiscici su Google Maps [link]"
   - Se ≤ 3 stelle: solo interna, NO push verso Google Maps
   - Davide deciderà piattaforme target (Google Maps / Trustpilot / altri)
```

### Database

Nuova tabella `recensioni`:
```
id              uuid          PK
pratica_id      uuid          FK → pratiche.id
cliente_id      uuid          FK → utenti.id
demolitore_id   uuid          FK → demolitori.id (null se è recensione NoiDemoliamo)
tipo            text          'demolitore' | 'noidemoliamo'
stelle          int           1-5
commento        text          libero, nullable
creata_il       timestamp
```

### Integrazioni

- **Algoritmo assegnazione (4.7)**: media recensioni demolitore = fattore di scoring
- **Dashboard demolitore**: visualizza propria media + recensioni ricevute
- **Pagina pubblica**: recensioni 5 stelle come social proof in homepage
- **Strategia spinta canali esterni**: Davide deciderà workflow (email automatica, SMS, popup)

---

# 📂 PARTE 5 — STRUTTURA PROGETTO E PAGINE

## 5.1 Albero principale (approssimativo)

```
NoiDemoliamo/
├── app/
│   ├── page.tsx                              # Home pubblica
│   ├── layout.tsx                            # Layout root (no font Geist, viewport anti-zoom)
│   ├── globals.css                           # Tailwind globale
│   ├── login/page.tsx                        # Login multi-ruolo
│   ├── inizia/                               # Flusso cliente mini-step
│   │   ├── page.tsx                          # Orchestratore (banner blu + 12-13 step)
│   │   └── steps/
│   │       ├── StepTipoVeicolo.tsx           # Step 1: griglia 4+4 tipo veicolo (con Furgone)
│   │       ├── StepIdentificaVeicolo.tsx     # Step 2: anno, km, marca, modello
│   │       ├── StepCambioVeicolo.tsx         # Step 3: tipo cambio (solo per auto/minicar/camion/furgone)
│   │       ├── StepCondizioniVeicolo.tsx     # Step 4: 4 toggle + annotazioni
│   │       └── AutocompleteIndirizzo.tsx     # Google Maps autocomplete custom
│   ├── dashboard/                            # AREA CLIENTE
│   │   ├── page.tsx                          # Lista pratiche cliente
│   │   └── [id]/
│   │       ├── page.tsx                      # Dettaglio pratica (3 tab)
│   │       ├── TabDocumenti.tsx              # Tab 1
│   │       ├── TabStato.tsx                  # Tab 2
│   │       └── TabChat.tsx                   # Tab 3
│   ├── admin/
│   │   ├── page.tsx                          # Dashboard admin
│   │   ├── copertura/page.tsx                # Mappa Italia
│   │   ├── demolitori/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── MappaComuni.tsx
│   │   └── pratiche/
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── DocumentiApprovazione.tsx
│   └── api/
│       └── assegna-pratica/route.ts
├── lib/
│   ├── supabase.ts
│   └── assegnazione.ts
├── types/
│   └── pratica.ts                            # ⚠️ TipoMezzo: motoveicolo, +furgone, +TipoCambio, +SpazioCarroAttrezzi, +CdcStato esteso
├── public/
│   ├── NoiDemoliamoLogo.png
│   ├── province.geojson
│   └── regioni.geojson
├── .env.local
├── ARCHITETTURA.md
└── package.json
```

⚠️ **Per la struttura PRECISA e completa** (con TUTTI i file di TUTTE le sottocartelle), Davide può fornirla generandola con `tree /F /A | findstr /V "node_modules" > struttura.txt`.

## 5.2 Flusso `/inizia` dettagliato — REFACTORATO 24-25/05/2026 ⭐⭐

### Nuovo ordine 12-13 mini-step (mobile-first, una sola cosa per pagina)

```
Step 1 — TIPO VEICOLO ⭐ con box "Pensiamo a tutto noi" sopra
  • Griglia 4+4 (8 celle): Autovettura, Motoveicolo, Ciclomotore, Minicar | Furgone, Pullman, Camion, Altro
  • "Altro" espande con: Imbarcazione, Velivolo, Altro mezzo (3 colonne basse, h-[78px])
  • Quando "Altro mezzo" selezionato: campo testuale "Specifica" → ovunque appare quel testo (es. "trattore")
  • Bottone "Continua" appare solo dopo selezione

Step 2 — IDENTIFICA VEICOLO
  • Anno (con tastiera numerica)
  • Chilometri (con formattazione automatica 180.000)
  • Marca + Modello

Step 3 — CAMBIO VEICOLO ⚠️ SALTATO per moto/ciclomotore/imbarcazione/velivolo
  • Manuale / Automatico / Non lo so
  • 3 card grandi con icone SVG

Step 4 — CONDIZIONI VEICOLO
  • Toggle: incidentato/a (rosso=Sì), marciante (verde=Sì),
            va in moto (verde=Sì), parti mancanti (rosso=Sì)
  • Annotazioni opzionali (textarea)

Step 5 — INDIRIZZO + SPAZIO CARRO ATTREZZI
  • Google Maps autocomplete custom (UI NoiDemoliamo)
  • Dopo conferma indirizzo → box azzurro "Spazio carro attrezzi":
    - 3 pillole colorate (verde=Libero / giallo=Stretto / rosso=Non passa)
    - Textarea note libere (es. "Cancello largo 2,5m")

Step 6 — TARGA (normalizzata: solo A-Z e 0-9, no spazi/simboli)
Step 7 — CODICE FISCALE (validazione live 0/16 caratteri + colore + check ✓)
Step 8 — FOTO veicolo (camera + galleria + sheet popup + + gamification 4 foto)
Step 9 — RUOLO (proprietario / delegato / deceduto) ⭐ design pro con icone SVG
Step 10 — EREDITÀ (solo se ruolo=deceduto, accetta/rinuncia)
Step 11 — LIBRETTO (sì / denuncia / no, 3 opzioni con icone SVG)
Step 12 — CDC ⭐ 5 OPZIONI (digitale / cartaceo / documento_unico / smarrito / nessuno)
Step 13 — ANAGRAFICA (nome + telefono, NO banner "ritiro gratuito")
Step 14 — ACCOUNT ⭐⭐ design CALOROSO finale
  • Titolo "Ultimo passo! 🎉"
  • 3 trust badges (Area personale | Chat demolitore | Certificato di rottamazione)
  • Email + Password
  • Bottone "Conferma e invia richiesta"
  • Box azzurro "Cosa succede dopo":
    1. Email di conferma
    2. Entro un'ora verifichiamo i documenti
    3. Ti contattiamo per fissare il ritiro a domicilio
  • Disclaimer terms + privacy
```

**Documenti SEMPRE richiesti** (caricamento successivo in dashboard):
- Carta d'identità (fronte e retro)
- Tessera sanitaria (fronte e retro)

**Documenti CONDIZIONALI** (in base alle risposte) — vedi PARTE 8.2 STEP 1 per sistema casistiche da costruire.

### ⭐ Personalizzazione dinamica per tipo veicolo

Quando il cliente sceglie il tipo al passo 1, **tutto il flusso si adatta**:

- **Banner blu** dell'header: "Identifica: Motoveicolo", "Cambio: Camion", "Condizioni: Pullman", "Indirizzo: Imbarcazione", "Targa: Velivolo", ecc.
- **Titoli pagina h1**: "Identifica l'autovettura", "Che tipo di cambio ha il motoveicolo?", "Dove si trova l'imbarcazione?", "Hai il libretto del camion?"
- **Toggle veicolo**: "Autovettura **incidentata**?" (femminile) vs "Motoveicolo **incidentato**?" (maschile)
- **Pronome possessivo**: "La **tua autovettura** è intestata a me" / "L'autovettura è intestata a me"
- **Se tipo='altro' con tipoAltro="trattore"**: ovunque appare "il trattore" / "del trattore" / "Trattore"
- **Generi corretti** gestiti dalla funzione `isFemminile(tipo)`:
  - Femminile: autovettura, minicar, imbarcazione
  - Maschile: motoveicolo, ciclomotore, furgone, pullman, camion, velivolo, altro

### Layout banner blu

Il banner blu in cima alla card del flusso `/inizia` contiene:
- **Sinistra**: bottone "← Indietro" (sfondo bianco 85% + testo blu)
- **Centro**: icona veicolo specifica + "PASSO X DI N" + titolo dinamico

Al passo 1 (veicolo non ancora scelto), icona = autovettura generica + titolo "Tipo di veicolo".

### Helper functions in `app/inizia/page.tsx`

```ts
articolo(tipo, tipoAltro?)       → "il motoveicolo", "l'autovettura", "il trattore" (se altro)
articoloDel(tipo, tipoAltro?)    → "del motoveicolo", "dell'autovettura", "del trattore"
pronomeTuo(tipo, tipoAltro?)     → "tuo motoveicolo", "tua autovettura", "tuo trattore"
nomeVeicolo(tipo, tipoAltro?)    → "Motoveicolo", "Autovettura", "Trattore"
isFemminile(tipo)                → autovettura/minicar/imbarcazione = femminile
veicoloHaCambio(tipo)            → true per auto/minicar/furgone/pullman/camion/altro
ICONE_VEICOLO                    → mappa tipo → componente SVG per banner
getStepMeta(step, tipo, tipoAltro?) → restituisce { icona, titoloBanner, titoloPagina, sottoPagina }
```

### 🆕 OTTIMIZZAZIONI MOBILE 25/05/2026 ⭐⭐⭐

Critiche per UX. Davide testa su iPhone reale.

**1. Anti-zoom iOS**
- Tutti gli input hanno `text-base` (16px). Sotto 16px iOS Safari zoomma in automatico → confusione.
- Anche label e placeholder hanno colori espliciti (`text-gray-400` placeholder, `text-gray-900` testo) per leggibilità su iPhone.

**2. inputMode corretti per tastiera mobile**
- `inputMode="numeric"` (anno, km) → tastierino numerico
- `inputMode="tel"` (telefono) → tastiera telefonica
- `inputMode="email"` (email) → tastiera con @

**3. NO scrollIntoView automatico** (rimosso 25/05/2026)
- Causava effetto **"sobbalzo doppio"** su iOS: prima Safari aggiustava, poi il nostro JS faceva un altro scroll.
- I mini-step sono corti, Safari basta da solo.

**4. Bottone "Continua" SEMPRE attivo**
- Mai disabilitato/grigio (confonde l'utente).
- Se clicchi senza completare → appare banner errore rosso + scroll alla sezione mancante + bordo rosso sui campi/opzioni mancanti.
- L'errore scompare automaticamente appena l'utente compila/seleziona.

**5. Viewport meta tag** (in `app/layout.tsx`)
```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",   // barra browser mobile blu = effetto app
}
```

**6. Lang italiano** (in html tag) — accessibilità + SEO

### 🆕 NORMALIZZAZIONE INPUT 25/05/2026

Per evitare problemi futuri di ricerca admin:

- **Targa**: `.toUpperCase().replace(/[^A-Z0-9]/g, '')` → "DD 454 ED" → "DD454ED" salvato in DB
- **CF**: `.toUpperCase().replace(/[^A-Z0-9]/g, '')` → "rss-mra-80a01h501z" → "RSSMRA80A01H501Z"
- **CF validazione live**: contatore 0/16 a destra, messaggio dinamico a sinistra ("Mancano X caratteri" / "✓ Codice fiscale valido"), bordo verde quando completo, errore se clicchi Continua con != 16 caratteri
- **Km**: formattazione automatica con separatore migliaia (180000 → "180.000") via `formatKm()` helper. In DB salvato come numero puro

### 🆕 STEP FOTO REFACTORATO 25/05/2026

Vecchio: emoji giganti 📷 🖼️ ℹ️, bottone "non le ho" grande blu (sbagliato psicologicamente).

Nuovo:
- **Icone SVG eleganti** dentro bollini blu (coerente col design system)
- **2 bottoni in riga** (uno sotto l'altro) con freccia → a destra (più tappabili)
- **Info badge** compatto con barra blu a sinistra
- **Anteprime foto** con ✕ rosso per rimuovere
- **Badge verde "✓ Pronte"** quando hai caricato foto
- **🆕 Bottone "+"** in griglia per aggiungere altre foto (appare come ultima cella)
- **🆕 Sheet popup stile iOS** che esce dal basso quando clicchi "+" → 2 opzioni grandi (Scatta/Galleria) + Annulla. Animazioni: fade-in sfondo scuro + slide-up sheet. Si chiude cliccando fuori.

**🆕 Psicologia gamification foto:**
- **0 foto**: bottone "Continua senza foto" bianco/grigio (secondario)
- **1-3 foto**: banner GIALLO "Ottimo inizio! Aggiungi almeno X altre foto (frontale, posteriore, laterali, abitacolo)" + bottone "Continua comunque" piccolo/grigio
- **4+ foto**: banner VERDE "Perfetto! Hai caricato un buon numero" + bottone "Continua" BLU GRANDE (premio)

Risultato: l'utente è invogliato a caricare 4-5 foto invece di 1.

### 🆕 STEP RUOLO/LIBRETTO/CDC REFACTORATI 25/05/2026 (notte)

Stesso problema delle foto: emoji giganti, design vecchio. Riscritti con:
- **Nuovo componente `RuoloButton`** con icona SVG dentro bollino blu, check ✓ blu prominente quando selezionato
- **Step RUOLO**: 3 opzioni (proprietario / delegato / deceduto), grammatica corretta ("rispetto all'autovettura" + genere automatico), icona deceduto = cuore pieno (rispettoso)
- **Step LIBRETTO**: 3 opzioni con icone SVG (libretto check / lente con stemma / documento ?)
- **Step CDC**: ⭐ ESTESO a **5 opzioni**:
  - Sì, Digitale (fascicolo elettronico)
  - Sì, Cartaceo (stemma ACI)
  - Sì, Documento Unico (libretto post-2020)
  - No, ho la denuncia di smarrimento in originale
  - No, non ho nessuno di questi al momento

### 🆕 GOOGLE MAPS AUTOCOMPLETE CUSTOM 25/05/2026

Riscritto da `<gmp-place-autocomplete>` standard (UI brutta default) a componente custom con `AutocompleteSuggestion` API (Places New):

- Input identico al resto del form (sfondo grigio chiaro, icona 🔍, font 16px, testo `text-gray-900`)
- Dropdown con animazione fluida slide-down
- Ogni suggerimento: icona pin blu + indirizzo principale + città/CAP
- Evidenziazione testo cercato con `<mark>` blu
- Navigazione tastiera (frecce ↑↓, Enter, Esc)
- Spinner caricamento, hover blu chiaro
- Chiusura on click fuori
- Stessi dati salvati: indirizzo, comune, provincia, cap, lat, lng

## 5.3 Pagine FATTE ✅

### Home `/` (app/page.tsx)
Logo, bottoni "Richiedi demolizione" + "Accedi", pills benefit, sfondo sfumato.

### Login `/login`
Email + password, redirect per ruolo. Demolitore/commerciante DA AGGIUNGERE.

### Flusso `/inizia` — REFACTORATO 24-25/05/2026 ⭐⭐
Vedi sezione 5.2 dettagliata.

### Area cliente — DASHBOARD (rifatta 22/05/2026) ⭐

**`/dashboard`** — Lista pratiche cliente con topbar blu, card pratiche, empty state.

**`/dashboard/[id]`** — Dettaglio pratica:
- Topbar sticky + freccia + targa + badge stato sobrio
- Banner stato dinamico (gradient)
- 3 Tab grandi (60px) con icone SVG: Documenti, Stato, Chat
- Pallino rosso SOLO per attenzione richiesta

**Tab Documenti**: barra progresso, documenti dinamici, 4 stati per documento, galleria foto veicolo, X rossa eliminazione foto + popup conferma (visibile solo pre-assegnazione), miniature 80x80 dei documenti con anteprima (immagini + PDF via `<object>`), signed URLs (durata 1h) per documenti nel bucket privato, modale anteprima a tutta pagina con `<iframe>` per PDF.

**Tab Stato**: timeline verticale 5 step + dati veicolo collassabile, badge stato professionali con SVG (no emoji), icona demolitore SVG carro attrezzi.

**Tab Chat**: 2 sub-tab (NoiDemoliamo + Demolitore), bolle WhatsApp, chat persistente.

### Area admin

**`/admin`** — Dashboard con stats e filtri.

**`/admin/copertura`** — Mappa strategica Italia.

**`/admin/demolitori`** + `/admin/demolitori/[id]` — Gestione demolitori con MappaComuni.

**`/admin/pratiche/[id]`** — Dettaglio pratica con:
- Step 1: approvazione granulare documenti/foto
- Step 2: 4 card destino
- ⚠️ DA AGGIUNGERE: chat funzionante con messaggi_chat

## 5.4 Backend / API

**`/api/assegna-pratica/route.ts`** — Endpoint algoritmo assegnazione (DA REVISIONARE).

## 5.5 Verifica PRA ACI — ABBANDONATA per ora

Analisi tentata il 22/05/2026 (file `procedura_verifica_fermo_amministrativo_.docx` caricato in chat).

**Sito target**: `https://iservizi.aci.it/verificatipocdp/`
**POST endpoint**: `https://iservizi.aci.it/verificatipocdp/faces/index.xhtml`

Form fields JSF analizzati:
- `invioForm:targa`, `invioForm:tipo` (A=autoveicolo, M=motoveicolo, R=rimorchio)
- `invioForm:codFisc`, `invioForm:htk`
- `invioForm_SUBMIT`, `javax.faces.ViewState`, `invioForm:sendButton`
- `invioForm:recaptchaResponse` ⚠️

**Bloccante**: presenza reCAPTCHA v3 invisibile + a volte challenge immagini → **non automatizzabile** lato server.

**Opzioni future**:
1. Bookmarklet Chrome / estensione Chrome per compilazione automatica con captcha manuale
2. Openapi.it Visura Targa PRA (~6€/chiamata) — soluzione a pagamento

**Decisione**: lasciare stare per ora, riprendere quando il flusso cliente sarà stabile.

---

# 🎨 PARTE 6 — DESIGN SYSTEM

> Approvato il 22/05/2026 sulla dashboard cliente. Esteso il 24-25/05/2026 con design `/inizia` mobile-first.

## 6.1 Colori principali

- **Blu navy primario** (topbar dashboard, sub-header, tab attivi): `#0d2144`
- **Blu primario** (bottoni CTA, link, banner): `bg-blue-600` con hover `bg-blue-700`
- **Banner blu gradient** (`/inizia`): `bg-gradient-to-r from-[#1d4ed8] to-[#2563eb]`
- **Theme color mobile** (barra browser): `#2563eb`
- **Sfondo dashboard**: `bg-[#f0f4f8]`
- **Sfondo flusso `/inizia`**: `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` (sfumato blu/viola)
- **Bianco card**: `bg-white` con `border border-gray-200`

## 6.2 Colori secondari per stati

- **Verde** (azione positiva per il veicolo, successo): `bg-green-50`, `border-green-300`, `text-green-700`
- **Giallo/Ambra** (in attesa, attenzione): `bg-amber-50`, `border-amber-200`, `text-amber-800`
- **Rosso** (problema, errore, attenzione): `bg-red-50`, `border-red-300`, `text-red-700`
- **Grigio** (neutro): `bg-gray-50`, `border-gray-200`, `text-gray-500`
- **Azzurro chiaro sky** (info / "cosa succede dopo"): `bg-sky-50`, `border-sky-200`, `text-sky-800`

### Convenzione colori per toggle Sì/No nel flusso `/inizia`

I toggle hanno **colore semantico** in base a cosa significa la risposta per il veicolo:
- **Verde = risposta positiva** per il veicolo (es. marciante=Sì, va in moto=Sì)
- **Rosso = problema** per il veicolo (es. incidentato=Sì, parti mancanti=Sì)

### Convenzione spazio carro attrezzi

- **Verde** "Accesso libero" (con ✓)
- **Ambra/Giallo** "Spazio stretto" (con ⚠️)
- **Rosso** "Non passa" (con 🚫)

## 6.3 Tipografia

- **Font**: default sistema (Tailwind sans), **NO font custom** (rimossi Geist 25/05/2026)
- **Titoli pagina**: `text-xl font-semibold text-gray-900` (in `/inizia`) o `text-xl font-bold` (in dashboard)
- **Titoli card**: `text-sm font-semibold text-gray-800`
- **Body**: `text-sm text-gray-700`
- **Caption/hint**: `text-xs text-gray-500`
- **Micro testo**: `text-[10px]` o `text-[11px]`

### ⚠️ REGOLA MOBILE CRITICA
- **Tutti gli input/textarea** devono avere `text-base` (16px) — sotto questa soglia iOS Safari zoomma.
- **Tutti gli input** devono avere `text-gray-900` esplicito (testo digitato) e `placeholder:text-gray-400` (placeholder) — altrimenti iOS rende il testo trasparente/illeggibile.

## 6.4 Componenti standard

### Topbar dashboard (sticky)
- `bg-[#0d2144] px-4 py-3`
- Logo + nome a sx, contesto centro, badge stato sobrio a dx

### Banner blu flusso `/inizia` ⭐ AGGIORNATO 24/05/2026
- `-mx-7 -mt-7 mb-5 px-4 py-3 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] rounded-t-3xl`
- **Layout**: [Bottone Indietro] [icona + step + titolo centrati]
- Bottone Indietro: `bg-white/85 hover:bg-white text-blue-700 rounded-lg px-3 py-1.5 text-xs font-semibold`
- Icona contenuta in box `w-10 h-10 bg-white/20 rounded-xl`
- Step counter: `text-[10px] font-semibold uppercase tracking-widest text-blue-100`
- Titolo: `text-sm font-semibold` (es. "Identifica: Motoveicolo")

### Box rassicurante "Pensiamo a tutto noi" (`/inizia` step 1) 🆕
- `bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-3 mb-5 flex items-center gap-3`
- Icona cerchio blu (w-11 h-11) con check bianco
- Titolo "Pensiamo a tutto noi" + sottotitolo "In base alle tue risposte ti diremo quali documenti preparare"
- Solo nello step 1, sparisce dagli step successivi

### Trust badges (`/inizia` step account) 🆕
- `grid grid-cols-3 gap-2 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-3 mb-4`
- 3 colonne: bollino bianco con icona blu + testo "Segui la pratica" / "Chat demolitore" / "Certificato di rottamazione"
- Comunica i benefit dell'account in modo visivo e immediato

### Box "Cosa succede dopo" (`/inizia` step account) 🆕
- `bg-sky-50 border border-sky-200 rounded-xl p-3 mt-1`
- 3 step numerati con pallini sky (1, 2, 3): "Email di conferma" → "Entro un'ora verifichiamo i documenti" → "Ti contattiamo per fissare il ritiro a domicilio"
- Comunica chiaramente cosa aspettarsi dopo l'invio della richiesta

### Card
- `bg-white border border-gray-200 rounded-2xl p-4` (dashboard)
- `bg-white rounded-3xl shadow-lg p-7` (flusso `/inizia`, più morbida)

### Banner stato dinamico (dashboard)
- `bg-gradient-to-br from-COLORE-600 to-COLORE-800`
- Emoji 3xl + titolo bold + sottotitolo opacità 90%

### Bottoni
- **CTA primario**: `bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-xs`
- **CTA primario `/inizia`**: `bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-base active:scale-[0.99]`
- **CTA secondario**: `bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50`
- **CTA secondario `/inizia`** (es. "Continua senza foto"): `bg-white text-gray-600 border-[1.5px] border-gray-200`
- **CTA pericolo**: `bg-red-600 hover:bg-red-700 text-white`
- ⚠️ **NO disabled grigio** in `/inizia` — sempre attivo, valida al click

### Banner errore (`/inizia`)
- Componente `ErrorBadge`: `bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800` con icona ⚠️ a sx
- Box sezione errore: `border-red-300 bg-red-50/40 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]`

### Componente RuoloButton (`/inizia` ruolo/libretto/cdc) 🆕
- Usato in Step Ruolo, Libretto, CDC per uniformità
- Layout: bollino blu con icona SVG (w-10 h-10) | label + sub | check rotondo a destra
- Quando selezionato: bordo blu + sfondo blu chiaro + check blu pieno con ✓ bianco
- Selezione VISIBILE e immediata (vs. vecchio pallino vuoto poco evidente)

### Toggle compatti `/inizia`
- Riga orizzontale: etichetta sinistra + pillole Sì/No destra
- Pill: `flex items-center justify-center gap-1 px-4 py-2 rounded-full text-sm font-semibold border-[1.5px] transition-all min-w-[58px]`
- Selezionato verde: `bg-green-100 border-green-300 text-green-800`
- Selezionato rosso: `bg-red-100 border-red-300 text-red-800`
- Non selezionato: `bg-white border-gray-200 text-gray-600`

### Griglia tipo veicolo `/inizia`
- `grid grid-cols-4 gap-2` per i 7 base + Altro (4+4 totale)
- Item: `aspect-square flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-[1.5px]`
- Selezionato: `border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] text-blue-700`
- Check pallino blu in alto a destra
- Espansione "Altri tipi di mezzo": `grid grid-cols-3 gap-2` con item `h-[78px]` (non aspect-square, più bassi)

### Tab bar
- Container: `bg-white border border-gray-200 rounded-2xl p-1 flex gap-1`
- Tab attivo: `bg-[#0d2144] text-white`
- Tab inattivo: `bg-transparent text-gray-500 hover:bg-gray-50`

### Sheet popup stile iOS (`/inizia` step foto) 🆕
- Overlay: `fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200`
- Sheet: `bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300`
- Handle in cima: `w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4`
- Click fuori → chiude
- Click dentro → no chiude (`onClick={e => e.stopPropagation()}`)

### Icone
- **SVG inline** preferito alle emoji
- Emoji ok solo: banner stato, empty state, messaggi, titoli celebrativi ("Ultimo passo! 🎉")
- Icone veicoli `/inizia`: 10 icone SVG specifiche (Iconify material-symbols, font-awesome) — fornite da Davide
- Icona carro attrezzi: SVG custom con linee verticali ai lati che indicano "passaggio"
- Icona deceduto: cuore pieno (rispettoso, memoriale)

### Form input ⭐ AGGIORNATO 25/05/2026
- `border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400`
- ⚠️ `text-base` (16px) obbligatorio per anti-zoom iOS
- ⚠️ `text-gray-900` per leggibilità su iPhone
- ⚠️ `placeholder:text-gray-400` per visibilità placeholder

### Validazione live (es. CF)
- Contatore `0/16` a destra (`font-mono`)
- Messaggio dinamico a sinistra che cambia colore (grigio → ambra → verde con ✓)
- Bordo input rosso se invalido, normale se in progress, normale anche se perfetto

## 6.5 Spaziatura

- Container max: `max-w-2xl mx-auto px-3 py-3` (dashboard mobile-first)
- Card `/inizia`: `max-w-md p-7`
- Gap tra card: `gap-3` (12px)
- Gap interno card: `gap-2` (8px)

## 6.6 Regole d'oro

1. **Mobile-first**: touch-friendly (min 44px altezza)
2. **No emoji nell'interfaccia funzionale**: SVG colorati per icone (eccezione: titoli celebrativi come "Ultimo passo! 🎉")
3. **Coerenza colori semantici**: verde=positivo, rosso=problema, blu=azione, giallo/ambra=attesa
4. **Personalizzazione tipo veicolo OVUNQUE** (banner, titoli, articoli, generi)
5. **Genere corretto** per aggettivi (incidentato/a)
6. **Stato sempre visibile**
7. **Empty state amichevole**: icona grande + frase rassicurante + CTA
8. **Bottoni grandi nei flussi**: `py-4 rounded-xl` per CTA finali
9. ⭐ **Input `text-base` (16px) + `text-gray-900` + `placeholder:text-gray-400`** sempre (anti-zoom iOS + leggibilità)
10. ⭐ **Bottoni `/inizia` mai disabilitati**: sempre attivi, validazione al click con banner errore
11. ⭐ **Una sola cosa per pagina** in `/inizia` (mini-step): meglio 13 step velocissimi di 10 lunghi
12. ⭐ **Gamification dove possibile**: caricamento foto con banner colorati che incoraggiano
13. ⭐ **NO scrollIntoView automatico** su input: i mini-step sono corti, Safari gestisce da solo (rimosso 25/05 per eliminare sobbalzo iOS)
14. ⭐ **Trust badges e box "cosa succede dopo"** sulla pagina finale: cliente sa cosa aspettarsi, riduce ansia post-invio
15. ⭐ **Niente trattini "—" nei titoli bottoni**: poco professionali, usare titoli puliti con sub-descrizioni sotto

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 Stile di lavoro preferito

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede**
- **Risposte compatte, no preamboli**
- **File completi sostituibili** preferiti ("ridammi tutto il codice") MA per modifiche piccole preferisce **Ctrl+H** (Trova e Sostituisci) — è veloce e meno rischioso
- **"UI"** non significa nulla → spiegare "come appare la pagina"
- **Si confonde tra concetti tecnici** → spiegare con analogie
- **Comandi PowerShell** dati come stringhe pronte da copiare
- **Anteprime visive** (con tool visualize/mockup) quando si cambia design — Davide le adora
- **Test su iPhone vero**: Davide ha iPhone, fa screenshot, li manda su WhatsApp Web da telefono → li passa qui

## 7.2 Stack interazione

- **Editor**: VS Code → Ctrl+A → Ctrl+V → Ctrl+S (per file completi) OPPURE Ctrl+H (Trova e Sostituisci, per modifiche chirurgiche)
- **Terminale**: PowerShell di VS Code
- **Git**: GitHub Desktop OPPURE comandi PowerShell git che Claude prepara
- **DB**: Supabase SQL Editor
- **Test mobile**: iPhone reale via `noi-demoliamo.vercel.app` (non funziona localhost)

## 7.3 Sequenza di lavoro tipica

```
1. Davide dice cosa serve
2. Claude può fare 1-3 domande con ask_user_input_v0 se ci sono scelte
3. Per cambi di design, Claude mostra anteprima visuale (visualize:show_widget)
4. Per modifiche piccole/medie: Claude dà istruzioni Ctrl+H Trova/Sostituisci
   Per modifiche grandi: Claude dà file completo con create_file + present_files
5. Davide applica le modifiche
6. Ricarica pagina (Ctrl+F5)
7. Manda screenshot o descrive a parole
8. Claude verifica/corregge
9. Push:
   git add . ; git commit -m "..." ; git push origin main
10. Davide testa su iPhone reale (mai localhost da telefono)
11. Quando funziona, prossimo task
```

## 7.4 Convenzioni di file

- File completi sostituibili preferiti ai patch per modifiche grandi
- Modifiche chirurgiche con Ctrl+H per piccole modifiche
- Spiegazioni in italiano, codice misto
- Loop infinito / errori React → consigliare `npm run dev`
- Errori TypeScript "always true" su funzioni Google Maps → cache TS Server, fare **Ctrl+Shift+P → TypeScript: Restart TS Server**
- Errori "module has no exported member 'X'" → spesso il file è vuoto, controllare contenuto

## 7.5 Segnali Explorer VS Code

- **"M" verde**: modificato non salvato. Davide deve fare Ctrl+S.
- **"U" verde**: nuovo non in git
- **"M" arancione**: modificato salvato, da committare
- **Numero rosso "PROBLEMS"** in basso: errori TypeScript
- **Riquadri tratteggiati rossi/verdi nel codice**: anteprima diff modifiche non committate (Git inline diff). Si chiude con X o Esc.

## 7.6 Note operative

- Davide non ricorda sempre dove sono i file → indicare percorso completo
- Quando si crea file nuovo, dare ESATTAMENTE comando PowerShell
- Limiti immagini chat → suggerire nuova chat dopo molti screenshot
- Errori RLS minori: gli interessano poco se non bloccano
- Davide chiede spesso "fammi anteprima" prima di toccare codice
- Davide non ha Android → si fida del codice oppure userà Chrome DevTools / amici / BrowserStack per verificare

---

# 📋 PARTE 8 — STATO ATTUALE (25/05/2026 — notte tardi)

## 8.1 ✅ FATTO

### Frontend pubblico
- ✅ Home pubblica con design pulito
- ✅ Flusso `/inizia` 12-13 mini-step + auto-registrazione
- ✅ Upload foto VERO su Supabase Storage
- ✅ Login multi-ruolo base

### ⭐⭐ Refactoring completo `/inizia` (24-25/05/2026)
- ✅ **Tipo veicolo come step 1**: griglia 4+4 con FURGONE + espansione "Altro" animata (Imbarcazione, Velivolo, Altro mezzo)
- ✅ **Spezzato dettagli veicolo in 3 mini-step**: Identifica, Cambio, Condizioni
- ✅ **Mini-step principio**: una sola cosa per pagina (mobile-first)
- ✅ **Personalizzazione dinamica per tipo veicolo**: banner, icone, titoli, articoli, generi
- ✅ **TipoAltro mostrato ovunque**: se utente scrive "Trattore", in tutte le schede appare "il trattore" / "del trattore" / "Trattore"
- ✅ **Box "Pensiamo a tutto noi"** nello step 1 (rassicurazione)
- ✅ **Banner blu gradient** con bottone Indietro a sx + icona+titolo centrati
- ✅ **10 icone SVG specifiche** per veicoli (Iconify)
- ✅ **Toggle con colori semantici** (verde=positivo, rosso=problema)
- ✅ **Genere corretto** per "incidentato/a"
- ✅ **Sfondo gradiente blu/viola**
- ✅ **Rimossi bottoni "Non ricordo"** su targa, CF, indirizzo (ora obbligatori)
- ✅ **Motociclo rinominato Motoveicolo** ovunque
- ✅ **Google Maps Autocomplete custom** (UI NoiDemoliamo)

### ⭐⭐ Mobile-first ottimizzazioni 25/05/2026
- ✅ **Anti-zoom iOS**: `text-base` (16px) su tutti gli input
- ✅ **inputMode corretti**: numeric (anno/km), tel (telefono), email
- ✅ **NO scrollIntoView** automatico (eliminato sobbalzo iOS)
- ✅ **Viewport meta tag**: width=device-width, no scaling
- ✅ **Theme color blu**: barra browser mobile blu (effetto app)
- ✅ **Lang italiano**: html lang="it"
- ✅ **Metadata professionali** per NoiDemoliamo
- ✅ **Rimossi font Geist** inutili (warning preload risolti)
- ✅ **Testo digitato leggibile**: `text-gray-900` + `placeholder:text-gray-400` ovunque
- ✅ **Bottoni "Continua" mai disabilitati**: validazione al click con banner errore
- ✅ **Bordo rosso + glow** sulle sezioni mancanti quando si clicca Continua
- ✅ **Scroll automatico** alla sezione errore

### ⭐⭐ Nuovi campi & validazioni (24-25/05/2026)
- ✅ **Tipo cambio** (Manuale/Automatico/Non lo so) in step dedicato
  - Saltato per moto/ciclomotore/imbarcazione/velivolo
- ✅ **Spazio carro attrezzi** (libero/stretto/no) dentro step indirizzo
  - 3 pillole colorate + textarea note libere
  - Icona carro attrezzi con linee verticali ai lati (passaggio)
- ✅ **Targa normalizzata**: solo A-Z e 0-9, no spazi/simboli (ricerca admin affidabile)
- ✅ **CF normalizzato**: solo A-Z e 0-9
- ✅ **CF validazione live**: contatore 0/16 + messaggio dinamico + colore + bordo
- ✅ **Km formattazione automatica**: 180000 → "180.000" mentre digiti

### ⭐⭐ Step foto refactorato 25/05/2026
- ✅ **Icone SVG** invece di emoji giganti
- ✅ **2 bottoni in riga** con freccia → (più tappabili)
- ✅ **Info badge** compatto con barra blu a sx
- ✅ **Anteprime foto** con ✕ rosso
- ✅ **Badge verde "✓ Pronte"**
- ✅ **Bottone "+"** in griglia per aggiungere altre foto
- ✅ **Sheet popup stile iOS** con scelta Scatta/Galleria
- ✅ **Psicologia gamification**: banner giallo se < 4 foto, verde se ≥ 4
- ✅ **Bottone primario blu solo dopo 4+ foto**
- ✅ **Testo "frontale, posteriore, laterali, abitacolo"** aggiunto nel banner giallo

### ⭐⭐ Step Ruolo/Libretto/CDC refactorati 25/05/2026 (notte)
- ✅ **Nuovo componente `RuoloButton`** uniforme: icona SVG in bollino blu + label + sub + check ✓ blu
- ✅ **Step Ruolo**: grammatica corretta ("rispetto all'autovettura" + genere "intestata/o"), icona deceduto = cuore pieno
- ✅ **Step Libretto**: 3 opzioni con icone SVG (libretto check / lente con stemma / documento ?)
- ✅ **Step CDC**: ESTESO a 5 opzioni (digitale, cartaceo, **documento_unico** [nuovo], smarrito con denuncia, **nessuno** [nuovo]). CHECK DB aggiornato.
- ✅ **Niente trattini "—" nei titoli bottoni** (puliti)

### ⭐⭐ Step Anagrafica + Account refactorati 25/05/2026 (notte)
- ✅ **Anagrafica**: rimosso banner ridondante "Ritiro completamente gratuito"
- ✅ **Account caloroso**: titolo "Ultimo passo! 🎉" + 3 trust badges (Area personale, Chat demolitore, Certificato rottamazione) + box "Cosa succede dopo" (Email → Verifica entro 1h → Ritiro a domicilio) + disclaimer terms

### Area cliente — DASHBOARD (22/05/2026)
- ✅ Dashboard lista pratiche
- ✅ Dettaglio pratica con 3 tab
- ✅ Banner stato dinamico
- ✅ Tab Documenti con upload fronte/retro + bottoni inline
- ✅ X rossa eliminazione foto + popup conferma (pre-assegnazione)
- ✅ Miniature 80x80 con anteprima (immagini + PDF)
- ✅ Modale anteprima a tutta pagina
- ✅ Signed URLs 1h per bucket privato
- ✅ Tab Stato con timeline 5 step
- ✅ Tab Chat con sub-tab NoiDemoliamo + Demolitore
- ✅ Chat persistente su `messaggi_chat`
- ✅ Pallino rosso solo per attenzione
- ✅ Badge stato professionali con SVG
- ✅ Icona demolitore SVG carro attrezzi

### Area admin
- ✅ Dashboard admin con stats e filtri
- ✅ Pagina dettaglio pratica con approvazione granulare
- ✅ Step 2 destino (4 card, demolizione standard collegata)
- ✅ Gestione demolitori completa
- ✅ MappaComuni 3 layer
- ✅ Mappa strategica `/admin/copertura`
- ✅ 20 file GeoJSON regioni su Storage

### Backend / DB
- ✅ Tabelle `documenti_approvazione` e `messaggi_chat` con RLS
- ✅ Bucket `foto-pratiche` + `documenti-pratiche` + policy
- ✅ Policy RLS Supabase per DELETE foto/documenti pre-assegnazione
- ✅ Algoritmo assegnazione — DA REVISIONARE
- ✅ Google Maps Server Key creata e limitata
- ✅ Google Maps Browser Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) configurata
- ✅ Schema `pratiche` esteso con lat/lng/cap_ritiro
- ✅ Schema `pratiche` esteso 24/05: `tipo_cambio`, `spazio_carro_attrezzi`, `spazio_carro_attrezzi_note`
- ✅ CHECK `certificato_proprieta` esteso 25/05: aggiunti `documento_unico` e `nessuno`
- ✅ Verifica: nessun CHECK constraint su `tipo_mezzo` (24/05/2026)

## 8.2 ⏳ PENDING — In ordine di priorità

### 🔥🔥🔥 STEP 1 — SISTEMA CASISTICHE DEMOLIZIONE + DOCUMENTI DINAMICI 🆕 (NUOVO PRIORITARIO 25/05/2026)

**Davide sta preparando** una lista completa delle casistiche di demolizione con la documentazione richiesta per ogni casistica. Quando torna manderà tutto.

#### Cosa servirà fare insieme (in ordine):

**1.1 Analisi casistiche da Davide**
- Leggere la lista completa che Davide manda
- Capire ogni casistica (es. "proprietario vivente con libretto e CDC cartaceo" / "proprietario deceduto con libretto + atto notarile accettazione eredità" / ecc.)
- Per ogni casistica capire QUALI documenti il cliente deve preparare al ritiro
- Capire QUALI documenti sono **da spuntare** (checklist semplice) e QUALI **da caricare** (upload PDF/foto)

**1.2 Possibile modifica `/inizia`**
- Forse alcune casistiche richiedono **nuove domande** nel flusso per essere identificate correttamente
- Capire se servono nuovi step o nuovi campi nei step esistenti
- Esempi possibili: "Hai delega notarile?", "Sei coniuge superstite?", "Esiste atto di accettazione eredità?", ecc.

**1.3 Database — Sistema casistiche/documenti**

Probabile struttura nuova:

```sql
-- Tabella che mappa casistica → documenti richiesti
CREATE TABLE casistiche_documenti (
  id uuid PRIMARY KEY,
  codice_casistica text NOT NULL,    -- es. 'proprietario_vivente_libretto_cdc_cartaceo'
  nome_documento text NOT NULL,       -- es. 'Carta d\'identità del proprietario'
  descrizione text,                   -- es. 'Fronte e retro, leggibile'
  tipo_azione text NOT NULL,          -- 'spunta' | 'upload'
  obbligatorio boolean DEFAULT true,
  ordine int DEFAULT 0
);

-- Tabella che tiene lo stato per ogni pratica
CREATE TABLE pratica_documenti_checklist (
  id uuid PRIMARY KEY,
  pratica_id uuid REFERENCES pratiche(id),
  casistica_documento_id uuid REFERENCES casistiche_documenti(id),
  stato text DEFAULT 'da_fare',       -- 'da_fare' | 'spuntato' | 'caricato'
  file_url text,                      -- se tipo_azione='upload'
  spuntato_il timestamp,
  caricato_il timestamp
);

-- O alternativa più semplice: tabella unica
```

**Davide e Claude decideranno insieme** la struttura definitiva quando torna.

**1.4 Dashboard cliente — Pagina dedicata documenti per ritiro**
- Vista clean con checklist documenti da preparare per il ritiro
- Per ogni doc: ✓ "fatto" o pulsante upload
- Barra progresso "X/Y documenti pronti"
- Notifica quando tutto pronto: "Sei pronto per il ritiro!"

**1.5 Integrazione con admin**
- Admin deve poter vedere stato preparazione del cliente
- Quando cliente carica nuovo PDF, admin viene notificato per verificare

---

### 🔥 STEP 2 — FINIRE LA DASHBOARD CLIENTE

Quando finito il sistema casistiche (STEP 1), tornare alla dashboard cliente per:

1. **Testare visivamente la tab Stato** (timeline) con una pratica vera
2. **Testare la tab Chat con il Demolitore** (3 stati: prima/durante/dopo)
3. **Testare caricamento file vero** → verificare che arrivi in admin
4. **"0 pratiche" → "Nessuna pratica"** nella lista (cosmetico)
5. **Mostrare nuovi campi** (`tipo_cambio`, `spazio_carro_attrezzi`, `documento_unico`) nella dashboard

### 🔥 STEP 3 — PAGINA ADMIN DETTAGLIO PRATICA

6. **Sistemare `/admin/pratiche/[id]`**:
   - Aggiungere box chat funzionante (usare `messaggi_chat`)
   - Admin vede SEMPRE tutte le chat
   - Sub-tab admin: cliente↔NoiDemoliamo, cliente↔demolitore
   - **Mostrare nuovi campi**: tipo_cambio, spazio_carro_attrezzi, spazio_carro_attrezzi_note, certificato_proprieta esteso

### 🔥 STEP 4 — REVISIONE ALGORITMO + ASSEGNAZIONE MANUALE

7. **Rivedere insieme algoritmo** (vedi PARTE 4.7):
   - Fix velocità storica (`data_assegnazione` → `data_ritiro_effettuato`)
   - Aggiungere colonne mancanti in `pratiche` (data_assegnazione, data_ritiro_effettuato)
   - Verificare colonna `stato` in `demolitori`
   - Aggiungere media recensioni come fattore scoring (dopo sistema recensioni)
   - Discutere altri criteri

8. **Costruire assegnazione MANUALE** (vedi PARTE 4.8)
9. **Testare bottone "Demolizione standard"** con demolitore di test
10. **Migrare GOOGLE_MAPS_SERVER_KEY su Vercel** (per Distance Matrix)

### 🔥 STEP 5 — SISTEMA RECENSIONI 🆕 (vedi PARTE 4.9)

11. **Creare tabella `recensioni`** + RLS
12. **Aggiungere stato `in_attesa_recensione_cliente`** al CHECK constraint
13. **Pagina recensioni cliente** (banner bloccante prima certificato)
14. **Integrare con notifiche** (in-app + SMS)
15. **Media recensioni nella card demolitore** in mappa assegnazione manuale
16. **Media recensioni come fattore algoritmo** automatico
17. **Strategia push verso Google Maps** (Davide deciderà workflow)

### 🆕 STEP 6 — TEST CROSS-PLATFORM ANDROID

18. **Verificare flusso su Android reale**: Davide non ha Android. Opzioni:
    - Chrome DevTools (Pixel 7 / Galaxy S20)
    - Amici/familiari con Android via WhatsApp link
    - BrowserStack (browser Android reale, gratis 30min/giorno)
    - Cose da verificare: tastiera numerica, scroll input, popup sheet foto, autocomplete maps

### 🔜 STEP SUCCESSIVI

19. **Verifica PRA ACI** — riprendere con approccio bookmarklet/estensione Chrome (vedi 5.5)
20. **Pagina dedicata "Polizia Locale veicoli abbandonati"** per casi targhe smarrite (futuro)
21. **Sistema invito email demolitore + `/imposta-password`**
22. **Login multi-ruolo completo** (demolitore + commerciante)
23. **Dashboard demolitore** `/dashboard-demolitore`
24. **Sistema notifiche in-app** (campanella, badge, popup, web push)
25. **Sistema SMS** (Twilio)
26. **Sistema messaggi preimpostati** admin
27. 🆕 **PWA**: installazione app su home screen iPhone/Android (manifest.json + service worker)
    - Beneficio: il cliente apre l'app dall'icona, non vede più la barra browser, esperienza 100% nativa
28. 🆕 **Push notifications native** (web push) per recensioni, messaggi, aggiornamenti pratica

### 🔮 PROSSIMI FLUSSI

29. **Flusso B — Asta demolitori**
30. **Flusso C — Proponi ai commercianti**
31. **Flusso "Compra per NoiDemoliamo"**
32. **Flusso D — Vendita auto** `/vendi-auto`

### 🏪 AREA COMMERCIANTI

33. **Dashboard commerciante** 6 sezioni
34. **Mappa commercianti** `/admin/copertura-commercianti`

### 🛠️ ALTRI

35. **Sistema fatturazione automatica**
36. **Statistiche e report admin**
37. **Dashboard collaboratori ed enti pubblici** (futuro lontano)

## 8.3 ⚠️ Problemi noti / cosmetici

- **Errore RLS minore** in `/inizia` (NON blocca)
- **Console "1 Issue"** generica → da indagare
- **`tree /F /A`** può essere lento su Windows con node_modules grande
- **Test Android**: non testato realmente, solo su iPhone

## 8.4 ⏰ PROMEMORIA SCADENZE FUTURE

- 🗓️ **30 OTTOBRE 2026 — Supabase Data API change**: Dal 30/10/2026 Supabase applicherà una nuova regola di sicurezza ai progetti esistenti: le NUOVE tabelle nello schema "public" NON saranno più esposte automaticamente alla Data API (PostgREST/GraphQL/supabase-js). Servirà un `GRANT` esplicito.
  - ⚠️ Le tabelle ATTUALI (`pratiche`, `documenti`, `foto_pratiche`, ecc.) continuano a funzionare, NON serve fare nulla per loro.
  - ⚠️ Quando si creano tabelle NUOVE dopo il 30/10/2026 (es. `recensioni`, `casistiche_documenti`, `aste`), ricordarsi di aggiungere il GRANT esplicito dopo la CREATE TABLE.
  - Esempio: `GRANT SELECT, INSERT, UPDATE, DELETE ON nome_tabella TO authenticated, anon;` (poi attivare RLS come sempre).
  - Email ricevuta da Supabase il 27/05/2026. Riferimento: Security Advisor nella dashboard Supabase.

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

1. **Velocità** è il principio cardine sopra tutto
2. **Approvazione documenti**: granulare, non in blocco
3. **Tempistica comunicata al cliente**: "Entro un'ora" (in step finale Account, sezione "Cosa succede dopo")
4. **Documenti tutti uguali nell'UI**: tutti hanno ✓ e ✗
5. **Pagamento commerciante → cliente**: diretto al ritiro
6. **Commercianti vedono**: foto + città (no indirizzo, no dati cliente, no libretto/cert)
7. **Strategia "Proponi ai commercianti"**: prima testo mercato, POI contatto cliente
8. **Eventuale +100€ al cliente**: quando "mangia la foglia"
9. **Slot documenti operativi commercianti**: contratto + delega + PDF
10. **Chat in-app, niente telefono**
11. **Admin vede SEMPRE tutte le chat**. Cliente non vede più demolitore dopo cert rottamazione
12. **Chat persistente DB** (`messaggi_chat`). Real-time = miglioria futura
13. **Mobile-first** sempre, iPhone è il device principale di test
14. **Upload**: 2 opzioni "Scatta foto" + "Carica file". NO 3a
15. **Documenti dinamici** in base a /inizia + casistica (STEP 1 prossimo PENDING)
16. **Doc identità/libretto**: fronte + retro in 1 slot (anche PDF unico)
17. **Assegnazione SEMPRE su scelta**: automatica o manuale da mappa
18. **Velocità storica demolitore**: da `data_assegnazione` a `data_ritiro_effettuato`
19. **Recensioni OBBLIGATORIE**: cliente lascia 2 recensioni (demolitore + NoiDemoliamo) dopo ritiro effettuato e PRIMA di ricevere certificato. Strategia: push positive verso Google Maps / altri canali
20. **Recensioni come fattore algoritmo**: media recensioni demolitore influenza posizione
21. **Personalizzazione dinamica per tipo veicolo** in `/inizia`: l'esperienza del cliente è interamente adattata al tipo di mezzo scelto (icone, titoli, articoli grammaticali, generi)
22. **"Motoveicolo" anziché "Motociclo"**: terminologia più ampia
23. **Tipo veicolo come PRIMO step**: il cliente sa subito che il flusso funziona anche per moto/imbarcazione/camion/ecc.
24. **Targa, CF, indirizzo OBBLIGATORI**: rimossi bottoni "Non ricordo" — meglio sapere subito se cliente non ha i dati base
25. **Verifica PRA ACI**: abbandonata per ora (reCAPTCHA). Riprendere con bookmarklet o Openapi.it
26. **Mini-step principio**: una sola cosa per pagina è meglio. 13 step velocissimi > 10 step lunghi
27. **Bottoni `/inizia` SEMPRE attivi**: mai disabilitati. Click senza compilare = banner errore rosso + scroll a sezione + bordo rosso. Più educativo del "click che non fa nulla"
28. **Normalizzazione input**: targa e CF salvati senza spazi/simboli (`DD454ED`, `RSSMRA80A01H501Z`). Critico per ricerca admin futura
29. **Formattazione km**: 180000 mostrato come 180.000 (leggibilità), salvato come numero puro
30. **Validazione live CF 16 caratteri**: contatore + colore + messaggio dinamico. Feedback istantaneo riduce errori
31. **Spazio carro attrezzi**: legato all'indirizzo, non al veicolo. Dato critico per il demolitore (camion entra nel cortile?)
32. **Tipo cambio**: solo per auto/minicar/furgone/pullman/camion/altro. Saltato per moto/imbarcazione/velivolo
33. **Psicologia gamification foto**: banner colorati invogliano l'utente a caricare 4+ foto invece di 1. Tecnica del "premio"
34. **Sheet popup stile iOS**: pattern moderno (WhatsApp/Telegram/Instagram) per scelta multipla
35. **Theme color blu** (`#2563eb`): la barra browser mobile diventa blu, effetto "app vera"
36. 🆕 **CDC 5 opzioni**: digitale, cartaceo, documento unico (post-2020), smarrito con denuncia, nessuno. Coprire TUTTI i casi reali
37. 🆕 **Furgone aggiunto** come tipo veicolo separato (artigiani, traslocatori, attività chiuse hanno tanti furgoni vecchi da rottamare)
38. 🆕 **TipoAltro mostrato ovunque**: se l'utente scrive "Trattore", tutto il flusso usa "il trattore" / "del trattore" / "Trattore" automaticamente. Coccola UX
39. 🆕 **NO scrollIntoView** automatico sugli input mobile: causava sobbalzo iOS. Mini-step corti = Safari gestisce da solo
40. 🆕 **Step Account "caloroso"**: trust badges + "Cosa succede dopo" + tempistica "Entro un'ora" + "ritiro a domicilio". Last impression conta
41. 🆕 **No trattini "—" nei titoli bottoni**: poco professionali. Titolo pulito + sub-descrizione sotto
42. 🆕🆕 **Sistema casistiche documenti** (PROSSIMO LAVORO): per ogni casistica di demolizione il cliente vede la lista documenti specifici da preparare, con checklist + upload. Vedi STEP 1 in PARTE 8.2

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA CHAT

> Istruzioni per Claude nella nuova chat dopo aver letto questo file.

1. **Leggi TUTTO questo file**, poi conferma a Davide di aver capito
2. **Riprendi dal punto 8.2 PENDING** nell'ordine: STEP 1 (sistema casistiche documenti) → STEP 2 (dashboard) → STEP 3 (admin chat) → STEP 4 (algoritmo/manuale) → STEP 5 (recensioni)
3. **Chiedi sempre a Davide quali aspetti specifici** vuole finire prima
4. **Rispetta il design system** della parte 6 in TUTTE le pagine nuove
5. **Rispetta le regole MOBILE CRITICHE**: input `text-base` + `text-gray-900` + `placeholder:text-gray-400`, mai bottoni disabilitati nei flussi, mai scrollIntoView automatico
6. **Stile comunicazione** della parte 7 (passo-passo, no preamboli, Ctrl+H per modifiche piccole, file completi per grandi)
7. **Mostra anteprime visuali** prima di toccare codice quando si cambia design
8. **Quando crei nuovi file**, aggiorna mentalmente questo doc (a fine sessione, chiedi a Davide di aggiornare)
9. **Non assumere mai cose nuove**: se non sei sicuro, chiedi
10. **Se hai bisogno della struttura PRECISA del progetto** (con tutti i file): chiedi a Davide di generarla con `tree /F /A | findstr /V "node_modules" > struttura.txt` e di condividerla
11. **GitHub push**: Davide preferisce un comando all-in-one da PowerShell:
    ```
    git add . ; git commit -m "..." ; git push origin main
    ```
12. **Mobile testing**: Davide testa su iPhone reale (non localhost da telefono). Per Android non ha device, può usare Chrome DevTools / amici / BrowserStack

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **GitHub**: ddiviesto/NoidemoliaMo
- **URL live**: https://noi-demoliamo.vercel.app
- **Supabase URL**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`
- **Davide device principale**: iPhone (test mobile) + HP PC (sviluppo)

---

**Fine documento. Ultimo aggiornamento: 25 maggio 2026 (notte tardi).**