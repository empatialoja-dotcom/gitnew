# Empresa

> Memória central do negócio. O Claude lê esse arquivo antes de cada resposta.
> Preenchido pelo `/instalar` — você pode editar a qualquer momento.

**Nome:** Gabriel Weiber
**Negócio:** Agência de marketing digital com foco em IA
**O que faz:** Cria sites, automações e materiais de marketing (ex: gerador de carrossel automático) pra pequenos negócios
**Perfil:** Solopreneur / criador solo
**Atende clientes:** Sim, por projeto
**Equipe:** Sozinho
**Ferramentas:** MazyOS / Claude Code, Supabase (banco de dados + login — usado no agendamento da Barba Negra)
**Principais entregas:** Sites com agendamento e catálogo, automação de conteúdo (carrossel), materiais de apresentação pra fechar cliente

## Contexto adicional

Fase inicial do negócio — ainda captando os primeiros clientes.

**Cliente em negociação: Barbearia Barba Negra**
- Ainda não fechou — call de apresentação marcada pra sexta-feira, 03/07/2026
- Instagram atual: [barbanegrafozoficial](https://www.instagram.com/barbanegrafozoficial) — simples, sem muito valor agregado
- WhatsApp da barbearia: +55 45 9943-2724
- Barbeiros: Denis Wester, Guilherme Duarte, Luiz Venâncio, Gustavo Wandscheer
- Ferramenta de agendamento atual do cliente: visual datado, mal dimensionado, foco excessivo em modos de corte
- Projeto proposto: site novo com (1) aba de agendamento de horário, (2) aba de produtos (Minoxidil, creme de barba, creme de cabelo, pomadas), (3) aba do curso de barbeiro dele
- Agendamento do site deixou de redirecionar pro WhatsApp — agora é um sistema próprio com banco de dados (Supabase): cliente escolhe barbeiro, serviço e horário livre e confirma direto no site; cada barbeiro tem login próprio no painel (`site/dashboard.html`) e só vê os próprios agendamentos; cliente cancela sozinho em `site/cancelar.html` informando o telefone. Setup técnico documentado em `supabase/SETUP.md`
- Também vou criar um gerador de carrossel automático pra esse cliente
- Identidade visual da Barba Negra já registrada em `identidade/design-guide.md`
