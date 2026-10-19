# 💈 BarberFin — Gestão Financeira & Barbearia

Uma aplicação web moderna, ágil e completa para **gestão financeira pessoal e negócios de barbearia / serviços**, desenvolvida com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4** e **Supabase (PostgreSQL)** com isolamento de dados via **Row Level Security (RLS)**.

Projetada com foco em **velocidade de atendimento** no balcão e **clareza no fluxo de caixa**, permitindo acompanhar a lucratividade da cadeira da barbearia e as finanças gerais da vida real em um só lugar.

---

## ✨ Funcionalidades Principais

### 💈 Módulo da Barbearia & Atendimentos
* **Caixa & Comandas Rápidas (`/vendas`)**:
  * Seleção ágil de múltiplos produtos e serviços (Corte, Barba, Sobrancelha, etc.).
  * Vínculo inteligente com clientes cadastrados via busca automática, ou atendimento avulso para máxima rapidez.
  * Botão de **+ Novo Cadastro** na hora sem perder os serviços já marcados na comanda.
  * Escolha de forma de pagamento (Pix, Dinheiro, Débito, Crédito) e conta bancária de destino.
  * Escolha da data do atendimento (com data atual por padrão).
  * Geração automática de receita vinculada à categoria **Barbearia**.
* **Gestão de Clientes (`/clientes`)**:
  * Cadastro de clientes com Nome, Telefone, CPF e Observações (preferências de corte, etc.).
  * Busca em tempo real por nome, telefone ou CPF.
  * **Métricas por Cliente (LTV)**: Quantidade de visitas, total gasto histórico, data da última visita e ticket médio por visita.
  * **Atalho WhatsApp em 1 clique**: Conversa iniciada diretamente com o cliente.
* **Catálogo de Serviços & Produtos (`/produtos`)**:
  * Cadastro e edição de serviços e produtos com preço de venda, custo de reposição e comissão.
  * Ativação e desativação rápida de itens do menu.

---

### 📊 Dashboard Híbrido e Inteligente (`/dashboard`)
* **Alternância Negócio vs. Geral em 1 Clique**:
  * **Modo Negócio (Barbearia)**: Focado 100% no desempenho da barbearia — Faturamento mensal, atendimentos realizados, ticket médio, gráfico de evolução de vendas, ranking dos serviços mais vendidos e histórico de comandas.
  * **Modo Geral (Finanças Completas)**: Visão consolidada de todas as contas, faturas de cartão, despesas e receitas da sua vida.
* **Gráfico de Linhas com 3 Curvas Simultâneas**:
  * 🟢 **Saldo de Serviços**: Total gerado pelos atendimentos da barbearia.
  * 🔵 **Saldo Geral (Entradas)**: Todas as receitas somadas (barbearia + salário + investimentos).
  * 🟡 **Balanço Geral**: Diferença líquida entre entradas e saídas.
* **Comparativo Receitas vs. Despesas**:
  * **Barra de Receitas com Cores por Categoria**: Visualização proporcional segmentada de quanto veio da Barbearia vs. Outras fontes (Salário, Investimentos).
  * **Saldo Realizado Atual & Projeção do Mês**: Mostra claramente quanto já está em caixa hoje e qual a previsão de fechamento.
* **Gastos por Categoria (Gráfico Donut)**: Distribuição percentual das despesas com cores personalizadas.

---

### 💳 Cartões de Crédito & Parcelamento Automático (`/cartoes`)
* **Design de Cartão Físico**: Apresentação visual elegante com limite total, limite utilizado e limite disponível.
* **Inteligência de Fatura**: Controle automático do dia de fechamento (*melhor dia de compra*) e vencimento. Compras após o fechamento caem na fatura subsequente.
* **Parcelamento Automático**: Divide compras em até 24x gerando os lançamentos mensais com a tag `(X/Y)` nos meses corretos, com exclusão individual ou de todo o grupo.

---

### 🏦 Contas Bancárias & Carteiras (`/contas`)
* Gerenciamento de contas correntes, poupança, investimentos e carteira de dinheiro.
* **Ajuste Rápido de Saldo**: Botão de calibração para acertar o saldo bancário a qualquer momento sem distorcer o histórico de lançamentos.
* Saldo atualizado em tempo real com receitas e despesas quitadas.

---

### 🔁 Contas Fixas & Recorrências (`/recorrencias`)
* Cadastro e **edição completa** de despesas e receitas fixas (aluguel, internet, salários, assinaturas).
* **Sincronização Automática**: Ao editar o valor, vencimento ou categoria de uma conta fixa, os lançamentos do mês são atualizados automaticamente no Dashboard.
* Pausar e reativar recorrências com um clique.

---

