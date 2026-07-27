# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato al **27 luglio 2026**.
> Questo è l'unico file da leggere per capire dove siamo, dove andiamo, e come si lavora.

---

# 📍 PARTE 1 — IDENTITÀ DEL PROGETTO

## 1.1 Cosa è NoiDemoliamo

Piattaforma italiana di **demolizione auto gratuita** per il privato.
Il cliente:
1. Va su `noi-demoliamo.vercel.app`
2. Compila un flusso di mini-step (`/inizia`) — ora 14-15 step (dipende da tipo veicolo e casistica)
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
- **Styling**: Tailwind CSS + style inline nei componenti più recenti (no font custom)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoiDemoliamo`
- **Live**: https://noi-demoliamo.vercel.app

## 2.2 Cartella locale e ambiente sviluppo

**Cartella progetto**: `C:\Progetto_NoiDemoliamo`

⚠️⚠️ **STORIA IMPORTANTE (fine giugno/luglio 2026)**: il progetto stava in OneDrive e OneDrive **bloccava i file di git** (loop infiniti su `.git/objects`, permission denied). Dopo un incidente in cui la cartella `.git` è stata eliminata per errore (recuperato tutto ri-clonando da GitHub: il push era al sicuro), il progetto è stato **spostato definitivamente in `C:\Progetto_NoiDemoliamo`, FUORI da OneDrive**.
- **MAI rimettere il progetto dentro cartelle sincronizzate** (OneDrive, Dropbox, Google Drive)
- Il vecchio percorso `C:\Users\...\OneDrive\...` è OBSOLETO
- Git ora funziona normalmente, `gc` automatico incluso (il cerotto `gc.auto 0` non serve più: il `.git` attuale è un clone fresco)
- ⚠️ Se dopo uno spostamento/clone `npm run dev` va in panico Turbopack ("FATAL: An unexpected Turbopack error"): fermare il server, `Remove-Item -Recurse -Force .next`, riavviare — la cache `.next` conteneva percorsi vecchi

**Strumenti che Davide usa**:
- **Claude Code (estensione VS Code)** 🆕 — dal 3/07/2026 il metodo di lavoro principale: Claude legge e modifica i file direttamente, esegue git, sempre chiedendo conferma (vedi PARTE 7)
- **VS Code** per editing
- **PowerShell** come terminale Windows
- **Supabase SQL Editor** per query e modifiche DB
- **Browser Chrome** per testing (F12 → Ctrl+Shift+M per modalità mobile)
- **iPhone** per testing reale (Davide è su iPhone, PC è HP)

**Comandi essenziali**:
```powershell
# Avviare il server di sviluppo
npm run dev

# Push veloce all in one
git add . ; git commit -m "messaggio" ; git push origin main

# Verificare contenuto cartella
dir app\dashboard

