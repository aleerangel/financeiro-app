# Engenharia de Requisitos: Modernização da Aba Resumo (Mobile)

## 1. Visão Geral e Sincronização Global da Tela

A aba **Resumo** no mobile adota sincronização estrita e global orientada pelo **Seletor Único no Topo**:

### 1. Seletor Único e Navegação Semanal Expandida:
- **Modos de Granularidade:** `[ Semanal ]`, `[ Mensal (Padrão) ]` e `[ Anual ]`.
- **Navegação Semanal Contínua entre Meses:**
  - O modo semanal não fica restrito ao mês corrente. Ao atingir a primeira semana do mês e tocar em `<`, o sistema transiciona automaticamente para a última semana do mês anterior.
  - Ao atingir a última semana do mês e tocar em `>`, o sistema transiciona automaticamente para a primeira semana do mês seguinte.
  - O label informa claramente: `Semana N (Início a Fim) • Mês/Ano` (ex: `Semana 1 (01/10 a 07/10) • Out/2026`).

### 2. Sincronização de Todos os Módulos da Tela:
A escolha do período altera compulsoriamente **todos os blocos** da aba:
- **Evolução Financeira:** Curvas de Entradas, Saídas e Balanço ajustadas para a semana, mês ou ano selecionado, com filtro touch isolador por métrica.
- **Badges de Entradas, Saídas e Balanço:** Exibem o realizado em destaque e o previsto embaixo estritamente para o período ativo (semana, mês ou ano).
- **Receitas & Balanço Geral (`MonthlyBarChart`):** Recebe as transações e o label do período ativo, exibindo a composição de receitas da semana, mês ou ano.
- **Gastos por Categoria (`CategoryDonutChart`):** Recebe as transações e o label do período ativo, exibindo a divisão de despesas da semana, mês ou ano.
- **Inteligência da Barbearia:** Faturamento de serviços e produtos, ticket médio e distribuição calculados para o período ativo.
