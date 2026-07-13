# Moduli PDF — inventario e lavorazione

> Cartella di lavoro per i 13 moduli PDF delle casistiche.
> I file ORIGINALI di Davide (PDF ACI, Word vuoti) vanno nella sottocartella `originali/`.
> Da lì si lavora UN MODULO ALLA VOLTA: testo approvato da Davide → PDF auto-compilato dal sistema → anteprima di prova → attivazione.

## Come si lavora (deciso il 10/07/2026)

1. Davide copia i suoi file in `docs/moduli/originali/` (qualsiasi formato: PDF, Word)
2. Per ogni modulo si decide: **si usa il PDF così com'è** (il sistema ci scrive sopra i dati) oppure **si rifà da zero** (testo proposto da Claude, corretto e approvato da Davide)
3. Prima di attivare: **anteprima compilata con dati di prova**, controllata da Davide
4. Il cliente NON carica il modulo firmato: lo **scarica già compilato** dal box verde "Documenti originali da portare al ritiro", lo firma e lo consegna in originale al ritiro. Il demolitore lo vede nel suo box "Da farti consegnare"
5. Ogni modifica ai testi passa da qui: file versionati su GitHub, storia completa

## Inventario dei 13 moduli

Compila la colonna "Ce l'ho?": `PDF` (pronto), `WORD` (vuoto, da rifare insieme), `NO` (da creare da zero).

> ⭐ INVENTARIO VERIFICATO IL 10/07/2026 (rassegna Claude + Davide sui file in `originali/`)
> ⚠️ 10/07: la sostituzione con le versioni ACI 2026 è stata ANNULLATA — ACI le ha ripubblicate con
> un'impaginazione pessima (righe storte, firme che scivolano in seconda pagina). In `originali/`
> ci sono di nuovo i file di Davide (impaginati bene); le versioni 2026 + la rev. 06/22 stanno in
> `originali/versioni-aci-2026/` SOLO come riferimento per le informative GDPR.
> LEZIONE: prima di adottare un PDF va controllata anche la RESA GRAFICA, non solo il contenuto.
> I file vuoti (6 deleghe 0 byte + fermo senza testo) restano rimossi.

### Deleghe consegna veicolo (solo se c'è un delegato)

| # | Modulo | Casistica | Ce l'ho? | Stato |
|---|--------|-----------|----------|-------|
| 1 | DELEGA_CONSEGNA_VEICOLO_PRIVATO | Persona fisica | ⭐ CREATA: testo approvato da Davide il 10/07, generatore in `lib/moduli/delegaConsegna.ts`, anteprima in `anteprime/` | ✅ APPROVATA (autodemolitore in bianco, da scrivere a penna) |
| 2 | DELEGA_CONSEGNA_VEICOLO_EREDI | Eredi (accettata) | NO (docx 0 byte, vuoto) | da creare da zero |
| 3 | DELEGA_CONSEGNA_VEICOLO_EREDI_RINUNCIA | Eredi con rinuncia | NO (docx 0 byte, vuoto) | da creare da zero |
| 4 | DELEGA_CONSEGNA_VEICOLO_SOCIETA_AZIENDA | Società | NO (docx 0 byte, vuoto) | da creare da zero |
| 5 | DELEGA_CONSEGNA_VEICOLO_FALLIMENTO | Società fallita (firma il curatore) | NO (docx 0 byte, vuoto) | da creare da zero |
| 6 | DELEGA_CONSEGNA_VEICOLO_ASSOCIAZIONE | Associazione (firma il presidente) | NO (docx 0 byte, vuoto) | da creare da zero |

Nota: `MODELLO_DELEGA_PRESENTAZIONE_FORMALITÀ.pdf` (ACI, GDPR aggiornata) è un'ALTRA cosa: delega a
presentare la pratica all'Unità Territoriale ACI/PRA — utile come riferimento di stile e forse al
demolitore per il PRA, ma NON è la delega alla consegna del mezzo. Le 6 deleghe sono documenti
NoiDemoliamo da scrivere (useremo il modello ACI come guida di impostazione).

### Dichiarazioni sostitutive di casistica (sempre presenti per quel caso)

| # | Modulo | Casistica | Ce l'ho? | Stato |
|---|--------|-----------|----------|-------|
| 7 | DICHIARAZIONE_SOSTITUTIVA_EREDITA | Eredi (accettata) | PDF ACI di Davide (GDPR ok, tabella eredi, layout pulito) | pronto, da rendere compilabile |
| 8 | DICHIARAZIONE_SOSTITUTIVA_EREDITA_RINUNCIA | Eredi con rinuncia | PDF ACI di Davide (GDPR ok, 2 tabelle, layout pulito) | pronto, da rendere compilabile |
| 9 | DICHIARAZIONE_SOSTITUTIVA_LEGALE_RAPPRESENTANTE | Società | PDF ACI di Davide (layout pulito, ⚠️ informativa 2003; la versione GDPR 2026 è impaginata male) | DA DECIDERE: tenere questa, o rifarla noi in bella copia col generatore + informativa GDPR |
| 10 | DICHIARAZIONE_SOSTITUTIVA_CURATORE_FALLIMENTARE | Società fallita | PDF+Word FATTI DA DAVIDE sul modello ACI (informativa GDPR ok) | da rivedere insieme (wording "curatore/liquidatore giudiziale") |
| 11 | DICHIARAZIONE_SOSTITUTIVA_PRESIDENTE_ASSOCIAZIONE | Associazione | ⭐ DECISO (10/07): si riusa il modulo #9 (dice "società/associazione") | coperto dal #9 |
| 12 | DICHIARAZIONE_SOSTITUTIVA_RADIAZIONE_PROPRIETARIO_NON_INTESTATARIO | Non intestatario | PDF ACI di Davide (layout pulito, ⚠️ informativa 2003; rev. 06/22 GDPR in `versioni-aci-2026/` da valutare a vista) | DA DECIDERE come il #9 |

### Integrazione fermo amministrativo (trasversale ai casi 1–7)

| # | Modulo | Casistica | Ce l'ho? | Stato |
|---|--------|-----------|----------|-------|
| 13 | DICHIARAZIONE_SOSTITUTIVA_STATO_VEICOLO_CON_FERMO_AMMINISTRATIVO | Tutte tranne targhe straniere — intestata automaticamente al firmatario della casistica | NO (il Word è vuoto: solo stili, nessun testo) | da creare da zero, insieme (contenuto delicato: stato veicolo + consapevolezza che il debito resta) |

## Dati che il sistema compila da solo

Targa, marca/modello, dati veicolo, nome e CF del richiedente, nome e telefono del delegato, date.
⚠️ NON abbiamo nel sistema: nomi degli eredi, numero carta d'identità del delegato → nei PDF resteranno righe da completare a penna.

## Nota tecnica (per la lavorazione)

- I documenti template nel catalogo (`casistiche_documenti` con `template_pdf`) oggi hanno `richiede_upload = true`: prima dell'attivazione va portato a `false` (SQL da passare a Davide) — il modulo si scarica e si consegna, NON si carica.
- Download tracciato in `pratica_documenti_checklist.scaricato_il`.
