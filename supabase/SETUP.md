# Setup do Supabase — sistema de agendamento

Passo a passo pra deixar o backend do agendamento no ar. Leva uns 10
minutos, é tudo gratuito no plano free do Supabase (mais que suficiente
pro volume de uma barbearia).

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (dá pra
   entrar com o GitHub).
2. "New project" → escolha um nome (ex: `barba-negra`) → defina uma
   senha de banco de dados (guarde em algum lugar seguro, mas não é a
   mesma coisa que vai no site) → região mais próxima (South America -
   São Paulo, se disponível) → Create.
3. Espera uns 2 minutos até o projeto ficar pronto.

## 2. Rodar o schema

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Cole o conteúdo inteiro de `supabase/schema.sql` (deste projeto) e
   clique **Run**.
3. Deve aparecer "Success. No rows returned". Isso cria as tabelas, as
   regras de segurança e as funções — mas ainda sem nenhum barbeiro.

## 3. Criar o login de cada barbeiro

1. Menu lateral → **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Pra cada barbeiro (Denis, Guilherme, Luiz, Gustavo): coloque um
   email (pode ser um email real dele, ou algo como
   `denis@barbanegra.com.br` se preferir) e uma senha temporária.
   Marque "Auto Confirm User" pra não precisar de confirmação por
   email.
3. Depois de criar, clique em cada usuário na lista e copie o **UUID**
   dele (aparece no topo da página do usuário).
4. Volte no **SQL Editor**, abra o arquivo `supabase/schema.sql` deste
   projeto, ache o bloco comentado no final (`-- insert into
   public.barbeiros...`), descomente e cole os 4 UUIDs reais no lugar
   de `'UUID-DO-DENIS'` etc. Rode só esse bloco.
5. Confirme em **Table Editor → barbeiros** que as 4 linhas apareceram.
6. Anote a senha de cada barbeiro (ou troque por uma que eles escolham)
   e repasse por fora (WhatsApp) — é o que eles vão usar pra entrar no
   painel em `/dashboard.html`.

## 4. Me passar as credenciais

No menu lateral → **Project Settings** → **API**. Me manda:

- **Project URL** (algo como `https://xxxxx.supabase.co`)
- **anon public key** (uma chave longa, começa com `eyJ...`)

Essas duas informações são seguras pra colocar no código do site (são
public por design — quem protege os dados são as regras de segurança
que já estão no `schema.sql`, não o sigilo dessa chave). **Não** me
mande a `service_role key` nem a senha do banco — essas nunca vão pro
site.

Assim que eu tiver a URL e a anon key, coloco em
`site/js/supabase-config.js` e o agendamento passa a funcionar de
verdade em produção.

## 5. Módulo de Produtos (loja)

Habilita a aba **🛍 Produtos** no painel (`/dashboard.html`) — cadastro,
edição e remoção de produtos sem mexer em código, refletindo direto em
`produtos.html`.

1. **SQL Editor** → **New query** → cole o conteúdo inteiro de
   `supabase/produtos.sql` (deste projeto) → **Run**. Não mexe em nada
   do agendamento, só adiciona a tabela `produtos` e um bucket de
   imagens novo.
2. Pronto — não precisa criar usuário novo. Qualquer barbeiro que já
   loga no painel também gerencia o catálogo (não existe um login
   separado de "dono da loja" nesse sistema).
3. Confirme em **Table Editor → produtos** que a tabela foi criada, e
   em **Storage** que o bucket `produtos-imagens` apareceu.
4. Opcional: no fim de `supabase/produtos.sql` tem um bloco comentado
   que já popula os 4 produtos que estavam fixos no site (Minoxidil,
   Creme de Barba, Creme de Cabelo, Pomada). Descomente e rode se quiser
   começar com o catálogo atual; senão, cadastre do zero pelo painel.

## Se precisar mudar depois

- **Horário de funcionamento**: `supabase/schema.sql`, função
  `horarios_disponiveis`, as 3 linhas marcadas com `<-` no topo dela.
  Edite lá e rode de novo o `create or replace function...` no SQL
  Editor do Supabase (não precisa mexer no site).
- **Adicionar/remover barbeiro**: cria (ou remove) o usuário em
  Authentication → Users, e insere (ou apaga) a linha correspondente em
  `barbeiros` pelo Table Editor.
- **Senha esquecida de um barbeiro**: Authentication → Users → clique
  no usuário → "Reset password" ou defina uma nova direto ali.
