# NoiDemoliamo — Architettura completa

> Documento di riferimento del progetto. Aggiornato all'**8 agosto 2026**.
> Questo è l'unico file da leggere per capire com'è fatto il sito, come deve funzionare e come si lavora.
> **Contiene solo cose STABILI e ATTUALI**: regole, flussi, dati, come deve essere il sito.
> La cronaca delle sessioni non sta qui: se serve sapere *quando* è stata fatta una cosa, c'è la storia di GitHub.

---

# 📍 PARTE 1 — IDENTITÀ DEL PROGETTO

## 1.1 Cosa è NoiDemoliamo

Piattaforma italiana di **demolizione auto gratuita** per il privato.
Il cliente:
1. Va su `noi-demoliamo.vercel.app`
2. Compila un flusso di mini-step (`/inizia`) — 14-15 step (dipende da tipo veicolo e casistica)
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
| **Cliente privato** | Richiede demolizione/vendita auto, carica documenti, chatta con NoiDemoliamo e con demolitore, lascia recensioni a fine pratica | Auto-registrazione fine flusso `/inizia` o `/vendi-auto` |
| **Demolitore** | Riceve assegnazioni, fissa ritiro, carica certificati rottamazione e PRA, chatta con cliente e con NoiDemoliamo | Invito email da admin → imposta password |
| **Commerciante auto** | Vede aste auto disponibili, fa offerte, chatta con cliente per ritiro, scarica documenti operativi | Invito email da admin → imposta password |
| **Admin (Davide)** | Approva pratiche, gestisce destino, gestisce aste, recluta operatori, chatta con cliente e demolitore | Login con email autorizzata `ddiviesto@gmail.com` |
| **Collaboratori** (officine, concessionarie, assicurazioni) | Inseriscono pratiche per conto dei loro clienti | Invito email da admin (futuro) |
| **Enti pubblici** (polizia locale, comuni) | Inseriscono veicoli abbandonati | Invito email da admin (futuro) |

⚠️ In futuro potrebbero nascerne altri (periti, gestori flotte aziendali): architettura flessibile.

---

# 🛠️ PARTE 2 — STACK E AMBIENTE TECNICO

## 2.1 Stack

- **Frontend**: Next.js 16.2.6 (Turbopack) + React + TypeScript
- **Styling**: Tailwind CSS + style inline nei componenti più recenti (no font custom)
- **Backend**: Supabase (database PostgreSQL + Auth + Storage)
- **Hosting**: Vercel (produzione)
- **Repository**: GitHub `ddiviesto/NoiDemoliamo`
- **Live**: https://noi-demoliamo.vercel.app
- **Email transazionali**: Resend (`lib/email.ts`)
- **PDF**: pdf-lib (generazione) + pdfjs-dist (visore)

## 2.2 Cartella locale e ambiente

**Cartella progetto**: `C:\Progetto_NoiDemoliamo`

⚠️ **REGOLA**: il progetto non deve MAI stare dentro cartelle sincronizzate (OneDrive, Dropbox, Google Drive): bloccano i file di git. Ogni percorso `C:\Users\...\OneDrive\...` è obsoleto.

**Strumenti di lavoro**: Claude Code (estensione VS Code) · VS Code · PowerShell · Supabase SQL Editor · Chrome (F12 → Ctrl+Shift+M per il simulatore telefono) · iPhone reale su URL Vercel.

**Comandi essenziali**:
```powershell
npm run dev                                              # server di sviluppo
git add . ; git commit -m "messaggio" ; git push origin main   # push all-in-one
```

## 2.3 Variabili d'ambiente

File `.env.local` (locale, non tracciato da git):
```
NEXT_PUBLIC_SUPABASE_URL=https://egsufeczoroxqnagzqfq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...   ⚠️ il nome DEVE essere questo (pattern Next.js)
GOOGLE_MAPS_SERVER_KEY=...            (server-side: Distance Matrix + Geocoding)
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=... + EMAIL_FROM=...   (finché mancano, gli inviti danno il link da mandare a mano)
```

⚠️ **Claude non deve mai stampare o toccare `.env.local` e le chiavi.**
✅ Su Vercel le chiavi server sono configurate: admin e assegnazione automatica funzionano anche online.
✅ Google Cloud: Places API + Places API (New) abilitate, chiave browser limitata ai referrer del sito e di localhost.

## 2.4 Supabase

**URL**: https://egsufeczoroxqnagzqfq.supabase.co · **Admin email hardcoded**: `ddiviesto@gmail.com`

⚠️ **Free tier**: il progetto va in pausa dopo ~7 giorni di inattività (sintomo tipico: "Failed to fetch" alla creazione pratica) → aprire la dashboard ogni 5-6 giorni. Al lancio: Supabase Pro (~25$/mese).

### Buckets Storage

| Bucket | Visibilità | Contenuto |
|---|---|---|
| `geojson-comuni` | Pubblico | 20 file GeoJSON regioni italiane (mappa copertura demolitori) |
| `foto-pratiche` | Pubblico | Foto veicoli caricate dai clienti |
| `documenti-pratiche` | Privato | Libretto, certificato proprietà, carta identità, ecc. (signed URL 1h) |

### Policy RLS su Storage
- DELETE su `foto_pratiche` e `documenti` (solo proprietario, pre-assegnazione)
- DELETE su `storage.objects` (usa `split_part(name, '/', 1)` per matchare pratica_id)
- Admin full access su tutte le tabelle

---

# 🗄️ PARTE 3 — DATABASE

## 3.1 Tabelle esistenti

`casistiche_documenti`, `collaboratori`, `commercianti`, `demolitori`, `demolitori_comuni`, `demolitori_impegni`, `demolitori_note`, `demolitori_tariffe`, `fatture`, `foto_pratiche`, `impostazioni`, `interessi_commercianti`, `messaggi`, `messaggi_chat`, `messaggi_preimpostati`, `notifiche`, `pratica_documenti_checklist`, `pratiche`, `pratiche_note`, `solleciti`, `utenti`, `veicoli_vendita`, `veicoli_vendita_foto`

Anagrafiche intoccabili (autocomplete e mappa): `comuni`, `province`, `regioni`.

## 3.2 Tabella `pratiche` — 50+ colonne

Tabella centrale del progetto.

- **Identificativi**: `id` (uuid), `user_id` (uuid), `creato_il` (timestamp)
- **Veicolo**: `targa`, `tipo_mezzo`, `tipo_mezzo_altro`, `marca`, `modello`, `anno`, `km`, `incidentato` (bool), `marciante` (bool), `va_in_moto` (bool), `parti_mancanti` (bool), `note_veicolo`, `tipo_cambio` (manuale/automatico)
- **Indirizzo**: `indirizzo_ritiro`, `comune_ritiro`, `provincia_ritiro`, `cap_ritiro`, `lat`, `lng`, `spazio_carro_attrezzi` (libero/stretto/no), `spazio_carro_attrezzi_note`
- **Cliente**: `codice_fiscale` (⚠️ NULLABLE: null per targhe straniere, P.IVA 11 cifre per le società), `nome_richiedente`, `telefono`
- **Casistiche**: `casistica` (CHECK sugli 8 codici), `fermo_amministrativo` (si/no/non_so), `targhe_presenti` (bool, null per targhe straniere), `delegato_nome`, `delegato_telefono`, `numero_eredi` (LEGACY: il flusso non lo compila più), `nomi_rinunciatari` (colonna pronta ma non usata: i rinunciatari si scrivono a penna nel modulo ACI)
- **Documenti dichiarati**: `libretto` (si/denuncia/no, **NULLABLE**), `certificato_proprieta` (**NULLABLE**; la UI propone digitale/cartaceo/smarrito/nessuno, il CHECK ammette anche documento_unico)
- **Workflow**: `demolitore_id`, `stato`, `stato_precedente`, `data_assegnazione`, `data_ritiro_prevista`, `data_ritiro_effettuato`, `data_certificato_rottamazione`, `data_certificato_pra`, `cert_rottamazione_url`, `cert_pra_url`, `cert_rottamazione_a_mano`, `riassegnata`, `assegnazione_manuale`, `motivo_annullamento`, `in_attesa` + `attesa_*`
- **Scadenze**: `urgente`, `scadenza_proposta_ritiro` (⚠️ le scadenze dei certificati NON hanno colonne: si calcolano da `data_ritiro_effettuato` con le regole 1.3, cioè 24 ore per la rottamazione e 15 giorni lavorativi per il PRA)
- **Soldi**: `fee_concordata` (importo una tantum per la singola pratica)

**Valori `tipo_mezzo`** (text libero, nessun constraint):
`autovettura, motoveicolo, ciclomotore, minicar, furgone, imbarcazione, pullman, camion, velivolo, altro`

## 3.3 LE 8 CASISTICHE DI DEMOLIZIONE (cuore del sistema)

⭐ **FONTE UFFICIALE**: `docs/casistiche/Casistiche_Demolizione.md` (nel repo, collegato da `CLAUDE.md` → da leggere sempre). Elenca per ogni casistica i documenti da caricare, quelli da consegnare al ritiro, i moduli PDF e le 2 integrazioni.
Ogni pratica è classificata automaticamente dal flusso `/inizia` (`derivaCasistica` in `types/pratica.ts`) e salvata in `pratiche.casistica`.

| # | Codice | Descrizione | Particolarità |
|---|---|---|---|
| 1 | `persona_fisica` | Privato, mezzo intestato a persona fisica vivente | Caso base |
| 2 | `eredi_accettato` | Intestatario deceduto, eredi accettano tutti | Si fotografa SOLO chi gestisce la pratica; fotocopie di ogni erede al ritiro con la dichiarazione |
| 3 | `eredi_rinuncia` | Intestatario deceduto, qualcuno ha rinunciato | Rinuncia formale Notaio/Tribunale; chi rinuncia NON firma nulla e NON allega documenti |
| 4 | `societa` | Mezzo intestato a società attiva | P.IVA 11 cifre al posto del CF, visura camerale |
| 5 | `societa_fallita` | Società fallita/liquidata | Autorizzazione Giudice Delegato |
| 6 | `associazione` | Intestato ad associazione/ente | CF associazione |
| 7 | `non_intestatario` | Richiedente NON è l'intestatario (no eredità) | ⚠️ Delega NON ammessa |
| 8 | `targhe_straniere` | Targhe estere (non al PRA italiano) | ⚠️ Salta CF, CDC, fermo, consegna/delega, box targhe |

**Integrazioni trasversali** (si applicano ai casi 1-7):
- **Fermo amministrativo** (`fermo_si`) → dichiarazione sostitutiva + attestazione di inutilizzabilità
- **Targhe smarrite** (`targhe_assenti`) → denuncia di smarrimento targhe

Helper in `types/pratica.ts`: `derivaCasistica(intestazione, erediRinuncia, societaFallita)`, `delegaAmmessa(cas)` (false per non_intestatario e targhe_straniere), `fermoApplicabile(cas)` (false per targhe_straniere).

## 3.4 SISTEMA DOCUMENTI DINAMICI

Architettura "ricettario + lista della spesa": un **catalogo** statico di regole + una **checklist** generata per ogni pratica.

### `casistiche_documenti` (IL CATALOGO) — 89 documenti sulle 8 casistiche
```
id                 uuid     PK
casistica          text     CHECK sugli 8 codici
codice             text     es. 'libretto', 'ci_intestatario', 'delega'
nome               text     etichetta mostrata al cliente
descrizione        text     istruzioni semplici
richiede_upload    bool     va caricato in area personale (foto/PDF)
richiede_consegna  bool     va consegnato fisicamente al ritiro
template_pdf       text     se è un modulo scaricabile: nome template
per_erede          bool     moltiplicatore × erede (meccanismo vivo ma NON più usato da nessun documento)
condizione         text     quando appare: 'sempre', 'cdc_cartaceo', 'cdc_smarrito',
                            'targhe_assenti', 'fermo_si', 'delegato', 'libretto_smarrito', ...
obbligatorio       bool
ordine             int
```
RLS: lettura pubblica (è il "menu", niente dati personali), gestione solo admin.

### `pratica_documenti_checklist` (LO STATO — una riga per documento per pratica)
```
id              uuid    PK
pratica_id      uuid    FK pratiche (ON DELETE CASCADE)
documento_id    uuid    FK casistiche_documenti
indice_erede    int     null (meccanismo eredi non più usato)
stato           text    'da_fare' | 'caricato' | 'approvato' | 'rifiutato'
file_url        text    ⭐ ARRAY JSON di file: [{"url": "...", "nome": "...", "lato": "fronte"}]
scaricato_il    tstz    per i moduli PDF: quando il cliente l'ha scaricato
caricato_il     tstz
nota_admin      text    es. 'Foto sfocata, ricaricala'
aggiornato_il   tstz
```
UNIQUE INDEX su (pratica_id, documento_id, COALESCE(indice_erede,0)). RLS SELECT/INSERT/UPDATE + GRANT espliciti.

