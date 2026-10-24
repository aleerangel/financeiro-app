# Documento de Engenharia de Requisitos (SRS)
## Módulo: Central de Fiados & Contas a Receber (`/fiados`)

---

## 1. Visão Geral & Contexto de Negócio

Profissionais autônomos e donos de barbearia frequentemente acumulam dezenas de pequenos fiados espalhados ao longo das semanas. Sem um local centralizado e dedicado para monitorar esses valores, o profissional:
1. **Perde o controle da inadimplência:** Não sabe quem está devendo, quanto deve no total ou quais pagamentos já passaram do prazo prometido.
2. **Sente vergonha ou desconforto ao cobrar:** Falta uma abordagem padronizada, rápida e cordial via WhatsApp.
3. **Tem dificuldade em abater pagamentos parciais:** Quando o cliente aparece para pagar uma parte, o barbeiro precisa caçar as comandas passadas.

A **Central de Fiados / Contas a Receber** resolve esses gargalos criando uma central de comando onde o profissional enxerga instantaneamente todo o dinheiro que tem na rua, com foco na visualização **por cliente devedor**, alertas claros de atraso, botão de cobrança amigável no WhatsApp e baixa imediata de amortização.

---

## 2. Premissas de Negócio Alinhadas com o Usuário

1. **Módulo Dedicado (`/fiados`):**
   * Rota própria acessível no menu lateral/superior Desktop e no hub de navegação da aba *"Mais"* no Mobile.
2. **Organização Focada no Cliente:**
   * O elemento principal da tela é o **Card do Cliente Devedor**, consolidando todas as suas comandas em aberto, o valor total devido e a situação de vencimento mais crítica.
   * Acordeão expansível: ao tocar no card, desdobra as comandas que compõem a dívida (data, serviços realizados, valor original e valor restante).
3. **Filtros de Vencimento Estratégicos:**
   * `Todos`: todos os clientes com qualquer saldo devedor pendente.
   * `Vencidos (Em Atraso)`: clientes que possuem comanda com `due_date < hoje`.
   * `Vencem em Breve`: clientes com promessas para os próximos 7 dias.
   * `Sem Prazo / Em Aberto`: comandas registradas sem data estipulada de pagamento.
4. **Cobrança Amigável no WhatsApp em 1 Toque:**
   * Mensagem respeitosa, cordial e profissional pré-formatada no WhatsApp informando o saldo restante e os atendimentos correspondentes.
5. **Amortização e Quitação Imediata:**
   * Botão direto no card do cliente para abater qualquer quantia ou quitar tudo na hora via [`AmortizeModal`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/sales/AmortizeModal.tsx).

---

## 3. Requisitos Funcionais (RF)

### 3.1 Navegação e Rota Dedicada
* **RF-CF01 (Rota `/fiados`):** Criar página com `AppShell`, breadcrumb e metatags.
* **RF-CF02 (Acesso no Desktop):** Adicionar item no menu de navegação da `Navbar` com ícone de relógio/moedas (`Clock` ou `HandCoins`) e badge dinâmica com o número de clientes devedores caso haja algum pendente.
* **RF-CF03 (Acesso no Mobile):** Adicionar atalho em destaque na tela [`MobileMoreView`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/layout/MobileMoreView.tsx) dentro da seção de Negócio / Barbearia (*"Fiados & A Receber"*).

### 3.2 Indicadores no Topo da Página
* **RF-CF04 (Cards de Resumo Financeiro):**
  1. **Total a Receber na Rua (R$):** Soma do saldo devedor restante de todos os clientes.
  2. **Total Vencido em Atraso (R$):** Montante que já passou da data de vencimento combinada.
  3. **Clientes Devedores (Qtd):** Quantidade total de pessoas com pendência financeira.
  4. **Maior Saldo Devedor Individual (R$):** Identificação e valor do cliente com maior montante pendente.

### 3.3 Filtros Rápidos, Busca e Ordenação
* **RF-CF05 (Busca Instantânea):** Campo de busca normalizada (sem acentos e por dígitos de telefone) para encontrar clientes devedores em menos de 100ms.
* **RF-CF06 (Pílulas de Status de Vencimento):**
  * `Todos ([Qtd])`
  * `Vencidos ([Qtd])` (destaque visual em vermelho/rosa)
  * `Vencem em Breve ([Qtd])` (destaque visual em âmbar)
  * `Sem Prazo Definido ([Qtd])` (neutro/cinza)
* **RF-CF07 (Opções de Ordenação):**
  * *Maior Valor Devido (Padrão)*
  * *Mais Dias em Atraso (Prioridade de Cobrança)*
  * *Mais Recentes*
  * *Ordem Alfabética (A-Z)*

