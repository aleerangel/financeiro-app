# Fase 3 — Especificação Formal de Requisitos (Canário SaaS Multi-Segmento)

> [!IMPORTANT]
> **Status:** Especificação elaborada interativamente a partir das decisões confirmadas nas rodadas de alinhamento com o usuário. Nenhuma funcionalidade futura foi presumida sem validação prévia.

---

## 1. Identidade, Posicionamento e Marca

### REQ-01: Naming Oficial da Plataforma
* **Identidade Principal:** A plataforma passa a se chamar oficialmente **Canário**.
* **Marca na Interface:** O topo da barra lateral desktop ([`AppSidebar.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/layout/AppSidebar.tsx)), o cabeçalho ([`AppHeader.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/layout/AppHeader.tsx)), a tela de login e o cabeçalho mobile passam a exibir o nome **Canário**, acompanhado do **Nome Fantasia do Negócio** do profissional (ex: `Canário • Barbearia Silva`, `Canário • Studio Ana`, `Canário • Oficina Central`).
* **Seletor de Contexto:** A alternância de contexto (no desktop e mobile) passa a utilizar os rótulos `[ Pessoal ]` e `[ Meu Negócio ]` (ou o Nome Fantasia cadastrado).

---

## 2. Segmentos de Atuação e Suporte a Perfis

### REQ-02: Segmentos Oficiais Suportados
O sistema deve fornecer presets otimizados para 5 macro-segmentos, além de suporte a autônomos genéricos:
1. **Beleza, Estética e Bem-estar:** Barbearias, Salões de Beleza, Manicures/Designers, Clínicas de Estética, Tatuadores.
2. **Serviços Gerais e Manutenção:** Oficinas Mecânicas, Técnicos de Informática/Celulares, Eletricistas, Marceneiros, Encanadores.
3. **Saúde e Consultórios:** Psicólogos, Nutricionistas, Fisioterapeutas, Terapeutas.
4. **Aulas, Treinamento e Consultoria:** Personal Trainers, Professores Particulares, Instrutores, Consultores.
5. **Comércio Rápido e Autônomos em Geral:** Venda de produtos, lanches, pequenos artesãos e prestadores avulsos.

### REQ-03: Preservação Integral de Usuários Existentes (Modo Barbearia)
* **Regra de Ouro:** Nenhum usuário atual da barbearia perderá dados, categorias, comandas, histórico de clientes ou configurações.
* **Detecção Automática:** Usuários que já possuem histórico ou categorias do tipo `"Barbearia"` / `"Insumos & Barbearia"` têm seu perfil automaticamente reconhecido como `segmento = 'barbearia'`, com Nome Fantasia inicial `"Minha Barbearia"` (ou derivado do e-mail/perfil), preservando todas as rotinas e nomenclaturas atuais.
* **Banner de Transição:** Um aviso amigável e discreto será exibido para usuários legados no primeiro acesso ao Canário, informando a evolução da plataforma e convidando-os a personalizar seu Nome Fantasia e chave Pix nas configurações.

---

## 3. Experiência de Onboarding e Flexibilidade de Uso

### REQ-04: Assistente Rápido de Primeiro Acesso (Onboarding)
* Para novos usuários que acabaram de fazer login via Google:
  * **Passo 1 (Opção de Escolha):** Pergunta se o usuário deseja gerenciar um negócio ou utilizar a plataforma exclusivamente para controle financeiro pessoal.
  * **Passo 2 (Dados do Negócio — se aplicável):**
    * Nome Fantasia do Negócio.
    * Segmento de atuação (dentre os 5 segmentos oficiais ou "Outro").
    * Chave Pix profissional para recebimentos (opcional).
  * **Passo 3 (Geração de Presets):** O sistema cria automaticamente o pacote inicial de categorias de receita e despesa pertinentes ao segmento escolhido (além das categorias pessoais padrão).

### REQ-05: Modo "Apenas Finanças Pessoais"
* Se o usuário optar por usar o Canário apenas para fins pessoais (sem negócio):
  * A interface simplifica a navegação: **oculta** os módulos de balcão/vendas, clientes, fiados e produtos.
  * O alternador de contexto `[Pessoal] / [Negócio]` fica desativado, focando 100% no controle pessoal (Dashboard, Transações, Contas, Cartões, Contas Fixas e Categorias).
  * Um botão discreto e convidativo **"Ativar Meu Negócio"** fica disponível na sidebar desktop e na aba "Mais" do mobile, permitindo ativar o módulo profissional a qualquer momento.

---

## 4. Balcão, Checkout e Flexibilidade Semântica

### REQ-06: Nomenclatura Flexível do Módulo de Balcão (`/vendas`)
* A terminologia das telas e botões de registro de venda/comanda se adapta ao segmento configurado:
  * *Beleza / Estética:* **"Atendimentos & Vendas"** (Botão: "Novo Atendimento").
  * *Serviços / Manutenção:* **"Ordens de Serviço & Vendas"** (Botão: "Nova O.S.").
  * *Saúde / Consultórios:* **"Consultas & Sessões"** (Botão: "Nova Consulta").
  * *Aulas / Treinamento:* **"Aulas & Atendimentos"** (Botão: "Nova Aula").
  * *Comércio / Geral:* **"Vendas & Pedidos"** (Botão: "Nova Venda").
