-- ============================================================
-- Barba Negra — Schema do sistema de agendamento
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (Project →
-- SQL Editor → New query → cola tudo → Run). Depois siga
-- supabase/SETUP.md pra criar os usuários dos barbeiros.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Tabelas
-- ============================================================

create table public.barbeiros (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  slug text not null unique,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  barbeiro_id uuid not null references public.barbeiros(id) on delete cascade,
  data date not null,
  horario time not null,
  slots int not null check (slots in (1, 2)),
  servico_id text not null,
  servico_nome text not null,
  cliente_nome text not null,
  cliente_telefone text not null,
  created_at timestamptz not null default now(),
  unique (barbeiro_id, data, horario)
);
create index agendamentos_barbeiro_data_idx on public.agendamentos (barbeiro_id, data);
create index agendamentos_telefone_idx on public.agendamentos (cliente_telefone);

create table public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  barbeiro_id uuid not null references public.barbeiros(id) on delete cascade,
  data date not null,
  horario_inicio time not null,
  horario_fim time not null,
  motivo text,
  created_at timestamptz not null default now(),
  check (horario_fim > horario_inicio)
);
create index bloqueios_barbeiro_data_idx on public.bloqueios (barbeiro_id, data);

-- ============================================================
-- RLS — acesso público (anon) só passa pelas funções abaixo,
-- que nunca devolvem nome/telefone de outro cliente. Barbeiro
-- autenticado só enxerga/edita as próprias linhas.
-- ============================================================

alter table public.barbeiros enable row level security;
alter table public.agendamentos enable row level security;
alter table public.bloqueios enable row level security;

create policy "barbeiros_select_publico" on public.barbeiros
  for select using (true);

create policy "agendamentos_select_proprio" on public.agendamentos
  for select using (auth.uid() = barbeiro_id);
create policy "agendamentos_update_proprio" on public.agendamentos
  for update using (auth.uid() = barbeiro_id);
create policy "agendamentos_delete_proprio" on public.agendamentos
  for delete using (auth.uid() = barbeiro_id);

create policy "bloqueios_select_proprio" on public.bloqueios
  for select using (auth.uid() = barbeiro_id);
create policy "bloqueios_insert_proprio" on public.bloqueios
  for insert with check (auth.uid() = barbeiro_id);
create policy "bloqueios_delete_proprio" on public.bloqueios
  for delete using (auth.uid() = barbeiro_id);

-- ============================================================
-- Função utilitária — normaliza telefone (só dígitos), pra
-- "(45) 99999-8888", "45999998888" e "45 9 9999 8888" baterem.
-- ============================================================

create or replace function public.normalizar_telefone(p_telefone text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
$$;

-- ============================================================
-- Horários disponíveis
-- Horário de funcionamento: 08:00–20:00, Seg a Sáb, slots de 15 min.
-- Pra mudar, edite as 3 linhas marcadas com "<-" abaixo.
-- Nunca expõe nome/telefone de cliente — só devolve horários livres.
-- ============================================================

create or replace function public.horarios_disponiveis(
  p_barbeiro_id uuid,
  p_data date,
  p_slots_necessarios int,
  p_excluir_id uuid default null -- usado na edição: ignora o próprio agendamento sendo editado
)
returns table (horario time)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_abertura time := '08:00';          -- <- horário de abertura
  v_fechamento time := '20:00';        -- <- horário de fechamento
  v_intervalo interval := '15 minutes'; -- <- tamanho do slot
  v_slot time;
  v_fim_candidato time;
begin
  if p_data < current_date then
    return;
  end if;

  -- Domingo fechado (dow: 0 = domingo)
  if extract(dow from p_data) = 0 then
    return;
  end if;

  v_slot := v_abertura;
  while v_slot < v_fechamento loop
    v_fim_candidato := v_slot + (p_slots_necessarios * v_intervalo);

    if v_fim_candidato <= v_fechamento
      -- não oferece horário que já passou, se a data escolhida for hoje
      and (p_data > current_date or v_slot > current_time)
      -- não pode colidir com nenhum agendamento existente (exceto o que
      -- está sendo editado agora, se for o caso)
      and not exists (
        select 1 from public.agendamentos a
        where a.barbeiro_id = p_barbeiro_id
          and a.data = p_data
          and (p_excluir_id is null or a.id <> p_excluir_id)
          and a.horario < v_fim_candidato
          and (a.horario + (a.slots * v_intervalo)) > v_slot
      )
      -- não pode colidir com nenhum bloqueio (almoço, folga etc.)
      and not exists (
        select 1 from public.bloqueios b
        where b.barbeiro_id = p_barbeiro_id
          and b.data = p_data
          and b.horario_inicio < v_fim_candidato
          and b.horario_fim > v_slot
      )
    then
      horario := v_slot;
      return next;
    end if;

    v_slot := v_slot + v_intervalo;
  end loop;
end;
$$;

grant execute on function public.horarios_disponiveis(uuid, date, int, uuid) to anon, authenticated;

-- ============================================================
-- Criar agendamento
-- Trava por (barbeiro, dia) durante a transação pra duas
-- reservas simultâneas não passarem pela checagem de
-- disponibilidade juntas (evita corrida/dupla marcação).
-- ============================================================

create or replace function public.criar_agendamento(
  p_barbeiro_id uuid,
  p_data date,
  p_horario time,
  p_slots int,
  p_servico_id text,
  p_servico_nome text,
  p_cliente_nome text,
  p_cliente_telefone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intervalo interval := '15 minutes';
  v_fim_candidato time;
  v_novo_id uuid;
begin
  if p_cliente_nome is null or length(trim(p_cliente_nome)) = 0 then
    raise exception 'nome_invalido';
  end if;
  if length(public.normalizar_telefone(p_cliente_telefone)) < 8 then
    raise exception 'telefone_invalido';
  end if;
  if p_slots not in (1, 2) then
    raise exception 'servico_invalido';
  end if;
  if p_data < current_date then
    raise exception 'data_invalida';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_barbeiro_id::text || p_data::text));

  v_fim_candidato := p_horario + (p_slots * v_intervalo);

  if exists (
    select 1 from public.agendamentos a
    where a.barbeiro_id = p_barbeiro_id
      and a.data = p_data
      and a.horario < v_fim_candidato
      and (a.horario + (a.slots * v_intervalo)) > p_horario
  ) or exists (
    select 1 from public.bloqueios b
    where b.barbeiro_id = p_barbeiro_id
      and b.data = p_data
      and b.horario_inicio < v_fim_candidato
      and b.horario_fim > p_horario
  ) then
    raise exception 'horario_indisponivel';
  end if;

  insert into public.agendamentos (
    barbeiro_id, data, horario, slots, servico_id, servico_nome,
    cliente_nome, cliente_telefone
  ) values (
    p_barbeiro_id, p_data, p_horario, p_slots, p_servico_id, p_servico_nome,
    trim(p_cliente_nome), public.normalizar_telefone(p_cliente_telefone)
  )
  returning id into v_novo_id;

  return v_novo_id;
