-- ============================================================
-- AREA DEMOLITORE — FASE 2 (dashboard pratiche)
-- Da eseguire nel SQL Editor di Supabase.
-- Sicuro da rieseguire: usa IF NOT EXISTS.
-- ============================================================

-- File dei certificati caricati dal demolitore (path nel bucket
-- privato documenti-pratiche) + spunta "consegnato a mano al ritiro"
-- per il certificato di rottamazione (regola: la pratica si completa
-- comunque SOLO con il certificato di radiazione PRA).
alter table pratiche add column if not exists cert_rottamazione_url text;
alter table pratiche add column if not exists cert_pra_url text;
alter table pratiche add column if not exists cert_rottamazione_a_mano boolean default false;
