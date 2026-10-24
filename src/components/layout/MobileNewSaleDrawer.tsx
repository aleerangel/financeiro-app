'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Scissors,
  Plus,
  Minus,
  Check,
  Sparkles,
  UserPlus,
  Loader2,
  CalendarClock,
  Crown,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { Product, Account, PaymentMethod, SalePaymentMethod, Client } from '@/types/database';
import { createProduct } from '@/lib/actions/products';
import { SimpleClient } from '@/lib/actions/clients';
import {
  getCachedProducts,
  getCachedAccounts,
  getCachedSimpleClients,
  invalidateClientCache,
} from '@/lib/client-cache';
import { filterClientsBySearch, findExactClientMatch } from '@/lib/client-search-utils';
import { createSale, CreateSaleItemInput } from '@/lib/actions/sales';
import { saveClientSubscription } from '@/lib/actions/subscriptions';
import { ClientModal } from '@/components/clients/ClientModal';
import { SaleCreditReceiptModal } from '@/components/fiados/SaleCreditReceiptModal';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { toast } from 'sonner';

export function MobileNewSaleDrawer() {
  const { newSaleOpen } = useMobileNavigation();

  if (!newSaleOpen) return null;

  return <MobileNewSaleDrawerDialog key={newSaleOpen ? 'open' : 'closed'} />;
}

