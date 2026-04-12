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

### Já coberto pelo modelo atual (`Colaborador` + admin)

Estes itens da sprint original passaram a ser tratados no **CRUD de colaboradores** (em especial com perfil **VENDEDOR**), não como CRUD separado de “vendedor”:

- Definição de perfil (inclui vendedor) e vínculo com lojas
- Status ativo/inativo do colaborador
- Comissão mínima (campo no formulário quando o perfil é vendedor)
- Datas de admissão e demissão + flags `isDismissed` / `dismissalAt` no schema
- Login próprio do vendedor (toggle de acesso, quando aplicável)

### Backlog técnico — ainda pendente

- **Corretor (modelo + CRUD)** — não existe tabela nem telas; é o núcleo restante da sprint.
- **Status ativo/bloqueado do corretor** e **comissão por corretor**
- **Dados Pix / transferência do corretor**
- **Regras na operação** — quando existirem telas de venda, pedido ou seleção de vendedor/corretor:
  - excluir da seleção colaborador **vendedor** demitido/inativo conforme regra de negócio
  - excluir corretor **bloqueado** das seleções
- (Opcional / endurecimento) Garantir validações e mensagens únicas para demissão vs. apenas inativo

### Critério de pronto (atualizado)

- Administrativo cadastra e mantém **corretores** com regras de bloqueio e comissão
- Regras de bloqueio (corretor) e demissão/inatividade (vendedor como colaborador) **passam a valer nas fluxos operacionais** que consumirem esses cadastros (vendas, comissões, etc.)

### Nota

O critério “administrativo cria vendedor” no sentido de **pessoa com perfil vendedor** já é atendido pelo cadastro de colaborador. O que falta para “fechar” a Sprint 4 no espírito do documento original é sobretudo **corretor** e **integração com a operação** (filtros em seleções).

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

## Observações de execução

- Cada sprint deve entregar **front e back juntos**
- Cada sprint deve produzir pelo menos **um fluxo funcional testável**
- O backlog deve ser refinado conforme o projeto evoluir, sem perder as decisões fechadas acima
