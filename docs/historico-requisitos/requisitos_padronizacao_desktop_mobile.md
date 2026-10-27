# Especificação de Requisitos: Padronização Desktop vs Mobile, Separação de Telas & Modo de Privacidade

Este documento consolida os requisitos validados na engenharia interativa, auditoria e implementação das melhorias de paridade entre as versões **Desktop** e **Mobile** do Canário Gestão Financeira.

---

## 1. Contexto e Objetivos

Com o crescimento do sistema e a especialização das interfaces web desktop e mobile PWA, surgiram pequenas disparidades de experiência:
1. **Redundância na Navegação:** Clientes e Clube de Assinaturas dividiam o mesmo componente com abas sobrepostas, gerando menus redundantes tanto no desktop quanto no mobile.
2. **Modo de Privacidade Ausente no Desktop:** O mobile possuía botão de ocultar saldos (`••••••`), mas o desktop exibia todos os números abertos, dificultando o uso do notebook em locais públicos ou em chamadas/gravações de tela.
3. **Assimetria Analítica no Mobile:** O dashboard desktop continha análises detalhadas como *Consumo por Meio de Pagamento*, *Últimos Gastos da Empresa*, *Lançamentos Recentes* e *Gráfico de Linhas Faturamento x Gastos x Lucro*, enquanto a aba de Resumo no Mobile estava fragmentada ou incompleta.
4. **Flash de Carregamento no Mobile:** Ao iniciar o app mobile com perfil de negócio ativo, ocorria um breve flash visual iniciando na aba de negócio e trocando segundos depois para a aba pessoal.

---

## 2. Decisões de Engenharia & Requisitos Implementados

### 2.1. Separação Estrita de Rotas entre Clientes e Assinaturas
- **Rotas Independentes:**
  - `/clientes`: Focada 100% no CRM de Clientes (busca preditiva, radar de ciclo de retorno, lista de aniversariantes, histórico completo de consumo e métricas de fidelização).
  - `/mensalidades`: Focada 100% na Gestão de Assinaturas e Mensalidades Recorrentes (planos, mensalistas cadastrados, faturas do mês, status de adimplência, cobrança WhatsApp e MRR).
- **Desktop Sidebar:** Itens de menu separados e claramente identificáveis.
- **Mobile Menu "Mais":** Acesso direto independente a cada módulo, eliminando sobreposição de abas e redundâncias visuais.

---

### 2.2. Modo de Privacidade Unificado e Sincronizado
- **Botão no Topo do Desktop (`AppHeader.tsx`):**
  - Implementado botão com ícone de olho (`Eye` / `EyeOff`) ao lado do botão de ações rápidas.
  - Sincronização em tempo real entre desktop e mobile utilizando o contexto global `MobileNavigationContext` e `localStorage`.
- **Ocultação de Valores Sensíveis:**
  - `BusinessDashboardDesktop.tsx`: Faturamento, gastos, lucro líquido, ticket médio, margem de lucro e cobranças a receber são substituídos por `••••••` quando a privacidade está ativa.
  - `GeneralDashboardDesktop.tsx`: Saldo consolidado em contas, faturas de cartão de crédito (usado e disponível), total de receitas e despesas exibem `••••••`.
  - Tooltips e séries dinâmicas dos gráficos (`SmoothLineChart`) passam pelo formatador `formatHidden` para manter a privacidade mesmo ao passar o mouse.

---

### 2.3. Reestruturação Analítica da Aba Resumo Mobile (`MobileSummaryView.tsx`)
- **Organização em Apenas 2 Abas Principais:**
  - **Visão Geral:** Métricas consolidadas (saldo de contas, faturas de cartão, balanço receitas x despesas), gráfico de evolução geral (`SmoothLineChart`), comparativo de receitas e **Gastos por Categoria (Gráfico de Rosca)**.
  - **Visão de Negócio (quando o usuário possui negócio cadastrado):** Métricas comerciais completas (faturamento, despesas operacionais, lucro líquido, ticket médio, margem), **Gráfico de Desempenho Comercial em Linhas (`SmoothLineChart`)**, divisão de receitas (serviços x produtos), dias mais fortes da semana, top clientes, **Consumo por Meio de Pagamento (`expensesBySource`)**, **Últimos Gastos do Negócio (`recentExpenses`)** e **Lançamentos Recentes (`recentSales`)**.
- **Natureza 100% Analítica Preservada:**
  - A tela de Resumo permanece estritamente analítica (leitura de indicadores e gráficos), mantendo ações de edição ou cadastro centralizadas no menu "Mais" e no botão flutuante (+).
- **Ocultação Automática Inteligente de Blocos Sem Registros:**
  - Para garantir um visual limpo e sem poluição visual, blocos que não possuem dados no período ativo são **completamente ocultados**, em vez de exibirem caixas vazias ou mensagens genéricas:
    - Lista de Contas Bancárias (ocultada se nenhuma conta cadastrada);
    - Gráfico de Rosca de Gastos por Categoria (ocultado se não houver despesas no período);
    - Consumo por Meio de Pagamento (ocultado se não houver despesas comerciais por cartão/conta);
    - Últimos Gastos do Negócio (ocultado se não houver gastos registrados);
    - Lançamentos Recentes (ocultado se não houver vendas/atendimentos);
    - Dias Mais Fortes (ocultado se o faturamento no período for zero).

---

### 2.4. Eliminação do Flash de Inicialização Mobile
- Resolvido problema de dessincronização de estado inicial que provocava oscilação entre a aba de negócio e pessoal ao carregar a aplicação.
- A hidratação do contexto de navegação agora recupera o estado inicial de forma síncrona com persistência estável, garantindo renderização instantânea da aba correta.

---

## 3. Matriz de Paridade Final (100% Sincronizada)

| Funcionalidade / Visão | Desktop | Mobile |
| :--- | :---: | :---: |
| **Modo de Privacidade (`••••••`)** | ✅ No Cabeçalho | ✅ No Cabeçalho |
| **Gráfico Desempenho Comercial (Receita x Gastos x Lucro)** | ✅ Dashboard Negócio | ✅ Aba Resumo (Negócio) |
| **Consumo por Meio de Pagamento** | ✅ Dashboard Negócio | ✅ Aba Resumo (Negócio) |
| **Últimos Gastos do Negócio** | ✅ Dashboard Negócio | ✅ Aba Resumo (Negócio) |
| **Lançamentos Recentes do Negócio** | ✅ Dashboard Negócio | ✅ Aba Resumo (Negócio) |
| **Gastos por Categoria (Gráfico de Rosca)** | ✅ Dashboard Geral | ✅ Aba Resumo (Visão Geral) |
| **Saldos de Contas Bancárias** | ✅ Dashboard Geral | ✅ Aba Resumo (Visão Geral) |
| **Separação Clientes vs Clube de Assinaturas** | ✅ Rotas separadas | ✅ Rotas separadas |
| **Exportação de Relatórios (PDF / Excel / CSV)** | ✅ No topo das telas | ✅ No topo das telas |
| **Emissão de Notas em PDF e WhatsApp** | ✅ Modal com PDF e WhatsApp | ✅ Modal com PDF e WhatsApp |
