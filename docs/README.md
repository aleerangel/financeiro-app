# Documentação de Arquitetura & Engenharia de Requisitos — Canário

Este diretório contém o registro histórico e as especificações formais de engenharia de software da evolução da plataforma **Canário** (anteriormente BarberFin), um SaaS de controle financeiro e gestão para profissionais autônomos e microempresas.

---

## 🚀 Evolução SaaS Canário (Plataforma Multi-Segmento)

Documentação gerada nas fases da evolução do sistema para atendimento a múltiplos ramos profissionais:

1. **[01. Fase 1 — Diagnóstico da Arquitetura e Sistema Atual](./saas-canario/01-fase1-diagnostico-arquitetura.md)**
   * Análise completa e leitura estática de 14 rotas, 15 tabelas, 13 Server Actions, modelo de segurança RLS, acoplamentos de domínio e métricas de desempenho.
2. **[02. Fase 2 — Mapeamento de Reaproveitamento](./saas-canario/02-fase2-mapeamento-reaproveitamento.md)**
   * Classificação das funcionalidades em Reaproveitamento Direto (70%), Generalização (30%), Manutenção como Especialidade e Refatoração Técnica, com foco na não-perda de dados dos usuários legados.
3. **[03. Fase 3 — Especificação Formal de Requisitos](./saas-canario/03-fase3-especificacao-requisitos.md)**
   * Requisitos consolidados da plataforma Canário: marca oficial, 5 macro-segmentos suportados, onboarding com modo apenas pessoal, flexibilidade semântica de balcão, CRM preditivo calibrado e painel centralizado de configurações.
4. **[04. Fase 4 — Planejamento Técnico & Arquitetura](./saas-canario/04-fase4-planejamento-tecnico.md)**
   * Modelagem da tabela `business_profiles`, RLS, catálogo de presets (`business-presets.ts`), estratégia de migração sem downtime, mitigação de regressões e roteiro em 5 etapas incrementais.

---

## 📜 Histórico de Requisitos & Módulos Implementados

Registros de engenharia de requisitos de funcionalidades anteriores implementadas no sistema:

| Documento | Assunto / Módulo |
| :--- | :--- |
| [`requisitos_financeiro_app.md`](./historico-requisitos/requisitos_financeiro_app.md) | Especificação fundacional do controle financeiro pessoal |
| [`requisitos_produtos_vendas.md`](./historico-requisitos/requisitos_produtos_vendas.md) | PDV, comandas, catálogo de serviços e produtos |
| [`requisitos_gastos_barbearia.md`](./historico-requisitos/requisitos_gastos_barbearia.md) | Separação contábil de despesas da barbearia (`scope`) |
| [`requisitos_rendimentos_contas.md`](./historico-requisitos/requisitos_rendimentos_contas.md) | Rendimento automático CDI, caixinhas e conciliação |
| [`requisitos_evolucao_receitas_despesas.md`](./historico-requisitos/requisitos_evolucao_receitas_despesas.md) | Gráficos analíticos de evolução temporal por categoria |
| [`requisitos_dashboard_barbearia_clientes.md`](./historico-requisitos/requisitos_dashboard_barbearia_clientes.md) | Dashboard de negócio com ticket médio e clientes ativos |
| [`requisitos_experiencia_mobile_vs_web.md`](./historico-requisitos/requisitos_experiencia_mobile_vs_web.md) | Diretrizes de separação entre web desktop e mobile |
| [`engenharia_requisitos_redesign_mobile.md`](./historico-requisitos/engenharia_requisitos_redesign_mobile.md) | Redesign mobile estilo Nubank + Trinta com BottomNav |
| [`engenharia_requisitos_aba_resumo.md`](./historico-requisitos/engenharia_requisitos_aba_resumo.md) | Aba Resumo com gráficos minimalistas touch |
| [`requisitos_clientes_crm.md`](./historico-requisitos/requisitos_clientes_crm.md) | Gestão de clientes, histórico e inteligência de retorno |
| [`requisitos_vendas_prazo_amortizacao.md`](./historico-requisitos/requisitos_vendas_prazo_amortizacao.md) | Vendas a prazo (fiados) e amortizações atômicas |
| [`requisitos_central_fiados_receber.md`](./historico-requisitos/requisitos_central_fiados_receber.md) | Central de cobrança de devedores e amortização FIFO |
| [`requisitos_mensagens_whatsapp_barbearia.md`](./historico-requisitos/requisitos_mensagens_whatsapp_barbearia.md) | Templates de cobrança WhatsApp com chave Pix |
| [`requisitos_whatsapp_crm_retorno_aniversario.md`](./historico-requisitos/requisitos_whatsapp_crm_retorno_aniversario.md) | CRM com retorno, aniversariantes e recuperação de inativos |
| [`requisitos_sistema_notificacoes.md`](./historico-requisitos/requisitos_sistema_notificacoes.md) | Central de notificações, sininho e preferências de alerta |
| [`requisitos_assinaturas_mensalidades_barbearia.md`](./historico-requisitos/requisitos_assinaturas_mensalidades_barbearia.md) | Clube de assinaturas e mensalidades recorrentes |
| [`requisitos_gestao_avancada_mensalidades.md`](./historico-requisitos/requisitos_gestao_avancada_mensalidades.md) | Gestão avançada de faturas, MRR e inadimplência |
| [`requisitos_refatoracao_visual_desktop.md`](./historico-requisitos/requisitos_refatoracao_visual_desktop.md) | Refatoração visual desktop (Sidebar recolhível e AppHeader) |
| [`requisitos_notas_servico_venda_completas.md`](./historico-requisitos/requisitos_notas_servico_venda_completas.md) | Geração de notas de serviço e venda A4 com PDF e WhatsApp |
| [`requisitos_padronizacao_desktop_mobile.md`](./historico-requisitos/requisitos_padronizacao_desktop_mobile.md) | Padronização desktop vs mobile, modo de privacidade e resumo analítico |

