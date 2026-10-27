'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, Plus, Minus, Trash2, CheckCircle2, UserPlus, CalendarClock, Crown } from 'lucide-react';
import { Product, Account, PaymentMethod, SalePaymentMethod, Client, Sale } from '@/types/database';

const SaleReceiptModal = dynamic(
  () => import('./SaleReceiptModal').then((m) => m.SaleReceiptModal),
  { ssr: false }
);
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
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const [addingPartForServiceId, setAddingPartForServiceId] = useState<string | null>(null);
  const [selectedServicePartId, setSelectedServicePartId] = useState<string>('');

  if (!isOpen && !creditReceiptData && !receiptSale) return null;

  const physicalProducts = products.filter((p) => p.type === 'product');

  const handleAddItem = (product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find(
        (item) => item.product_id === product.id && !item.is_service_component
      );
      let nextItems: CreateSaleItemInput[];

      if (existing) {
        nextItems = prev.map((item) =>
          item.product_id === product.id && !item.is_service_component
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        nextItems = [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: Number(product.default_price),
            unit_cost: product.type === 'product' ? Number(product.cost_price || 0) : 0,
            is_service_component: false,
            parent_service_id: null,
          },
        ];
      }

      // Se for um serviço com peças/insumos padrão vinculados, adiciona/incrementa como componente incluso (sem cobrar do cliente)
      if (product.type === 'service' && product.service_products && product.service_products.length > 0) {
        for (const sp of product.service_products) {
          const catalogProd = products.find((p) => p.id === sp.product_id);
          const partName = sp.product?.name || catalogProd?.name || 'Peça inclusa';
          const partCost = Number(sp.product?.cost_price ?? catalogProd?.cost_price ?? 0);
          const partQty = Number(sp.quantity || 1);

          const existingPartIdx = nextItems.findIndex(
            (i) =>
              i.is_service_component &&
              i.parent_service_id === product.id &&
              i.product_id === sp.product_id
          );

          if (existingPartIdx >= 0) {
            nextItems = nextItems.map((it, idx) =>
              idx === existingPartIdx ? { ...it, quantity: it.quantity + partQty } : it
            );
          } else {
            nextItems.push({
              product_id: sp.product_id,
              product_name: partName,
              quantity: partQty,
              unit_price: 0,
              unit_cost: partCost,
              is_service_component: true,
              parent_service_id: product.id,
            });
          }
        }
      }

      return nextItems;
    });
  };

  const handleAddServiceComponent = (serviceId: string, partProductId: string) => {
    const partProd = products.find((p) => p.id === partProductId);
    if (!partProd) return;

    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.is_service_component &&
          i.parent_service_id === serviceId &&
          i.product_id === partProd.id
      );
      if (existingIdx >= 0) {
        return prev.map((it, idx) =>
          idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          product_id: partProd.id,
          product_name: partProd.name,
          quantity: 1,
          unit_price: 0,
          unit_cost: Number(partProd.cost_price || 0),
          is_service_component: true,
          parent_service_id: serviceId,
        },
      ];
    });
    setSelectedServicePartId('');
    setAddingPartForServiceId(null);
  };

  const handleUpdateQuantity = (
    productId: string | null | undefined,
    delta: number,
    isServiceComponent: boolean = false,
    parentServiceId: string | null = null
  ) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (
            item.product_id === productId &&
            Boolean(item.is_service_component) === isServiceComponent &&
            (item.parent_service_id || null) === parentServiceId
          ) {
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
        item.product_id === productId && !item.is_service_component
          ? { ...item, unit_price: val }
          : item
      )
    );
  };

  const handleRemoveItem = (
    productId: string | null | undefined,
    isServiceComponent: boolean = false,
    parentServiceId: string | null = null
  ) => {
    setSelectedItems((prev) =>
      prev.filter((item) => {
        if (isServiceComponent) {
          return !(
            item.is_service_component &&
            item.product_id === productId &&
            (item.parent_service_id || null) === parentServiceId
          );
        }
        // Ao remover um serviço principal, remove também as peças vinculadas a ele
        if (item.is_service_component && item.parent_service_id === productId) {
          return false;
        }
        return !(item.product_id === productId && !item.is_service_component);
      })
    );
  };

  const totalAmount = selectedItems.reduce((acc, item) => {
    if (item.is_service_component) return acc;
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

      const createdSale = await createSale({
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

      // Cria objeto representativo da venda para emissão imediata de nota se desejado
      const saleForReceipt: Sale = {
        id: createdSale?.id || `sale-${Date.now()}`,
        user_id: '',
        client_id: finalClientId,
        client_name: finalClientName,
        total_amount: totalAmount,
        paid_amount: paymentMethod === 'on_credit' ? initPayNum : totalAmount,
        remaining_amount: paymentMethod === 'on_credit' ? totalAmount - initPayNum : 0,
        payment_method: paymentMethod as SalePaymentMethod,
        due_date: dueDate || null,
        account_id: accountId,
        transaction_id: null,
        sale_date: saleDate,
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
        items: selectedItems
          .filter((item) => !item.is_service_component)
          .map((item, idx) => ({
            id: String(idx),
            sale_id: createdSale?.id || '',
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
            created_at: saleDate,
          })),
        client: clientsList.find((c) => c.id === finalClientId) || null,
      };

      // Reset
      setClientName('');
      setSelectedClientId(null);
      setSelectedItems([]);
      setDueDate('');
      setInitialPayment('');
      setNotes('');
      setSaleDate(getTodayYMD());

      toast.success(`${salesLabel} de "${finalClientName}" registrado com sucesso!`, {
        action: {
          label: 'Emitir Nota',
          onClick: () => {
            setReceiptSale(saleForReceipt);
          },
        },
      });

      if (paymentMethod === 'on_credit') {
        setReceiptSale(saleForReceipt);
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
                {selectedItems
                  .filter((item) => !item.is_service_component)
                  .map((item) => {
                    const catalogProduct = products.find((p) => p.id === item.product_id);
                    const isServiceItem = catalogProduct?.type === 'service';
                    const serviceComponents = isServiceItem
                      ? selectedItems.filter(
                          (sub) =>
                            sub.is_service_component && sub.parent_service_id === item.product_id
                        )
                      : [];

                    return (
                      <div key={item.product_id} className="py-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
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
                                onClick={() => handleUpdateQuantity(item.product_id, -1, false, null)}
                                className="p-1 hover:text-zinc-100 text-zinc-400"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-extrabold text-zinc-100 px-1">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.product_id, 1, false, null)}
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
                              onClick={() => handleRemoveItem(item.product_id, false, null)}
                              className="p-1 text-zinc-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Peças / Produtos Inclusos no Serviço (sem cobrar valor extra do cliente) */}
                        {isServiceItem && physicalProducts.length > 0 && (
                          <div className="pl-3 border-l-2 border-zinc-800 space-y-1.5">
                            {serviceComponents.map((comp) => (
                              <div
                                key={`${comp.parent_service_id}-${comp.product_id}`}
                                className="flex items-center justify-between gap-2 bg-zinc-900/60 px-2.5 py-1.5 rounded-xl border border-zinc-800/70"
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-medium text-zinc-300 truncate block">
                                    🔩 {comp.product_name}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 block">
                                    Incluso no serviço (baixa de estoque • R$ 0 ao cliente)
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateQuantity(
                                          comp.product_id,
                                          -1,
                                          true,
                                          comp.parent_service_id || null
                                        )
                                      }
                                      className="p-0.5 text-zinc-400 hover:text-zinc-200"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-[11px] font-bold text-zinc-200 px-1">
                                      {comp.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateQuantity(
                                          comp.product_id,
                                          1,
                                          true,
                                          comp.parent_service_id || null
                                        )
                                      }
                                      className="p-0.5 text-zinc-400 hover:text-zinc-200"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveItem(
                                        comp.product_id,
                                        true,
                                        comp.parent_service_id || null
                                      )
                                    }
                                    className="p-1 text-zinc-500 hover:text-red-400 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {addingPartForServiceId === item.product_id ? (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <select
                                  value={selectedServicePartId}
                                  onChange={(e) => setSelectedServicePartId(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="">Selecionar peça/produto usado...</option>
                                  {physicalProducts.map((pp) => (
                                    <option key={pp.id} value={pp.id}>
                                      {pp.name}
                                      {pp.stock_quantity !== null && pp.stock_quantity !== undefined
                                        ? ` (Est: ${pp.stock_quantity})`
                                        : ''}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!selectedServicePartId}
                                  onClick={() =>
                                    item.product_id &&
                                    handleAddServiceComponent(item.product_id, selectedServicePartId)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold disabled:opacity-40"
                                >
                                  Incluir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingPartForServiceId(null);
                                    setSelectedServicePartId('');
                                  }}
                                  className="px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingPartForServiceId(item.product_id || null);
                                  setSelectedServicePartId('');
                                }}
                                className="text-[11px] text-emerald-400/90 hover:text-emerald-300 font-semibold flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Incluir peça/insumo usado neste serviço (sem cobrar extra)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {receiptSale && (
        <SaleReceiptModal
          isOpen={Boolean(receiptSale)}
          onClose={() => {
            setReceiptSale(null);
            onClose();
            if (onSuccess) onSuccess();
          }}
          sale={receiptSale}
        />
      )}
    </div>
  );
}

