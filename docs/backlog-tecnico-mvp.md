# AtelierHub — Backlog técnico do MVP

Documento de execução do MVP, derivado de:

- [regras-negocio-arquitetura-e-paginas.md](./regras-negocio-arquitetura-e-paginas.md)
- [mapa-mental-e-modelo-dados.md](./mapa-mental-e-modelo-dados.md)
- [especificacao-excalidraw-produto-vendas-cadastros.md](./especificacao-excalidraw-produto-vendas-cadastros.md)

## Decisões fechadas do MVP

- Framework: `Next.js`
- ORM: `Prisma`
- UI: `Tailwind CSS` + `shadcn/ui`
- Auth: `e-mail e senha`
- Auto cadastro: **não**
- Criação de acesso ao sistema: pela área administrativa (via colaborador com login opcional)
- App: fora do Docker
- Banco: `PostgreSQL` em Docker
- Redis: fora do MVP
- Infra: uma VPS
- Process manager: `PM2`
- Ambientes: `staging` e `production`
- Fluxo de branch: `develop -> staging` e `main -> production`
- Arquitetura: monólito modular
- `tenant` = marca
- `loja` != `tenant`
- Usuário do MVP pertence a uma única marca e pode ter acesso a uma ou mais lojas

## Perfis do MVP

- `admin_da_marca`
- `administrativo`
- `gerente_loja`
- `vendedor`

## Regras de acesso fechadas

- `admin_da_marca` também atua como administrativo
- `administrativo` não equivale automaticamente a `admin_da_marca`
- `produto`, `vendedor`, `corretor` e criação de usuários são centralizados no administrativo
- `cliente` pode ser cadastrado por `gerente_loja` e `vendedor`
- `vendedor` tem login próprio
- `corretor` não acessa o sistema
- `financeiro` não existe como perfil do MVP
- `vendedor` pode ver a lista de vendas da loja
- `vendedor` pode consultar estoque de outras lojas
- lojas não têm visão gerencial cruzada entre si

## Estrutura sugerida de módulos

- `auth`
- `administrativo`
- `lojas`
- `colaboradores` (pessoas; login é opcional e vive em `User`)
- `clientes`
- `corretores`
- `vendedores` (no MVP: perfil `VENDEDOR` dentro de `Colaborador`, não entidade separada)
- `catalogo`
- `estoque`
- `vendas`
- `financeiro`
- `comissoes`
- `trocas`

## Sprint 1 — Fundação do projeto

### Objetivo

Deixar a base técnica pronta para iniciar o MVP com segurança.

### Backlog técnico

- Inicializar projeto `Next.js` com `TypeScript`
- Configurar `Tailwind CSS`
- Configurar `shadcn/ui`
- Configurar `Prisma`
- Configurar conexão com PostgreSQL
- Definir convenções de `.env.local`, `.env.staging` e `.env.production`
- Configurar lint
- Configurar formatador
- Configurar typecheck
- Configurar build
- Definir estrutura inicial de pastas por domínio
- Configurar autenticação com `e-mail e senha`
- Criar layout autenticado base
- Criar tela de login
- Criar página inicial autenticada placeholder
- Criar migration inicial com:
  - `tenant`
  - `loja`
  - `usuario`
  - `usuario_loja`
- Configurar `GitHub Actions` para lint, typecheck e build

### Critério de pronto

- Projeto sobe localmente
- Login funciona
- Sessão autenticada funciona
- CI roda com sucesso

### Status (implementação)

MVP **Sprint 1** entregue no código: projeto Next.js com TypeScript, Tailwind, shadcn/ui, Prisma e PostgreSQL; auth por e-mail e senha; layout autenticado e fluxo de login; migrations iniciais (`Tenant`, `Store`, `User`, vínculos); CI em `.github/workflows/ci.yml` (lint, typecheck, build).

## Sprint 2 — Identidade, perfis e contexto

### Objetivo

Fazer o sistema entender marca, loja, usuário e perfil.

### Backlog técnico