# Vedere struttura completa del progetto (salva in struttura.txt)
tree /F /A | findstr /V "node_modules" > struttura.txt
```

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
⚠️ `.env.local` non è tracciato da git (è sopravvissuto intatto al re-clone). Claude Code non deve mai stamparne il contenuto.

### Su Vercel (produzione)
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurata correttamente
- ⚠️ **PENDING**: `GOOGLE_MAPS_SERVER_KEY` ancora da aggiungere su Vercel produzione

### Google Cloud Console
- ✅ Abilitata sia **Places API** che **Places API (New)** — entrambe necessarie
- ✅ Chiave browser limitata a referrer `noi-demoliamo.vercel.app/*` + `localhost:3000/*`

## 2.4 Supabase

**URL**: https://egsufeczoroxqnagzqfq.supabase.co
**Admin email hardcoded**: `ddiviesto@gmail.com`

⚠️ **Free tier**: il progetto va in pausa dopo ~7 giorni di inattività → aprire la dashboard Supabase ogni 5-6 giorni. Al lancio: passare a Supabase Pro (~25$/mese).
(Caso reale di luglio: "Failed to fetch" alla creazione pratica quasi certamente causato dalla pausa del progetto — ora gli errori sono tradotti in italiano, vedi 5.2.)

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

### Trucchi utili
- Dopo `ALTER TABLE`, se il sito dà errori "column not found" → SQL Editor: `NOTIFY pgrst, 'reload schema';` oppure Settings → Restart project (ricarica la cache dello schema)

---

# 🗄️ PARTE 3 — DATABASE COMPLETO

## 3.1 Tabelle esistenti nel DB Supabase

Tutte queste tabelle sono già presenti e funzionanti:

`casistiche_documenti`, `collaboratori`, `commercianti`, `demolitori`, `demolitori_comuni`, `documenti`, `documenti_approvazione`, `fatture`, `foto_pratiche`, `impostazioni`, `interessi_commercianti`, `messaggi`, `messaggi_chat`, `notifiche`, `pratica_documenti_checklist`, `pratiche`, `solleciti`, `utenti`, `veicoli_vendita`, `veicoli_vendita_foto`

Inoltre tabelle anagrafiche: `comuni`, `province`, `regioni` (intoccabili, usate per autocomplete e mappa).

## 3.2 Tabella `pratiche` — 50+ colonne

Tabella centrale del progetto. Contiene tutte le pratiche di demolizione.

**Colonne principali**:
- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo`, `tipo_mezzo_altro` (text), `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`, `tipo_cambio` (text: manuale/automatico/non_so)
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng`, `spazio_carro_attrezzi` (text: libero/stretto/no), `spazio_carro_attrezzi_note` (text libero)
- **Cliente**: `codice_fiscale` (⚠️ NULLABLE — null per targhe straniere; per le società contiene la P.IVA a 11 cifre), `nome_richiedente`, `telefono`
- **SISTEMA CASISTICHE (giugno 2026)**: `casistica` (text con CHECK sugli 8 codici, vedi 3.3), `fermo_amministrativo` (si/no/non_so, null se non applicabile), `targhe_presenti` (bool, null per targhe straniere), `delegato_nome`, `delegato_telefono` (null se consegna in prima persona), `numero_eredi` (int — ⭐ LEGACY dal 22/07/2026: la domanda "quanti eredi" non esiste più, il flusso salva null; resta per le pratiche storiche), `nomi_rinunciatari` (text — colonna pronta ma NON compilata dal flusso: i rinunciatari si scrivono a penna nel modulo ACI)
- **Documenti dichiarati**: `libretto` (si/denuncia/no — NULLABLE), `certificato_proprieta` (NULLABLE; CHECK ammette digitale/cartaceo/documento_unico/smarrito/nessuno ma la UI attuale ne propone 4: digitale, cartaceo, smarrito, nessuno)
- **Legacy da rimuovere in pulizia finale**: `ruolo_richiedente`, `eredita` (sostituiti dal sistema casistiche)
- **Workflow**: `demolitore_id`, `data_ritiro_prevista`, `data_certificato_rottamazione`, `data_certificato_pra`, `stato`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro`, `scadenza_cert_rottamazione`, `scadenza_cert_pra`, `assegnazione_manuale`

### Valori ammessi per `tipo_mezzo` (NO check constraint, text libero):
```
autovettura, motoveicolo, ciclomotore, minicar, furgone,
imbarcazione, pullman, camion, velivolo, altro
```

## 3.3 LE 8 CASISTICHE DI DEMOLIZIONE (cuore del sistema)

⭐ **FONTE UFFICIALE**: `docs/casistiche/Casistiche_Demolizione.md` (nel repo, collegato da `CLAUDE.md` → da leggere sempre). È la copia di lavoro autorevole del documento di Davide: elenca per ogni casistica i documenti da caricare, da consegnare al ritiro, i moduli PDF e le 2 integrazioni (fermo, targhe smarrite). Ogni pratica viene classificata automaticamente dal flusso `/inizia` (funzione `derivaCasistica` in `types/pratica.ts`) e salvata in `pratiche.casistica`:

| # | Codice | Descrizione | Particolarità |
|---|---|---|---|
| 1 | `persona_fisica` | Privato, mezzo intestato a persona fisica vivente | Caso base |
| 2 | `eredi_accettato` | Intestatario deceduto, eredi accettano tutti | ⭐ 22/07: fotografa solo chi gestisce la pratica; fotocopie di OGNI erede al ritiro con la dichiarazione |
| 3 | `eredi_rinuncia` | Intestatario deceduto, qualcuno ha rinunciato | Rinuncia formale Notaio/Tribunale; chi rinuncia NON firma nulla e NON allega documenti |
| 4 | `societa` | Mezzo intestato a società attiva | P.IVA 11 cifre al posto del CF, visura camerale |
| 5 | `societa_fallita` | Società fallita/liquidata | Autorizzazione Giudice Delegato |
| 6 | `associazione` | Intestato ad associazione/ente | CF associazione |
| 7 | `non_intestatario` | Richiedente NON è l'intestatario (no eredità) | ⚠️ Delega NON ammessa |
| 8 | `targhe_straniere` | Mezzo con targhe estere (non al PRA italiano) | ⚠️ Salta CF, CDC, fermo, consegna/delega, box targhe |

**Integrazioni trasversali** (si applicano ai casi 1-7 come condizioni aggiuntive):
- **Fermo amministrativo** (`fermo_si`) → dichiarazione sostitutiva aggiuntiva
- **Targhe smarrite** (`targhe_assenti`) → denuncia di smarrimento targhe

Helper in `types/pratica.ts`: `derivaCasistica(intestazione, erediRinuncia, societaFallita)`, `delegaAmmessa(cas)` (false per non_intestatario e targhe_straniere), `fermoApplicabile(cas)` (false per targhe_straniere).

## 3.4 SISTEMA DOCUMENTI DINAMICI — ✅ COMPLETO E COLLAUDATO (fine giugno 2026)

Architettura "ricettario + lista della spesa": un **catalogo** statico di regole + una **checklist** generata per ogni pratica.

### `casistiche_documenti` (IL CATALOGO)
```
id                 uuid     PK
casistica          text     CHECK sugli 8 codici
codice             text     es. 'libretto', 'ci_intestatario', 'delega'
nome               text     etichetta mostrata al cliente
descrizione        text     istruzioni semplici
richiede_upload    bool     va caricato in area personale (foto/PDF)
richiede_consegna  bool     va consegnato fisicamente al ritiro
template_pdf       text     se è un modulo autocompilato: nome template
per_erede          bool     se true → moltiplicato × numero_eredi
condizione         text     quando appare: 'sempre', 'cdc_cartaceo', 'cdc_smarrito',
                            'targhe_assenti', 'fermo_si', 'delegato', 'libretto_smarrito', ...
obbligatorio       bool
ordine             int
```
RLS: lettura pubblica (è il "menu", niente dati personali), gestione solo admin.
✅ **POPOLATO: 89 documenti su tutte le 8 casistiche** (verificati con Davide).

⭐ **Documenti FRONTE/RETRO (rifatto luglio 2026)**: i documenti a due lati hanno **due caselle separate "Fronte" e "Retro"** nella pagina cliente (+ link "Ho un unico file con fronte e retro" per chi ha uno scan/PDF unico). L'invio in verifica è bloccato finché mancano entrambi i lati. Il riconoscimento NON dipende più dalla parola "retro" nella descrizione (metodo fragile, abbandonato): ora c'è una **lista ufficiale di codici** in `TabDocumenti.tsx` (`CODICI_FRONTE_RETRO` + prefissi `CARTA_IDENTITA_*` / `TESSERA_SANITARIA_*`), presa dal file casistiche. Documenti fronte/retro: libretto, libretto estero, certificato di proprietà cartaceo, carta d'identità/patente, codice fiscale/tessera sanitaria. **L'atto di morte NON è fronte/retro.** Tutti gli altri documenti (denunce, visure, autorizzazioni…) restano a **caricamento libero** (1 o più pagine). Il `lato` ('fronte'/'retro') è salvato nel JSON di `file_url`.

### `pratica_documenti_checklist` (LO STATO — una riga per documento per cliente)
```
id              uuid    PK
pratica_id      uuid    FK pratiche (ON DELETE CASCADE)
documento_id    uuid    FK casistiche_documenti
indice_erede    int     Erede 1, Erede 2... (null per il resto)
stato           text    'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
file_url        text    ⭐ ARRAY JSON di file: [{"url": "...", "nome": "..."}]
scaricato_il    tstz    per i moduli PDF: quando il cliente l'ha scaricato
caricato_il     tstz
nota_admin      text    es. 'Foto sfocata, ricaricala'
aggiornato_il   tstz
```
UNIQUE INDEX su (pratica_id, documento_id, COALESCE(indice_erede,0)).
RLS: SELECT/INSERT/UPDATE configurate. GRANT espliciti già applicati.

⭐ **Convenzione `file_url`**: contiene un **array JSON** `[{url, nome}]` per supportare più file per documento (fronte/retro, più pagine) senza cambiare schema. Helper `leggiFile()`/`scriviFile()` in `TabDocumenti.tsx` (gestiscono anche il fallback stringa semplice legacy).

### ✅ TRIGGER DI GENERAZIONE AUTOMATICA ("commesso automatico")
Trigger PostgreSQL su `pratiche`: alla creazione della pratica legge `casistica` + risposte (CDC, targhe, fermo, delegato) e **genera automaticamente le righe checklist** dal catalogo. Il meccanismo `per_erede`/`indice_erede` resta pronto nel trigger, ma ⭐ dal 22/07/2026 **nessun documento del catalogo lo usa più** (eredi semplificati: si fotografa solo chi gestisce la pratica).
✅ Verificato end-to-end con test SQL (incluso caso complesso `eredi_accettato` multi-erede) e con pratica reale dal flusso ("EEEEE", vedi 8.1).

### ⭐ FLUSSO FRONTE/RETRO (deciso e implementato il 3/07/2026)
1. Il cliente carica un file (foto o PDF): viene salvato SUBITO in `file_url`, ma **lo stato NON cambia** (resta `da_fare` o `rifiutato`) — il documento rimane "in preparazione" con miniature visibili e bollini attivi
2. Se il catalogo dice fronte/retro (parola "retro" nella descrizione) la UI suggerisce "manca il retro?"
3. Solo il bottone verde **"Ho finito, invia in verifica"** imposta `stato='caricato'` + `caricato_il` + azzera `nota_admin`
4. Eliminazione file: se il documento era `caricato` e si elimina l'ultimo file → torna `da_fare`; se era in preparazione lo stato non cambia. Elimina sia dal bucket che dal record.
5. Il cliente può eliminare file/foto SOLO negli stati in `STATI_MODIFICABILI_DA_CLIENTE` (costante in TabDocumenti: in_attesa_documenti, in_attesa_approvazione_admin, documenti_parzialmente_approvati, da_assegnare, in_attesa_assegnazione, in_assegnazione_manuale)

### Come funziona il ciclo completo
1. Creazione pratica → trigger genera checklist ✅
2. Cliente carica ogni documento (foto col telefono, flusso fronte/retro) ✅
3. Moduli PDF autocompilati: scarica (tracciato `scaricato_il`) → stampa/firma → carica FOTO del firmato → originale al ritiro (⏳ in attesa dei template da Davide)
4. **Approvazione admin per SINGOLO documento** (rifiuto con motivo in `nota_admin`) + bottone **"Approva tutti"** — ⏳ PAGINA ADMIN DA COSTRUIRE (prossimo task)
5. I documenti con `richiede_consegna=true` compongono la lista "Da portare al ritiro" ✅ (box scuro collassabile in TabDocumenti)

## 3.5 Tabella `documenti` (legacy)

Documenti ufficiali del vecchio sistema. Sostituita da `pratica_documenti_checklist` per le pratiche nuove; mantenuta per compatibilità con le pratiche storiche. Da valutare migrazione/dismissione in pulizia finale.

## 3.6 Tabella `foto_pratiche`

Foto **del veicolo**. `id`, `pratica_id`, `url` (bucket foto-pratiche), `caricato_il`.
Le foto sono eliminabili dal cliente (con conferma) negli stati modificabili: si elimina sia il file dal bucket che la riga.

## 3.7 Tabella `documenti_approvazione` (legacy)

Tracking granulare del vecchio sistema. TabDocumenti la legge ancora per lo stato approvazione delle FOTO veicolo (chiave `foto:{id}`). Il nuovo sistema documenti ha l'approvazione integrata nello `stato` della checklist.

## 3.8 Tabella `messaggi_chat`

Chat persistente tra cliente, admin, demolitore, commerciante.
`id`, `pratica_id`, `mittente_id`, `mittente_tipo` ('cliente'|'admin'|'demolitore'|'commerciante'), `testo`, `letto`, `creato_il`, ⭐ `conversazione`.
✅ **Tempo reale ATTIVO dal 22/07/2026** (vedi 5.7): i messaggi appaiono da soli, il bottone "Aggiorna" della chat admin è stato rimosso.

⭐ **TRE CANALI (26/07/2026, SQL `docs/sql/2026-07-26-chat-conversazioni.sql` ESEGUITO)**: colonna `conversazione` con CHECK sui tre valori:
- `cliente_noidemoliamo` → cliente ↔ admin
- `cliente_demolitore` → cliente ↔ demolitore
- `demolitore_noidemoliamo` → demolitore ↔ admin (canale diretto)

I messaggi VECCHI restano con `conversazione` NULL e le interfacce li mostrano col vecchio criterio dei mittenti (nessuna migrazione azzardata). **Privacy**: policy RESTRITTIVA in SELECT (`messaggi_chat_canale_riservato`): il canale demolitore↔NoiDemoliamo è visibile solo all'admin (email) e al server (service role) — mai al cliente, che ha anche filtri UI e contatore che lo escludono. **Regola `letto`**: con i canali ogni messaggio ha UN destinatario, quindi il flag è pulito: ognuno segna letti i messaggi del proprio canale quando lo apre (admin per linguetta, demolitore via endpoint, cliente in TabChat).

## 3.9 Tabella `impostazioni`

Chiave-valore. Es: `max_pratiche_aperte_demolitore=15`

## 3.10 Tabella `demolitori`, `demolitori_comuni`, `demolitori_tariffe`

- `demolitori`: anagrafica. Campi professionali (agg. 6/07/2026): `ragione_sociale`, `piva`, `codice_sdi`, `indirizzo`/`citta`/`provincia`/`cap`/`lat`/`lng` (da Google autocomplete), `telefono_fisso`, `titolare_nome`/`titolare_cellulare`, `referente_nome`/`referente_cellulare`, `email_assegnazione`, `email_aziendale`, `pec`, `stato` (attivo/in_attesa/sospeso), `fee_per_pratica` (fee BASE), `contratto_firmato`, `velocita_media_giorni`.
- `demolitori_comuni`: copertura geografica (demolitore_id, comune, provincia [NOME intero], tipo: 'regione'|'provincia'|'provincia_esclusa'|'comune_incluso'|'comune_escluso'). Impostata dalla mappa `MappaComuni`.
- ⭐ `demolitori_tariffe` (nuova, 6/07/2026): tariffe speciali per zona (id, demolitore_id, tipo 'regione'|'provincia'|'comune', nome, fee). **Regola fatturazione (più specifico vince)**: fee del veicolo = **`pratiche.fee_concordata` se valorizzata (importo UNA TANTUM concordato per la singola pratica, es. veicolo fuori zona pagato 300€)**, altrimenti tariffa del COMUNE di ritiro, altrimenti PROVINCIA, altrimenti REGIONE, altrimenti `fee_per_pratica` base. Le tariffe di zona sono INDIPENDENTI dalla copertura (una tariffa fuori copertura vale per i ritiri fuori zona assegnati manualmente; la UI mostra l'etichetta informativa "fuori copertura"). Il ritiro effettivo (`data_ritiro_effettuato`) fa entrare la pratica in fatturazione; a fine mese fattura automatica per demolitore. RLS: solo admin. Endpoint `/api/pratica-fee` per impostare/rimuovere l'importo concordato.
- ⭐ `demolitori_note` (nuova, 7/07/2026): note/cronologia del demolitore (id, demolitore_id, testo, creato_il). Timeline nella scheda demolitore. RLS: solo admin.
- **Stato demolitore semplificato nell'interfaccia**: o è **Attivo** (riceve pratiche) o **Non attivo** (valori DB `in_attesa`/`sospeso` mostrati entrambi come "Non attivo"). Il campo `contratto_firmato` esiste nel DB ma NON è più gestito dall'interfaccia (ai contratti pensa Davide).

## 3.11 Altre tabelle rilevanti

- `utenti`: profilo utente (collegato a Supabase Auth via id)
- `veicoli_vendita` + `veicoli_vendita_foto`: flusso D (vendita), separate da `pratiche`

## 3.12 Tabelle ANCORA DA CREARE

- `recensioni` (id, pratica_id, cliente_id, demolitore_id, tipo, stelle, commento, creata_il)
- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `messaggi_preimpostati` (id, categoria, titolo, testo)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

⚠️ Da creare DOPO il 30/10/2026 → ricordare i GRANT espliciti (vedi 8.4).

---

# 🔄 PARTE 4 — I 4 FLUSSI DELLA PRATICA

### ⭐ Regola "TI CHIAMIAMO NOI" (documenti da chiarire — luglio 2026)
Se il cliente nel flusso `/inizia` dichiara di **non avere né libretto né denuncia** ("Non ho nessuno dei due", `libretto='no'`) oppure **non sa che certificato di proprietà ha** ("Non lo trovo o non so cosa sia", `certificato_proprieta='nessuno'`), NON si procede in automatico: **prima NoiDemoliamo lo contatta** (telefono) per capire la situazione. In `/inizia` compare un box rassicurante + bottone WhatsApp; nella pagina documenti il libretto viene semplicemente **tolto dalla lista da caricare**. ⭐ **9/07: il box giallo "Da chiarire insieme" lato CLIENTE è stato RIMOSSO** (decisione Davide): il cliente non vede nessun avviso di chiamata — queste pratiche stanno nel riquadro "**Da contattare**" della pipeline CRM e **chiama l'admin**.

## 4.1 Flusso A — Demolizione standard ✅ FUNZIONANTE

```
Cliente compila /inizia (14-15 mini-step, casistica derivata automaticamente) → crea account
   ↓
✅ TRIGGER genera la CHECKLIST DOCUMENTI dalla casistica (automatico, collaudato)
   ↓
✅ Cliente carica documenti in area personale (foto col telefono, flusso fronte/retro,
   invio manuale "Ho finito, invia in verifica")
   ↓
⏳ Admin approva (singolo documento o "Approva tutti") — PAGINA DA COSTRUIRE (prossimo task)
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
Giorno del ritiro → cliente consegna gli ORIGINALI (lista "Da portare al ritiro") → demolitore clicca "✅ Veicolo ritirato"
   ↓
SISTEMA RECENSIONI (vedi 4.9):
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
Admin sceglie destino: ASTA DEMOLITORI → imposta prezzo base, durata, demolitori invitati
→ Demolitori vedono "Aste aperte" (foto, città, marca, anno, km, condizioni; NO dati cliente)
→ Offerte ≥ prezzo corrente → scadenza → admin sceglie vincitore
→ Vincitore: pratica assegnata, parte flusso A. Nessuno offre: rilancio o standard.
```

## 4.3 Flusso C — Vendita ai commercianti (DA COSTRUIRE)

**Strategia**: admin **prima** testa il mercato con i commercianti, **poi** se vede interesse contatta il cliente.

```
Admin "Proponi ai Commercianti" (prezzo richiesto, somma cliente opzionale, durata)
→ visibile a TUTTI i commercianti (foto + città + dati veicolo; NO dati cliente)
→ offerte → se interesse, admin contatta cliente ("Lei non spende nulla. [Eventuale +100€]")
→ Cliente ACCETTA: commerciante vincitore riceve dati completi, paga cliente al ritiro, paga NoiDemoliamo
→ Cliente RIFIUTA: torna a flusso A. Nessuna offerta: admin decide.
```

**Anti-furbi**: commerciante che bypassa NoiDemoliamo → disattivato.

## 4.4 Flusso D — Vendita auto su richiesta cliente (DA COSTRUIRE)

```
Cliente "Vendi auto" → /vendi-auto → dati + foto + prezzo (o "valutate voi")
→ valutazione automatica → admin decide:
┌─ IMPRESENTABILE: propone demolizione gratuita
├─ BUONA: asta tra COMMERCIANTI (flusso C)
└─ MOLTO BUONA: admin compra per NoiDemoliamo
```

DB: `veicoli_vendita`, non `pratiche`.

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
in_attesa_recensione_cliente   (dopo ritiro, prima certificato)
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

⚠️ **VINCOLO DB `pratiche_stato_check`** (bug scoperto e risolto 6/07/2026): la colonna `pratiche.stato` ha un CHECK constraint con l'elenco degli stati ammessi. All'inizio mancavano i nuovi stati (es. `da_assegnare`): il DB **rifiutava in silenzio** l'update → la pratica restava bloccata su "in_attesa_documenti". Il constraint ora contiene TUTTI gli stati qui sopra. **Se aggiungi un nuovo stato al workflow, aggiornalo anche nel constraint**, altrimenti le transizioni falliscono senza errore visibile.

⭐ **Le transizioni di stato pratica passano dal SERVER** (service role), non dal browser admin: endpoint `/api/pratica-stato` ricalcola lo stato dai documenti (tutti approvati → `da_assegnare`, ecc.). La pagina admin si **auto-sincronizza all'apertura** (self-heal: se i documenti sono a posto ma la pratica è indietro, la sblocca da sola).

### ⭐ PIPELINE CRM — IL FLUSSO IN 6 FASI + ALLERTA (rifatta 16/07/2026 su mockup)
Nel CRM il "Flusso pratiche" è una **fila da sinistra a destra con le frecce** (mockup approvato): ogni casella ha contatore, barretta colorata, pillola "chi agisce" (cliente / TOCCA A TE / demolitore) e la riga **"Il cliente vede: …"** — la nomenclatura admin è ALLINEATA alla timeline del cliente. Ogni pratica appartiene a UNA fase (funzione `bucketDi` in `/admin`):
1. **In attesa documenti** = `in_attesa_documenti` + `documenti_parzialmente_approvati` (in mano al cliente; "di cui N da rifare") — cliente vede "In attesa dei tuoi documenti"
2. **Documenti da verificare** = `in_attesa_approvazione_admin` — cliente vede "Stiamo verificando i tuoi documenti"
3. **Da assegnare** = `da_assegnare` + `in_assegnazione_manuale` + `in_attesa_assegnazione` — cliente vede "Documenti verificati"
4. **Assegnata** = `assegnata` + `in_attesa_conferma_cliente` + `ritiro_confermato` — cliente vede "Demolitore assegnato"
5. **Ritirata (in fatturazione)** = `ritirata` + recensione + attesa certificati — cliente vede "Veicolo ritirato"
6. **Completata** = `completata` — **SOLO col certificato di cancellazione targhe PRA**
**"Da contattare" è FUORI dalla fila** (non è una tappa, è un'anomalia): riquadro rosso d'allerta sotto la pipeline, visibile solo se >0, cliccabile come filtro. Le annullate restano fuori (filtro a parte). "Tutte" = flusso senza annullate.
⭐ Le **pilloline di stato** sulle righe (lista + dettaglio pratica) iniziano sempre col nome della fase e dopo il "·" tengono il dettaglio ("Assegnata · ritiro fissato", "Ritirata · attesa PRA"); rosso solo per le anomalie ("In attesa documenti · da rifare", "Da assegnare · a mano").

⭐ **Regola certificati**: il certificato di ROTTAMAZIONE può essere caricato dal demolitore (il cliente lo scarica) **oppure consegnato a mano al ritiro** (nella futura dashboard demolitore ci sarà la spunta "consegnato a mano" per non bloccare la pratica). Ciò che completa la pratica è SEMPRE e solo il **certificato di cancellazione targhe (radiazione PRA)**.

### ⭐ ANNULLAMENTO PRATICA — DUE BINARI (7/07/2026) + RIATTIVAZIONE (20/07/2026)
Endpoint `/api/pratica-annulla` (server, motivo OBBLIGATORIO → `pratiche.motivo_annullamento`, cronologia consultabile).
⭐ **RIATTIVAZIONE (20/07)**: all'annullamento si salva `pratiche.stato_precedente`; lo stesso endpoint con `{ riattiva: true }` riporta la pratica ESATTAMENTE dov'era (per le annullate storiche senza stato_precedente: fase documenti + self-heal). Annullamento e riattivazione si annotano DA SOLI in `pratiche_note` (pillole rossa/verde in cronologia). Nel dettaglio pratica tutto vive nel menu unico "Stato pratica" in testata (Attiva / Metti in attesa / Annulla — mockup variante A); il riquadro "Pratica annullata" è stato rimosso (doppione della cronologia). SQL: `docs/sql/2026-07-20-riattivazione-pratica.sql` (eseguito).
- **Prima dell'assegnazione** (cliente ci ripensa, ecc.): stato annullata + motivo, fine.
- **Dopo l'assegnazione** (demolitore si tira indietro): il **`demolitore_id` NON viene azzerato** — resta come traccia per il controllo qualità. La scheda demolitore mostra la statistica **"Annullate"** (rossa, cliccabile → elenco con motivi). Se un demolitore accumula troppe annullate in un mese, Davide lo chiama/cambia. Anche il demolitore vedrà le sue annullate nella futura dashboard (deterrente).
- La pratica annullata non conta tra le "aperte" del demolitore (tutti i conteggi escludono completata/annullata).
- Eliminazione definitiva ≠ annullamento: la modale avvisa se la pratica è assegnata.

## 4.7 Algoritmo di assegnazione AUTOMATICA — ✅ COLLAUDATO (6 luglio 2026)

Implementato in `lib/assegnazione.ts` + endpoint `/api/assegna-pratica/route.ts`.
✅ **Testato end-to-end**: pratica a Messina → demolitore che copre la provincia trovato, distanza calcolata, assegnato con nome visibile.

```
1. Prerequisiti (comune + provincia + lat/lng)
2. Demolitori che coprono il comune → 3. solo attivi → 4. esclude saturi (max 15)
5. Distanza stradale (Google Distance Matrix) → 6. velocità storica (ultime 20 pratiche)
7. Ordina: velocità → distanza → pratiche aperte → 8. vincitore + lista debug
```

### Flusso admin (deciso e collaudato)
Un solo flusso: **"Assegna in automatico"** lancia l'algoritmo in modalità **dry-run** (calcola SENZA scrivere) e mostra la **classifica** dei candidati (1° = "Consigliato", con distanza · velocità · pratiche aperte). L'admin **conferma** il suggerito o ne sceglie un altro dalla lista → solo allora l'endpoint assegna davvero. **"Scegli io"** mostra la stessa lista senza suggerimento. Endpoint `/api/assegna-pratica` modalità: `dry_run` (calcola), `demolitore_id` (assegna quello scelto, `manuale` true/false), legacy (auto).

### ⭐ RIASSEGNAZIONE / DISASSEGNAZIONE (6-7/07/2026)
Se ci sono difficoltà con un demolitore, l'admin può sempre cambiare:
- **"Riassegna a un altro demolitore"** → sceglie il nuovo dalla lista (in un colpo)
- **"Rimuovi assegnazione"** → la pratica torna `da_assegnare` (endpoint `assegna-pratica` con `disassegna: true`; azzera demolitore, date e scadenze)
- Ogni cambio setta **`pratiche.riassegnata = true`** → il CLIENTE vede messaggi SERENI (mai allarmanti) nel banner della sua area: "Stiamo scegliendo un nuovo demolitore" (se da_assegnare) / "Nuovo demolitore in arrivo… ti contatterà entro 8 ore lavorative" (quando riassegnata). Quando ci saranno le notifiche vere, questi eventi andranno anche lì.

### ⭐ IMPORTO UNA TANTUM SULLA PRATICA (vedi anche 3.10)
`pratiche.fee_concordata` + card "Importo pratica" nel dettaglio admin: prezzo concordato per la SINGOLA pratica (trattativa extra su auto interessante, o ritiro fuori copertura es. 300-400€). In fattura vince su tutte le tariffe. L'assegnazione fuori copertura si fa manualmente ("Mostra tutti i demolitori attivi").

### ⚠️ Fix applicati (erano i bug che bloccavano tutto)
1. ✅ **Velocità storica**: ora su `data_ritiro_effettuato` (non più certificato rottamazione)
2. ✅ **Colonne aggiunte a `pratiche`**: `data_assegnazione`, `data_ritiro_effettuato`, `scadenza_proposta_ritiro`, `assegnazione_manuale` (mancavano → l'assegnazione falliva)
3. ✅ **`demolitori.stato`** esiste
4. ⭐ **CONVERSIONE PROVINCIA sigla→nome** (`lib/province.ts`): le pratiche salvano la provincia come **sigla** ("ME", presa da Google), la copertura usa il **nome** ("Messina"). L'algoritmo converte prima di confrontare, altrimenti "nessun demolitore copre".
5. ✅ Fallback nessun demolitore → `in_assegnazione_manuale`
6. ⏳ Media recensioni nello scoring (dopo sistema recensioni)
7. ⏳ **`GOOGLE_MAPS_SERVER_KEY` su Vercel** ancora da aggiungere (in locale c'è; senza, l'automatica online non calcola le distanze)

## 4.8 Assegnazione MANUALE (DA COSTRUIRE)

Admin vuole SEMPRE poter assegnare lui stesso. Modale scelta (🤖 automatica / 🗺️ scelgo io) → mappa interattiva con pin cliente + demolitori (verde=copre, giallo=non copre, grigio=saturo) → card demolitore (dati, distanza, pratiche aperte, velocità, media recensioni) → "Assegna".
Componenti: modale in `/admin/pratiche/[id]`, `MappaSceltaDemolitore.tsx`, endpoint assegnazione manuale.

## 4.9 Sistema RECENSIONI (DA COSTRUIRE)

Cliente lascia **2 recensioni a fine pratica** (demolitore + NoiDemoliamo). **OBBLIGATORIE** prima del certificato di rottamazione.

```
"✅ Veicolo ritirato" → stato 'in_attesa_recensione_cliente' → notifica cliente
→ banner BLOCCANTE in dashboard → 2 card recensione (stelle 1-5 + commento opzionale)
→ invio → salvate in `recensioni` → stato 'in_attesa_cert_rottamazione'
→ MARKETING: se NoiDemoliamo ≥ 4 stelle → push "Recensiscici su Google Maps". Se ≤ 3: solo interna.
```

Tabella `recensioni`: vedi 3.12. Integrazioni: scoring algoritmo, dashboard demolitore, social proof homepage.

---

# 📂 PARTE 5 — STRUTTURA PROGETTO E PAGINE

## 5.1 Albero principale (approssimativo)

```
C:\Progetto_NoiDemoliamo\
├── app/
│   ├── page.tsx                              # Home pubblica
│   ├── layout.tsx                            # Layout root (no font Geist, viewport anti-zoom)
│   ├── globals.css                           # Tailwind globale
│   ├── login/page.tsx                        # Login multi-ruolo
│   ├── inizia/                               # Flusso cliente mini-step
│   │   ├── page.tsx                          # ⭐ Orchestratore: banner blu + getSteps dinamico + step inline
│   │   │                                     #   + traduciErrore() per errori in italiano (07/2026)
│   │   └── steps/                            # Step "storici" in file separati
│   │       ├── StepTipoVeicolo.tsx
│   │       ├── StepIdentificaVeicolo.tsx
│   │       ├── StepCambioVeicolo.tsx
│   │       ├── StepCondizioniVeicolo.tsx
│   │       └── AutocompleteIndirizzo.tsx
│   ├── dashboard/                            # AREA CLIENTE — ✅ RISTILIZZATA (07/2026, stile /inizia)
│   │   ├── page.tsx                          # Lista "Le tue pratiche"
│   │   └── [id]/
│   │       ├── page.tsx                      # Dettaglio pratica: header blu, banner stato SVG, tab pillole
│   │       ├── TabDocumenti.tsx              # ⭐ Sistema checklist COMPLETO (card stile /inizia,
│   │       │                                 #   fronte/retro, foto eliminabili) — vedi 5.6
│   │       ├── TabStato.tsx                  # Timeline + condizioni dichiarate a pillole + dati veicolo
│   │       ├── TabChat.tsx                   # Chat
│   │       └── UploadDocumentoModal.tsx      # ⚠️ LEGACY: non più usato da TabDocumenti, da rimuovere in pulizia
│   ├── admin/
│   │   ├── page.tsx                          # Dashboard admin
│   │   ├── copertura/page.tsx                # Mappa Italia
│   │   ├── demolitori/  (page + [id] + MappaComuni)
│   │   └── pratiche/[id]/  (page + DocumentiApprovazione)   # ⏳ DA RIFARE sul nuovo sistema checklist
│   └── api/assegna-pratica/route.ts
├── lib/  (supabase.ts, assegnazione.ts)
├── types/
│   └── pratica.ts                            # ⭐ Intestazione, Casistica (8), derivaCasistica,
│                                             #   delegaAmmessa, fermoApplicabile, CdcStato
├── public/  (logo, geojson)
├── .env.local
├── ARCHITETTURA.md                           # QUESTO FILE — la memoria del progetto
├── CLAUDE.md                                 # Letto automaticamente da Claude Code → rimanda qui
├── AGENTS.md
└── package.json
```

## 5.2 Flusso `/inizia` dettagliato — SISTEMA CASISTICHE ⭐⭐⭐

(Struttura step invariata da giugno — vedi storico. Novità luglio:)

- ⭐ **`traduciErrore()`**: gli errori Supabase in fase di submit sono tradotti in italiano semplice ("Failed to fetch" → "Errore di connessione. Controlla la tua rete e riprova."; email già registrata, password corta, email non valida, rate limit). L'errore originale finisce in console per il debug.
- ⭐ **Step foto**: il bottone "Continua comunque con X foto →" (1-3 foto) è ora ben visibile (bordo e testo blu, semibold) ma resta gerarchicamente sotto il "Continua" pieno che appare a 4+ foto — l'incentivo a caricare più foto rimane.
- ⭐ **LEGGIBILITÀ /inizia (7/07/2026, da test utente)**: titoli 21px extrabold con **parola chiave in BLU** — convenzione: nei `titoloPagina` di `getStepMeta` la keyword è racchiusa tra `*asterischi*` e l'helper `evidenzia()` la colora. Per un nuovo step basta marcare la parola nel titolo. Sottotitoli grigio scuro (mai grigio chiaro), opzioni (RuoloButton) con bordo 2px e titolo bold scuro, avviso ambra "NON è il libretto" sullo step CDC. NIENTE frecce → nei bottoni; bottoni WhatsApp inline rimossi (c'è il pulsante fisso, etichetta "Serve aiuto?" ciclica ogni 15s).
- ⭐⭐ **SECONDA PRATICA PER CLIENTE REGISTRATO** (6-7/07/2026): `/inizia` rileva la sessione attiva (solo tipo 'cliente'). Se loggato: lo step finale diventa "Conferma e invia" (NIENTE email/password — prima si bloccava su "email già registrata"), nome/telefono precompilati da `utenti`, e la pratica si aggancia a `user_id` esistente → le pratiche si accodano nella sua area. Ingresso dal bottone tratteggiato "**+ Richiedi un'altra demolizione**" in fondo alla lista pratiche della dashboard cliente. Il trigger checklist lavora per pratica, quindi ogni pratica ha i suoi documenti.

### Ordine step (14-15 visibili; getSteps è dinamico in base alle risposte)

```
1  TIPO VEICOLO (griglia 4+4 + "Altro")
2  INTESTAZIONE (6 opzioni → deriva la casistica)
2b RAMO EREDI (solo rinuncia sì/no — ⭐ 22/07: via il contatore eredi)  [solo deceduto]
2c RAMO SOCIETÀ FALLITA                                [solo società]
3  IDENTIFICA VEICOLO (anno, km, marca, modello)
4  CAMBIO                                              [solo auto/minicar/furgone/pullman/camion/altro]
5  CONDIZIONI (4 card-riga: incidentata/cammina/va in moto/parti mancanti + note)
6  INDIRIZZO + SPAZIO CARRO ATTREZZI
7  TARGA (+ box targhe presenti; adattato per targhe straniere)
8  CF DINAMICO                                         [saltato per targhe straniere]
9  FOTO (gamification 4 foto)
10 FERMO AMMINISTRATIVO                                [saltato per targhe straniere]
11 CONSEGNA (io/delegato)                              [saltato per non_intestatario e targhe straniere]
12 LIBRETTO
13 CDC (regola ottobre 2015)                           [saltato per targhe straniere]
14 ACCOUNT FINALE UNIFICATO ("Ultimo passo!")
```

### ✅ Collaudi end-to-end superati
- 12/06: 3 pratiche test (persona_fisica con delegato, societa con P.IVA, targhe_straniere)
- 07/2026: pratica "EEEEE" (autovettura fiat panda, Messina) creata dal flusso completo → **trigger checklist verificato con pratica reale** ✅

### Personalizzazione dinamica per tipo veicolo
Invariata: banner, titoli, articoli, generi (isFemminile: autovettura/minicar/imbarcazione), tipoAltro ovunque, helper functions (articolo, articoloDel, pronomeTuo, nomeVeicolo, veicoloHaCambio, ICONE_VEICOLO, getStepMeta con parametro `intestazione`).

### Ottimizzazioni mobile (sempre valide)
Anti-zoom iOS (text-base 16px), inputMode corretti, NO scrollIntoView automatico, viewport meta, theme color blu, bottoni Continua mai disabilitati (validazione al click), normalizzazione targa/CF, formattazione km, gamification foto.

## 5.3 Pagine FATTE ✅

- **Home `/`**: ✅ stile app (lavanda, logo, spunte SVG, bottoni app, riga rassicurazione, WhatsApp)
- **Login `/login`**: ✅ stile app (header blu, campi con icona, mostra/nascondi password); NO "Registrati" (ruoli diversi); redirect per ruolo admin/demolitore/cliente (commerciante DA AGGIUNGERE)
- **Flusso `/inizia`**: COMPLETO E COLLAUDATO ⭐⭐⭐ (+ errori in italiano)
- ⭐ **Cambio dentro Identifica** (8-9/07/2026): lo step "cambio-veicolo" NON esiste più — il tipo di cambio è una tessera con due opzioni (Manuale/Automatico, niente "Non lo so") dentro lo step Identifica, visibile solo per i mezzi che hanno il cambio. Flusso a 13 passi per un'autovettura. Campi di Identifica come "tessere" (etichetta scura + icona blu, focus blu, errore rosso).
- ⭐ **Bozza persistente `/inizia`** (8/07/2026): dati e passo corrente salvati in sessionStorage a ogni modifica → navigare via (es. pagine legali) o ricaricare NON fa perdere il modulo. La password NON viene mai salvata; le foto vivono solo in memoria (dopo un reload vanno riselezionate). Bozza cancellata a invio riuscito. Clamp difensivo sull'indice del passo (bozze salvate con flussi più lunghi).
- **Pagine `/privacy` e `/termini`** (8/07/2026): bozze complete in stile app, linkate dallo step account (si aprono in nuova scheda). Contengono segnaposto **[DA COMPLETARE]** (ragione sociale, P.IVA, sede, email di contatto): da riempire quando dominio/email aziendale saranno pronti — Davide vuole farlo "quando sarà tutto pronto".
- **`/dashboard`**: ✅ RISTILIZZATA (07/2026) — sfondo lavanda, card bianca, header blu con saluto + Esci, card pratiche stile /inizia con icona veicolo per tipo, badge stato a pillola chiara, empty state con SVG
- **`/dashboard/[id]`**: ✅ RISTILIZZATA (07/2026) — header blu con "← Pratiche" + "Marca Modello · Targa" + badge stato, banner dinamico per stato con icone SVG, tab a pillole (attiva blu piena). Tab Documenti = sistema checklist completo (vedi 5.6), Tab Stato = timeline + condizioni a pillole, Tab Chat invariata
- **AREA ADMIN = CRM da PC** ✅ (rifatta 6/07/2026, stile app in versione dashboard densa; NON mobile). **Sidebar condivisa** `app/admin/_components/AdminSidebar.tsx` (Pratiche · Demolitori · Copertura) su tutte le pagine.
- **`/admin`**: ✅ CRM pratiche per **priorità d'azione** ("Da fare ora": da contattare, da approvare, da assegnare, in corso) + ricerca + colonna Attesa (rossa oltre 30 min) + colonna demolitore. Cestino per riga (elimina definitiva). Bottone "Pulisci account senza pratiche".
- **`/admin/pratiche/[id]`**: ✅ RIFATTA — approvazione documenti sul nuovo sistema checklist (approva/rifiuta con motivo, "approva tutti", banner "da contattare", tutti i dati dichiarati dal cliente), assegnazione (auto+manuale con nome demolitore), eliminazione doppia scelta (solo pratica / pratica + account cliente).
- **`/admin/demolitori` + [id]**: ✅ RIFATTA — lista a card; scheda "profilo CRM" (7/07/2026): testata blu con statistiche e toggle Attivo/Non attivo, anagrafica in LETTURA con modifica a tasto, tariffe per zona, **Note e cronologia** (timeline), **copertura a tendina** (zone a pillole sempre visibili, mappa solo premendo Modifica, "Salva copertura" solo se modificata — logica `MappaComuni` intatta).
- ⭐ **Convenzioni mappa copertura** (8/07/2026): il pannello mostra SOLO le zone coperte, MAI la lista dei comuni esclusi (le esclusioni restano nella logica/DB come `comune_escluso`, visibili sulla mappa come "buchi" non colorati). Province/regioni con esclusioni interne hanno badge giallo **"parziale"**: nel pannello mappa è live, nelle pillole della card "Area di copertura" riflette il DB (appare dopo "Salva copertura"). Tooltip gerarchico: zoom province → mostra la regione; zoom comuni → mostra provincia · regione.
- ~~`/admin/copertura`~~: ELIMINATA (7/07/2026) — la copertura si gestisce solo dentro la scheda demolitore.
- ⭐ **ACCESSO DEMOLITORE — FASE 1 dashboard demolitore** ✅ COLLAUDATA end-to-end (8/07/2026): bottone "Invita all'area" nella testata della scheda demolitore → `/api/invita-demolitore` genera il link Supabase (invite, o recovery se già registrato), collega `utenti.demolitore_id`, manda l'email via Resend (`lib/email.ts`) **oppure mostra il link da inviare a mano** finché Resend non è configurato → il demolitore sceglie la password su `/imposta-password` → area `/demolitore` (guscio: benvenuto + anteprima funzioni; la dashboard vera è la fase 2). Login multi-ruolo: tipo 'demolitore' → `/demolitore`.
- ⭐ **Eliminazione definitiva demolitore** (8/07/2026): zona pericolosa in fondo alla scheda, conferma riscrivendo la ragione sociale → `/api/elimina-demolitore` (blocca se ha pratiche APERTE; le storiche perdono solo il riferimento `demolitore_id`; cancella copertura, tariffe, note, account e riga).
- ⭐ **LED accesso + revoca** (8/07/2026): nella testata della scheda demolitore un LED dice se può entrare (verde "Può accedere" / rosso "Login disattivato", stato letto dal server via `/api/accesso-demolitore`). "Revoca accesso" spegne SOLO il login (utenti+auth): scheda, note e pratiche storiche intatte, reinvitabile. Tre livelli: Non attivo (niente pratiche nuove, entra ancora) → Revoca (non entra, storico salvo) → Elimina (sparisce tutto).
- **Lista demolitori**: i "Non attivi" stanno in una sezione separata sotto gli attivi (contatore + rimando alle note per il motivo).
- ⭐⭐⭐ **AREA DEMOLITORE — FASE 2 (dashboard pratiche) FATTA** (8-9/07/2026): `/demolitore` = contatori + tab per fase (Da evadere con countdown 8 ore lavorative da `scadenza_proposta_ritiro`, Ritiri programmati, Da certificare, Completate, **Annullate SEMPRE visibili coi motivi** — deterrente voluto). Scheda `/demolitore/pratiche/[id]`: info complete (ritiro con Maps e spazio carro attrezzi, cliente con tel/CF/casistica/delegato, veicolo con badge e foto, box scuro "Da farti consegnare" dalla checklist `richiede_consegna`, documenti approvati con URL firmati 1h) + AZIONE contestuale per fase. Endpoint dedicati (il ruolo demolitore non tocca il DB): `/api/demolitore-pratiche` (lista+dettaglio), `/api/demolitore-azioni` (fissa/sposta ritiro → stato `ritiro_confermato`; segna ritirata → `data_ritiro_effettuato`+`ritirata`; rottamazione a mano), `/api/demolitore-certificato` (upload rottamazione → `in_attesa_cert_radiazione_pra`; upload PRA → `completata`). Colonne nuove: `pratiche.cert_rottamazione_url`, `cert_pra_url`, `cert_rottamazione_a_mano` (migrazione in docs/sql). Auth condivisa in `lib/demolitoreAuth.ts`.

## 5.4 Backend / API

- **`/api/assegna-pratica`** — algoritmo assegnazione ✅ (modalità dry-run / assegna demolitore scelto / auto). Converte sigla→nome provincia (`lib/province.ts`).
- **`/api/pratica-stato`** — ricalcola lo stato pratica dai documenti (service role). ⭐ 9/07: autorizzato anche il **cliente proprietario** (non solo admin) — il TabDocumenti lo chiama dopo ogni invio/eliminazione, così il banner del cliente si aggiorna da solo. Regola corretta: `in_attesa_approvazione_admin` SOLO quando **TUTTI** i documenti sono inviati (prima bastava il primo) → nel CRM una pratica entra in "Documenti da approvare" solo a invio completo.
- ⭐ **`/api/modulo-pdf`** (nuovo 10/07, rivisto 15/07) — download dei moduli PDF: `GET ?checklist_id=...` con Bearer token (cliente proprietario o admin). Genera al volo e traccia `scaricato_il`. ⭐⭐ **DECISIONE 15/07 (Davide): TUTTI i moduli escono IN BIANCO (niente autocompilazione, nemmeno le deleghe — si rivaluterà in futuro; il generatore accetta ancora i dati, l'endpoint non li passa) e sono scaricabili SUBITO (niente blocco pre-verifica)**. Deleghe e autodichiarazione = pdf-lib in bianco (la casistica serve solo per la qualifica del fermo); curatore e ACI = PDF originali da `docs/moduli/originali/`, inclusi nel deploy via `outputFileTracingIncludes`. Gli errori di download mostrano al cliente il motivo vero (es. "Non autorizzato (401)" = sessione da rifare).
- ⭐ **`/api/pratica-dati`** (nuovo 9/07, esteso 17/07) — modifica dei dati importanti della pratica dall'admin (regola "modifica a tasto"): Cliente (nome/telefono/CF), Veicolo (targa/marca/modello/anno/km), Ritiro (indirizzo con **autocomplete Google** che aggiorna anche comune/provincia/CAP/lat/lng), Dichiarazioni (libretto, fermo, targhe, delegato) e Attesa (in_attesa/motivo/dal). Campi in whitelist, targa/CF normalizzati maiuscoli. ⭐⭐ **Sincronizzazione checklist GENERALIZZATA** (17/07): ogni dichiarazione modificata accende/spegne i documenti della sua condizione nel catalogo (`fermo_si`, `libretto_smarrito`, `targhe_assenti`, `delegato`) e ricalcola lo stato; le righe con file caricati non si toccano MAI. Delega rifiutata per non_intestatario/targhe_straniere. Le condizioni dichiarate dal cliente (incidentata/cammina/…) restano di sola lettura. Solo admin.
- ⭐ **`/api/pratica-cdc`** (nuovo 9/07) — esito della telefonata "non sa che certificato ha": l'admin preme **Cartaceo / Digitale / Smarrito** nel banner "Da contattare" → aggiorna `pratiche.certificato_proprieta` e **sincronizza la checklist** col catalogo (cartaceo → aggiunge il CDC cartaceo da fotografare + originale al ritiro; smarrito → denuncia di smarrimento, come da file casistiche; digitale → nulla), poi ricalcola lo stato. Le righe con file già caricati dal cliente NON si toccano mai. Dopo la scelta, pillola "Cert. proprietà" + link **"Cambia"** per correggere (finché la pratica è in fase documenti). Solo admin.
- **`/api/elimina-pratica`** — eliminazione definitiva (storage + righe collegate + pratica; opzione account cliente).
- **`/api/pulisci-utenti`** — cancella account clienti senza pratiche (mai admin/operatori).
- **`/api/invita-demolitore`** — invito all'area demolitore (link Supabase + email Resend o link manuale).
- **`/api/elimina-demolitore`** — eliminazione definitiva demolitore (blocca con pratiche aperte).
- ⭐ **Email transazionali**: `lib/email.ts` (Resend). Env: `RESEND_API_KEY` + `EMAIL_FROM` (finché mancano, gli inviti danno il link da mandare a mano). Dominio noidemoliamo.it GIÀ COMPRATO da Davide: da collegare a Vercel e verificare su Resend (SPF/DKIM/DMARC).
- ⭐ **Google Maps**: caricatore condiviso `lib/googleMaps.ts` — carica lo script UNA volta per pagina (autocomplete indirizzo + mappa copertura convivono senza conflitto).

## 5.5 Verifica PRA ACI — ABBANDONATA per ora

Bloccante: reCAPTCHA su `iservizi.aci.it`. Opzioni future: bookmarklet/estensione Chrome con captcha manuale, oppure Openapi.it Visura Targa PRA (~6€/chiamata). Riprendere quando il flusso cliente sarà stabile.

## 5.6 ⭐ TabDocumenti — com'è fatto (RIFATTO A WIZARD 8-9/07/2026)

Il componente più importante dell'area cliente. **Design a WIZARD approvato da Davide dopo mockup** (il layout precedente "tutti i documenti in lista" è stato sostituito; un tentativo intermedio con "consegna a mano" è stato PROVATO E RIMOSSO — vedi decisioni 8-9/07):

- **Filo logico dall'alto in basso**: striscia "inviati" ↑ → documento attivo → coda "Dopo questo" → bottone di pagina → box ritiro. Il cliente vede UNA cosa da fare alla volta.
- **Striscia "N documenti inviati"** in cima, richiudibile (chiusa di default): aperta mostra una riga per documento con pillola blu "In verifica"/verde "Approvato" (stesse pillole dell'admin, NIENTE ambra) e TUTTE le miniature (✕ di eliminazione solo finché in verifica).
- **Wizard**: barra "DOCUMENTO X DI Y" + card del SOLO documento attivo; fila unica per tutti i documenti `richiede_upload` (anche per erede, col suffisso "(primo erede)…" — l'accordion eredi non esiste più); i RIFIUTATI passano davanti (card rossa, badge "Da rifare", nota_admin).
- **Solo foto**: nelle caselle fronte/retro un unico bottone tondo blu "Scatta" (`capture=environment`; su PC il browser apre la scelta immagine). Niente doppio input foto/file, niente "unico file".
- **Modalità "Allega file"** (scansioni/PDF): link discreto in FONDO alla card ("Hai una scansione o un PDF? Allega file") — MAI sotto le caselle (suggerirebbe una quantità). Attivata: le caselle fronte/retro SPARISCONO, lista allegati con nome + ✕, riquadro tratteggiato "Allega un altro file" (uno o più). **Il completamento lo dichiara l'utente**: il Continua si accende dal primo file ("Hai allegato tutto? Premi Continua") perché il sistema non può sapere se un file basta. Con le foto invece il conteggio è automatico (fronte+retro).
- **Bottone di pagina contestuale** (stile "Continua" di /inizia, fuori dalla card, tutta larghezza): "Vai al prossimo documento" / sull'ultimo "Vai alle foto del veicolo"; grigio finché non completo, "Invio…" durante l'invio; invia in verifica e apre da solo il prossimo. Suggerimento nella card ("Scatta il retro per continuare" / "Foto complete" verde).
- **Foto del veicolo = ULTIMO PASSO della fila** ("ULTIMO PASSO · FOTO DEL VEICOLO"): stessa card dei documenti con griglia + Scatta/Galleria. Niente più sezione separata in fondo (era "un pugno in un occhio").
- **Anteprima**: modale con solo titolo e ✕ (il link "Apri in nuova scheda" è stato RIMOSSO ovunque lato cliente).
- **Moduli PDF** (template_pdf): card informativa con badge "Modulo", fuori dalla fila.
- **"Da portare al ritiro"**: box smeraldo collassabile con la lista dei `richiede_consegna=true` — INTATTO, logica casistiche.
- **Dati**: due query separate (checklist + catalogo) unite in JS — NIENTE join `!inner` PostgREST (manca la FK dichiarata). Signed URL 1h per il bucket privato.

### ⭐ AGGIORNAMENTI 9/07/2026 (rifiniture wizard, tutte approvate da Davide su mockup)

- **Card "Hai fatto tutto"** (blu, aeroplanino): quando TUTTI i documenti sono inviati E c'è almeno una foto del veicolo — "NoiDemoliamo sta controllando i tuoi documenti, non devi fare altro". Se i documenti sono inviati ma mancano le foto: card blu ridotta "Documenti inviati". Verde ("Documenti tutti approvati") resta per l'approvazione admin. L'anello di progresso appare solo mentre il wizard è in corso.
- **Pannello inviati col FLIP**: righe SENZA miniature (nome + pillola + freccetta blu); tocco sulla riga → **tutto il pannello si gira** (rotateY) e sul retro mostra quel documento in grande (miniature a mezza larghezza con etichetta Fronte/Retro, ✕ per eliminare, tocco = anteprima); "Torna ai documenti inviati" lo rigira. Tendina apri/chiudi sull'intestazione. Le **foto del veicolo sono l'ultima riga** del pannello (col "+ Aggiungi" sul retro). Altezza animata via ref; componente `PannelloInviati`.
- **Foto a tutta casella (fronte/retro)**: la foto caricata RIEMPIE la casella (aspect 4:3, cover), etichetta FRONTE/RETRO a pillola sopra la foto, casella vuota della stessa altezza. Via le miniature piccole nel riquadro mezzo vuoto.
- **Eliminazione "sul posto" (A+D)**: ✕ **scura trasparente** `rgba(15,23,42,0.55)` al posto della rossa, e conferma **SULLA foto stessa** (overlay "Eliminare questa foto?" Annulla/Elimina) — o **in riga** per allegati e miniature piccole. NIENTE più modali a schermo intero per eliminare. Componenti `XElimina`, `ConfermaSullaFoto`, `ConfermaInRiga`. Identico in tutta l'area cliente.
- **Aggiornamenti fluidi**: la rotellina a schermo pieno appare SOLO al primo caricamento; upload/invii/eliminazioni aggiornano in silenzio (`carica()` senza spinner) e i **signed URL vengono riusati** (niente lampeggi). Il pannello girato resta girato dopo un'eliminazione.
- **Bottone di pagina SOPRA la coda**: ordine = card documento → "Vai al prossimo documento" → "Dopo questo" → box ritiro. Sull'ultimo documento il bottone dice "Invia l'ultimo documento" (il passo foto NON è più nella fila del wizard).
- **FOTO DEL VEICOLO: banner giallo → card senza limiti** (chiude il buco "Continua senza foto" di /inizia): con 0 foto appare il **banner giallo compatto** "Mancano le foto del veicolo — ci servono per capire che tipo di carro attrezzi mandare ed evitare viaggi a vuoto…" (TUTTA la card è il bottone, bollino tondo "Aggiungi" a destra). Tocco → card di caricamento: spiegazione carro attrezzi, Scatta/Galleria, griglia foto. **NESSUN limite né soglia** (1 o 6 foto vanno bene), niente riquadri-guida con etichette: il completamento lo dichiara il cliente con "**Ho finito con le foto**" (acceso dalla prima foto) → card chiusa, "Hai fatto tutto", foto come riga nel pannello.
- **Box giallo "Da chiarire insieme" RIMOSSO** lato cliente (e col box anche il suo bottone WhatsApp): vede tutto solo l'admin ("Da contattare") e chiama lui. Il libretto resta fuori dalla lista da caricare.

## 5.7 ⭐⭐ AGGIORNAMENTO AUTOMATICO — `lib/aggiornaLive.ts` (22/07/2026)

Il sistema è **istantaneo su tutto** (richiesta esplicita di Davide): nessuna pagina deve richiedere il refresh manuale. Hook condiviso `useAggiornaLive({ canale, tabelle, onCambio, pollingMs, attivo })` con **3 livelli**:

1. **TEMPO REALE** — Supabase Realtime (postgres_changes): il DB avvisa le pagine aperte nell'istante in cui una tabella osservata cambia. Le tabelle vanno abilitate alla pubblicazione (`docs/sql/2026-07-22-tempo-reale.sql`, ESEGUITA: pratiche, pratica_documenti_checklist, foto_pratiche, messaggi_chat, pratiche_note, documenti_approvazione). Il realtime rispetta le RLS: a ogni utente arrivano solo le righe che può vedere.
2. **RITORNO SULLA PAGINA** — visibilitychange/focus: si cambia finestra e si torna → dati freschi (max una volta ogni 3s).
3. **CONTROLLO PERIODICO** — rete di sicurezza: default 60s (chat 30s, demolitore 20s), solo a pagina visibile.

**Regole**:
- `onCambio` è SEMPRE la ricarica **silenziosa** del componente (niente spinner, niente sobbalzi, signed URL riusati; le chat confrontano il JSON prima di aggiornare lo stato per non far saltare lo scroll).
- Eventi a raffica ("approva tutti") → UNA ricarica (debounce 400ms interno all'hook).
- **Area demolitore**: niente accesso diretto al DB (RLS) → hook SENZA tabelle (solo livelli 2+3, polling 20s). La scheda demolitore va in pausa (`attivo: false`) mentre il form del ritiro è aperto, per non sovrascrivere ciò che si scrive.
- ⭐ **Ogni NUOVA pagina con dati condivisi deve usare questo hook** (e le sue nuove tabelle vanno aggiunte alla pubblicazione realtime nella stessa SQL di creazione).
- **Cintura di sicurezza server-fresh**: prima di mutare un documento, TabDocumenti rilegge lo stato dal DB — un documento `approvato` non si modifica mai, nemmeno da una pagina rimasta vecchia.

---

# 🎨 PARTE 6 — DESIGN SYSTEM

> Approvato il 22/05/2026, esteso a giugno con `/inizia`, **UNIFICATO a luglio 2026: tutta l'area cliente usa il linguaggio "/inizia"**.

## 6.1 Colori principali

- **Sfondo AREA CLIENTE (tutte le pagine)**: `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` (lavanda) ⭐ esteso da /inizia a dashboard e dettaglio pratica
- **Contenuto**: card bianca `rounded-3xl shadow-lg`, centrata `max-w-md`
- **Header/banner blu**: `linear-gradient(90deg, #1d4ed8, #2563eb)` con bottone bianco/85 di navigazione a sinistra, eyebrow uppercase `text-blue-100`, badge stato a destra
- **Blu primario** (bottoni CTA, link): `bg-blue-600` hover `bg-blue-700` / `#2563eb`
- **Blu navy** (`#0d2144`): ora solo per accenti scuri (box "Da portare al ritiro", area admin legacy)
- **Theme color mobile**: `#2563eb`
- **Sfondo dashboard ADMIN (legacy)**: `bg-[#f0f4f8]` — l'admin verrà uniformato in seguito

## 6.2 Card/campi standard (stile "campi /inizia") ⭐ IL PATTERN DI RIFERIMENTO

- Bordo `1.5px solid #E5E7EB`, sfondo `#F9FAFB`, radius 14, padding 14
- **Quadratino icona 40px** `#DBEAFE` radius 12 con icona SVG blu `#2563eb` a sinistra
- Titolo `fontWeight 600` `#111827` (protagonista), sottotitolo `12px #6B7280`
- Variante errore/rifiutato: sfondo `#FEF6F6`, bordo `#F3C8C8`, tile `#FBDADA`, testo/icone `#C0392B`
- Badge a pillola chiara: es. "Da rifare" `#FBDADA`/`#C0392B`, "Modulo" `#DBEAFE`/`#2563eb`

## 6.3 Badge di stato pratica (pillole chiare)

in_attesa_documenti `#FAEEDA`/`#854F0B` · in verifica `#E0EDFB`/`#1E4E8C` · da rifare `#FBE2E2`/`#9B1C1C` · approvata/completata `#DCF3E4`/`#1F7A43` · assegnazione `#FDEBD9`/`#92500E` · ritiro confermato `#E4E4FB`/`#4338CA` · ritirata `#EDE4FB`/`#6B21A8` · certificati `#DDF2F0`/`#0F766E` · annullata `#E7EAEE`/`#4B5563`

## 6.4 Colori semantici

- **Verde** (positivo): `bg-green-50/300/700`; pillole condizioni `#EAF3DE`/`#27500A`; bottone invia `#16A34A`
- **Giallo/Ambra** (attesa): `bg-amber-50/200/800`; "in verifica" `#d99412`
- **Rosso** (problema): `bg-red-50/300/700`; eliminazione/rifiuto `#C0392B`
- **Azzurro sky** (info/💡): `bg-sky-50/200/800`

## 6.5 Tipografia

- **Font**: default sistema (Tailwind sans), NO font custom
- **Titoli pagina**: `text-xl font-semibold text-gray-900` / `text-lg font-bold` (dashboard)
- **Body**: `text-sm text-gray-700` · **Caption**: `text-xs text-gray-500` · **Micro**: `text-[10px]`/`text-[11px]`

### ⚠️ REGOLA MOBILE CRITICA
- **Tutti gli input/textarea**: `text-base` (16px, anti-zoom iOS) + `text-gray-900` + `placeholder:text-gray-400`

## 6.6 Componenti standard

- **Header blu area cliente**: [bottone bianco/85 nav] [eyebrow uppercase + titolo] [badge pillola]
- **Tab bar a pillole**: container `#EFF3F9` rounded-2xl p-1; tab attiva `#2563eb` bianca, inattive trasparenti `#5F6C7E`; badge rosso contatore
- **Banner stato dinamico**: gradiente per stato (blu/rosso/verde/indaco/viola/teal/grigio) + icona SVG in box `bg-white/20` — NIENTE emoji
- **Bollini azione** (Scatta/File): cerchio 38-40px `#DBEAFE`, icona blu, etichetta 10.5px semibold sotto; aprono direttamente camera/file picker
- **✕ eliminazione**: cerchietto rosso `#C0392B` 19-22px in alto a destra di miniature/foto, con bordo bianco; SEMPRE con modale di conferma ("L'azione non può essere annullata")
- **Modale conferma eliminazione**: icona cestino in cerchio rosso chiaro + 2 bottoni (Annulla / Sì, elimina con spinner)
- **Bottone invio verde**: `#16A34A` radius 11, icona aeroplanino, "Ho finito, invia in verifica"
- **RuoloButton** (/inizia): invariato
- **ErrorBadge / box 💡 / rassicurazioni telefono / timeline "cosa succede dopo"**: invariati (vedi storico giugno)
- **Form input**: `border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white`

## 6.7 Regole d'oro

1. **Mobile-first**: touch-friendly (min 44px)
2. **NO emoji nell'interfaccia funzionale**: solo SVG (feather-style, stroke ~1.7-1.9). A luglio rimosse anche da dashboard, banner stato e badge.
3. **Coerenza colori semantici**
4. **Personalizzazione tipo veicolo OVUNQUE** + generi corretti
5. **Stato sempre visibile** · empty state amichevoli (con SVG, non emoji)
6. **Input `text-base` + `text-gray-900` + `placeholder:text-gray-400`** sempre
7. **Bottoni `/inizia` mai disabilitati**: validazione al click
8. **Una sola cosa per pagina** nei mini-step
9. **Gamification dove possibile** (foto)
10. **NO scrollIntoView automatico** su input
11. ⭐ **Niente trattini "—" in NESSUN testo visibile all'utente** (ribadito da Davide il 26/07, "detto più volte"): titoli, bottoni, descrizioni, banner, avvisi. Non sono professionali. Al loro posto: due punti, parentesi o virgole. Unica eccezione ammessa: "—" come segnaposto di un valore vuoto (es. telefono non inserito).
12. **Niente gergo tecnico/burocratico nei testi utente**
13. **Rassicurare sui dati sensibili** (ogni campo telefono spiega l'uso)
14. **Possessivi nei label quando serve distinguere le persone**
15. **La pagina finale è una guida, non un modulo**
16. ⭐ **Niente grandi bottoni rettangolari dove basta un'azione compatta** (07/2026): bollini circolari, righe compatte
17. ⭐ **I nomi dei documenti sono i protagonisti visivi** delle card (07/2026)
18. ⭐ **Niente popup intermedi per scattare/caricare** (07/2026): i bottoni aprono direttamente fotocamera o file picker
19. ⭐ **Azioni distruttive sempre con conferma** e solo negli stati in cui il cliente può modificare

## 6.8 ⭐ DESIGN SYSTEM AREA ADMIN (CRM) — STABILE, approvato da Davide (7/07/2026)

> Il layout e i colori che piacciono a Davide. OGNI nuova pagina admin DEVE seguire questi input.

**Fondamenta**
- ⭐ **AGGIORNATO 23/07**: sfondo pagina **GRIGIO CHIARO `#ECEEF2`** (il lilla è stato tolto: "non inerente a NoiDemoliamo"); **sidebar BLU in dissolvenza** `linear-gradient(180deg,#2563eb 0%,#2563eb 65%,#7CA4F2 100%)` col logo vero; barre in alto BIANCHE; flusso a PILLOLE tonde; POCHE decorazioni (colore solo dove significa qualcosa). L'area cliente resta lavanda.
- ~~Sfondo pagina: lavanda~~ (superato, vedi sopra)
- **Card**: bianche, bordo `1.5px solid #E5E7EB`, radius 14, ombra morbida `0 1px 3px rgba(16,24,40,0.07)` (costante `STILE_CARD`)
- **Titoli card**: barretta blu verticale a sinistra + testo bold `#0F1B33` (componente `TitoloCard`)
- **NO emoji, NO freccette testuali** (←/→): solo icone SVG. Bottone "Indietro" = pillola grigia con chevron SVG

**Le liste sono CARD, non tabelle** (pratiche e demolitori):
- Quadratino icona 46px `#DBEAFE` (icona veicolo / iniziali), titolo bold 15px `#111827` protagonista, sottotitolo `#4B5563`
- Colonne interne separate da divisori verticali `#EEF1F5`, pillole di stato colorate, riquadro metrica a destra (attesa/aperte; rosso `#FCEBEB`/`#A32D2D` se urgente)
- Bordo sinistro 4px colorato per stato/urgenza; azioni (cestino) visibili solo al passaggio del mouse

**Pagine "profilo"** (scheda demolitore, riferimento per future schede):
- Testata **blu gradiente** `linear-gradient(120deg,#1d4ed8,#2563eb,#3b82f6)` con iniziali, SOLO ragione sociale/nome, toggle di stato, e **statistiche "in vetro"** (`rgba(255,255,255,0.14)`)

**Tipografia dei dati (bilanciamento approvato)**
- Titoli sezione: `#1E293B` bold uppercase 12px (con iconcina 28px `#DBEAFE`)
- Etichette dato: `#5B6779` bold uppercase 10.5px
- **Valori: `#3E4C63` semibold — MAI nero pieno** (il nero "spara")
- Dato in lettura: riquadro `#F6F8FB` bordo `#E5E9F0` radius 10

**Regola MODIFICA A TASTO (vale per ogni form admin)**
- Di default tutto in **sola lettura** (click sui campi non modifica nulla)
- Bottone blu **"Modifica"** (con matita) → campi editabili, tutti **identici** (bordo 1.5px, radius 10, focus ring blu; autocomplete in versione `compatto`)
- **"Salva" appare/si attiva SOLO se qualcosa è davvero cambiato** + avviso ambra "Modifiche non salvate" + bottone Annulla che ripristina
- Stesso principio per l'area di copertura (tendina: pillole zone sempre visibili, mappa solo in modifica)

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con AI per costruire la piattaforma.

## 7.1 🆕 METODO DI LAVORO: CLAUDE CODE (dal 3/07/2026)

Dal 3 luglio si lavora con **Claude Code (estensione VS Code)** sulla cartella `C:\Progetto_NoiDemoliamo`. Fine dell'era copia-incolla.

**Regole per Claude Code**:
1. ⭐ **REGOLA FONDAMENTALE**: prima di modificare file o eseguire comandi, SEMPRE proporre la modifica in linguaggio semplice e attendere conferma esplicita di Davide. Lui vuole pensarci prima.
2. Spiegare cosa si sta per fare SENZA gergo tecnico
3. Per i cambi di design: descrivere/mostrare prima l'idea, implementare dopo l'approvazione (Davide adora le anteprime con varianti A/B/C)
4. Un commit per blocco di lavoro sensato, messaggio in italiano chiaro; push su `main` = deploy Vercel
5. Chiedere a Davide di testare (localhost sul PC, URL Vercel su iPhone) prima di chiudere un task
6. **MAI toccare o stampare `.env.local`** e le chiavi
7. SQL su Supabase: Claude lo scrive, Davide lo incolla nel SQL Editor e conferma l'esito
8. **A fine sessione: proporre di aggiornare QUESTO file (ARCHITETTURA.md)** con quanto fatto — è la memoria del progetto tra le sessioni
9. `CLAUDE.md` (letto in automatico da Claude Code) deve solo rimandare qui: la fonte di verità è ARCHITETTURA.md

## 7.2 Stile di comunicazione

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non chiede** — linguaggio SEMPLICISSIMO, zero gergo
- **Risposte compatte, no preamboli**
- **Anteprime visive** PRIMA di ogni cambio di design — Davide le adora
- **Test su iPhone vero** via URL Vercel live (localhost non accessibile da telefono)
- Davide non ricorda i percorsi → indicare percorso completo + come aprirlo

## 7.3 Sequenza di lavoro tipica (con Claude Code)

```
1. Davide dice cosa serve
2. Claude esplora il codice, propone (anteprima visiva per design, opzioni se servono)
3. Davide CONFERMA esplicitamente
4. Claude modifica i file (Davide approva le modifiche proposte da Claude Code)
5. Problems = 0 → commit + push (con ok di Davide) → test su iPhone/browser
6. Feedback → correzioni → prossimo task
7. Fine sessione → aggiornare ARCHITETTURA.md
```

## 7.4 Convenzioni e note operative

- Errori React loop → riavviare `npm run dev` · Errori TS "fantasma" → Restart TS Server
- Panico Turbopack dopo spostamenti → cancellare `.next` (vedi 2.2)
- Dopo ALTER TABLE: se errori colonna → `NOTIFY pgrst, 'reload schema';`
- ⚠️ Build Vercel può fallire SILENZIOSAMENTE per mappe/switch non esaustivi (caso storico: `furgone` mancante in `nomeCapitalizzato`). Quando si aggiunge un valore a un tipo, verificare TUTTE le mappe che lo usano.
- Segnali VS Code: "M" arancione = da committare, numero rosso PROBLEMS = errori TS

---

# 📋 PARTE 8 — STATO ATTUALE (27 luglio 2026)

## 8.1 ✅ FATTO

### ⭐ SESSIONE 25-26 luglio 2026 — RIFINITURE /INIZIA E PANNELLO IMPOSTAZIONI (mockup → scelta di Davide)

- **Tipo di cambio (passo 4)**: Manuale/Automatico sono PILLOLINE TONDE con spunta (famiglia dei Sì/No, in blu), via i rettangoli bianchi.
- **Condizioni (passo 5)**: ordine "Va in moto? · Il motore si avvia" PRIMA, poi "Cammina? · Il mezzo è marciante e si sposta" (testo dettato da Davide: la domanda è slegata dal motore).
- ⭐ **Avvisi informativi = SCHEDA BLU** (via il giallo ambra, che è da allarme): quadratino azzurro con icona + titoletto bold + testo. Applicata a: denuncia smarrimento targhe (passo 7) e "Ottimo inizio!" foto (passo 9). Il verde resta per i traguardi.
- **✕ elimina foto in /inizia**: tondino scuro trasparente come XElimina della home cliente (via la X rossa).
- **Sheet "Aggiungi una foto"**: tendina dal basso sul telefono, FINESTRA CENTRATA su PC (sm:items-center).
- ⭐ **Impostazioni cliente: campo UNICO "Nome e cognome"** (come alla registrazione: tutto in `nome`, `cognome` si svuota) — decisione Davide 26/07.
- ⭐ **Modifica sul posto SENZA SOBBALZI (variante B su mockup)**: campo con solo FILO BLU sotto (niente cornice), zona valore/campo ad altezza fissa con dissolvenza, bottoni a larghezza riservata, hint/campi extra si aprono morbidi (grid 0fr→1fr). Regola valida per le prossime "modifiche sul posto".
- ⭐ **Regola trattini ESTESA** (6.7 n. 11): mai "—" in nessun testo visibile all'utente.

**Seconda parte (26/07 sera) — DETTAGLIO PRATICA ADMIN riorganizzato (variante C su mockup) + eliminazione + visore:**
- ⭐⭐ **LAYOUT VARIANTE C**: sotto la testata blu una **FASCIA DATI orizzontale di 4 schede** (Dichiarazioni e casistica, Cliente, Veicolo, Ritiro) così i dati si leggono subito; sotto, a sinistra il LAVORO più largo (Documenti, Chat, Cronologia) e a destra colonna stretta (300px) con le sole AZIONI (Assegnazione, Importo, cestino).
- ⭐ **Card a scomparsa cliccabili PER INTERO da chiuse** (non solo la freccetta), con accensione blu al passaggio del mouse; da aperte si chiudono solo dalla testata (i clic nel contenuto non le richiudono).
- ⭐⭐ **ELIMINAZIONE: un solo punto, nel dettaglio** (variante B su mockup "nuvoletta ancorata"): il cestino nella LISTA CRM è stato TOLTO (con la sua modale); nel dettaglio, in fondo alla colonna azioni, ICONA cestino discreta → **nuvoletta ancorata sopra** (becco, niente sfondo scuro, clic fuori chiude) con le DUE eliminazioni: "Elimina solo la pratica" / "Elimina pratica e account" (l'endpoint `/api/elimina-pratica` supportava già `elimina_account` con protezioni: mai admin/operatori, mai clienti con altre pratiche). Niente più modali centrali per eliminare.
- ⭐⭐ **VISORE DOCUMENTI/FOTO con ZOOM** (mockup: variante A + barretta della B): **frecce ai lati** dell'immagine a metà altezza (via i bottoncini in basso; ← → da tastiera restano); **doppio clic** sul punto da leggere = zoom centrato lì, trascina per spostarti, rotella per regolare; **barretta − / % / + / Adatta** sempre visibile in basso (scura). Vale per foto e documenti anche fronte/retro affiancati (zoom indipendente per lato); PDF invariati (iframe). Componente `ZoomImg` in `DocumentiApprovazione.tsx`; lo zoom si azzera cambiando voce.
- **Rifiniture CRM (26/07 notte)**: voce **Impostazioni** (tendina + "Pulisci account senza pratiche") spostata DENTRO `AdminSidebar` → fissa su tutte le pagine admin; **niente lampo grigio** cambiando pagina (durante il caricamento restano sidebar e struttura, la rotellina gira solo nei contenuti); **ricerca a PILLOLA** (variante A su mockup) gemella su Pratiche e Demolitori: 210px a riposo, 300px a fuoco con anello blu. La ricerca pratiche setaccia: targa, nome, telefono, marca, modello, comune di ritiro; quella demolitori: ragione sociale, città, provincia.

**Terza parte — ⭐⭐⭐ CRM "TUTTO IN UNA PAGINA": TENDINA SOTTO LA RIGA (serie di mockup approvati):**
- ⭐⭐ **TENDINA SOTTO LA RIGA** al posto del salto di pagina: clic sulla pratica in lista → sotto si srotola morbido (grid 0fr→1fr) un pannello con 4 sezioni **Cliente · Casistiche · Veicolo · Ritiro** (ordine scelto, "variante 2"); ritocco = si richiude. Email account caricata al volo da `utenti`; select lista esteso (CAMPI_LISTA) con tutti i campi della tendina.
- ⭐ **BLOCCO UNICO (variante 3)**: da aperta la cornice blu 2px ingloba riga+tendina (fondo grigino, ombra); la riga si tinge d'azzurro `#EFF6FF` con targa blu e fa da testata.
- ⭐⭐ **FILA AZIONI nella testata** (layout B): bottoni a pillolina **Documenti** (contatore approvati/totale + pallino rosso da verificare), **Chat** (pallino non letti), **Stato pratica** (nuvoletta ancorata con Attiva/Metti in attesa/Annulla, MOTIVO scritto nella nuvoletta — niente modali centrali; stessa logica server del dettaglio, note in cronologia), **Apri la pratica intera** (blu pieno, → pagina completa). I Documenti si aprono IN LINEA nella tendina (card vera con visore e zoom).
- ⭐⭐ **CHAT A FINESTRELLA** (2 giri di mockup: stile A + posizione A): fissa in basso a destra (340×430 FISSI: non balla cambiando linguetta o aprendo Gestisci), testata blu con nome+targa, bottone **ingrandisci** (470×600) accanto alla ✕. Dentro: chat COMPATTA con pilloline "Cliente / Demolitore (solo lettura)" (via i linguettoni e le frecce ↔), bolle piccole con orario, frasi rapide a chips sottili, campo a pillola con bottone tondo. **"Gestisci" NON apre finestre**: il corpo si trasforma nella gestione frasi (freccetta per tornare, campo slim + Salva solo se modificata + cestino discreto). La stessa card compatta vale nel dettaglio pratica. ⭐ All'apertura i messaggi del cliente si SEGNANO LETTI (il pallino si azzera davvero). Prop `finestra` su `ChatAdmin`.
- ⭐⭐ **PALETTE A PILLOLE DI STATO** (mockup + rifinitura): FLUSSO tutto AZZURRO `#EFF6FF`/`#1D4ED8` (parla il testo), **verde solo Completata**, **ROSSO TENUE** `#F3D9D9`/`#A94444` per Annullata e anomalie (· da rifare, · a mano), **azzurro spento** `#E8ECF3`/`#5B6779` per "In attesa" (pausa). Via giallo senape e arcobaleno. Applicata a lista, tendina e dettaglio (costanti `PILL_FLUSSO`/`PILL_ROSSO_TENUE`). ⭐ 27/07 sera: anche "Da contattare" in riga è passata al **rosso tenue** `#FBDADA`/`#9B1C1C` (il rosso medio pieno `#E15E5E` resta SOLO ai bottoni di rifiuto/eliminazione).

**Quarta parte — ⭐⭐⭐ CHAT A TRE CANALI (dettato da Davide, SQL eseguito):**
- Vedi 3.8 per il modello dati. **Admin** (finestrella CRM e card dettaglio): TRE linguette — **Cliente** e **Demolitore** scrivibili, "**Dem. e Cliente**" controllo qualità in sola lettura; il pallino rosso conta i non letti diretti a lui (cliente + demolitore) e si azzera aprendo la linguetta giusta. **Demolitore** (scheda pratica, `ChatDemolitore` rimontata dalla dispensa): pilloline **Cliente / NoiDemoliamo**, stile gemello, endpoint `/api/demolitore-chat` con param `canale`. **Cliente**: invariato alla vista (i suoi 2 canali), invii etichettati e contatore che esclude il canale riservato.
- ⚠️ La PAGINA demolitore (scheda pratica) è ancora da rivedere con Davide: la chat è il primo pezzo montato sulla tela bianca.

### ⭐⭐⭐ SESSIONE 27 luglio 2026 — CRM "TUTTO NELLA TENDINA": documenti a griglia, rifiuto a nuvoletta, modifica sul posto

> SQL della sessione (ESEGUITO da Davide): `docs/sql/2026-07-27-frasi-rifiuto.sql`
> (categoria su `messaggi_preimpostati`: 'chat' per le frasi della chat,
> 'rifiuto' per quelle del rifiuto documenti, con 4 frasi di serie).

- ⭐⭐ **DOCUMENTI A GRIGLIA nella tendina** (variante B su mockup, prop `compatta` su `DocumentiApprovazione`): tesserine 76px con badge di stato nell'angolo (verde approvato, blu in verifica, rosso rifiutato, grigio tratteggiato non caricato), miniatura vera per le foto, "**Verifica ora**" che apre il visore sul primo in attesa, clic su tessera = visore su quella; foto veicolo in un'unica tessera col contatore. La card intera resta nel dettaglio.
- ⭐⭐ **NOMI PRECISI per l'admin** (`nomeAdmin` + `RUOLO_CASISTICA`): il possessivo del catalogo cliente ("La tua carta d'identità") diventa il RUOLO secondo la casistica ("Carta d'identità dell'intestatario / dell'erede che gestisce / del legale rappresentante…") per il controllo incrociato coi dati dichiarati. Vale in griglia, visore e rifiuto.
- ⭐ **VISORE rifinito**: frecce **A ROTAZIONE** (dall'ultimo si riparte dal primo, anche da tastiera, mai bloccate); **rotella = zoom sempre** appena sei sopra; VIA il doppio clic e la scritta descrittiva (resta solo "1 di 5"); ⭐ **PDF NEL VISORE** (`PdfZoom`, libreria pdfjs-dist): le pagine diventano immagini e passano nello stesso visore delle foto (rotella, trascina, barretta), pillolina "Pag. 1/3" per i multipagina, via il visore grigio del browser.
- ⭐⭐ **RIFIUTO A NUVOLETTA** (variante A su mockup, "livello Apple"): via il finestrone centrale — nuvoletta ancorata al bottone Rifiuta col becco, documento sempre in vista, **frasi pronte a chips** (un tocco riempie il campo) e **gestione frasi IN LINEA** (matita → elenco con Salva-se-modificata e cestino, freccetta per tornare). Bottone "Rifiuta e avvisa il cliente".
- ⭐ **ROSSI MORBIDI sui bottoni** (#E15E5E, hover #D25151): rifiuto, annullo pratica, elimina account, pulizia account, elimina demolitore. Il rosso vivo resta SOLO alle spie (pallini contatori, badge rifiutato).
- ⭐ **CHAT SENZA LAMPI**: all'apertura niente scritte che lampeggiano (stati "non so ancora" = non mostrare nulla: né l'avviso SQL delle frasi né "Nessun messaggio" prima del caricamento).
- ⭐ **ICONE VEICOLI IDENTICHE a /inizia** nella lista CRM (moto vera, vespa, minicar, furgone, pullman, camion, barca, velivolo): cliente e CRM parlano la stessa lingua.
- ⭐ **SIDEBAR ADMIN COL FLIP**: clic su Impostazioni = la barra ruota (flip 3D) sulla faccia impostazioni ("‹ Impostazioni" per tornare, dentro Pulisci account e le prossime voci); via la tendina che si alzava.
- ⭐⭐⭐ **MODIFICA SUL POSTO nella tendina** (variante 1 su mockup: matita per sezione): ogni sezione (Cliente, Casistiche, Veicolo, Ritiro) ha la matita → righe ad ALTEZZA FISSA, valori che diventano campi slim col FILO BLU in dissolvenza, matita → Annulla·Salva in spazio riservato, bordo sezione azzurrino. Modificabile TUTTO: nome/telefono/CF, libretto/CDC/fermo/targhe (tendine con "Scegli…" disabilitato), targa/marca/modello/anno/km/cambio + condizioni a INTERRUTTORE (pilloline che si girano, grigie col "?" se mai risposte), indirizzo/spazio/delegato. Sola lettura: casistica, email, comune di ritiro (decide la copertura demolitori). Server: `/api/pratica-dati` (whitelist estesa: tipo_cambio + condizioni bool) e `/api/pratica-cdc` per il CDC; libretto/fermo/targhe sincronizzano la checklist come sempre.
- **PIANO DICHIARATO**: ✅ COMPLETATO (27/07 notte, vedi terza e quarta parte): la tendina copre TUTTO — "Apri la pratica intera" e la pagina di dettaglio `/admin/pratiche/[id]` sono stati **ELIMINATI**. Il CRM è davvero tutto in una pagina.

**Seconda parte (27/07 sera) — VISORE RIFATTO (mockup definitivo) + SCARICO PDF + CRM ad altezza schermo:**
- ⭐⭐ **VISORE, mockup definitivo approvato**: **TESTATA con la pratica in vista** (targhetta vera con banda blu, veicolo con anno, cliente — nuove prop `targa`/`veicolo`/`cliente` di `DocumentiApprovazione`, passate da dettaglio e tendina); **elenco con le MINIATURE** (immagine vera per foto e documenti, icona foglio per i PDF); **PALCO grigio ardesia `#5D6A7E`** ("dosaggio 3" scelto tra tre su mockup) con frecce trasparenti bianche; ✕ e Scarica in testata.
- ⭐⭐ **SCARICO PDF dal visore** (bottone Scarica, due strade): "**Questo documento**"/"Questa foto" = PDF singolo; "**Scegli cosa scaricare**" = caselle nell'elenco (parte con la voce corrente spuntata), in basso SOLO Annulla e "Scarica PDF (n)" (barra azzurra e scorciatoie BOCCIATE da Davide). Ne esce **UN PDF unico pronto da inoltrare** (es. solo le foto a un commerciante): pdf-lib lato browser, immagini su A4 con l'etichetta del documento (ruolo casistica + fronte/retro), PDF del cliente copiati pagina per pagina, nome file "Documenti TARGA.pdf"; se un file non entra il PDF esce comunque con l'avviso di cosa manca.
- ⭐ **Pagina dietro BLOCCATA col visore aperto** (bug trovato da Davide: rotella sull'elenco = scorreva la pagina sotto): `body.overflow=hidden` finché è aperto + `overscroll-behavior: contain` sull'elenco.
- ⭐⭐ **CRM AD ALTEZZA SCHERMO**: pagina `h-screen overflow-hidden` — sidebar, barra "Pratiche", flusso, allerte e filtri restano FERMI, **scorre solo la lista pratiche** (regola per quando saranno decine).
- ⭐ **FIX flip sidebar**: la faccia che ruota "sporgeva" in 3D e faceva comparire la barra di scorrimento (sobbalzo) — `overflow: hidden` sul contenitore del flip.
- ⭐⭐ **"DA CONTATTARE" PILLOLA DEL FLUSSO** (mockup approvato): via il riquadro rosso lungo — pillola gemella delle fasi PRIMA di "In attesa documenti" (non è una fase: niente freccia, solo uno stacco), **bianca a zero, rossa coi casi**, clic = filtro (come l'Allerta 8 ore). In riga la pillola "Da contattare" è passata al **rosso tenue** `#FBDADA`/`#9B1C1C` (via il rosso pieno).

**Terza parte (27/07 notte) — ASSEGNAZIONE, IMPORTO ed ELIMINAZIONE NELLA TENDINA (variante 3 + A3-destra su mockup):**
- ⭐⭐⭐ **PILLOLE NELLA TESTATA della tendina**: "**Assegnazione**" (spunta verde se assegnata) apre il pannello IN LINEA; "**Importo**" (badge con l'importo se impostato) apre una NUVOLETTA ancorata; **cestino tondo** con nuvoletta a due scelte (Elimina solo la pratica / pratica e account, stesso endpoint del dettaglio, chiude la tendina e ricarica). "Apri la pratica intera" resta finché Davide non decide di toglierlo.
- ⭐⭐ **PANNELLO ASSEGNAZIONE A DESTRA** (`PannelloAssegnazioneTendina`): le 4 schede vanno a sinistra su due file, il pannello occupa la colonna destra e la classifica si carica DA SOLA all'apertura. Ogni riga: posizione, nome, **città · km · giorni** (km in grassetto), **chip "N da ritirare"** (carro attrezzi; ambra da 10 in su), **fee applicabile** (tooltip con la zona della tariffa), bottone Assegna (blu pieno sul consigliato). Testata: "N demolitori coprono la zona" + **"Assegna in automatico"** (= il vincitore) + **"Scegli tu"** (tutti gli attivi nello stesso riquadro). **Scroll interno** max 150px (overscroll contain). Assegnata: box azzurro col demolitore e la data + **Riassegna** (ricalcola la classifica) e **Rimuovi** con conferma IN LINEA (niente modali). Non assegnabile: lucchetto "Prima approva tutti i documenti".
- ⭐ **DRY-RUN ARRICCHITO dal server** (`/api/assegna-pratica`): ogni candidato torna con `fee_applicabile` (fee_concordata della pratica, altrimenti tariffa più specifica comune→provincia→regione, altrimenti fee base), `zona_fee` e `da_ritirare` (**assegnate senza `data_ritiro_effettuato`**, escluse completate/annullate — il numero che Davide vuole vedere).
- ⭐ **IMPORTO A NUVOLETTA**: campo € con Salva, spiegazione tariffa di zona vs una tantum, link rosso spento "Torna alla tariffa di zona" quando impostato (`/api/pratica-fee`). `CAMPI_LISTA` esteso con `fee_concordata` e `data_assegnazione`.

**Quarta parte (27/07 notte) — IL CRM È TUTTO IN UNA PAGINA: via bottone e pagina di dettaglio (serie di mockup approvati):**
- ⭐⭐⭐ **PAGINA DI DETTAGLIO ELIMINATA**: `/admin/pratiche/[id]/page.tsx` CANCELLATA e "Apri la pratica intera" TOLTO dalla fila azioni — la tendina copre tutto. I componenti condivisi (`DocumentiApprovazione`, `ChatAdmin`, `CronologiaNote`) restano nella cartella `pratiche/[id]/`, importati dal CRM. La scheda demolitore ora punta a **`/admin?apri=<id>`**: il CRM legge il parametro al caricamento e apre subito la tendina di quella pratica.
- ⭐⭐ **DOCUMENTI = QUINTA SCHEDA sempre in vista** (variante 3 su mockup): in fila con Cliente · Casistiche · Veicolo · Ritiro, tesserine PICCOLE 40px senza nome (nome al passaggio del mouse), badge di stato nell'angolo, "Verifica" con la **spunta cerchiata** (via il play, scelta su mockup). La pillola Documenti è SPARITA dalla fila azioni; gli **esiti della telefonata CDC** (Cartaceo/Digitale/Smarrito) ora vivono nel banner "Da contattare" della scheda stessa.
- ⭐⭐ **CRONOLOGIA A FINESTRELLA** (scelta B su mockup): pillola "Cronologia" (orologio) nella fila azioni → finestrella fissa in basso a destra GEMELLA della chat (340×430, ingrandisci 470×600, testata blu, timeline con le pillole di sempre e campo nota). `CronologiaNote` ha la prop `finestra` come `ChatAdmin`.
- ⭐ **VISORE: pilloline Approva/Rifiuta rifatte** (mockup definitivo, 3 giri): "**Approva**" azzurra piena `#DBEAFE`/`#1D4ED8` con spunta (il verde nei bottoni è BOCCIATO: nell'app è dei traguardi; passa sempre da solo al prossimo documento), "**Rifiuta**" bianca bordo grigio testo rosso spento `#A94444` a peso NORMALE (il grassetto è bocciato), niente ✕. Link degli stati allineati.
- ⭐ **PALLINO SPIA sui badge della fila azioni** (variante C su mockup): via i numerini schiacciati — puntino rosso sull'angolo col bordino dello sfondo (ora resta sulla Chat).

**Quinta parte (27/07 notte) — RIFINITURE DAL TEST DI DAVIDE (mockup approvati):**
- ⭐⭐ **ORDINE PILLOLE deciso da Davide**: **Cronologia · Chat · Stato pratica · Trattativa Extra · Assegnazione** (cestino a destra). "Importo" RINOMINATO "**Trattativa Extra**" col simbolo dell'**EURO** (via il dollaro).
- ⭐⭐ **NUVOLETTA "Stato pratica" nella lingua del CRM** (mockup approvato dopo 2 giri bocciati: né menu a 3 colori né pilloline generiche): dentro ci sono **LE PILLOLE DI STATO VERE della lista** — Attiva (azzurro flusso), In attesa (azzurro spento con l'orologio), Annullata (rosso tenue) — quella corrente ha l'**anello blu** delle pillole attive del flusso; toccando attesa/annullo il campo MOTIVO si apre morbido sotto (Annulla · Conferma blu). Zero colori nuovi.
- ⭐⭐ **AVVISO "Dal modulo" sulla scheda Casistiche** (variante B su mockup): via il riquadro giallo "Da contattare" dalla scheda Documenti (coi bottoni CDC) — al suo posto una **pillola blu tenue** sotto la testata di Casistiche con le sole risposte critiche del cliente ("niente libretto · CDC da chiarire · fermo da verificare"), che VA A CAPO e sparisce da sola quando l'admin corregge con la matita. Le correzioni si fanno SOLO dalla matita di Casistiche.
- ⭐ **Anche il FERMO "non lo sa" fa scattare "Da contattare"** (decisione Davide): il predicato `daContattare` ora copre libretto no + CDC nessuno + fermo non_so — pillola del flusso, filtro, pillola in riga e priorità inclusi. Corretto il valore → la pratica rientra nel flusso.
- ⭐ **"Fermo" rinominato "Fermo Amministrativo"** nella scheda Casistiche.
- ⭐ **FINESTRELLE AFFIANCATE**: chat e cronologia vivono in un contenitore fisso UNICO in basso a destra (flex, gap 12, allineate in basso) — la cronologia si mette a sinistra della chat e non si sovrappongono mai, anche ingrandite. Le due componenti non sono più `position: fixed` da sole.
- ⭐ **NUVOLETTA "Trattativa Extra" SEMPLICE** (mockup approvato dopo 2 giri bocciati — la regola: sobria, professionale, comprensibile): titolo, UNA frase che spiega il concetto ("importo concordato col demolitore SOLO per questa pratica: sostituisce la sua tariffa e a fine mese va in prefattura così"), campo con etichetta "Importo concordato" + €, Salva blu; con la trattativa attiva compare il link "Rimuovi" (rosso spento). Il significato business: la trattativa BYPASSA ogni tariffa di zona per la singola pratica e finisce in prefattura così com'è.

### ⭐⭐⭐ SESSIONE 23 luglio 2026 — AREA DEMOLITORE: RICOSTRUZIONE GUIDATA DA DAVIDE (IN CORSO)

> ⚠️ **METODO SPECIALE PER QUEST'AREA** (dopo 3 tentativi di design bocciati): Davide DETTA
> un pezzo alla volta, Claude mette SOLO quel pezzo e si ferma per il giudizio. NIENTE
> assemblaggi autonomi, NIENTE mockup per quest'area: si costruisce direttamente sul vero.
> **Layout di riferimento: il CRM admin** ("uguale alla mia"). Regola colori: SOLO pillola
> di stato e countdown colorati, tutto il resto neutro.

**COSTRUITO E APPROVATO finora:**
- ⭐ **Barra laterale sinistra A SCOMPARSA** (`_components/SidebarDemolitore.tsx`): colonnina di icone che si apre all'avvicinarsi del mouse (sul telefono: menu ☰ a tenda). In testa il NOME DEL DEMOLITORE; voci: Pratiche · La tua azienda (apre il pannello anagrafica) · Fatturazione "PRESTO" · Esci in fondo. È L'UNICA COSA sopravvissuta ai redesign — non toccarla.
- **Pannello anagrafica a tenda da destra** (`_components/PannelloAnagrafica.tsx`, endpoint `/api/demolitore-profilo`): dati azienda in sola lettura ("li gestisce NoiDemoliamo"), Esci in fondo. Qui in futuro: fatturazione ecc.
- **Home demolitore** (`app/demolitore/page.tsx`): layout IDENTICO al CRM admin — barra bianca con "Pratiche · N totali · nome" e ricerca, sfondo lavanda, "FLUSSO PRATICHE" con le caselle stile FaseCard. Per ora UNA casella: "**Pratiche assegnate**" (solo nome + numero rosso — Davide ha fatto togliere "TOCCA A TE", "Il cliente vede" e la riga 8 ore). Sotto: pillola "**Tutte N**" (chip stile admin). **Card pratica dettata da Davide**: [PILLOLA di stato per prima a sinistra] [targa · modello e anno] [la via di dove si trova] [countdown 8 ore a destra in rosso]. Niente altri colori, niente icona veicolo.
- **Scheda pratica** (`app/demolitore/pratiche/[id]/page.tsx`): **TELA BIANCA** — solo barra laterale, briciole "Pratiche / TARGA", targa e veicolo. Da ricostruire su dettatura.
- **In dispensa, pronti da reinserire** quando Davide li chiede: `_components/ChatDemolitore.tsx` e `_components/NoteDemolitore.tsx` (funzionanti, stile da adeguare).

**FONDAMENTA (fatte oggi, INDIPENDENTI dal design):**
- **Endpoint nuovi**: `/api/demolitore-chat` (chat demolitore↔cliente, segna letti, il cliente la vede nella linguetta Demolitore, l'admin la legge già); `/api/demolitore-note` (note cronologiche "chiamato, non risponde" → `pratiche_note` con `autore='demolitore'`, il demolitore vede SOLO le sue); `/api/demolitore-profilo` (anagrafica sola lettura). `/api/demolitore-pratiche` lista arricchita: telefono, CF, anno, km, casistica, indirizzo, `non_letti` (messaggi cliente non letti).
- ⭐ **SPOSTAMENTO RITIRO CON MOTIVO OBBLIGATORIO** (`/api/demolitore-azioni`): se una data c'era già, senza motivo il server RIFIUTA; il motivo finisce in `pratiche_note` ("Ritiro spostato dal X al Y — Motivo: …") → cronologia admin.
- **Cronologia admin**: pillola celeste "**Demolitore**" (icona carro attrezzi) sulle note con `autore='demolitore'`. SQL: `docs/sql/2026-07-23-note-demolitore.sql` (colonna `autore`, ESEGUITA).
- ⭐ **ALLERTA 8 ORE nel CRM admin**: riquadro rosso "Allerta 8 ore · N — il demolitore non ha fissato il ritiro nei tempi" accanto a "Da contattare" (appare solo se >0, clic = filtro). Predicato: stato assegnata/in_attesa_conferma_cliente + `scadenza_proposta_ritiro` scaduta.
- **Fasi del flusso demolitore** (`_lib/api.ts` `gruppoDi`): arrivo · fissato · rottamazione · targhe · completate · annullate ("Non a buon fine").

**DA COMPLETARE (ripartire da qui, un pezzo alla volta su dettatura di Davide):**
1. **Home**: le altre caselle del flusso (Ritiro fissato, Certificato rottamazione, Cancellazione targhe, Completate, Non a buon fine col motivo — Davide le vuole come deterrente, non modificabili, riattiva solo NoiDemoliamo)
2. **Scheda pratica**: ricostruire tutto — azione per fase (fissa ritiro / sposta con motivo / veicolo ritirato / carica certificati: "Certificato di rottamazione" 24h e "Certificato di cancellazione targhe (PRA)" 15gg, quello che completa), dati in sola lettura (il "Chiama" va sul DELEGATO se c'è), documenti solo visione, box "da farti consegnare", chat, note
3. **Notifiche 8 ore scadute**: email+app al demolitore e avviso a NoiDemoliamo → con la fase notifiche (Resend)
4. Regola ribadita: il ritiro effettivo fa partire la fatturazione; "ci sono altre cose" che Davide detterà

**SECONDA PARTE (sera) — PEZZI DETTATI E RESTYLING CRM (tutti approvati da Davide):**
- **Home demolitore**: pillola-fase "**Pratiche assegnate**" (solo nome + numero) + pillola filtro "Tutte N"; card pratica dettata: [PILLOLA stato per prima] [targa · modello e anno] [via del ritiro] [countdown 8 ore rosso]. Solo pillola e countdown colorati.
- ⭐ **FLUSSO CRM A PILLOLE TONDE** (variante B su mockup, admin E demolitore gemelli): numero nel tondino azzurro + nome, frecce in mezzo, attiva con anello blu. Caselle PULITE: via "chi agisce", "il cliente vede", sottotitoli e l'arcobaleno di colori.
- ⭐ **ALLERTA 8 ORE**: pillola IDENTICA e SIMMETRICA sotto "Assegnata" nella fila, SEMPRE visibile (bianca a 0, rossa coi ritardi), clic = filtro. Predicato `allerta8h()` in `/admin` (stato assegnata/in_attesa_conferma_cliente + scadenza scaduta).
- ⭐ **COLORI UNIFICATI** (via il lilla): sfondo **GRIGIO CHIARO `#ECEEF2`** su tutte le pagine admin e demolitore; **sidebar BLU in dissolvenza** (dosaggio 3: `linear-gradient(180deg,#2563eb 0%,#2563eb 65%,#7CA4F2 100%)`, testi bianchi) con **LOGO VERO** in testa; barre "Pratiche" in alto BIANCHE; card pratiche senza bordo sinistro colorato (restano pillole di stato + riquadro attesa). Bottone "Aggiungi" senza "+".
- **Sidebar admin: voce "Impostazioni"** (ingranaggio, tendina) in fondo — dentro "Pulisci account senza pratiche", lì andranno le prossime voci di servizio.
- ⭐ **DETTAGLIO PRATICA ADMIN rifinito** (mockup approvato): **Documenti, Chat e Cronologia A SCOMPARSA, CHIUSE all'apertura** (testata cliccabile con riassunto: "5 di 5 approvati", "N messaggi", "ultima: 21 lug"); **etichette in EVIDENZA e dati del cliente leggeri** (componente `Riga`: etichetta scura semibold a sinistra, valore grigio normale a destra — via il grassetto dai valori); "**Elimina definitivamente**" = scritta piccola sottolineata rosso spento (via il bottone). Font di sistema OVUNQUE (Inter provato e bocciato: pagine con font diversi non piacciono).

### ⭐⭐⭐ SESSIONE 22 luglio 2026 (seconda parte) — EREDI SEMPLIFICATI + AGGIORNAMENTO AUTOMATICO OVUNQUE

> SQL della sessione (entrambe ESEGUITE da Davide): `docs/sql/2026-07-22-eredi-semplificati.sql`
> e `docs/sql/2026-07-22-tempo-reale.sql`.

- ⭐⭐ **CASISTICHE EREDI SEMPLIFICATE** (decisione Davide, mockup approvato): via la domanda "**Quanti eredi hanno accettato?**" da /inizia (resta solo rinuncia sì/no + avviso ambra); nell'area personale si fotografa SOLO **chi gestisce la pratica** (la sua CI + il suo CF, una volta sola — mai moltiplicati per erede, come il cittadino privato); i documenti degli ALTRI eredi sono **fotocopie fronte/retro da consegnare al ritiro insieme alla Dichiarazione sostitutiva** (stesso principio del delegato 16/07). Catalogo: `CARTA_IDENTITA_EREDE`/`TESSERA_SANITARIA_EREDE` ora `per_erede=false` e nomi "La tua carta d'identità"/"La tua tessera sanitaria"; `numero_eredi` non viene più compilato dal flusso (colonna legacy). File casistiche aggiornato (casi 2 e 3).
- ⭐ **Moduli ACI eredità letti a fondo** (dai PDF veri): compila e firma **UNA sola persona** (il dichiarante, un erede che ha accettato), che si identifica allegando la fotocopia del SUO documento. Versione rinuncia: **tabella 1 = eredi che hanno ACCETTATO** (chi rinuncia per legge è come se non fosse mai stato erede), **tabella 2 = chi ha rinunciato** con gli estremi dell'atto (Notaio/Tribunale, n. rep/prot, registro successioni). Le descrizioni nel box verde del cliente spiegano tutto questo (frasi chiave in grassetto, avviso ROSSO "Chi ha rinunciato NON firma nulla"); sotto l'atto di morte: "Basta una copia o fotocopia".
- ⭐⭐⭐ **AGGIORNAMENTO AUTOMATICO OVUNQUE** (`lib/aggiornaLive.ts`, hook `useAggiornaLive`) — vedi 5.7: tempo reale Supabase + ricarica al ritorno in pagina + controllo periodico. Collegato a: lista e pagina pratica del cliente (banner, documenti, foto, chat, contatore non letti), CRM admin, dettaglio pratica admin (documenti, chat, cronologia, testata), area demolitore (solo focus+polling 20s, passa dagli endpoint). Il caso che l'ha fatto nascere: Davide approvava dall'admin, la pagina del cliente restava vecchia e permetteva di eliminare un documento approvato.
- ⭐ **Cinture di sicurezza**: prima di caricare/eliminare file su un documento, il cliente ricontrolla lo stato FRESCO dal server — un documento **approvato** non si tocca nemmeno da una pagina rimasta indietro.
- ✅ **Foto del veicolo: pillola neutra "Inviate"** — le foto NON sono un documento da verificare (servono per il carro attrezzi): mai più "In verifica"/"Approvato" sulla riga foto del cliente. Rimossa la lettura del vecchio sistema `documenti_approvazione` da TabDocumenti (la tabella resta solo nel DB, più nessuna pagina la usa).
- ✅ **Rifiniture**: via l'anello "0 su 3 — Iniziamo!" dal wizard documenti (doppione della barretta "DOCUMENTO X DI Y"; la frase "Un documento alla volta: bastano le foto" ora sta piccola sotto la barretta, solo sul primo documento); via il bottone "Aggiorna" dalla chat admin (coi messaggi in tempo reale non serve).

### ⭐⭐ SESSIONE 22 luglio 2026 — AREA CLIENTE: UN SOLO BOX, COLORI SEMANTICI, PANNELLO IMPOSTAZIONI

- ✅ **Un solo box di stato** (mockup approvato): il box centrale di TabDocumenti ("Documenti tutti approvati" / "Hai fatto tutto" / "Documenti inviati") è stato RIMOSSO — era un doppione del banner in alto. Il banner integra l'unica informazione che mancava: verde "Documenti approvati, è tutto in ordine · Stiamo assegnando un demolitore. **Tieni gli originali a portata di mano**"; blu "Hai fatto tutto: stiamo verificando · Ti avviseremo entro 3 ore: non devi fare altro." (niente trattini). L'anello di avanzamento resta solo col wizard in corso.
- ⭐ **Colori dei banner cliente = 3 semantici** (variante B su mockup): **blu** per tutto ciò che è in corso (ritiro fissato, ritirata, attesa PRA — via indaco/viola/teal), **verde** solo per i traguardi (approvati, completata), **rosso** solo per "da rifare", grigio per attesa/annullata. Icona orologio anche nel banner attesa del cliente.
- ⭐⭐ **PANNELLO IMPOSTAZIONI cliente** (variante A su mockup, `PannelloImpostazioni.tsx`): ingranaggio nell'header (via "Esci"), pannello che scivola da destra. Dentro: nome+email in vista, **Nome e cognome** modificabili, **Telefono per il ritiro** ("il numero che il demolitore userà" — ⭐ aggiorna anche le PRATICHE IN CORSO), **Cambia email** (link di conferma Supabase, doppioni rifiutati, `utenti.email` si riallinea da sola al login dopo), **Cambia password**, Assistenza WhatsApp, **Privacy/Termini nella STESSA scheda** (indietro → pannello riaperto da solo via sessionStorage), **Esci** in fondo. Profilo salvato via endpoint **`/api/profilo`** (service role, ogni utente solo la propria riga).
- ✅ **Admin**: card Cliente con riga **"Email account"** (da `utenti`, sempre attuale anche dopo un cambio email). Il NOME sulle pratiche resta quello dichiarato (si corregge dall'admin).
- ✅ **Card "Aggiungi un altro veicolo"** (variante B): via il riquadro tratteggiato col "+" — card bianca in fila con le pratiche, quadratino blu con l'auto, sottotitolo "Sempre gratis, come la prima", freccia.
- ⭐ **Termini: clausola gratuità condizionata** (richiesta Davide): la gratuità presuppone veicolo **sostanzialmente completo**; parti importanti mancanti o casi particolari → lo comunichiamo SUBITO e proponiamo un **contributo**, sempre con accordo esplicito. (Le pagine legali restano da rivedere per i dati anagrafici, vedi 8.2.)
- ⭐ **Pannello impostazioni RESTYLING "modifica sul posto"** (2 giri di mockup): scheda "I TUOI DATI" con valori in LETTURA (etichetta + valore + bottoncino Modifica/Cambia per riga); premendo Modifica il valore diventa un **campo slim della stessa taglia** (bordo azzurrino, niente sfondi grigi né riquadri che si gonfiano) e Modifica diventa **"Annulla · Salva" pilloline della stessa misura**. ⚠️ Nei campi il testo resta 16px (anti-zoom iOS). ⚠️ Lezione tecnica: MAI definire sotto-componenti con input dentro un componente (si rimontano a ogni render e i campi perdono il focus) — usare funzioni chiamate direttamente.
- ✅ **Rifiniture pannello e header** (22/07 sera): il banner verde di conferma **sparisce da solo** (3,5s; 8s per i messaggi lunghi tipo conferma email — gli ERRORI restano); campi in modifica **snelliti** (su PC 13,5px come il valore, su iPhone restano 16px per l'anti-zoom iOS; bordo 1px, peso medio); nel header dell'area cliente la "N" anonima è sostituita dal **logo vero** (lo stesso di /inizia e login).
- ⭐⭐ **REGOLA "dopo l'assegnazione comanda solo l'admin"** (chiusa il cerchio 22/07): ANCHE nome e telefono dal profilo aggiornano le pratiche in corso **solo se NON assegnate** (`demolitore_id IS NULL`, escluse completate/annullate); documenti e foto erano già bloccati post-assegnazione (STATI_MODIFICABILI_DA_CLIENTE). Il cambio NOME ora si propaga alle pratiche non assegnate come il telefono (coi moduli in bianco `nome_richiedente` è informativo): l'admin vede subito i dati nuovi. Documenti APPROVATI: ✕ di eliminazione mai mostrata al cliente (verificato — solo finché "in verifica").

### ⭐⭐ SESSIONE 20-21 luglio 2026 — MENU "STATO PRATICA" + RIATTIVAZIONE + CRONOLOGIA COMPLETA

- ⭐ **Menu unico "Stato pratica ▾"** in testata del dettaglio (mockup variante A): Attiva / Metti in attesa / Annulla pratica in un solo posto — via il bottone attesa sparso e il bottone "Annulla" in fondo (in fondo resta SOLO "Elimina definitivamente"). Le voci si evidenziano in base allo stato corrente.
- ⭐⭐ **Riattivazione pratica annullata** (vedi 4.6): "Attiva" su un'annullata la riporta esattamente dov'era (`stato_precedente`, SQL 20/07 eseguito), con modale di conferma. Il riquadro "Pratica annullata" è stato rimosso: motivo e data vivono in cronologia.
- ✅ **Annullamento e riattivazione in cronologia** (il buco trovato da Davide): note automatiche con pillole rossa "✕ Annullata" (col motivo) e verde "✓ Riattivata". ⚠️ Solo da ora in poi: gli annullamenti precedenti al 20/07 non hanno la voce.
- ✅ **Ogni voce della cronologia ha la sua pillola**: "Nota" (celeste, matita) per le note manuali, "Creata" (grigia) per la nascita, più le 4 di stato (In attesa / Ripresa / Annullata / Riattivata).
- ✅ **Riquadri a scorrimento interno**: chat (~320px) e cronologia (~300px) scorrono DENTRO il proprio riquadro (mouse/dito), la pagina non si allunga; casella di scrittura sempre visibile sotto.
- ✅ **Rifiniture 21/07**: rimosso anche il riquadro ambra "In attesa" dalla colonna destra (tutto dal menu "Stato pratica", motivo in cronologia — come per l'annullata); contatore rosso dei tab cliente (Chat/Documenti) ATTACCATO all'icona col bordino dello sfondo (prima era sperso nell'angolo del riquadro); spazi mancanti dopo la targa nelle modali di annullo/riattivo.

### ⭐⭐⭐ SESSIONE 17 luglio 2026 — DETTAGLIO PRATICA ADMIN RIFATTO (variante A su mockup)

> SQL della sessione: `docs/sql/2026-07-17-attesa-note-preimpostati.sql` (ESEGUITO da Davide:
> colonne attesa su pratiche + tabelle `pratiche_note` e `messaggi_preimpostati`, RLS solo admin).

- ⭐⭐ **Dettaglio pratica `/admin/pratiche/[id]` RIFATTO**: **testata blu** stile profilo (targa+veicolo, cliente, aperta il+ora, statistiche in vetro: documenti approvati, aperta da, fase X/6, pillola stato) + layout a due colonne: SINISTRA il lavoro (documenti → chat → cronologia), DESTRA azioni e dati.
- ⭐ **CHAT ADMIN** (`ChatAdmin.tsx`): linguette **Tu ↔ Cliente** (scrive come mittente_tipo 'admin') e **Demolitore ↔ Cliente** (SOLA LETTURA, controllo qualità); bottone Aggiorna (niente real-time); lo scorrimento avviene SOLO dentro il riquadro messaggi (mai la pagina — regola anti-sobbalzo). ⭐ **Messaggi rapidi** da `messaggi_preimpostati`: chips sopra la casella (tocco → testo in casella, ritoccabile), finestra "Gestisci" per aggiungere/modificare/eliminare le frasi.
- ⭐ **CRONOLOGIA E NOTE** (`CronologiaNote.tsx`, tabella `pratiche_note`, SOLO ADMIN): timeline con data e ora esatte, voce fissa "Pratica creata", note manuali + note automatiche di attesa/ripresa (pillole con orologio/play).
- ⭐⭐ **PRATICA "IN ATTESA"**: è una PAUSA SOPRA LO STATO (non uno stato del workflow: alla ripresa la pratica torna esattamente dov'era). Bottone "Metti in attesa" in testata (motivo OBBLIGATORIO, icona OROLOGIO — le barrette pausa bocciate), riquadro ambra con motivo + "Riprendi" in colonna destra. Salvataggio via `/api/pratica-dati` (server). **Dashboard**: riquadro ambra "In attesa · N" accanto a "Da contattare" (fuori dalle 6 fasi), pillola "In attesa" + **motivo visibile in riga** (per ricordarsi il perché). **Cliente**: solo pillola "In attesa" + banner grigio sereno ("non devi fare nulla"), zero motivi.
- ⭐⭐ **DICHIARAZIONI E CASISTICA tutte modificabili** (tranne la CASISTICA, sola lettura): con Modifica si aprono campi uniformi — Libretto (SOLO esiti verifica: Ha l'originale / Denuncia — "Non ce l'ha" resta solo come dichiarazione del cliente), Certificato di proprietà (qui, VIA dalla testa dei documenti), Fermo (SOLO Sì/No, via "Non lo sa"), Targhe (Presenti/Smarrite), Delegato (nome+telefono, vuoto = prima persona; nascosto dove la delega non è ammessa). Niente opzioni "—" nelle tendine (placeholder "Scegli…" disabilitato). ⭐ **Sincronizzazione checklist GENERALIZZATA in `/api/pratica-dati`**: ogni risposta accende/spegne i documenti della sua condizione nel catalogo (fermo_si, libretto_smarrito, targhe_assenti, delegato) — righe con file MAI toccate; whitelist estesa (libretto, targhe_presenti, delegato_*, in_attesa, attesa_*).
- ✅ `DocumentiApprovazione`: via le pillole casistica e il "Cambia" CDC (ora nelle Dichiarazioni); resta il banner "Da contattare" coi bottoni esito telefonata.
- ✅ ~~DA FARE: semplificare le CASISTICHE EREDI~~ **FATTO il 22/07/2026** (vedi sessione 22/07 seconda parte): via la domanda "quanti eredi", fotografa solo chi opera, fotocopie al ritiro con la dichiarazione.

### ⭐⭐ SESSIONE 16 luglio 2026 — FLUSSO CRM LEGGIBILE + MENO FOTO PER IL CLIENTE

- ✅ **Mappa copertura: assorbimento selezioni** — selezionare una provincia assorbe i comuni inclusi singolarmente al suo interno; selezionare una regione assorbe province selezionate, esclusioni e comuni. Niente più "doppio blu" sulla mappa né righe ridondanti nel DB (`MappaComuni.tsx`).
- ⭐ **FLUSSO PRATICHE CRM rifatto** (vedi 4.6): fila da sinistra a destra con frecce, 6 fasi numerate, "chi agisce", riga "Il cliente vede", rinomine ("Moduli inseriti" → In attesa documenti; "Documenti da approvare" → Documenti da verificare), "Da contattare" fuori fila come allerta rossa. Pilloline di stato allineate (fase · dettaglio) in lista e dettaglio pratica.
- ⭐⭐ **FOTOCOPIE DELEGATO (alleggerimento wizard)**: il cliente NON fotografa più carta d'identità e tessera sanitaria del DELEGATO (2 documenti in meno). Le **fotocopie fronte/retro si consegnano al ritiro insieme alla delega**: la riga della delega nel box verde lo spiega (frase in grassetto, testo dal catalogo). SQL `docs/sql/2026-07-16-fotocopie-delegato.sql` (eseguito): `richiede_upload=false` sulle 12 righe delegato + descrizione sulle 6 deleghe. **File casistiche aggiornato** (6 casistiche). Il pannello "inviati" del cliente ora filtra per `richiede_upload`: i documenti spenti dal catalogo spariscono anche dalle pratiche già aperte.
- ✅ **Icona demolitore in chat** (variante B su mockup): via l'arancione fuori palette — quadratino celeste `#DBEAFE` con carro attrezzi blu, in linguetta, placeholder "In attesa del demolitore" e testata chat.
- ⭐ **Mockup a indirizzo fisso**: i mockup si guardano SEMPRE su `localhost:3000/mockup.html` (file `public/mockup.html`, in .gitignore — mai in deploy). Davide ha il segnalibro: basta ricaricare.

### ⭐⭐ SESSIONE 15 luglio 2026 — RIFINITURE AREA CLIENTE + MODULI IN BIANCO E SBLOCCATI

> Tutte le modifiche UI passate da mockup e approvate da Davide, collaudate su localhost.

- ⭐⭐ **MODULI: NIENTE AUTOCOMPILAZIONE, NIENTE BLOCCO** (decisione Davide che rivede il 10/07): tutti i moduli PDF escono **in bianco** (anche le 6 deleghe — il generatore resta pronto a ricompilare in futuro) e sono **scaricabili subito** dal box verde, senza aspettare la verifica dei documenti. Via il lucchetto "Dopo la verifica" ovunque (UI + endpoint).
- ✅ **Box verde ritiro**: titolo più grande e pesante + banda bianca "CONSEGNALI IL GIORNO DEL RITIRO" (variante C scelta su mockup). Righe modulo: prima del download badge "Scaricala, compilala e firmala" + bottone Scarica; dopo, numero → spunta verde, badge "Scaricata · ora compilala e firmala", link "Scarica di nuovo". Footer accorciato (via la frase lunga sull'autodichiarazione).
- ✅ **Guida "Come si ottiene" (attestazione Ente Pubblico)**: via il doppio bottone Scarica (si scarica SOLO dal box verde, il passo 1 lo dice); passo 2 chiarito (Comune/Polizia locale/ente competente DEVONO rilasciare la Dichiarazione Inutilizzabilità); passo 3 = fotografa la dichiarazione rilasciata e inviacela.
- ✅ **Tab Stato**: "Aperta il … alle HH:MM" + nuovo passo **"In attesa dei tuoi documenti"** come passo attuale (timeline a 6 passi; "Richiesta inviata" appare subito completata).
- ✅ **FIX eliminazione file da documento inviato**: QUALSIASI eliminazione da un documento `caricato` lo riporta `da_fare` (prima serviva eliminare TUTTI i file: un documento fronte/retro restava "in verifica" a metà e l'admin se lo trovava da approvare incompleto).
- ✅ **Card foto veicolo (variante B su mockup)**: via i bottoni rettangolari — casella tratteggiata "Scatta" nella griglia (pattern "+ Aggiungi"), galleria come link discreto in fondo, "Ho finito con le foto" = bottone di pagina fuori dalla card (stile wizard). Rimosso il componente UploadFoto.
- ✅ **Banner "Mancano le foto"**: da giallo a **celeste tenue** (variante B — colori dei box informativi; il giallo era "un pugno in un occhio").
- ✅ **Errori download moduli parlanti**: l'avviso mostra il motivo del server con lo status (es. "Non autorizzato (401)" = rifare login).
- ✅ **"← Indietro" al primo passo di /inizia**: per il cliente loggato torna a `/dashboard` (prima portava alla home pubblica e sembrava un logout).
- ⭐ **VISORE DOCUMENTI ADMIN** (variante B su mockup): cliccando un documento nella pagina pratica si apre un visore grande con **elenco a sinistra** (documenti con pillole di stato + sezione foto veicolo), **frecce ‹ › e frecce tastiera** per scorrere documenti E foto in un'unica fila (Esc chiude), fronte/retro affiancati con etichetta, PDF incorporati, e **"Approva e avanti"/"Rifiuta" direttamente nel visore** (approva e salta da solo al prossimo da verificare: si controlla tutta la pratica senza mai chiudere). Ordine voci stabile (da catalogo, non per stato). In `DocumentiApprovazione.tsx`; la vecchia anteprima singola è stata sostituita.
- ⚠️ Nota di test: nello stesso browser vive UNA sessione alla volta — admin in Chrome normale, cliente di prova in incognito. Un 401 sul download dopo giri di login/logout si risolve con Esci + login.

### ⭐⭐⭐ SESSIONE 10 luglio 2026 — MODULI PDF: TUTTI E 13 DEFINITI (era lo STEP 2)

> Fonte di verità dei moduli: **`docs/moduli/LEGGIMI.md`** (inventario, decisioni, stato di ogni modulo).
> Metodo collaudato: testo proposto → correzioni di Davide → generatore pdf-lib → **anteprima con dati
> di prova** (`docs/moduli/anteprime/`, script `genera-anteprime.ts`) → approvazione → commit.

- ✅ **6 DELEGHE CONSEGNA VEICOLO** create da zero e approvate (`lib/moduli/delegaConsegna.ts`, generatore a varianti: privato/eredi/eredi_rinuncia/societa/fallimento/associazione). Decisioni: autodemolitore IN BIANCO (in futuro precompilazione post-assegnazione), firmano SOLO delegante e delegato, fotocopie fronte/retro dei documenti di entrambi allegate.
- ✅ **DICHIARAZIONE FERMO** creata e approvata (`lib/moduli/dichiarazioneFermo.ts`, 7 varianti con qualifica automatica per casistica): "mezzo fuori uso da demolire" + impegno a fornire l'attestazione + "il debito resta". NIENTE fotocopia documento (deciso da Davide).
- ⭐⭐ **LEGGE 26/01/2026 n. 14 (fermo amministrativo, in vigore dal 20/02/2026)**: il fermo NON blocca più la radiazione per demolizione (esclusa solo l'esportazione estero), ma serve l'**ATTESTAZIONE DI INUTILIZZABILITÀ del Comune/Polizia locale**. Flusso deciso: /inizia resta IDENTICO ("il cliente ce lo portiamo dentro noi"), la dichiarazione resta da firmare, e nella checklist c'è il nuovo slot **ATTESTAZIONE_INUTILIZZABILITA** (foto + originale al ritiro; SQL eseguito su Supabase per le casistiche 1-7, file in `docs/sql/2026-07-10-...`). Il **file casistiche è stato aggiornato** (Integrazione 1).
- ✅ **CURATORE** rifatto col generatore sul documento di Davide (`lib/moduli/dichiarazioneCuratore.ts`): "curatore della liquidazione giudiziale (curatore fallimentare)", identificazione firma + fotocopia (art. 38 DPR 445).
- ✅ **4 dichiarazioni ACI**: si usano i PDF ORIGINALI di Davide col logo ACI (eredità, eredità con rinuncia, legale rappresentante — che copre anche le associazioni —, non intestatario). ⚠️ Tentata la sostituzione con le versioni ACI 2026 (informative GDPR): impaginate MALE dalla fonte → ripristinati i suoi (lezione: controllare sempre anche la RESA GRAFICA). Le 2026 restano in `originali/versioni-aci-2026/` come riferimento.
- ✅ **Decisione di flusso moduli** (ha cambiato lo STEP 2): i moduli NON si caricano firmati (niente foto del firmato, troppo complesso) — il cliente li trova **già compilati** dal box verde "Documenti originali da portare al ritiro", li scarica/stampa/firma e li **consegna in originale al ritiro**; il demolitore li vede nel suo box "Da farti consegnare". I documenti finiscono alle agenzie pratiche auto dei demolitori per la radiazione.
- ✅ `.gitattributes`: PDF/Word/immagini trattati come BINARI (un PDF rischiava la corruzione da conversione fine-riga).
- ✅ `pdf-lib` aggiunta alle dipendenze.
- ✅ **INTEGRAZIONE TECNICA COMPLETATA (10/07 sera)** — i moduli sono IN MANO AI CLIENTI:
  - **`/api/modulo-pdf`** (vedi 5.4): download del modulo per riga checklist, auth cliente proprietario/admin, traccia `scaricato_il`. I PDF originali viaggiano nel deploy via `outputFileTracingIncludes` (next.config).
  - ⭐ **DECISIONE FINALE COMPILAZIONE** (dopo prova sul campo): autocompilate SOLO le 6 DELEGHE; l'**Autodichiarazione** esce IN BIANCO (il mezzo-compilato non piaceva), curatore = PDF originale di Davide, 4 ACI così come sono col logo. La scrittura dei dati sopra i PDF ACI è stata PROVATA E SCARTATA (resa non professionale).
  - ⭐ **RINOMINE** (SQL): "Dichiarazione stato veicolo con fermo" → **"Autodichiarazione veicolo fuori uso"** (anche nel titolo del PDF); "Attestazione di inutilizzabilità" → **"Dichiarazione Inutilizzabilità Ente Pubblico"**.
  - **Box verde cliente**: righe modulo con badge + bottone **Scarica**; **lucchetto "Dopo la verifica"** (i moduli si sbloccano quando l'admin approva i documenti — anche lato server). ⭐ ECCEZIONE: l'Autodichiarazione è scaricabile SUBITO — serve per farsi rilasciare la dichiarazione di inutilizzabilità dal Comune (senza eccezione il flusso era un circolo).
  - **Card attestazione Ente Pubblico**: guida a passi "Come si ottiene" (1. scarica autodichiarazione — bottone integrato — 2. Comune/Polizia locale, 3. fotografa qui). Mockup A approvato.
  - **SQL eseguiti**: `richiede_upload=false` sui 19 template (via dal wizard, solo box verde) + rinomine (file in `docs/sql/`).
  - Via la card "Modulo a breve" dal wizard; contatori cliente basati solo sui documenti da fotografare; nel box del demolitore i moduli sono "— modulo firmato in originale".
  - Cartella `versioni-aci-2026` eliminata (resta nella storia git).

### ⭐⭐ SESSIONE 9 luglio 2026 (sera) — RIFINITURE WIZARD DOCUMENTI + FLUSSO FOTO

- ✅ **Wizard documenti rifinito** (tutti i dettagli in 5.6 "Aggiornamenti 9/07"): card "Hai fatto tutto"/"Documenti inviati", pannello inviati col flip dell'intero riquadro, foto a tutta casella fronte/retro, eliminazione "sul posto" senza modali, aggiornamenti fluidi senza spinner, bottone di pagina sopra la coda "Dopo questo"
- ✅ **Banner cliente sincronizzato**: il cliente può chiedere il ricalcolo stato (`/api/pratica-stato` autorizza anche il proprietario); "in verifica" scatta SOLO quando tutti i documenti sono inviati → banner "Stiamo verificando i tuoi documenti" automatico (prima restava fermo su "Carica i tuoi documenti")
- ✅ **Flusso foto veicolo per chi salta le foto in /inizia**: banner giallo (spiegazione carro attrezzi / viaggi a vuoto) → card di caricamento senza limiti → "Ho finito con le foto" deciso dal cliente
- ✅ **Box "Da chiarire insieme" rimosso** lato cliente (chiama l'admin, che vede le pratiche in "Da contattare")
- ✅ **Esito verifica CDC dall'admin** (`/api/pratica-cdc`, vedi 5.4): bottoni Cartaceo/Digitale/Smarrito nel banner "Da contattare" → la checklist del cliente si aggiorna da sola (documento nel wizard + lista originali al ritiro); link "Cambia" per correggere gli errori
- ✅ **Card documenti a caricamento libero**: riquadro tratteggiato "+ Aggiungi" accanto alle miniature (si capisce che può scattarne altre); rimossi i suggerimenti "premi Continua" (il bottone acceso basta)
- ✅ **Indirizzo ritiro senza doppioni** (admin, tab Stato cliente, scheda demolitore): comune/CAP/provincia aggiunti solo se non già dentro l'indirizzo di Google
- ✅ **Modifica dati pratica dall'admin** (`/api/pratica-dati`, vedi 5.4): bottone Modifica sulle card Cliente/Veicolo/Ritiro/Dichiarazioni — targa, CF, indirizzo (autocomplete con coordinate), fermo amministrativo con sincronizzazione checklist. Solo admin, "Salva" solo se qualcosa è cambiato
- Metodo confermato: ogni modifica UI passata prima da **mockup interattivo** con scelta di Davide (flip, eliminazione A+D, banner foto, bottone B)

### ⭐⭐⭐ SESSIONE 6-7 luglio 2026 (seconda parte) — RIFINITURE E FLUSSI OPERATIVI

- ✅ **Restyle completo area admin** secondo il design system 6.8 (card, profilo demolitore, lavanda)
- ✅ **Contribuzione demolitore** rifatta: lettura + modifica a tasto, tariffe con badge zona, etichetta "fuori copertura" (informativa: tariffe valide anche fuori zona per ritiri manuali)
- ✅ **Importo una tantum per pratica** (`fee_concordata` + `/api/pratica-fee`) — collaudato (400€)
- ✅ **Riassegnazione/disassegnazione** con messaggi sereni al cliente (`riassegnata`) — collaudata
- ✅ **Seconda pratica per cliente registrato** (bottone dashboard + /inizia consapevole della sessione) — collaudata
- ✅ **Pagina cliente rifinita**: banner demolitore (8 ore lavorative), box smeraldo "Documenti originali da portare al ritiro" con lista numerata, messaggi senza esclamativi, icone nuove
- ✅ **Note e cronologia demolitore** (`demolitori_note`), copertura a tendina con salva-se-modificato
- ✅ **Pipeline CRM a 7 fasi** (il flusso di Davide, vedi 4.6) — via il generico "In corso"
- ✅ **Annullamento a due binari** (motivo obbligatorio, traccia demolitore, statistica "Annullate" cliccabile con elenco motivi) — collaudato
- ✅ **Modali dell'app** al posto dei popup del browser + spiegazioni sotto i bottoni di eliminazione (solo pratica / pratica+account)
- ✅ **Chiavi server su Vercel** (`SUPABASE_SERVICE_ROLE_KEY` + `GOOGLE_MAPS_SERVER_KEY`) aggiunte da Davide + redeploy → **l'admin e l'assegnazione automatica funzionano anche ONLINE** (verificato)
- ✅ **Leggibilità /inizia** (da test utente reale): keyword blu nei titoli, opzioni solide, avviso anti-confusione CDC, niente frecce, WhatsApp ripulito con etichetta ciclica (vedi 5.2)
- 🔔 Deciso: **sistema notifiche email+SMS** come task prioritario futuro (lista eventi in 8.2)

### ⭐⭐⭐ SESSIONE 6 luglio 2026 — AREA ADMIN (CRM) + ASSEGNAZIONE AUTOMATICA

- ✅ **CRM admin** completo (vedi 5.3): pratiche per priorità d'azione, ricerca, attesa, demolitore; dettaglio pratica con tutti i dati + approvazione documenti nuovo sistema; **eliminazione definitiva** (DB + storage, doppia scelta pratica/account) + pulizia account senza pratiche; **sidebar condivisa**.
- ✅ **Gestione demolitori professionale** (vedi 3.10 e 5.3): campi anagrafici completi (P.IVA, SDI, titolare, referente, email assegnazione/aziendale, PEC, indirizzo Google autocomplete), **tariffe per zona** (`demolitori_tariffe`, regola più-specifico-vince), mappa copertura intatta.
- ✅ **Assegnazione automatica COLLAUDATA** (vedi 4.7): dry-run → classifica → conferma; nome demolitore visibile.
- ✅ **Bug DB fondamentali risolti**: constraint `pratiche_stato_check` completato con tutti gli stati; colonne mancanti aggiunte a `pratiche`; conversione provincia sigla→nome; transizioni stato via server (`/api/pratica-stato`).
- ✅ **Google Maps loader condiviso** (`lib/googleMaps.ts`) — autocomplete + mappa convivono.

### ⭐⭐⭐ SESSIONE 3 luglio 2026 (pomeriggio) — Fronte/retro, assistenza WhatsApp, home/login, casistiche in repo

- ✅ **File casistiche nel repo**: `docs/casistiche/Casistiche_Demolizione.md` (fonte ufficiale 8 casistiche) + collegato a `CLAUDE.md`. Verificata la coerenza catalogo DB ↔ codice ↔ file. Correzioni: fermo applicabile ai casi 1-7 (non solo 1-6); atto di morte NON fronte/retro.
- ✅ **Verifica completa modulo→trigger→pagina cliente** su tutte le combinazioni: la catena genera i documenti giusti. Bug trovati e loro stato in 8.2.
- ✅ **Documenti FRONTE/RETRO a due caselle** + opzione "file unico" (vedi 3.4). Riconoscimento per lista di codici, non più per parola "retro".
- ✅ **Regola "Ti chiamiamo noi"** per libretto mancante / CDC sconosciuto (vedi 4.0 sopra 4.1): box in `/inizia` + box "Da chiarire insieme" nella pagina documenti.
- ✅ **Assistenza WhatsApp ovunque**: componente `app/components/AiutoWhatsApp.tsx` (cerchio verde fisso in basso a destra, etichetta "Serve aiuto?" che sparisce dopo 6s) su home, login, `/inizia`, dashboard, pagina pratica. Numero **+39 351 828 0493**.
- ✅ **Home ristilizzata** in stile app (lavanda, logo, spunte SVG, bottoni app) — niente più emoji.
- ✅ **Login ristilizzato** (header blu, campi con icona, mostra/nascondi password, tolto "Registrati" perché i ruoli si registrano in modi diversi).
- ✅ Ritocchi minori: bottoni foto veicolo più moderni ("Scatta foto" / "Dalla galleria"), tolto "+ Nuova" dalla dashboard cliente (il cliente ha sempre una pratica).

### ⭐⭐⭐ SISTEMA DOCUMENTI DINAMICI COMPLETO LATO CLIENTE (fine giugno - 3 luglio 2026)

- ✅ **Catalogo popolato**: 89 documenti su tutte le 8 casistiche, verificati con Davide
- ✅ **Trigger di generazione automatica** della checklist alla creazione pratica ("commesso automatico") — collaudato con SQL (incluso multi-erede) e con pratica reale
- ✅ **RLS** su `pratica_documenti_checklist` (SELECT/INSERT/UPDATE)
- ✅ **`file_url` come array JSON** `[{url, nome}]` per file multipli senza cambi di schema
- ✅ **TabDocumenti nuovo** (design "Opzione A" + card stile /inizia, vedi 5.6): anello progresso, card con icona per tipo documento, bollini Scatta/File diretti (no popup), documenti rifiutati in rosso con nota admin, "Già sistemati" collassato, accordion eredi, box "Da portare al ritiro", moduli PDF con avviso "a breve"
- ✅ **Flusso FRONTE/RETRO** con invio manuale: upload = bozza, bottone verde "Ho finito, invia in verifica" = stato caricato; hint "manca il retro?" pilotato dal catalogo (parola "retro" nella descrizione)
- ✅ **Foto veicolo eliminabili** (✕ rosso + conferma; elimina bucket + riga; solo negli stati modificabili) — file documenti idem

### ⭐⭐ RESTYLING AREA CLIENTE COMPLETO (3 luglio 2026)

Tutto il percorso cliente ora parla il linguaggio "/inizia" (lavanda + card bianca + header blu):
- ✅ **`/dashboard` "Le tue pratiche"**: header blu con saluto + Esci, card pratiche con icona veicolo per tipo, badge pillola, empty state SVG
- ✅ **`/dashboard/[id]`**: header blu "← Pratiche" + veicolo·targa + badge; banner stato dinamico con SVG (niente emoji); tab a pillole
- ✅ **TabStato**: timeline (5 step) + sezione "Condizioni dichiarate" a pillole colorate (incidentata/cammina/va in moto/parti mancanti, verde/rosso, solo valori non null) + note cliente + dati veicolo collassabili

### ⭐ ALTRO (luglio 2026)

- ✅ **Trasloco progetto** in `C:\Progetto_NoiDemoliamo` (fuori OneDrive) dopo incidente git — repo ri-clonato da GitHub, storia intatta, git ora sano (vedi 2.2)
- ✅ **Errori /inizia in italiano** (`traduciErrore`) + bottone "Continua comunque con X foto" visibile
- ✅ **Pratica test "EEEEE"** (fiat panda, Messina) creata dal flusso completo — conferma trigger + checklist
- ✅ **Passaggio a Claude Code** come metodo di lavoro (3/07)

### Storico giugno 2026
- ✅ Sistema casistiche completo e collaudato (8 casi, derivazione automatica, flusso /inizia rifatto, DB aggiornato) — vedi PARTI 3.3 e 5.2
- ✅ Tabelle `casistiche_documenti` + `pratica_documenti_checklist` con RLS + GRANT

### Storico maggio 2026
- ✅ Refactoring completo `/inizia` mobile-first, dashboard cliente v1, area admin, tabelle e RLS storage, algoritmo assegnazione (da revisionare), Google Maps keys

## 8.2 ⏳ PENDING — In ordine di priorità

### ▶️🔥🔥🔥 STEP 0 — PUNTO DI RIPARTENZA (aggiornato 7/07/2026)

**DASHBOARD DEMOLITORE — FASI 1 e 2 FATTE (8-9/07/2026), PROSSIMO: FASE 3.**
1. ✅ ~~Accedere~~ FATTO E COLLAUDATO: invito email + `/imposta-password` + login multi-ruolo. Colonne: `utenti.demolitore_id`, `demolitori.invito_inviato_il`; constraint `utenti_tipo_check` esteso (migrazione in `docs/sql/`). LED accesso + revoca nella scheda admin.
2. ✅ ~~Pratiche assegnate~~ FATTO (fase 2, vedi 5.3): liste per fase, scheda completa, documenti approvati. (Chat demolitore↔cliente: DA FARE.)
3. ✅ ~~Fissare data/ora ritiro~~ FATTO — decisione Davide: **la data vale subito, il cliente NON deve confermare** (la segretaria chiama prima). In fase 3: bottone "Non posso quel giorno" del cliente → segnale a demolitore+admin, senza bloccare.
4. ✅ ~~Ritiro effettivo~~ FATTO (`data_ritiro_effettuato` + stato `ritirata`).
5. ✅ ~~Certificato rottamazione~~ FATTO (upload o "consegnato a mano al ritiro").
6. ✅ ~~Certificato PRA~~ FATTO (→ `completata`; regola: solo il PRA completa).
7. ✅ ~~Annullate visibili~~ FATTO (tab dedicata coi motivi, sempre visibile).

**FASE 3 — MOTORE SCADENZE E NOTIFICHE (prossima):** campanella in-app demolitore, email di sollecito oltre le 8 ore lavorative, promemoria del giorno di ritiro a demolitore E cliente ("auto ritirata?"), "cliente dice no" → segnalazione all'admin, bottone cliente "Non posso quel giorno". Richiede: **Resend attivo** (Davide ha GIÀ il dominio noidemoliamo.it: va collegato a Vercel + verificato su Resend con SPF/DKIM/DMARC) e un cron Vercel per i controlli periodici. Decisione: canali v1 = email + campanella (push → PWA futura).
**FASE 4 — PROFORMA FATTURA:** al "ritirata" la pratica entra nel giro fatturazione (da progettare con Davide).
**IN CODA:** landing vetrina su noidemoliamo.it, chat nella scheda demolitore, completare /privacy e /termini. (~~Migliorie TabDocumenti wizard~~: FATTE il 9/07, vedi 5.6.)

**In sospeso (nessun codice a metà: sono test o decisioni aperte):**
- 🟡 **Pagine legali /privacy e /termini DA RIVEDERE INSIEME** (ribadito da Davide il 22/07): capire esattamente quali dati anagrafici di NoiDemoliamo inserire (ragione sociale, P.IVA, sede, email contatto — idealmente info@noidemoliamo.it) e completare i [DA COMPLETARE] quando dominio ed email aziendale saranno attivi. Da 22/07 sono linkate anche dal pannello Impostazioni del cliente.
- 🟡 **Test dell'amico** sul flusso /inizia migliorato — in attesa dell'esito
- 🟡 **Assegnazione MANUALE ("Scegli io")**: il flusso c'è, da testare fino in fondo
- 🟡 **Caso 7 (non intestatario)**: manca l'avviso di stop nel flusso (vedi STEP 1-bis)
- 🟡 **Denunce smarrimento CI/CF**: decisione di Davide ancora aperta (vedi STEP 1-bis)
- 🟡 **Template PDF moduli**: in attesa dei file da Davide (STEP 2)
- ✅ ~~GOOGLE_MAPS_SERVER_KEY su Vercel~~ FATTO (7/07): chiavi server aggiunte da Davide + redeploy → admin e assegnazione automatica funzionano ONLINE
- ✅ ~~Pagina admin approvazione documenti~~ FATTA (6/07)

### 🔥🔥 STEP 1-bis — FIX EMERSI DALLA VERIFICA CASISTICHE (3/07/2026)
- **Caso 7 (non intestatario)**: nel flusso `/inizia`, libretto e CDC sono OBBLIGATORI ("se non ha non può procedere" da file casistiche). Oggi il modulo lascia comunque scegliere "smarrito/non ce l'ho" e crea la pratica. → aggiungere avviso di stop.
- **Denunce di smarrimento Carta d'Identità / Codice Fiscale**: previste dal file casistiche per ogni persona, ma NON presenti nel catalogo DB e senza domanda nel flusso. → decidere se aggiungerle.
- **Pagina admin**: ✅ ~~casi "Da chiarire insieme" e "non so" sul CDC~~ FATTO (banner "Da contattare" + bottoni Cartaceo/Digitale/Smarrito, 9/07). Resta il caso "non so" sul **fermo amministrativo** (oggi solo pillola di allerta).

### ✅ STEP 2 — TEMPLATE PDF MODULI — COMPLETATO (10/07)
- ✅ Tutti e 13 i moduli decisi/creati/approvati E integrati end-to-end (endpoint download, box verde con Scarica e lucchetto, guida a passi per il fermo, SQL eseguiti). Dettagli nella sessione 10/07 in 8.1 e in `docs/moduli/LEGGIMI.md`.

### 🔥 STEP 3 — PULIZIA
- Eliminare pratiche test: "ciccio", "Mario Verdi", "Sirio Valenti" (+ "EEEEE" quando non servirà più)
- Rimuovere `UploadDocumentoModal.tsx` (legacy)
- Rimuovere `ruolo_richiedente`/`eredita` da types e DB
- Valutare dismissione tabelle `documenti`/`documenti_approvazione`

### 🔥 STEP 4 — PAGINA ADMIN DETTAGLIO PRATICA (resto)
- Chat funzionante (messaggi_chat), campi casistica in vista

### ✅ STEP 5 — ALGORITMO ASSEGNAZIONE — FATTO (6/07/2026)
- ✅ Velocità storica, colonne, conversione province, dry-run+conferma. Resta: assegnazione manuale su MAPPA (ora è a lista), media recensioni nello scoring, `GOOGLE_MAPS_SERVER_KEY` su Vercel.

### 🔥 STEP 6 — SISTEMA RECENSIONI
- Tabella + stato + pagina cliente bloccante + integrazione algoritmo + push Google Maps

### 🆕 STEP 7 — TEST CROSS-PLATFORM ANDROID
- Chrome DevTools / amici / BrowserStack: tastiere, scroll, foto, autocomplete

### 🔔 STEP — SISTEMA NOTIFICHE VERE (email + SMS) — voluto da Davide (7/07/2026)
Oggi le comunicazioni al cliente vivono SOLO nel banner della sua area personale (le vede quando apre il sito). Servono notifiche ATTIVE. Eventi da coprire:

**Al cliente (email + SMS dove ha senso):**
1. Registrazione / pratica creata → benvenuto + riepilogo e prossimi passi
2. Documento rifiutato → "c'è un documento da rifare"
3. Tutti i documenti approvati → "sei pronto, stiamo assegnando il demolitore"
4. **Demolitore assegnato** → "ti contatterà entro 8 ore lavorative"
5. **Riassegnazione** → "nuovo demolitore in arrivo" (tono sereno, come il banner)
6. Ritiro confermato → data/ora + **promemoria documenti ORIGINALI da portare**
7. Promemoria il giorno prima del ritiro (SMS)
8. Veicolo ritirato → conferma + richiesta recensioni
9. Certificato rottamazione disponibile / radiazione PRA completata

**Al demolitore:**
10. Nuova pratica assegnata → email a `email_assegnazione` (campo già pronto) con dati ritiro
11. Promemoria scadenza 8 ore se non ha ancora proposto il ritiro

Tecnica da decidere: email (es. Resend) + SMS (Twilio). Tabelle `notifiche_app`/`notifiche_sms_inviate` già progettate (3.12, ricordare i GRANT post 30/10).

### 🔜 STEP SUCCESSIVI
- Verifica PRA ACI (bookmarklet o Openapi ~6€), pagina Polizia Locale veicoli abbandonati, dashboard demolitore (fasi 2-4: pratiche/azioni, solleciti/notifiche, proforma), messaggi preimpostati admin, PWA, landing vetrina su noidemoliamo.it

### 🔮 PROSSIMI FLUSSI
- Flusso B (asta demolitori), Flusso C (commercianti), acquisto NoiDemoliamo, Flusso D (/vendi-auto), area commercianti, fatturazione, statistiche

## 8.3 ⚠️ Problemi noti / cosmetici

- Errore RLS minore in `/inizia` (NON blocca)
- Console "1 Issue" generica → da indagare
- Avviso LCP sul logo in `/login` (solo suggerimento performance, non errore)
- Test Android: mai fatto su device reale
- 4 pratiche test nel DB (ciccio / Mario Verdi / Sirio Valenti / EEEEE) → eliminare prima del lancio (EEEEE è la cavia attuale per i test documenti)

## 8.4 ⏰ PROMEMORIA SCADENZE FUTURE

- 🗓️ **Supabase free tier**: aprire la dashboard ogni 5-6 giorni o il progetto va in pausa (già successo: causava "Failed to fetch"). Al lancio: Supabase Pro (~25$/mese).
- 🗓️ **30 OTTOBRE 2026 — Supabase Data API change**: le NUOVE tabelle create dopo questa data NON saranno esposte automaticamente alla Data API. Servirà GRANT esplicito dopo ogni CREATE TABLE: `GRANT SELECT, INSERT, UPDATE, DELETE ON nome_tabella TO authenticated, anon;` (adattare i permessi al caso) + RLS come sempre.
  - ✅ Già applicato preventivamente a `casistiche_documenti` e `pratica_documenti_checklist`
  - ⚠️ Da ricordare per: `recensioni`, `aste`, `offerte_asta`, ecc.

---

# 💡 PARTE 9 — DECISIONI BUSINESS CHIAVE

(1-54: vedi storico — tutte ancora valide: velocità come principio cardine, approvazione granulare, chat in-app, mobile-first, mini-step, gamification foto, sistema casistiche con derivazione automatica, catalogo documenti come DATI, moduli PDF scarica-firma-fotografa, niente gergo, rassicurazioni telefono, ecc.)

**Nuove decisioni luglio 2026:**

55. ⭐ **Upload ≠ invio**: caricare un file NON manda il documento in verifica. Il cliente aggiunge tutte le foto che servono (fronte, retro, più pagine) e POI preme "Ho finito, invia in verifica". Niente più documenti a metà.
56. ⭐ **Il suggerimento "manca il retro?" è pilotato dal catalogo**: appare solo se la descrizione del documento contiene "retro". Regola dati-non-codice: nuovi documenti fronte/retro = una riga su Supabase.
57. **Niente popup intermedi per foto/file**: i bollini "Scatta" e "File" aprono direttamente fotocamera o selettore. Il popup di scelta è stato bocciato.
58. **Il cliente può correggersi da solo**: foto veicolo e file documenti eliminabili (con conferma) finché la pratica è negli stati modificabili — meno chat di supporto per "ho caricato la foto sbagliata".
59. **Un solo linguaggio visivo per tutta l'area cliente**: lo stile /inizia (lavanda, card bianca, header blu, campi con quadratino icona) è LO standard. Ogni nuova pagina cliente deve rispettarlo; l'admin verrà uniformato più avanti.
60. **Il progetto vive fuori dal cloud sync**: mai dentro OneDrive/Dropbox (incompatibili con git).
61. **Claude Code come ambiente di lavoro**: accesso diretto ai file con conferma obbligatoria di Davide su ogni modifica; ARCHITETTURA.md è la memoria tra le sessioni e va aggiornata a fine sessione (solo cose stabili/fondamentali: flussi, regole, come vuole il sito — non trivia estetica).
62. ⭐ **Documenti fronte/retro = due caselle separate** (non una sola con foto ammucchiate): il cliente carica Fronte e Retro in slot distinti; l'invio è bloccato finché mancano. Chi ha uno scan/PDF unico usa il link "Ho un unico file". Quali documenti sono fronte/retro è deciso dal **file casistiche** (lista di codici nel codice, non dalla descrizione).
63. ⭐ **"Prima ti chiamiamo noi"**: quando il cliente non ha libretto/denuncia o non sa che CDC ha, NON si automatizza nulla — NoiDemoliamo lo contatta (telefono/WhatsApp) per capire il caso. Meglio una chiamata che un cliente bloccato o una pratica sbagliata.
64. ⭐ **Assistenza WhatsApp sempre a un tocco**: pulsante fisso (+39 351 828 0493) su tutte le pagine cliente. Ridurre l'abbandono di chi si blocca.
65. **La home fa parte dell'area cliente**: stesso linguaggio visivo /inizia (lavanda, logo, spunte SVG, bottoni app). Niente emoji nell'interfaccia.

**Nuove decisioni 6 luglio 2026:**

66. ⭐ **L'admin è un CRM da PC**, non mobile: stesso linguaggio visivo dell'app ma layout denso da dashboard, organizzato per **priorità d'azione** (non perdere nessuna pratica con decine al giorno). Sidebar condivisa.
67. ⭐ **L'algoritmo suggerisce, l'admin decide**: l'assegnazione automatica calcola la classifica ma assegna solo dopo conferma dell'admin (che può scegliere un altro demolitore). L'admin deve poter assegnare sempre anche a mano.
68. ⭐ **Fee del demolitore per ZONA, fatturazione automatica**: tariffa base + tariffe per regione/provincia/comune; il veicolo viene fatturato con la **tariffa più specifica** in base al luogo di ritiro. Il **ritiro effettivo** fa entrare la pratica in fatturazione; a fine mese fattura automatica per demolitore.
69. **Eliminazione pratica ≠ eliminazione account**: due azioni distinte e consapevoli (scelta doppia nel dettaglio) + pulizia account senza pratiche separata. Mai orfani, mai admin/operatori.
70. ⚙️ **Gotcha da ricordare**: (a) i nuovi stati pratica vanno aggiunti al constraint `pratiche_stato_check` o falliscono in silenzio — vale per TUTTI i CHECK (8/07: `utenti_tipo_check` non includeva 'demolitore' e l'invito falliva); (b) la provincia è **sigla** nelle pratiche e **nome** nella copertura → convertire (`lib/province.ts`); (c) Google Maps si carica una volta sola per pagina (`lib/googleMaps.ts`); (d) MAI `scrollIntoView` sull'onFocus degli input del flusso /inizia: su iPhone la schermata "sobbalza" quando si apre la tastiera (lo scroll è ammesso solo al click su Continua con errore).

**Nuove decisioni 8-9 luglio 2026:**
- ⭐ **La data del ritiro vale subito** (niente conferma bloccante del cliente): la segretaria del demolitore chiama prima e fissa; in fase 3 il cliente avrà solo un "Non posso quel giorno" non bloccante che avvisa demolitore e admin.
- ⭐ **"Consegna a mano" dei documenti: PROVATA E RIMOSSA.** L'opzione "non carico, consegno la fotocopia al ritiro" era stata costruita end-to-end ma creava confusione e si discostava dalla logica casistiche (richiede_upload = si fotografa, richiede_consegna = originale al ritiro). Revert completo (commit 85be70a). NON riproporla senza ripensarla da zero con Davide. (Nel DB il constraint checklist ammette ancora 'consegna_a_mano': innocuo, nessuno lo scrive.)
- ⭐ **Documenti cliente = WIZARD** (vedi 5.6): un documento alla volta, solo foto + "Allega file" discreto, completamento dichiarato dall'utente per i file, bottone contestuale. Colori SOLO standard NoiDemoliamo (Davide ha bocciato ambra/celestini fuori palette).
- **Accesso demolitore**: invito email (Resend, con fallback link da mandare a mano finché non è configurato) + tre livelli di controllo (Non attivo / Revoca accesso / Elimina).
- **Notifiche v1**: email + campanella in-app. Push vere solo con la futura PWA.
- **Metodo di lavoro consolidato**: per le modifiche UI Davide vuole SEMPRE vedere prima mockup/varianti visive e sceglie lui; poi si implementa. Commit e push a ogni passo approvato (testa su Vercel dal telefono).

**Nuove decisioni 9 luglio 2026 (sera):**

- ⭐ **Eliminazione "sul posto"**: ✕ scura trasparente sull'angolo della foto e conferma SULLA foto stessa (o in riga) — niente modali a schermo intero per eliminare. Vale in tutta l'area cliente.
- ⭐ **Il pannello inviati si gira** (flip dell'intero riquadro): righe pulite senza miniature, i file si vedono in grande sul retro. Tendina apri/chiudi al tocco.
- ⭐ **Foto del veicolo: nessun limite e nessun obbligo** — 1 o 6 foto vanno bene; il completamento lo dichiara il cliente ("Ho finito con le foto"). Chi non ne ha vede solo il banner giallo col PERCHÉ servono (carro attrezzi giusto, niente viaggi a vuoto). Bocciati: riquadri-guida con etichette (Davanti/Dietro/…), contatori, soglia minima 3, chiusura automatica.
- ⭐ **"In verifica" = tutto inviato**: lo stato `in_attesa_approvazione_admin` scatta solo quando il cliente ha inviato TUTTI i documenti; finché ne manca uno la pratica è "in mano al cliente" (impatta i riquadri della pipeline CRM).
- **Niente avvisi di chiamata lato cliente**: il box "Da chiarire insieme" è stato rimosso; i casi da chiarire li vede solo l'admin ("Da contattare") e chiama lui.
- **Aggiornamenti silenziosi**: mai smontare la schermata per un refresh dati (spinner solo al primo caricamento; riusare i signed URL). I "sobbalzi" sono bug, non dettagli.

**Nuove decisioni 22 luglio 2026 (seconda parte):**

- ⭐⭐ **Il sistema è ISTANTANEO su tutto** ("voglio tutto perfetto" — Davide): nessuna pagina richiede il refresh manuale. Ogni nuova pagina con dati condivisi usa `useAggiornaLive` (vedi 5.7) e le sue tabelle vanno abilitate al realtime.
- ⭐⭐ **Eredi: fotografa solo chi gestisce la pratica** (la sua CI + il suo CF); i documenti degli ALTRI eredi sono fotocopie da consegnare al ritiro insieme alla Dichiarazione sostitutiva. Via la domanda "quanti eredi" da /inizia. Nel modulo con rinuncia: tabella 1 = accettanti, tabella 2 = rinunciatari con estremi dell'atto; firma solo il dichiarante.
- ⭐ **Le foto del veicolo non hanno approvazione**: non sono un documento da verificare (servono per il carro attrezzi) — pillola neutra "Inviate", mai stati di verifica. Se una foto non va, glielo si dice in chat.
- **Un'azione non più valida non deve essere possibile da una pagina rimasta vecchia**: oltre all'aggiornamento automatico, i punti critici ricontrollano lo stato fresco dal server prima di mutare (documento approvato = intoccabile).

**Nuove decisioni 22 luglio 2026:**

- ⭐ **Banner cliente: SOLO 3 colori semantici** (blu in corso, verde traguardi, rosso serve-azione; grigio per pausa/annullo). Mai un colore per stato: i "troppi colori" stonano.
- ⭐ **Un solo box di stato per schermata**: se il banner in alto dice già la cosa, niente box che la ripete sotto.
- ⭐ **Il telefono del profilo aggiorna le pratiche in corso** (è il recapito operativo per il ritiro); il NOME sulle pratiche resta quello dichiarato (identità sui documenti — lo corregge l'admin se serve).
- **Cambio email in autonomia**: via link di conferma Supabase (doppioni impossibili), `utenti.email` si riallinea al login successivo; l'admin vede sempre l'email attuale ("Email account").
- **Gratuità con la clausola onesta**: gratis per veicoli sostanzialmente completi; parti importanti mancanti → contributo proposto SUBITO e accettato esplicitamente, mai a sorpresa.
- ⭐ **Dopo l'assegnazione comanda solo l'admin**: da "assegnata" in poi il cliente non modifica più NULLA (documenti, foto, e nemmeno nome/telefono via profilo); le modifiche dell'admin le vede anche il cliente. Prima dell'assegnazione, tutto ciò che il cliente cambia si riflette in admin.

**Nuove decisioni 17 luglio 2026:**

- ⭐⭐ **L'attesa è una pausa, non uno stato**: "Metti in attesa" congela la pratica SOPRA il suo stato (motivo obbligatorio, solo admin); alla ripresa torna esattamente dov'era. Il cliente vede solo "In attesa" con tono sereno, mai i motivi. Icona: OROLOGIO (niente barrette pausa).
- ⭐ **Cronologia note della pratica = memoria dell'admin**: note con data/ora esatte in `pratiche_note`, SOLO admin; attesa e ripresa si annotano da sole.
- ⭐ **Tutte le dichiarazioni sono modificabili dall'admin TRANNE la casistica** (che decide la struttura della pratica): ogni modifica sincronizza da sola l'area del cliente via le condizioni del catalogo. Le tendine admin offrono solo ESITI di verifica ("Non lo sa"/"Non ce l'ha" sono dichiarazioni del cliente, non opzioni dell'admin).
- **Chat admin nel dettaglio pratica**: l'admin scrive al cliente e LEGGE (senza scrivere) la conversazione demolitore↔cliente; frasi rapide salvate in DB e gestibili dall'interfaccia.
- **Niente "—" nelle tendine**: se manca il valore si mostra "Scegli…" disabilitato.
- ✅ ~~Casistiche EREDI da semplificare~~ FATTO il 22/07/2026 (vedi decisioni 22/07 seconda parte).

**Nuove decisioni 16 luglio 2026:**

- ⭐⭐ **Nomenclatura UNICA admin↔cliente**: le fasi del CRM e la timeline del cliente usano gli stessi concetti e nomi coerenti; nel CRM ogni fase mostra anche "Il cliente vede: …". Se si aggiunge una fase/stato, va nominata in coppia.
- ⭐ **Il cliente fotografa solo ciò che serve a NoiDemoliamo**: i documenti del delegato non si caricano — fotocopie al ritiro insieme alla delega. Principio: meno attrito nel wizard, i controlli fisici stanno al ritiro.
- **Selezionare una zona sulla mappa assorbe le selezioni interne** (comune ⊂ provincia ⊂ regione): mai doppie selezioni sovrapposte, né visive né nel DB.
- **Mockup a indirizzo fisso**: `localhost:3000/mockup.html` è il posto unico dove Davide guarda ogni mockup (F5 per vedere il nuovo).

**Nuove decisioni 15 luglio 2026:**

- ⭐⭐ **Moduli PDF in bianco e subito scaricabili**: niente autocompilazione (nemmeno le deleghe — si rivaluterà in futuro, il generatore resta pronto) e niente blocco pre-verifica. Il cliente vede e scarica i moduli dal box verde da subito, li compila a penna e li porta firmati al ritiro.
- **Eliminare un file da un documento inviato = torna in preparazione**: il documento non può restare "in verifica" a metà (upload ≠ invio, sempre).

**Nuove decisioni 7 luglio 2026:**

71. ⭐ **Il design admin è FISSATO** (vedi 6.8): lavanda + card con ombra, liste a card (non tabelle), profili con testata blu e statistiche in vetro, valori mai nero pieno. Ogni nuova pagina admin segue quegli input senza reinventare.
72. ⭐ **Modifica solo col tasto**: nei form admin niente campi sempre editabili — lettura di default, "Modifica" esplicito, salvataggio solo se qualcosa è cambiato. Evita modifiche/salvataggi accidentali.
73. **Niente gestione contratti nell'interfaccia** (per ora): ai contratti pensa Davide. Lo stato demolitore è un semplice Attivo/Non attivo.
74. **Cronologia demolitore come note datate** (`demolitori_note`): la storia del rapporto col demolitore si scrive lì, non in un campo note statico.

---

# 🚀 PARTE 10 — COME LAVORARE NELLA NUOVA SESSIONE (Claude Code o chat)

> Istruzioni per Claude dopo aver letto questo file.

1. **Leggi TUTTO questo file**, poi conferma a Davide di aver capito (breve riassunto: dove siamo + prossimo task)
2. **Riprendi dal punto 8.2 STEP 0**: il prossimo grande task è la **DASHBOARD DEMOLITORE** (7 punti elencati lì). Prima chiarisci con Davide il login del demolitore (invito email + /imposta-password), poi PROPONI l'approccio con anteprima visiva e attendi conferma. Design: segui la sezione 6.8 (per l'area demolitore valutare con Davide se stile CRM o stile cliente mobile — i demolitori potrebbero usare il telefono).
3. ⭐ **REGOLA FONDAMENTALE**: prima di modificare o rigenerare codice, SEMPRE proporre la modifica e attendere conferma esplicita di Davide
4. **Rispetta il design system** (parte 6) — in particolare il pattern card /inizia (6.2) e le regole d'oro (6.7)
5. **Stile comunicazione** (parte 7): passo-passo, linguaggio semplicissimo, zero gergo, anteprime visive prima dei cambi design
6. **Push**: commit chiari in italiano; push su main = deploy Vercel; verificare con `git status`
7. **Mobile testing**: iPhone reale su URL Vercel live
8. **Non assumere mai cose nuove**: se non sei sicuro, chiedi
9. **A fine sessione**: aggiornare QUESTO file con quanto fatto

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **WhatsApp assistenza clienti**: +39 351 828 0493 (pulsante fisso su tutte le pagine cliente)
- **GitHub**: ddiviesto/NoiDemoliamo
- **URL live**: https://noi-demoliamo.vercel.app
- **Supabase URL**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Progetto_NoiDemoliamo` ⚠️ (spostata FUORI da OneDrive a luglio 2026 — il vecchio percorso è obsoleto)
- **Davide device principale**: iPhone (test mobile) + HP PC (sviluppo)

---

**Fine documento. Ultimo aggiornamento: 27 luglio 2026.**