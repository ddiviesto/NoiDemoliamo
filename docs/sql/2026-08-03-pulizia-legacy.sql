-- ============================================================
-- PULIZIA DEI PEZZI LEGACY (03/08/2026)
--
-- Via i resti della prima versione, sostituiti dal sistema
-- casistiche e dalla checklist documenti:
--   1. Colonne pratiche.ruolo_richiedente e pratiche.eredita
--      (nessuna pagina le legge o le scrive più)
--   2. Tabelle documenti e documenti_approvazione (vecchio
--      sistema documenti; vuote dopo la pulizia dei dati di
--      prova, nessuna pagina le usa più)
--
-- ⚠️ IRREVERSIBILE. Da incollare nel SQL Editor di Supabase.
-- ============================================================

-- 1) Le due colonne vecchie della tabella pratiche
alter table pratiche drop column if exists ruolo_richiedente;
alter table pratiche drop column if exists eredita;

-- 2) Le due tabelle del vecchio sistema documenti
--    (prima quella delle approvazioni, che punta all'altra)
drop table if exists documenti_approvazione;
drop table if exists documenti;

-- 3) Avvisa il motore delle API che lo schema è cambiato
--    (senza, per qualche minuto potrebbero comparire errori
--    "column not found" sulle pagine)
notify pgrst, 'reload schema';

-- Controllo finale: le due colonne e le due tabelle non devono più esistere
select
  (select count(*) from information_schema.columns
    where table_name = 'pratiche' and column_name in ('ruolo_richiedente', 'eredita')) as colonne_rimaste,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('documenti', 'documenti_approvazione')) as tabelle_rimaste;
