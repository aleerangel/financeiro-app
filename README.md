# 💈 BarberFin — SaaS Open Source de Gestão Financeira & Negócios Autônomos

🌐 **Acesse a aplicação online:** **[https://financeiro-app-rust.vercel.app/](https://financeiro-app-rust.vercel.app/)**

Uma plataforma web e mobile moderna, ágil e completa para **gestão financeira pessoal e de negócios autônomos**, desenvolvida com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Vitest** e **Supabase (PostgreSQL)** com isolamento multi-usuário via **Row Level Security (RLS)** e transações atômicas.

---

## 🚀 Visão do Projeto & Roadmap (SaaS Open Source)

O **BarberFin** nasceu com a proposta de ser um **SaaS de código aberto** (*Open Source SaaS*) focado em unir, sem burocracia, a gestão do caixa do trabalho com o controle das finanças pessoais:

1. **Fase Atual — Uso em Produção & Testes de Expansão:**
   * Utilizado em produção no dia a dia real de balcão e em fase de expansão com múltiplos usuários isolados (*multi-tenant* via Supabase RLS).
2. **Próximo Passo — Generalização para Todo Tipo de Negócio Autônomo:**
   * Generalizar a estrutura atual (otimizada para barbearias) para atender **qualquer profissional ou negócio autônomo** (estúdios de estética, salões, oficinas, consultórios, freelancers, prestadores de serviços e microempreendedores).
3. **Futuro — Planos de Assinatura (Mensal e Anual):**
   * Estruturação comercial com **planos mensais e anuais**, relatórios consolidados para declaração, CRM avançado de retenção e automações financeiras.

---

## 📱 Redesign Mobile — Experiência Dedicada & Rápida

A versão mobile do BarberFin foi reformulada com **arquitetura 100% desacoplada da versão desktop**, combinando a clareza visual e hierarquia do **Nubank** com a velocidade operacional de balcão do **Trinta**:

* **Barra de Navegação Inferior Fixa (5 Destinos)**:
  1. **Início**: Dashboard touch sem gráficos pesados para carregamento instantâneo, com saldos consolidados, faturamento, clientes atendidos, lucro líquido e últimas movimentações.
  2. **Extrato**: Linha do tempo cronológica com agrupamento por dia, filtros rápidos (Entradas, Saídas, Pendentes, Barbearia vs Pessoal) e confirmação de recebimento/pagamento com 1 toque.
  3. **Botão Central Elevado (+)**: Gaveta touch com 4 ações imediatas:
     - ✂️ *Novo Atendimento Barbearia*
     - 📈 *Nova Entrada (Receita)*
     - 💳 *Nova Saída (Despesa Pessoal)*
     - 💈 *Gasto da Barbearia*
  4. **Resumo**: Gráficos minimalistas dos últimos 6 meses, divisão de faturamento (Serviços vs Produtos) e maiores despesas por categoria.
  5. **Mais**: Hub de módulos touch para Clientes (CRM & WhatsApp), Produtos & Estoque, Contas Bancárias, Cartões, Contas Fixas e Categorias.
* **PDV Mobile Inteligente (Checkout de Balcão)**:
  - Registro de atendimento em tela única com botões rápidos dos serviços mais frequentes.
  - Suporte a **item avulso** (descrição + valor): após a venda, o sistema sugere cadastrar o item no catálogo para os próximos atendimentos.
  - Venda atômica com baixa de estoque, vínculo de cliente e lançamento no caixa.
* **Cadastro Rápido de Transações**:
  - Destaque para o valor em fonte grande com `inputMode="decimal"`.
  - Botão **"Salvar e Outra"** para agilizar o lançamento contínuo de múltiplos recibos e notas.
* **Modo Privacidade & Contexto Persistente**:
  - Botão de olho para ocultar valores sensíveis (`••••••`) em público.
  - Alternador direto `[ Barbearia ] [ Pessoal ]` sincronizado em todo o app.

---

## ✨ Funcionalidades Completas

### 💈 Módulo de Negócio, Caixa & Custos Operacionais
* **Caixa & Comandas Rápidas (`/vendas`)**:
  * Seleção ágil de múltiplos produtos e serviços com busca de clientes ou atendimento avulso.
  * Cadastro instantâneo de novo cliente sem sair da tela de atendimento.
  * Formas de pagamento: Pix, Dinheiro, Débito e Crédito com direcionamento para a conta bancária de destino.
  * Processamento via RPC PostgreSQL com integridade transacional garantida.
* **Custos da Barbearia & Lucro Líquido Real (`/dashboard` e `/transacoes`)**:
  * Classificação de despesas e contas fixas com escopo **Pessoal** ou **Negócio (Barbearia)**.
  * **DRE Simplificado**: Faturamento Bruto (`+`), Custos Operacionais Pagos e Pendentes (`-`), **Lucro Líquido Real (`=`)** e Margem Líquida (`%`).
  * **Ponto de Equilíbrio (*Break-even*)**: Indicador visual mostrando quanto falta faturar no mês para cobrir 100% dos custos fixos e variáveis, além do ticket médio.
* **Catálogo de Serviços & Produtos (`/produtos`)**:
  * Preço de venda, custo de reposição, comissão e alerta de estoque baixo ($\le 2$).

---

### 🤝 CRM de Clientes & Retenção Ativa (`/clientes`)
* **Inteligência de Retorno & Fidelização**:
  * Configuração do ciclo esperado de retorno por cliente (ex: 15, 21 ou 30 dias).
  * Status automático: 🟢 **Em dia**, 🟡 **Atenção (Prestes a vencer)**, 🔴 **Inativo / Sumido** e ⚪ **Sem visitas**.
* **Painel de Retenção & Aniversariantes**:
  * Filtros imediatos de clientes sumidos e aniversariantes do mês.
  * **Atalho WhatsApp Inteligente**: Gera mensagem personalizada no WhatsApp com um clique (convite de retorno, lembrete amigável ou parabéns de aniversário).
* **Raio-X do Cliente (*Drawer* de Histórico)**:
  * LTV (*Lifetime Value*), ticket médio, serviço favorito, frequência de visitas e linha do tempo de atendimentos realizados.

---

### 📊 Dashboard Híbrido Desktop & Mobile (`/dashboard`)
* **Alternância Negócio vs. Geral**:
  * **Modo Negócio**: Foco total na operação — Faturamento, Custos, Lucro Líquido, Ponto de Equilíbrio, ranking de serviços/produtos e clientes atendidos.
  * **Modo Geral**: Visão consolidada de todas as contas, faturas de cartão, despesas pessoais/profissionais e receitas do período.
* **Gráficos Analíticos e Comparativos**:
  * Curvas de evolução histórica, comparativo de receitas vs despesas e projeção de fechamento do mês.
  * Gráfico de distribuição percentual de gastos por categoria.
  * Exportação de relatórios em CSV e JSON.

---

### 💳 Cartões de Crédito & Painel de Faturas (`/cartoes`)
* **Design de Cartão Físico**: Limite total, limite utilizado em tempo real e limite disponível.
* **Navegação por Faturas**:
  * Status automático por competência (**Aberta**, **Fechada**, **Paga**, **Atrasada** ou **Futura**).
  * Detalhamento de compras à vista e parceladas `(X/Y)`.
  * **Pagamento de Fatura**: Quitação integral ou parcial debitando diretamente da conta bancária escolhida.

---

### 🏦 Contas Bancárias, CDI & Rendimentos (`/contas`)
* Gestão de contas correntes, poupança, caixinhas/investimentos e carteira física.
* **Rendimentos Automáticos (`% do CDI` ou `% ao Mês`)**:
  * Configuração por conta (ex: 100% do CDI para Nubank, Mercado Pago, PicPay ou taxa mensal).
  * **Conciliação Inteligente**: Ao digitar o saldo atual do app do banco, o sistema calcula o ganho financeiro (`+R$`) e lança automaticamente como receita de investimento.
  * Projeção composta estimada para +30 dias e +12 meses.

---

### 🔁 Contas Fixas, Categorias & Extrato (`/recorrencias`, `/categorias`, `/transacoes`)
* **Contas Fixas & Recorrências**: Sincronização mensal automática de aluguel, luz, internet e assinaturas com escopo Pessoal ou Negócio.
* **Gestão de Categorias**: Cores, ícones e centros de custo configuráveis.
* **Extrato Completo**: Busca textual, filtros de escopo/status e exportação.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **Next.js 16** | Framework React com App Router, Server Components e Server Actions |
| **React 19** | Biblioteca para interfaces reativas de alta performance |
| **Tailwind CSS v4** | Estilização utility-first responsiva com tema escuro moderno e suporte PWA |
| **Supabase** | PostgreSQL com Row Level Security (RLS) e Stored Procedures (RPC atômica) |
| **Vitest** | Testes automatizados cobrindo lógica financeira, analytics, faturas e datas (56 testes) |
| **Lucide React** | Conjunto de ícones vetoriais modernos |
| **TypeScript** | Tipagem estática rigorosa de ponta a ponta |

---

## 📁 Estrutura do Projeto

```text
financeiro-app/
├── public/                     # Manifesto PWA, Service Worker e ícones
├── src/
│   ├── app/                    # Rotas da aplicação (Next.js App Router)
│   │   ├── auth/callback/      # Callback OAuth do Supabase
│   │   ├── cartoes/            # Cartões de Crédito e Faturas
│   │   ├── categorias/         # Categorias Pessoais e do Negócio
│   │   ├── clientes/           # CRM, Retenção e Aniversariantes
│   │   ├── contas/             # Contas Bancárias, CDI e Rendimentos
│   │   ├── dashboard/          # Dashboard Híbrido (Desktop & Mobile)
│   │   ├── login/              # Login com Google OAuth
│   │   ├── produtos/           # Catálogo de Produtos e Serviços
│   │   ├── recorrencias/       # Contas Fixas e Assinaturas
│   │   ├── transacoes/         # Extrato e Filtros
│   │   └── vendas/             # Checkout e Atendimentos
│   ├── components/
│   │   ├── accounts/           # Modais e cartões de contas
│   │   ├── cards/              # Gerenciador de cartões e faturas
│   │   ├── clients/            # CRM, radar WhatsApp e drawer
│   │   ├── dashboard/
│   │   │   ├── desktop/        # Visualizações dedicadas Desktop
│   │   │   ├── mobile/         # Visualizações dedicadas Mobile (Nubank + Balcão)
│   │   │   ├── BusinessDashboardView.tsx
│   │   │   ├── GeneralDashboardView.tsx
│   │   │   └── DashboardView.tsx
│   │   ├── layout/             # AppShell, Navbar, BottomNav, QuickActionDrawer
│   │   ├── sales/              # Comandas e PDV
│   │   └── transactions/       # Extrato e modais de movimentação
│   ├── context/                # DateContext e MobileNavigationContext
│   ├── hooks/                  # useIsMobile e hooks de estado
│   ├── lib/                    # Server Actions, clientes Supabase, utilitários e testes
│   └── types/                  # Tipagem TypeScript do banco de dados e domínio
└── supabase/
    └── migrations/             # Migrações SQL, RLS e RPCs atômicas
```

---

## 🧪 Testes Automatizados

Para executar a suíte completa de testes unitários:

```bash
npm test
```

Para verificar tipagem estática e regras de linting:

```bash
npx tsc --noEmit
npm run lint
```

---

## 📄 Licença

Este é um projeto **SaaS de código aberto** distribuído sob a licença [MIT](LICENSE).
