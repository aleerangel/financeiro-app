'use client';

import { useState } from 'react';
import { X, Plus, Minus, Trash2, CheckCircle2, UserPlus, CalendarClock, Crown } from 'lucide-react';
import { Product, Account, PaymentMethod, SalePaymentMethod, Client } from '@/types/database';
import { createSale, CreateSaleItemInput } from '@/lib/actions/sales';
import { saveClientSubscription } from '@/lib/actions/subscriptions';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { findExactClientMatch } from '@/lib/client-search-utils';
import { toast } from 'sonner';
import { ClientModal } from '@/components/clients/ClientModal';
import { SaleCreditReceiptModal } from '@/components/fiados/SaleCreditReceiptModal';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  accounts: Account[];
  clients?: Client[];
  initialClientId?: string | null;
  onSuccess?: () => void;
}

export function NewSaleModal({
  isOpen,
  onClose,
  products,
  accounts,
  clients = [],
  initialClientId = null,
  onSuccess,
}: NewSaleModalProps) {
  const initialClient = initialClientId
    ? clients.find((c) => c.id === initialClientId) || null
    : null;
  const { businessName, salesLabel } = useBusinessProfile();
  const [clientsList, setClientsList] = useState<Client[]>(clients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialClient ? initialClient.id : null
  );
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientName, setClientName] = useState(initialClient ? initialClient.name : '');
  const [saleDate, setSaleDate] = useState(getTodayYMD());
  const [selectedItems, setSelectedItems] = useState<CreateSaleItemInput[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('pix');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('pix');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDueDay, setRecurringDueDay] = useState('10');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditReceiptData, setCreditReceiptData] = useState<{
    clientName: string;
    clientPhone?: string | null;
    totalAmount: number;
    dueDate?: string | null;
    items: CreateSaleItemInput[];
  } | null>(null);

  if (!isOpen && !creditReceiptData) return null;

  const handleAddItem = (product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.default_price),
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string | null | undefined, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CreateSaleItemInput[]
    );
  };

  const handleUpdatePrice = (productId: string | null | undefined, newPriceStr: string) => {
    const val = parseFloat(newPriceStr.replace(',', '.')) || 0;
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, unit_price: val } : item
      )
    );
  };

  const handleRemoveItem = (productId: string | null | undefined) => {
    setSelectedItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const totalAmount = selectedItems.reduce((acc, item) => {
    return acc + Number(item.quantity) * Number(item.unit_price);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Selecione pelo menos um serviço ou produto.');
      return;
    }
    if (!accountId) {
      setError('Selecione a conta bancária para recebimento.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const exactMatch = findExactClientMatch(clientsList, clientName);
      const finalClientId = selectedClientId || exactMatch?.id || undefined;
      const finalClientName = exactMatch ? exactMatch.name : (clientName.trim() || 'Cliente Balcão');

      if (paymentMethod === 'on_credit' && !finalClientId) {
        setError('Vendas a prazo exigem selecionar ou cadastrar um cliente.');
        setLoading(false);
        return;
      }

      if (isRecurring && !finalClientId) {
        setError('Para cadastrar mensalidade recorrente, selecione ou cadastre um cliente.');
        setLoading(false);
        return;
      }

      const initPayNum = initialPayment ? parseFloat(initialPayment.replace(',', '.')) : 0;
      if (initPayNum > totalAmount) {
        setError('O valor de entrada não pode ser maior que o total do atendimento.');
        setLoading(false);
        return;
      }

      await createSale({
        client_id: finalClientId,
        client_name: finalClientName,
        payment_method: paymentMethod,
        account_id: accountId,
        items: selectedItems,
        notes: notes.trim() || undefined,
        sale_date: saleDate,
        due_date: paymentMethod === 'on_credit' && dueDate ? dueDate : undefined,
        initial_payment: paymentMethod === 'on_credit' && initPayNum > 0 ? initPayNum : undefined,
        initial_payment_method:
          paymentMethod === 'on_credit' && initPayNum > 0 ? initialPaymentMethod : undefined,
      });

      // Se marcou como mensalidade recorrente, salva também a assinatura
      if (isRecurring && finalClientId) {
        const dueDayNum = parseInt(recurringDueDay, 10) || 10;
        const planDescription =
          selectedItems.map((i) => i.product_name).join(' + ') || `Assinatura ${businessName}`;
        await saveClientSubscription({
          client_id: finalClientId,
          custom_plan_name: planDescription,
          price: totalAmount,
          due_day: dueDayNum,
          start_date: saleDate,
        });
        toast.success(`Assinatura recorrente vinculada a ${finalClientName}!`);
      }

      // Reset
      setClientName('');
      setSelectedClientId(null);
      setSelectedItems([]);
      setDueDate('');
      setInitialPayment('');
      setNotes('');
      setSaleDate(getTodayYMD());
      toast.success(`${salesLabel} de "${finalClientName}" registrado com sucesso!`);

      if (paymentMethod === 'on_credit') {
        const targetClient = clientsList.find((c) => c.id === finalClientId);
        setCreditReceiptData({
          clientName: finalClientName,
          clientPhone: targetClient?.phone || null,
          totalAmount: totalAmount - initPayNum,
          dueDate: dueDate || null,
          items: selectedItems,
        });
      } else {
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Erro ao registrar ${salesLabel.toLowerCase()}.`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-extrabold text-zinc-100 mb-1">
          Novo(a) {salesLabel}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">
          Registro rápido: informe o cliente, data, serviços prestados e finalize.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome do Cliente e Data do Atendimento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Cliente
                </label>
                <button
                  type="button"
                  onClick={() => setClientModalOpen(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Novo Cadastro
                </button>
              </div>
              <input
                type="text"
                list="clients-datalist"
                value={clientName}
                onChange={(e) => {
                  const val = e.target.value;
                  setClientName(val);
                  const matched = findExactClientMatch(clientsList, val);
                  setSelectedClientId(matched ? matched.id : null);
                }}
                placeholder="Selecione ou digite o nome do cliente..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                required
                autoFocus
              />
              <datalist id="clients-datalist">
                {clientsList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.phone ? `Tel: ${c.phone}` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Data
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition font-medium"
                required
              />
            </div>
          </div>

          {/* Grade de Serviços Rápidos (Toque para adicionar) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
              Serviços & Produtos (Toque para adicionar)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {products.map((p) => {
                const isSelected = selectedItems.some((item) => item.product_id === p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-950 border-zinc-800/90 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-bold text-xs truncate block">{p.name}</span>
                    <span className="font-extrabold text-sm text-zinc-100 block">
                      {formatCurrency(Number(p.default_price))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Itens Adicionados na Comanda */}
          {selectedItems.length > 0 && (
            <div className="space-y-2 p-4 bg-zinc-950/80 border border-zinc-800/90 rounded-2xl">
              <span className="text-xs font-semibold text-zinc-400 block mb-2 uppercase tracking-wider">
                Itens na Comanda
              </span>

              <div className="divide-y divide-zinc-800/60">
                {selectedItems.map((item) => (
                  <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-zinc-100 block truncate">
                        {item.product_name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                        <span>Valor un: R$</span>
                        <input
                          type="text"
                          value={item.unit_price}
                          onChange={(e) => handleUpdatePrice(item.product_id, e.target.value)}
                          className="w-16 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 text-center font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product_id, -1)}
                          className="p-1 hover:text-zinc-100 text-zinc-400"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-extrabold text-zinc-100 px-1">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product_id, 1)}
                          className="p-1 hover:text-zinc-100 text-zinc-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-emerald-400 min-w-[70px] text-right">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forma de Pagamento e Conta de Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as SalePaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="pix">Pix</option>
                <option value="cash">Dinheiro em Espécie</option>
                <option value="debit">Cartão de Débito</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="on_credit">A Prazo (Fiado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                {paymentMethod === 'on_credit' ? 'Conta Padrão' : 'Conta de Entrada'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção Condicional de Venda a Prazo */}
          {paymentMethod === 'on_credit' && (
            <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" />
                  Condições do Pagamento a Prazo
                </span>
                {!selectedClientId && !findExactClientMatch(clientsList, clientName) && (
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    * Cliente obrigatório
                  </span>
                )}
              </div>

              {!selectedClientId && !findExactClientMatch(clientsList, clientName) && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                  <span>Selecione ou cadastre o cliente para poder vender a prazo.</span>
                  <button
                    type="button"
                    onClick={() => setClientModalOpen(true)}
                    className="font-bold underline ml-2 hover:text-amber-200"
                  >
                    Cadastrar
                  </button>
                </div>
              )}

              {/* Entrada Imediata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Entrada Imediata (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    placeholder="R$ 0,00"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {parseFloat(initialPayment || '0') > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Forma da Entrada
                    </label>
                    <select
                      value={initialPaymentMethod}
                      onChange={(e) => setInitialPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="pix">Pix</option>
                      <option value="cash">Dinheiro em Espécie</option>
                      <option value="debit">Cartão Débito</option>
                      <option value="credit">Cartão Crédito</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Data de Vencimento Opcional */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Data de Vencimento (Opcional)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setDueDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-300 transition"
                    >
                      +7d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 15);
                        setDueDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-300 transition"
                    >
                      +15d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setDueDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] text-zinc-300 transition"
                    >
                      +30d
                    </button>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate('')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] text-rose-400 transition"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Resumo visual do fiado */}
              <div className="pt-1 flex items-center justify-between text-xs text-zinc-400">
                <span>Saldo que ficará a receber:</span>
                <strong className="text-amber-400 font-bold">
                  {formatCurrency(
                    Math.max(0, totalAmount - (parseFloat(initialPayment || '0') || 0))
                  )}
                </strong>
              </div>
            </div>
          )}

          {/* Opção de Venda Recorrente / Mensalidade do Clube */}
          {paymentMethod !== 'on_credit' && (
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0"
                />
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Tornar Venda Recorrente (Clube / Mensalidade)
                </span>
              </label>

              {isRecurring && (
                <div className="mt-3 pt-3 border-t border-zinc-800/70 grid grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Dia de Vencimento Mensal *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={recurringDueDay}
                      onChange={(e) => setRecurringDueDay(e.target.value)}
                      placeholder="Ex: 10"
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-semibold focus:outline-none focus:border-amber-400"
                      required={isRecurring}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Valor da Mensalidade
                    </label>
                    <p className="text-xs font-bold text-emerald-400 pt-1.5">
                      {formatCurrency(totalAmount)} /mês
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão Finalizar Atendimento em Destaque */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-base rounded-2xl transition shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {loading
                ? 'Registrando...'
                : `Finalizar Atendimento • ${formatCurrency(totalAmount)}`}
            </button>
          </div>
        </form>
      </div>

      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={(newClient) => {
          if (newClient) {
            setClientsList((prev) => [newClient, ...prev]);
            setSelectedClientId(newClient.id);
            setClientName(newClient.name);
          }
          setClientModalOpen(false);
        }}
      />

      {creditReceiptData && (
        <SaleCreditReceiptModal
          isOpen={Boolean(creditReceiptData)}
          onClose={() => {
            setCreditReceiptData(null);
            onClose();
            if (onSuccess) onSuccess();
          }}
          clientName={creditReceiptData.clientName}
          clientPhone={creditReceiptData.clientPhone}
          totalAmount={creditReceiptData.totalAmount}
          dueDate={creditReceiptData.dueDate}
          items={creditReceiptData.items}
        />
      )}
    </div>
  );
}

