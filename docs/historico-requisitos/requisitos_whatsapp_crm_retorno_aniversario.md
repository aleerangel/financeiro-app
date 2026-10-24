# Engenharia de Requisitos: Expansão do WhatsApp para Retenção, Radar de Retorno e Aniversários (CRM)

## 1. Visão Geral e Objetivos

Expandir a inteligência de mensagens de WhatsApp para o relacionamento contínuo com os clientes (CRM da Barbearia), impulsionando a recorrência e a taxa de ocupação da cadeira do barbeiro.

### Objetivos Estratégicos:
1. **Radar de Retorno Ativo:** Convidar o cliente para renovar o corte exatamente no momento em que seu cabelo está crescendo e ele atinge o ciclo médio histórico de visitas (ex: a cada 15, 21 ou 30 dias).
2. **Resgate Eficaz de Clientes Inativos (Churn):** Identificar clientes que sumiram há mais de 45 a 60 dias e reativá-los com mensagens empáticas e ofertas de retorno.
3. **Fidelização e Relacionamento (Aniversários):** Parabenizar o cliente no dia ou mês do seu aniversário, gerando conexão emocional e trazendo o cliente para a cadeira.
4. **Governança de Comunicação (Anti-Spam):** Registrar quando cada cliente foi chamado pela última vez no WhatsApp (`last_contacted_at`) para evitar mensagens repetitivas ou inconvenientes no mesmo período.

---

## 2. Requisitos Funcionais (RF)

### RF-01: Cadastro de Data de Nascimento do Cliente
- No cadastro e edição de clientes ([`ClientModal`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/clients/ClientModal.tsx)), adicionar o campo opcional:
  - **Data de Nascimento** (`birth_date`, DATE com máscara `DD/MM/AAAA`).
- Exibição de indicador/ícone de bolo 🎂 no perfil do cliente quando fizer aniversário no mês corrente ou no dia.

---

### RF-02: Modal de Engajamento WhatsApp ([`ClientEngagementWhatsAppModal`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/clients/ClientEngagementWhatsAppModal.tsx))
Substitui o disparo direto de links crus por uma experiência com pré-visualização, edição livre e seletor de tom conforme o objetivo:

#### Cenário A: Radar de Retorno Inteligente (`return_window` / `overdue`)
- **Gatilho:** Cliente dentro da janela prevista de retorno calculada pelo [`client-analytics.ts`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/client-analytics.ts) (`in_window` ou `overdue`).
- **Tons Selecionáveis:**
  1. *Casual / Parceria:* "Fala {primeiro_nome}, tudo na paz, irmão? Já faz {dias_ultima_visita} dias desde o último corte. Bora dar aquele talento no visual essa semana? ✂️💈"
  2. *Convite VIP:* "Olá {primeiro_nome}! Como está a correria? Notamos que seu ciclo de corte está no momento ideal. Se quiser, já posso garantir seu horário nos próximos dias!"
  3. *Agendamento Rápido:* "Fala {primeiro_nome}! Passando para lembrar do seu visual. Qual o melhor dia e horário para você esta semana?"

#### Cenário B: Resgate de Clientes Inativos (`inactive_recovery` / `missing`)
- **Gatilho:** Cliente sem visitar a barbearia há mais de 45 dias.
- **Tons Selecionáveis:**
  1. *Saudades / Parceria:* "Fala {primeiro_nome}, sumiu, irmão! Já faz mais de {dias_ultima_visita} dias que a gente não se vê aqui na barbearia. Tudo certo por aí? Bora renovar o estilo!"
  2. *Oferta Especial de Retorno:* "Fala {primeiro_nome}! Sentimos sua falta por aqui. Que tal passar essa semana para um corte e bater um papo? Tenho uma condição especial esperando por você!"
  3. *Pesquisa de Feedback:* "Olá {primeiro_nome}, tudo bem? Sentimos sua falta na barbearia. Caso tenha algum horário ou serviço que você prefira, conta com a gente!"

#### Cenário C: Parabéns de Aniversário (`birthday`)
- **Gatilho:** Aniversariante do dia ou do mês.
- **Tons Selecionáveis:**
  1. *Felicitações Especiais:* "Fala {primeiro_nome}, feliz aniversário, irmão! 🎂🎉 Muita saúde, paz e sucesso sempre! Que seu dia seja top!"
  2. *Presente da Barbearia:* "Parabéns {primeiro_nome}! Hoje o dia é todo seu! 💈🎂 Passando pra te desejar um feliz aniversário e te convidar pra vir tomar uma gelada e renovar o corte com a gente!"

---

### RF-03: Rastreamento de Contato e Proteção Anti-Spam
- Campo `last_contacted_at` (TIMESTAMPTZ) gravado na tabela `clients`.
- Ao clicar em **"Abrir no WhatsApp"** ou **"Copiar Mensagem"** no modal de engajamento, o sistema atualiza automaticamente o timestamp de contato.
- **Badge Informativo no Modal e no CRM:**
  - *Nunca contatado*: Badge neutro cinza.
  - *Contatado recentemente (< 14 dias)*: Alerta visual em âmbar:
    > ⚠️ *Cliente já contatado via WhatsApp há 4 dias (em 19/10). Evite envios repetitivos.*
  - *Contatado há mais de 15 dias*: Badge verde informativo (*"Último contato há 22 dias"*).

