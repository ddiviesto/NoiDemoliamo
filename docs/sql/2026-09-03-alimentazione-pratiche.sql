-- 03/09/2026 · L'alimentazione si chiede anche in demolizione, dentro il
-- passo "Informazioni sul veicolo" (prima c'era solo in veicoli_vendita).
-- Valori: benzina · diesel · gpl · metano · ibrida · elettrica
-- Da lanciare nell'SQL Editor di Supabase.

alter table pratiche add column if not exists alimentazione text;
