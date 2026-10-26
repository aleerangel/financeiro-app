'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Download,
  Printer,
  Share2,
  CheckCircle,
  Clock,
  Building2,
  User,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react';
import { Sale } from '@/types/database';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import {
  formatReceiptNumber,
  getSalePaymentMethodLabel,
  generateSaleReceiptPdf,
  shareSaleReceiptPdfViaWhatsApp,
} from '@/lib/sale-receipt-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatCNPJ } from '@/lib/cnpj-utils';
import { toast } from 'sonner';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export function SaleReceiptModal({
  isOpen,
  onClose,
  sale,
}: SaleReceiptModalProps) {
  const { profile } = useBusinessProfile();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  if (!isOpen || !sale) return null;

  const receiptNum = formatReceiptNumber(sale.id, sale.sale_date);
  const clientName = sale.client?.name || sale.client_name || 'Cliente';
  const businessName = profile.business_name || 'Meu Negócio';
  const isCredit = (sale.payment_method as string) === 'on_credit' || (sale.payment_method as string) === 'fiado';
  const remaining = Number(sale.remaining_amount ?? (isCredit ? sale.total_amount : 0));
  const paid = Number(sale.paid_amount ?? (isCredit ? 0 : sale.total_amount));
  const isFullyPaid = !isCredit || remaining <= 0;

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const { download } = await generateSaleReceiptPdf({
        sale,
        businessProfile: profile,
      });
      download();
      toast.success('Nota de serviço gerada e baixada com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF da nota:', err);
      toast.error('Não foi possível gerar o arquivo PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSharePdfWhatsApp = async () => {
    try {
      setSharingPdf(true);
      const res = await shareSaleReceiptPdfViaWhatsApp({
        sale,
        businessProfile: profile,
      });
      if (res.sharedViaNative) {
        toast.success('Envie o PDF gerado diretamente no WhatsApp!');
      } else {
        toast.success('Nota em PDF baixada! Abrindo o WhatsApp...');
      }
    } catch (err) {
      console.error('Erro ao compartilhar PDF:', err);
      toast.error('Não foi possível gerar e compartilhar o PDF.');
    } finally {
      setSharingPdf(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-zinc-950 sm:p-4 sm:bg-black/80 sm:backdrop-blur-sm sm:items-center sm:justify-center overflow-hidden animate-in fade-in duration-200">
      {/* Container Principal */}
      <div className="relative w-full h-full sm:h-auto sm:max-w-3xl bg-zinc-950 sm:border sm:border-zinc-800 sm:rounded-3xl shadow-2xl flex flex-col sm:max-h-[92vh] overflow-hidden">
        
        {/* Barra Superior Mobile: Botão Voltar Proeminente + Título + Fechar */}
        <div className="flex sm:hidden items-center justify-between px-3.5 py-3 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-100 hover:text-white bg-zinc-800/90 active:bg-zinc-700 active:scale-95 transition"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-200 stroke-[2.5]" />
            <span className="text-xs font-bold">Voltar</span>
          </button>

          <div className="text-center">
            <h2 className="text-xs font-bold text-zinc-100">
              Nota de Serviço / Venda
            </h2>
            <span className="text-[10px] font-mono text-amber-400 font-semibold">
              {receiptNum}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra Superior Desktop */}
        <div className="hidden sm:flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                Nota de Serviço / Venda
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {receiptNum}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Visualização A4 formal pronta para impressão ou envio de PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSharePdfWhatsApp}
              disabled={sharingPdf || downloadingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
              title="Compartilhar arquivo PDF no WhatsApp do cliente"
            >
              {sharingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>WhatsApp (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition active:scale-95"
              title="Imprimir folha A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || sharingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/10 transition active:scale-95 disabled:opacity-50"
              title="Baixar arquivo PDF formal"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>Baixar PDF</span>
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
              aria-label="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Área de Visualização do Documento A4 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-zinc-900/50 flex justify-center">
          <div
            id="printable-sale-receipt"
            className="w-full max-w-[700px] bg-white text-zinc-900 rounded-2xl p-4 sm:p-8 shadow-xl border border-zinc-200 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none h-fit"
          >
            {/* 1. Cabeçalho Timbrado */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-800 shrink-0" />
                  <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                    {businessName}
                  </h1>
                </div>
                {profile.cnpj && (
                  <p className="text-xs text-slate-600 font-medium">
                    CNPJ: <span className="font-semibold">{formatCNPJ(profile.cnpj)}</span>
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Documento de Prestação de Serviços & Vendas
                </p>
              </div>

              <div className="sm:text-right shrink-0 space-y-1 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-none border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Comprovante Nº
                </span>
                <span className="text-sm font-mono font-black text-slate-900 block">
                  {receiptNum}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Data: {formatDate(sale.sale_date)}
                </span>
              </div>
            </div>

            {/* 2. Dados do Cliente & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
                  <User className="w-3 h-3" /> Tomador / Cliente
                </span>
                <p className="text-sm font-bold text-slate-900">{clientName}</p>
                <div className="text-xs text-slate-600 space-y-0.5 mt-0.5 font-medium">
                  {sale.client?.phone && <p>Telefone: {sale.client.phone}</p>}
                  {sale.client?.cpf && <p>CPF: {sale.client.cpf}</p>}
                </div>
              </div>

              <div className="sm:text-right flex flex-col sm:items-end justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Situação Financeira
                </span>
                {isFullyPaid ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>QUITADO INTEGRALMENTE</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>SALDO DEVEDOR EM ABERTO</span>
                  </div>
                )}
                <span className="text-[11px] text-slate-500 mt-1">
                  Pagamento: {getSalePaymentMethodLabel(sale.payment_method)}
                </span>
              </div>
            </div>

            {/* 3. Tabela Discriminada de Itens */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Discriminação dos Serviços & Produtos
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Item / Descrição</th>
                      <th className="py-2.5 px-3 text-center w-16">Qtd</th>
                      <th className="py-2.5 px-3 text-right w-24">Valor Unit.</th>
                      <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {item.product_name}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 font-mono">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Resumo Financeiro & Condições */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Box Esquerda: Condições e Informações de Pagamento */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-600" /> Condição de Pagamento
                  </span>
                  <p className="text-slate-700 font-medium">
                    Forma:{' '}
                    <span className="font-bold text-slate-900">
                      {getSalePaymentMethodLabel(sale.payment_method)}
                    </span>
                  </p>
                  {sale.notes && (
                    <p className="text-slate-600 text-[11px] italic mt-1 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700 not-italic">Obs:</span> {sale.notes}
                    </p>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  {isFullyPaid
                    ? 'Transação quitada e finalizada.'
                    : 'Pagamento a prazo registrado com vencimento.'}
                </div>
              </div>

              {/* Box Direita: Totais Financeiros */}
              <div className="p-3.5 rounded-xl border border-slate-300 bg-white space-y-1.5 text-right">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(sale.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-1">
                  <span>TOTAL GERAL:</span>
                  <span className="font-mono text-base">{formatCurrency(sale.total_amount)}</span>
                </div>

                {isCredit && (
                  <div className="border-t border-dashed border-slate-200 pt-1.5 space-y-1 text-xs">
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Valor Quitado:</span>
                      <span className="font-mono">{formatCurrency(paid)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Saldo Restante:</span>
                      <span className="font-mono">{formatCurrency(remaining)}</span>
                    </div>
                    {sale.due_date && (
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Vencimento do Fiado:</span>
                        <span>{formatDate(sale.due_date)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Histórico de Amortizações (se houver) */}
            {sale.amortizations && sale.amortizations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Histórico de Amortizações Parciais
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-1.5 px-3">Data</th>
                        <th className="py-1.5 px-3">Conta / Destino</th>
                        <th className="py-1.5 px-3 text-right">Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sale.amortizations.map((a, i) => (
                        <tr key={a.id || i} className="text-slate-700">
                          <td className="py-1 px-3">{formatDate(a.created_at)}</td>
                          <td className="py-1 px-3 text-slate-500">{a.account?.name || 'Caixa Geral'}</td>
                          <td className="py-1 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatCurrency(a.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Rodapé Agradecimento */}
            <div className="border-t border-slate-200 pt-4 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-800 italic">
                Agradecemos a confiança e a preferência!
              </p>
              <p className="text-[10px] text-slate-400">
                Documento de controle e prestação de contas emitido via Canário Gestão Financeira.
              </p>
            </div>
          </div>
        </div>

        {/* Barra Fixa Inferior no Mobile (Ações Primárias) */}
        <div className="flex sm:hidden items-center gap-2.5 p-3.5 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md shrink-0 print:hidden safe-area-bottom">
          <button
            type="button"
            onClick={handleSharePdfWhatsApp}
            disabled={sharingPdf || downloadingPdf}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-950/50 transition active:scale-95 disabled:opacity-50"
          >
            {sharingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>Enviar PDF no WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || sharingPdf}
            className="flex items-center justify-center gap-1.5 py-3 px-3.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-100 font-semibold rounded-2xl text-xs border border-zinc-700 transition active:scale-95 disabled:opacity-50"
            title="Baixar arquivo PDF"
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