⭐ **Convenzione `file_url`**: array JSON `[{url, nome, lato}]` per supportare più file per documento (fronte/retro, più pagine) senza cambiare schema. Helper `leggiFile()`/`scriviFile()` in `TabDocumenti.tsx` (gestiscono anche il fallback stringa legacy).

### Trigger di generazione automatica ("il commesso automatico")
Trigger PostgreSQL su `pratiche`: alla creazione legge `casistica` + risposte (CDC, targhe, fermo, delegato) e **genera da solo le righe della checklist** dal catalogo.

### Documenti FRONTE/RETRO
Due caselle separate "Fronte" e "Retro" nella pagina cliente; l'invio in verifica è bloccato finché mancano entrambi i lati. Quali documenti sono fronte/retro è deciso da una **lista ufficiale di codici** in `TabDocumenti.tsx` (`CODICI_FRONTE_RETRO` + prefissi `CARTA_IDENTITA_*` / `TESSERA_SANITARIA_*`), presa dal file casistiche — NON dalla descrizione del documento.
Fronte/retro: libretto, libretto estero, certificato di proprietà cartaceo, carta d'identità/patente, codice fiscale/tessera sanitaria. **L'atto di morte NON è fronte/retro.** Tutti gli altri (denunce, visure, autorizzazioni) sono a caricamento libero.

### Regole del ciclo documenti
1. Creazione pratica → il trigger genera la checklist
2. **Upload ≠ invio**: il file si salva subito ma lo stato NON cambia; solo il bottone di pagina ("Ho finito, invia in verifica" / "Vai al prossimo documento") mette `stato='caricato'`, scrive `caricato_il` e azzera `nota_admin`
3. Eliminare un file da un documento già inviato lo riporta a `da_fare` (mai "in verifica" a metà)
4. Il cliente può eliminare file e foto SOLO negli stati in `STATI_MODIFICABILI_DA_CLIENTE`: in_attesa_documenti, in_attesa_approvazione_admin, documenti_parzialmente_approvati, da_assegnare, in_attesa_assegnazione, in_assegnazione_manuale
5. Approvazione admin per SINGOLO documento (rifiuto con motivo in `nota_admin`) + "Approva tutti"
6. **Il rifiuto azzera i file** del cliente (riga svuotata + pulizia bucket): ritrova il documento come alla prima vista, col motivo nella testata rossa
7. I documenti con `richiede_consegna=true` compongono la lista "Da portare al ritiro"
8. Un documento **approvato non si tocca più**, nemmeno da una pagina rimasta aperta: prima di ogni modifica si rilegge lo stato fresco dal server

⭐ **Il cliente fotografa solo ciò che serve a NoiDemoliamo.** I documenti del **DELEGATO** non si caricano (`richiede_upload=false`): le fotocopie fronte/retro si consegnano al ritiro insieme alla delega, e la riga della delega lo spiega. Stesso principio per gli **altri eredi**: si fotografa solo chi gestisce la pratica, le fotocopie degli altri arrivano al ritiro con la Dichiarazione sostitutiva. Meno attrito nel wizard, i controlli fisici stanno al ritiro.

⭐ **Nomi diversi per cliente e admin** (`nomeAdmin` + `RUOLO_CASISTICA`): il possessivo del catalogo cliente ("La tua carta d'identità") per l'admin diventa il RUOLO secondo la casistica ("Carta d'identità dell'intestatario / dell'erede che gestisce / del legale rappresentante"), così il controllo incrociato coi dati dichiarati è immediato. Vale in griglia, visore e rifiuto.

⚠️ Il constraint della checklist ammette ancora il valore `'consegna_a_mano'`: è innocuo (nessuno lo scrive più), resta da una funzione rimossa.

## 3.5 Tabelle legacy

Nessuna: `documenti` e `documenti_approvazione` (vecchio sistema documenti) e le colonne `pratiche.ruolo_richiedente` / `pratiche.eredita` sono state eliminate il 03/08/2026 con la pulizia legacy.

## 3.6 `foto_pratiche`

Foto **del veicolo**: `id`, `pratica_id`, `url` (bucket foto-pratiche), `caricato_il`.
Le foto NON hanno approvazione (servono a capire che carro attrezzi mandare): pillola neutra "Inviate", mai stati di verifica. Eliminabili dal cliente negli stati modificabili.

## 3.7 `messaggi_chat` — TRE CANALI

`id`, `pratica_id`, `mittente_id`, `mittente_tipo` ('cliente'|'admin'|'demolitore'|'commerciante'), `testo`, `letto`, `creato_il`, `conversazione`.

Colonna `conversazione` con CHECK su tre valori:
- `cliente_noidemoliamo` → cliente ↔ admin
- `cliente_demolitore` → cliente ↔ demolitore
- `demolitore_noidemoliamo` → demolitore ↔ admin (canale diretto)

**Privacy**: policy RESTRITTIVA in SELECT (`messaggi_chat_canale_riservato`): il canale demolitore↔NoiDemoliamo è visibile solo all'admin e al server (service role), mai al cliente (che ha anche filtri UI e contatore che lo escludono).
**Viste**: l'**admin** ha tre linguette — Cliente e Demolitore scrivibili, "**Dem. e Cliente**" in **SOLA LETTURA** (controllo qualità: legge la conversazione tra loro senza poter scrivere). Il **demolitore** ha Cliente / NoiDemoliamo. Il **cliente** vede i suoi 2 canali. Il pallino rosso conta solo i messaggi diretti a chi guarda e si azzera aprendo la linguetta giusta.
**Regola `letto`**: ogni messaggio ha UN destinatario, quindi ognuno segna letti i messaggi del proprio canale quando lo apre.
I messaggi vecchi hanno `conversazione` NULL e le interfacce li mostrano col vecchio criterio dei mittenti.

## 3.8 `pratiche_note` — cronologia della pratica

`id`, `pratica_id`, `testo`, `autore` ('admin'|'demolitore'), `evento`, `visibile_demolitore`, `demolitore_id`, `creato_il`. **Solo admin** in lettura piena.
È la memoria dell'admin: note manuali + **eventi automatici** (cambio stato, documento rifiutato, documenti approvati, assegnata/riassegnata/disassegnata, ritiro fissato/spostato, ritirata, certificati, trattativa, attesa/ripresa, annullo/riattivazione).
Due canali: **NoiDemoliamo = registro completo**; la pillolina **Demolitore** è solo un FILTRO della vista di lui, e da lì gli si scrive.

## 3.9 `impostazioni`

Chiave-valore. Es: `max_pratiche_aperte_demolitore=15`

## 3.10 `demolitori`, `demolitori_comuni`, `demolitori_tariffe`, `demolitori_note`

- **`demolitori`**: `ragione_sociale`, `piva`, `codice_sdi`, `indirizzo`/`citta`/`provincia`/`cap`/`lat`/`lng` (da Google autocomplete), `telefono_fisso`, `titolare_nome`/`titolare_cellulare`, `referente_nome`/`referente_cellulare`, `email_assegnazione`, `email_aziendale`, `pec`, `stato` (attivo/in_attesa/sospeso), `fee_per_pratica` (fee BASE), `contratto_firmato`, `velocita_media_giorni`, `invito_inviato_il`.
- **`demolitori_comuni`**: copertura geografica (demolitore_id, comune, provincia [NOME intero], tipo: 'regione'|'provincia'|'provincia_esclusa'|'comune_incluso'|'comune_escluso'). Impostata dalla mappa `MappaComuni`.
  ⭐ **Assorbimento delle selezioni** (comune ⊂ provincia ⊂ regione): selezionare una provincia assorbe i comuni inclusi al suo interno, selezionare una regione assorbe province, esclusioni e comuni. Mai doppie selezioni sovrapposte, né a video né nel DB.
  ⭐ **Convenzioni del pannello copertura**: si mostrano SOLO le zone coperte, MAI la lista dei comuni esclusi (restano nel DB come `comune_escluso` e sulla mappa si vedono come "buchi" non colorati). Province e regioni con esclusioni interne hanno il badge giallo **"parziale"**. Tooltip gerarchico: zoom province → mostra la regione, zoom comuni → provincia · regione.
- **`demolitori_tariffe`**: tariffe per zona (id, demolitore_id, tipo 'regione'|'provincia'|'comune', nome, fee).
- **`demolitori_note`**: note e cronologia del rapporto col demolitore (timeline nella scheda).

