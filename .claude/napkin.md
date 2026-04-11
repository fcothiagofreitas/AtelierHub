# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-04-09] Buscar primeiro em `docs/` antes de inferir regras**
   Do instead: usar `rg` nos documentos de negócio e só então resumir lacunas ou conflitos.
2. **[2026-04-09] Backlog técnico do MVP virou referência de execução**
   Do instead: usar `docs/backlog-tecnico-mvp.md` como guia padrão para planejamento, implementação e acompanhamento do MVP.
3. **[2026-04-11] Sprint só fecha quando fica testável de ponta a ponta**
   Do instead: incluir banco real, migration, seed e validação funcional mínima antes de avançar para a próxima sprint.

## Shell & Command Reliability
1. **[2026-04-09] Preferir `rg` em raízes reais existentes**
   Do instead: rodar `rg` em diretórios confirmados e tratar ausência de pastas opcionais como `.claude/`.
2. **[2026-04-11] Prisma adapter com Postgres local funcionou melhor com `pg.Pool` explícito**
   Do instead: criar `Pool({ connectionString })` e passar para `PrismaPg(pool)` em vez de depender do construtor com objeto simples.

## Domain Behavior Guardrails
1. **[2026-04-09] Multi-loja já existe como premissa central**
   Do instead: assumir `tenant` com várias lojas e validar se a regra nova é por permissão, visibilidade ou fluxo operacional antes de propor mudança estrutural.
2. **[2026-04-09] Estoque precisa de rastreabilidade por movimento**
   Do instead: modelar entradas e saídas com transferência, venda, defeito e conferência antes de admitir ajuste manual livre.
3. **[2026-04-09] DevOps do MVP prioriza simplicidade operacional**
   Do instead: assumir app fora do Docker, PostgreSQL em Docker, `develop -> staging` e `main -> production` até nova decisão explícita.
4. **[2026-04-09] Front e back andam juntos por entrega**
   Do instead: em cada sprint entregar tela, regra, banco e fluxo funcional testável, evitando separar backend completo de frontend completo.

## User Directives
1. **[2026-04-09] Avaliações devem comparar áudio/requisito com docs existentes**
   Do instead: responder com o que já está documentado, o que está implícito e o que ainda falta explicitar.