- Modelar perfis:
  - `admin_da_marca`
  - `administrativo`
  - `gerente_loja`
  - `vendedor`
- Implementar vínculo do usuário com tenant
- Implementar vínculo do usuário com uma ou mais lojas
- Implementar middleware de sessão
- Implementar middleware/autorização por perfil
- Implementar escopo por tenant
- Implementar escopo por loja
- Criar tela de seleção de loja
- Criar header com contexto de loja ativa
- Redirecionar usuário com 1 loja direto para o dashboard
- Exigir seleção de loja para usuário com múltiplas lojas
- Bloquear rotas sem permissão

### Critério de pronto

- Usuário com 1 loja entra direto
- Usuário com várias lojas escolhe contexto
- Perfis acessam apenas o que podem

### Status (implementação)

MVP **Sprint 2** entregue no código: enum `UserRole`, vínculo de utilizador a tenant e a uma ou mais lojas (`ColaboradorStore`); sessão NextAuth, `requireRole` e rotas protegidas; seleção de loja ativa e contexto em `src/lib/session.ts` (header/shell); redirecionamentos conforme número de lojas.

## Sprint 3 — Área administrativa e colaboradores

### Objetivo

Permitir que o administrativo monte a operação da marca.

### Arquitetura entregue (rewrite)

- **Colaborador** é a entidade primária de pessoas (nome, CPF, telefone, perfil `UserRole`, lojas, admissão/demissão, comissão mínima para vendedor, ativo/inativo).
- **User** guarda só credenciais (e-mail, senha); vínculo 1:1 opcional com `Colaborador` (“dar acesso ao sistema” no formulário).
- Rotas: `/admin/lojas`, `/admin/colaboradores` (substitui o antigo CRUD de “usuários” isolado).

### Backlog técnico

- Criar painel administrativo inicial
- Criar CRUD de lojas
- Criar CRUD de colaboradores (com login e perfil)
- Permitir definição de perfil do colaborador
- Permitir vínculo de colaborador com lojas
- Permitir ativar/inativar colaborador (e usuário vinculado, quando existir)
- Implementar reset de senha administrativo
- Criar listagem de lojas com filtros básicos
- Criar listagem de colaboradores com filtros básicos
- Criar formulários de loja
- Criar formulários de colaborador

### Critério de pronto

- Administrativo cria loja
- Administrativo cria colaborador (com ou sem acesso ao sistema)
- Administrativo vincula colaborador às lojas corretas

### Status

Entregue e versionado no branch `rewrite` (ex.: commit `feat: sprint 3 — área administrativa completa`, refactor `Colaborador como entidade primária`, ajustes de UX e redirect de seleção de loja).

## Sprint 4 — Cadastros centrais

### Objetivo

Subir os cadastros mestres usados pela operação.

### Domínio (decisão fechada para o MVP)

- **Corretor não é colaborador** — entidade e CRUD separados; não usar `Colaborador` / `UserRole` para corretor.
- **Limite de crédito do corretor (MVP):** um único **limite geral**, válido para **exposição em aberto** no contexto **consignado**; **sem** sublimite por loja ou por cliente neste MVP. **Campo opcional:** se **não** for preenchido, considera-se **ilimitado** para aquele corretor (até existir cálculo de exposição no PDV).
- **Quando estourar o limite:** política de **alerta** (não bloqueio rígido) na camada de venda quando existir PDV — o cadastro na Sprint 4 prepara o valor; a consulta na venda pode vir na sprint de vendas.

### Já coberto pelo modelo atual (`Colaborador` + admin)

Estes itens da sprint original passaram a ser tratados no **CRUD de colaboradores** (em especial com perfil **VENDEDOR**), não como CRUD separado de “vendedor”:

- Definição de perfil (inclui vendedor) e vínculo com lojas
- Status ativo/inativo do colaborador
- Comissão mínima (campo no formulário quando o perfil é vendedor)
- Datas de admissão e demissão + flags `isDismissed` / `dismissalAt` no schema
- Login próprio do vendedor (toggle de acesso, quando aplicável)

