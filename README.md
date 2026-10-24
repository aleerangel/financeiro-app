# 🐤 Canário — Plataforma de Gestão Financeira Pessoal & Negócios Autônomos

🌐 **Acesse a aplicação online:** **[https://financeiro-app-rust.vercel.app/](https://financeiro-app-rust.vercel.app/)**

Uma plataforma web e mobile moderna, ágil e completa para **controle financeiro pessoal e gestão operacional de profissionais autônomos e pequenos negócios**. Desenvolvida com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Vitest** (111 testes unitários) e **Supabase (PostgreSQL)** com isolamento multi-tenant rigoroso via **Row Level Security (RLS)** e transações atômicas.

---

## 🚀 Da Barbearia à Plataforma Multi-Segmento

O projeto nasceu originalmente focado em barbearias (*BarberFin*) e evoluiu para o **Canário**: uma plataforma completa capaz de atender diferentes tipos de atividades profissionais sem burocracia, além de permitir o uso exclusivo para **Finanças Pessoais**.

### 💼 Segmentos Nativamente Suportados:
1. 💈 **Barbearias & Salões:** Atendimentos, cortes, barba, venda de pomadas e clube de assinaturas.
2. ✨ **Beleza, Estética & Bem-Estar:** Salões, manicures, clínicas de estética, spas e tatuadores.
3. 🔧 **Serviços Gerais & Manutenção:** Oficinas mecânicas, assistência técnica de celulares/computadores, eletricistas e encanadores (com Ordens de Serviço).
4. 🩺 **Saúde & Consultórios:** Psicólogos, fisioterapeutas, nutricionistas, dentistas e terapeutas (Consultas & Sessões).
5. 🎓 **Aulas, Treinamento & Consultoria:** Personal trainers, professores particulares, instrutores e consultores.
6. 🛍️ **Comércio Rápido & Autônomos:** Vendas de mercadorias, doces, lanches, pequenos artesãos e MEIs.
7. 👤 **Apenas Finanças Pessoais:** Modo minimalista que oculta ferramentas de balcão e foca em contas bancárias, cartões de crédito, despesas do dia a dia e investimentos.

> [!NOTE]
> **Compatibilidade Total para Usuários Existentes:** Todos os dados, históricos de vendas, clientes e finanças dos usuários da barbearia foram **100% preservados** na transição, acompanhados de um banner de boas-vindas para personalização opcional do Nome Fantasia.

---

## ✨ Funcionalidades Principais

### 1. 🏪 Gestão Operacional & Balcão ("Meu Negócio")
* **Checkout & Comandas Rápidas (`/vendas`)**:
  * Registro ágil de múltiplos produtos e serviços com busca preditiva de clientes ou atendimento avulso.
  * Nomenclatura dinâmica adaptada ao segmento (`sales_label`): *Atendimentos*, *Vendas*, *Consultas* ou *Ordens de Serviço*.
  * Formas de pagamento: Pix, Dinheiro, Débito, Crédito e **Venda a Prazo (Fiado)**.
  * Cadastro instantâneo de novos clientes sem sair do fluxo de venda.
* **Central de Fiados & Contas a Receber (`/fiados`)**:
  * Gestão de pendências com amortização proporcional e quitação automática via algoritmo FIFO.
  * Cobrança amigável via WhatsApp com dados Pix formatados e geração de recibos detalhados.
* **Clube & Assinaturas Recorrentes (`/mensalidades`)**:
  * Gestão de mensalistas com controle de status (Em Dia, A Vencer, Atrasado).
  * Lembrete de vencimento e recibo de quitação em 1 clique via WhatsApp.
* **Catálogo de Serviços & Estoque (`/produtos`)**:
  * Controle de preço de venda, custo de reposição e alertas de estoque baixo ($\le 2$).

---

### 2. 🤝 CRM Inteligente & Retenção Ativa (`/clientes`)
* **Radar Preditivo de Retorno**:
  * Algoritmo de cálculo de ciclo médio ponderado baseado no hábito real de visitação ($\ge 2$ atendimentos).
  * Classificação automática: 🟢 **Na Janela**, 🟡 **Em Dia**, 🟠 **Atrasado**, 🔴 **Sumido** e ⚪ **Novo**.
  * Selo VIP automático para clientes frequentes ($\ge 5$ visitas) ou que integram o Top 20% de faturamento.
* **Comunicação WhatsApp Inteligente**:
  * Modelos de mensagens personalizados (Cobrança Amigável/Firme, Recibo de Venda a Prazo, Radar de Retorno, Resgate de Inativos e Parabéns de Aniversário).
  * Assinatura profissional padronizada: `— {Nome Fantasia} • via Canário`.

---

### 3. 📊 Dashboard Híbrido Desktop & Mobile (`/dashboard`)
* **Alternador Direto [ Meu Negócio ] [ Visão Geral / Pessoal ]**:
  * **Visão Negócio**: Faturamento bruto, custos operacionais (fixos e variáveis), **Lucro Líquido Real**, **Ponto de Equilíbrio (*Break-even*)** e ticket médio.
  * **Visão Geral**: Saldo consolidado de todas as contas, faturas de cartão de crédito e patrimônio líquido.
* **Banner de Boas-Vindas & Painel "Meu Negócio"**:
  * Personalização do Nome Fantasia, segmento de atuação, ciclo padrão de retorno, dados Pix e opção de pausar/ativar o módulo de negócio.

---

### 4. 💳 Cartões de Crédito & Faturas (`/cartoes`)
* **Design de Cartão Físico**: Limite total, utilizado e disponível em tempo real.
* **Gestão de Faturas por Competência**: Status (Aberta, Fechada, Paga, Atrasada ou Futura) e compras parceladas `(X/Y)`.
* **Pagamento de Fatura**: Baixa direta da conta bancária escolhida com conciliação automática.

---

### 5. 🏦 Contas Bancárias & Rendimentos CDI (`/contas`)
* Gestão de contas correntes, poupança, investimentos, caixinhas e dinheiro físico.
* **Rendimento Automático do CDI (% do CDI ou taxa mensal)**:
  * Projeção automática para +30 dias e +12 meses.
  * **Conciliação Inteligente**: Ajuste rápido de rendimentos com lançamento automático do ganho financeiro apurado.

---

### 6. 🔁 Contas Fixas, Categorias & Extrato (`/recorrencias`, `/categorias`, `/transacoes`)
* **Contas Fixas & Recorrências**: Aluguel, contas de consumo e assinaturas com escopo Pessoal ou PJ.
* **Categorias Personalizadas**: Cores, ícones e separação clara entre despesas pessoais e custos operacionais.
* **Extrato Completo**: Busca textual, filtros de período e exportação de relatórios em CSV e JSON.

---

### 7. 📱 Experiência Mobile Dedicada & Rápida
* **Barra de Navegação Inferior Touch**:
  1. **Início**: Saldos imediatos, métricas operacionais e alternador de contexto touch.
  2. **Extrato**: Linha do tempo cronológica com confirmação de pagamento/recebimento com 1 toque.
  3. **Botão Central Elevado (+)**: Gaveta touch com ações rápidas de balcão e despesas.
  4. **Resumo**: Gráficos analíticos e divisão de faturamento.
  5. **Mais**: Hub de módulos, CRM, estoque, WhatsApp e configurações do negócio.
* **Modo Privacidade**: Ocultação rápida de saldos (`••••••`) para uso em ambientes públicos.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **Next.js 16** | Framework React com App Router, Turbopack, Server Components e Server Actions |
| **React 19** | Biblioteca para interfaces reativas de alto desempenho |
| **Tailwind CSS v4** | Estilização utility-first moderna com tema escuro e suporte PWA |
| **Supabase (PostgreSQL)** | Banco de dados relacional com Row Level Security (RLS) e Stored Procedures atômicas |
| **Vitest** | Suíte de testes automatizados com **111 testes unitários** passando |
| **Lucide React** | Conjunto de ícones vetoriais modernos |
| **TypeScript** | Tipagem estática estrita de ponta a ponta |

---

## 📁 Estrutura do Projeto

```text
financeiro-app/
├── docs/                           # Documentação técnica e histórico da evolução
│   ├── saas-canario/               # Diagnóstico, requisitos, planejamento e entrega do Canário
│   └── especificacoes/             # Especificações de fiados, CRM, WhatsApp e mobile
├── public/                         # Manifesto PWA, Service Worker e ícones
├── src/
│   ├── app/                        # Rotas da aplicação (Next.js App Router)
│   │   ├── (app)/                  # Rotas autenticadas sob o AppShell
│   │   │   ├── cartoes/            # Cartões de Crédito e Faturas
│   │   │   ├── categorias/         # Categorias Pessoais e do Negócio
│   │   │   ├── clientes/           # CRM, Retenção e Aniversariantes
│   │   │   ├── contas/             # Contas Bancárias, CDI e Rendimentos
│   │   │   ├── dashboard/          # Dashboard Híbrido (Desktop & Mobile)
│   │   │   ├── fiados/             # Central de Fiados & Vendas a Prazo
│   │   │   ├── mensalidades/       # Clube de Assinaturas e Mensalistas
│   │   │   ├── produtos/           # Catálogo de Serviços e Produtos
│   │   │   ├── recorrencias/       # Contas Fixas e Assinaturas
│   │   │   ├── transacoes/         # Extrato Completo e Filtros
│   │   │   └── vendas/             # Checkout de Balcão e Atendimentos
│   │   ├── auth/callback/          # Callback OAuth do Supabase
│   │   └── login/                  # Autenticação com Google OAuth
│   ├── components/
│   │   ├── accounts/               # Modais e cartões de contas
│   │   ├── cards/                  # Gerenciador de cartões e faturas
│   │   ├── clients/                # CRM, radar WhatsApp e histórico
│   │   ├── dashboard/              # Telas Desktop e Mobile do Dashboard
│   │   ├── fiados/                 # Modais de amortização e recibos
│   │   ├── layout/                 # AppShell, AppSidebar, AppHeader, BottomNav
│   │   ├── notifications/          # Central e sino de notificações
│   │   ├── onboarding/             # Assistente de primeiro acesso (Onboarding)
│   │   ├── sales/                  # Modais de atendimento e comanda
│   │   ├── settings/               # Modal Meu Negócio (Configurações)
│   │   └── transactions/           # Modais de receitas e despesas
│   ├── context/                    # DateContext, MobileNavigationContext, BusinessProfileContext
│   ├── hooks/                      # useIsMobile e hooks de estado
│   ├── lib/                        # Server Actions, utilitários, templates e presets
│   └── types/                      # Tipagem TypeScript do banco de dados e domínio
└── supabase/
    └── migrations/                 # Migrações SQL, RLS e isolamento multi-tenant
```

---

## 🧪 Testes Automatizados & Qualidade

Para executar a suíte completa de testes unitários:

```bash
npm test
```

Para verificar a integridade da tipagem TypeScript:

```bash
npx tsc --noEmit
```

Para checar a qualidade do código com ESLint:

```bash
npm run lint
```

Para gerar a build otimizada de produção:

```bash
npm run build
```

---

## 📚 Documentação Técnica

Os documentos detalhados de engenharia de requisitos e arquitetura estão organizados em [`docs/saas-canario/`](docs/saas-canario/):

- [`01-fase1-diagnostico-arquitetura.md`](docs/saas-canario/01-fase1-diagnostico-arquitetura.md): Inventário completo de rotas, banco de dados e acoplamentos.
- [`02-fase2-mapeamento-reaproveitamento.md`](docs/saas-canario/02-fase2-mapeamento-reaproveitamento.md): Matriz de reaproveitamento de código (70% reaproveitamento direto).
- [`03-fase3-especificacao-requisitos.md`](docs/saas-canario/03-fase3-especificacao-requisitos.md): Engenharia de requisitos interativa e regras do Canário.
- [`04-fase4-planejamento-tecnico.md`](docs/saas-canario/04-fase4-planejamento-tecnico.md): Modelagem do banco, RLS e plano de migração.
- [`05-fase5-entrega-implementacao.md`](docs/saas-canario/05-fase5-entrega-implementacao.md): Relatório de entrega das 5 etapas da implementação.

---

## 📄 Licença

Este é um projeto **SaaS de código aberto** distribuído sob a licença [MIT](LICENSE).
