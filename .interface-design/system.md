# AtelierHub Interface System

## Direction and Feel

- Produto com cara de sistema operacional de loja, nao de landing interna.
- Linguagem visual de dashboard SaaS: limpa, fria, confiavel e objetiva.
- A interface deve privilegiar contexto operacional, navegacao clara e troca rapida de unidade.
- Evitar hero sections, blocos conceituais de sprint e composicoes editoriais na area autenticada.

## Domain

- Operacao multi-loja
- Vendas do dia
- Estoque em movimento
- Conferencia e transferencia
- Pendencias administrativas
- Supervisao operacional

## Color World

- Branco de painel
- Cinza frio de superficie de sistema
- Azul para acao e contexto ativo
- Verde para status positivo
- Ambar para alerta e pendencia
- Texto em grafite frio

## Signature

- Barra operacional fixa no topo do conteudo com:
  - titulo da area
  - operacao atual
  - seletor de loja persistente
  - acoes utilitarias

## Depth Strategy

- Usar `borders-only + surface shifts`
- Sombras leves apenas para elevar controles e cards importantes
- Sidebar e canvas no mesmo mundo cromatico, separados por borda

## Typography

- Fonte principal: `Inter`
- Titulos curtos, utilitarios, sem tom editorial
- Labels e metadados em caps pequenos quando precisarem ancorar hierarquia

## Spacing

- Base unit: `8px`
- Densidade media
- Evitar excesso de respiro em telas de trabalho

## Key Component Patterns

### App Shell
- Sidebar fixa com modulos reais do sistema
- Header com contexto vivo
- Conteudo principal em paineis claros com bordas discretas

### Store Switcher
- Sempre em `Select` no header
- Nunca como fluxo principal em tela separada para uso normal
- Mudanca de operacao sem tirar a pessoa da tela atual

### Dashboard
- Priorizar metricas acionaveis, pendencias e atividade recente
- Tabelas e cards devem parecer blocos de trabalho, nao showcase visual

### Surfaces
- `canvas`: fundo principal frio
- `panel`: branco
- `panel-muted`: cinza muito claro
- `control`: branco com borda suave
