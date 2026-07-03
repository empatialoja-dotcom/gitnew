-- ============================================================
-- Barba Negra — Schema do módulo de Produtos (loja)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (Project →
-- SQL Editor → New query → cola tudo → Run). Aditivo: não mexe em
-- nenhuma tabela/política/função do supabase/schema.sql já em uso
-- pelo agendamento. Depois de rodar, veja o passo 5 de
-- supabase/SETUP.md.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Tabela
-- ============================================================

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10, 2) not null check (preco >= 0),
  descricao text not null default '',
  imagem_url text,
  status text not null default 'disponivel' check (status in ('disponivel', 'indisponivel')),
  created_at timestamptz not null default now()
);
create index produtos_status_idx on public.produtos (status);

-- ============================================================
-- RLS — a vitrine pública (anon) só enxerga produtos
-- "disponivel". Qualquer barbeiro autenticado (mesmo login do
-- painel /dashboard.html) vê e gerencia o catálogo inteiro — não
-- existe um papel de "admin" separado nesse sistema hoje, todos os
-- barbeiros dividem a administração da loja.
-- ============================================================

alter table public.produtos enable row level security;

create policy "produtos_select_publico" on public.produtos
  for select to anon using (status = 'disponivel');

create policy "produtos_select_autenticado" on public.produtos
  for select to authenticated using (true);

create policy "produtos_insert_autenticado" on public.produtos
  for insert to authenticated with check (true);

create policy "produtos_update_autenticado" on public.produtos
  for update to authenticated using (true);

create policy "produtos_delete_autenticado" on public.produtos
  for delete to authenticated using (true);

-- ============================================================
-- Storage — bucket público pras fotos dos produtos. Leitura
-- liberada pra todo mundo (é assim que o site exibe a imagem);
-- upload/troca/remoção só pra barbeiro autenticado.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('produtos-imagens', 'produtos-imagens', true)
on conflict (id) do nothing;

create policy "produtos_imagens_select_publico" on storage.objects
  for select using (bucket_id = 'produtos-imagens');

create policy "produtos_imagens_insert_autenticado" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos-imagens');

create policy "produtos_imagens_update_autenticado" on storage.objects
  for update to authenticated using (bucket_id = 'produtos-imagens');

create policy "produtos_imagens_delete_autenticado" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos-imagens');

-- ============================================================
-- Opcional — migra os 4 produtos que já estavam fixos no site
-- (fotos em site/img/produtos/, mesma origem do domínio, por isso o
-- caminho relativo funciona como imagem_url). Descomente e rode se
-- quiser começar com o catálogo atual já populado; senão, cadastre
-- pelo painel (aba 🛍 Produtos) do zero.
-- ============================================================

-- insert into public.produtos (nome, preco, descricao, imagem_url, status) values
--   ('Minoxidil', 40.00, 'Estímulo de crescimento pra barba e cabelo, uso diário.', 'img/produtos/minoxidil.jpeg', 'disponivel'),
--   ('Creme de Barba', 30.00, 'Hidratação e maciez pra manter a barba no controle.', 'img/produtos/creme-de-barba.jpeg', 'disponivel'),
--   ('Creme de Cabelo', 30.00, 'Cuidado diário pro cabelo depois do corte.', 'img/produtos/creme-de-cabelo.jpeg', 'disponivel'),
--   ('Pomada', 50.00, 'Fixação e acabamento pro penteado do dia a dia.', 'img/produtos/pomada.jpeg', 'disponivel');
