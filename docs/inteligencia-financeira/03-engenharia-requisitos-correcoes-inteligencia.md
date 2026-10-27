# Engenharia de Requisitos & Plano Técnico — Saneamento Contábil e Evolução Analítica (`INC-01` a `INC-16`)

> [!IMPORTANT]
> **Status:** Especificação de Requisitos Alinhada com o Usuário (27/10/2026). Este documento registra todas as decisões de negócio e regras contábeis definidas na etapa de Engenharia de Requisitos Interativa para resolver integralmente os itens `INC-01` a `INC-16`.

---

## 1. Regras de Negócio Definidas (Decisões Consolidadas)

### RN-01 — Proteção do Histórico em Recorrências (`INC-01`)
- Ao editar qualquer campo de uma recorrência (`description`, `amount`, `type`, `category_id`, `account_id`, `credit_card_id`, `scope`), a propagação para a tabela `transactions` deve aplicar obrigatoriamente `.eq('is_paid', false)`.
- Lançamentos já pagos (`is_paid = true`) jamais são alterados retroativamente.

### RN-02 — Unificação do Faturamento do Negócio em Regime de Caixa (`INC-02`)
- O **Faturamento do Negócio** (`monthSummary.revenue` e `monthlyTrend.revenue`) opera oficialmente em **Regime de Caixa** e passa a somar as **4 fontes reais de entrada do negócio** no período:
  1. **Vendas à vista** (`sales.payment_method !== 'on_credit'`, pela data `sale_date`);
  2. **Amortizações e entradas de fiados** (`sale_amortizations.amount`, pela data `amortized_at`);
  3. **Mensalidades pagas do Clube de Assinaturas** (`subscription_invoices` com `status = 'paid'`, pela data `paid_at` / transação vinculada, sem duplicar com vendas);
  4. **Receitas avulsas manuais do negócio** (`transactions` com `type = 'income'`, `is_paid = true`, `scope = 'business'` que **não** sejam geradas automaticamente por vendas, amortizações ou faturas do clube — isto é, sem vínculo duplicado).
- O **Lucro Líquido (`netProfit`)** e a **Margem (`margin`)** utilizam esse Faturamento em Caixa unificado menos os Custos Pagos do Negócio (incluindo o custo das peças/produtos consumidos ou despesas do negócio pagas no período).

### RN-03 — Regime de Competência para Ticket Médio e Ranking de Serviços/Produtos (`INC-02` e `INC-05`)
- **Ticket Médio de Vendas (`averageTicket`):** Calculado em **Regime de Competência das Vendas** (`SUM(sales.total_amount) / monthSalesCount`), refletindo o valor médio real contratado por atendimento/venda no período, independentemente de ter sido pago à vista ou no fiado.
- **Divisão Serviços vs. Produtos (`revenueSplit`) e Top Clientes (`topClients`):** Calculados em **Regime de Competência (Valor Vendido)** sobre as vendas do período, deixando explícito nos rótulos da interface que o Faturamento Principal reflete o **Caixa Recebido** e a divisão de catálogo/ticket reflete o **Volume Vendido**.

