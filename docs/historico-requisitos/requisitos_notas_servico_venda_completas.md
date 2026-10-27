# Especificação de Requisitos: Geração de Notas de Serviço & Venda com PDF e WhatsApp

Este documento registra a especificação formal, engenharia de requisitos e decisões de arquitetura para a funcionalidade de emissão de **Notas de Serviço e Comprovantes de Venda** do Canário.

---

## 1. Visão Geral e Problema Resolvido

Anteriormente, o sistema permitia registrar vendas e atendimentos, mas não fornecia ao profissional uma forma padronizada, formal e profissional de emitir um comprovante fiscal/comercial para o cliente final. 

Muitos profissionais autônomos, MEIs e pequenas empresas precisam enviar comprovantes detalhados contendo:
- Discriminação clara dos serviços prestados e produtos adquiridos;
- Valores unitários, descontos, acréscimos e subtotais;
- Identificação da empresa (Nome Fantasia, CNPJ e contatos);
- Identificação do cliente (Nome, documento e telefone);
- Condições de pagamento (à vista ou a prazo com histórico de amortizações);
- Termos de garantia, validade e observações personalizadas.

Além disso, era essencial permitir o **envio direto do arquivo PDF pelo WhatsApp** sem atritos no smartphone, além de download e impressão.

---

## 2. Decisões de Engenharia & Regras de Negócio

### 2.1. Padrão Visual A4 Formal Empresarial
- **Layout:** Estrutura vertical formato A4 com margens equilibradas, tipografia sóbria e paleta elegante.
- **Cabeçalho:**
  - Título do documento dinâmico (ex.: "NOTA DE SERVIÇO / COMPROVANTE DE VENDA", "ORDEM DE SERVIÇO" ou "COMPROVANTE DE ATENDIMENTO").
  - Identificador único da transação (ex.: `#VEN-102948`).
  - Data e hora de emissão.
  - Dados do Emissor: Nome Fantasia, CNPJ (com máscara e validação), endereço/telefone se preenchidos.
- **Dados do Cliente:** Nome completo, telefone/WhatsApp e CPF (se cadastrado).
- **Tabela de Itens:** Colunas para Descrição do Item/Serviço, Quantidade, Valor Unitário (R$) e Subtotal (R$).
- **Resumo Financeiro:**
  - Subtotal dos itens;
  - Desconto ou acréscimo aplicado;
  - Valor total líquido;
  - Forma de pagamento e status (Pago ou Saldo Pendente).
- **Condições Especiais para Fiados / Vendas a Prazo:**
  - Valor pago no ato, saldo restante e data de vencimento;
  - Histórico de amortizações parciais realizadas (com data, valor amortizado e meio de pagamento de cada amortização).
- **Remoção de Dados Pix Desnecessários:**
  - Se a venda já foi paga ou se não há saldo a receber, os dados de chave PIX **não são forçados na nota**, mantendo o documento limpo.
  - A chave PIX e instruções de acerto só são incluídas caso haja pendência de pagamento ou quando explicitamente solicitado.
- **Termos de Garantia e Observações:**
  - Campo flexível para inclusão de termos de garantia de serviço, prazo de devolução ou recados de fidelidade.

---

### 2.2. Envio pelo WhatsApp e Web Share API
- **Dispositivos Móveis e Navegadores Compatíveis:**
  - Implementado envio com anexo real do PDF via `navigator.share` (Web Share API com suporte a arquivos `File`/`Blob`).
  - O usuário clica em "Enviar via WhatsApp" e o próprio aplicativo do WhatsApp abre diretamente com o documento PDF anexado pronto para envio à conversa do cliente.
- **Fallback Automático:**
  - Caso o navegador ou dispositivo não suporte compartilhamento de arquivos via Web Share API (ex.: navegadores desktop legados), o sistema realiza automaticamente o download local do arquivo PDF e abre o WhatsApp Web com uma mensagem de texto elegante e formatada com o resumo da nota.

### 2.3. Ergonomia Mobile
- **Botão Voltar Nativo:**
  - Adicionado botão de retorno intuitivo no topo do modal/tela no mobile para permitir que o usuário retorne imediatamente à lista de vendas ou ao extrato sem fechar acidentalmente a navegação.

---

## 3. Arquitetura Técnica e Arquivos

| Arquivo | Responsabilidade |
| :--- | :--- |
| [`src/lib/sale-receipt-utils.ts`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/sale-receipt-utils.ts) | Gerador de PDF em formato A4 (`jsPDF` + `jspdf-autotable`), formatador de mensagens WhatsApp e orquestrador da Web Share API |
| [`src/lib/sale-receipt-utils.test.ts`](file:///home/alexandrerangel/Projetos/financeiro-app/src/lib/sale-receipt-utils.test.ts) | Bateria de testes unitários automatizados cobrindo geração de PDF, dados de venda e templates |
| [`src/components/sales/SaleReceiptModal.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/sales/SaleReceiptModal.tsx) | Interface modal com visualização da folha A4, ações de baixar PDF, imprimir e compartilhar no WhatsApp |
| [`src/components/sales/SalesView.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/sales/SalesView.tsx) | Botão de ação rápida (`ReceiptText`) em cada item do histórico de vendas e atendimentos |
| [`src/components/clients/ClientHistoryModal.tsx`](file:///home/alexandrerangel/Projetos/financeiro-app/src/components/clients/ClientHistoryModal.tsx) | Emissão direta da nota a partir da ficha e histórico do cliente no CRM |
