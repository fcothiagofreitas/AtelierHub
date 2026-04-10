# Mapa mental e modelo de dados (ER)

Documento derivado de [especificacao-excalidraw-produto-vendas-cadastros.md](./especificacao-excalidraw-produto-vendas-cadastros.md).

Use a pré-visualização Markdown para ver os diagramas Mermaid.

---

## 1. Mapa mental

```mermaid
mindmap
  root((Gestão loja / atelier))
    Administrativo
      Visão consolidada do tenant
      Estoque administrativo próprio
      Centraliza cadastros estratégicos
      Supervisiona lojas sem substituir operação local
    Produto
      Origem fabricado ou comprado
      Vai pra loja
      Referência e descrição
      Variações cor e tamanho
      Código de barras por variação
      Tipo e coleção cadastráveis
      Fabricação próprio ou terceiro
      Preço de custo manual ou fabricação
      Categoria e subcategoria
      Fiscal posterior
    Estoque
      Estoque por loja
      Estoque administrativo
      Entrada registro obrigatório
      Entrada manual barras ou referência
      Entrada importada fábrica ou lojas
      Conferência lista pré definida
      Saída transferência loja ou fábrica
      Saída venda
      Transferência e defeito
    Pedidos e vendas
      Vários clientes simultâneos
      Reserva por disponibilidade
      Orçamento pode desistir
      Itens adicionar e remover
      Rascunho editável
      Finalizado imutável e baixa estoque
      Direta paga na hora corretor opcional
      Consignada múltiplos cenários
      Pagamento no ato fim do mês ou parcial
    Cobrança agrupada
      Por cliente ou por corretor
      Uma cobrança vários pedidos
      Pagamento parcial no grupo
    Comissão
      Vendedor obrigatório na venda
      Corretor opcional
      Repasse Pix espécie transferência
    Pessoas
      Cliente PF ou PJ
      Corretor bloqueio impede compra com ele
      Corretor pode ser cliente
      Vendedor admissão e demissão
    Troca
      Parâmetros tempo e coleção
      Mesma ou mais antiga
      Consignado não pago regra especial
```



---

## 2. Relacionamento de banco (visão ER)

**Premissas de modelagem:** uma entidade `loja` cobre “esta loja” e transferências, incluindo a loja/contexto administrativo quando ele existir no tenant; `cliente` unifica PF/PJ com campos opcionais conforme tipo; `corretor` e `cliente` podem ser ligados se a mesma pessoa exercer os dois papéis.

