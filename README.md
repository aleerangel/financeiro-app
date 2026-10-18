# 💰 Finanças Pessoais

Uma aplicação web moderna, ágil e inteligente para gestão de **finanças pessoais**, desenvolvida com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4** e **Supabase (PostgreSQL)** com isolamento completo de dados via **Row Level Security (RLS)**.

> 🚀 **Acesso Remoto:** Em breve a aplicação estará oficialmente hospedada e acessível remotamente online para uso em qualquer computador ou smartphone!

---

## ✨ Funcionalidades Principais

### 🔐 Autenticação & Segurança
* **Login Social com Google OAuth** integrado ao Supabase Auth.
* **Isolamento Total por Usuário (RLS)**: Políticas ativas no PostgreSQL garantem que nenhum usuário acesse dados de terceiros.
* **Middleware com Renovação de Sessão**: Suporte nativo a cookies seguros e compatibilidade com proxies de produção (`x-forwarded-host`).

### 📱 Experiência do Usuário (Mobile-First)
* **Design Responsivo & Dark Mode**: Interface moderna inspirada em fintechs, com alto contraste e navegação inferior (*Bottom Navigation Bar*) no celular.
* **Navegação Temporal Sincronizada**: Seletor de mês/ano no topo que atualiza todos os cards, relatórios e transações simultaneamente.

### 💳 Gestão de Cartões de Crédito & Parcelamento Automático
* **Visual de Cartão Físico**: Apresentação elegante com chip, dados de limite e cores personalizadas.
* **Controle de Ciclo de Faturas**: Considera o dia de fechamento (*melhor dia de compra*) e o dia de vencimento. Compras após o fechamento caem automaticamente na fatura do mês seguinte.
* **Motor de Parcelamento Automático**: Ao registrar uma compra parcelada (ex: R$ 600 em 6x), o sistema gera automaticamente os 6 lançamentos mensais com a etiqueta `(X/Y)` nos meses corretos, com possibilidade de exclusão individual ou em lote.
* **Acompanhamento de Limite**: Monitoramento em tempo real do limite total, limite utilizado e limite disponível com barra de progresso.

### 🏦 Contas Bancárias & Carteiras
* Cadastro de contas correntes, contas poupança, investimentos e carteira de dinheiro físico.
* **Cálculo de Saldo em Tempo Real**: O saldo disponível reflete o saldo inicial mais todas as receitas consolidadas menos as despesas pagas.

### 🔁 Contas Fixas & Recorrências Automáticas
* Cadastro de compromissos recorrentes (aluguel, salário, internet, streaming, assinaturas).
* **Projeção Mensal**: O sistema gera automaticamente os lançamentos com status *Pendente* na virada do mês, bastando um clique para confirmar o pagamento.
* Opção de pausar/reativar recorrências a qualquer momento.

