import { Sale, BusinessProfile } from '@/types/database';
import { BusinessMessageSettings } from '@/lib/whatsapp-templates';
import { formatCurrency, formatDate } from './utils';
import { formatCNPJ } from './cnpj-utils';

export interface SaleReceiptOptions {
  sale: Sale;
  businessProfile: BusinessProfile;
  messageSettings?: BusinessMessageSettings | null;
}

/**
 * Gera um número de identificação legível para a nota de serviço/venda
 */
export function formatReceiptNumber(saleId: string, saleDate?: string): string {
  const year = saleDate ? new Date(saleDate).getFullYear() : new Date().getFullYear();
  const cleanId = (saleId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return `NF-${year}-${cleanId || '000000'}`;
}

/**
 * Traduz o método de pagamento para texto legível
 */
export function getSalePaymentMethodLabel(method: string): string {
  switch (method) {
    case 'money':
    case 'cash':
      return 'Dinheiro em Espécie';
    case 'pix':
      return 'PIX';
    case 'credit_card':
      return 'Cartão de Crédito';
    case 'debit_card':
      return 'Cartão de Débito';
    case 'on_credit':
    case 'fiado':
      return 'A Prazo / Fiado';
    case 'subscription':
      return 'Plano / Assinatura';
    default:
      return method || 'Outro';
  }
}

/**
 * Gera o texto formatado para envio no WhatsApp
 */
export function generateSaleReceiptWhatsAppText({
  sale,
  businessProfile,
  messageSettings,
}: SaleReceiptOptions): string {
  const receiptNum = formatReceiptNumber(sale.id, sale.sale_date);
  const clientName = sale.client?.name || sale.client_name || 'Cliente';
  const businessName = businessProfile.business_name || 'Nosso Estabelecimento';
  const isCredit = (sale.payment_method as string) === 'on_credit' || (sale.payment_method as string) === 'fiado';
  const remaining = Number(sale.remaining_amount ?? (isCredit ? sale.total_amount : 0));
  const paid = Number(sale.paid_amount ?? (isCredit ? 0 : sale.total_amount));

  const items = sale.items || [];
  const itemsText = items.length > 0
    ? items
        .map(
          (item) =>
            `  • ${item.quantity}x ${item.product_name} - ${formatCurrency(item.total_price)}`
        )
        .join('\n')
    : `  • Atendimento Geral - ${formatCurrency(sale.total_amount)}`;

  let text = `📄 *COMPROVANTE DE SERVIÇO / VENDA*\n`;
  text += `*${businessName}*\n`;
  if (businessProfile.cnpj) {
    text += `CNPJ: ${formatCNPJ(businessProfile.cnpj)}\n`;
  }
  text += `\n`;
  text += `🧾 *Nota:* ${receiptNum}\n`;
  text += `📅 *Data:* ${formatDate(sale.sale_date)}\n`;
  text += `👤 *Cliente:* ${clientName}\n\n`;

  text += `📋 *ITENS / SERVIÇOS:*\n`;
  text += `${itemsText}\n\n`;

  text += `💰 *RESUMO DO PAGAMENTO:*\n`;
  text += `• *Total da Nota:* ${formatCurrency(sale.total_amount)}\n`;
  text += `• *Forma de Pagamento:* ${getSalePaymentMethodLabel(sale.payment_method)}\n`;

  if (isCredit) {
    text += `• *Valor Pago:* ${formatCurrency(paid)}\n`;
    text += `• *Saldo em Aberto:* ${formatCurrency(remaining)}\n`;
    if (sale.due_date) {
      text += `• *Vencimento:* ${formatDate(sale.due_date)}\n`;
    }
  } else {
    text += `• *Situação:* Quitado integralmente ✅\n`;
  }

  // Se houver amortizações registradas
  if (sale.amortizations && sale.amortizations.length > 0) {
    text += `\n📝 *PAGAMENTOS / AMORTIZAÇÕES:*\n`;
    sale.amortizations.forEach((a) => {
      text += `  • ${formatDate(a.created_at)}: ${formatCurrency(a.amount)}\n`;
    });
  }

  if (sale.notes) {
    text += `\n📌 *Observações:* ${sale.notes}\n`;
  }

  text += `\n✨ *Agradecemos a preferência e a confiança!*`;

  return text;
}

/**
 * Carrega dinamicamente jsPDF e jspdf-autotable
 */
async function loadPdfLibs() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

export interface GeneratedSaleReceiptPdf {
  filename: string;
  download: () => void;
  getBlob: () => Blob;
  getFile: () => File;
}

/**
 * Gera o documento PDF A4 Formal da Nota de Serviço / Venda
 */
export async function generateSaleReceiptPdf({
  sale,
  businessProfile,
  messageSettings,
}: SaleReceiptOptions): Promise<GeneratedSaleReceiptPdf> {
  const { jsPDF, autoTable } = await loadPdfLibs();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const receiptNum = formatReceiptNumber(sale.id, sale.sale_date);
  const clientName = sale.client?.name || sale.client_name || 'Cliente';
  const businessName = (businessProfile.business_name || 'Canário Gestão').toUpperCase();
  const isCredit = (sale.payment_method as string) === 'on_credit' || (sale.payment_method as string) === 'fiado';
  const remaining = Number(sale.remaining_amount ?? (isCredit ? sale.total_amount : 0));
  const paid = Number(sale.paid_amount ?? (isCredit ? 0 : sale.total_amount));
  const isFullyPaid = !isCredit || remaining <= 0;

  let y = margin;

  // 1. Barra Superior Institucional
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(businessName, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const subHeader = businessProfile.cnpj
    ? `CNPJ: ${formatCNPJ(businessProfile.cnpj)} • Documento de Prestação de Serviços & Vendas`
    : `Documento de Prestação de Serviços & Vendas`;
  doc.text(subHeader, margin + 6, y + 16);

  // Número da Nota no Topo Direito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(248, 250, 252);
  doc.text(receiptNum, pageWidth - margin - 6, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emissão: ${formatDate(sale.sale_date)}`, pageWidth - margin - 6, y + 16, { align: 'right' });

  y += 28;

  // 2. Box de Dados do Tomador / Cliente e Status do Documento
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  // Coluna 1: Dados do Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('DADOS DO CLIENTE / TOMADOR:', margin + 5, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(clientName, margin + 5, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const clientInfoParts: string[] = [];
  if (sale.client?.phone) clientInfoParts.push(`Tel: ${sale.client.phone}`);
  if (sale.client?.cpf) clientInfoParts.push(`CPF: ${sale.client.cpf}`);
  doc.text(clientInfoParts.length > 0 ? clientInfoParts.join('  •  ') : 'Cliente Cadastrado no Sistema', margin + 5, y + 18);

  // Coluna 2: Status do Pagamento (Badge)
  const statusX = pageWidth - margin - 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('STATUS DO DOCUMENTO:', statusX, y + 6, { align: 'right' });

  if (isFullyPaid) {
    doc.setFillColor(220, 252, 231); // emerald-100
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(statusX - 32, y + 9, 32, 7, 1.5, 1.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text('QUITADO', statusX - 16, y + 14, { align: 'center' });
  } else {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(statusX - 38, y + 9, 38, 7, 1.5, 1.5, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text('SALDO EM ABERTO', statusX - 19, y + 14, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Forma: ${getSalePaymentMethodLabel(sale.payment_method)}`, statusX, y + 21, { align: 'right' });

  y += 31;

  // 3. Tabela de Itens (Produtos e Serviços)
  const items = sale.items && sale.items.length > 0
    ? sale.items
    : [
        {
          id: '1',
          sale_id: sale.id,
          product_id: null,
          product_name: 'Prestação de Serviço / Atendimento',
          quantity: 1,
          unit_price: sale.total_amount,
          total_price: sale.total_amount,
          created_at: sale.sale_date,
        },
      ];

  const tableRows = items.map((item, index) => [
    String(index + 1).padStart(2, '0'),
    item.product_name,
    String(item.quantity),
    formatCurrency(item.unit_price),
    formatCurrency(item.total_price),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'DISCRIMINAÇÃO DO SERVIÇO / PRODUTO', 'QTD', 'VALOR UNIT.', 'TOTAL']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  y = finalY + 6;

  // 4. Box de Resumo Financeiro & Condições
  const summaryBoxWidth = 85;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(summaryX, y, summaryBoxWidth, isCredit ? 36 : 22, 'S');

  // Subtotal e Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Bruto dos Itens:', summaryX + 4, y + 6);
  doc.text(formatCurrency(sale.total_amount), pageWidth - margin - 4, y + 6, { align: 'right' });

  doc.setDrawColor(241, 245, 249);
  doc.line(summaryX + 4, y + 9, pageWidth - margin - 4, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DA NOTA:', summaryX + 4, y + 16);
  doc.text(formatCurrency(sale.total_amount), pageWidth - margin - 4, y + 16, { align: 'right' });

  if (isCredit) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text('Valor Quitado / Pago:', summaryX + 4, y + 23);
    doc.text(formatCurrency(paid), pageWidth - margin - 4, y + 23, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-700
    doc.text('Saldo Devedor Restante:', summaryX + 4, y + 29);
    doc.text(formatCurrency(remaining), pageWidth - margin - 4, y + 29, { align: 'right' });

    if (sale.due_date) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Vencimento: ${formatDate(sale.due_date)}`, summaryX + 4, y + 34);
    }
  }

  // 5. Box de Condições de Pagamento e Observações ao lado esquerdo do Resumo
  const infoBoxWidth = contentWidth - summaryBoxWidth - 6;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, infoBoxWidth, isCredit ? 36 : 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('CONDIÇÃO DE PAGAMENTO:', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Forma: ${getSalePaymentMethodLabel(sale.payment_method)}`, margin + 4, y + 11);

  if (sale.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(`Obs: ${sale.notes}`, infoBoxWidth - 8);
    doc.text(splitNotes.slice(0, isCredit ? 3 : 2), margin + 4, y + 16);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      isFullyPaid ? 'Transação finalizada e quitada.' : 'Pagamento a prazo registrado com vencimento.',
      margin + 4,
      y + 16
    );
  }

  y += (isCredit ? 36 : 22) + 8;

  // 6. Histórico de Amortizações (se houver)
  if (sale.amortizations && sale.amortizations.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('HISTÓRICO DE PAGAMENTOS / AMORTIZAÇÕES PARCIAIS:', margin, y);
    y += 3;

    const amortRows = sale.amortizations.map((a, i) => [
      String(i + 1),
      formatDate(a.created_at),
      a.account?.name || 'Caixa Geral',
      formatCurrency(a.amount),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'DATA DA AMORTIZAÇÃO', 'CONTA / DESTINO', 'VALOR AMORTIZADO']],
      body: amortRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        halign: 'left',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY || y + 25) + 8;
  }

  // 7. Rodapé Institucional
  const footerY = Math.max(y, pageHeight - margin - 22);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Agradecemos a confiança e a preferência!', pageWidth / 2, footerY + 6, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Este documento é um comprovante de controle interno de prestação de serviços e vendas emitido via Canário Gestão Financeira.',
    pageWidth / 2,
    footerY + 11,
    { align: 'center' }
  );

  const filename = `Nota_${receiptNum}_${clientName.replace(/\s+/g, '_')}.pdf`;

  return {
    filename,
    download: () => {
      doc.save(filename);
    },
    getBlob: (): Blob => {
      return doc.output('blob');
    },
    getFile: (): File => {
      const blob = doc.output('blob');
      return new File([blob], filename, { type: 'application/pdf' });
    },
  };
}

/**
 * Compartilha o arquivo PDF gerado diretamente via WhatsApp usando Web Share API de arquivos
 * no mobile, com fallback inteligente para download + wa.me no desktop.
 */
export async function shareSaleReceiptPdfViaWhatsApp({
  sale,
  businessProfile,
}: SaleReceiptOptions): Promise<{ sharedViaNative: boolean }> {
  const { filename, getFile, download } = await generateSaleReceiptPdf({
    sale,
    businessProfile,
  });

  const file = getFile();
  const clientName = sale.client?.name || sale.client_name || 'Cliente';
  const receiptNum = formatReceiptNumber(sale.id, sale.sale_date);
  const shareText = `Olá ${clientName}, segue em anexo a sua Nota de Serviço / Venda #${receiptNum}.`;

  // 1. Compartilhamento nativo de arquivo (Dispositivos móveis Android / iOS Safari)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: `Nota de Serviço - ${receiptNum}`,
        text: shareText,
      });
      return { sharedViaNative: true };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // Usuário apenas fechou o menu de compartilhamento
        return { sharedViaNative: true };
      }
      console.warn('Falha no Web Share de arquivos, usando fallback:', err);
    }
  }

  // 2. Fallback para Desktop: baixa o arquivo PDF no navegador e abre o chat no WhatsApp
  download();

  const phone = sale.client?.phone ? sale.client.phone.replace(/\D/g, '') : '';
  const phoneWithCountry = phone ? (phone.startsWith('55') ? phone : `55${phone}`) : '';
  const desktopMsg = `${shareText}\n\n(O documento PDF da sua nota foi gerado e baixado no seu dispositivo para anexo)`;

  const url = phoneWithCountry
    ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(desktopMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(desktopMsg)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { sharedViaNative: false };
}