### Backlog técnico — Sprint 4 (MVP)

1. **Modelo `Corretor`** no Prisma (`tenantId`, dados cadastrais alinhados a RN-CR1, comissão, Pix/dados de pagamento, status ativo/bloqueado).
2. **Campo de limite geral de crédito** (consignado, um valor por corretor — ex. `Decimal` opcional; **vazio = ilimitado**).
3. **CRUD administrativo** — listagem + criar/editar corretor (área `/admin` ou rota equivalente), com busca/filtro básico se couber no mesmo padrão de lojas/colaboradores.
4. **Seed** — pelo menos um corretor de exemplo para desenvolvimento.

### Fora do escopo do MVP (Sprint 4 ou sprints futuras)

- Limite de crédito **por cliente** ou **por loja** para corretor.
- **Regras na operação** (PDV): cálculo de exposição em aberto, alerta ao ultrapassar limite, exclusão de corretor bloqueado nas seleções — depende da sprint de **vendas / PDV**; o cadastro só fornece o teto.

### Critério de pronto (MVP desta sprint)

- Administrativo cria, edita e lista **corretores** com dados essenciais, **comissão**, **pagamento (ex. Pix)** e **limite geral de crédito** (consignado).
- Corretor **bloqueado** / **ativo** refletidos no cadastro (uso em telas de venda fica para quando o PDV existir).

### Nota

O “vendedor” como pessoa operacional continua no **Colaborador**. O que a Sprint 4 fecha no MVP é o **corretor** como cadastro separado, com **um** limite de crédito geral conforme acima.

### Status (implementação)

MVP de **corretores** entregue: modelo Prisma, migration, CRUD em `/admin/corretores`, limite consignado opcional (vazio = ilimitado), seed com dois exemplos.

## Sprint 5 — Clientes

### Objetivo

Permitir cadastro operacional de clientes pela loja.

### Backlog técnico

- Criar tabela/modelo de cliente PF/PJ
- Criar formulário de cliente PF
- Criar formulário de cliente PJ
- Permitir cadastro por gerente e vendedor
- Implementar busca por nome
- Implementar busca por CPF/CNPJ
- Implementar busca por telefone
- Implementar status bloqueado/ativo
- Implementar limite de crédito
- Implementar vínculo opcional com corretor
- Criar listagem de clientes
- Permitir criação de cliente fora do PDV
- Permitir criação de cliente dentro do fluxo de venda

### Critério de pronto

- Gerente e vendedor conseguem cadastrar cliente
- Busca rápida funciona
- Cliente bloqueado fica sinalizado

### Status (implementação)

MVP **Sprint 5** entregue no código: modelo `Cliente` (PF/PJ), formulários, listagem com busca, limite de crédito e vínculo opcional com corretor; cadastro rápido por nome no PDV (`pdvCreateClienteNomeRapido`) para fluxo de venda.

## Sprint 6 — Catálogo de produto

### Objetivo

Preparar o catálogo para estoque e venda.

### Backlog técnico

- Criar CRUD de categorias
- Criar CRUD de subcategorias
- Criar CRUD de tipos
- Criar CRUD de coleções
- Criar modelo de produto
- Criar modelo de variações
- Criar tela de lista de produtos
- Criar formulário de produto
- Criar grid de variações
- Implementar geração automática de código de barras `EAN-13`
- Permitir código externo quando aplicável
- Criar seção de informação fiscal do produto
- Persistir dados fiscais do produto

### Critério de pronto

- Administrativo cria produto com variações
- Produto recebe código `EAN-13`
- Produto está pronto para receber estoque

### Status (implementação)

MVP **Sprint 6** entregue no código: CRUD de categorias, subcategorias, tipos, coleções, cores e grades/tamanhos; modelo `Produto` e `ProdutoVariacao` com geração de `EAN-13`, dados fiscais e código externo; UI sob `/admin/catalogo` e lista/formulário em `/admin/catalogo/produtos`.

