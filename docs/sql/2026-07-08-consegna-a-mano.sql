-- ============================================================
-- DOCUMENTI "CONSEGNA A MANO" (fotocopia consegnata al ritiro)
-- Da eseguire nel SQL Editor di Supabase.
--
-- Il cliente può scegliere di NON caricare un documento (tranne il
-- libretto) e consegnarne la fotocopia al demolitore il giorno del
-- ritiro: la riga checklist prende lo stato 'consegna_a_mano'.
-- ============================================================

alter table pratica_documenti_checklist
  drop constraint if exists pratica_documenti_checklist_stato_check;

alter table pratica_documenti_checklist
  add constraint pratica_documenti_checklist_stato_check
  check (stato in ('da_fare', 'caricato', 'approvato', 'rifiutato', 'consegna_a_mano'));

-- NOTA: se l'ALTER fallisse perché il constraint ha un nome diverso,
-- scoprirlo con:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'pratica_documenti_checklist'::regclass and contype = 'c';
