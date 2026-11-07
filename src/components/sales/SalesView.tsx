'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus,
  Users,
  DollarSign,
  Trash2,
  Clock,
  AlertCircle,
  HandCoins,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Sale, Product, Account, Client } from '@/types/database';
import { deleteSale } from '@/lib/actions/sales';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD, getZonedYMD, getZonedTimeParts } from '@/lib/date-utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ExportDropdown } from '@/components/ui/ExportDropdown';
import { exportSalesReport, ExportFormat } from '@/lib/export-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';

const AmortizeModal = dynamic(
  () => import('./AmortizeModal').then((m) => m.AmortizeModal),
  { ssr: false }
);

const NewSaleModal = dynamic(
  () => import('./NewSaleModal').then((m) => m.NewSaleModal),
  { ssr: false }
);

const SaleReceiptModal = dynamic(
  () => import('./SaleReceiptModal').then((m) => m.SaleReceiptModal),
  { ssr: false }
);

interface SalesViewProps {
  initialSales: Sale[];
  products: Product[];
  accounts: Account[];
  clients?: Client[];
  initialClientId?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferência',
  on_credit: 'A Prazo',
};

export function SalesView({
  initialSales,
  products,
  accounts,
  clients,
  initialClientId = null,
}: SalesViewProps) {
  const { confirm } = useConfirm();
  const { profile, salesLabel } = useBusinessProfile();
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [modalOpen, setModalOpen] = useState(Boolean(initialClientId));
  const [amortizeSaleTarget, setAmortizeSaleTarget] = useState<Sale | null>(null);
  const [receiptSaleTarget, setReceiptSaleTarget] = useState<Sale | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'today' | 'pending' | 'all'>('today');

  const todayDateStr = getTodayYMD();

  // Filtra as vendas de hoje no fuso de São Paulo
  const todaySales = sales.filter((s) => getZonedYMD(s.sale_date) === todayDateStr);

  // Vendas à vista de hoje
  const todayCashSalesTotal = todaySales
    .filter((s) => s.payment_method !== 'on_credit')
    .reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  // Amortizações recebidas hoje
  const todayAmortizationsTotal = sales.reduce((acc, sale) => {
    if (!sale.amortizations || !Array.isArray(sale.amortizations)) return acc;
    const todayAmorts = sale.amortizations.filter(
      (a) => a.amortized_at && getZonedYMD(a.amortized_at) === todayDateStr
    );
    return acc + todayAmorts.reduce((sub, a) => sub + Number(a.amount || 0), 0);
  }, 0);

  // Total efetivamente recebido hoje (Caixa Líquido do Dia)
  const todayReceivedTotal = todayCashSalesTotal + todayAmortizationsTotal;

  // Vendido a prazo hoje (saldo em aberto das comandas de hoje)
  const todayOnCreditTotal = todaySales
    .filter((s) => s.payment_method === 'on_credit')
    .reduce((acc, curr) => acc + Number(curr.remaining_amount ?? curr.total_amount), 0);

  // Total geral acumulado de fiados em aberto de todos os tempos
  const pendingSales = sales.filter(
    (s) =>
      s.status === 'pending' ||
      s.status === 'partially_paid' ||
      (Number(s.remaining_amount || 0) > 0 && s.status !== 'paid')
  );
  const totalReceivables = pendingSales.reduce(
    (acc, curr) => acc + Number(curr.remaining_amount || 0),
    0
  );

  // Total bruto vendido hoje (Regime de Competência para Ticket Médio — INC-05 / RN-03)
  const todayGrossSalesTotal = todaySales.reduce(
    (acc, curr) => acc + Number(curr.total_amount || 0),
    0
  );

  const todayClientsCount = todaySales.length;
  const todayAverageTicket = todayClientsCount > 0 ? todayGrossSalesTotal / todayClientsCount : 0;

  const displayedSales =
    filterMode === 'today'
      ? todaySales
      : filterMode === 'pending'
      ? pendingSales
      : sales;

  const handleExport = (format: ExportFormat) => {
    const periodLabel =
      filterMode === 'today'
        ? `Hoje (${todayDateStr.split('-').reverse().join('/')})`
        : filterMode === 'pending'
        ? 'Comandas A Prazo Pendentes'
        : 'Todas as Comandas Registradas';

    exportSalesReport({
      format,
      periodLabel,
      sales: displayedSales,
    });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: `Estornar ${salesLabel}`,
      description:
        `Deseja estornar e excluir este registro de ${salesLabel.toLowerCase()}? As receitas e amortizações correspondentes serão removidas do financeiro.`,
      confirmLabel: 'Estornar e Excluir',
      variant: 'danger',
    });

    if (ok) {
      try {
        setDeletingId(id);
        await deleteSale(id);
        setSales((prev) => prev.filter((s) => s.id !== id));
        toast.success(`${salesLabel} estornado e excluído com sucesso!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Erro ao excluir ${salesLabel.toLowerCase()}`);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatSaleTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const { month, day, hour, minute } = getZonedTimeParts(d);
    const hours = String(hour).padStart(2, '0');
    const minutes = String(minute).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');

    if (getZonedYMD(dateStr) === todayDateStr) {
      return `Hoje às ${hours}:${minutes}`;
    }
    return `${dd}/${mm} às ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo Operacional do Dia */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Faturamento Recebido Hoje */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Recebido Hoje
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-400 tabular-nums">
              {formatCurrency(todayReceivedTotal)}
            </h2>
            <span className="text-[10px] text-[#64748B] mt-1 block">
              Caixa líquido efetivo do dia
            </span>
          </div>
        </div>

        {/* Vendido a Prazo Hoje */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              A Prazo Hoje
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-amber-400 tabular-nums">
              {formatCurrency(todayOnCreditTotal)}
            </h2>
            <span className="text-[10px] text-[#64748B] mt-1 block">
              Fiados gerados no dia
            </span>
          </div>
        </div>

        {/* Total Geral a Receber */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total a Receber
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-rose-400 tabular-nums">
              {formatCurrency(totalReceivables)}
            </h2>
            <span className="text-[10px] text-[#64748B] mt-1 block">
              {pendingSales.length} {pendingSales.length === 1 ? 'comanda pendente' : 'comandas pendentes'}
            </span>
          </div>
        </div>

        {/* Clientes Atendidos Hoje */}
        <div className="p-4 sm:p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {salesLabel} Hoje
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC] tabular-nums">
              {todayClientsCount} {todayClientsCount === 1 ? 'cliente' : 'clientes'}
            </h2>
            <span className="text-[10px] text-[#64748B] mt-1 block tabular-nums">
              Ticket Médio: {formatCurrency(todayAverageTicket)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Botão Novo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterMode === 'today'
                ? 'bg-[#FACC15] text-[#080B11] shadow-sm'
                : 'bg-[#080B11] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
            }`}
          >
            Hoje ({todayClientsCount})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-[#FACC15] text-[#080B11] font-bold shadow-sm'
                : 'bg-[#080B11] text-amber-400/90 hover:text-amber-300 border border-[#1E293B]'
            }`}
          >
            A Prazo / Pendentes ({pendingSales.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#FACC15] text-[#080B11] shadow-sm'
                : 'bg-[#080B11] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
            }`}
          >
            Todos os Registros ({sales.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown
            onExport={handleExport}
            buttonLabel="Exportar"
            title={`Exportar ${salesLabel}`}
            disabled={displayedSales.length === 0}
          />

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Novo(a) {salesLabel}
          </button>
        </div>
      </div>

      {/* Histórico de Comandas / Vendas */}
      <div className="bg-[#0D121F] border border-[#1E293B] rounded-2xl divide-y divide-[#1E293B]/80 overflow-hidden shadow-sm">
        {displayedSales.map((sale) => {
          const itemsDesc = sale.items
            ? sale.items
                .map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.product_name}`)
                .join(', ')
            : salesLabel;

          const isOnCredit = sale.payment_method === 'on_credit';
          const remainingAmount = Number(sale.remaining_amount ?? (isOnCredit ? sale.total_amount : 0));
          const paidAmount = Number(sale.paid_amount ?? (isOnCredit ? 0 : sale.total_amount));
          const isPending = isOnCredit && sale.status !== 'paid' && remainingAmount > 0;
          const isOverdue = isPending && sale.due_date && sale.due_date < todayDateStr;

          return (
            <div
              key={sale.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#151D30] transition group"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isPending
                      ? isOverdue
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  <SegmentIcon segment={profile.segment} className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-[#F8FAFC] truncate">
                      {sale.client_name}
                    </h4>

                    {/* Forma de Pagamento */}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#080B11] border border-[#1E293B] text-[#94A3B8] uppercase tracking-wider font-semibold">
                      {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}
                    </span>

                    {/* Status da Comanda */}
                    {isOnCredit && (
                      <>
                        {isPending ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isOverdue
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {sale.status === 'partially_paid'
                              ? `Parcial • Faltam ${formatCurrency(remainingAmount)}`
                              : `Em aberto • ${formatCurrency(remainingAmount)}`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Quitado
                          </span>
                        )}

                        {sale.due_date && (
                          <span
                            className={`text-[10px] ${
                              isOverdue ? 'text-rose-400 font-semibold' : 'text-[#64748B]'
                            }`}
                          >
                            {isOverdue ? 'Venceu em: ' : 'Vence em: '}
                            {sale.due_date.split('-').reverse().slice(0, 2).join('/')}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <p className="text-xs text-[#94A3B8] mt-1 truncate">{itemsDesc}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#64748B] mt-1">
                    <span>{formatSaleTime(sale.sale_date)}</span>
                    {sale.account && (
                      <>
                        <span>•</span>
                        <span>{sale.account.name}</span>
                      </>
                    )}
                    {isOnCredit && paidAmount > 0 && isPending && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 tabular-nums">
                          {formatCurrency(paidAmount)} já amortizado
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado Direito: Valores & Ações */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1E293B]/60">
                <div className="text-left sm:text-right">
                  <span className="text-base font-extrabold text-[#F8FAFC] block tabular-nums">
                    {formatCurrency(Number(sale.total_amount))}
                  </span>
                  {isOnCredit && isPending && (
                    <span className="text-[11px] text-amber-400 font-semibold block tabular-nums">
                      Resta: {formatCurrency(remainingAmount)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setReceiptSaleTarget(sale)}
                    className="p-2 text-[#94A3B8] hover:text-[#FACC15] hover:bg-[#151D30] rounded-xl transition opacity-80 group-hover:opacity-100 cursor-pointer"
                    title="Gerar Nota de Serviço / Venda"
                    aria-label="Gerar Nota de Serviço"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {isPending && (
                    <button
                      onClick={() => setAmortizeSaleTarget(sale)}
                      className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl transition flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Amortizar ou quitar comanda"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      <span>Amortizar</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(sale.id)}
                    disabled={deletingId === sale.id}
                    className="p-2 text-[#64748B] hover:text-rose-400 hover:bg-[#151D30] rounded-xl transition opacity-60 group-hover:opacity-100 cursor-pointer"
                    title="Estornar comanda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {displayedSales.length === 0 && (
          <div className="py-16 text-center text-zinc-500">
            <SegmentIcon segment={profile.segment} className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
            <p className="text-sm font-medium">
              Nenhum(a) {salesLabel.toLowerCase()} registrado(a){' '}
              {filterMode === 'today'
                ? 'hoje'
                : filterMode === 'pending'
                ? 'a prazo em aberto'
                : 'no período'}
              .
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Clique em &quot;Novo Atendimento&quot; para abrir a comanda do próximo cliente.
            </p>
          </div>
        )}
      </div>

      <NewSaleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        products={products}
        accounts={accounts}
        clients={clients}
        initialClientId={initialClientId}
        onSuccess={() => window.location.reload()}
      />

      {amortizeSaleTarget && (
        <AmortizeModal
          isOpen={Boolean(amortizeSaleTarget)}
          onClose={() => setAmortizeSaleTarget(null)}
          accounts={accounts}
          sale={amortizeSaleTarget}
          onSuccess={() => window.location.reload()}
        />
      )}

      {receiptSaleTarget && (
        <SaleReceiptModal
          isOpen={Boolean(receiptSaleTarget)}
          onClose={() => setReceiptSaleTarget(null)}
          sale={receiptSaleTarget}
        />
      )}
    </div>
  );
}