## Sprint 7 — Estoque

### Objetivo

Subir a rastreabilidade de estoque entre administrativo e lojas.

### Backlog técnico

- Criar saldo por loja
- Criar saldo do administrativo
- Criar tabela/modelo de movimento de estoque
- Implementar entrada manual
- Implementar conferência manual
- Implementar transferência entre lojas
- Implementar transferência a partir do administrativo
- Implementar saída por defeito
- Implementar histórico de movimentos
- Implementar consulta de estoque entre lojas
- Implementar restrição para esconder visão gerencial cruzada
- Implementar tela de estoque por loja
- Implementar tela de entrada manual
- Implementar tela de transferência
- Implementar tela de conferência
- Implementar tela de saída por defeito
- Implementar histórico por SKU/loja/período

### Critério de pronto

- Estoque pode entrar, sair e transferir com rastreabilidade
- Lojas consultam estoque
- Histórico fica auditável

### Glossário (implementação vs RN-E6/E7)

- **Conferência manual (MVP):** ajuste pontual com delta inteiro (+/−) por SKU e loja, tipo `AJUSTE_CONFERENCIA` em `MovimentoEstoque`. O **balanço / inventário físico** por documento (rascunho, importação, contagem, conclusão com ajustes rastreáveis) está em **Sprint 13** (`BalancoEstoque`), alinhado a RN-E6/E7 em escopo MVP.
- **Saldo administrativo:** mesma tabela de saldo; lojas com `StoreKind.ADMINISTRATIVE` têm posição própria (RN-E8). Transferências a partir do admin usam essa loja como origem ou destino nas telas.
- **Consulta entre lojas:** perfis `ADMIN_DA_MARCA` / `ADMINISTRATIVO` filtram qualquer loja do tenant; demais perfis só veem lojas do seu vínculo (`ColaboradorStore`). A UI prioriza **disponibilidade** (saldo), sem cruzar métricas gerenciais (RN-E10).

### Status (implementação)

MVP **Sprint 7** entregue no código: migração `EstoqueSaldo` + `MovimentoEstoque`, serviço transacional, entradas/saídas/transferências/ajuste, seed com saldos de exemplo, rotas em `/admin/estoque` (consulta, histórico, entrada, saída defeito, transferência, conferência), link no menu **Operação** e no painel admin.

## Sprint 8 — Tela de vendas da loja

### Objetivo

Entregar a tela principal da operação da loja.

### Backlog técnico

- Criar modelo base de pedido
- Criar listagem de pedidos/vendas por loja
- Implementar filtros por período
- Implementar atalhos de período
- Implementar filtro por estado
- Implementar filtro por cliente
- Implementar filtro por vendedor
- Implementar filtro por corretor
- Implementar busca por número do pedido
- Implementar busca por nome do cliente
- Criar detalhe do pedido
- Adicionar atalho `Nova venda`

### Critério de pronto

- Loja vê a lista de vendas da própria unidade
- Busca e filtros funcionam
- Tela vira ponto principal da operação da loja

### Status (implementação)

MVP **Sprint 8** entregue no código: modelo `Pedido` + `PedidoItem`, migração, seed com três pedidos de exemplo, rotas `/vendas` (lista com período, atalhos, filtros e buscas), `/vendas/[id]` (detalhe), atalho **Nova venda** → PDV (Sprint 9), item ativo no menu **Operação**.

## Sprint 9 — PDV rápido

### Objetivo

Fazer a venda acontecer no fluxo rápido do MVP.

### Backlog técnico

- Criar modal do PDV rápido
- Implementar seleção de cliente
- Implementar seleção de vendedor
- Implementar seleção opcional de corretor
- Implementar venda direta
- Implementar venda consignada
- Implementar busca de produto
- Implementar leitura por código de barras
- Implementar carrinho
- Implementar pedido em andamento
- Implementar auto-save de pedido em andamento
- Implementar finalização de pedido
- Implementar validação de disponibilidade
- Implementar baixa de estoque ao finalizar
- Fazer retorno para a tela de vendas da loja após fechar o modal