---

### RF-04: Filtros e Abas no CRM de Clientes ([`ClientsList`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/clients/ClientsList.tsx))
Adicionar pílulas de filtros rápidos na tela de clientes:
1. **Todos** (contagem geral)
2. **Janela de Retorno** (clientes com `status === 'in_window'` ou `overdue`)
3. **Inativos para Resgate** (clientes com `status === 'missing'` ou +45d sem vir)
4. **Aniversariantes do Mês** (clientes com aniversário no mês vigente)
5. **Com Débito Fiado** (clientes com pendências em aberto)

---

### RF-05: Integração no Dashboard da Barbearia
Nos cards de "Alerta de Retenção: Clientes para Retorno (+30 dias)" do dashboard Desktop e Mobile:
- O botão de WhatsApp que hoje abre diretamente o link cru passará a abrir o `ClientEngagementWhatsAppModal` com o tom de retorno já parametrizado.

---

### RF-06: Configurações de Templates Adicionais
Na tela de configurações de mensagens ([`MessageSettingsModal`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/fiados/MessageSettingsModal.tsx)):
- Adicionar os templates de:
  - *Radar de Retorno* (`template_return_window`)
  - *Resgate de Inativos* (`template_inactive_recovery`)
  - *Mensagem de Aniversário* (`template_birthday`)
- Novas tags suportadas: `{dias_ultima_visita}`, `{ultimo_servico}`.

---

## 3. Modelo de Dados & Migrations

### Modificações no Banco de Dados Supabase

```sql
-- 1. Colunas adicionadas na tabela 'clients'
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Índice para busca rápida de aniversariantes e histórico de contato
CREATE INDEX IF NOT EXISTS idx_clients_birth_date ON public.clients(user_id, birth_date);
CREATE INDEX IF NOT EXISTS idx_clients_last_contacted ON public.clients(user_id, last_contacted_at);

-- 2. Colunas adicionadas na tabela 'business_message_settings'
ALTER TABLE public.business_message_settings
ADD COLUMN IF NOT EXISTS template_return_window TEXT,
ADD COLUMN IF NOT EXISTS template_inactive_recovery TEXT,
ADD COLUMN IF NOT EXISTS template_birthday TEXT;
```

---

## 4. Diagrama de Fluxo e Experiência do Usuário

```mermaid
flowchart TD
    A[Barbeiro no CRM / Dashboard] --> B{Qual o Contexto do Cliente?}
    B -->|Janela de Retorno| C[Abre Modal: Radar de Retorno]
    B -->|Sumido +45 dias| D[Abre Modal: Resgate de Inativos]
    B -->|Aniversário| E[Abre Modal: Felicitações]
    B -->|Geral| F[Abre Modal: Contato Casual]

    C --> G[Verifica 'last_contacted_at']
    D --> G
    E --> G
    F --> G

    G --> H{Contatado há menos de 14 dias?}
    H -->|Sim| I[Exibe aviso: 'Contatado há X dias']
    H -->|Não| J[Badge: Pronto para contato]

    I --> K[Alterna Tom: Casual, VIP ou Oferta]
    J --> K
    K --> L[Revisa/Edita o texto no Textarea]
    L --> M[Clica em Abrir WhatsApp]
    M --> N[Abre wa.me e grava 'last_contacted_at = NOW()']
```

---

## 5. Plano de Execução Técnica

1. **Migration SQL:** Adicionar `birth_date` e `last_contacted_at` na tabela `clients` e templates no `business_message_settings`.
2. **Atualização de Tipos & Server Actions:**
   - Adicionar campos no `src/types/database.ts` e `src/lib/actions/clients.ts`.
   - Adicionar Server Action `markClientContacted(clientId: string)`.
3. **Templates & Engine:**
   - Adicionar templates de Retorno, Inativos e Aniversário em `src/lib/whatsapp-templates.ts` com testes unitários.
4. **Criação do `ClientEngagementWhatsAppModal.tsx`:**
   - Componente moderno com seletores de tom, preview, alerta anti-spam e gravação de contato.
5. **Integração no CRM (`ClientsList.tsx` e `ClientModal.tsx`):**
   - Campo Data de Nascimento no formulário de cliente.
   - Pílula/Filtro "Aniversariantes", "Janela de Retorno" e "Inativos".
   - Botão de WhatsApp acionando o novo modal.
6. **Integração no Dashboard (Desktop & Mobile):**
   - Conectar os cards de clientes para retorno ao novo modal.
7. **Verificação & Testes:**
   - Testes vitest, verificação TypeScript (`tsc --noEmit`), linter e commit em português.
