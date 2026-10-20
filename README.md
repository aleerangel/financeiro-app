# 💈 BarberFin — SaaS Open Source de Gestão Financeira & Negócios Autônomos

🌐 **Acesse a aplicação online:** **[https://financeiro-app-rust.vercel.app/](https://financeiro-app-rust.vercel.app/)**

Uma plataforma web moderna, ágil e completa para **gestão financeira pessoal e de negócios**, desenvolvida com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Vitest** e **Supabase (PostgreSQL)** com isolamento multi-usuário via **Row Level Security (RLS)**.

---

## 🚀 Visão do Projeto & Roadmap (SaaS Open Source)

O **BarberFin** nasceu com a proposta de ser um **SaaS de código aberto** (*Open Source SaaS*) focado em unir, sem burocracia, a gestão do caixa do trabalho com o controle das finanças pessoais:

1. **Fase Atual — Uso Pessoal & Testes de Expansão:**
   * Utilizado em produção no dia a dia real de operação e atualmente em fase inicial de testes de expansão com múltiplos usuários isolados (*multi-tenant* via Supabase RLS).
2. **Próximo Passo — Generalização para Todo Tipo de Negócio Autônomo:**
   * Evoluir e generalizar a estrutura atual (hoje otimizada para barbearias) para atender **qualquer profissional ou negócio autônomo** (estúdios de estética, salões, oficinas, clínicas, freelancers, prestadores de serviços e microempreendedores).
3. **Futuro — Planos de Assinatura (Mensal e Anual):**
   * Estruturação comercial do SaaS com **planos mensais e anuais**, oferecendo recursos avançados de gestão, relatórios inteligentes, CRM de retenção e automações para autônomos.

---

## ✨ Funcionalidades Principais

### 💈 Módulo de Negócio, Caixa & Custos Operacionais
* **Caixa & Comandas Rápidas (`/vendas`)**:
  * Seleção ágil de múltiplos produtos e serviços com busca rápida de clientes ou atendimento avulso.
  * Cadastro instantâneo de novo cliente sem sair da comanda.
  * Escolha de forma de pagamento (Pix, Dinheiro, Débito, Crédito), conta bancária de destino e data do atendimento.
  * Geração automática de receita vinculada à operação do negócio.
* **Custos da Barbearia & Lucro Líquido Real (`/dashboard` e `/transacoes`)**:
  * Classificação de despesas e contas fixas com escopo **Pessoal** ou **Negócio (Barbearia)**.
  * **DRE Simplificado no Dashboard**: Faturamento Bruto (`+`), Custos Operacionais Pagos e Pendentes (`-`), **Lucro Líquido Real (`=`)** e Margem Líquida (`%`).
  * **Ponto de Equilíbrio (*Break-even*)**: Barra de progresso mostrando quanto falta faturar no mês para cobrir 100% dos custos fixos e variáveis do negócio, além do custo médio por atendimento.
* **Catálogo de Serviços & Produtos (`/produtos`)**:
  * Cadastro e edição de serviços e produtos com preço de venda, custo de reposição e comissão.

---

### 🤝 CRM de Clientes & Retenção Ativa (`/clientes`)
* **Inteligência de Retorno & Fidelização**:
  * Configuração de ciclo esperado de retorno por cliente (ex: a cada 15, 21 ou 30 dias) e data de aniversário.
  * Classificação automática de status: 🟢 **Em dia**, 🟡 **Atenção (Prestes a vencer)**, 🔴 **Inativo / Sumido** e ⚪ **Sem visitas**.
* **Painel de Retenção & Aniversariantes**:
  * Abas rápidas para filtrar clientes sumidos, clientes em alerta de retorno e aniversariantes do mês.
  * **Atalho WhatsApp Inteligente**: Mensagens personalizadas geradas automaticamente conforme o contexto (convite de retorno, lembrete amigável ou parabéns de aniversário).
* **Raio-X do Cliente (*Drawer* de Histórico)**:
  * LTV (*Lifetime Value*), ticket médio, serviço favorito, frequência real de retorno e linha do tempo de todas as comandas e serviços realizados.

---

### 📊 Dashboard Híbrido e Inteligente (`/dashboard`)
* **Alternância Negócio vs. Geral em 1 Clique**:
  * **Modo Negócio**: Focado 100% na operação comercial — Faturamento, Custos da Barbearia, Lucro Líquido, Ponto de Equilíbrio, ranking de serviços/produtos e histórico de comandas.
  * **Modo Geral**: Visão consolidada de todas as contas bancárias, faturas de cartão, despesas pessoais/profissionais e receitas do mês.
* **Gráficos Analíticos e Comparativos**:
  * Evolução histórica em linhas com curvas de Serviços, Entradas Gerais e Balanço Líquido.
  * Comparativo de Receitas vs. Despesas com segmentação visual por categoria e projeção de fechamento do mês.
  * Gráfico Donut de distribuição percentual de gastos por categoria.

---

### 💳 Cartões de Crédito & Painel de Faturas (`/cartoes`)
* **Design de Cartão Físico**: Apresentação visual com limite total, limite utilizado em tempo real e limite disponível.
* **Aba de Faturas ao Clicar no Cartão**:
  * Navegação por abas mensais com status automático (**Aberta**, **Fechada**, **Paga**, **Atrasada** ou **Futura**).
  * Listagem detalhada de compras à vista e parceladas `(X/Y)` da competência selecionada.
  * **Pagamento de Fatura (Integral ou Parcial)** debitando diretamente da conta bancária escolhida.

---

### 🏦 Contas Bancárias, CDI & Rendimentos (`/contas`)
* Gerenciamento de contas correntes, poupança, caixinhas/investimentos e carteira física.
* **Contabilização de Juros e Rendimentos (`% do CDI` ou `% ao Mês`)**:
  * Configuração de taxa por conta (ex: `100% do CDI` para Nubank/Mercado Pago/PicPay ou taxa fixa mensal para Poupança).
  * **Conciliação Inteligente de Saldo**: Basta informar o saldo atual exibido no aplicativo do banco e o sistema calcula a diferença positiva (`+R$`), registrando automaticamente uma receita na categoria **Investimentos**.
  * **Simulador & Projeção Composta**: Acompanhamento de quanto rendeu no mês, acumulado histórico e projeção estimada para +30 dias e +12 meses.

---

### 🔁 Contas Fixas, Categorias & Extrato (`/recorrencias`, `/categorias`, `/transacoes`)
* **Contas Fixas & Recorrências**: Sincronização automática de despesas e receitas recorrentes (aluguel, internet, assinaturas) com suporte a escopo Pessoal ou Negócio.
* **Gestão de Categorias**: Personalização completa de cores, ícones e vínculo padrão de categorias operacionais.
* **Extrato Completo & Exportação CSV**: Filtros combinados por tipo, escopo e status (*Pago / Pendente*), busca textual e exportação rápida do extrato para CSV.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **Next.js 16** | Framework React com App Router, Server Components e Server Actions |
| **React 19** | Biblioteca para interfaces reativas de alta performance |
| **Tailwind CSS v4** | Estilização utility-first responsiva com tema escuro moderno e suporte PWA |
| **Supabase** | Banco de dados PostgreSQL, Autenticação OAuth e isolamento Row Level Security (RLS) |
| **Vitest** | Testes automatizados de regras de negócio, cálculos financeiros e analytics |
| **Lucide React** | Conjunto de ícones visuais |
| **TypeScript** | Tipagem estática segura de ponta a ponta |

---

## 📁 Estrutura do Projeto

```text
financeiro-app/
├── public/                 # Manifesto PWA, Service Worker e ícones
├── src/
│   ├── app/                # Rotas da aplicação (Next.js App Router)
│   │   ├── auth/callback/  # Callback de autenticação OAuth Supabase
│   │   ├── cartoes/        # Cartões de Crédito e Painel de Faturas
│   │   ├── categorias/     # Gestão de Categorias Pessoais e do Negócio
│   │   ├── clientes/       # CRM de Clientes, Retenção e Aniversariantes
│   │   ├── contas/         # Contas Bancárias, CDI e Rendimentos
│   │   ├── dashboard/      # Dashboard Híbrido (Negócio & Geral)
│   │   ├── login/          # Tela de Login com Google OAuth
│   │   ├── produtos/       # Catálogo de Produtos e Serviços
│   │   ├── recorrencias/   # Contas Fixas e Assinaturas
│   │   ├── transacoes/     # Extrato Completo, Filtros e Exportação CSV
│   │   └── vendas/         # Frente de Caixa e Comandas Rápidas
│   ├── components/         # Componentes React modulares
│   ├── context/            # Contextos globais (DateContext mês/ano)
│   ├── lib/                # Server Actions, clientes Supabase, utilitários e testes
│   └── types/              # Definições TypeScript do domínio e banco de dados
└── supabase/
    └── migrations/         # Migrações SQL e políticas de segurança RLS
```

---

## 📄 Licença

Este é um projeto **SaaS de código aberto** distribuído sob a licença [MIT](LICENSE).
