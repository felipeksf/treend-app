-- Linha de partner_pages usada pela landing /partners.
--
-- A tabela partner_leads exige partner_page_id (NOT NULL, com chave estrangeira
-- para partner_pages). Esta linha representa o cadastro público de parceiros:
-- os envios do formulário da LP ficam vinculados a ela e aparecem em
-- Admin -> Leads.
--
-- O id é fixo de propósito: a LP já o referencia em public/partners/index.html.
-- Se mudar aqui, mude lá também.
--
-- Rode no SQL Editor do Supabase (projeto khbkfcdpgrksrrpocdvb). Idempotente.

insert into public.partner_pages (id, slug, partner_name, partner_article, trial_days, active)
values (
  'f6bcfef1-fe6e-4f30-8fb4-08db465d4fa6',
  'parceiros',
  'Programa de Parceiros',
  'o',              -- artigo usado nos textos gerados pelo app
  7,                -- dias de teste; ajuste se o programa usar outro prazo
  true
)
on conflict (id) do nothing;

-- A LP é estática e grava com a chave anônima, então precisa de permissão de
-- INSERT em partner_leads apenas para esta página. Sem isso o formulário falha
-- silenciosamente para o visitante e nada chega no admin.
alter table public.partner_leads enable row level security;

drop policy if exists "partner_leads: cadastro publico de parceiros" on public.partner_leads;
create policy "partner_leads: cadastro publico de parceiros"
  on public.partner_leads for insert
  to anon, authenticated
  with check (partner_page_id = 'f6bcfef1-fe6e-4f30-8fb4-08db465d4fa6');

grant insert on public.partner_leads to anon, authenticated;

-- Conferência: deve devolver uma linha.
-- select id, slug, partner_name, trial_days, active from public.partner_pages where slug = 'parceiros';
