# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al **24 maggio 2026**.
> Questo è l'unico file da leggere per capire dove siamo, dove andiamo, e come si lavora.

---

# 📍 PARTE 1 — IDENTITÀ DEL PROGETTO

## 1.1 Cosa è NoiDemoliamo

Piattaforma italiana di **demolizione auto gratuita** per il privato.
Il cliente:
1. Va su `noi-demoliamo.vercel.app`
2. Compila un flusso di 10 step (`/inizia`)
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
- **Approvazione documenti**: entro 3 ore dall'invio del cliente
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
- **Styling**: Tailwind CSS (no font custom, default sans)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoidemoliaMo`
- **Live**: https://noi-demoliamo.vercel.app

## 2.2 Cartella locale e ambiente sviluppo

**Cartella progetto**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`

**Strumenti che Davide usa**:
- **VS Code** per editing (Ctrl+A → Ctrl+V → Ctrl+S)
- **PowerShell** come terminale Windows
- **GitHub Desktop** per commit/push (NON terminale git)
- **Supabase SQL Editor** per query e modifiche DB (apre tab nuova "+")
- **Browser Chrome** per testing

**Comandi essenziali**:
```powershell
# Avviare il server di sviluppo
npm run dev

# Creare nuovo file
New-Item -Path "app\percorso\file.tsx" -ItemType File

# Creare nuova cartella
mkdir "app\nuova-cartella"

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

## 3.2 Tabella `pratiche` — 43+ colonne

Tabella centrale del progetto. Contiene tutte le pratiche di demolizione.

**Colonne principali**:
- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo` (vedi valori sotto), `tipo_mezzo_altro` (text), `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng` ✅ (salvati da Google Maps Autocomplete)
- **Cliente**: `codice_fiscale`, `nome_richiedente`, `telefono`, `ruolo_richiedente` (proprietario/delegato/deceduto)
- **Documenti dichiarati**: `libretto` (si/denuncia/no), `certificato_proprieta` (cartaceo/digitale/smarrito), `eredita` (accetta/rinuncia/null)
- **Workflow**: `demolitore_id`, `data_ritiro_prevista`, `data_certificato_rottamazione`, `data_certificato_pra`, `stato`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`, `assegnazione_manuale`

### Valori ammessi per `tipo_mezzo` (NO check constraint, text libero):
```
autovettura
motoveicolo      ← rinominato da 'motociclo' il 24/05/2026
ciclomotore
minicar
imbarcazione
pullman
camion
velivolo
altro            ← se selezionato, vedere campo tipo_mezzo_altro per dettaglio testuale
```

### ⚠️ Vincoli CHECK confermati il 24/05/2026 (query pg_constraint):

Esistono CHECK solo su queste colonne:
- `pratiche_certificato_proprieta_check` → ANY (ARRAY['digitale','cartaceo',...])
- `pratiche_eredita_check` → ANY (ARRAY['accetta','rinuncia',...])
- `pratiche_libretto_check` → ANY (ARRAY['si','denuncia','no',...])
- `pratiche_ruolo_richiedente_check` → ANY (ARRAY['proprietario','delegato',...])
- `pratiche_stato_check` → ANY (ARRAY['in_attesa_documenti', 'in_attesa_a...',...])

**Nessun CHECK** su `tipo_mezzo` → si può salvare qualsiasi valore senza modificare DB.

### ⚠️ Da verificare/aggiungere in `pratiche`:
- `data_assegnazione` (da aggiungere se manca, serve per algoritmo)
- `data_ritiro_effettuato` (da aggiungere se manca, serve per algoritmo)

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
Cliente compila /inizia (10 step) → crea account → carica documenti
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
│   ├── layout.tsx                            # Layout root
│   ├── globals.css                           # Tailwind globale
│   ├── login/page.tsx                        # Login multi-ruolo
│   ├── inizia/                               # Flusso cliente 10 step
│   │   ├── page.tsx                          # Orchestratore (banner blu + 10 step)
│   │   └── steps/
│   │       ├── Step1Indirizzo.tsx            # (legacy, non più usato come step 1)
│   │       ├── Step3Veicolo.tsx              # Step VEICOLO (ora step 1 effettivo)
│   │       └── AutocompleteIndirizzo.tsx     # Google Maps autocomplete
│   ├── dashboard/                            # AREA CLIENTE
│   │   ├── page.tsx                          # Lista pratiche cliente
│   │   └── [id]/
│   │       ├── page.tsx                      # Dettaglio pratica (3 tab)
│   │       ├── TabDocumenti.tsx              # Tab 1
│   │       ├── TabStato.tsx                  # Tab 2
│   │       ├── TabChat.tsx                   # Tab 3
│   │       └── UploadDocumentoModal.tsx      # (legacy, non usato)
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
│   └── pratica.ts                            # ⚠️ TipoMezzo: motoveicolo NON motociclo
├── public/
│   ├── NoiDemoliamoLogo.png
│   ├── province.geojson
│   └── regioni.geojson
├── .env.local
├── ARCHITETTURA.md
└── package.json
```