### Critério de pronto

- Pedido pode ser iniciado, salvo automaticamente e finalizado
- Baixa de estoque ocorre ao finalizar
- Venda aparece na lista da loja

### Status (implementação)

MVP **Sprint 9** entregue no código: modal **PDV rápido** em `/vendas?pdv=1` (e **Nova venda**), seleção de cliente/vendedor/corretor e modalidade direta/consignada, busca de variação + leitura **EAN-13**, carrinho com quantidade/preço, **auto-save** do pedido em andamento, **finalização** com validação de saldo e movimentos `MovimentoEstoqueTipo.VENDA`, redirect/fecho volta à lista; enum e migração `VENDA`; `/vendas/novo` redireciona para `?pdv=1`.

## Sprint 10 — Pagamentos e cobranças

### Objetivo

Fechar o ciclo financeiro básico do pedido.

### Backlog técnico

- Criar modelo de pagamento
- Implementar pagamento no ato
- Implementar pagamento pendente
- Implementar pagamento parcial
- Implementar saldo em aberto
- Criar contas a receber básico
- Criar modelo de grupo de cobrança
- Implementar agrupamento por cliente
- Implementar agrupamento por corretor
- Implementar quitação parcial de grupo
- Implementar quitação total de grupo
- Gerar comprovante/recibo em PDF

### Critério de pronto

- Pedido aceita recebimentos parciais
- Cobrança agrupada funciona
- Recibo PDF pode ser emitido

### Status (implementação)

