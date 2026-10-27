# Catálogo de Inconsistências, Falhas, Erros e Correções Necessárias — Canário (`financeiro-app`)

> [!IMPORTANT]
> **Objetivo deste Documento:** Consolidar exclusivamente todos os **bugs, divergências contábeis, falhas de lógica, erros de banco de dados/segurança e correções necessárias** identificados na auditoria do código-fonte do sistema **Canário (`financeiro-app`)**, servindo como guia de saneamento técnico e contábil.

---

## Resumo Executivo de Criticidade

| ID | Problema / Inconsistência | Categoria | Severidade | Afeta Dados / Saldo? |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01** | Edição de recorrência sobrescreve lançamentos históricos já pagos | Bug Crítico de Dados | 🔴 Crítica | Sim (altera passado e saldo atual) |
| **INC-02** | Quatro definições conflitantes de "Faturamento do Negócio" no sistema | Inconsistência Contábil | 🔴 Crítica | Sim (totais não batem entre telas) |
| **INC-03** | Pagamento de fatura de cartão não debita nenhuma conta bancária | Falha de Modelagem Contábil | 🔴 Crítica | Sim (saldo de contas fica inflado) |
| **INC-04** | Truncamento silencioso em 1.000 registros pelo PostgREST | Falha de Confiabilidade / Escala | 🔴 Crítica | Sim (zera meses antigos acima de 1.000 linhas) |
| **INC-05** | Ticket Médio divide receita em caixa por quantidade de vendas em competência | Erro de Fórmula Matemática | 🔴 Alta | Sim (distorce ou zera ticket médio) |
| **INC-06** | Saldo atual da conta inclui transações futuras e ajuste manual reescreve o passado | Inconsistência de Saldo | 🔴 Alta | Sim (altera saldo hoje e curva histórica) |
| **INC-07** | Erro de sintaxe SQL (`public.accountsem r`) na migration `20261019220000` | Erro de Sintaxe SQL | 🟠 Alta | Quebra `supabase db reset` / novos ambientes |
| **INC-08** | `totalOverdueDebt` infla o total vencido com fiados ainda não vencidos do mesmo cliente | Bug de Cálculo | 🟠 Alta | Sim (superestima inadimplência) |
| **INC-09** | `topProducts` mistura acumulado anual com crescimento mensal e força `100%` em Janeiro | Bug de Cálculo | 🟠 Média | Sim (ranking e % de Janeiro incorretos) |
| **INC-10** | Chaves de agrupamento de clientes inconsistentes e `"Cliente Avulso"` no Top 5 Clientes | Falha de Agregação | 🟠 Média | Sim (polui ranking de clientes) |
| **INC-11** | `inactiveClientsAlerts` no Dashboard ignora o Radar de Retorno e ordena ao contrário | Inconsistência de Regra | 🟠 Média | Sim (oculta clientes mais sumidos) |
| **INC-12** | Uso exclusivo de `due_date` em vez de `paid_at` ou `transaction_date` nas agregações | Ambiguidade de Regime | 🟡 Média | Desloca mês de caixa de contas atrasadas |
| **INC-13** | Perda de centavos em compras parceladas e falta de arredondamento em pagamento parcial de fatura | Precisão Decimal | 🟡 Média | Diferença de R$ 0,01 a R$ 0,05 em parcelas |
| **INC-14** | Filtros de escopo, tipo, status e conta/cartão mortos (`hardcoded`) em `TransactionsView.tsx` | Funcionalidade Quebrada na UI | 🟡 Média | Impede filtragem no extrato web |
| **INC-15** | 8 tabelas sem `REVOKE ALL FROM anon` e FKs sem validação composta de `user_id` | Hardening de Segurança | 🟡 Média | Defesa em profundidade no banco |
| **INC-16** | Divergência entre documentação (`README.md`) e código real (Estoque e Break-even inexistentes) | Documentação Inconsistente | 🟢 Baixa | Confusão sobre funcionalidades existentes |