⚠️ **Per la struttura PRECISA e completa** (con TUTTI i file di TUTTE le sottocartelle), Davide può fornirla generandola con `tree /F /A | findstr /V "node_modules" > struttura.txt`.

## 5.2 Flusso `/inizia` dettagliato — REFACTORATO 24/05/2026 ⭐

### Nuovo ordine 10 step (veicolo come PRIMO step)

```
Step 1 — VEICOLO (tutto in una pagina):
  • Tipo mezzo (griglia 4+3): Autovettura, Motoveicolo, Ciclomotore, Minicar |
                              Pullman, Camion, Altro
                              + Altro espande con: Imbarcazione, Velivolo, Altro mezzo
  • Anno + KM
  • Marca + Modello
  • Toggle: incidentato/a (rosso=Sì), marciante (verde=Sì),
            va in moto (verde=Sì), parti mancanti (rosso=Sì)
  • Annotazioni opzionali

Step 2 — INDIRIZZO (Google Maps autocomplete, salva lat/lng/comune/provincia/cap)
Step 3 — TARGA
Step 4 — CODICE FISCALE
Step 5 — FOTO veicolo (camera + galleria)
Step 6 — RUOLO (proprietario / delegato / deceduto)
Step 7 — EREDITÀ (solo se ruolo=deceduto, accetta/rinuncia)
Step 8 — LIBRETTO (sì / denuncia smarrimento / no)
Step 9 — CDC (digitale / cartaceo / smarrito)
Step 10 — ANAGRAFICA (nome + telefono)
Step 11 — ACCOUNT (email + password, auto-registrazione)
```

**Documenti SEMPRE richiesti** (caricamento successivo in dashboard):
- Carta d'identità (fronte e retro)
- Tessera sanitaria (fronte e retro)

**Documenti CONDIZIONALI** (in base alle risposte) — logica in `documentiRichiesti(p)` di `TabDocumenti.tsx`.

### ⭐ Personalizzazione dinamica per tipo veicolo

Quando il cliente sceglie il tipo al passo 1, **tutto il flusso si adatta**:

- **Banner blu** dell'header: "Indirizzo: Autovettura", "Targa: Motoveicolo", "Foto: Pullman", "Libretto: Camion" (con icona specifica del veicolo)
- **Titoli pagina h1**: "Dove si trova **la tua autovettura**?", "Qual è la targa **del motoveicolo**?", "Hai il libretto **dell'imbarcazione**?"
- **Toggle veicolo**: "Autovettura **incidentata**?" (femminile) vs "Motoveicolo **incidentato**?" (maschile)
- **Pronome possessivo**: "Il **tuo motoveicolo** è intestato a me"
- **Generi corretti** gestiti dalla funzione `isFemminile(tipo)`:
  - Femminile: autovettura, minicar, imbarcazione
  - Maschile: motoveicolo, ciclomotore, pullman, camion, velivolo, altro

### Layout banner blu

Il banner blu in cima alla card del flusso `/inizia` contiene:
- **Sinistra**: bottone "← Indietro" (sfondo bianco 85% + testo blu)
- **Centro**: icona veicolo specifica + "PASSO X DI 10" + titolo dinamico

Al passo 1 (veicolo non ancora scelto), icona = pin generico + titolo "Tipo di veicolo".

### Helper functions in `app/inizia/page.tsx`

