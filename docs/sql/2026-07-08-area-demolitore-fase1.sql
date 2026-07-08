-- ============================================================
-- AREA DEMOLITORE — FASE 1 (accesso)
-- Da eseguire nel SQL Editor di Supabase (Dashboard → SQL Editor → New query)
-- Sicuro da rieseguire: usa IF NOT EXISTS.
-- ============================================================

-- 1. Collega l'account di login (utenti) alla scheda demolitore.
--    Un utente con tipo='demolitore' punta alla sua riga in demolitori.
alter table utenti
  add column if not exists demolitore_id uuid references demolitori(id) on delete set null;

-- 2. Traccia dell'invito sulla scheda demolitore (mostrata in admin).
alter table demolitori
  add column if not exists invito_inviato_il timestamptz;

-- NOTA: se la tabella utenti ha un CHECK constraint sui valori di "tipo"
-- che non include 'demolitore', l'invito fallirà con un errore di constraint.
-- In quel caso eseguire (adattando il nome del constraint):
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'utenti'::regclass and contype = 'c';
-- e ricreare il constraint includendo 'demolitore'.