---

## Detalhamento Técnico e Correções Necessárias

---

### INC-01 — Edição de Recorrência Sobrescreve Lançamentos Históricos Já Pagos

- **Severidade:** 🔴 Crítica
- **Arquivo e Linha:** [`src/lib/actions/recurrences.ts:325-333`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/recurrences.ts#L325-L333)
- **O que acontece (Fato Confirmado):**
  Na função `updateRecurrence`, quando o usuário edita o valor, categoria, conta/cartão, escopo ou descrição de uma recorrência, o código pretende atualizar apenas os lançamentos futuros/pendentes (conforme o próprio comentário na linha 325), mas executa o `UPDATE` sem filtrar `.eq('is_paid', false)`:
  ```ts
  // Propaga alterações de valor, categoria, conta/cartão e descrição para lançamentos pendentes (não pagos)
  const txUpdate: Record<string, unknown> = {};
  if (input.description !== undefined) txUpdate.description = input.description.trim();
  if (input.amount !== undefined) txUpdate.amount = input.amount;
  if (input.type !== undefined) txUpdate.type = input.type;
  if (input.category_id !== undefined) txUpdate.category_id = input.category_id || null;
  if (input.account_id !== undefined) txUpdate.account_id = input.account_id || null;
  if (input.credit_card_id !== undefined) txUpdate.credit_card_id = input.credit_card_id || null;
  if (input.scope !== undefined) txUpdate.scope = input.scope;

  if (Object.keys(txUpdate).length > 0) {
    await supabase.from('transactions').update(txUpdate).eq('recurrence_id', id).eq('user_id', user.id);
  }
  ```
- **Impacto Real:**
  Se um aluguel recorrente subir de R$ 1.000,00 para R$ 1.200,00 após 10 meses de uso, editar a recorrência altera todas as 10 transações passadas já pagas para R$ 1.200,00, corrompendo os relatórios de meses anteriores e reduzindo retroativamente o saldo atual da conta bancária em R$ 2.000,00.
- **Correção Necessária:**
  1. Adicionar `.eq('is_paid', false)` na query de propagação em [`recurrences.ts:333`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/recurrences.ts#L333) para que transações já pagas (`is_paid = true`) jamais tenham seu valor (`amount`), conta (`account_id`) ou cartão (`credit_card_id`) alterados retroativamente.
  2. Adicionar teste unitário/integração garantindo que transações com `is_paid = true` permanecem intactas ao atualizar uma recorrência.

---

### INC-02 — Quatro Definições Conflitantes de "Faturamento do Negócio"

- **Severidade:** 🔴 Crítica
- **Arquivos e Linhas:**
  - [`src/lib/actions/dashboard.ts:293-318`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L293-L318) e [`455-479`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L455-L479) (`getBusinessDashboardData` — `monthSummary.revenue` e `monthlyTrend.revenue`)
  - [`src/lib/actions/dashboard.ts:600-657`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L600-L657) (`getBusinessDashboardData` — `revenueSplit`)
  - [`src/lib/actions/dashboard.ts:776-783`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L776-L783) (`getGeneralDashboardData` — `serviceRevenue`)
  - [`src/lib/actions/subscriptions.ts:292-343`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/subscriptions.ts#L292-L343) (`paySubscriptionInvoice`)
  - [`src/components/dashboard/desktop/GeneralDashboardDesktop.tsx:158-163`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/dashboard/desktop/GeneralDashboardDesktop.tsx#L158-L163) e [`src/components/dashboard/mobile/MobileSummaryView.tsx:508-518`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/dashboard/mobile/MobileSummaryView.tsx#L508-L518)
- **O que acontece (Fato Confirmado):**
  Existem **4 fórmulas diferentes** calculando a receita do negócio ao mesmo tempo:
  1. **Card "Faturamento" e Gráfico de Evolução do Negócio (`monthSummary.revenue` / `monthlyTrend.revenue`):** Soma `sales.total_amount` (apenas quando `payment_method !== 'on_credit'`) por `sale_date` **+** `sale_amortizations.amount` por `amortized_at` (Regime de Caixa restrito à tabela `sales`). **Omite completamente** as mensalidades pagas do Clube (`subscription_invoices`, que geram apenas registro em `transactions` via `paySubscriptionInvoice`) e as receitas avulsas lançadas manualmente com `scope = 'business'`.
  2. **Card "Serviços vs Produtos" (`revenueSplit`):** Na mesma tela, soma `sale_items.total_price` de **todas** as vendas do mês por `sale_date` (Regime de Competência Bruto), incluindo vendas `on_credit` (fiado) ainda não pagas e ignorando amortizações recebidas de vendas de meses anteriores.
  3. **`serviceRevenue` em `getGeneralDashboardData`:** Soma `sales.total_amount` de todas as vendas do mês (incluindo fiados não pagos).
  4. **Visão Geral Desktop e Modos Semanal/Anual Mobile:** Filtra a tabela `transactions` por `isBarbeariaServiceIncome(t)` e `due_date` (`is_paid = true`), o que inclui mensalidades do clube e receitas manuais do negócio.
- **Impacto Real:**
  - A soma `Serviços + Produtos` (`revenueSplit`) não bate com o card `Faturamento` (`monthSummary.revenue`) na mesma tela.
  - Um negócio com R$ 2.000,00 recebidos em mensalidades do Clube vê esse valor no saldo da conta e no extrato, mas vê **R$ 0,00** desse valor no Faturamento, Lucro e Margem do Dashboard do Negócio (no modo mensal).
- **Correção Necessária:**
  1. Unificar a função de cálculo de receita do negócio (após decisão humana sobre inclusão de mensalidades do clube e receitas `scope = 'business'`).
  2. Padronizar o regime contábil entre o Faturamento Total e o `revenueSplit` (ou expor explicitamente "Receita Bruta Vendida" vs "Receita Efetivamente Recebida em Caixa").

---

### INC-03 — Pagamento de Fatura de Cartão de Crédito Não Debita Conta Bancária

- **Severidade:** 🔴 Crítica
- **Arquivos e Linhas:**
  - [`src/lib/actions/credit-cards.ts:254-390`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/credit-cards.ts#L254-L390) (`setCreditCardInvoicePaid` e `payCreditCardInvoiceAmount`)
  - [`src/components/credit-cards/PayInvoiceModal.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/credit-cards/PayInvoiceModal.tsx)
  - [`supabase/migrations/20261019230000_sql_aggregates.sql:20-59`](file:///home/alexandrerangel/Projetos/financeiro-app/supabase/migrations/20261019230000_sql_aggregates.sql#L20-L59) (`get_account_aggregates`)
- **O que acontece (Fato Confirmado):**
  - Lançamentos de cartão de crédito são criados em `transactions` com `credit_card_id = card.id`, `account_id = null` e `is_paid = false`.
  - Ao pagar a fatura do cartão, `setCreditCardInvoicePaid` e `payCreditCardInvoiceAmount` apenas atualizam `is_paid = true` e `paid_at` nessas transações de cartão (`account_id` permanece `null`).
  - Como `get_account_aggregates` e `get_account_prior_balance` calculam o saldo das contas bancárias somando apenas transações com `account_id IS NOT NULL`, **o pagamento da fatura do cartão nunca reduz o saldo de nenhuma conta bancária**.
- **Impacto Real:**
  O usuário que concentra seus gastos no cartão de crédito e paga a fatura pelo aplicativo vê suas despesas pagas subirem no resumo, mas o saldo da sua conta corrente (`current_balance`) continua intacto como se o dinheiro nunca tivesse saído do banco, obrigando-o a fazer ajustes manuais de saldo todo mês.
- **Correção Necessária:**
  1. Permitir selecionar a conta bancária pagadora (`account_id`) no modal de pagamento de fatura ([`PayInvoiceModal.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/credit-cards/PayInvoiceModal.tsx)).
  2. Ao quitar/amortizar a fatura, vincular o abatimento ao saldo da conta escolhida (seja preenchendo `account_id` nas transações de cartão quitadas ou registrando movimentação de pagamento de fatura que afete `get_account_aggregates` sem duplicar despesas por categoria no Dashboard).

---

### INC-04 — Truncamento Silencioso em 1.000 Registros pelo PostgREST

- **Severidade:** 🔴 Crítica
- **Arquivos e Linhas:**
  - [`src/lib/actions/dashboard.ts:242-281`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L242-L281) (`getBusinessDashboardData`)
  - [`src/lib/actions/dashboard.ts:747-768`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L747-L768) (`getGeneralDashboardData`)
  - [`src/lib/actions/sales.ts:52-65`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/sales.ts#L52-L65) (`getSales`)
  - [`src/lib/actions/clients.ts:37-46`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/clients.ts#L37-L46) (`getClients`)
  - [`src/lib/actions/credit-cards.ts:62-67`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/credit-cards.ts#L62-L67) (`getCreditCards`)
- **O que acontece (Fato Confirmado):**
  O Supabase/PostgREST aplica por padrão `max_rows = 1000` em qualquer `SELECT` que não pagine explicitamente com `.range()`.
  - Em `dashboard.ts`, o sistema busca todas as vendas (`sales`) e transações (`transactions`) do ano inteiro ordenadas por data `DESC` (`order('sale_date', { ascending: false })` e `order('due_date', { ascending: false })`) para somá-las em memória no Node.js.
  - Em `getSales()` ([`sales.ts:52`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/sales.ts#L52)), a query busca **todas as vendas de todos os tempos** sem filtro de data.
  - Em `getClients()` ([`clients.ts:37`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/clients.ts#L37)), a query embute `sales(...)` de todos os tempos para todos os clientes.
- **Impacto Real:**
  Assim que um usuário ultrapassar 1.000 vendas ou 1.000 transações em um ano (~2,7 por dia), os registros mais antigos daquele ano (janeiro, fevereiro, março...) são cortados silenciosamente da resposta do banco, fazendo com que os gráficos anuais mostrem **R$ 0,00** nos primeiros meses do ano e distorcendo médias anuais.
- **Correção Necessária:**
  1. Mover as agregações mensais/anuais do Dashboard para RPCs SQL no PostgreSQL (`GROUP BY` no banco, que processa qualquer volume de linhas sem trafegar registros brutos pelo limite do PostgREST).
  2. Adicionar filtro de período (`year`/`month`) ou paginação incremental (`.range()`) em `getSales()` e nas queries que realmente precisem de listagem de itens.

---

### INC-05 — Ticket Médio com Numerador em Caixa e Denominador em Competência

- **Severidade:** 🔴 Alta
- **Arquivos e Linhas:**
  - [`src/lib/actions/dashboard.ts:483-484`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L483-L484)
  - [`src/components/sales/SalesView.tsx:111`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/sales/SalesView.tsx#L111)
- **O que acontece (Fato Confirmado):**
  ```ts
  averageTicket: monthSalesCount > 0 ? Math.round((monthRevenue / monthSalesCount) * 100) / 100 : 0
  ```
  - `monthRevenue` soma apenas o que entrou em caixa no mês (exclui vendas no fiado feitas no mês e inclui amortizações de fiados de meses passados).
  - `monthSalesCount` conta todas as vendas realizadas no mês (inclusive vendas 100% no fiado).
- **Impacto Real:**
  - Cenário 1: O usuário faz 2 atendimentos de R$ 80,00 no fiado no início do mês. O sistema mostra `2 atendimentos` e `Ticket Médio: R$ 0,00`.
  - Cenário 2: O usuário faz 1 atendimento à vista de R$ 50,00 hoje e recebe no mesmo dia R$ 400,00 de quitação de fiados do mês passado. O sistema mostra `1 atendimento` e `Ticket Médio: R$ 450,00`.
- **Correção Necessária:**
  Calcular o Ticket Médio sobre o valor total contratado/vendido das vendas do período (`SUM(sale.total_amount) / monthSalesCount`), mantendo numerador e denominador na mesma base de vendas realizadas no período.

---

### INC-06 — Saldo Atual da Conta Inclui Transações Futuras e Ajuste Manual Reescreve o Passado

- **Severidade:** 🔴 Alta
- **Arquivos e Linhas:**
  - [`supabase/migrations/20261019230000_sql_aggregates.sql:20-59`](file:///home/alexandrerangel/Projetos/financeiro-app/supabase/migrations/20261019230000_sql_aggregates.sql#L20-L59) (`get_account_aggregates`)
  - [`src/lib/actions/transactions.ts:156`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/transactions.ts#L156) (`createTransaction`)
  - [`src/lib/actions/accounts.ts:181-235`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/accounts.ts#L181-L235) (`updateAccountBalance`)
- **O que acontece (Fato Confirmado):**
  1. Em `createTransaction`, qualquer lançamento que não seja cartão de crédito recebe `is_paid = input.is_paid ?? true` por padrão, mesmo que `due_date` ou `transaction_date` seja uma data futura. E `get_account_aggregates` soma todas as linhas com `is_paid = true` sem checar data.
  2. Em `updateAccountBalance(id, newBalance)`, o sistema altera `accounts.initial_balance = newBalance - transactionSum`. Como `get_account_prior_balance(p_before)` usa `initial_balance` como saldo na origem dos tempos, corrigir o saldo da conta hoje altera o saldo exibido em janeiro, fevereiro e todos os meses passados no gráfico "Evolução do Saldo em Conta".
- **Correção Necessária:**
  1. Em `createTransaction`, quando a data informada for futura (`> getBrazilTodayISO()`), definir o padrão de `is_paid` como `false` (a menos que explicitamente marcado como já pago pelo usuário).
  2. Em `updateAccountBalance`, criar uma transação de ajuste (`Reajuste de Saldo`) na data atual com a diferença (`delta = newBalance - currentBalance`) em vez de mutar `accounts.initial_balance` (ou permitir escolher entre corrigir saldo inicial vs lançar ajuste na data atual).

---

### INC-07 — Erro de Sintaxe SQL na Migration `20261019220000_account_yield_and_interest.sql`

- **Severidade:** 🟠 Alta
- **Arquivo e Linha:** [`supabase/migrations/20261019220000_account_yield_and_interest.sql:6`](file:///home/alexandrerangel/Projetos/financeiro-app/supabase/migrations/20261019220000_account_yield_and_interest.sql#L6)
- **O que acontece (Fato Confirmado):**
  A linha 6 possui um erro de digitação no nome da tabela:
  ```sql
  ALTER TABLE public.accountsem r
    ADD COLUMN IF NOT EXISTS yield_type TEXT NOT NULL DEFAULT 'none'
      CHECK (yield_type IN ('none', 'cdi_percent', 'monthly_percent')),
    ADD COLUMN IF NOT EXISTS yield_rate NUMERIC(6, 2) NOT NULL DEFAULT 0;
  ```
- **Impacto Real:**
  Qualquer tentativa de recriar o banco a partir das migrations (`supabase db reset`, ambiente de staging ou CI/CD) falha imediatamente com erro de sintaxe (`ERROR: syntax error at or near "r"` / `relation "public.accountsem" does not exist`).
- **Correção Necessária:**
  Corrigir a linha 6 de [`20261019220000_account_yield_and_interest.sql`](file:///home/alexandrerangel/Projetos/financeiro-app/supabase/migrations/20261019220000_account_yield_and_interest.sql#L6) para `ALTER TABLE public.accounts`.

---

### INC-08 — `totalOverdueDebt` Soma Dívidas Não Vencidas de Clientes que Têm Uma Venda Vencida

- **Severidade:** 🟠 Alta
- **Arquivo e Linha:** [`src/lib/actions/sales.ts:764-782`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/sales.ts#L764-L782)
- **O que acontece (Fato Confirmado):**
  Em `getPendingDebtsSummary()`:
  ```ts
  if (isClientOverdue) {
    overdueClientsCount += 1;
    totalOverdueDebt += client.totalDebt;
  }
  ```
  Se o Cliente A possui uma venda vencida de R$ 30,00 (vencimento na semana passada) e uma nova venda a prazo de R$ 200,00 (vencimento para o mês que vem), `isClientOverdue` é `true` e o sistema soma os **R$ 230,00** inteiros em `totalOverdueDebt`.
- **Impacto Real:**
  O card "Total em Atraso / Vencido" na tela `/fiados` e nos alertas superestima o valor realmente vencido.
- **Correção Necessária:**
  Somar em `totalOverdueDebt` apenas o `remaining_amount` das vendas individuais cujo `due_date < today` (e não o `client.totalDebt` inteiro).

---

### INC-09 — `topProducts` Mistura Acumulado Anual com Crescimento Mensal e Força `100%` em Janeiro

- **Severidade:** 🟠 Média
- **Arquivo e Linha:** [`src/lib/actions/dashboard.ts:320-344, 564-580`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L564-L580)
- **O que acontece (Fato Confirmado):**
  1. No loop sobre `sales` ([`dashboard.ts:320-344`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L320-L344)), `productStatsMap` acumula `totalQuantity` e `totalRevenue` para **todas as vendas do ano** (inclusive dias de borda fora do ano), sem filtrar `isTargetMonth`. Porém, na mesma estrutura, `growth` compara `currentMonthCount` vs `prevMonthCount`.
  2. Quando o usuário visualiza o mês de **Janeiro** (`currentMonth === 0`), `m === currentMonth - 1` verifica `m === -1`, o que nunca é verdadeiro (`getMonth()` retorna `0..11`). Logo, `prevMonthCount` é sempre `0` e o crescimento de todos os produtos em Janeiro é exibido como `+100%`.
- **Correção Necessária:**
  1. Filtrar `totalQuantity` e `totalRevenue` de `topProducts` pelo período selecionado (mês no modo mensal; ano no modo anual).
  2. Para Janeiro (`currentMonth === 0`), comparar `currentMonthCount` com Dezembro do ano anterior (`year - 1`, `month = 11`) ou retornar `growth = null` quando não houver base do mês anterior na consulta.

---

### INC-10 — Chaves de Agrupamento de Clientes Inconsistentes e `"Cliente Avulso"` no Top 5 Clientes

- **Severidade:** 🟠 Média
- **Arquivos e Linhas:**
  - [`src/lib/actions/dashboard.ts:495`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L495) (`uniqueClientsCount`)
  - [`src/lib/actions/dashboard.ts:612-625, 659-675`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L612-L625) (`topClients`)
  - [`src/lib/actions/sales.ts:731`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/sales.ts#L731) (`getPendingDebtsSummary`)
- **O que acontece (Fato Confirmado):**
  - `uniqueClientsCount` usa `(s.client_id || s.client_name || '').trim().toLowerCase()`. Se um cliente cadastrado (`client_id`) teve uma venda antiga registrada apenas pelo nome (`client_id = null`), ele é contado como 2 clientes distintos.
  - `topClients` ignora `client_id` e agrupa por `(s.client_name || 'Cliente Avulso').trim()` (case-sensitive). Todas as vendas sem cliente identificado são somadas juntas sob `'Cliente Avulso'`, fazendo com que `"Cliente Avulso"` apareça no topo do ranking de melhores clientes do mês.
- **Correção Necessária:**
  1. Agrupar clientes de forma canônica por `client_id` (com fallback para `client_name.trim().toLowerCase()`), mantendo o nome de exibição original.
  2. Excluir vendas sem cliente identificado (`!s.client_id && (!s.client_name || s.client_name.trim().toLowerCase() === 'cliente avulso')`) do ranking `topClients`.

---

### INC-11 — `inactiveClientsAlerts` no Dashboard Ignora o Radar de Retorno e Ordena ao Contrário

- **Severidade:** 🟠 Média
- **Arquivo e Linha:** [`src/lib/actions/dashboard.ts:678-692`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L678-L692)
- **O que acontece (Fato Confirmado):**
  ```ts
  if (daysSince >= 30) {
    inactiveClientsAlerts.push({ ... });
  }
  inactiveClientsAlerts.sort((a, b) => a.daysSinceLastVisit - b.daysSinceLastVisit);
  const finalInactiveAlerts = inactiveClientsAlerts.slice(0, 5);
  ```
  - Ignora o algoritmo oficial [`analyzeClientSales`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/client-analytics.ts) e o `default_cycle_days` configurado pelo negócio em `business_profiles`.
  - Olha apenas para vendas dentro do ano consultado (se estamos em janeiro, não vê vendas de dezembro do ano anterior).
  - Ordena de forma crescente (`a - b`) e corta nos 5 primeiros, mostrando apenas os clientes com 30–32 dias e escondendo clientes há 45 ou 60 dias sem aparecer.
- **Correção Necessária:**
  Unificar `inactiveClientsAlerts` do Dashboard com a função [`analyzeClientSales`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/client-analytics.ts), respeitando `default_cycle_days` e o silenciamento de 7 dias (`last_contacted_at`).

---

### INC-12 — Uso Exclusivo de `due_date` em Vez de `paid_at` ou `transaction_date` nas Agregações

- **Severidade:** 🟡 Média
- **Arquivos e Linhas:**
  - [`src/lib/actions/dashboard.ts:279, 435, 750, 788`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/dashboard.ts#L788)
  - [`src/lib/actions/transactions.ts:63`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/transactions.ts#L63)
  - [`src/lib/category-evolution-utils.ts:251`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/category-evolution-utils.ts#L251)
- **O que acontece (Fato Confirmado):**
  Todas as consultas de `transactions` filtram e agrupam os meses exclusivamente por `due_date`.
  - Se uma conta venceu em `28/10/2026`, mas foi paga com atraso em `03/11/2026` (`paid_at = 2026-11-03`), ao ser marcada como `is_paid = true`, ela altera o total realizado e o saldo de **Outubro**, e não de Novembro.
  - Nas compras de cartão de crédito, o gasto entra no mês de vencimento da fatura (`due_date`), que pode ser 1 a 2 meses após a data da compra (`transaction_date`).
- **Correção / Decisão Necessária:**
  Definir se o agrupamento por `due_date` (competência do vencimento) deve ser mantido como padrão ou se o usuário/assistente deve poder alternar entre data de vencimento (`due_date`), data de pagamento (`paid_at`) e data de compra (`transaction_date`).

---

### INC-13 — Perda de Centavos em Parcelamentos e Falta de Arredondamento em Amortização Parcial de Cartão

- **Severidade:** 🟡 Média
- **Arquivos e Linhas:**
  - [`src/lib/actions/transactions.ts:107-128`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/transactions.ts#L107-L128) (`createTransaction`)
  - [`src/lib/actions/credit-cards.ts:366-374`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/credit-cards.ts#L366-L374) (`payCreditCardInvoiceAmount`)
- **O que acontece (Fato Confirmado):**
  1. Em `createTransaction`:
     ```ts
     const installmentAmount = Math.round((input.amount / totalInstallments) * 100) / 100;
     ```
     Todas as `N` parcelas recebem `installmentAmount`. Em uma compra de R$ 100,00 em 3x, são criadas 3 parcelas de R$ 33,33 (totalizando R$ 99,99, perdendo R$ 0,01). Em R$ 100,00 em 6x, são 6 parcelas de R$ 16,67 (totalizando R$ 100,02, criando R$ 0,02 a mais).
  2. Em `payCreditCardInvoiceAmount`:
     ```ts
     const residualAmount = txAmount - remainingToPay;
     ```
     Subtração direta em ponto flutuante IEEE 754 sem `Math.round((txAmount - remainingToPay) * 100) / 100`.
- **Correção Necessária:**
  1. Ajustar a 1ª parcela (ou última parcela) com `Math.round((input.amount - installmentAmount * (totalInstallments - 1)) * 100) / 100`, garantindo que `SUM(parcelas) === input.amount`.
  2. Arredondar `residualAmount` para 2 casas decimais em `payCreditCardInvoiceAmount`.

---

### INC-14 — Filtros Desativados (`hardcoded`) na Tela Web de Extrato (`TransactionsView.tsx`)

- **Severidade:** 🟡 Média
- **Arquivo e Linha:** [`src/components/transactions/TransactionsView.tsx:106-107`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/transactions/TransactionsView.tsx#L106-L107)
- **O que acontece (Fato Confirmado):**
  ```ts
  const filter: FilterType = 'all';
  const selectedSourceId = 'all';
  ```
  Ambas as variáveis estão fixadas em `'all'` sem `useState` nem controles visuais. Embora [`filterTransactionsList`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/transaction-filter-utils.ts) implemente e teste filtros por `business`, `personal`, `expense`, `income`, `credit`, `pending`, `acc:<id>` e `card:<id>`, eles estão inacessíveis na página `/transacoes`.
- **Correção Necessária:**
  Transformar `filter` e `selectedSourceId` em estados (`useState`) conectados a seletores de filtro na barra de ferramentas de [`TransactionsView.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/transactions/TransactionsView.tsx).

---

### INC-15 — Hardening de Permissões `anon` em 8 Tabelas e FKs Simples

- **Severidade:** 🟡 Média
- **Arquivos e Linhas:**
  - [`supabase/migrations/20260403182000_atomic_sales_and_safeguards.sql:17-26`](file:///home/alexandrerangel/Projetos/financeiro-app/supabase/migrations/20260403182000_atomic_sales_and_safeguards.sql#L17-L26)
- **O que acontece (Fato Confirmado):**
  1. Apenas 9 das 17 tabelas possuem `REVOKE ALL ON TABLE ... FROM anon`. As 8 tabelas criadas em migrações posteriores (`sale_amortizations`, `subscription_plans`, `client_subscriptions`, `subscription_invoices`, `notifications`, `user_notification_preferences`, `business_profiles`, `business_message_settings`) dependem apenas do RLS para bloquear o papel `anon`.
  2. As Foreign Keys entre tabelas (ex.: `transactions.account_id -> accounts.id`, `transactions.category_id -> categories.id`) não impõem no nível do constraint SQL que `transactions.user_id = accounts.user_id`.
- **Correção Necessária:**
  Criar migration complementar aplicando `REVOKE ALL ON TABLE ... FROM anon` nas 8 tabelas restantes e validando propriedade (`user_id`) nas mutações.

---

### INC-16 — Divergência entre Documentação (`README.md`) e Código Real

- **Severidade:** 🟢 Baixa
- **Arquivo e Linha:** [`README.md:48, 86`](file:///home/alexandrerangel/Projetos/financeiro-app/README.md#L48)
- **O que acontece (Fato Confirmado):**
  O `README.md` afirma que o módulo `/produtos` possui *"controle de estoque baixo ($\le 2$), custo de reposição"* e que o Dashboard possui *"Ponto de Equilíbrio (Break-even)"*. Nenhuma dessas funcionalidades ou colunas existe nas tabelas `products`/`transactions` ou nos componentes do projeto.
- **Correção Necessária:**
  Alinhar o `README.md` com o escopo real implementado (ou implementar formalmente os campos de estoque/custo caso desejado no roadmap do produto).

