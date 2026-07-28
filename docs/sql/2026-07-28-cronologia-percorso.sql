-- ============================================================
-- CRONOLOGIA A DUE CANALI + PERCORSO COMPLETO (28/07/2026)
--
-- La tabella pratiche_note diventa il REGISTRO unico della pratica:
--   · note manuali (admin private, oppure nel canale col demolitore)
--   · EVENTI automatici (documenti, stato, assegnazione, ritiro, certificati)
--
-- Colonne nuove:
--   evento               codice dell'evento automatico (null = nota manuale)
--                        es: 'stato', 'doc_rifiutato', 'doc_approvati',
--                            'assegnata', 'riassegnata', 'ritiro_fissato',
--                            'ritiro_spostato', 'ritirata',
--                            'cert_rottamazione', 'cert_pra', 'trattativa'
--   visibile_demolitore  true = la voce appartiene al canale condiviso
--                        col demolitore (lui la vede nella sua area)
--   demolitore_id        A QUALE demolitore appartiene la voce condivisa:
--                        dopo una riassegnazione il nuovo demolitore NON
--                        vede le voci del precedente (restano solo all'admin)
--
-- RLS: NESSUN cambio. L'admin ha già pieno accesso; il demolitore non
-- legge mai la tabella direttamente, passa dagli endpoint server
-- (/api/demolitore-note) che filtrano per demolitore_id + visibilità.
-- ============================================================

alter table pratiche_note add column if not exists evento text;
alter table pratiche_note add column if not exists visibile_demolitore boolean not null default false;
alter table pratiche_note add column if not exists demolitore_id uuid references demolitori(id) on delete set null;

-- Le note scritte finora dal demolitore diventano voci del canale condiviso
-- (senza demolitore_id: gli endpoint le mostrano solo finché la pratica
-- resta al demolitore che le ha scritte — vale solo per i dati di prova)
update pratiche_note set visibile_demolitore = true where autore = 'demolitore' and visibile_demolitore = false;

-- Ricarica lo schema della Data API
notify pgrst, 'reload schema';