### RN-04 — Pagamento de Fatura de Cartão com Abatimento em Conta Bancária (`INC-03`)
- No modal de pagamento de fatura ([`PayInvoiceModal.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/credit-cards/PayInvoiceModal.tsx)), o usuário pode selecionar a **Conta Bancária pagadora** (`account_id`, pré-selecionando a primeira conta disponível, com opção `"Sem conta vinculada"` caso tenha pago por fora).
- Quando uma conta bancária é selecionada ao pagar a fatura (integral ou parcial):
  - As transações de cartão quitadas recebem `account_id = selectedAccountId` (e `paid_at = now`).
  - Dessa forma, a RPC `get_account_aggregates` e a evolução de saldo (`accountBalance`) abatem automaticamente o valor pago do saldo daquela conta bancária na data efetiva do pagamento, **sem criar uma segunda transação de despesa** que duplicaria os gastos por categoria nos gráficos.
  - Caso a fatura seja reaberta (`setCreditCardInvoicePaid(..., false)`), `account_id` volta para `null` e `paid_at` volta para `null`, restaurando o saldo da conta bancária.

### RN-05 — Eliminação do Truncamento de 1.000 Registros (`INC-04`)
- As consultas analíticas de `dashboard.ts`, `sales.ts`, `clients.ts` e `credit-cards.ts` devem utilizar paginação automática (helper `fetchAllRows` em blocos `.range()` ou agregação SQL) para garantir que contas com mais de 1.000 vendas ou transações no ano nunca tenham meses iniciais truncados ou zerados.

### RN-06 — Ajuste Manual de Saldo e Lançamentos Futuros (`INC-06`)
- **Lançamentos com data futura:** Em `createTransaction`, quando a data (`due_date` ou `transaction_date`) for posterior à data atual no Brasil (`> getBrazilTodayISO()`) e o usuário não tiver especificado explicitamente `is_paid: true`, o lançamento nasce como **Pendente (`is_paid = false`)**. Além disso, o cálculo de saldo atual da conta (`get_account_aggregates`) considera apenas transações pagas até a data atual (`COALESCE(paid_at::date, due_date, transaction_date) <= CURRENT_DATE`).
- **Ajuste Manual de Saldo (`updateAccountBalance`):** Em vez de reescrever `accounts.initial_balance` (o que distorcia o passado), o ajuste de saldo cria uma transação paga na data de hoje (`description: 'Ajuste Manual de Saldo'`, `notes: '[Ajuste de Saldo]'`, `type: delta > 0 ? 'income' : 'expense'`, `amount: Math.abs(delta)`), preservando 100% da curva histórica dos meses anteriores. Transações com `[Ajuste de Saldo]` ajustam o saldo da conta bancária sem poluir os gráficos de receitas/despesas operacionais por categoria.

### RN-07 — Data de Vencimento vs. Data Efetiva do Pagamento (`INC-12`)
- **Competência do Mês (Extrato de Contas do Mês, A Pagar, A Receber e Orçamento por Categoria):** A conta pertence ao mês em que deveria ser paga (`due_date`).
- **Fluxo de Caixa Realizado e Evolução do Saldo Bancário (`accountBalance`, `current_balance` e Caixa Realizado):** Quando a transação está paga (`is_paid = true`), utiliza-se a **data efetiva do pagamento** (`COALESCE((paid_at AT TIME ZONE 'America/Sao_Paulo')::date, due_date, transaction_date)`).

### RN-08 — Saneamento de Fiados Vencidos, Ranking de Produtos, Top Clientes e Radar (`INC-08`, `INC-09`, `INC-10`, `INC-11`)
- **`totalOverdueDebt` (`INC-08`):** Soma exclusivamente o `remaining_amount` das vendas individuais vencidas (`due_date < today`), sem inflar com vendas ainda a vencer do mesmo cliente.
- **`topProducts` (`INC-09`):** Soma `totalQuantity` e `totalRevenue` respeitando o período selecionado (mês atual na visão mensal; ano na visão anual). Em Janeiro (`month === 1`), busca também Dezembro do ano anterior (`year - 1`) para calcular a variação percentual real em vez de forçar `+100%`.
- **`topClients` (`INC-10`):** Agrupa clientes de forma unificada por `client_id || client_name.trim().toLowerCase()` e **exclui vendas sem cliente identificado (`Cliente Avulso`)** do ranking Top 5 Clientes.
- **`inactiveClientsAlerts` (`INC-11`):** Unifica os alertas de clientes inativos do Dashboard com o motor ponderado [`analyzeClientSales`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/client-analytics.ts) e `default_cycle_days`, ordenando pelos mais críticos/atrasados.

### RN-09 — Precisão de Centavos, Filtros do Extrato e Segurança SQL (`INC-07`, `INC-13`, `INC-14`, `INC-15`)
- **Typo SQL (`INC-07`):** Corrigir `ALTER TABLE public.accountsem r` para `ALTER TABLE public.accounts` em [`20261019220000_account_yield_and_interest.sql`](file:///home/alexandrerangel/Projetos/financeiro-app/supabase/migrations/20261019220000_account_yield_and_interest.sql#L6).
- **Centavos em Parcelamentos (`INC-13`):** Ajustar a 1ª parcela com a diferença de arredondamento (`total - parcelaPadrao * (n - 1)`), garantindo que a soma das parcelas seja sempre idêntica ao valor total da compra, e arredondar `residualAmount` para 2 casas decimais em `payCreditCardInvoiceAmount`.
- **Filtros na Tela `/transacoes` (`INC-14`):** Ativar os estados `filter` (`all | personal | business | income | expense | credit | pending`) e `selectedSourceId` (`all | acc:<id> | card:<id>`) em [`TransactionsView.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/transactions/TransactionsView.tsx) com seletores visuais na barra de filtros.
- **Hardening SQL (`INC-15`):** Nova migration revogando `anon` (`REVOKE ALL ON TABLE ... FROM anon`) em todas as tabelas restantes.

### RN-10 — Controle de Estoque, Custo de Reposição, Peças Inclusas em Serviços e Ponto de Equilíbrio (`INC-16`)
1. **Campos de Estoque e Custo em `products` (Apenas para `type = 'product'`):**
   - `cost_price NUMERIC(12,2) NOT NULL DEFAULT 0` (Custo de reposição unitário);
   - `stock_quantity INTEGER NOT NULL DEFAULT 0` (Quantidade atual em estoque);
   - `min_stock INTEGER NOT NULL DEFAULT 2` (Alerta de estoque mínimo).
2. **Vínculo de Produtos/Peças dentro de Serviços (`service_products` + Hora da Venda):**
   - **No Catálogo (`/produtos`):** Ao criar ou editar um **Serviço (`type = 'service'`)**, o usuário pode vincular produtos/peças padrão (ex.: Serviço *"Troca de Tela"* ou *"Revisão"* que utiliza 1x *"Peça X"*). Tabela associativa `service_products (id, user_id, service_id, product_id, quantity)`.
   - **Na Hora da Venda (`NewSaleModal`):** Ao selecionar um Serviço que possui peças vinculadas, elas são carregadas automaticamente como insumos daquele atendimento, e o usuário também pode adicionar/remover/ajustar peças utilizadas naquele serviço diretamente na tela da venda.
   - **Regra de Precificação e Custo das Peças Inclusas no Serviço:**
     - As peças vinculadas/incluídas em um serviço **NUNCA são cobradas separadamente do cliente** (`unit_price = 0` / marcadas com `is_service_component = true` em `sale_items`).
     - Elas servem exclusivamente para **dar baixa automática no estoque do produto** (`stock_quantity = stock_quantity - quantity`) e **registrar o custo interno da peça no atendimento** (`unit_cost = product.cost_price`, `total_cost = quantity * unit_cost`).
3. **Baixa Automática de Estoque e Alerta de Estoque Baixo:**
   - Ao registrar uma venda (`create_sale_atomic`), todo item do tipo `'product'` (seja vendido avulso ou incluído como peça de um serviço) reduz automaticamente `products.stock_quantity` na quantidade utilizada (permitindo concluir a venda mesmo se o estoque chegar a zero ou ficar negativo) e grava o `unit_cost` vigente em `sale_items`.
   - Ao excluir uma venda (`deleteSale`), o estoque dos produtos daquela venda é estornado automaticamente.
   - Produtos ativos com `stock_quantity <= min_stock` exibem badge de **Estoque Baixo** no Catálogo e no Dashboard do Negócio.
4. **Ponto de Equilíbrio (Break-Even) no Dashboard do Negócio:**
   - Calculado mensalmente comparando os **Custos Fixos / Despesas Operacionais do Negócio** (recorrências ativas `scope = 'business'` + despesas do negócio no mês) e o **Custo de Produtos/Peças Vendidas (`SUM(sale_items.quantity * sale_items.unit_cost)`)** frente ao Faturamento do Negócio, exibindo quanto falta faturar (ou quanto já superou) para atingir o Ponto de Equilíbrio no mês.