MVP **Sprint 10** entregue no código: modelo `Pagamento` e `GrupoCobranca`, recebimento multi-forma no pedido e em grupo (`pagamento-actions`, `cobranca-actions`), contas a receber e telas de cobrança agrupada, estados `PAGO_PARCIAL` / `QUITADO`, API `GET /api/vendas/pedido/[pedidoId]/recibo` (PDF via `recibo-pdf.ts`). **Recibo na UI:** após existir pelo menos um pagamento registado, o link **Recibo (PDF)** aparece no rodapé do PDV (ver pedido / `VendaAcoesCliente`, `data-testid="vendas-recibo-pdf"`) e no painel **Venda finalizada** (`data-testid="vendas-recibo-pdf-finalizada"`). O componente `PedidoResumoLeitura` mantém o mesmo destino para eventual reutilização. **E2E:** `npm run test:e2e` (Playwright: `e2e/vendas-recibo.spec.ts`, `globalSetup` garante pagamento no pedido #3 se faltar).

## Sprint 11 — Comissões

### Objetivo

Registrar e consultar comissões do MVP.

### Backlog técnico

- Criar tabela/modelo de lançamentos de comissão
- Implementar comissão de vendedor
- Implementar comissão de corretor
- Permitir parâmetros configuráveis
- Criar tela administrativa de configuração
- Criar tela de consulta por período
- Criar consulta por vendedor
- Criar consulta por corretor

### Critério de pronto

- Venda gera comissão
- Administrativo consulta e configura parâmetros

### Status (implementação)

MVP **Sprint 11** entregue no código: modelo `LancamentoComissao` (tipos `VENDEDOR` / `CORRETOR`), geração na quitação do pedido (`gerarLancamentosComissaoPedidoQuitado` em `pagamento-actions` e `cobranca-actions`), base = total do pedido; vendedor usa `Colaborador.minCommission` ou `Tenant.percentualComissaoVendedorPadrao`; corretor usa `Corretor.commissionPercent` quando o pedido tem corretor. **Admin:** `/admin/comissoes` (lista de lançamentos com filtros) e `/admin/comissoes/parametros` (percentual padrão da marca); `/admin/comissoes/consulta` redirecciona para a lista.

## Sprint 12 — Trocas

### Objetivo

Suportar trocas dentro das regras do MVP.

### Backlog técnico

- Criar parâmetros de troca
- Criar fluxo de nova troca
- Validar elegibilidade por pedido/item
- Implementar regra especial para consignado não pago
- Criar crédito vinculado ao cliente
- Permitir gerar novo pedido vinculado a partir da troca
- Criar lista de trocas

### Critério de pronto

- Troca fica rastreada
- Cliente recebe crédito
- Troca pode originar novo pedido

## Sprint 13 — Balanço de estoque

### Objetivo

Fechar o controle físico do estoque.

### Backlog técnico

- Criar documento de balanço
- Criar itens de contagem
- Implementar contagem por SKU
- Comparar contado x sistema
- Gerar divergências
- Criar relatório de divergências
- Implementar ajuste rastreável pós-balanço

### Critério de pronto

- Balanço pode ser executado
- Divergência é exibida
- Ajuste fica auditável

### Status (implementação)

MVP **Sprint 13** entregue no código: modelos `BalancoEstoque` / `BalancoEstoqueItem`, migração `20260424120000_balanco_estoque`; fluxo rascunho → importação a partir de `EstoqueSaldo` (opção só saldo positivo) → contagens → conclusão com movimentos `AJUSTE_CONFERENCIA` e motivo textual `Balanço #` + número do documento; cancelamento de rascunho. **UI:** `/admin/estoque/balanco` (lista por loja), `/admin/estoque/balanco/novo`, `/admin/estoque/balanco/[id]` (detalhe / relatório), entrada no hub **Estoque**.

## Sprint 14 — Painel administrativo consolidado

### Objetivo

Entregar visão consolidada para o perfil administrativo.

### Backlog técnico

- Criar dashboard administrativo
- Consolidar vendas da marca
- Consolidar estoque da marca
- Consolidar pendências operacionais
- Criar alertas operacionais
- Criar atalhos centrais para os principais cadastros e fluxos

### Critério de pronto

- Administrativo enxerga a marca de forma consolidada
- Lojas seguem sem visão gerencial cruzada

### Status (implementação)

MVP **Sprint 14** entregue no código: snapshot `getAdminConsolidadoSnapshot` em `src/modules/admin/admin-consolidado-queries.ts` (vendas por período e valores quitados, totais de estoque e top lojas por peças, pendências: pedidos em andamento / pagamento aberto, balanços em rascunho, contagem de grupos de cobrança). **UI:** `/admin` com secções Vendas da marca, Estoque da marca, Pendências e alertas (destaque quando há itens), atalhos para vendas, clientes, contas a receber, trocas e comissões; acesso restrito a `ADMIN_DA_MARCA` / `ADMINISTRATIVO`.

## Sprint 15 — Staging, produção e go-live

### Objetivo

Colocar o MVP em operação com segurança.

### Backlog técnico

- Configurar `PM2` para `staging`
- Configurar `PM2` para `production`
- Configurar `Nginx`
- Configurar domínio de `staging`
- Configurar domínio de `production`
- Criar banco `atelierhub_staging`
- Criar banco `atelierhub_production`
- Configurar pipeline `develop -> staging`
- Configurar pipeline `main -> production`
- Configurar `Sentry`
- Configurar logs da aplicação
- Configurar healthcheck
- Definir rotina mínima de backup do PostgreSQL
- Definir checklist de rollback

### Critério de pronto

- Staging sobe a partir de `develop`
- Production sobe a partir de `main`
- Erros são monitorados
- Banco possui rotina mínima de backup

### Status (implementação) — conferência

**Entregue no código / repo (MVP operacional parcial):**


| Item do backlog      | Situação                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Healthcheck HTTP     | **Sim** — `GET /api/health` (`src/app/api/health/route.ts`), liveness sem DB.                                              |
| CI                   | **Sim** — `.github/workflows/ci.yml` em `develop`, `main` (lint, typecheck, build).                                        |
| Deploy automatizado  | **Sim** — `deploy-staging.yml` (`develop`), `deploy-production.yml` (`main`). Ver checkpoint abaixo.                       |
| PM2                  | **Um processo** — `ecosystem.config.cjs` (app `atelierhub`); não há ficheiros separados “staging” vs “production” no repo. |
| PostgreSQL em Docker | **Sim** — `docker-compose.yml` com `atelierhub_dev` e healthcheck do container.                                            |
| Nginx                | **Fora do repo** — configurado na VPS (não versionado aqui).                                                               |


**Ainda em aberto vs critério de pronto da Sprint 15:**


| Item                                                 | Notas                                                                                                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PM2 distinto staging / production                    | Não há dois ecosistemas ou instâncias nomeadas por ambiente no repositório.                                                                                                              |
| Nginx + domínios staging / production                | Domínios e blocos `server` não estão no repo; na VPS há uso por IP / sites manuais.                                                                                                      |
| Bases `atelierhub_staging` e `atelierhub_production` | O compose atual define só `POSTGRES_DB=atelierhub_dev`; não há criação automática dos dois nomes.                                                                                        |
| Pipeline `develop → staging`                         | **Workflow:** `deploy-staging.yml` em push a `**develop`** (ou dispatch). Na VPS pode faltar segundo clone (`/var/www/atelierhub-staging`) até activares staging.                        |
| Pipeline `main → production`                         | **Workflow:** `deploy-production.yml` em push a `**main`**; na VPS usar clone em `/var/www/atelierhub` (ou `VPS_PROJECT_DIR_PRODUCTION`).                                                |
| Sentry                                               | **Sim** — `@sentry/nextjs` (`instrumentation`, client/server/edge, `global-error`); DSN em `NEXT_PUBLIC_SENTRY_DSN` (opcional). Source maps: `SENTRY_AUTH_TOKEN` + org/projeto no build. |
| Logs da aplicação                                    | PM2 grava em `~/.pm2/logs/`; não há stack de logs centralizado no repo.                                                                                                                  |
| Backup PostgreSQL                                    | Sem script ou runbook mínimo versionado.                                                                                                                                                 |
| Checklist de rollback                                | Não documentado no repositório.                                                                                                                                                          |


**Leitura:** o ambiente na VPS (IP, PM2, Docker, migrações, deploy a partir de `develop`/`main`) está em uso; os critérios formais de **dois ambientes (staging/production) com branches e BDs separados**, **monitorização de erros** e **backup documentado** continuam por fechar para considerar a Sprint 15 **fechada** como no texto original.

### Onde estamos (checkpoint — Sprint 15)

- **PostgreSQL = banco de dados.** No repositório sobe com **Docker** (`docker-compose.yml`: serviço `db`, imagem Postgres 16, volume persistente, healthcheck). Na **VPS** o contentor (ex.: `atelierhub-db`) mantém o Postgres **online**; a app usa `DATABASE_URL` apontando para esse host/porta (ex.: `localhost:5433` → Postgres dentro do container).
- **CI** (`.github/workflows/ci.yml`): em **push** para `main`, `develop`; em **PR** para `main`, `develop` — lint, typecheck, build; `concurrency` para cancelar runs duplicados no mesmo ref.
- **CD:**
  - `**deploy-staging.yml`:** push em `**develop`** → staging (default `/var/www/atelierhub`); `**workflow_dispatch**` com branch à escolha.
  - `**deploy-production.yml`:** push em `**main`** → produção (default `/var/www/atelierhub`); `workflow_dispatch` com branch (default `main`).
- **Secrets opcionais de caminho:** `VPS_PROJECT_DIR_STAGING`, `VPS_PROJECT_DIR_PRODUCTION` (senão usam os defaults nos workflows).
- **Próximo passo** na Sprint 15: backup e rollback (itens adiados); configurar DSN na VPS/prod quando quiseres receber eventos.

## Observações de execução

- Cada sprint deve entregar **front e back juntos**
- Cada sprint deve produzir pelo menos **um fluxo funcional testável**
- O backlog deve ser refinado conforme o projeto evoluir, sem perder as decisões fechadas acima