# Especificação extraída do Excalidraw

**Fonte:** link compartilhado do Excalidraw (`#json=N_PFpT0X8OQlSWmChKqCo,OTEC_kzbodftw4vejVsf4Q`).  
**Escopo:** produto, estoque, vendas (direta e consignada), pedidos, pagamentos agrupados, troca, cadastros de cliente, corretor e vendedor.

---

## 1. Fluxo de produto e loja


| Etapa         | Detalhe                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| Origem        | Produto **fabricado** ou **comprado**                                         |
| Destino       | **Vai pra loja**                                                              |
| Controle      | **Tem que ter registro de entrada**                                           |
| Movimentações | Pode ser **transferido para outra loja** ou **sair para fábrica por defeito** |


---

## 2. Vendas — visão geral

### 2.1 Venda direta

- Cliente **pega e paga na hora**.
- **Pode ou não ter corretor.**

### 2.2 Venda consignada

- Pode ocorrer **de várias formas**, incluindo:
  - **Um cliente** vai retirando ao longo do mês e **paga no final**.
  - **Vários clientes** retiram no mês com **um corretor como responsável**.

### 2.3 Formas de pagamento (requisito)

O sistema deve permitir:

- **Agrupar** todos os pedidos dos clientes e fazer **uma cobrança só**.
- **Cada cliente** pagar **o seu**.
- **Pagamento parcial** (ir quitando aos poucos durante o mês).

### 2.4 Comissão e repasses

- Gerar informação de pagamento para **corretor** e para **vendedor**.
- **Todas as vendas** geram comissão para **vendedor** e para o **corretor** (quando aplicável).

### 2.5 Papéis na venda

- **Obrigatório:** Cliente, Vendedor.
- **Opcional:** Corretor.

---

## 3. Cadastro de produto


| Campo              | Descrição                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Referência         | Código de identificação geral do produto, escolhido pelo cliente (loja)                                 |
| Descrição          | Nome do produto                                                                                         |
| Variações          | Cor e tamanho                                                                                           |
| Código de barras   | Pode ser gerado ou inserido (ex.: revenda); **um por variação**                                         |
| Tipo               | Cadastro livre pelo cliente para filtro (ex.: masculino, feminino, infantil, plus size, fitness, praia) |
| Coleção            | Cliente cadastra                                                                                        |
| Tipo de fabricação | Próprio ou terceiro                                                                                     |
| Preço de custo     | Digitado ou importado do módulo de fabricação                                                           |
| Categoria          | Cliente cadastra                                                                                        |
| Subcategoria       | Dentro da categoria; restringe mais o filtro                                                            |
| Parte fiscal       | **Posterior** (a definir depois)                                                                        |


---

## 4. Estoque

### 4.1 Entrada no estoque

- **Manual:** por código de barras ou referência.
- **Importada:** vinda da fábrica ou de outras lojas.
- **Rotina de conferência:** lista de peças pré-definidas; usuário confirma.

### 4.2 Saída de estoque

- **Transferência** para outras lojas ou fábrica.
- **Venda**.

---

## 5. Processo operacional de vendas (vendedora)

Contexto:

- **Vários clientes** entram em contato **ao mesmo tempo** com a vendedora.
- Ela **separa pedidos** conforme **disponibilidade de estoque**.
- Há quem só pede **orçamento e desiste**; outros **vão adicionando e removendo** peças do pedido.

Regras de pedido:

- Opção de **salvar pedidos** para **editar depois** **ou** **finalizar** o pedido.
- **Pedido finalizado:** **não pode mais ser alterado** e há **baixa no estoque**.

Pagamento do cliente:

- Pode pagar **no ato** ou deixar **pendente para o fim do mês**.
- Pode pagar **só parte** do valor e ir **pagando aos poucos**.

Agrupamento:

- Opção para **agrupar todas as vendas em aberto** e quitar **de uma vez**.
- Agrupamento por **cliente** ou por **corretor**.
- A venda agrupada também pode ter **pagamento parcial**.

---

## 6. Troca

- Definir **parâmetros** de troca: ex. **limite de tempo**, por **coleção**, peça da **mesma** ou **mais antiga**.
- Criar rotina específica para troca de peças que estão no **consignado** e **ainda não foram pagas** (texto original: “cosignado”).

---

## 7. Cadastro — Cliente

### 7.1 Pessoa física (PF) — obrigatório

- Nome completo  
- CPF  
- Endereço completo  
- Telefone  
- E-mail  
- Aniversário  
- Limite de crédito *(opcional; lojas que usam boleto)*  
- Bloqueado/Ativo — *recomendação: exigir **senha** para alterar esse status*

### 7.2 Pessoa jurídica (PJ) — obrigatório

- Nome fantasia  
- Razão social  
- CNPJ  
- I.E. — *campo com opção **isento** para casos especiais*  
- Endereço completo  
- Telefone  
- E-mail  
- Limite de crédito *(opcional)*  
- Bloqueado/Ativo — *mesma ideia de senha para mudança de status*  
- Nome completo do responsável  
- Telefone do responsável

---

## 8. Cadastro — Corretor

Campos obrigatórios sugeridos:

- Nome completo, CPF, endereço completo, telefone, e-mail, aniversário  
- Limite de crédito *(opcional; boleto/cheque)*  
- Bloqueado/Ativo — *senha para alterar status*  
- **Regra de negócio:** se corretor **bloqueado**, **nenhum cliente** consegue comprar **com ele**  
- **% de comissão**  
- **Forma de recebimento** da comissão: Pix, espécie, transferência  
- **Conta PIX:** tipo e dados  
- **Favorecido do Pix**  
- **Dados para transferência** (se aplicável): banco, agência, conta, favorecido, CPF ou CNPJ do favorecido

Observação no quadro: corretor pode também ser usado como **cliente** (pode ser corretor e cliente ao mesmo tempo).

---

## 9. Cadastro — Vendedor (PF)

Campos obrigatórios:

- Nome completo  
- CPF  
- Bloqueado/Ativo — *senha para alterar status*  
- Data de admissão na empresa  
- Data de demissão — *ao demitir, **some da lista** de vendedores selecionáveis*  
- **% comissão mínima**

---

## 10. Lacunas e próximos passos (não estão no quadro, úteis para implementação)

- Detalhar **parte fiscal** (“posterior”): NF-e, devolução, consignação fiscal, etc.  
- Regras exatas de **comissão** quando há só vendedor, só corretor, ou ambos.  
- Estados do pedido além de “aberto/finalizado” (ex.: cancelado, parcialmente pago).  
- Política de **estoque reservado** vs **baixa** no finalize.

---

## 11. Ajustes de texto (ortografia no original)

- “cosignado” → **consignado**  
- “posteriomente” → **posteriormente**  
- “seleionaveis” → **selecionáveis**