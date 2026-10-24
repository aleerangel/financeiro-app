# Documento de Engenharia de Requisitos: Dashboard da Barbearia & Gestão de Clientes

## 1. Resumo Executivo das Decisões (Validadas pelo Usuário)
- **Top 5 Clientes do Mês:** Lista visual dos 5 clientes mais assíduos no mês, combinando número de visitas e valor total gasto.
- **Divisão Serviços vs Produtos:** Card analítico com divisão percentual (ex: 85% Serviços vs 15% Produtos) e valores consolidados em R$.
- **Painel de Retenção & Retorno:** Bloco "Atenção: Clientes para Retorno" destacando clientes que não cortam há mais de 30 dias, com botão direto para WhatsApp com mensagem personalizada de reativação.
- **Metas:** Não incluir no momento, priorizando os dados reais de fluxo e clientes.

---

## 2. Especificação Técnica das Funcionalidades

### 2.1. Top 5 Clientes do Mês (`topClients`)
- **Origem dos dados:** Comandas de vendas (`sales`) do mês selecionado.
- **Agrupamento:** Por `client_id` (ou `client_name`).
- **Métricas por cliente:**
  - `name`: Nome do cliente.
  - `visitsCount`: Quantidade de atendimentos no mês.
  - `totalSpent`: Valor total gasto no mês.
  - `lastVisitDate`: Data da última visita no mês.
- **Ordenação:** `totalSpent DESC, visitsCount DESC`.

### 2.2. Divisão de Faturamento: Serviços vs Produtos (`revenueSplit`)
- **Origem dos dados:** Itens de comanda (`sale_items` com join em `products`).
- **Classificação:**
  - **Serviço (`type === 'service'`):** Cortes, barbas, sobrancelha, química, acabamentos.
  - **Produto (`type === 'product'`):** Pomadas, óleos, shampoos, bebidas, acessórios.
- **Métricas:**
  - `serviceRevenue`: R$ total em serviços no mês.
  - `productRevenue`: R$ total em produtos no mês.
  - `servicePercentage`: % da receita vinda de serviços.
  - `productPercentage`: % da receita vinda de produtos.
  - `serviceCount`: Quantidade de serviços executados.
  - `productCount`: Quantidade de unidades de produtos vendidas.

### 2.3. Painel de Retenção: Clientes para Retorno (`inactiveClientsAlerts`)
- **Regra de Seleção:** Clientes cadastrados cuja data da última visita registrada no sistema seja anterior a 30 dias (ou status `overdue`/`missing`).
- **Ação Rápida:** Botão `WhatsApp` que abre diretamente a conversa com mensagem cordial pré-formatada:
  > *"Olá, {Primeiro Nome}! Tudo bem? Sentimos sua falta aqui na barbearia! Bora renovar o visual esta semana? Se quiser, já posso agendar seu horário."*

---

## 3. Modelo de Dados da Resposta (`BusinessDashboardData`)

```ts
export interface TopMonthClient {
  name: string;
  visitsCount: number;
  totalSpent: number;
  lastVisitDate: string;
}

export interface ServiceVsProductSplit {
  serviceRevenue: number;
  productRevenue: number;
  servicePercentage: number;
  productPercentage: number;
  serviceCount: number;
  productCount: number;
}

export interface InactiveClientAlert {
  id: string;
  name: string;
  phone?: string | null;
  daysSinceLastVisit: number;
  lastVisitDate: string;
  totalVisitsAllTime: number;
}
```