function MobileNewSaleDrawerDialog() {
  const { setNewSaleOpen, notifyMutation } = useMobileNavigation();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);

  // Form State
  const [selectedItems, setSelectedItems] = useState<CreateSaleItemInput[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('pix');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDueDay, setRecurringDueDay] = useState('10');
  const [notes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal de cadastro de cliente
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Prompt para salvar item avulso no catálogo após a venda
  const [promptSaveItem, setPromptSaveItem] = useState<{
    name: string;
    price: number;
  } | null>(null);

  const [creditReceiptData, setCreditReceiptData] = useState<{
    clientName: string;
    clientPhone?: string | null;
    totalAmount: number;
    dueDate?: string | null;
    items: CreateSaleItemInput[];
  } | null>(null);

  // Carrega produtos, contas e clientes com cache imediato em memória (0ms de latência)
  useEffect(() => {
    let mounted = true;

    // 1. Produtos / Serviços de forma prioritária e isolada
    getCachedProducts()
      .then((prods) => {
        if (!mounted) return;
        setProducts(prods);
      })
      .catch((err) => {
        console.error('Erro ao carregar produtos:', err);
      })
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });

    // 2. Contas bancárias
    getCachedAccounts()
      .then((accs) => {
        if (!mounted) return;
        setAccounts(accs);
        if (accs.length > 0) {
          setAccountId(accs[0].id);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar contas:', err);
      });

    // 3. Clientes com consulta otimizada sem JOINs e sem cálculo pesado de CRM
    getCachedSimpleClients()
      .then((cls) => {
        if (!mounted) return;
        setClients(cls);
      })
      .catch((err) => {
        console.error('Erro ao carregar clientes:', err);
      })
      .finally(() => {
        if (mounted) setLoadingClients(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleClose = () => {
    setNewSaleOpen(false);
  };

  // Adiciona produto cadastrado
  const handleAddProduct = (p: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product_id === p.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === p.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          quantity: 1,
          unit_price: Number(p.default_price),
        },
      ];
    });
  };

  // Altera quantidade
  const handleUpdateQuantity = (productId: string | null | undefined, name: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          const isMatch = productId ? item.product_id === productId : item.product_name === name;
          if (isMatch) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CreateSaleItemInput[]
    );
  };

  // Adiciona item avulso
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      toast.error('Informe o nome do serviço ou produto avulso');
      return;
    }
    const priceNum = parseFloat(customItemPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Informe um valor válido para o item avulso');
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        product_id: null,
        product_name: customItemName.trim(),
        quantity: 1,
        unit_price: priceNum,
      },
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
  };

  // Clientes filtrados por busca rápida e inteligente (insensível a acentos, maiúsculas e multi-termos)
  const filteredClients = useMemo(() => {
    return filterClientsBySearch(clients, clientSearch, 6);
  }, [clients, clientSearch]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Submissão da Venda
  const handleFinalizeSale = async () => {
    if (selectedItems.length === 0) {
      toast.error('Adicione pelo menos um item ou serviço ao atendimento');
      return;
    }

    if (!accountId) {
      toast.error('Selecione uma conta bancária de destino');
      return;
    }

    const customItems = selectedItems.filter((item) => !item.product_id);

    try {
      setSubmitting(true);
      const exactMatch = selectedClient || findExactClientMatch(clients, clientSearch);
      const finalClientId = selectedClientId || exactMatch?.id || null;
      const finalClientName = exactMatch ? exactMatch.name : (clientSearch.trim() || 'Cliente Balcão');

      if (paymentMethod === 'on_credit' && !finalClientId) {
        toast.error('Vendas a prazo exigem selecionar ou cadastrar um cliente');
        setSubmitting(false);
        return;
      }

      if (isRecurring && !finalClientId) {
        toast.error('Para cadastrar mensalidade recorrente, selecione ou cadastre um cliente');
        setSubmitting(false);
        return;
      }

      const initPayNum = initialPayment ? parseFloat(initialPayment.replace(',', '.')) : 0;
      if (initPayNum > totalAmount) {
        toast.error('O valor de entrada não pode ser maior que o total do atendimento');
        setSubmitting(false);
        return;
      }

      await createSale({
        client_id: finalClientId,
        client_name: finalClientName,
        payment_method: paymentMethod,
        account_id: accountId,
        items: selectedItems,
        notes: notes.trim() || undefined,
        sale_date: getTodayYMD(),
        due_date: paymentMethod === 'on_credit' && dueDate ? dueDate : undefined,
        initial_payment: paymentMethod === 'on_credit' && initPayNum > 0 ? initPayNum : undefined,
        initial_payment_method:
          paymentMethod === 'on_credit' && initPayNum > 0 ? initialPaymentMethod : undefined,
      });

      // Se marcou como mensalidade recorrente, salva também a assinatura
      if (isRecurring && finalClientId) {
        const dueDayNum = parseInt(recurringDueDay, 10) || 10;
        const planDescription =
          selectedItems.map((i) => i.product_name).join(' + ') || 'Mensalidade Barbearia';
        await saveClientSubscription({
          client_id: finalClientId,
          custom_plan_name: planDescription,
          price: totalAmount,
          due_day: dueDayNum,
          start_date: getTodayYMD(),
        });
        toast.success(`Assinatura recorrente vinculada a ${finalClientName}!`);
      }

      // Notifica Dashboard e painéis imediatamente (atualização instantânea 0ms)
      notifyMutation({
        type: 'sale',
        sale: {
          totalAmount,
          paymentMethod,
          accountId: accountId || null,
          clientName: finalClientName,
          itemsCount: selectedItems.length,
          isCredit: paymentMethod === 'on_credit',
        },
      });

      invalidateClientCache(['accounts', 'clients']);

      toast.success('Atendimento concluído com sucesso! 💈✂️');

      if (paymentMethod === 'on_credit') {
        const targetClient = clients.find((c) => c.id === finalClientId);
        setCreditReceiptData({
          clientName: finalClientName,
          clientPhone: targetClient?.phone || null,
          totalAmount: totalAmount - initPayNum,
          dueDate: dueDate || null,
          items: selectedItems,
        });
      } else if (customItems.length > 0) {
        setPromptSaveItem({
          name: customItems[0].product_name,
          price: customItems[0].unit_price,
        });
      } else {
        handleClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar atendimento';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Salva item avulso no catálogo
  const handleSaveToCatalog = async () => {
    if (!promptSaveItem) return;
    try {
      await createProduct({
        name: promptSaveItem.name,
        type: 'service',
        default_price: promptSaveItem.price,
      });
      toast.success(`'${promptSaveItem.name}' adicionado ao catálogo com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar produto ao catálogo');
    } finally {
      handleClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Sheet Container */}
        <div className="relative w-full sm:max-w-lg max-h-[94vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden">
          {/* Barra superior de toque */}
          <div className="pt-3 pb-1 flex justify-center sm:hidden">
            <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span>Novo Atendimento • Barbearia</span>
              </h3>
              <span className="text-[11px] text-zinc-400">
                Checkout rápido de balcão
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Diálogo pós-venda para cadastrar item avulso */}
            {promptSaveItem && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3 animate-in zoom-in-95">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">
                      Cadastrar no catálogo de serviços?
                    </h4>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Você acabou de cobrar <strong>{promptSaveItem.name}</strong> por{' '}
                      <strong>{formatCurrency(promptSaveItem.price)}</strong>. Deseja salvá-lo no catálogo para facilitar futuros atendimentos?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveToCatalog}
                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition"
                  >
                    Sim, Salvar no Catálogo
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition"
                  >
                    Agora Não
                  </button>
                </div>
              </div>
            )}

            {/* 1. Seleção Rápida de Serviços / Produtos */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                1. Selecione os Serviços / Produtos
              </label>

              {loadingProducts ? (
                /* Skeleton imediato enquanto carrega os serviços */
                <div className="grid grid-cols-2 gap-2 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 h-16 flex flex-col justify-between"
                    >
                      <div className="w-20 h-3 bg-zinc-800 rounded" />
                      <div className="w-12 h-3 bg-zinc-800/60 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {products.map((p) => {
                    const countInCart = selectedItems.find((i) => i.product_id === p.id)?.quantity || 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className={`p-2.5 rounded-xl border text-left transition relative active:scale-95 flex flex-col justify-between ${
                          countInCart > 0
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        {countInCart > 0 && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 text-zinc-950 rounded-full font-bold text-[11px] flex items-center justify-center">
                            {countInCart}
                          </span>
                        )}
                        <span className="text-xs font-bold block truncate pr-5">
                          {p.name}
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-400 mt-1 block">
                          {formatCurrency(Number(p.default_price))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Inserção de Item Avulso */}
              <div className="mt-3 p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/80">
                <span className="text-[11px] font-semibold text-zinc-400 block mb-2">
                  Ou adicione um item avulso:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nome (ex: Platinado)"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    className="w-24 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg font-bold transition"
                    title="Adicionar item avulso"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Itens Selecionados no Atendimento */}
            {selectedItems.length > 0 && (
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Itens no Atendimento ({selectedItems.length})
                </span>
                <div className="divide-y divide-zinc-800/60">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={`${item.product_id || 'custom'}-${idx}`}
                      className="py-2 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-zinc-200 block">
                          {item.product_name}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {item.quantity}x {formatCurrency(item.unit_price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/60 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.product_id,
                                item.product_name,
                                -1
                              )
                            }
                            className="p-1 hover:text-rose-400 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1.5 font-bold text-zinc-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.product_id,
                                item.product_name,
                                1
                              )
                            }
                            className="p-1 hover:text-emerald-400 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-emerald-400 w-16 text-right">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Seleção e Cadastro de Cliente */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  2. Cliente
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setClientToEdit(null);
                    setClientModalOpen(true);
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active:scale-95 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Novo Cliente</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar cliente cadastrado ou deixar avulso..."
                    value={clientSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientSearch(val);
                      const exact = findExactClientMatch(clients, val);
                      setSelectedClientId(exact ? exact.id : null);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                </div>
                {selectedClientId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId(null);
                      setClientSearch('');
                    }}
                    className="p-2 bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl"
                    title="Remover seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sugestões de Clientes ou Ação de Cadastro Rápido */}
              {!selectedClientId && clientSearch.trim() && (
                <div className="mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 overflow-hidden shadow-lg animate-in fade-in duration-150">
                  {loadingClients ? (
                    <div className="p-3 text-[11px] text-zinc-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Buscando clientes cadastrados...</span>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-3 text-[11px] text-zinc-400 space-y-2">
                      <div>
                        Nenhum cliente cadastrado como <strong>&quot;{clientSearch}&quot;</strong>.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClientToEdit({
                            id: '',
                            user_id: '',
                            name: clientSearch.trim(),
                            phone: null,
                            cpf: null,
                            notes: null,
                            created_at: '',
                            updated_at: '',
                          });
                          setClientModalOpen(true);
                        }}
                        className="w-full py-2 px-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar &quot;{clientSearch}&quot; agora
                      </button>
                    </div>
                  ) : (
                    <>
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearch(c.name);
                          }}
                          className="w-full p-2.5 text-left text-xs hover:bg-zinc-900 flex items-center justify-between text-zinc-200"
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-[10px] text-zinc-400">{c.phone}</span>}
                        </button>
                      ))}
                      <div className="p-2 bg-zinc-900/40 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setClientToEdit({
                              id: '',
                              user_id: '',
                              name: clientSearch.trim(),
                              phone: null,
                              cpf: null,
                              notes: null,
                              created_at: '',
                              updated_at: '',
                            });
                            setClientModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Cadastrar novo cliente com este nome
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedClientId && selectedClient && (
                <div className="mt-1.5 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                  <span>Vinculado a: <strong>{selectedClient.name}</strong></span>
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* 4. Forma de Pagamento e Conta */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Forma de Pagto
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as SalePaymentMethod)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="pix">Pix</option>
                  <option value="cash">Dinheiro</option>
                  <option value="debit">Cartão Débito</option>
                  <option value="credit">Cartão Crédito</option>
                  <option value="on_credit">A Prazo (Fiado)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {paymentMethod === 'on_credit' ? 'Conta Padrão' : 'Conta de Entrada'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condições de Pagamento a Prazo (Mobile) */}
            {paymentMethod === 'on_credit' && (
              <div className="p-3.5 bg-zinc-950/90 rounded-2xl border border-zinc-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Condições do Fiado
                  </span>
                  {!selectedClientId && !findExactClientMatch(clients, clientSearch) && (
                    <span className="text-[10px] text-amber-400 font-bold">
                      * Cliente obrigatório
                    </span>
                  )}
                </div>

                {!selectedClientId && !findExactClientMatch(clients, clientSearch) && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-[11px]">
                    Selecione um cliente acima ou cadastre para liberar a venda a prazo.
                  </div>
                )}

                {/* Entrada Imediata */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                      Entrada Imediata
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalAmount}
                      placeholder="R$ 0,00"
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {parseFloat(initialPayment || '0') > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                        Forma da Entrada
                      </label>
                      <select
                        value={initialPaymentMethod}
                        onChange={(e) => setInitialPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="pix">Pix</option>
                        <option value="cash">Dinheiro</option>
                        <option value="debit">Débito</option>
                        <option value="credit">Crédito</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Vencimento Opcional */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Vencimento (Opcional)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setDueDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300"
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
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300"
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
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300"
                      >
                        +30d
                      </button>
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate('')}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-rose-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                  <span>Saldo a receber:</span>
                  <strong className="text-amber-400 font-bold">
                    {formatCurrency(
                      Math.max(0, totalAmount - (parseFloat(initialPayment || '0') || 0))
                    )}
                  </strong>
                </div>
              </div>
            )}

            {/* Opção de Venda Recorrente / Mensalidade (Mobile) */}
            {paymentMethod !== 'on_credit' && (
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0"
                  />
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Tornar Venda Recorrente (Clube / Mensalidade)
                  </span>
                </label>

                {isRecurring && (
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-800 grid grid-cols-2 gap-2 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                        Dia Vencimento *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={recurringDueDay}
                        onChange={(e) => setRecurringDueDay(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 font-semibold focus:outline-none focus:border-amber-400"
                        required={isRecurring}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                        Valor Mensal
                      </label>
                      <p className="text-xs font-bold text-emerald-400 pt-1">
                        {formatCurrency(totalAmount)}/mês
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé Fixo com Total e Botão Finalizar */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Total do Atendimento
              </span>
              <span className="text-xl font-extrabold text-emerald-400">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <button
              type="button"
              disabled={submitting || selectedItems.length === 0}
              onClick={handleFinalizeSale}
              className="flex-1 max-w-[220px] py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 text-center active:scale-95"
            >
              {submitting ? 'Finalizando...' : 'Finalizar Atendimento'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro Rápido de Novo Cliente */}
      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        clientToEdit={clientToEdit}
        onSuccess={(newClient) => {
          if (newClient) {
            setClients((prev) => {
              const exists = prev.some((c) => c.id === newClient.id);
              return exists ? prev : [newClient, ...prev];
            });
            setSelectedClientId(newClient.id);
            setClientSearch(newClient.name);
            toast.success(`Cliente "${newClient.name}" cadastrado com sucesso!`);
          }
          setClientModalOpen(false);
        }}
      />

      {creditReceiptData && (
        <SaleCreditReceiptModal
          isOpen={Boolean(creditReceiptData)}
          onClose={() => {
            setCreditReceiptData(null);
            handleClose();
          }}
          clientName={creditReceiptData.clientName}
          clientPhone={creditReceiptData.clientPhone}
          totalAmount={creditReceiptData.totalAmount}
          dueDate={creditReceiptData.dueDate}
          items={creditReceiptData.items}
        />
      )}
    </>
  );
}
