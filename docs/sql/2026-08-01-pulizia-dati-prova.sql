-- ============================================================
-- PULIZIA COMPLETA DEI DATI DI PROVA (01/08/2026)
--
-- Cancella TUTTE le pratiche di prova con tutto ciò che è
-- collegato (documenti, foto, chat, cronologia) e TUTTI gli
-- account clienti di prova. I file nei bucket si svuotano a
-- mano dalla dashboard (vedi punto 4).
--
-- NON tocca:
--   - l'account admin (ddiviesto@gmail.com)
--   - i demolitori (schede, copertura, tariffe, note e login)
--   - le anagrafiche comuni/province/regioni e le impostazioni
--   - i GeoJSON della mappa (bucket geojson-comuni)
--
-- ⚠️ IRREVERSIBILE. Da incollare nel SQL Editor di Supabase.
-- ============================================================

-- 1) Dati collegati alle pratiche
delete from pratica_documenti_checklist;
delete from documenti_approvazione;
delete from documenti;
delete from foto_pratiche;
delete from messaggi_chat;
delete from messaggi;
delete from pratiche_note;
delete from solleciti;
delete from notifiche;
delete from interessi_commercianti;
delete from fatture;

-- 2) Vendite di prova (flusso D)
delete from veicoli_vendita_foto;
delete from veicoli_vendita;

-- 3) Le pratiche
delete from pratiche;

-- 4) I file caricati NON si possono cancellare da qui (Supabase li
--    protegge): si svuotano A MANO dalla dashboard, sezione Storage →
--    bucket foto-pratiche e documenti-pratiche → seleziona tutte le
--    cartelle → Delete. Il controllo in fondo dice quanti file restano.

-- 5) I profili dei clienti di prova
delete from utenti where tipo = 'cliente';

-- 6) I login: tutti tranne l'admin e chi ha ancora un profilo
--    (i demolitori restano perché la loro riga in utenti esiste ancora;
--    spariscono anche gli account "orfani" rimasti dalle prove vecchie)
delete from auth.users
where email <> 'ddiviesto@gmail.com'
  and id not in (select id from utenti);

-- Controllo finale: quante righe restano dove
select 'pratiche' as tabella, count(*) as righe from pratiche
union all select 'utenti', count(*) from utenti
union all select 'account login', count(*) from auth.users
union all select 'file nei bucket pratiche', count(*) from storage.objects where bucket_id in ('foto-pratiche', 'documenti-pratiche');