```ts
articolo(tipo)       → "il motoveicolo", "l'autovettura", "la minicar"
articoloDel(tipo)    → "del motoveicolo", "dell'autovettura", "della minicar"
pronomeTuo(tipo)     → "tuo motoveicolo", "tua autovettura"
nomeVeicolo(tipo)    → "Motoveicolo", "Autovettura" (capitalizzato per banner)
ICONE_VEICOLO        → mappa tipo → componente SVG per banner
TITOLI_VEICOLO       → mappa tipo → titolo banner
getStepMeta(step, tipo) → restituisce { icona, titoloBanner, titoloPagina, sottoPagina }
```

## 5.3 Pagine FATTE ✅

### Home `/` (app/page.tsx)
Logo, bottoni "Richiedi demolizione" + "Accedi", pills benefit, sfondo sfumato.

### Login `/login`
Email + password, redirect per ruolo. Demolitore/commerciante DA AGGIUNGERE.

### Flusso `/inizia` — REFACTORATO 24/05/2026 ⭐
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

> Approvato il 22/05/2026 sulla dashboard cliente. Esteso il 24/05/2026 con design `/inizia`.

## 6.1 Colori principali

- **Blu navy primario** (topbar dashboard, sub-header, tab attivi): `#0d2144`
- **Blu primario** (bottoni CTA, link, banner): `bg-blue-600` con hover `bg-blue-700`
- **Banner blu gradient** (`/inizia`): `bg-gradient-to-r from-[#1d4ed8] to-[#2563eb]`
- **Sfondo dashboard**: `bg-[#f0f4f8]`
- **Sfondo flusso `/inizia`**: `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` (sfumato blu/viola)
- **Bianco card**: `bg-white` con `border border-gray-200`

## 6.2 Colori secondari per stati

- **Verde** (azione positiva per il veicolo): `bg-green-50`, `border-green-300`, `text-green-700`
- **Giallo** (in attesa): `bg-yellow-50`, `border-yellow-200`, `text-yellow-700`
- **Rosso** (problema, errore, attenzione): `bg-red-50`, `border-red-300`, `text-red-700`
- **Grigio** (neutro): `bg-gray-50`, `border-gray-200`, `text-gray-500`

### Convenzione colori per toggle Sì/No nel flusso `/inizia`

I toggle hanno **colore semantico** in base a cosa significa la risposta per il veicolo:
- **Verde = risposta positiva** per il veicolo (es. marciante=Sì, va in moto=Sì)
- **Rosso = problema** per il veicolo (es. incidentato=Sì, parti mancanti=Sì)

## 6.3 Tipografia

- **Font**: default sistema (Tailwind sans), no font custom
- **Titoli pagina**: `text-xl font-semibold text-gray-900` (in `/inizia`) o `text-xl font-bold` (in dashboard)
- **Titoli card**: `text-sm font-semibold text-gray-800`
- **Body**: `text-sm text-gray-700`
- **Caption/hint**: `text-xs text-gray-500`
- **Micro testo**: `text-[10px]` o `text-[11px]`

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
- Titolo: `text-sm font-semibold` (es. "Indirizzo: Motoveicolo")

### Card
- `bg-white border border-gray-200 rounded-2xl p-4` (dashboard)
- `bg-white rounded-3xl shadow-lg p-7` (flusso `/inizia`, più morbida)

### Banner stato dinamico (dashboard)
- `bg-gradient-to-br from-COLORE-600 to-COLORE-800`
- Emoji 3xl + titolo bold + sottotitolo opacità 90%