```mermaid
erDiagram
  LOJA ||--o{ PRODUTO_VARIACAO_ESTOQUE : saldo_por_loja
  LOJA ||--o{ PEDIDO : atendido_em
  LOJA ||--o{ MOVIMENTO_ESTOQUE : origem_ou_destino

  CATEGORIA ||--o{ SUBCATEGORIA : contém
  CATEGORIA ||--o{ PRODUTO : classifica
  SUBCATEGORIA ||--o{ PRODUTO : refinamento

  TIPO_PRODUTO ||--o{ PRODUTO : filtro
  COLECAO ||--o{ PRODUTO : temporada_ou_colecao

  PRODUTO ||--o{ PRODUTO_VARIACAO : possui
  PRODUTO_VARIACAO ||--o{ MOVIMENTO_ESTOQUE : movimenta
  PRODUTO_VARIACAO ||--o{ PEDIDO_ITEM : linha_de_pedido

  CLIENTE ||--o{ PEDIDO : compra
  VENDEDOR ||--o{ PEDIDO : atende
  CORRETOR ||--o{ PEDIDO : opcional_responsavel
  CLIENTE }o--o| CORRETOR : mesmo_cadastro_opcional

  PEDIDO ||--|{ PEDIDO_ITEM : itens
  PEDIDO ||--o{ LANCAMENTO_COMISSAO : gera
  PEDIDO }o--o{ GRUPO_COBRANCA_PEDIDO : agrupado_em

  GRUPO_COBRANCA ||--|{ GRUPO_COBRANCA_PEDIDO : inclui
  GRUPO_COBRANCA ||--o{ PAGAMENTO : quita
  CLIENTE ||--o{ GRUPO_COBRANCA : agrupar_por
  CORRETOR ||--o{ GRUPO_COBRANCA : agrupar_por

  PEDIDO ||--o{ PAGAMENTO : recebe
  PAGAMENTO ||--o{ PAGAMENTO_PARCELA : parcelas_ou_parci

  PEDIDO ||--o{ TROCA : origem_ou_destino
  PRODUTO_VARIACAO ||--o{ TROCA : itens_trocados
  PARAMETRO_TROCA ||--o{ TROCA : regras

  LOJA {
    uuid id PK
    string nome
  }

  CATEGORIA {
    uuid id PK
    string nome
  }

  SUBCATEGORIA {
    uuid id PK
    uuid categoria_id FK
    string nome
  }

  TIPO_PRODUTO {
    uuid id PK
    string nome
  }

  COLECAO {
    uuid id PK
    string nome
  }

  PRODUTO {
    uuid id PK
    string referencia
    string descricao
    enum fabricacao_propria_ou_terceiro
    decimal preco_custo
    uuid categoria_id FK
    uuid subcategoria_id FK
    uuid tipo_produto_id FK
    uuid colecao_id FK
  }

  PRODUTO_VARIACAO {
    uuid id PK
    uuid produto_id FK
    string cor
    string tamanho
    string codigo_barras UK
  }

  PRODUTO_VARIACAO_ESTOQUE {
    uuid produto_variacao_id FK
    uuid loja_id FK
    int quantidade_disponivel
    int quantidade_reservada
  }

  MOVIMENTO_ESTOQUE {
    uuid id PK
    uuid produto_variacao_id FK
    uuid loja_id FK
    string tipo_movimento
    int quantidade
    datetime ocorrido_em
    uuid referencia_pedido_id FK
    uuid loja_destino_id FK
  }

  CLIENTE {
    uuid id PK
    string tipo_pf_ou_pj
    string nome_exibicao
    string cpf_cnpj UK
    string email
    string telefone
    decimal limite_credito
    boolean bloqueado
    uuid corretor_id FK
  }

  CORRETOR {
    uuid id PK
    string nome
    string cpf UK
    decimal percentual_comissao
    boolean bloqueado
    string forma_recebimento_comissao
  }

  VENDEDOR {
    uuid id PK
    string nome
    string cpf UK
    decimal percentual_comissao_minima
    boolean bloqueado
    date data_admissao
    date data_demissao
  }

  PEDIDO {
    uuid id PK
    uuid loja_id FK
    uuid cliente_id FK
    uuid vendedor_id FK
    uuid corretor_id FK
    string status
    string modalidade
    datetime criado_em
    datetime finalizado_em
  }

  PEDIDO_ITEM {
    uuid id PK
    uuid pedido_id FK
    uuid produto_variacao_id FK
    int quantidade
    decimal preco_unitario
    decimal desconto
  }

  LANCAMENTO_COMISSAO {
    uuid id PK
    uuid pedido_id FK
    string beneficiario
    uuid vendedor_id FK
    uuid corretor_id FK
    decimal valor_ou_base
    string status
  }

  GRUPO_COBRANCA {
    uuid id PK
    string escopo
    uuid cliente_id FK
    uuid corretor_id FK
    decimal total_aberto
    string status
  }

  GRUPO_COBRANCA_PEDIDO {
    uuid grupo_id FK
    uuid pedido_id FK
  }

  PAGAMENTO {
    uuid id PK
    uuid pedido_id FK
    uuid grupo_cobranca_id FK
    string forma
    decimal valor
    datetime pago_em
  }

  PAGAMENTO_PARCELA {
    uuid id PK
    uuid pagamento_id FK
    decimal valor
    datetime vencimento
    datetime quitado_em
  }

  PARAMETRO_TROCA {
    uuid id PK
    int prazo_dias_max
    uuid colecao_id FK
    string politica
  }

  TROCA {
    uuid id PK
    uuid pedido_origem_id FK
    uuid pedido_destino_id FK
    string cenario
    datetime solicitado_em
    string status
  }
```



---

## 3. Notas rápidas de implementação

- `**PRODUTO_VARIACAO_ESTOQUE`:** pode ser derivado só de `MOVIMENTO_ESTOQUE` (materialized view ou saldo atualizado em transação). A especificação fala em **baixa só ao finalizar** o pedido: considere `quantidade_reservada` enquanto o pedido está em rascunho.
- `**CLIENTE.corretor_id`:** modela “corretor também é cliente” com um único vínculo opcional; alternativa é tabela `PESSOA` com papéis (`cliente`, `corretor`, `vendedor`) se quiser normalizar CPF uma vez só.
- `**PAGAMENTO`:** o quadro mistura “pagamento do pedido” e “quitação de grupo”; na prática pode ser uma entidade com `pedido_id` **ou** `grupo_cobranca_id` (restrição: exatamente um dos dois preenchidos, conforme regra de negócio).
- **Fiscal:** quando definirem NF-e / consignação, surgem tabelas como `nota_fiscal`, `item_nota`, vínculos com `MOVIMENTO_ESTOQUE` e `PEDIDO`.

Se quiser, no próximo passo dá para reduzir o ER a **primeira versão MVP** (menos tabelas) ou exportar para SQL (`CREATE TABLE`) no dialeto que você for usar.
