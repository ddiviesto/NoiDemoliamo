-- ============================================================
-- TEMPO REALE (22/07/2026)
-- Abilita gli avvisi istantanei del database (Supabase Realtime)
-- sulle tabelle che le pagine ascoltano: quando una riga cambia,
-- le pagine aperte si aggiornano da sole senza refresh.
-- Ogni blocco ignora l'errore se la tabella è già abilitata.
-- ============================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pratiche;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pratica_documenti_checklist;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE foto_pratiche;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messaggi_chat;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pratiche_note;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE documenti_approvazione;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Controllo finale: elenco delle tabelle abilitate al tempo reale
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