### Bottoni
- **CTA primario**: `bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-xs`
- **CTA primario `/inizia`**: `bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-base`
- **CTA secondario**: `bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50`
- **CTA pericolo**: `bg-red-600 hover:bg-red-700 text-white`
- **CTA disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`

### Toggle compatti `/inizia`
- Riga orizzontale: etichetta sinistra + pillole Sì/No destra
- Pill: `flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all min-w-[52px]`
- Selezionato verde: `bg-green-100 border-green-300 text-green-800`
- Selezionato rosso: `bg-red-100 border-red-300 text-red-800`
- Non selezionato: `bg-white border-gray-200 text-gray-500`

### Griglia tipo veicolo `/inizia`
- `grid grid-cols-4 gap-2`
- Item: `aspect-square flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-[1.5px]`
- Selezionato: `border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] text-blue-700`
- Check pallino blu in alto a destra

### Tab bar
- Container: `bg-white border border-gray-200 rounded-2xl p-1 flex gap-1`
- Tab attivo: `bg-[#0d2144] text-white`
- Tab inattivo: `bg-transparent text-gray-500 hover:bg-gray-50`

### Icone
- **SVG inline** preferito alle emoji
- Emoji ok solo: banner stato, empty state, messaggi, OptionButton del flusso
- Icone veicoli `/inizia`: 9 icone SVG specifiche (Iconify material-symbols, font-awesome) — fornite da Davide

### Form input
- `border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white`

## 6.5 Spaziatura

- Container max: `max-w-2xl mx-auto px-3 py-3` (dashboard mobile-first)
- Card `/inizia`: `max-w-md p-7`
- Gap tra card: `gap-3` (12px)
- Gap interno card: `gap-2` (8px)

## 6.6 Regole d'oro

1. **Mobile-first**: touch-friendly (min 44px altezza)
2. **No emoji nell'interfaccia funzionale**: SVG colorati per icone
3. **Coerenza colori semantici**: verde=positivo, rosso=problema, blu=azione, giallo=attesa
4. **Personalizzazione tipo veicolo OVUNQUE** (banner, titoli, articoli, generi)
5. **Genere corretto** per aggettivi (incidentato/a)
6. **Stato sempre visibile**
7. **Empty state amichevole**: icona grande + frase rassicurante + CTA
8. **Bottoni grandi nei flussi**: `py-4 rounded-xl` per CTA finali

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 Stile di lavoro preferito

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede**
- **Risposte compatte, no preamboli**
- **File completi sostituibili** preferiti ("ridammi tutto il codice")
- **"UI"** non significa nulla → spiegare "come appare la pagina"
- **Si confonde tra concetti tecnici** → spiegare con analogie
- **Comandi PowerShell** dati come stringhe pronte da copiare
- **Anteprime visive** (con tool visualize/mockup) quando si cambia design

## 7.2 Stack interazione

- **Editor**: VS Code → Ctrl+A → Ctrl+V → Ctrl+S
- **Terminale**: PowerShell di VS Code
- **Git**: GitHub Desktop, NON terminale (ma può eseguire comandi PowerShell git se Claude glieli dà esplicitamente)
- **DB**: Supabase SQL Editor

## 7.3 Sequenza di lavoro tipica

```
1. Davide dice cosa serve
2. Claude può fare 1-3 domande con ask_user_input_v0 se ci sono scelte
3. Per cambi di design, Claude mostra anteprima visuale
4. Claude scrive il file completo con create_file
5. Claude usa present_files per dare il file
6. Davide apre file in VS Code
7. Ctrl+A → cancella → Ctrl+V → Ctrl+S
8. Ricarica pagina nel browser (Ctrl+F5)
9. Manda screenshot o descrive a parole
10. Claude verifica/corregge
11. Quando funziona, prossimo task
```

## 7.4 Convenzioni di file

- File completi sostituibili preferiti ai patch
- Spiegazioni in italiano, codice misto
- Loop infinito / errori React → consigliare `npm run dev`
- Errori TypeScript "always true" su funzioni Google Maps → cache TS Server, fare **Ctrl+Shift+P → TypeScript: Restart TS Server**

## 7.5 Segnali Explorer VS Code

- **"M" verde**: modificato non salvato. Davide deve fare Ctrl+S.
- **"U" verde**: nuovo non in git
- **"M" arancione**: modificato salvato, da committare
- **Numero rosso "PROBLEMS"** in basso: errori TypeScript

## 7.6 Note operative

- Davide non ricorda sempre dove sono i file → indicare percorso completo
- Quando si crea file nuovo, dare ESATTAMENTE comando PowerShell
- Limiti immagini chat → suggerire nuova chat dopo molti screenshot
- Errori RLS minori: gli interessano poco se non bloccano
- Davide chiede spesso "fammi anteprima" prima di toccare codice

---

# 📋 PARTE 8 — STATO ATTUALE (24/05/2026)

## 8.1 ✅ FATTO

### Frontend pubblico
- ✅ Home pubblica con design pulito
- ✅ Flusso `/inizia` 10 step + auto-registrazione
- ✅ Upload foto VERO su Supabase Storage
- ✅ Login multi-ruolo base
- ⭐ **NUOVO 24/05/2026**: Refactoring completo `/inizia`:
  - Veicolo come step 1 (era step 4)
  - Banner blu gradient con bottone Indietro a sx + icona+titolo centrati
  - Personalizzazione dinamica per tipo veicolo (icona, titoli, articoli, generi)
  - Banner formato "Dati: Autovettura", "Indirizzo: Motoveicolo", ecc.
  - Griglia 4+3 con espansione "Altro" animata (Imbarcazione, Velivolo, Altro mezzo)
  - 9 icone SVG specifiche per veicoli (Iconify)
  - Toggle con colori semantici (verde=positivo, rosso=problema)
  - Genere corretto per "incidentato/a" (femminile per autovettura/minicar/imbarcazione)
  - Sfondo gradiente blu/viola
  - Rimossi bottoni "Non ricordo" su targa, CF, indirizzo (ora obbligatori)
- ⭐ **NUOVO 24/05/2026**: Google Maps Autocomplete in `/inizia` step indirizzo
  - Usa nuova `PlaceAutocompleteElement` (Places API New, post dismissione legacy 1/3/2025)
  - Salva automaticamente: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng`
  - Restringe a Italia
- ⭐ **NUOVO 24/05/2026**: Rinominato `motociclo` → `motoveicolo` in tutto il sistema (codice + DB)

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
- ✅ Verifica: nessun CHECK constraint su `tipo_mezzo` (24/05/2026)

## 8.2 ⏳ PENDING — In ordine di priorità

### 🔥 STEP 1 — FINIRE LA DASHBOARD CLIENTE

Davide sta completando il refactoring di `/inizia`. Quando finito, tornare alla dashboard cliente per:

1. **Testare visivamente la tab Stato** (timeline) con una pratica vera
2. **Testare la tab Chat con il Demolitore** (3 stati: prima/durante/dopo)
3. **Testare caricamento file vero** → verificare che arrivi in admin
4. **"0 pratiche" → "Nessuna pratica"** nella lista (cosmetico)
5. **Documenti richiesti dinamici** più raffinati in base a `/inizia`

⚠️ **Davide dirà altri aspetti specifici** della dashboard cliente da finire. Chiedergli sempre cosa manca prima di procedere.

### 🔥 STEP 2 — TEST COMPLETO `/inizia` SU PRODUZIONE 🆕

Dopo push del refactoring `/inizia`, Davide vuole testare TUTTO il flusso su `noi-demoliamo.vercel.app`:
- Provare tutti i 9 tipi di veicolo (verificare banner + titoli + generi corretti)
- Provare l'espansione "Altro" (Imbarcazione, Velivolo, Altro mezzo)
- Verificare salvataggio corretto in DB (tipo_mezzo, lat/lng, ecc.)
- Verificare che Google Maps Autocomplete funzioni in produzione
- Eventuali aggiustamenti UX emersi dai test

### 🔥 STEP 3 — PAGINA ADMIN DETTAGLIO PRATICA

6. **Sistemare `/admin/pratiche/[id]`**:
   - Aggiungere box chat funzionante (usare `messaggi_chat`)
   - Admin vede SEMPRE tutte le chat
   - Sub-tab admin: cliente↔NoiDemoliamo, cliente↔demolitore

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

### 🔜 STEP SUCCESSIVI

18. **Verifica PRA ACI** — riprendere con approccio bookmarklet/estensione Chrome (vedi 5.5)
19. **Pagina dedicata "Polizia Locale veicoli abbandonati"** per casi targhe smarrite (futuro)
20. **Sistema invito email demolitore + `/imposta-password`**
21. **Login multi-ruolo completo** (demolitore + commerciante)
22. **Dashboard demolitore** `/dashboard-demolitore`
23. **Sistema notifiche in-app** (campanella, badge, popup, web push)
24. **Sistema SMS** (Twilio)
25. **Sistema messaggi preimpostati** admin

### 🔮 PROSSIMI FLUSSI

26. **Flusso B — Asta demolitori**
27. **Flusso C — Proponi ai commercianti**
28. **Flusso "Compra per NoiDemoliamo"**
29. **Flusso D — Vendita auto** `/vendi-auto`

### 🏪 AREA COMMERCIANTI

30. **Dashboard commerciante** 6 sezioni
31. **Mappa commercianti** `/admin/copertura-commercianti`

### 🛠️ ALTRI

32. **Sistema fatturazione automatica**
33. **Statistiche e report admin**
34. **Dashboard collaboratori ed enti pubblici** (futuro lontano)

## 8.3 ⚠️ Problemi noti / cosmetici

- **Errore RLS minore** in `/inizia` (NON blocca)
- **Console "1 Issue"** generica → da indagare
- **`tree /F /A`** può essere lento su Windows con node_modules grande

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

1. **Velocità** è il principio cardine sopra tutto
2. **Approvazione documenti**: granulare, non in blocco
3. **Documenti tutti uguali nell'UI**: tutti hanno ✓ e ✗
4. **Pagamento commerciante → cliente**: diretto al ritiro
5. **Commercianti vedono**: foto + città (no indirizzo, no dati cliente, no libretto/cert)
6. **Strategia "Proponi ai commercianti"**: prima testo mercato, POI contatto cliente
7. **Eventuale +100€ al cliente**: quando "mangia la foglia"
8. **Slot documenti operativi commercianti**: contratto + delega + PDF
9. **Chat in-app, niente telefono**
10. **Admin vede SEMPRE tutte le chat**. Cliente non vede più demolitore dopo cert rottamazione
11. **Chat persistente DB** (`messaggi_chat`). Real-time = miglioria futura
12. **Mobile-first**
13. **Upload**: 2 opzioni "Scatta foto" + "Carica file". NO 3a
14. **Documenti dinamici** in base a /inizia
15. **Doc identità/libretto**: fronte + retro in 1 slot (anche PDF unico)
16. **Assegnazione SEMPRE su scelta**: automatica o manuale da mappa
17. **Velocità storica demolitore**: da `data_assegnazione` a `data_ritiro_effettuato`
18. **Recensioni OBBLIGATORIE**: cliente lascia 2 recensioni (demolitore + NoiDemoliamo) dopo ritiro effettuato e PRIMA di ricevere certificato. Strategia: push positive verso Google Maps / altri canali
19. **Recensioni come fattore algoritmo**: media recensioni demolitore influenza posizione
20. 🆕 **Personalizzazione dinamica per tipo veicolo** in `/inizia`: l'esperienza del cliente è interamente adattata al tipo di mezzo scelto (icone, titoli, articoli grammaticali, generi)
21. 🆕 **"Motoveicolo" anziché "Motociclo"**: terminologia più ampia che include moto, scooter, ciclomotori. Mantiene anche "Ciclomotore" come categoria separata per chi vuole specificarlo
22. 🆕 **Tipo veicolo come PRIMO step**: il cliente sa subito che il flusso funziona anche per moto/imbarcazione/camion/ecc.
23. 🆕 **Targa, CF, indirizzo OBBLIGATORI**: rimossi bottoni "Non ricordo" — meglio sapere subito se cliente non ha i dati base
24. 🆕 **Verifica PRA ACI**: abbandonata per ora (reCAPTCHA). Riprendere con bookmarklet o Openapi.it

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA CHAT

> Istruzioni per Claude nella nuova chat dopo aver letto questo file.

1. **Leggi TUTTO questo file**, poi conferma a Davide di aver capito
2. **Riprendi dal punto 8.2 PENDING** nell'ordine: STEP 1 (dashboard) → STEP 2 (test /inizia) → STEP 3 (admin chat) → STEP 4 (algoritmo/manuale) → STEP 5 (recensioni)
3. **Chiedi sempre a Davide quali aspetti specifici** vuole finire prima
4. **Rispetta il design system** della parte 6 in TUTTE le pagine nuove
5. **Stile comunicazione** della parte 7 (passo-passo, no preamboli, file completi)
6. **Mostra anteprime visuali** prima di toccare codice quando si cambia design
7. **Quando crei nuovi file**, aggiorna mentalmente questo doc (a fine sessione, chiedi a Davide di aggiornare)
8. **Non assumere mai cose nuove**: se non sei sicuro, chiedi
9. **Se hai bisogno della struttura PRECISA del progetto** (con tutti i file): chiedi a Davide di generarla con `tree /F /A | findstr /V "node_modules" > struttura.txt` e di condividerla
10. **GitHub push** Davide lo fa da GitHub Desktop OPPURE da comandi PowerShell git che Claude gli prepara

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **GitHub**: ddiviesto/NoidemoliaMo
- **URL live**: https://noi-demoliamo.vercel.app
- **Supabase URL**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Users\Davide Di Viesto\Desktop\OneDrive\Noi_Demoliamo\Codex_Noi_Demoliamo\NoiDemoliamo`

---

**Fine documento. Ultimo aggiornamento: 24 maggio 2026.**