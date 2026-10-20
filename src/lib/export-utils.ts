import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, Sale } from '../types/database';
import { formatCurrency, formatDate, formatDateTime } from './utils';
import { isBusinessTransaction } from './business-scope-utils';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

/**
 * Faz o download de um Blob no navegador
 */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converte matriz de dados em CSV com BOM UTF-8 (compatível com Excel PT-BR)
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitize = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM
    [
      headers.map(sanitize).join(';'),
      ...rows.map((row) => row.map(sanitize).join(';')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Gera arquivo Excel (.xlsx) nativo com SheetJS
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  summaryRows?: (string | number)[][]
) {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [headers, ...rows];

  if (summaryRows && summaryRows.length > 0) {
    data.push([]); // Linha em branco
    data.push(...summaryRows);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Calcula largura automática das colunas
  const colWidths = headers.map((col, colIdx) => {
    let maxLen = col.length;
    for (const r of rows) {
      const cellVal = String(r[colIdx] ?? '');
      if (cellVal.length > maxLen) maxLen = cellVal.length;
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
}

// ==============================================================================
// EXPORTAÇÃO DE EXTRATO DE TRANSAÇÕES
// ==============================================================================

export interface ExportTransactionsOptions {
  format: ExportFormat;
  periodLabel: string;
  transactions: Transaction[];
  filterLabel?: string;
}

export function exportTransactionsReport({
  format,
  periodLabel,
  transactions,
  filterLabel,
}: ExportTransactionsOptions) {
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const baseFilename = `extrato-transacoes-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${dateSuffix}`;

  // Cabeçalhos
  const headers = [
    'Data',
    'Descrição',
    'Categoria',
    'Conta / Cartão',
    'Âmbito',
    'Tipo',
    'Status',
    'Valor (R$)',
  ];

  // Linhas
  const rows: (string | number)[][] = transactions.map((t) => {
    const isBiz = isBusinessTransaction(t);
    const scopeLabel = isBiz ? 'Barbearia' : 'Pessoal';
    const typeLabel = t.type === 'income' ? 'Receita' : 'Despesa';
    const statusLabel = t.is_paid ? 'Pago' : 'Pendente';
    const sourceLabel = t.credit_card?.name
      ? `Cartão ${t.credit_card.name}`
      : t.account?.name || '-';
    const dateFormatted = formatDate(t.due_date || t.transaction_date);

    return [
      dateFormatted,
      t.description,
      t.category?.name || 'Sem categoria',
      sourceLabel,
      scopeLabel,
      typeLabel,
      statusLabel,
      Number(t.amount),
    ];
  });

  // Estatísticas de resumo
  const totalIncomePaid = transactions
    .filter((t) => t.type === 'income' && t.is_paid)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpensePaid = transactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalIncomeAll = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpenseAll = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const realizedBalance = totalIncomePaid - totalExpensePaid;
  const projectedBalance = totalIncomeAll - totalExpenseAll;

  if (format === 'csv') {
    // Formata os valores monetários para PT-BR
    const formattedRows = rows.map((r) => [
      ...r.slice(0, 7),
      Number(r[7]).toFixed(2).replace('.', ','),
    ]);
    exportToCsv(baseFilename, headers, formattedRows);
    return;
  }

  if (format === 'xlsx') {
    const summaryRows: (string | number)[][] = [
      ['RESUMO DO PERÍODO', ''],
      ['Receitas Realizadas (Pagas)', totalIncomePaid],
      ['Despesas Realizadas (Pagas)', totalExpensePaid],
      ['Saldo Realizado', realizedBalance],
      ['Receitas Previstas (Total)', totalIncomeAll],
      ['Despesas Previstas (Total)', totalExpenseAll],
      ['Saldo Previsto', projectedBalance],
      ['Total de Lançamentos', transactions.length],
    ];
    exportToExcel(baseFilename, 'Extrato', headers, rows, summaryRows);
    return;
  }

  // GERAÇÃO DE PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho institucional escuro
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('FINANCEIRO APP • EXTRATO CONSOLIDADO', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text(
    `Período: ${periodLabel}${filterLabel ? ` | Filtro: ${filterLabel}` : ''} | Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    14,
    21
  );

  // Cards de Resumo Financeiro
  const startY = 34;
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const cardHeight = 16;

  const cards = [
    { title: 'RECEITAS PAGAS', val: formatCurrency(totalIncomePaid), color: [22, 163, 74] }, // green-600
    { title: 'DESPESAS PAGAS', val: formatCurrency(totalExpensePaid), color: [220, 38, 38] }, // red-600
    {
      title: 'SALDO REALIZADO',
      val: formatCurrency(realizedBalance),
      color: realizedBalance >= 0 ? [37, 99, 235] : [220, 38, 38], // blue-600 or red
    },
    { title: 'LANÇAMENTOS', val: `${transactions.length} registros`, color: [100, 116, 139] },
  ];

  cards.forEach((card, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, x + 3, startY + 5.5);

    doc.setFontSize(9);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, x + 3, startY + 12);
  });

  // Tabela principal
  const tableRows = transactions.map((t) => {
    const isBiz = isBusinessTransaction(t);
    const sourceLabel = t.credit_card?.name
      ? `Cartão ${t.credit_card.name}`
      : t.account?.name || '-';

    return [
      formatDate(t.due_date || t.transaction_date),
      t.description,
      t.category?.name || 'Sem categoria',
      sourceLabel,
      isBiz ? 'Barbearia' : 'Pessoal',
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.is_paid ? 'Pago' : 'Pendente',
      formatCurrency(Number(t.amount)),
    ];
  });

  autoTable(doc, {
    startY: startY + cardHeight + 6,
    head: [headers],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 18 }, // Data
      1: { cellWidth: 'auto' }, // Descrição
      2: { cellWidth: 26 }, // Categoria
      3: { cellWidth: 26 }, // Conta/Cartão
      4: { cellWidth: 18 }, // Âmbito
      5: { cellWidth: 16 }, // Tipo
      6: { cellWidth: 16 }, // Status
      7: { cellWidth: 24, halign: 'right' }, // Valor
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Destaque de cor para status e tipo
      if (data.section === 'body') {
        if (data.column.index === 5) {
          data.cell.styles.textColor = data.cell.raw === 'Receita' ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 6) {
          data.cell.styles.textColor = data.cell.raw === 'Pago' ? [22, 163, 74] : [217, 119, 6];
        }
      }
    },
    didDrawPage: (data) => {
      // Rodapé com numeração de página
      const pageCount = doc.internal.pages.length - 1;
      const str = `Página ${data.pageNumber} de ${pageCount}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Documento emitido pelo Financeiro App • Uso pessoal e confidencial',
        14,
        doc.internal.pageSize.getHeight() - 8
      );
      doc.text(
        str,
        pageWidth - 14 - doc.getTextWidth(str),
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(`${baseFilename}.pdf`);
}

// ==============================================================================
// EXPORTAÇÃO DE RELATÓRIO DE ATENDIMENTOS & VENDAS (BARBEARIA)
// ==============================================================================

export interface ExportSalesReportOptions {
  format: ExportFormat;
  periodLabel: string;
  sales: Sale[];
}

export function exportSalesReport({
  format,
  periodLabel,
  sales,
}: ExportSalesReportOptions) {
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const baseFilename = `relatorio-vendas-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${dateSuffix}`;

  const headers = [
    'Data / Hora',
    'Cliente',
    'Serviços & Produtos',
    'Forma de Pagto',
    'Conta de Destino',
    'Valor Total (R$)',
  ];

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'cash':
        return 'Dinheiro';
      case 'debit':
        return 'Cartão Débito';
      case 'credit':
        return 'Cartão Crédito';
      default:
        return method;
    }
  };

  const rows: (string | number)[][] = sales.map((s) => {
    const itemsStr =
      s.items && s.items.length > 0
        ? s.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
        : 'Atendimento';

    return [
      formatDateTime(s.sale_date),
      s.client_name || s.client?.name || 'Cliente Avulso',
      itemsStr,
      formatPaymentMethod(s.payment_method),
      s.account?.name || '-',
      Number(s.total_amount),
    ];
  });

  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalSalesCount = sales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  if (format === 'csv') {
    const formattedRows = rows.map((r) => [
      ...r.slice(0, 5),
      Number(r[5]).toFixed(2).replace('.', ','),
    ]);
    exportToCsv(baseFilename, headers, formattedRows);
    return;
  }

  if (format === 'xlsx') {
    const summaryRows: (string | number)[][] = [
      ['RESUMO DO PERÍODO', ''],
      ['Faturamento Total', totalRevenue],
      ['Atendimentos Realizados', totalSalesCount],
      ['Ticket Médio', averageTicket],
    ];
    exportToExcel(baseFilename, 'Atendimentos', headers, rows, summaryRows);
    return;
  }

  // GERAÇÃO DE PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('BARBEARIA • RELATÓRIO DE ATENDIMENTOS & VENDAS', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170);
  doc.text(
    `Período: ${periodLabel} | Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    14,
    21
  );

  // Cards de resumo
  const startY = 34;
  const cardWidth = (pageWidth - 28 - 6) / 3;
  const cardHeight = 16;

  const cards = [
    { title: 'FATURAMENTO TOTAL', val: formatCurrency(totalRevenue), color: [22, 163, 74] },
    { title: 'ATENDIMENTOS', val: `${totalSalesCount} clientes`, color: [37, 99, 235] },
    { title: 'TICKET MÉDIO', val: formatCurrency(averageTicket), color: [147, 51, 234] }, // purple-600
  ];

  cards.forEach((card, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, x + 3, startY + 5.5);

    doc.setFontSize(9.5);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, x + 3, startY + 12);
  });

  const tableRows = sales.map((s) => {
    const itemsStr =
      s.items && s.items.length > 0
        ? s.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')
        : 'Atendimento';

    return [
      formatDateTime(s.sale_date),
      s.client_name || s.client?.name || 'Cliente Avulso',
      itemsStr,
      formatPaymentMethod(s.payment_method),
      s.account?.name || '-',
      formatCurrency(Number(s.total_amount)),
    ];
  });

  autoTable(doc, {
    startY: startY + cardHeight + 6,
    head: [headers],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 26 }, // Data / Hora
      1: { cellWidth: 32 }, // Cliente
      2: { cellWidth: 'auto' }, // Itens
      3: { cellWidth: 24 }, // Pagamento
      4: { cellWidth: 24 }, // Conta
      5: { cellWidth: 24, halign: 'right' }, // Valor
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.pages.length - 1;
      const str = `Página ${data.pageNumber} de ${pageCount}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Relatório gerado pelo Financeiro App • Gestão da Barbearia',
        14,
        doc.internal.pageSize.getHeight() - 8
      );
      doc.text(
        str,
        pageWidth - 14 - doc.getTextWidth(str),
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(`${baseFilename}.pdf`);
}