end;
$$;

grant execute on function public.criar_agendamento(uuid, date, time, int, text, text, text, text) to anon, authenticated;

-- ============================================================
-- Atualizar agendamento (edição pelo barbeiro, no dashboard).
-- Só authenticated chama isso; verifica que quem chamou é dono
-- da linha antes de editar, e revalida a disponibilidade (exceto
-- contra o próprio agendamento sendo editado) igual ao criar.
-- ============================================================

create or replace function public.atualizar_agendamento(
  p_id uuid,
  p_data date,
  p_horario time,
  p_slots int,
  p_servico_id text,
  p_servico_nome text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intervalo interval := '15 minutes';
  v_fim_candidato time;
  v_barbeiro_id uuid;
begin
  select barbeiro_id into v_barbeiro_id from public.agendamentos where id = p_id;

  if v_barbeiro_id is null then
    raise exception 'agendamento_nao_encontrado';
  end if;
  if v_barbeiro_id <> auth.uid() then
    raise exception 'nao_autorizado';
  end if;
  if p_slots not in (1, 2) then
    raise exception 'servico_invalido';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_barbeiro_id::text || p_data::text));

  v_fim_candidato := p_horario + (p_slots * v_intervalo);

  if exists (
    select 1 from public.agendamentos a
    where a.barbeiro_id = v_barbeiro_id
      and a.data = p_data
      and a.id <> p_id
      and a.horario < v_fim_candidato
      and (a.horario + (a.slots * v_intervalo)) > p_horario
  ) or exists (
    select 1 from public.bloqueios b
    where b.barbeiro_id = v_barbeiro_id
      and b.data = p_data
      and b.horario_inicio < v_fim_candidato
      and b.horario_fim > p_horario
  ) then
    raise exception 'horario_indisponivel';
  end if;

  update public.agendamentos
  set data = p_data, horario = p_horario, slots = p_slots,
      servico_id = p_servico_id, servico_nome = p_servico_nome
  where id = p_id;
end;
$$;

grant execute on function public.atualizar_agendamento(uuid, date, time, int, text, text) to authenticated;

-- ============================================================
-- Buscar agendamento por telefone (tela "Cancelar Agendamento").
-- Devolve só o próximo agendamento futuro daquele telefone —
-- nunca uma lista de tudo, nunca dados de outro cliente.
-- ============================================================

create or replace function public.buscar_agendamento_por_telefone(p_telefone text)
returns table (
  id uuid,
  barbeiro_nome text,
  servico_nome text,
  data date,
  horario time,
  cliente_nome text
)
language sql
security definer
set search_path = public
as $$
  select a.id, b.nome, a.servico_nome, a.data, a.horario, a.cliente_nome
  from public.agendamentos a
  join public.barbeiros b on b.id = a.barbeiro_id
  where a.cliente_telefone = public.normalizar_telefone(p_telefone)
    and (a.data > current_date or (a.data = current_date and a.horario >= current_time))
  order by a.data asc, a.horario asc
  limit 1;
$$;

grant execute on function public.buscar_agendamento_por_telefone(text) to anon, authenticated;

-- ============================================================
-- Cancelar agendamento — só apaga se o id E o telefone baterem
-- juntos (o telefone sozinho já filtrou no passo anterior; isso
-- impede cancelar só adivinhando/reaproveitando um id).
-- ============================================================

create or replace function public.cancelar_agendamento(p_id uuid, p_telefone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apagados int;
begin
  delete from public.agendamentos
  where id = p_id
    and cliente_telefone = public.normalizar_telefone(p_telefone);

  get diagnostics v_apagados = row_count;
  return v_apagados > 0;
end;
$$;

grant execute on function public.cancelar_agendamento(uuid, text) to anon, authenticated;

-- ============================================================
-- Barbeiros — rode isso SÓ DEPOIS de criar os 4 usuários em
-- Authentication → Users (veja supabase/SETUP.md). Troque cada
-- 'UUID-DO-...' pelo id real gerado pro respectivo usuário.
-- ============================================================

-- insert into public.barbeiros (id, nome, slug, ordem) values
--   ('UUID-DO-DENIS',     'Denis Wester',       'denis',     1),
--   ('UUID-DO-GUILHERME', 'Guilherme Duarte',   'guilherme', 2),
--   ('UUID-DO-LUIZ',      'Luiz Venâncio',      'luiz',      3),
--   ('UUID-DO-GUSTAVO',   'Gustavo Wandscheer', 'gustavo',   4);