### 3.4 Cards de Clientes Devedores
* **RF-CF08 (Estrutura do Card de Cliente):**
  * Foto/Inicial do cliente com nome em negrito.
  * Telefone com link rápido.
  * Badge de status do débito:
    * 🔴 `Vencido há X dias` (comanda com vencimento ultrapassado).
    * 🟡 `Vence em X dias` (comanda a vencer nos próximos dias).
    * ⚪ `Em aberto (Sem prazo fixado)`.
  * Valor Total Devedor destacado em fonte grande (`R$ 140,00`).
  * Quantidade de comandas em aberto (ex: *"2 comandas pendentes"*).
* **RF-CF09 (Acordeão de Detalhamento das Comandas):**
  * Ao expandir o card do cliente, exibe a listagem de cada atendimento pendente:
    * Data e hora do atendimento.
    * Lista de itens (ex: *1x Corte Degradê, 1x Pomada Matte*).
    * Valor original da venda vs Valor restante.
    * Histórico de pagamentos já realizados naquela comanda.
    * Botão individual para amortizar apenas aquela comanda específica.
    * **Edição de Pendência:** Botão de edição para alterar a data de vencimento combinada, itens ou observações da comanda.
    * **Exclusão / Cancelamento de Pendência:** Botão com confirmação para estornar/excluir a pendência individualmente.
* **RF-CF10 (Ações Principais por Cliente):**
  * Botão **"Receber / Amortizar"**: abre o modal para dar baixa no saldo total ou parcial.
  * Botão **"Cobrar no WhatsApp"**: abre o modal de visualização/edição da mensagem antes do envio.

### 3.5 Disparo e Personalização de Mensagem WhatsApp
* **RF-CF11 (Pré-visualização e Edição da Mensagem):**
  * Ao tocar no botão de WhatsApp, abre um modal/drawer rápido contendo:
    * Campo de texto editável com o texto pré-carregado automaticamente.
    * Assinatura do sistema obrigatória no rodapé da mensagem:
      > `_Mensagem enviada via BarberFin_`
    * Botão *"Abrir no WhatsApp"*: gera o link `https://wa.me/55...` com a mensagem personalizada pelo usuário.

### 3.6 Integração com o Dashboard de Barbearia
* **RF-CF12 (Card Clicável no Dashboard):**
  * No Dashboard de Negócio/Barbearia (versão Desktop e Mobile), exibir o card de destaque:
    * **"A Receber (Fiados)"**: valor total represado em clientes devedores.
    * Indicador de quantidade de clientes em aberto (ex: *"3 clientes com pendência"*).
    * O card inteiro é um link clicável (`<Link href="/fiados">`) que redireciona diretamente para a central `/fiados`.

### 3.7 Exportação & Relatórios
* **RF-CF13 (Exportação de Inadimplência):**
  * Permitir exportar a lista de clientes devedores em **PDF** ou **Excel** com data de emissão, nome, telefone, valor total devido e detalhe das comandas.

---

## 4. Requisitos Não Funcionais (RNF)

* **RNF-CF01 (Desempenho & Otimização de Consultas):**
  * Consulta SQL única buscando vendas com `status IN ('pending', 'partially_paid')`, trazendo dados do cliente e itens, agrupando no servidor ou client-side sem chamadas N+1.
* **RNF-CF02 (Ergonomia Mobile):**
  * Toque confortável em telas pequenas, botões com altura mínima de 44px e expansão de acordeão fluida.
* **RNF-CF03 (Sincronização em Tempo Real):**
  * Ao amortizar uma comanda ou receber o valor, os totais do topo da página e os cards de clientes são atualizados instantaneamente (`revalidatePath('/fiados')`).

---

## 5. Arquitetura de Componentes e Telas

```text
src/
├── app/
│   └── fiados/
│       └── page.tsx                     # Server Component da rota de fiados
├── components/
│   └── fiados/
│       ├── FiadosView.tsx               # View principal interativa com busca, filtros e ordenação
│       ├── DebtClientCard.tsx           # Card consolidado por cliente com acordeão expansível
│       └── FiadosSummaryHeader.tsx      # Cards de métricas no topo (Total a receber, vencidos, etc)
```

---

## 6. Casos de Borda & Regras de Validação

1. **Cliente sem Telefone Cadastrado:** O botão de WhatsApp deve aparecer desabilitado com tooltip indicando *"Cliente sem telefone cadastrado - adicione o telefone na edição do cliente"*.
2. **Quitação Total do Cliente:** Quando a última comanda de um cliente for quitada, o card do cliente deve ser removido da lista ativa com feedback visual positivo (*"Débito do cliente 100% quitado! 🎉"*).
3. **Múltiplas Comandas com Vencimentos Diferentes:** A data de vencimento considerada para a etiqueta do cliente é a da **comanda mais atrasada** (critério de maior urgência de cobrança).