### 🏷️ Gestão de Categorias (`/categorias`)
* Personalização completa de categorias de Receitas e Despesas.
* Seletor de cores em tempo real e dezenas de ícones visuais (tesoura, utensílios, carro, dinheiro, etc.).
* Categoria **Barbearia** integrada por padrão como receita dos atendimentos.

---

### 💸 Transações & Extrato (`/transacoes`)
* Listagem completa do mês com filtros por tipo (*Todas, Despesas, Cartão, Receitas, Pendentes*).
* **Edição de Transações**: Altere categoria, descrição, valor, data ou conta de qualquer lançamento com 1 clique.
* Toggle de confirmação rápida de pagamento (*Pago / Pendente*).

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **Next.js 16** | Framework React com App Router, Server Components e Server Actions |
| **React 19** | Biblioteca para interfaces reativas |
| **Tailwind CSS v4** | Estilização utility-first responsiva com tema escuro moderno |
| **Supabase** | Banco de dados PostgreSQL gerenciado, Auth e Row Level Security |
| **Lucide React** | Conjunto completo de ícones |
| **TypeScript** | Tipagem estática segura de ponta a ponta |

---

## 📁 Estrutura do Projeto

```text
financeiro-app/
├── public/                 # Arquivos estáticos e ícones
├── src/
│   ├── app/                # Rotas da aplicação (Next.js App Router)
│   │   ├── auth/callback/  # Callback de autenticação Supabase
│   │   ├── cartoes/        # Módulo de Cartões de Crédito
│   │   ├── categorias/     # Módulo de Gestão de Categorias
│   │   ├── clientes/       # Módulo de Gestão de Clientes
│   │   ├── contas/         # Módulo de Contas Bancárias
│   │   ├── dashboard/      # Dashboard Híbrido (Negócio & Geral)
│   │   ├── login/          # Tela de Login com Google OAuth
│   │   ├── produtos/       # Catálogo de Produtos e Serviços
│   │   ├── recorrencias/   # Contas Fixas e Assinaturas
│   │   ├── transacoes/     # Extrato e Gestão de Lançamentos
│   │   └── vendas/         # Frente de Caixa e Atendimentos
│   ├── components/         # Componentes React Reutilizáveis
│   │   ├── accounts/       # Modais e listagem de contas
│   │   ├── cards/          # Visual de cartões físicos
│   │   ├── categories/     # Modais e ícones de categorias
│   │   ├── clients/        # Modais e listagem de clientes
│   │   ├── dashboard/      # Gráficos de barras, donut e linha
│   │   ├── layout/         # AppShell, Navbar e BottomNav
│   │   ├── products/       # Modais de catálogo de serviços
│   │   ├── recurrences/    # Modais de contas fixas
│   │   ├── sales/          # Frente de caixa e comandas
│   │   └── transactions/   # Modais de nova transação e extrato
│   ├── context/            # Contextos globais (DateContext mês/ano)
│   ├── lib/
│   │   ├── actions/        # Server Actions (banco e regras de negócio)
│   │   ├── supabase/       # Clientes Supabase (Browser, Server, Middleware)
│   │   └── utils.ts        # Formatadores de moeda (BRL) e data
│   └── types/              # Definições TypeScript do banco de dados
└── supabase/
    └── migrations/         # Migrações SQL e DDL do banco
```

---

## 🚀 Como Executar Localmente

### 1. Clonar o Repositório
```bash
git clone https://github.com/aleerangel/financeiro-app.git
cd financeiro-app
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-supabase
```

### 4. Executar as Migrações no Supabase
Acesse o **SQL Editor** no painel do Supabase e execute os arquivos de migração presentes em `supabase/migrations/` na seguinte ordem:
1. `20261018000000_initial_schema.sql` (Estrutura base, contas, cartões e transações)
2. `20261018190000_products_and_sales.sql` (Módulo de produtos, catálogo e vendas)
3. `20261018203000_clients_schema.sql` (Tabela de clientes e vínculo com vendas)
4. `20261018210000_deduplicate_and_manage_categories.sql` (Deduplicação e índice único de categorias)
5. `20261018215000_default_barbearia_category.sql` (Vínculo padrão da categoria Barbearia)

### 5. Iniciar em Desenvolvimento
```bash
npm run dev
```
Abra **[http://localhost:3000](http://localhost:3000)** no navegador.

---

## 🌐 Deploy & Hospedagem na Vercel

O projeto está otimizado para deploy instantâneo na **[Vercel](https://vercel.com/)**:

1. Crie um novo projeto na Vercel e importe o repositório do GitHub.
2. Nas configurações do projeto na Vercel, adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Clique em **Deploy**.
4. No painel do **Supabase** (*Authentication ➔ URL Configuration*), adicione a URL da Vercel no **Site URL** e em **Redirect URLs** (`https://seu-app.vercel.app/**`).

---

## 📄 Licença

Distribuído sob a licença [MIT](LICENSE).
