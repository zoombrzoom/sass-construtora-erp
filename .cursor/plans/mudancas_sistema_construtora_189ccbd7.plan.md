---
name: Mudancas Sistema Construtora
overview: Plano para implementar 14 mudanças no sistema de gestão da construtora, incluindo melhorias de UX, reorganização de menus, novos módulos (Documentos, Caixinha), correções de bugs e ajustes de permissões.
todos:
  - id: fix-dates
    content: Preencher campos de data com mes/ano atual automaticamente em todos os formularios
    status: completed
  - id: auto-paid-receipt
    content: Mudar status para pago ao anexar comprovante no ContaPagarForm
    status: completed
  - id: currency-format
    content: Corrigir formatacao de moeda para usar ponto de milhar (10.000,00) em sanitize/format/parse
    status: completed
  - id: show-description
    content: Mostrar descricao e resumo de requisicao nas contas a pagar (listagem e formulario)
    status: completed
  - id: bank-autocomplete
    content: Salvar dados bancarios ja usados e oferecer autocomplete (nova colecao Firestore)
    status: completed
  - id: rename-requisicoes
    content: Renomear Requisicoes para Pedidos e Compras e remover Pedidos/Recebimentos do menu Compras
    status: completed
  - id: fix-valor-field
    content: Corrigir campo de valor na requisicao para permitir entrada livre
    status: completed
  - id: requisicoes-filters
    content: Adicionar filtros por periodo, obra, status e busca em Pedidos e Compras
    status: completed
  - id: requisicoes-batch
    content: Adicionar checkboxes de pedido/aprovacao e edicao em lote em Pedidos e Compras
    status: completed
  - id: documents-module
    content: Criar modulo Documentos e Contratos com controle de visibilidade por role
    status: completed
  - id: particular-category
    content: Adicionar categoria Particular em contas a pagar com acesso para atendimento@majollo.com.br
    status: completed
  - id: caixinha
    content: Criar funcionalidade de caixinha mensal do escritorio (R$600) com controle de gastos
    status: completed
  - id: fix-obra-name
    content: Corrigir exibicao do nome da obra em contas a pagar (mostra ID em vez do nome)
    status: completed
  - id: enable-editing
    content: Permitir edicao em contas pessoais (lancamentos) e na aba geral de contas a pagar
    status: completed
isProject: false
---

# Plano de Mudancas no Sistema Construtora

## 1. Preencher datas automaticamente com mes/ano atual

**Arquivos:** `[ContaPagarForm.tsx](src/components/modules/financeiro/ContaPagarForm.tsx)`, `[ContaReceberForm.tsx](src/components/modules/financeiro/ContaReceberForm.tsx)`, `[FolhaPagamentoForm.tsx](src/components/modules/financeiro/FolhaPagamentoForm.tsx)`, `[RequisicaoForm.tsx](src/components/modules/compras/RequisicaoForm.tsx)`

- Em todos os formularios que tenham campos de data (vencimento, emissao, etc.), preencher com a data atual quando for um novo cadastro (nao na edicao)
- Exemplo atual em ContaPagarForm: `useState(conta?.dataVencimento ? toInputDate(...) : '')` -> mudar para `useState(conta?.dataVencimento ? toInputDate(...) : toInputDate(new Date()))`
- Aplicar o mesmo padrao a todos os campos de data em formularios de criacao

---

## 2. Anexar comprovante muda status para "pago" automaticamente

**Arquivo:** `[ContaPagarForm.tsx](src/components/modules/financeiro/ContaPagarForm.tsx)`

- No handler de upload do comprovante (`comprovanteUrl`), apos upload bem-sucedido, chamar `handleStatusChange('pago')` automaticamente
- Isso ja preenche `dataPagamento` e `formaPagamento` por padrao (logica existente no `handleStatusChange`)
- O usuario pode alterar manualmente depois, pois o campo de status continua editavel

---

## 3. Formato de moeda com ponto para milhar (10.000,00)

**Arquivo:** `[src/utils/currency.ts](src/utils/currency.ts)`

A funcao `formatCurrencyInput` atual retorna `"10000,50"` sem separador de milhar. Corrigir para:

```typescript
export function formatCurrencyInput(value: number | string): string {
  const parsed = typeof value === 'number' ? value : parseCurrencyInput(value)
  const [intPart, decPart] = parsed.toFixed(2).split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedInt},${decPart}`
}
```

A funcao `sanitizeCurrencyInput` atualmente converte `.` em `,` (linha 5), o que quebra a entrada de `10.000,00`. Precisa ser ajustada para:

- Manter pontos que sao separadores de milhar (antes da virgula)
- Remover pontos que sobram apos a virgula
- A funcao `parseCurrencyInput` ja lida com o formato `10.000,50` corretamente (remove pontos, troca virgula por ponto)

---

## 4. Mostrar descricao nas contas a pagar + resumo da requisicao vinculada

**Arquivos:** `[contas-pagar/page.tsx](src/app/\\(dashboard)`/financeiro/contas-pagar/page.tsx), `[ContaPagarForm.tsx](src/components/modules/financeiro/ContaPagarForm.tsx)`

- Na listagem de contas a pagar, adicionar a descricao (`conta.descricao`) ao lado do valor para cada conta
- No formulario, ao selecionar uma requisicao vinculada, mostrar um resumo dos itens da requisicao (descricoes + quantidades) alem do codigo

---

## 5. Salvar dados bancarios para preenchimento automatico

**Novo arquivo:** `src/lib/db/dadosBancarios.ts`

- Criar colecao `dados_bancarios` no Firestore para armazenar banco, agencia, conta, chavePix previamente usados
- Ao salvar uma conta a pagar, gravar/atualizar os dados bancarios do favorecido
- No `ContaPagarForm`, ao preencher o campo "Banco", oferecer autocomplete com dados ja utilizados (usando datalist do HTML ou lista de sugestoes)
- Campos a salvar: banco, agencia, conta, chavePix, favorecido (como chave)

---

## 6. Renomear "Requisicoes" para "Pedidos e Compras" e remover Pedidos/Recebimentos do menu

**Arquivos:** `[DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx)`, paginas de requisicoes

Menu Compras atual:

- Requisicoes -> **Renomear para "Pedidos e Compras"**
- Cotacoes -> **Manter**
- Pedidos -> **Remover do menu**
- Recebimentos -> **Remover do menu**

Alterar `menuItems` em `DashboardLayout.tsx`:

```typescript
{ 
  label: 'Compras', 
  icon: ShoppingCart,
  children: [
    { href: '/compras/requisicoes', label: 'Pedidos e Compras' },
    { href: '/compras/cotacoes', label: 'Cotações' },
  ]
}
```

Atualizar os titulos nas paginas de requisicoes para "Pedidos e Compras".

---

## 7. Corrigir campo de valor na requisicao (permitir escrever livremente)

**Arquivo:** `[RequisicaoForm.tsx](src/components/modules/compras/RequisicaoForm.tsx)`

- O campo de valor unitario esta usando `sanitizeCurrencyInput` que remove caracteres e limita a entrada
- Com a correcao do item 3 (formato 10.000,00), o `sanitizeCurrencyInput` precisa parar de converter `.` em `,` indiscriminadamente
- Garantir que o campo `type="text"` com `inputMode="decimal"` aceite valores completos como `10.000,00`

---

## 8. Filtros em Pedidos e Compras (requisicoes)

**Arquivo:** `[compras/requisicoes/page.tsx](src/app/\\(dashboard)`/compras/requisicoes/page.tsx)

- Adicionar filtros similares aos de contas a pagar:
  - **Periodo**: data inicio / data fim
  - **Obra**: dropdown com obras disponiveis
  - **Status**: pendente, em_cotacao, aprovado, comprado, entregue
  - **Busca**: campo de texto para pesquisar por descricao dos itens
- Utilizar o `getRequisicoes(filters)` existente que ja aceita `obraId` e `status`
- Adicionar filtro de periodo no lado do cliente (comparando `createdAt`)

---

## 9. Checkboxes de status e edicao em lote em Pedidos e Compras

**Arquivo:** `[compras/requisicoes/page.tsx](src/app/\\(dashboard)`/compras/requisicoes/page.tsx), `[src/types/compras.ts](src/types/compras.ts)`

- Adicionar novos campos de controle ao tipo `Requisicao`:
  - `pedido: boolean` (ja foi pedido)
  - `aprovado: boolean` (aprovado para compra)
- Na listagem, mostrar checkboxes para cada status
- Adicionar botao "Editar em Lote" que permite selecionar multiplas requisicoes e alterar status/flags de uma vez
- Usar selecao com checkboxes (similar ao batch edit ja existente em contas a pagar)

---

## 10. Novo menu: Documentos e Contratos

**Novos arquivos:**

- `src/app/(dashboard)/documentos/page.tsx`
- `src/lib/db/documentos.ts`
- `src/types/documentos.ts` (ou adicionar em tipo existente)

**Estrutura:**

- Novo item no menu principal com icone FileText
- Admins podem subir documentos com visibilidade "admin_only" ou "publico"
- Demais cargos so podem subir documentos "publico"
- Na listagem, filtrar documentos baseado na role do usuario
- Campos: nome, descricao, arquivo (upload), visibilidade, obra (opcional), categoria (contrato, documento, etc.)

**Permissoes:** Adicionar `canViewPrivateDocuments: boolean` em `[types.ts](src/lib/permissions/types.ts)` e `[check.ts](src/lib/permissions/check.ts)` (true para admin)

---

## 11. Categoria "Particular" em contas a pagar + acesso para [atendimento@majollo.com.br](mailto:atendimento@majollo.com.br)

**Arquivos:** `[contas-pagar/page.tsx](src/app/\\(dashboard)`/financeiro/contas-pagar/page.tsx), `[check.ts](src/lib/permissions/check.ts)`, `[types.ts](src/lib/permissions/types.ts)`

- Adicionar "Particular" como nova categoria na sidebar de contas a pagar (junto com Geral, Escritorio, etc.)
- Adicionar tipo `'particular'` ao enum de tipos de conta
- Em `[types.ts](src/lib/permissions/types.ts)`: adicionar `canAccessContasParticulares: boolean`
- Em `[check.ts](src/lib/permissions/check.ts)`: dar acesso a admins e ao email `atendimento@majollo.com.br`
- Filtrar contas do tipo "particular" para so aparecer para usuarios com permissao

---

## 12. Caixinha mensal do escritorio (R$600)

**Novos arquivos:**

- `src/app/(dashboard)/financeiro/caixinha/page.tsx`
- `src/lib/db/caixinha.ts`

**Estrutura:**

- Colecao `caixinha` com documento mensal: `{ mes, ano, valorInicial: 600, gastos: [...], saldo }`
- Cada gasto: `{ descricao, valor, data, criadoPor }`
- Pagina mostra: valor total da caixinha, gastos do mes, saldo restante
- Campo configuravel para o valor mensal (default 600)
- Acesso: secretaria (role secretaria ou email especifico) + admins
- Adicionar ao menu Financeiro ou como item separado

**Permissao:** Adicionar `canAccessCaixinha: boolean` em permissions (admin + secretaria/financeiro)

---

## 13. Corrigir nome da obra em contas a pagar (mostra ID em vez do nome)

**Arquivo:** `[contas-pagar/page.tsx](src/app/\\(dashboard)`/financeiro/contas-pagar/page.tsx)

- Na listagem, o codigo atual mostra `Obra ID: {conta.obraId.slice(0, 8)}...` (linha ~563)
- Ja existe o array `obras` carregado no estado do componente
- Corrigir para: `obras.find(o => o.id === conta.obraId)?.nome || conta.obraId`
- Aplicar o mesmo padrao na sidebar de categorias por obra

---

## 14. Permitir edicao em contas pessoais e na aba geral de contas a pagar

**Arquivos:** `[contas-pessoais/page.tsx](src/app/\\(dashboard)`/financeiro/contas-pessoais/page.tsx), `[contas-pagar/page.tsx](src/app/\\(dashboard)`/financeiro/contas-pagar/page.tsx)

**Contas Pessoais:**

- Atualmente so permite toggle pago/nao pago e deletar
- Adicionar botao de editar em cada lancamento (icone de lapis)
- Ao clicar, transformar a linha em modo edicao inline (valor, descricao editaveis)
- Botao de salvar/cancelar

**Contas a Pagar (aba Geral):**

- Atualmente so tem link "Ver Detalhes" que leva a pagina de detalhe, depois "Editar"
- Adicionar botao "Editar" direto na listagem (link para `/financeiro/contas-pagar/${id}/editar`)
- Ou opcao de edicao inline para campos rapidos (status, data pagamento)

---

## Ordem de implementacao sugerida

Agrupar por dependencia e complexidade:

1. **Correcoes rapidas** (items 1, 3, 7, 13) - baixa complexidade, sem dependencias
2. **Melhorias de UX** (items 2, 4, 14) - media complexidade
3. **Reorganizacao de menu** (item 6) - media complexidade, renomear e remover
4. **Filtros e batch** (items 8, 9) - media/alta complexidade
5. **Dados bancarios autocomplete** (item 5) - media complexidade, novo modulo DB
6. **Permissoes e particular** (item 11) - media complexidade, toca em permissoes
7. **Novos modulos** (items 10, 12) - alta complexidade, novas paginas e colecoes

