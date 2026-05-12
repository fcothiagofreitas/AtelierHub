# Domínio — Trocas (crédito por artigos)

## Modelo de negócio

- A troca é uma operação **centrada no cliente** e nos **artigos devolvidos**, não no corretor nem na comissão da venda original.
- **Crédito:** soma de `quantidade × valorUnitário` por linha (valor unitário é snapshot na troca; por defeito sugere-se o `precoVenda` do produto).
- **Stock:** entrada na loja (`TROCA_DEVOLUCAO`) por variação devolvida.
- **Consignado / dívida ao corretor:** não é ajustado aqui; liquidação do pedido consignado é tratada à parte.
- **Substituição / uso do crédito:** regra de produto (pagar diferença se a nova compra for maior; não permitir subutilizar crédito) aplica-se na **venda de substituição** (PDV ou fluxo futuro), não no registo desta troca.

## Legado

- Trocas antigas podem ter `pedidoOrigemId` e linhas com `pedidoItemId` (fluxo anterior). Listagens mostram o n.º do pedido origem quando existir.
- `Tenant.prazoTrocaDias` mantém-se configurável na UI por compatibilidade; o fluxo actual **troca por catálogo** (`TROCA_INDEPENDENTE`) **não** aplica esse prazo por pedido — regras de prazo são política da loja fora deste registo ou evolução futura.

## Valorização

- Linhas **independentes** usam preço de referência do catálogo (`Produto.precoVenda`) na UI; o operador pode ajustar o valor unitário antes de confirmar (acordo/política da loja).