### 📊 Dashboard com Gráficos Visuais
* **Cards Consolidadores**: Saldo total em contas, limite utilizado em faturas, receitas do mês e despesas do mês.
* **Gráfico Donut de Categorias**: Distribuição percentual dos gastos por categoria com legenda e valores em BRL.
* **Gráfico de Barras Receitas vs. Despesas**: Comparativo visual e indicador de **Taxa de Economia** (*percentual poupado no mês*).
* **Resumo Rápido**: Últimos lançamentos registrados no mês e atalho para novo lançamento.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** [Next.js 16](https://nextjs.org) (App Router, Server Components & Server Actions)
* **Biblioteca UI:** [React 19](https://react.dev)
* **Estilização:** [Tailwind CSS v4](https://tailwindcss.com)
* **Banco de Dados & Auth:** [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Triggers e Stored Procedures)
* **Ícones:** [Lucide React](https://lucide.dev)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org)

---

## 📁 Estrutura de Pastas

```text
financeiro-app/
├── public/                 # Arquivos estáticos e ícones
├── src/
│   ├── app/                # Rotas da aplicação (Next.js App Router)
│   │   ├── auth/callback/  # Callback OAuth da troca do código por sessão
│   │   ├── cartoes/        # Módulo de Cartões de Crédito
│   │   ├── contas/         # Módulo de Contas Bancárias e Carteiras
│   │   ├── dashboard/      # Painel Principal com Gráficos e Resumos
│   │   ├── login/          # Tela de Login com Google
│   │   ├── recorrencias/   # Módulo de Contas Fixas Recorrentes
│   │   ├── transacoes/     # Módulo de Transações e Lançamentos
│   │   ├── layout.tsx      # Layout Raiz e Configurações Globais
│   │   └── page.tsx        # Redirecionamento Inicial
│   ├── components/         # Componentes React Reutilizáveis
│   │   ├── accounts/       # Modais e Listagem de Contas
│   │   ├── cards/          # Visual de Cartão Físico e Modais
│   │   ├── dashboard/      # Gráficos (Donut e Barras) e DashboardView
│   │   ├── layout/         # AppShell, Navbar e BottomNav
│   │   ├── recurrences/    # Modais e Listagem de Recorrências
│   │   └── transactions/   # Modal de Nova Transação e TransactionsView
│   ├── context/            # Contextos React (DateContext para mês/ano)
│   ├── lib/
│   │   ├── actions/        # Server Actions (contas, cartões, transações, etc.)
│   │   ├── supabase/       # Clientes do Supabase (Browser, Server, Middleware)
│   │   ├── credit-card-utils.ts # Lógica matemática de faturas e parcelamento
│   │   └── utils.ts        # Formatadores de moeda (BRL) e data
│   ├── middleware.ts       # Proteção de rotas e sincronização de cookies
│   └── types/              # Definições de tipos TypeScript do banco de dados
└── supabase/
    └── migrations/         # Migrações SQL e scripts DDL do banco
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* **Node.js** (versão 18.18+ ou 20+)
* **npm**, **yarn** ou **pnpm**
* Uma conta e projeto no **[Supabase](https://supabase.com)**

### 2. Clonar o Repositório
```bash
git clone https://github.com/aleerangel/financeiro-app.git
cd financeiro-app
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Configurar as Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com base no arquivo `.env.example`:

```bash
cp .env.example .env.local
```

Preencha com as credenciais do seu projeto no Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-supabase
```

### 5. Configurar o Banco de Dados no Supabase
1. Acesse o painel do seu projeto no Supabase.
2. Navegue até o **SQL Editor**.
3. Abra e copie todo o conteúdo do arquivo [`supabase/migrations/20261018000000_initial_schema.sql`](supabase/migrations/20261018000000_initial_schema.sql).
4. Cole no editor do Supabase e clique em **Run**.

> Este script criará as tabelas, índices de alta performance, políticas RLS e os gatilhos que criam automaticamente a conta inicial e as categorias padrão assim que o usuário faz login pela primeira vez.

### 6. Configurar o Provedor Google no Supabase
1. No painel do Supabase, vá em **Authentication > Providers > Google** e ative-o com seu `Client ID` e `Client Secret` do Google Cloud Console.
2. Em **Authentication > URL Configuration > Redirect URLs**, adicione:
   * `http://localhost:3000/auth/callback` (para desenvolvimento local)
   * `https://seudominio.com/auth/callback` (para produção)

### 7. Executar a Aplicação
```bash
npm run dev
```

Abra **[http://localhost:3000](http://localhost:3000)** no seu navegador.

---

## 🌐 Hospedagem & Acesso Remoto

> ⏳ **Em breve:** A aplicação está sendo preparada para deploy em produção (Vercel). Muito em breve o link público estará disponível para acesso remoto seguro de qualquer lugar, direto pelo navegador ou adicionado como Web App na tela inicial do celular!

---

## 📜 Scripts Disponíveis

* `npm run dev`: Inicia o servidor local de desenvolvimento com Turbopack.
* `npm run build`: Compila a aplicação para produção.
* `npm run start`: Inicia o servidor de produção compilado.
* `npm run lint`: Executa a verificação estática de código com o ESLint.

---

## 📄 Licença

Este projeto é desenvolvido para fins de controle financeiro pessoal sob a licença [MIT](LICENSE).
