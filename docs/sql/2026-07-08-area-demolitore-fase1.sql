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

-- 3. Il CHECK su utenti.tipo ammetteva solo cliente/collaboratore/
--    ente_pubblico/admin: si aggiungono i ruoli demolitore e commerciante.
--    (Verificato l'8/07/2026: senza questo l'invito fallisce sul constraint.)
alter table utenti drop constraint if exists utenti_tipo_check;

alter table utenti add constraint utenti_tipo_check
  check (tipo = any (array[
    'cliente'::text,
    'collaboratore'::text,
    'ente_pubblico'::text,
    'admin'::text,
    'demolitore'::text,
    'commerciante'::text
  ]));