⭐ **REGOLA DI FATTURAZIONE (più specifico vince)**: fee del veicolo = `pratiche.fee_concordata` se valorizzata (**Trattativa Extra**: importo una tantum per la singola pratica, bypassa tutto), altrimenti tariffa del COMUNE di ritiro, altrimenti PROVINCIA, altrimenti REGIONE, altrimenti `fee_per_pratica` base.
Le tariffe di zona sono INDIPENDENTI dalla copertura (una tariffa fuori copertura vale per i ritiri fuori zona assegnati a mano; la UI mostra l'etichetta "fuori copertura").
Il **ritiro effettivo** (`data_ritiro_effettuato`) fa entrare la pratica in fatturazione; a fine mese proforma fattura per demolitore.

**Stato demolitore**: nell'interfaccia è solo **Attivo** (riceve pratiche) o **Non attivo** (`in_attesa`/`sospeso` mostrati entrambi così). `contratto_firmato` esiste nel DB ma non è gestito dall'interfaccia: ai contratti pensa Davide.
**Tre livelli di controllo**: Non attivo (niente pratiche nuove, entra ancora) → Revoca accesso (spegne SOLO il login, scheda/note/pratiche storiche intatte, reinvitabile) → Elimina (sparisce tutto: copertura, tariffe, note, account e riga; **bloccato dal server se ha pratiche aperte**, le storiche perdono solo il riferimento). L'eliminazione si conferma **riscrivendo la ragione sociale**.

## 3.11 Altre tabelle

- `utenti`: profilo utente (collegato a Supabase Auth via id), `tipo` ('cliente'|'admin'|'demolitore'|...), `demolitore_id`, `email`
- `messaggi_preimpostati`: frasi rapide. `categoria` 'chat' | 'rifiuto' (dell'admin, `demolitore_id` NULL) | **'chat_demolitore'** (le frasi PERSONALI di ogni demolitore, `demolitore_id` valorizzato; le semina l'endpoint alla prima apertura della chat e le gestisce lui col "Gestisci")
- `demolitori_impegni`: **impegni PERSONALI del demolitore** (id, demolitore_id, quando, titolo, luogo) per la pagina Ritiri. PRIVATI: RLS accesa senza policy browser, ci si arriva solo da `/api/demolitore-impegni` (service role); nemmeno l'admin li vede
- `veicoli_vendita` + `veicoli_vendita_foto`: flusso D (vendita), separate da `pratiche`

## 3.12 Tabelle ANCORA DA CREARE

- `recensioni` (id, pratica_id, cliente_id, demolitore_id, tipo, stelle, commento, creata_il)
- `aste` (id, riferimento_id, riferimento_tipo, tipo, prezzo_base, somma_per_cliente, date, stato, vincitore_id)
- `offerte_asta` (id, asta_id, offerente_id, importo, timestamp)
- `documenti_operativi_commercianti` (id, titolo, descrizione, url_file, attivo)
- `notifiche_app` (id, utente_id, tipo, titolo, messaggio, letta, link, timestamp)
- `notifiche_sms_inviate` (id, utente_id, numero, testo, stato, timestamp)

⚠️ Se create DOPO il 30/10/2026 → GRANT espliciti obbligatori (vedi 8.4).

---

# 🔄 PARTE 4 — I FLUSSI DELLA PRATICA

### ⭐ Regola "TI CHIAMIAMO NOI"
Se il cliente dichiara di **non avere né libretto né denuncia** (`libretto='no'`), **non sa che certificato di proprietà ha** (`certificato_proprieta='nessuno'`) oppure **non sa se c'è il fermo** (`fermo_amministrativo='non_so'`), NON si procede in automatico: **prima NoiDemoliamo lo chiama**.
Il **cliente non vede nessun avviso** di chiamata (nessun box giallo): queste pratiche compaiono nella pillola "**Da contattare**" del CRM e chiama l'admin. Nella pagina documenti il libretto viene semplicemente tolto dalla lista da caricare.

## 4.1 Flusso A — Demolizione standard ✅ FUNZIONANTE

```
Cliente compila /inizia (14-15 mini-step, casistica derivata automaticamente) → crea account
   ↓
Il TRIGGER genera la CHECKLIST DOCUMENTI dalla casistica
   ↓
Cliente carica i documenti in area personale (wizard, un documento alla volta)
   ↓
Admin approva (singolo documento o "Approva tutti") dal visore
   ↓
Quando TUTTI i documenti sono approvati → stato "da_assegnare"
   ↓
2 MODALITÀ DI ASSEGNAZIONE: automatica (algoritmo, vedi 4.4) o manuale (admin sceglie dalla lista)
   ↓
Demolitore ha 8 ORE LAVORATIVE per fissare data/ora ritiro (la data vale subito: il cliente non deve confermare)
   ↓
Giorno del ritiro → il cliente consegna gli ORIGINALI ("Da portare al ritiro") → demolitore: "Veicolo ritirato"
   ↓
SISTEMA RECENSIONI (da costruire): 2 recensioni obbligatorie prima del certificato
   ↓
Demolitore ha 24 ORE per il certificato di rottamazione
   ↓
Demolitore ha 15 GIORNI per la radiazione PRA
   ↓
PRATICA COMPLETATA
```

## 4.2 Flusso B — Asta tra demolitori (DA COSTRUIRE)

Per auto interessanti dove vogliamo monetizzare di più.
```
Admin sceglie destino: ASTA DEMOLITORI → prezzo base, durata, demolitori invitati
→ i demolitori vedono "Aste aperte" (foto, città, marca, anno, km, condizioni; NO dati cliente)
→ offerte ≥ prezzo corrente → scadenza → admin sceglie il vincitore
→ Vincitore: pratica assegnata, parte il flusso A. Nessuna offerta: rilancio o standard.
```

## 4.3 Flusso C — Vendita ai commercianti (DA COSTRUIRE)

**Strategia**: admin **prima** testa il mercato con i commercianti, **poi** se vede interesse contatta il cliente.
```
Admin "Proponi ai Commercianti" (prezzo richiesto, somma cliente opzionale, durata)
→ visibile a TUTTI i commercianti (foto + città + dati veicolo; NO dati cliente)
→ offerte → se c'è interesse, admin contatta il cliente ("Lei non spende nulla. [Eventuale +100€]")
→ Cliente ACCETTA: il commerciante vincitore riceve i dati completi, paga il cliente al ritiro e paga NoiDemoliamo
→ Cliente RIFIUTA: torna al flusso A. Nessuna offerta: decide l'admin.
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

**Migrazione tra flussi**: vendita → demolizione (pratica copiata in `pratiche` con stato `da_assegnare`); demolizione → commercianti (flusso C); demolizione → acquisto NoiDemoliamo (con OK del cliente).

## 4.5 Stati pratica (`pratiche.stato`)

```
# Fase documenti
in_attesa_documenti · in_attesa_approvazione_admin · documenti_parzialmente_approvati · da_assegnare

# Ramo demolizione standard
in_attesa_assegnazione · in_assegnazione_manuale · assegnata · in_attesa_conferma_cliente
ritiro_confermato · ritirata · in_attesa_recensione_cliente
in_attesa_cert_rottamazione · in_attesa_cert_radiazione_pra · completata

# Ramo asta demolitori
in_asta_demolitori · asta_demolitori_chiusa

# Ramo commercianti
in_proposta_commercianti · in_attesa_consenso_cliente · trattativa_commercianti_accettata
in_passaggio_proprieta · passaggio_completato

# Ramo acquisto diretto
acquistata_da_noidemoliamo

# Comuni
annullata
```

⚠️ **VINCOLO `pratiche_stato_check`**: la colonna ha un CHECK con l'elenco degli stati ammessi. **Se aggiungi un nuovo stato, aggiornalo anche nel constraint**, altrimenti l'update fallisce IN SILENZIO e la pratica resta bloccata. Vale per tutti i CHECK del DB (è già successo con `utenti_tipo_check` e 'demolitore').

⭐ **Le transizioni passano dal SERVER** (service role), non dal browser admin: `/api/pratica-stato` ricalcola lo stato dai documenti. La pagina admin si **auto-sincronizza all'apertura** (self-heal: se i documenti sono a posto ma la pratica è indietro, la sblocca da sola).
⭐ `in_attesa_approvazione_admin` scatta SOLO quando **tutti** i documenti sono stati inviati.

## 4.6 PIPELINE CRM — il flusso in caselle

Il "Flusso pratiche" è una **fila di pillole tonde da sinistra a destra con le frecce**: numero nel tondino azzurro + nome, quella attiva con l'anello blu. Ogni pillola è anche un filtro. Ogni pratica appartiene a UNA fase (funzione `bucketDi` in `/admin`):

1. **In attesa documenti** = `in_attesa_documenti` + `documenti_parzialmente_approvati` → il cliente vede "In attesa dei tuoi documenti"
2. **Documenti da verificare** = `in_attesa_approvazione_admin` → "Stiamo verificando i tuoi documenti"
3. **In attesa assegnazione** = `da_assegnare` + `in_assegnazione_manuale` + `in_attesa_assegnazione` → "Documenti verificati"
4. **Assegnata** = `assegnata` + `in_attesa_conferma_cliente` → "Demolitore assegnato"
5. **Ritiro Programmato** = `ritiro_confermato`
6. **Ritirata** (somma) = spezzata in "Attesa Certificati" (ritirata + attesa rottamazione + recensione) e "Attesa PRA"
7. **Completata** = `completata` — **SOLO col certificato di cancellazione targhe PRA**

**Fuori dalla fila** (non sono fasi, sono anomalie o pause, separate da uno stacco e cliccabili come filtro):
- **Da contattare** (bianca a zero, rossa coi casi): libretto no + CDC nessuno + fermo non_so
- **Allerta 8 ore**: assegnata/in_attesa_conferma_cliente con `scadenza_proposta_ritiro` scaduta
- **In attesa**: pratiche in pausa
- Le annullate restano fuori dal flusso (filtro a parte)

⭐ **Nomenclatura UNICA admin↔cliente**: CRM e timeline del cliente usano gli stessi nomi. Se nasce una fase o uno stato, va nominato in coppia (e aggiunto in `lib/statiCliente.ts` e `lib/statiCrm.ts`).
⭐ **Regola certificati**: il certificato di ROTTAMAZIONE può essere caricato dal demolitore **oppure consegnato a mano al ritiro** (spunta apposita, non blocca la pratica). Ciò che completa la pratica è SEMPRE e solo la **radiazione PRA**.

## 4.7 Attesa, annullamento, riattivazione

⭐ **L'attesa è una PAUSA SOPRA lo stato**, non uno stato del workflow: alla ripresa la pratica torna esattamente dov'era. Motivo obbligatorio, solo admin. Il cliente vede solo "In attesa" con tono sereno, mai i motivi.

**Annullamento** (`/api/pratica-annulla`, motivo OBBLIGATORIO → `motivo_annullamento`):
- **Prima dell'assegnazione**: stato annullata + motivo, fine
- **Dopo l'assegnazione**: il `demolitore_id` NON viene azzerato, resta come traccia per il controllo qualità. La scheda demolitore mostra la statistica **"Annullate"** (cliccabile → elenco coi motivi). Anche il demolitore le vede nella sua area: è un deterrente voluto
- La pratica annullata non conta tra le "aperte" del demolitore
- Eliminazione definitiva ≠ annullamento

**Riattivazione**: all'annullamento si salva `stato_precedente`; lo stesso endpoint con `{ riattiva: true }` riporta la pratica esattamente dov'era. Annullamento e riattivazione si annotano da soli in `pratiche_note`. Premendo Attiva il flusso si sposta da solo nella casella di destinazione e la pratica resta aperta.

Tutto vive nel menu **"Stato pratica"** (Attiva / Metti in attesa / Annulla) con le pillole di stato vere dentro la nuvoletta.

## 4.8 Assegnazione al demolitore

Implementata in `lib/assegnazione.ts` + `/api/assegna-pratica`.

```
1. Prerequisiti (comune + provincia + lat/lng)
2. Demolitori che coprono il comune → 3. solo attivi → 4. esclude i saturi (max 15 pratiche aperte)
5. Distanza stradale (Google Distance Matrix) → 6. velocità storica (ultime 20 pratiche, su data_ritiro_effettuato)
7. Ordina: velocità → distanza → pratiche aperte → 8. vincitore + lista debug
```

⭐ **L'algoritmo suggerisce, l'admin decide**: "Assegna in automatico" lancia il **dry-run** (calcola senza scrivere) e mostra la classifica; l'admin conferma il consigliato o ne sceglie un altro. La lista è **UNA sola** con tutti i demolitori attivi: prima chi copre la zona, sotto la voce grigia "Non coprono la zona".
Ogni candidato torna dal server con: **città · km · giorni**, chip "**N da ritirare**" (assegnate senza data di ritiro effettivo), **fee applicabile** con la zona della tariffa.

**Riassegnazione / disassegnazione**: sempre possibili. Ogni cambio setta `pratiche.riassegnata = true` → il cliente vede messaggi SERENI, mai allarmanti ("Stiamo scegliendo un nuovo demolitore" / "Nuovo demolitore in arrivo, ti contatterà entro 8 ore lavorative"). Il nuovo demolitore riparte da zero, al vecchio sparisce la pratica, la storia resta tutta all'admin.

⚠️ **Trappola viva**: le pratiche salvano la provincia come **sigla** ("ME", da Google), la copertura usa il **nome** ("Messina"). L'algoritmo converte con `lib/province.ts` prima di confrontare, altrimenti "nessun demolitore copre".
Se nessuno copre → `in_assegnazione_manuale`. Da fare: media recensioni nello scoring.

## 4.9 Sistema RECENSIONI (DA COSTRUIRE)

Il cliente lascia **2 recensioni a fine pratica** (demolitore + NoiDemoliamo), **obbligatorie** prima del certificato di rottamazione.
```
"Veicolo ritirato" → stato 'in_attesa_recensione_cliente' → notifica al cliente
→ banner bloccante → 2 card recensione (stelle 1-5 + commento opzionale)
→ salvate in `recensioni` → stato 'in_attesa_cert_rottamazione'
→ MARKETING: se NoiDemoliamo ≥ 4 stelle → invito a recensire su Google Maps. Se ≤ 3: solo interna.
```
Integrazioni: scoring dell'algoritmo, dashboard demolitore, social proof in homepage.
Nel flusso CRM NON c'è una casella recensioni: si gestiranno in automatico con email e link.

---

# 📂 PARTE 5 — STRUTTURA E PAGINE

## 5.1 Albero principale

```
C:\Progetto_NoiDemoliamo\
├── app/
│   ├── page.tsx                    # Home pubblica
│   ├── layout.tsx                  # Layout root (viewport anti-zoom, solo tema chiaro)
│   ├── globals.css                 # Tailwind + scrollbar-gutter stable
│   ├── login/                      # Login multi-ruolo
│   ├── imposta-password/           # Demolitore che accetta l'invito
│   ├── recupera-password/          # Password dimenticata: richiesta del link
│   ├── nuova-password/             # Atterraggio del link email di recupero
│   ├── privacy/ · termini/         # Pagine legali (con segnaposto [DA COMPLETARE])
│   ├── inizia/                     # Flusso cliente mini-step
│   │   ├── page.tsx                # Orchestratore: getSteps dinamico + traduciErrore()
│   │   └── steps/                  # StepTipoVeicolo, StepIdentificaVeicolo,
│   │                               #   StepCondizioniVeicolo, AutocompleteIndirizzo
│   ├── dashboard/                  # AREA CLIENTE
│   │   ├── page.tsx                # Home "Le tue pratiche"
│   │   ├── PannelloImpostazioni.tsx
│   │   └── [id]/                   # Documenti · Ritiro · Stato · Chat
│   ├── admin/                      # CRM da PC
│   │   ├── page.tsx                # TUTTO il CRM: lista + tendina + pannelli
│   │   ├── _components/AdminSidebar.tsx
│   │   ├── demolitori/             # lista + TendinaDemolitore + [id]/MappaComuni
│   │   └── pratiche/[id]/          # solo COMPONENTI condivisi (la pagina non esiste più):
│   │                               #   DocumentiApprovazione, ChatAdmin, CronologiaNote
│   ├── demolitore/                 # AREA DEMOLITORE
│   │   ├── page.tsx · ritiri/ · pratiche/[id]/
│   │   └── _components/            # SidebarDemolitore, TendaAzienda,
│   │                               #   TendinaPratica (+ PickerRitiro),
│   │                               #   ChatDemolitore, NoteDemolitore
│   ├── components/                 # AiutoWhatsApp, IconaVeicolo,
│   │                               #   VisoreDocumenti (visore CONDIVISO)
│   └── api/                        # vedi 5.4
├── lib/                            # supabase, assegnazione, province, googleMaps, email,
│                                   #   aggiornaLive, statiCliente, statiCrm, demolitoreAuth, moduli/
├── types/pratica.ts                # Intestazione, Casistica (8), derivaCasistica, delegaAmmessa…
├── docs/                           # casistiche/ · moduli/ · sql/
├── public/                         # logo, geojson, mockup.html (in .gitignore)
├── ARCHITETTURA.md                 # QUESTO FILE — la memoria del progetto
├── CLAUDE.md                       # letto da Claude Code → rimanda qui
└── AGENTS.md · package.json
```

## 5.2 Flusso `/inizia`

### Ordine step (14-15 visibili; `getSteps` è dinamico in base alle risposte)
```
1  TIPO VEICOLO (griglia 4+4 + "Altro")
2  INTESTAZIONE (6 opzioni → deriva la casistica)
2b RAMO EREDI (solo rinuncia sì/no)                    [solo deceduto]
2c RAMO SOCIETÀ FALLITA                                [solo società]
3  IDENTIFICA VEICOLO (anno, km, marca, modello + tipo di cambio per i mezzi che ce l'hanno)
4  CONDIZIONI (Va in moto? · Cammina? · incidentata · parti mancanti + note)
5  INDIRIZZO + SPAZIO CARRO ATTREZZI
6  TARGA (+ box targhe presenti; adattato per targhe straniere)
7  CF DINAMICO                                         [saltato per targhe straniere]
8  FOTO (gamification 4 foto)
9  FERMO AMMINISTRATIVO                                [saltato per targhe straniere]
10 CONSEGNA (io/delegato)                              [saltato per non_intestatario e targhe straniere]
11 LIBRETTO
12 CDC (regola ottobre 2015)                           [saltato per targhe straniere]
13 ACCOUNT FINALE UNIFICATO ("Ultimo passo!")
```

### Regole del flusso
- **Bozza persistente**: dati e passo corrente salvati in sessionStorage a ogni modifica → ricaricare o uscire non fa perdere il modulo. La password non viene MAI salvata; le foto vivono solo in memoria. Bozza cancellata a invio riuscito.
- **Seconda pratica per cliente registrato**: `/inizia` rileva la sessione (solo tipo 'cliente'); se loggato lo step finale diventa "Conferma e invia" (niente email/password), nome e telefono precompilati, la pratica si aggancia al `user_id` esistente.
- **`traduciErrore()`**: gli errori Supabase escono in italiano semplice ("Failed to fetch" → "Errore di connessione…"); l'originale va in console.
- **Personalizzazione per tipo veicolo ovunque**: banner, titoli, articoli, generi (isFemminile: autovettura/minicar/imbarcazione), `tipoAltro`, ICONE_VEICOLO, `getStepMeta`.
- **Titoli con la parola chiave in BLU**: nei `titoloPagina` la keyword sta tra `*asterischi*` e l'helper `evidenzia()` la colora.
- **Mobile**: anti-zoom iOS (input 16px), inputMode corretti, NIENTE scrollIntoView automatico, bottoni "Continua" mai disabilitati (validazione al click), normalizzazione targa/CF, formattazione km.

## 5.3 Stato delle pagine

| Pagina | Stato | Note |
|---|---|---|
| **Home `/`** | ✅ | Stile app, logo, spunte SVG, WhatsApp fisso |
| **`/login`** | ✅ | Testata blu alta "Bentornato" col logo a cavallo, campi a pillola che si accendono a fuoco, link "Password dimenticata?", redirect per ruolo (commerciante da aggiungere). Niente "Registrati": i ruoli si registrano in modi diversi |
| **`/recupera-password`** | ✅ | Password dimenticata: email → link da Supabase; conferma "Controlla la tua email" con nota spam e "Rimanda il link" bloccato 60s |
| **`/nuova-password`** | ✅ | Atterraggio del link di recupero: nuova password (minimo 8 caratteri, spunta che diventa verde) e "Salva ed entra" nell'area del proprio ruolo |
| **`/inizia`** | ✅ | Completo e collaudato; full-bleed su mobile |
| **`/privacy` e `/termini`** | 🟡 | Bozze complete, con segnaposto [DA COMPLETARE] (ragione sociale, P.IVA, sede, email). Da rivedere con Davide |
| **`/dashboard`** (home cliente) | ✅ | Card pratiche + "Aggiungi un altro veicolo" + pannello Impostazioni |
| **`/dashboard/[id]`** | ✅ | 4 tab: **Documenti · Ritiro · Stato · Chat** |
| **`/admin`** | ✅ | **TUTTO il CRM in una pagina**: lista + tendina sotto la riga + pannelli. Ad altezza schermo: scorre solo la lista |
| **`/admin/demolitori`** | ✅ | Lista a card + tendina sotto la riga (la pagina di dettaglio non esiste più) |
| **`/demolitore`** | ✅ | Home e scheda pratica a tendina FOTOCOPIA del CRM, visore documenti CONDIVISO in sola lettura, pagina **Ritiri** (agenda a timeline + impegni personali) |
| Area commercianti | ❌ | Da costruire |

### Recupero password (`/recupera-password` + `/nuova-password`)
- Percorso: Accedi → "Password dimenticata?" → email → **il link lo manda Supabase** (template Reset Password riscritto in italiano nella dashboard) → si atterra su `/nuova-password` → nuova password → "Salva ed entra" porta direttamente nell'area del proprio ruolo.
- **Riservatezza**: non si rivela MAI se un'email è registrata (si va sempre alla conferma "Controlla la tua email"). Rimando del link bloccato 60 secondi.
- `/imposta-password` resta la pagina degli **inviti** dei demolitori; `/nuova-password` è solo per il recupero. Stessa meccanica di verifica del link (sessione da URL + fallback PKCE), link scaduto = avviso rosso + bottone "Richiedi un nuovo link".
- ⚠️ **Ogni pagina che riceve un link email di Supabase va autorizzata** in Authentication → URL Configuration → Redirect URLs (oggi 4 righe: imposta-password e nuova-password, ciascuna per localhost e Vercel).

### Com'è fatto il CRM (`/admin`)
Clic sulla riga → si srotola una **tendina sotto la riga** (la riga si tinge d'azzurro e fa da testata; cornice blu 2px che ingloba riga+tendina). Riclic o Esc chiude. Cambiare filtro chiude tutto.
- **Schede della tendina, in fila**: **Cronologia e Note · Cliente · Casistiche · Veicolo · Ritiro** (tutte con la matita per la modifica sul posto, tutte alla stessa altezza)
- **Fila azioni nella testata**: **Documenti** (contatore + pallino spia, apre direttamente il visore sul primo da verificare) · **Chat** · **Stato pratica** · **Trattativa Extra** · **Assegnazione**, col **cestino** a destra (due scelte: solo la pratica / pratica e account)
- Nella scheda **Ritiro** c'è l'elenco con le **spunte degli originali da consegnare**, generato dalla checklist (`richiede_consegna`, libretto escluso se "da chiarire"): è dinamico, mostra solo ciò che si applica alla pratica
- Nella scheda **Casistiche**, se il cliente ha dato risposte critiche, compare l'avviso "**Dal modulo**" (pillola blu tenue: "niente libretto · CDC da chiarire · fermo da verificare") che sparisce da solo quando l'admin corregge
- **Ricerca**: appena scrivi, il filtro attivo si ignora e si cerca su TUTTE le pratiche (annullate comprese); cliccando il risultato il flusso si sposta nella sua casella e la tendina si apre lì
- **Deep link `/admin?apri=<id>`**: apre il CRM direttamente sulla tendina di quella pratica (lo usa la scheda demolitore)
- **Chat e Cronologia a finestrella** in basso a destra, affiancate in un contenitore unico (non si sovrappongono mai, nemmeno ingrandite)

### Visore documenti admin (`DocumentiApprovazione.tsx`)
Pannello che **scivola da destra a tutta altezza**. ⭐ I pezzi del palco (`ZoomImg`, `PdfZoom`, `nomeAdmin`, `scaricaPdfVoci`) vivono nel componente CONDIVISO `app/components/VisoreDocumenti.tsx`, usato anche dall'area demolitore in sola lettura: i due visori restano gemelli. Testata gemella della tendina (icona veicolo, "targa · modello · anno", cliente sotto). Elenco a sinistra con miniature vere e stato a **pallino** colorato; le foto del veicolo sono solo **miniature in griglia**, senza descrizioni. Palco ardesia con frecce **a rotazione** (dall'ultimo si riparte dal primo, anche da tastiera).
- **Zoom**: rotella sempre attiva quando ci sei sopra, trascina per spostarti, barretta − / % / + / Adatta in basso. Fronte e retro affiancati hanno zoom indipendente. I PDF diventano immagini (`PdfZoom`, pdfjs-dist) e passano nello stesso visore, con la pillolina "Pag. 1/3"
- **Approva / Rifiuta nel visore**: "✓ Approva" pillola bianca bordo celeste testo blu (passa da solo al prossimo documento da verificare), "Rifiuta" scritta rosso spento che apre la **nuvoletta** col motivo e le frasi pronte a chips (gestibili in linea)
- ⭐ **SCARICO PDF**: bottone Scarica con due strade — "Questo documento"/"Questa foto" (PDF singolo) oppure "**Scegli cosa scaricare**" (caselle nell'elenco). Ne esce **UN PDF unico pronto da inoltrare** (es. solo le foto a un commerciante): pdf-lib lato browser, immagini su A4 con l'etichetta del documento (ruolo casistica + fronte/retro), i PDF del cliente copiati pagina per pagina. **Le pagine delle foto vanno senza etichetta.** Nome file "Documenti TARGA.pdf", o "Foto TARGA.pdf" se contiene solo foto. Se un file non entra, il PDF esce comunque con l'avviso di cosa manca

### Com'è fatta l'area demolitore
- **La barra laterale** (`SidebarDemolitore.tsx`): dal 05/08 è la **GEMELLA ESATTA dell'AdminSidebar**: fissa e sempre aperta su PC (210px, niente angoli smussati né apertura a scomparsa, entrambe provate e tolte), blu in dissolvenza, testata con logo + nome del demolitore + "DEMOLITORE" in maiuscoletto (come NoiDemoliamo/ADMIN), voce attiva "in vetro", icona Pratiche a portablocco, Esci in fondo oltre la riga. Sul telefono resta il menu ☰ a tenda. Voci: Pratiche · La tua azienda · Fatturazione ("PRESTO") · Esci
- **Tenda "La tua azienda"** (`TendaAzienda.tsx`, mockup approvato 05/08 dopo tre giri: bocciati il pannello da destra, la pagina intera e la tenda sulla colonnina a scomparsa): scivola **da sinistra a destra uscendo dal bordo della barra fissa**; il velo scuro copre SOLO la pagina (la barra resta luminosa e cliccabile). Testata azzurra come le barre del CRM: scrittina "LA TUA AZIENDA" in maiuscoletto e NOME del demolitore protagonista nel grigio dei valori (`#3E4C63`), ✕ a tondino bianco col bordo celeste. 3 schede della famiglia in COLONNA UNICA in sola lettura (Azienda · Sede · Contatti, etichetta a sinistra e valore a destra), indirizzo senza doppioni, dati freschi a OGNI apertura. Si chiude con la ✕ **o cliccando sul velo**. Etichetta unica ovunque (tenda, form Nuovo demolitore, scheda CRM): "**Email assegnazioni pratiche**"
- **Home e scheda pratica: FOTOCOPIA del CRM admin** (rifatta da capo il 07/08 su richiesta di Davide: "deve apparire come in admin, senza i poteri"). Barra azzurra con la ricerca a pillola, fila COMPLETA delle caselle-filtro (In arrivo · fissa il ritiro › Ritiro fissato › Certificato rottamazione › Cancellazione targhe › Completate, più "Non a buon fine" fuori fila: bianca a zero, rossa coi casi). **Riga della lista GEMELLA di quella del CRM**: stesse colonne (veicolo 1.6 con targa · marca · anno · km e il comune sotto, cliente 1.3 con la casistica e la delega, stato 1.4 con la pillola e la ragione sociale sotto), hover celeste, spunta verde per le completate, titolo sempre NERO anche da aperta (in entrambe le aree). ⚠️ Le scadenze dei certificati si CALCOLANO da `data_ritiro_effettuato` (24 ore rottamazione, 15 giorni lavorativi PRA): non hanno colonne nel DB
- **Tendina della pratica** (`TendinaPratica.tsx`): clic sulla riga → si srotola sotto col blocco unico e la cornice blu, IDENTICA al CRM (riclic/Esc chiude, cambiare casella chiude). Fila azioni a pillole sulla coda azzurra della testata, in QUEST'ORDINE: "**Documenti e Foto**" col contatore (apre il visore condiviso) · "**Chat**" con la spia rossa · l'**azione della fase** ("Fissa il ritiro" · "Veicolo ritirato" e "Sposta il ritiro" col motivo obbligatorio · "Carica certificato rottamazione" e "Consegnato a mano" · "Carica cancellazione targhe") · la **pillola "Trattativa Extra · N€"** quando c'è. Le **5 schede gemelle di quelle del CRM** (Cronologia e Note · Cliente · Casistiche · Veicolo · Ritiro), stesse misure, TUTTE ALLA STESSA ALTEZZA, in sola lettura: il "Chiama" va sul DELEGATO quando c'è, la scheda Ritiro ha gli "Originali da consegnare" con le spunte blu. **Precarico all'hover**: dettagli E cronologia si scaricano al passaggio del mouse sulla riga (cache), la tendina si apre già piena senza sobbalzi. Le **nuvolette** della fila vivono in un PORTALE sul body (il sipario dell'animazione non le taglia; su schermi bassi scorrono al loro interno)
- ⭐ **"Fissa il ritiro" e "Sposta il ritiro" = nuvoletta LARGA con la SCENA GLOBALE** (`PickerRitiro`, mockup approvato 08/08): niente campo data coi trattini — GIORNO a pillole (7 giorni, "Oggi" in celeste chiaro, numerino blu dei ritiri già fissati, "Altro giorno…" tratteggiata che srotola il calendarietto SEMPRE a 6 righe fisse, zero sobbalzi) + ORA a pillole mezz'ora per mezz'ora 8-18 (le già prese e le passate sono spente tratteggiate) + colonna "**La tua giornata**" dove il NUOVO ritiro appare al posto giusto con l'etichetta prima di confermare. L'agenda conta pratiche E impegni personali. Riepilogo blu e Conferma si sbloccano solo a scelta completa
- **Visore documenti CONDIVISO** (`app/components/VisoreDocumenti.tsx`): "Documenti e Foto" apre LO STESSO pannello del CRM (scivola da destra, testata azzurra, elenco con miniature, palco ardesia con zoom, PDF sfogliabili, frecce a rotazione, Scarica col PDF unico) in **SOLA LETTURA** (niente Approva/Rifiuta), coi nomi dei documenti col RUOLO della casistica. I pezzi (`ZoomImg`, `PdfZoom`, `nomeAdmin`, `scaricaPdfVoci`) vivono nel componente condiviso e li usa ANCHE il visore admin: i due restano gemelli per sempre. Dati dagli endpoint demolitore (URL sempre rifirmati dal server: il bucket è privato)
- **Cronologia e chat: cloni di quelli del CRM.** La cronologia mostra il canale condiviso (pillola sopra e testo sotto, in ENTRAMBE le cronologie), campo nota in fondo. La **chat si apre a FINESTRELLA** come quella admin; sul canale Cliente i **RAPIDI sono DEL demolitore e li gestisce lui** ("Gestisci" in linea come l'admin, frasi in `messaggi_preimpostati` categoria 'chat_demolitore'; le 4 di partenza le semina l'endpoint, cancellarle tutte le fa tornare). A chat vuota il palco resta pulito
- ⭐ **Pagina "Ritiri"** (`/demolitore/ritiri`, voce in sidebar): l'agenda dei ritiri, SETTIMANA A COLONNE lun-sab (la domenica compare solo se ha voci). Barra pulita (titolo + contatore, bottone "Aggiungi impegno" con l'icona calendario, MAI il segno più); navigazione SUL calendario in PAROLE senza trattini ("Questa settimana", sotto "dal 3 all'8 agosto"; il mese fa da contesto a sinistra; "Torna a oggi" solo se spostati). Colonne con testata (giorno + conteggio a pillolina, oggi con l'anello celeste) e dentro **il FILO della giornata**: card agganciate alla timeline coi pallini (blu = da fare, verde = ritirato con spunta, grigio = personale) e la **pillola di stato** della palette unica. Card = ora, targa · modello, comune; **clic → la pratica** (deep link `/demolitore?apri=<id>`, gemello di quello admin). Le colonne scorrono al loro interno (regge 10-20 ritiri al giorno), la storia resta navigando indietro. **Impegni PERSONALI**: card grigie PERSONALE, aggiunta dalla nuvoletta (picker + "Cosa devi fare?" + "Dove" facoltativo), eliminazione con conferma sulla card; li vede solo lui
- ⭐ **Niente "disconnessioni" tra le pagine**: struttura (sidebar + barra) SEMPRE in piedi, rotellina solo nell'area contenuti e SOLO al primo ingresso; le pagine hanno la cache di sessione (si riparte dai dati già visti, aggiornati in silenzio) e si prefetchano a vicenda
- Fasi del flusso demolitore (`_lib/api.ts`, `gruppoDi` + `CASISTICA_LABEL` condivisa): arrivo · fissato · rottamazione · targhe · completate · annullate. Caselle della home: "In arrivo · fissa il ritiro" › "Ritiro fissato" › "**Attesa Certificato di Rottamazione**" › "**Attesa Certificato cancellazione targhe**" › "Completate" + "Non a buon fine" fuori fila

## 5.4 Backend / API

- **`/api/assegna-pratica`** — algoritmo: `dry_run` (calcola e arricchisce i candidati), `demolitore_id` (assegna quello scelto), `disassegna: true`. Converte sigla→nome provincia.
- **`/api/pratica-stato`** — ricalcola lo stato dai documenti (service role). Autorizzato admin **e cliente proprietario** (il TabDocumenti lo chiama dopo ogni invio, così il banner si aggiorna da solo).
- **`/api/pratica-dati`** — modifica dei dati della pratica: Cliente (nome/telefono/CF), Veicolo (targa/marca/modello/anno/km/cambio/condizioni), Ritiro (indirizzo con autocomplete Google che aggiorna comune/provincia/CAP/lat/lng), Dichiarazioni, Attesa. Campi in whitelist, targa e CF normalizzati maiuscoli. Solo admin, **tranne** i 2 campi delegato che il cliente può modificare pre-assegnazione.
  ⭐ **Sincronizzazione checklist generalizzata**: ogni dichiarazione modificata accende/spegne i documenti della sua condizione nel catalogo (`fermo_si`, `libretto_smarrito`, `targhe_assenti`, `delegato`) e ricalcola lo stato. **Le righe con file caricati non si toccano MAI.**
  ⚠️ **Sola lettura anche per l'admin**: la **casistica** (decide la struttura della pratica) e l'**email**. Il **comune di ritiro** non si tocca mai a mano: si aggiorna SOLO scegliendo l'indirizzo dall'**autocomplete di Google** nella scheda Ritiro del CRM (06/08), che salva il pacchetto completo — indirizzo, comune, provincia, CAP e coordinate — così copertura e assegnazione restano giuste. Testo digitato senza scegliere dal menu = non salvato. Le condizioni dichiarate dal cliente sono modificabili a interruttore. La delega è rifiutata per `non_intestatario` e `targhe_straniere`.
  ⚠️ **Le tendine admin offrono solo ESITI DI VERIFICA**, non le dichiarazioni del cliente: Libretto = "Ha l'originale / Denuncia" (mai "Non ce l'ha"), Fermo = solo Sì/No (mai "Non lo sa"), Targhe = Presenti/Smarrite.
- **`/api/pratica-cdc`** — esito della telefonata sul certificato di proprietà (Cartaceo / Digitale / Smarrito) → aggiorna la pratica e sincronizza la checklist.
- **`/api/pratica-fee`** — Trattativa Extra: imposta o rimuove l'importo concordato.
- **`/api/pratica-annulla`** — annullo (motivo obbligatorio) e riattivazione.
- **`/api/modulo-pdf`** — download dei moduli (Bearer token, cliente proprietario o admin), traccia `scaricato_il`. Tutti i moduli escono **in bianco** e sono scaricabili **subito**.
- **`/api/elimina-pratica`** — eliminazione definitiva (storage + righe collegate + pratica; opzione account cliente).
- **`/api/profilo`** — dati del cliente (service role, ognuno solo la propria riga).
- **`/api/email-cliente`** — l'email vera di login (il browser admin non può leggere `utenti` per RLS).
- **`/api/pulisci-utenti`** — cancella account clienti senza pratiche (mai admin/operatori).
- **`/api/invita-demolitore`** · **`/api/accesso-demolitore`** · **`/api/elimina-demolitore`**
- **Area demolitore** (il ruolo demolitore non tocca MAI il DB direttamente, RLS): `/api/demolitore-pratiche` (il dettaglio RIFIRMA sempre gli URL dei documenti del bucket privato), `/api/demolitore-azioni` (fissa/sposta ritiro — **spostare richiede il motivo, il server rifiuta senza** —, segna ritirata, rottamazione a mano), `/api/demolitore-certificato`, `/api/demolitore-chat`, `/api/demolitore-rapidi` (frasi rapide SUE della chat, semina + gestione), `/api/demolitore-impegni` (impegni personali della pagina Ritiri), `/api/demolitore-note`, `/api/demolitore-profilo`. Auth condivisa in `lib/demolitoreAuth.ts`.
- **`lib/googleMaps.ts`** — carica lo script UNA volta per pagina (autocomplete e mappa convivono senza conflitto).

## 5.5 Verifica PRA ACI — ABBANDONATA per ora

Bloccante: reCAPTCHA su `iservizi.aci.it`. Opzioni future: bookmarklet/estensione Chrome con captcha manuale, oppure Openapi.it Visura Targa PRA (~6€/chiamata).

## 5.6 TabDocumenti — le regole (area cliente)

Il componente più importante dell'area cliente. **Design a WIZARD**: il cliente vede UNA cosa da fare alla volta.

- **Filo logico dall'alto in basso**: striscia "N documenti inviati" (richiudibile, chiusa di default) → card del SOLO documento attivo → coda "Dopo questo" → bottone di pagina.
- **Barra "DOCUMENTO X DI Y"**; i documenti RIFIUTATI passano davanti (card rossa, badge "Da rifare", motivo in testata).
- **Solo foto**: nelle caselle fronte/retro un unico bottone tondo blu "Scatta" (`capture=environment`). Niente doppio input, niente popup intermedi.
- **Modalità "Allega file"** (scansioni/PDF): pillola compatta in FONDO alla card, mai sotto le caselle (suggerirebbe una quantità). Attivata: le caselle spariscono, gli allegati diventano miniature 56px con badge PDF. **Il completamento lo dichiara l'utente** (il sistema non può sapere se un file basta); con le foto invece il conteggio è automatico (fronte+retro).
- **Bottone di pagina contestuale** fuori dalla card, a tutta larghezza: "Vai al prossimo documento" / "Invia l'ultimo documento". Invia in verifica e apre da solo il prossimo.
- **Pannello inviati col FLIP**: righe pulite (nome + pillola + freccetta), tocco → tutto il pannello si gira e mostra quel documento in grande. Le foto del veicolo sono l'ultima riga.
- **Foto del veicolo**: nessun limite e nessuna soglia (1 o 6 foto vanno bene), nessun riquadro-guida con etichette. Con 0 foto appare un banner celeste col PERCHÉ servono (carro attrezzi giusto, niente viaggi a vuoto). Il completamento lo dichiara il cliente con "Ho finito con le foto".
- **Card "Hai fatto tutto"** (blu) quando tutto è inviato: "NoiDemoliamo sta controllando i tuoi documenti, non devi fare altro".
- **Visore a palco scuro**: i file e le foto si aprono a tutto schermo su grigio ardesia, con "‹ Prec. · x di N · Succ. ›".
- **Pannello Impostazioni** (ingranaggio nell'header, scivola da destra): nome ed email in vista; **campo UNICO "Nome e cognome"** (come alla registrazione: tutto in `nome`, `cognome` si svuota), **Telefono per il ritiro** ("il numero che il demolitore userà"), **Cambia email** (link di conferma Supabase, doppioni rifiutati, `utenti.email` si riallinea al login successivo), **Cambia password**, assistenza WhatsApp, Privacy e Termini nella stessa scheda, Esci in fondo. I banner verdi di conferma spariscono da soli (3,5s; 8s per i messaggi lunghi), gli errori restano.
- **Dati**: due query separate (checklist + catalogo) unite in JS — NIENTE join `!inner` PostgREST (manca la FK dichiarata). Signed URL 1h per il bucket privato, riusati per non far lampeggiare le immagini.

## 5.7 Aggiornamento automatico — `lib/aggiornaLive.ts`

Il sistema è **istantaneo su tutto**: nessuna pagina deve richiedere il refresh manuale. Hook condiviso `useAggiornaLive({ canale, tabelle, onCambio, pollingMs, attivo })` con 3 livelli:

1. **TEMPO REALE** — Supabase Realtime (postgres_changes). Le tabelle vanno abilitate alla pubblicazione (già fatto: pratiche, pratica_documenti_checklist, foto_pratiche, messaggi_chat, pratiche_note). Il realtime rispetta le RLS.
2. **RITORNO SULLA PAGINA** — visibilitychange/focus (max una volta ogni 3s).
3. **CONTROLLO PERIODICO** — rete di sicurezza: 60s di default (chat 30s, demolitore 20s), solo a pagina visibile.

**Regole**:
- `onCambio` è SEMPRE una ricarica **silenziosa**: niente spinner, niente sobbalzi, signed URL riusati; le chat confrontano il JSON prima di aggiornare per non far saltare lo scroll.
- Eventi a raffica ("approva tutti") → UNA sola ricarica (debounce 400ms nell'hook).
- **Area demolitore**: niente accesso diretto al DB → hook senza tabelle (solo livelli 2+3). Va in pausa (`attivo: false`) mentre un form è aperto, per non sovrascrivere ciò che si scrive.
- ⭐ **Ogni nuova pagina con dati condivisi deve usare questo hook**, e le sue nuove tabelle vanno aggiunte alla pubblicazione realtime nella stessa SQL di creazione.

---

# 🎨 PARTE 6 — DESIGN SYSTEM (com'è il sito OGGI)

> Questa parte descrive **come deve essere il sito adesso**. Tutto ciò che è scritto qui è approvato da Davide ed è lo stato attuale: quando qualcosa cambia, si RISCRIVE qui, non si aggiunge sotto.

## 6.1 Tipografia — REGOLA FISSA

- **Font: quello di sistema** (Tailwind sans), su TUTTE le pagine. **NESSUN font custom.** Inter è stato provato e bocciato: pagine con font diversi tra loro non piacciono.
- **Titoli pagina**: `text-xl font-semibold text-gray-900` / `text-lg font-bold` (dashboard)
- **Body** `text-sm text-gray-700` · **Caption** `text-xs text-gray-500` · **Micro** `text-[10px]`/`text-[11px]`
- ⭐ **Grassetti: massimo 700.** I pesi 800 "urlano" e sono bocciati. I titoli delle card sono 14/700, i sottotitoli 11 grigi, i testi secondari 600.
- ⚠️ **REGOLA MOBILE CRITICA**: ogni input e textarea deve essere `text-base` (**16px**) + `text-gray-900` + `placeholder:text-gray-400`. Sotto i 16px Safari zooma al tocco. Vale ANCHE nei campi piccoli e nelle chat (su PC si può scendere a 13,5px, su telefono mai).

## 6.2 Colori — AREA CLIENTE

- **Sfondo su PC**: lavanda `linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)` con card bianca `rounded-3xl shadow-lg` centrata `max-w-md`
- ⭐ **Su MOBILE: app a tutto schermo (full-bleed)** — niente cornice lavanda: bianco fino ai bordi e header blu in cima che si fonde con la cornice del browser. Vale per home cliente, pagina pratica e `/inizia`. Su PC resta la card centrata (`sm:`)
- **Header/banner blu**: `linear-gradient(90deg, #1d4ed8, #2563eb)`, bottone bianco/85 di navigazione a sinistra, eyebrow uppercase `text-blue-100`, badge stato a destra, **logo vero** (mai la "N" in un tondino)
- **Blu primario** (CTA, link): `bg-blue-600` hover `bg-blue-700` / `#2563eb`
- **Theme color mobile**: `#1d4ed8` (header blu) — il sito è dichiarato **SOLO CHIARO**: il tema scuro del telefono non deve annerire nulla
- **Riquadri informativi**: celeste `#EFF6FF` / bordo `#DBEAFE`. **Mai blu pieno**: quello è del banner
- **Blu navy `#0d2144`**: solo per accenti scuri (box "Da portare al ritiro")

## 6.3 Colori — AREA ADMIN (CRM) e AREA DEMOLITORE

- **Sfondo pagina**: **grigio chiaro `#ECEEF2`** (il lilla/lavanda è stato tolto: "non inerente a NoiDemoliamo")
- **Sidebar**: **blu in dissolvenza** `linear-gradient(180deg,#2563eb 0%,#2563eb 65%,#7CA4F2 100%)`, testi bianchi, **logo vero** in testa
- **Barre in alto** ("Pratiche" / "Demolitori"): **azzurre `#EFF6FF`** con bordo sotto `#DBEAFE` e ricerca a pillola bianca col bordo celeste
- ⭐ **UN SOLO AZZURRO `#EFF6FF`**: barra in alto, riga al passaggio del mouse (bordo `#BFDBFE`), riga aperta, testata della tendina, testata dei pannelli. Barra, hover e apertura parlano lo stesso colore
- **Palco del visore documenti**: grigio ardesia `#5D6A7E`
- **Riquadro metrica urgente** nelle liste a card: `#FCEBEB` / `#A32D2D`
- **Poche decorazioni**: il colore si usa SOLO dove significa qualcosa
- ⭐ **AREE DI LAVORO AD ALTEZZA SCHERMO** (06/08, admin e demolitore): la finestra del browser non scorre MAI, scorre solo la colonna dei contenuti sotto la barra azzurra (che arriva intera fino al bordo). La riserva globale dello spazio-barra si spegne lì (classe `area-lavoro` accesa dalle sidebar + foglietto di stile iniettato dai layout `app/admin/layout.tsx` e `app/demolitore/layout.tsx` all'istante zero, per non far lampeggiare la striscia al refresh). Gli scorrimenti interni (liste, chat, pannelli) usano il **bastoncino sottile e stondato** (`#C2CAD6`, hover `#A8B2C1`, regole in globals.css). Ogni NUOVA pagina delle due aree deve seguire questo schema: `h-screen overflow-hidden` sul main e `overflow-auto flex-1 min-h-0` sulla colonna dei contenuti

### Tipografia dei dati nell'admin (bilanciamento approvato)
- **Titoli sezione**: `#1E293B` bold uppercase 12px, con iconcina 28px `#DBEAFE`
- **Etichette dato**: `#5B6779` bold uppercase 10.5px
- **Valori**: `#3E4C63` semibold — **MAI nero pieno** (il nero "spara")
- **Dato in lettura**: riquadro `#F6F8FB`, bordo `#E5E9F0`, radius 10
- **Righe delle card lista**: titolo `#111827` bold 15px, sottotitolo `#4B5563`

## 6.4 PALETTE DELLE PILLOLE DI STATO (unica, admin e cliente)

Questa palette vale ovunque: lista CRM, tendina, home cliente, header pratica. Niente arcobaleno, niente giallo senape.

| Significato | Sfondo / Testo |
|---|---|
| **Flusso** (tutti gli stati in corso: in attesa documenti, in verifica, assegnata, ritirata…) | `#EFF6FF` / `#1D4ED8` |
| **Completata** (unico verde) | `#DCF3E4` / `#1F7A43` |
| **Anomalie e Annullata** (· da rifare, · a mano, annullata) | `#F3D9D9` / `#A94444` |
| **In attesa / pausa** | `#E8ECF3` / `#5B6779` |
| **Da contattare** (in riga) | `#FBDADA` / `#9B1C1C` |

- Le pillole iniziano sempre col nome della fase e dopo il "·" tengono il dettaglio ("Assegnata · ritiro fissato", "Ritirata · Attesa PRA")
- Sulla riga azzurra (hover o aperta) la pillola diventa **bianca col bordino del suo colore**, mai mimetizzata
- Costanti: `PILL_FLUSSO` / `PILL_ROSSO_TENUE`; tabelle `lib/statiCliente.ts` (cliente) e `lib/statiCrm.ts` (admin). **Uno stato nuovo si aggiunge LÌ**, non nelle pagine

**Pillole della cronologia**: azzurro `#DBEAFE`/`#1D4ED8` per Nota, Demolitore, Ripresa e Riattivata · grigio spento per In attesa e Creata · rosso tenue `#F3D9D9`/`#A94444` per Annullata. La pillola dice il tipo e **il testo non lo ripete**: resta solo il motivo.
**Pillole delle condizioni dichiarate** (cliente): verde `#EAF3DE`/`#27500A`.

## 6.5 Colori semantici (banner e messaggi)

⭐ **Solo 3 colori semantici**, mai un colore per stato:
- **Blu** = tutto ciò che è in corso (ritiro fissato, ritirata, attesa PRA)
- **Verde** = solo i traguardi (documenti approvati, completata) — `#16A34A` per i bottoni di invio
- **Rosso** = serve un'azione ("da rifare")
- Grigio per pausa e annullo

**Rossi, tre livelli:**
- **Rosso morbido `#E15E5E`** (hover `#D25151`): bottoni distruttivi (rifiuta, annulla, elimina)
- **Rosso spento `#A94444`**: scritte e link di rifiuto/rimozione
- **Rosso vivo**: SOLO le spie (pallini contatore, badge "rifiutato")

**Verde**: è dei traguardi. Nei bottoni il verde è bocciato (anche "Approva" è azzurro), e le spunte del percorso cliente sono **azzurre** (cerchietto `#DBEAFE`, spunta blu, filo celeste).

## 6.6 La FAMIGLIA DELLE CARD (vale in tutta l'app, cliente e admin)

Una sola famiglia di card ovunque:
- Bordo `1.5px solid #E5E7EB`, angoli 14-16, ombra morbida `0 1px 3px rgba(16,24,40,0.07)` (costante `STILE_CARD`)
- **Testata**: quadratino icona azzurro `#DBEAFE` 38-46px con icona SVG blu `#2563eb` + titolo 14/700 + sottotitolo 11 grigio
- **Contatori**: pillolina azzurra
- **Righe dati**: **etichetta scura in evidenza a sinistra, valore grigio leggero a destra** (componente `Riga`). I valori non sono mai in nero pieno (`#3E4C63` semibold): il nero "spara"
- **Campi in stile /inizia**: sfondo `#F9FAFB`, bordo `1.5px #E5E7EB`, radius 14, padding 14, quadratino icona 40px a sinistra, titolo `600` `#111827` protagonista, sottotitolo `12px #6B7280`
- **Variante errore/rifiutato**: sfondo `#FEF6F6`, bordo `#F3C8C8`, tile `#FBDADA`, testo `#C0392B`
- **Liste = CARD, non tabelle** (pratiche e demolitori): quadratino icona 46px, titolo bold 15px protagonista, divisori verticali `#EEF1F5`, riquadro metrica a destra
- **Titoli card admin**: barretta blu verticale a sinistra + testo bold `#0F1B33` (componente `TitoloCard`)
- **Pagine "profilo"**: testata blu gradiente `linear-gradient(120deg,#1d4ed8,#2563eb,#3b82f6)` con iniziali e statistiche "in vetro" `rgba(255,255,255,0.14)`
- **Form input**: `border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white`
- **Tab bar a pillole**: container `#EFF3F9` rounded-2xl p-1; attiva `#2563eb` bianca, inattive trasparenti `#5F6C7E`; badge rosso contatore attaccato all'icona

## 6.7 MOVIMENTO — "niente scatti, niente sobbalzi"

I sobbalzi sono bug, non dettagli.
- **Aperture e chiusure morbide**: grid `0fr ↔ 1fr` (mai display none). Il contenuto resta montato mentre si riavvolge
- ⭐ **I pannelli entrano ed escono DA DESTRA** (documenti, assegnazione, copertura, impostazioni, chat): scivolano dentro e riscivolano fuori prima di smontarsi, 220-240ms. Vale anche per ✕, Esc, clic fuori e riclic sulla pillola (che fa da interruttore)
- **`scrollbar-gutter: stable` globale**: lo spazio della barra di Windows è sempre riservato, così le aperture non fanno slittare la pagina
- **Rotellina a schermo pieno SOLO al primo caricamento**: upload, invii ed eliminazioni aggiornano in silenzio
- **Niente lampi**: stati "non so ancora" = non mostrare nulla (né avvisi né "Nessun messaggio" prima del caricamento). Cambiando pagina admin restano sidebar e struttura
- **Modifica sul posto senza sobbalzi**: campo con solo **filo blu** sotto (niente cornice), zona valore/campo ad altezza fissa con dissolvenza, bottoni a larghezza riservata
- **Pagina bloccata col visore aperto**: `body.overflow=hidden` + `overscroll-behavior: contain` sugli elenchi

## 6.8 REGOLE D'ORO

1. **Mobile-first**: touch-friendly (min 44px)
2. **NIENTE EMOJI nell'interfaccia**: solo icone SVG feather-style (stroke ~1.7-1.9). Nemmeno le frecce testuali ←/→ nell'admin. ⭐ 29/07: il tasto indietro nei banner blu del cliente è un **TONDO traslucido** `rgba(255,255,255,0.18)` 38px con la sola freccia sottile (via le pillastrelle "← Indietro"/"← Pratiche"; il chevron ‹ resta bocciato). Con lo stesso giro è sparita la riga logo "NoiDemoliamo" sotto il banner di /inizia: il brand è il banner
3. **Coerenza dei colori semantici** (6.5) e **una palette sola** per le pillole (6.4)
4. **Personalizzazione per tipo veicolo ovunque** + generi corretti. Le icone veicolo stanno in UN componente condiviso (`app/components/IconaVeicolo.tsx`): cliente e CRM parlano la stessa lingua
5. **Stato sempre visibile** · empty state amichevoli con SVG
6. **Input 16px** sempre (anti-zoom iOS)
7. **Bottoni `/inizia` mai disabilitati**: validazione al click
8. **Una sola cosa per pagina** nei mini-step
9. **Un solo box di stato per schermata**: se il banner in alto lo dice già, niente riquadro sotto che lo ripete
10. **NO scrollIntoView automatico** sugli input (su iPhone la schermata sobbalza quando si apre la tastiera)
11. ⭐ **Niente trattini "—" in NESSUN testo visibile all'utente** (titoli, bottoni, descrizioni, banner, avvisi): non sono professionali. Al loro posto due punti, parentesi o virgole. Unica eccezione: "—" come segnaposto di un valore vuoto
12. **Niente gergo tecnico o burocratico** nei testi utente (mai parole come "tab")
13. **Rassicurare sui dati sensibili**: ogni campo telefono spiega a cosa serve
14. **Possessivi nei label** quando serve distinguere le persone
15. **La pagina finale è una guida, non un modulo**
16. **Niente grandi bottoni rettangolari** dove basta un'azione compatta: bollini circolari, righe compatte, pillole
17. **I nomi dei documenti sono i protagonisti visivi** delle card
18. **Niente popup intermedi** per scattare o caricare: i bottoni aprono direttamente fotocamera o file picker
19. **Azioni distruttive sempre con conferma**, e solo negli stati in cui il cliente può modificare. La ✕ di eliminazione è un tondino **scuro trasparente** `rgba(15,23,42,0.55)` sull'angolo della foto (`XElimina`), e la conferma appare **sulla foto stessa** o in riga (`ConfermaSullaFoto`, `ConfermaInRiga`)
20. ⭐ **Niente modali a schermo intero**: si usano **nuvolette ancorate** al bottone (col becco, clic fuori chiude) e **conferme in linea** o sulla foto stessa. Vale per rifiuto, eliminazione, stato pratica, trattativa
21. **Avvisi informativi = scheda BLU** (quadratino azzurro + titoletto + testo), non gialla: il giallo è da allarme
22. **Gamification dove possibile** (le foto: "Ottimo inizio!", incentivo a caricarne 4)
23. ⭐ **Bottoni di pagina = PILLOLA OVALE, classe unica `.btn-pagina`** (globals.css, 29/07): gradiente dell'header + ombra morbida. Varianti: `--spento` (grigio ma CLICCABILE, per la regola 7), `:disabled` (spento vero), `--auto` (larghezza naturale). Ogni nuovo CTA usa questa classe; anche i bottoni piccoli (Annulla/Elimina, secondari) sono a pillola
24. ⭐ **Mai promettere TEMPI al cliente** ("entro 3 ore" bocciato il 29/07): si dice "ti faremo sapere a breve" e basta
25. **Un solo invito per volta sullo schermo**: l'invito foto vive sotto il banner SOLO in "Documenti in verifica" con zero foto, e MAI sulla tab Documenti (lì parla il suo banner). Appena arriva una foto, spariscono entrambi
26. **WhatsApp si fa da parte**: il bottone fisso sparisce mentre si scrive (campo a fuoco), sparisce quando SCORRI IN GIÙ e ricompare quando risali (i bottoni blu a fondo pagina restano liberi), e non esiste sulla tab Chat (lì si parla già con NoiDemoliamo)
27. ⭐ **Campo di MODIFICA del cliente = pillola in veste "a fuoco"** (bordo blu 1.5px + alone azzurro `rgba(37,99,235,0.12)`): il campo esiste solo mentre si modifica, quindi è sempre "attivo". La riga in modifica è una **colonna ordinata**: etichetta → campo largo → spiegazione → Annulla/Salva a pillola in basso a destra (Salva col gradiente). Applicato alle Impostazioni e al delegato nella tab Stato
28. **La capsula con l'indirizzo che Safari mostra sopra la tastiera NON è rimovibile** (è del browser): si migliora col dominio corto noidemoliamo.it e si risolve con la futura PWA

## 6.9 Regola MODIFICA A TASTO (ogni form, admin e cliente)

- Di default tutto in **sola lettura**: cliccare sui campi non modifica nulla
- Bottone **Modifica** (matita) → i campi diventano editabili, tutti identici
- **"Salva" appare o si attiva SOLO se qualcosa è davvero cambiato**, con avviso "Modifiche non salvate" e Annulla che ripristina
- Nel CRM la matita è **per sezione** (Cliente, Casistiche, Veicolo, Ritiro)
- Chiudere un pannello senza salvare = modifiche scartate
- Nelle tendine niente opzioni "—": si mostra "Scegli…" disabilitato
- ⚠️ **Lezione tecnica**: MAI definire un sotto-componente con dentro un input **dentro** un altro componente — si rimonta a ogni render e il campo perde il focus. Usare funzioni chiamate direttamente.

## 6.10 Come si decide un cambio di design

1. Davide vuole **SEMPRE vedere prima un mockup** con varianti (A/B/C) e sceglie lui
2. I mockup si guardano a indirizzo fisso: **`localhost:3000/mockup.html`** (file `public/mockup.html`, in .gitignore, mai in deploy). Davide ha il segnalibro: gli basta ricaricare
3. Solo dopo la scelta si implementa sul vero
4. ⚠️ **Eccezione: l'AREA DEMOLITORE non si progetta a mockup.** Dopo 3 redesign bocciati, il metodo è: Davide **detta un pezzo alla volta**, Claude mette SOLO quel pezzo e si ferma per il giudizio. Niente assemblaggi autonomi. Layout di riferimento: il CRM admin

## 6.11 Cose PROVATE E BOCCIATE (non riproporle)

- **"Consegna a mano" dei documenti** (l'opzione "non carico, consegno la fotocopia al ritiro"): costruita end-to-end e rimossa, creava confusione e si discostava dalla logica casistiche. Non riproporla senza ripensarla da zero con Davide
- **Autocompilazione dei moduli PDF**: escono tutti in bianco (vedi 8.1)
- Font Inter · sfondo lilla nell'admin · verde nei bottoni · giallo ambra negli avvisi informativi · grassetti 800 · chevron "‹" al posto di "← Pratiche" · riquadri-guida con etichette per le foto · console di debug nascosta sul telefono · assegnazione manuale su mappa (si usa la lista)

---

# 🗣️ PARTE 7 — COMUNICAZIONE CON DAVIDE

> Davide è imprenditore, NON sviluppatore. Lavora con l'AI per costruire la piattaforma.

## 7.1 Regole per Claude Code

1. ⭐ **REGOLA FONDAMENTALE**: prima di modificare file o eseguire comandi, SEMPRE proporre la modifica in linguaggio semplice e attendere **conferma esplicita** di Davide. Lui vuole pensarci prima
2. Spiegare cosa si sta per fare **senza gergo tecnico**
3. Per i cambi di design: mockup con varianti PRIMA, implementazione DOPO l'approvazione (vedi 6.10)
4. Un commit per blocco di lavoro sensato, messaggio in italiano chiaro; push su `main` = deploy Vercel
5. Chiedere a Davide di testare prima di chiudere un task
6. **MAI toccare o stampare `.env.local`** e le chiavi
7. SQL su Supabase: Claude lo scrive (in `docs/sql/`), Davide lo incolla nel SQL Editor e conferma l'esito
8. **A fine sessione: proporre di aggiornare QUESTO file** — ma solo con cose **stabili e fondamentali** (flussi, regole, come deve essere il sito), MAI la cronaca estetica di cosa è stato provato
9. `CLAUDE.md` deve solo rimandare qui: la fonte di verità è ARCHITETTURA.md

## 7.2 Stile di comunicazione

- **Istruzioni passo-passo brevissime**: uno step alla volta, "scrivimi fatto"
- **Niente spiegazioni tecniche se non le chiede** — linguaggio semplicissimo, zero gergo
- **Risposte compatte, niente preamboli**
- **Anteprime visive** prima di ogni cambio di design
- Davide non ricorda i percorsi → indicare percorso completo e come aprirlo

## 7.3 Come si testa

1. **Simulatore di Chrome** (F12 → Ctrl+Shift+M → iPhone, "Show device frame"): è il metodo principale, Davide vede ogni modifica all'istante su localhost **senza push**. (Se il simulatore è sotto il 100% i testi sembrano sfocati: è lo zoom, non l'app)
2. **iPhone vero su URL Vercel** dopo il push: è il collaudo finale, le finezze di Safari si vedono solo lì. Davide manda gli **screen** dal telefono con due parole sul problema
3. ⚠️ **MAI testare dal telefono via rete locale sul dev server**: serve JS non transpilato e **blocca Safari iPhone** (pagina visibile, tocchi morti). Se serve il telefono senza push: `npm run build` + `npm run start`
4. Per il collaudo cross-platform serio: LambdaTest o BrowserStack (telefoni veri comandati dal PC)
5. Nello stesso browser vive UNA sessione alla volta: admin in Chrome normale, cliente di prova in incognito

## 7.4 Trappole tecniche note

- **Turbopack in panico** dopo uno spostamento o un clone: fermare il server, `Remove-Item -Recurse -Force .next`, riavviare (la cache conteneva percorsi vecchi)
- **Dopo un `ALTER TABLE`**, errori "column not found" → SQL Editor: `NOTIFY pgrst, 'reload schema';` oppure Settings → Restart project
- **La build di Vercel può fallire in silenzio** per mappe o switch non esaustivi: quando si aggiunge un valore a un tipo, verificare TUTTE le mappe che lo usano
- **Errori React in loop** → riavviare `npm run dev`. Errori TS "fantasma" → Restart TS Server
- **Un trigger che riapre un pannello** (`apriTrigger`) resta "armato" al rimontaggio del componente: farlo partire dal valore del montaggio e reagire solo agli incrementi nuovi
- Segnali VS Code: "M" arancione = da committare, numero rosso PROBLEMS = errori TS

---

# 📋 PARTE 8 — DOVE SIAMO E COSA MANCA

## 8.1 Moduli PDF — sistema chiuso

> Fonte di verità: **`docs/moduli/LEGGIMI.md`** (inventario e stato di ogni modulo).

⭐ **REGOLA: tutti i moduli escono IN BIANCO e sono scaricabili SUBITO.** Niente autocompilazione (nemmeno le deleghe: il generatore resta pronto, ma l'endpoint non passa i dati) e nessun blocco prima della verifica. Il cliente li trova nel box "Da portare al ritiro", li scarica, li compila a penna, li firma e **consegna gli originali al ritiro**. I documenti finiscono alle agenzie pratiche auto dei demolitori per la radiazione.

I 13 moduli:
- **6 deleghe consegna veicolo** (`lib/moduli/delegaConsegna.ts`, varianti privato/eredi/eredi_rinuncia/societa/fallimento/associazione): firmano SOLO delegante e delegato, fotocopie fronte/retro di entrambi allegate
- **Autodichiarazione veicolo fuori uso** (`lib/moduli/dichiarazioneFermo.ts`, 7 varianti con qualifica automatica per casistica): "mezzo fuori uso da demolire" + impegno a fornire l'attestazione + "il debito non si cancella". Niente fotocopia del documento
- **Dichiarazione curatore** (`lib/moduli/dichiarazioneCuratore.ts`)
- **4 dichiarazioni ACI**: si usano i **PDF originali** col logo ACI (eredità, eredità con rinuncia, legale rappresentante che copre anche le associazioni, non intestatario). Scriverci sopra i dati è stato provato e scartato: resa non professionale
  ⭐ **Come funzionano i moduli eredità**: compila e firma **UNA sola persona**, il dichiarante (un erede che ha accettato), che si identifica allegando la fotocopia del SUO documento. Nella versione con rinuncia: **tabella 1 = eredi che hanno ACCETTATO** (chi rinuncia per legge è come se non fosse mai stato erede), **tabella 2 = chi ha rinunciato** con gli estremi dell'atto (Notaio/Tribunale, n. rep/prot, registro successioni). **Chi ha rinunciato NON firma nulla.** Dell'atto di morte basta una copia o fotocopia
- **Dichiarazione Inutilizzabilità Ente Pubblico**: non è un modulo nostro, è la card con la guida a passi (scarica l'autodichiarazione → Comune/Polizia locale → fotografa la dichiarazione rilasciata)

I PDF originali stanno in `docs/moduli/originali/` e viaggiano nel deploy via `outputFileTracingIncludes` (next.config). `.gitattributes` tratta PDF, Word e immagini come BINARI.

⭐ **PDF sul TELEFONO (29/07)**: mai il visore di Safari (zoomava male e apriva schede). I PDF — documenti del cliente E moduli — diventano **pagine-immagine nel palco scuro** con lo zoom col pizzico, via `lib/pdfPagine.ts` (pdfjs; ⚠️ il worker sta in `public/pdf.worker.min.mjs`: se si aggiorna `pdfjs-dist` va ricopiato da node_modules). I **moduli** nel palco hanno in più "**Condividi o stampa**" (menu di condivisione dell'iPhone col file pronto: da lì stampa, salva su File, WhatsApp) e "**Scarica**". Su PC resta il visore nativo del browser.

⭐ **LEGGE 26/01/2026 n. 14** (fermo amministrativo, in vigore dal 20/02/2026): il fermo NON blocca più la radiazione per demolizione (resta escluso solo l'export estero), ma serve l'**attestazione di inutilizzabilità del Comune/Polizia locale**. Il flusso `/inizia` resta identico ("il cliente ce lo portiamo dentro noi").

## 8.2 Il prossimo lavoro

### ▶️ AREA DEMOLITORE — FASE 3
La dashboard demolitore è COMPLETA sul flusso: home e scheda pratica fotocopia del CRM, visore documenti condiviso in sola lettura, chat coi rapidi gestibili, pagina Ritiri (agenda a timeline con gli impegni personali e la scena globale nel fissare i ritiri). **Manca:**
1. **Motore scadenze e notifiche**: campanella in-app, email di sollecito oltre le 8 ore lavorative, promemoria del giorno di ritiro a demolitore e cliente, bottone cliente "Non posso quel giorno" (non bloccante, avvisa demolitore e admin)
2. Rifinire cosa il demolitore NON deve vedere quando nasceranno nuovi stati

Richiede: **Resend attivo** (il dominio noidemoliamo.it è già comprato: va collegato a Vercel e verificato su Resend con SPF/DKIM/DMARC) e un **cron Vercel** per i controlli periodici.

### 📧 EMAIL @NOIDEMOLIAMO.IT (da fare col lavoro Resend)
Oggi le email di sistema (recupero password, inviti demolitori, cambio email) partono dal **servizio di cortesia di Supabase** (`noreply@mail.app.supabase.io`): va bene per le prove ma ha **limiti bassissimi** (poche email all'ora) e non si usa coi clienti veri. Quando si attiva Resend:
1. Creare gli indirizzi del dominio: `noreply@noidemoliamo.it` (mittente automatico) e `info@noidemoliamo.it` (contatti e pagine legali)
2. Agganciare Resend come **SMTP di Supabase** (Authentication → Emails → SMTP Settings): da lì in poi TUTTE le email di sistema partono da noreply@noidemoliamo.it, senza limiti e col nostro nome

### 🔔 SISTEMA NOTIFICHE VERE (email + SMS)
Oggi le comunicazioni al cliente vivono SOLO nel banner della sua area. Servono notifiche attive. Canali v1: **email + campanella in-app** (le push vere solo con la futura PWA).

**Al cliente:** 1. pratica creata (benvenuto e prossimi passi) · 2. documento rifiutato · 3. tutti i documenti approvati · 4. demolitore assegnato ("ti contatterà entro 8 ore lavorative") · 5. riassegnazione (tono sereno) · 6. ritiro confermato + promemoria ORIGINALI da portare · 7. promemoria il giorno prima (SMS) · 8. veicolo ritirato + richiesta recensioni · 9. certificati disponibili
**Al demolitore:** 10. nuova pratica assegnata (a `email_assegnazione`, campo già pronto) · 11. promemoria scadenza 8 ore

Tecnica: Resend per le email, Twilio per gli SMS. Tabelle già progettate in 3.12.

### 🔥 ALTRO IN CODA
- **Sistema recensioni** (vedi 4.9): tabella + stato + pagina cliente bloccante + integrazione nell'algoritmo + push su Google Maps
- **Proforma fattura**: al "ritirata" la pratica entra nel giro fatturazione (da progettare con Davide)
- **Test cross-platform Android** (LambdaTest/BrowserStack): tastiere, scroll, foto, autocomplete. Mai fatto su device reale
- **Pagine legali `/privacy` e `/termini` da rivedere insieme**: quali dati anagrafici di NoiDemoliamo inserire (ragione sociale, P.IVA, sede, email — idealmente info@noidemoliamo.it) e completare i [DA COMPLETARE]
- **Landing vetrina** su noidemoliamo.it
- **PWA**, messaggi preimpostati admin, pagina Polizia Locale veicoli abbandonati
- **Prossimi flussi**: asta demolitori (B), commercianti (C), acquisto NoiDemoliamo, `/vendi-auto` (D), area commercianti, fatturazione, statistiche

### 🟡 DECISIONI ANCORA APERTE
- ~~Caso 7 (non intestatario): avviso di stop~~ **DECISO (01/08, niente da cambiare)**: la denuncia di smarrimento si accetta senza domande nel flusso (chi l'ha fatta si verifica dai documenti caricati, come per tutti); senza libretto né denuncia vale il normale "ti chiamiamo noi" → "Da contattare". Il flusso già si comporta così
- **Denunce di smarrimento Carta d'Identità / Codice Fiscale**: previste dal file casistiche ma assenti dal catalogo DB e dal flusso → decidere se aggiungerle
- **Assegnazione manuale**: il flusso c'è, da testare fino in fondo
- **Test dell'amico** sul flusso `/inizia`: in attesa dell'esito

## 8.3 Problemi noti / cosmetici

- Errore RLS minore in `/inizia` (non blocca)
- Console "1 Issue" generica → da indagare
- Avviso LCP sul logo in `/login` (suggerimento performance, non errore)
- ⚠️ Lo zoom col pizzico nel visore cliente è bloccato dal viewport anti-zoom del flusso: se servirà, controllo di zoom dedicato

## 8.4 ⏰ PROMEMORIA SCADENZE

- 🗓️ **Supabase free tier**: aprire la dashboard ogni 5-6 giorni o il progetto va in pausa. Al lancio: Supabase Pro (~25$/mese)
- 🗓️ **30 OTTOBRE 2026 — Supabase Data API change**: le tabelle create DOPO questa data non saranno esposte automaticamente alla Data API. Servirà un GRANT esplicito dopo ogni CREATE TABLE:
  `GRANT SELECT, INSERT, UPDATE, DELETE ON nome_tabella TO authenticated, anon;` (adattare i permessi) + RLS come sempre.
  Da ricordare per: `recensioni`, `aste`, `offerte_asta`, `notifiche_app`, ecc.

---

# 💡 PARTE 9 — DECISIONI DI BUSINESS E DI PRODOTTO

> Le regole che non stanno nel codice ma decidono come si comporta la piattaforma.

## 9.1 Verso il cliente

- **La velocità è il principio cardine**: se ci mettiamo troppo a rispondere, perdiamo la pratica (tempi in 1.3)
- **Gratuità con la clausola onesta**: gratis per veicoli **sostanzialmente completi**. Se mancano parti importanti o il caso è particolare, lo comunichiamo SUBITO e proponiamo un **contributo**, sempre con accordo esplicito. Mai a sorpresa
- ⭐ **"Prima ti chiamiamo noi"**: quando il cliente non ha libretto/denuncia, non sa che CDC ha o non sa del fermo, non si automatizza nulla. Meglio una telefonata che un cliente bloccato o una pratica sbagliata. **Il cliente non vede nessun avviso**: lo gestisce l'admin da "Da contattare"
- ⭐ **Il cliente NON vede chi è il demolitore** (per ora): frase generica "Il demolitore passa a ritirare il mezzo", nessun nome
- ⭐ **Dopo l'assegnazione comanda solo l'admin**: da "assegnata" in poi il cliente non modifica più nulla (documenti, foto, nome, telefono). Prima dell'assegnazione tutto ciò che cambia si riflette nel CRM
- **Il telefono del profilo aggiorna le pratiche in corso** (è il recapito operativo per il ritiro); il **nome** sulle pratiche resta quello dichiarato (è l'identità sui documenti, lo corregge l'admin)
- **Il delegato è DELLA PRATICA**, non dell'account: pratiche diverse possono avere delegati diversi. Il cliente può modificarlo solo prima dell'assegnazione
- **Il cliente può correggersi da solo** (eliminare foto e file finché la pratica è modificabile): meno chat di supporto per "ho caricato la foto sbagliata"
- ⭐ **Assistenza WhatsApp sempre a un tocco**: pulsante fisso su tutte le pagine cliente (**+39 351 828 0493**), etichetta "Serve aiuto?" ciclica
- **Il ritiro ha una tab sua** (Documenti · Ritiro · Stato · Chat): la tab Documenti serve SOLO a caricare; data fissata e originali da consegnare vivono nella tab Ritiro, col pallino rosso di novità sulla linguetta finché il ritiro non è avvenuto

## 9.2 Operative e workflow

- ⭐ **L'algoritmo suggerisce, l'admin decide**: l'assegnazione automatica calcola la classifica ma assegna solo dopo conferma. L'admin deve poter assegnare sempre anche a mano, anche fuori copertura
- ⭐ **La data del ritiro vale subito**: il cliente non deve confermare (la segretaria del demolitore chiama prima). In futuro solo un "Non posso quel giorno" non bloccante
- ⭐ **L'attesa è una pausa, non uno stato**: congela la pratica sopra il suo stato, alla ripresa torna dov'era. Motivo obbligatorio, solo admin, il cliente non vede mai i motivi
- ⭐ **Fee del demolitore per ZONA con fatturazione automatica** (regola più-specifico-vince, vedi 3.10). La **Trattativa Extra** bypassa ogni tariffa per la singola pratica e finisce in **proforma fattura** così com'è
- **Il ritiro effettivo fa partire la fatturazione**, non il certificato
- **Solo la radiazione PRA completa la pratica**
- **Le annullate dopo l'assegnazione restano attaccate al demolitore**: statistica visibile a lui e all'admin, è un deterrente voluto. Se un demolitore ne accumula troppe in un mese, Davide lo chiama o cambia
- **Eliminazione pratica ≠ eliminazione account**: due azioni distinte e consapevoli, mai orfani, mai admin o operatori
- **Niente gestione contratti nell'interfaccia**: ai contratti pensa Davide, lo stato demolitore è solo Attivo/Non attivo
- **Le foto del veicolo non si approvano**: non sono un documento, servono a scegliere il carro attrezzi. Se una foto non va, glielo si dice in chat
- **Il catalogo documenti è DATI, non codice**: un documento nuovo o una regola nuova = una riga su Supabase, non una modifica al codice
- ⭐ **Il sistema è ISTANTANEO su tutto**: nessuna pagina richiede il refresh manuale, e un'azione non più valida non deve essere possibile da una pagina rimasta vecchia
- **L'admin è un CRM da PC**, non mobile: layout denso, tutto in una pagina, organizzato per priorità d'azione. Nessuna pratica si deve perdere quando saranno decine al giorno
- **Il progetto vive fuori dal cloud sync** (mai OneDrive/Dropbox: incompatibili con git)

---

# 🚀 PARTE 10 — COME LAVORARE IN UNA NUOVA SESSIONE

1. **Leggi tutto questo file**, poi conferma a Davide con un riassunto breve: dove siamo e qual è il prossimo task
2. **Il prossimo lavoro è in 8.2** (area demolitore fase 3 + notifiche). Proponi l'approccio e attendi conferma
3. ⭐ **REGOLA FONDAMENTALE**: prima di modificare o rigenerare codice, SEMPRE proporre e attendere conferma esplicita
4. **Rispetta il design system** (PARTE 6): la famiglia delle card, la palette delle pillole, le regole d'oro, "niente sobbalzi"
5. **Stile di comunicazione** (PARTE 7): passo-passo, linguaggio semplicissimo, zero gergo, mockup prima dei cambi di design
6. **Push**: commit chiari in italiano; push su main = deploy Vercel
7. **Test**: simulatore Chrome durante il lavoro, iPhone vero su Vercel per il collaudo
8. **Non assumere mai nulla**: se non sei sicuro, chiedi
9. **A fine sessione**: aggiorna questo file, ma **solo con cose stabili** (regole, flussi, dati, come deve essere il sito). La cronaca di cosa è stato provato e bocciato non si scrive qui: sta in 6.11 solo se serve a non ripetere un errore

---

# 📞 PARTE 11 — INFO PROGETTO

- **Founder**: Davide Di Viesto
- **Email admin**: ddiviesto@gmail.com
- **WhatsApp assistenza clienti**: +39 351 828 0493
- **GitHub**: ddiviesto/NoiDemoliamo
- **URL live**: https://noi-demoliamo.vercel.app
- **Dominio comprato**: noidemoliamo.it (da collegare a Vercel e verificare su Resend)
- **Supabase**: https://egsufeczoroxqnagzqfq.supabase.co
- **Cartella locale**: `C:\Progetto_NoiDemoliamo` (fuori da OneDrive)
- **Device**: iPhone per i test, PC HP per lo sviluppo

---

**Fine documento.**