* **Customização pelo Usuário:** O profissional pode alterar esse termo livremente nas Configurações do Negócio para a palavra que melhor descrever seu dia a dia.
* **Estrutura Técnica Preservada:** A URL técnica permanece `/vendas` e a RPC atômica `create_sale_atomic` permanece idêntica no banco de dados.

---

## 5. CRM, Retenção e Inteligência de Retorno de Clientes

### REQ-07: Ciclo de Retorno Inteligente Parametrizável
* **Ciclo Padrão do Negócio:** O profissional pode configurar nas preferências o ciclo de retorno padrão do seu estabelecimento (ex.: 21 dias para barbearia, 30 dias para estética, 90 dias para manutenção preventiva, etc.).
* **Regra de Cálculo Individual:**
  * O cálculo individual ponderado do cliente só é projetado quando o cliente tiver **retorno suficiente** (no mínimo 2 visitas em datas distintas).
  * Clientes com apenas 1 visita não terão ciclo presumido forçado de 21 dias; o sistema aguardará histórico suficiente ou utilizará o ciclo padrão configurado pelo profissional como referência neutra.
* **Preservação de VIPs e Histórico:** O algoritmo de identificação de VIPs (Top 20%) e o histórico cronológico completo de atendimentos permanecem 100% ativos para todos os segmentos.

---

## 6. Clube de Assinaturas e Mensalidades Recorrentes

### REQ-08: Módulo de Mensalidades para Todos os Perfis
* Mantido de forma centralizada dentro da página de Clientes ([`/clientes?tab=subscriptions`](file:///home/alexandrerangel/Projetos/financeiro-app/src/app/(app)/clientes/page.tsx)), permitindo cadastrar:
  * Clubes de assinatura e planos recorrentes (mensalistas de barbearia, planos mensais de estética/unhas, contratos de manutenção preventiva, mensalidades de personal trainer/aulas, planos de saúde/consultas).
* Acompanhamento de MRR (Receita Recorrente Mensal), faturas pagas e faturas em atraso.
* Geração de recibos e lembretes de cobrança via WhatsApp.

---

## 7. Mensagens de WhatsApp e Cobrança Pix

### REQ-09: Assinatura e Templates Profissionais Neutros
* **Assinatura:** As mensagens passam a ser assinadas com o **Nome Fantasia do Negócio** do usuário (ex: `— Barbearia Silva`, `— Studio Bella`, `— Oficina do Zé`), podendo conter menção sutil ao Canário (`— Nome do Negócio • via Canário`).
* **Presets de Templates:** O sistema fornecerá templates padrão profissionais e neutros para cobrança de fiados, recibos de quitação, lembretes de retorno e aniversariantes, eliminando gírias restritas à barbearia para quem atua em outros ramos.
* **Usuários Legados:** Os templates já customizados e salvos no banco pelos usuários existentes não sofrerão nenhuma alteração.

---

## 8. Configurações Centralizadas ("Meu Negócio")

### REQ-10: Painel de Configurações do Negócio
* Unificação dos formulários de dados profissionais em uma seção ou página de configurações acessível pelo Desktop e Mobile:
  * **Identidade do Negócio:** Nome Fantasia, Segmento de Atuação e Nomenclatura preferida para comandas/vendas.
  * **Dados Financeiros:** Chave Pix (tipo, chave e titular) e Conta Bancária padrão para recebimentos.
  * **CRM & Retenção:** Ciclo padrão de retorno estimado em dias.
  * **Mensagens WhatsApp:** Visualização e edição de templates para cobrança, recibo, retorno e aniversário.
  * **Ativação/Desativação do Módulo:** Opção para ativar o negócio (caso o usuário tenha começado apenas como pessoal) ou desativá-lo temporariamente.

---

## 9. Tabela de Rastreabilidade de Requisitos

| Requisito | Funcionalidade Impactada | Mudança no Banco de Dados | Mudança na Interface |
| :--- | :--- | :--- | :--- |
| **REQ-01** | Marca Canário & Nome Fantasia | Nova tabela/colunas de perfil | Topo da sidebar, header e títulos |
| **REQ-02** | Segmentos Oficiais Suportados | Presets em catálogo/código | Onboarding e Configurações |
| **REQ-03** | Preservação de Usuários Atuais | Nenhuma (dados intocados) | Banner amigável de boas-vindas |
| **REQ-04** | Onboarding Rápido | Inserção do perfil de negócio | Modal de boas-vindas no 1º acesso |
| **REQ-05** | Modo Apenas Finanças Pessoais | Flag de negócio ativo no perfil | Ocultação de abas de negócio na UI |
| **REQ-06** | Nomenclatura Flexível de Vendas | Coluna de rótulo no perfil | Títulos e botões de `/vendas` |
| **REQ-07** | Ciclo de Retorno Inteligente | Coluna `default_cycle_days` | Parametrização em `client-analytics` |
| **REQ-08** | Assinaturas & Mensalidades | Nenhuma (já implementado) | Rótulos agnósticos a nicho |
| **REQ-09** | WhatsApp com Nome Fantasia | Presets de templates neutros | Assinatura e modais de WhatsApp |
| **REQ-10** | Painel "Meu Negócio" | Tabela `business_profiles` | Nova seção de Configurações |

---

## 10. Próximo Passo

Com esta especificação de requisitos concluída e alinhada às suas respostas, aguardo sua aprovação para avançarmos para a **Fase 4 — Planejamento Técnico** (onde definiremos as alternativas de arquitetura de dados, modelagem da tabela de perfil, dependências e plano de execução passo a passo).
