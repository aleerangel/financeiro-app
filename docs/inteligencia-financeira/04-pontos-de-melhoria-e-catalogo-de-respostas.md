# Pontos de Melhoria e Catálogo de Perguntas & Respostas Analíticas (Sem IA) — Sistema Canário

> [!IMPORTANT]
> **Objetivo deste Documento:** Consolidar todos os **pontos de melhoria funcionais, analíticos, de experiência do usuário e técnicos** extraídos do documento de Auditoria e Diagnóstico ([`01-auditoria-diagnostico-inteligencia-financeira.md`](./01-auditoria-diagnostico-inteligencia-financeira.md)), **excluindo recursos de Inteligência Artificial (LLMs)** e focando 100% em inteligência financeira determinística, painéis visuais, cruzamento de dados e novas respostas que o sistema pode entregar ao usuário no dia a dia.

---

## Sumário

1. [O Que Já Foi Resolvido na Etapa Anterior (Saneamento Contábil)](#1-o-que-já-foi-resolvido-na-etapa-anterior-saneamento-contábil)
2. [Bloco A — Melhorias e Perguntas Respondíveis Hoje (Sem Criar Novas Tabelas)](#2-bloco-a--melhorias-e-perguntas-respondíveis-hoje-sem-criar-novas-tabelas)
3. [Bloco B — Melhorias e Perguntas que Dependem de Novos Dados no Banco](#3-bloco-b--melhorias-e-perguntas-que-dependem-de-novos-dados-no-banco)
4. [Bloco C — Melhorias Técnicas de Performance, Precisão e Qualidade](#4-bloco-c--melhorias-técnicas-de-performance-precisão-e-qualidade)
5. [Matriz de Decisões e Possíveis Respostas (Para Priorização)](#5-matriz-de-decisões-e-possíveis-respostas-para-priorização)

---

## 1. O Que Já Foi Resolvido na Etapa Anterior (Saneamento Contábil)

Antes de listar os próximos pontos de melhoria, vale registrar o que **já foi corrigido e implementado** nos commits recentes (`INC-01` a `INC-16` / `RN-01` a `RN-10`):

- **Unificação do Faturamento do Negócio em Regime de Caixa:** Vendas à vista + Amortizações de fiado + Mensalidades pagas do Clube + Receitas manuais do negócio sem dupla contagem.
- **Ticket Médio Fiel por Atendimento:** Calculado sobre o valor vendido em competência para não zerar em vendas a prazo.
- **Baixa de Saldo Bancário no Pagamento de Fatura de Cartão:** Seleção da conta bancária pagadora ao quitar faturas (total ou parcial), abatendo o saldo da conta sem duplicar gastos por categoria.
- **Proteção do Histórico Bancário e de Recorrências:** Ajuste manual de saldo via transação `[Ajuste de Saldo]` na data atual e edição de recorrências afetando apenas lançamentos futuros (`is_paid = false`).
- **Fluxo de Caixa pela Data Efetiva de Pagamento (`paid_at`):** Gráficos respeitando quando o dinheiro realmente entrou ou saiu.
- **Controle de Custo Unitário (`cost_price`), Estoque (`stock_quantity` / `min_stock`), Peças em Serviços (`service_products`) e Ponto de Equilíbrio (`Break-Even`).**
- **Reativação dos Filtros do Extrato (`/transacoes`) e Paginação Automática (`> 1.000` registros).**

---

## 2. Bloco A — Melhorias e Perguntas Respondíveis Hoje (Sem Criar Novas Tabelas)

Estes pontos de melhoria utilizam **exclusivamente os dados que o banco já grava hoje**. Eles transformam dados brutos já existentes em respostas diretas na interface:

---

### A1. Diagnóstico de Variação Mensal ("Por que gastei mais ou faturei menos este mês?")
- **Situação Atual:** O sistema mostra o total gasto em cada mês e a evolução por categoria, mas o usuário precisa procurar manualmente qual categoria subiu e quais lançamentos causaram o aumento.
- **Pergunta que passa a responder:**
  > *"Por que meus gastos pessoais (ou os gastos do meu negócio) subiram R$ 850,00 neste mês em relação ao mês passado?"*
- **Como funciona a resposta no sistema:**
  - Um card ou modal de **"Resumo de Variações do Mês"** compara automaticamente o mês selecionado ($M$) com o mês anterior ($M-1$).
  - Destaca as 3 categorias que mais subiram e as que mais caíram (em `R$` e `%`), listando os 2 ou 3 maiores lançamentos responsáveis pela diferença.
  - **Exemplo de resposta visual:**
    - `Insumos & Peças: +R$ 620,00 (+45% vs. mês anterior) — Maior impacto: Compra Fornecedor Telas (R$ 480,00)`.
- **Decisão de Regra de Negócio necessária:**
  - *Opção 1 (Recomendada):* Comparar apenas lançamentos **já pagos** (`is_paid = true`) até o dia equivalente do mês.
  - *Opção 2:* Comparar o **total previsto do mês inteiro** (pagos + pendentes).

---

### A2. Projeção Integrada de Fluxo de Caixa (30 / 60 / 90 Dias)
- **Situação Atual:** O usuário vê o saldo atual das contas, vê o card "A Pagar", vê os "Fiados a Receber" e vê as "Mensalidades do Clube", mas em telas separadas. Não há uma conta única que projete o saldo final após todos esses eventos.
- **Pergunta que passa a responder:**
  > *"Se eu pagar todas as contas e faturas previstas deste mês e receber as mensalidades e fiados agendados, com quanto dinheiro vou terminar o mês?"*
- **Como funciona a resposta no sistema:**
  - Cálculo determinístico de **Saldo Projetado de Fim de Mês**:
    $$\text{Saldo Projetado} = \text{Saldo Atual} + \text{Receitas Pendentes} + \text{Mensalidades Ativas} + \text{Fiados a Vencer} - \text{Despesas Pendentes} - \text{Faturas Abertas}$$
  - Exibição em dois cenários lado a lado:
    1. **Cenário Conservador (Garantido):** Ignora fiados sem data ou já vencidos.
    2. **Cenário Otimista (Total):** Inclui o recebimento dos fiados previstos para o mês.
- **Decisão de Regra de Negócio necessária:**
  - *Opção 1 (Recomendada):* Exibir o **Cenário Conservador** como principal e mostrar os fiados em aberto como bônus potencial (`+ R$ X se receber os fiados`).
  - *Opção 2:* Somar todos os fiados não vencidos diretamente no saldo projetado principal.

---

### A3. Raio-X de Endividamento e Cronograma de Parcelamentos de Cartão
- **Situação Atual:** O banco já salva `installment_group_id`, `current_installment` e `total_installments` em todas as compras parceladas no cartão ([`transactions.ts`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/actions/transactions.ts)), mas a tela `/cartoes` mostra apenas uma fatura por vez.
- **Perguntas que passa a responder:**
  > 1. *"Quanto já tenho comprometido de limite e de faturas futuras só com compras parceladas?"*
  > 2. *"Em qual mês minhas parcelas atuais acabam e minha fatura vai aliviar?"*
- **Como funciona a resposta no sistema:**
  - Na tela `/cartoes`, uma seção **"Parcelamentos Ativos e Alívio de Fatura"**:
    - Lista cada compra parcelada ativa (ex.: `Ar-condicionado — Parcela 4/10 • R$ 220/mês • Faltam R$ 1.320 • Termina em Abr/2027`).
    - Mostra o total comprometido nos próximos 6 meses e quanto de folga mensal será liberada a cada mês conforme os parcelamentos se encerram.

---

### A4. Lucro Líquido por Serviço/Atendimento e Ranking de Produtos/Serviços Mais Lucrativos
- **Situação Atual:** O sistema já grava o custo unitário (`cost_price` / `unit_cost`) dos produtos e das peças usadas nos serviços, mas os rankings (`Top 5 Produtos/Serviços`) ordenam apenas por **Quantidade Vendida** e **Receita Bruta**, sem mostrar qual item deixa mais dinheiro limpo no bolso.
- **Perguntas que passa a responder:**
  > 1. *"Qual serviço ou produto realmente me dá mais lucro líquido (depois de descontar o custo da peça/produto)?"*
  > 2. *"Quanto lucrei limpo neste atendimento de R$ 250,00 que usou R$ 80,00 em peças?"*
- **Como funciona a resposta no sistema:**
  - No histórico de vendas (`/vendas`) e nos detalhes do atendimento, exibir discreta ou opcionalmente: `Cobrado: R$ 250,00 • Custo Peças: R$ 80,00 • Lucro: R$ 170,00 (68%)`.
  - No Dashboard do Negócio, adicionar coluna ou alternador no ranking de Top Produtos/Serviços para visualizar **Receita Bruta vs. Lucro Bruto (Receita − Custo de Peças)**.
- **Decisão de Regra de Negócio necessária:**
  - *Opção 1 (Recomendada):* Mostrar o lucro líquido do serviço nos detalhes da venda e no ranking de catálogo, mantendo os cards principais do topo do Dashboard como estão hoje.
  - *Opção 2:* Exibir também no card do serviço dentro do catálogo (`/produtos`).

---

### A5. Sazonalidade por Dia da Semana (Melhores Dias de Movimento)
- **Situação Atual:** O gráfico semanal mostra os 7 dias de uma semana específica, mas não cruza todas as semanas do mês/ano para apontar qual dia da semana é historicamente mais forte ou mais fraco.
- **Pergunta que passa a responder:**
  > *"Quais dias da semana (ex.: Sexta e Sábado vs. Terça) têm maior média de atendimentos e maior faturamento no meu negócio?"*
- **Como funciona a resposta no sistema:**
  - Card analítico compacto mostrando o desempenho médio de `Domingo` a `Sábado` no período (ex.: *"Sábado é o seu dia mais forte: média de 14 atendimentos e R$ 780,00/dia"*).
  - Ajuda a decidir dias de folga, promoções em dias fracos (ex.: Terça/Quarta) e reforço de estoque antes do fim de semana.

---

### A6. Ficha Financeira 360º do Cliente (LTV, Consumo Favorito e Pontualidade)
- **Situação Atual:** Na tela `/clientes`, cada cliente mostra total gasto em vendas, última visita e status do radar. Porém, o histórico completo de vendas, itens que ele mais pede, mensalidades pagas do clube e comportamento de pagamento no fiado não estão consolidados em uma ficha única.
- **Pergunta que passa a responder:**
  > *"Quem é o meu cliente mais valioso somando atendimentos avulsos + mensalidades do clube, o que ele sempre pede e ele costuma pagar o fiado em dia?"*
- **Como funciona a resposta no sistema:**
  - Ao clicar em um cliente em `/clientes`, abrir um modal/gaveta **"Histórico 360º do Cliente"** com:
    - **LTV Total (Valor Gerado):** Soma de vendas pagas + mensalidades pagas do clube.
    - **Ticket Médio e Frequência Real:** A cada quantos dias ele retorna em média.
    - **Serviços/Produtos Preferidos:** Os 3 itens que ele mais consumiu.
    - **Histórico Recente de Atendimentos** com botão para reemitir Nota/Recibo.

---

### A7. Alerta de Possíveis Lançamentos Duplicados ou Gastos Fora do Padrão
- **Situação Atual:** Se o usuário lançar duas vezes a mesma despesa por engano no extrato, o sistema aceita sem avisar.
- **Pergunta que passa a responder:**
  > *"Será que lancei alguma conta duas vezes neste mês ou tive algum gasto muito fora do normal?"*
- **Como funciona a resposta no sistema:**
  - Verificação determinística que exibe um aviso sutil quando encontra duas transações com **mesmo valor e mesma categoria** em um intervalo de até 2 dias (que não sejam parcelas nem recorrências diferentes), permitindo revisar ou excluir com 1 clique.

---

## 3. Bloco B — Melhorias e Perguntas que Dependem de Novos Dados no Banco

Estes pontos de melhoria exigem **pequenas adições no banco de dados (novas colunas ou tabelas)** para responder perguntas que os dados atuais ainda não capturam:

---

### B1. Teto de Gastos / Orçamento Mensal por Categoria (`Budgets`)
- **O que falta hoje no banco:** As categorias (`categories`) não possuem um campo de meta/limite mensal (`monthly_budget`).
- **Pergunta que passa a responder:**
  > *"Quanto ainda posso gastar com Alimentação / Lazer (ou com Insumos do Negócio) neste mês para não estourar meu planejamento?"*
- **Como implementar:**
  - Adicionar coluna opcional `monthly_budget NUMERIC(12,2)` na tabela `categories`.
  - Na tela de Categorias e no Dashboard Pessoal/Negócio, mostrar uma barra de progresso para as categorias que têm meta definida (ex.: `Alimentação: R$ 820 / R$ 1.000 (82%) — Restam R$ 180,00 para o mês`).

---

### B2. Transferências Nativas entre Contas Bancárias (e Retirada de Pró-Labore)
- **O que falta hoje no banco:** Não há operação de transferência entre duas contas (`from_account_id` → `to_account_id`). Se o usuário transfere dinheiro da conta do Negócio para a conta Pessoal (ou da Conta Corrente para a Caixinha/Reserva) lançando uma Despesa e uma Receita, ele infla artificialmente os gráficos de Receitas e Despesas do mês.
- **Perguntas que passa a responder:**
  > 1. *"Como transfiro saldo da Conta Corrente para minha Caixinha/Investimento sem que isso apareça como um gasto no meu mês?"*
  > 2. *"Quanto retirei do caixa do Negócio para minha conta Pessoal (Pró-labore) neste mês?"*
- **Como implementar:**
  - Botão **"Transferir entre Contas"** na tela `/contas` e `/transacoes`.
  - Cria um par vinculado (ou registro `type = 'transfer'`) que reduz o saldo da conta de origem e aumenta o saldo da conta de destino, **sem contar como receita ou despesa operacional** nos gráficos de evolução.
  - Opcionalmente, permite marcar a transferência como **"Retirada / Pró-labore (Negócio → Pessoal)"**, mostrando no Dashboard do Negócio quanto o dono já retirou de lucro no mês.

---

### B3. Entrada Rápida de Estoque Integrada ao Financeiro ("Repor Estoque")
- **O que falta hoje:** Para repor o estoque de uma peça em `/produtos`, o usuário precisa editar o produto manualmente, somar a quantidade nova de cabeça e depois ir até `/transacoes` lançar a despesa da compra do fornecedor.
- **Pergunta que passa a responder:**
  > *"Chegaram 10 peças novas do fornecedor: como dou entrada no estoque, atualizo o custo unitário e já registro o gasto no caixa de uma vez só?"*
- **Como implementar:**
  - Botão **"Repor Estoque (+)"** no card do produto físico em `/produtos` (e no alerta de estoque baixo do Dashboard).
  - O usuário informa: `Quantidade comprada (ex.: +10)`, `Custo unitário pago (ex.: R$ 75,00)` e marca uma caixa opcional: `[x] Lançar saída de R$ 750,00 nas despesas do negócio (Conta/Cartão)`.

---

### B4. Comissionamento / Múltiplos Profissionais (Para Negócios com Equipe)
- **O que falta hoje no banco:** Todas as vendas pertencem ao estabelecimento como um todo; não há campo identificando qual profissional executou o atendimento nem cálculo de comissão.
- **Pergunta que passa a responder:**
  > *"Quanto cada profissional da minha equipe faturou no mês e quanto devo pagar de comissão para cada um?"*
- **Como implementar (Opcional / Sob Demanda):**
  - Tabela `professionals` (`id`, `name`, `commission_percent`, `active`) e campo opcional `professional_id` em `sales`.
  - Só aparece na interface se o usuário ativar a opção "Trabalho com equipe / comissões" nas configurações do negócio.

---

## 4. Bloco C — Melhorias Técnicas de Performance, Precisão e Qualidade

Pontos técnicos identificados na auditoria para deixar o sistema mais rápido, configurável e blindado:

1. **Taxa CDI Configurável pelo Usuário (`account-yield-utils.ts`):**
   - **Problema atual:** A taxa base do CDI usada para sugerir o rendimento mensal das contas (`cdi_percent`) está fixa no código em `10,65% a.a.`.
   - **Melhoria:** Permitir que o usuário informe a taxa CDI atual no modal da conta (ou atualizar o padrão para a taxa Selic/CDI vigente), garantindo que a sugestão de rendimento bata com o banco real.
2. **Horário Real em Vendas Retroativas (`NewSaleModal.tsx`):**
   - **Problema atual:** Quando o usuário registra uma venda de dias atrás alterando a data no modal, o sistema anexa o horário atual do relógio ao dia escolhido.
   - **Melhoria:** Permitir informar opcionalmente o horário ou manter um horário comercial padrão quando a venda for retroativa.
3. **Agregações Pesadas via RPC SQL no Banco de Dados:**
   - **Problema atual:** Embora a paginação automática (`fetchAllRows`) já evite o corte de 1.000 linhas, o servidor Next.js ainda baixa todas as linhas do ano para somar em JavaScript.
   - **Melhoria:** Criar RPCs SQL dedicadas para os resumos mensais/anuais do Dashboard, reduzindo o tempo de carregamento em contas com milhares de registros.

---

## 5. Matriz de Decisões e Possíveis Respostas (Para Priorização)

Para avançarmos na implementação dos pontos que fizerem mais sentido para o seu uso, abaixo estão as perguntas de decisão com as **possíveis respostas sugeridas**:

| # | Ponto de Melhoria | Pergunta de Decisão | Possíveis Respostas / Caminhos |
| :--- | :--- | :--- | :--- |
| **1** | **Prioridade Funcional (Bloco A vs. Bloco B)** | Quais melhorias agregam mais valor imediato para o seu uso diário agora? | **A)** Focar primeiro no **Negócio & Estoque** (Entrada rápida de estoque integrada à despesa `B3` + Lucro por serviço/item `A4` + Ficha 360º do Cliente `A6`).<br>**B)** Focar primeiro no **Planejamento Financeiro & Cartões** (Projeção de Fluxo de Caixa `A2` + Raio-X de Parcelamentos de Cartão `A3` + Orçamento/Teto por Categoria `B1`).<br>**C)** Focar em **Movimentação Bancária** (Transferências nativas entre contas e retirada de Pró-labore `B2` + Explicação de variações mensais `A1`). |
| **2** | **Transferência entre Contas e Pró-Labore (`B2`)** | Como você costuma transferir valores entre a conta do negócio e a conta pessoal (ou para caixinhas/reservas)? | **A) (Recomendado)** Criar botão **"Transferir entre Contas"** que move o saldo de uma conta para outra sem inflar receitas/despesas nos gráficos, com opção de marcar como *Pró-Labore*.<br>**B)** Manter apenas lançamentos normais de receita e despesa como é hoje. |
| **3** | **Reposição de Estoque (`B3`)** | Quando você compra peças/produtos para repor o estoque, quer que o botão de reposição já ofereça lançar a despesa no financeiro? | **A) (Recomendado)** Sim, ao clicar em **"Repor Estoque"** no produto, informar quantidade e custo e ter um checkbox *"Gerar despesa no financeiro automaticamente"*.<br>**B)** Não, prefiro apenas somar a quantidade no estoque e lançar a despesa separadamente. |
| **4** | **Teto de Gastos por Categoria (`B1`)** | Você deseja definir metas/limites mensais de gastos por categoria (ex.: limite de R$ 800 para Alimentação, R$ 500 para Lazer)? | **A) (Recomendado)** Sim, adicionar campo opcional de **Meta Mensal (`R$`)** nas categorias com barra de alerta quando passar de 80% e 100%.<br>**B)** Não vejo necessidade de metas por categoria agora. |
| **5** | **Raio-X de Parcelamentos de Cartão (`A3`) e Fluxo Projetado (`A2`)** | Na tela de Cartões e no Dashboard, quer ver o cronograma de quando acabam os parcelamentos atuais e o saldo projetado até o fim do mês? | **A) (Recomendado)** Sim, adicionar o painel de **Parcelamentos Ativos (quando terminam)** em `/cartoes` e o **Saldo Projetado de Fim de Mês** no Dashboard.<br>**B)** Implementar apenas o Raio-X de Parcelamentos nos cartões.<br>**C)** Implementar apenas o Saldo Projetado de Fim de Mês. |

