'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Scissors,
  Plus,
  Minus,
  Check,
  Sparkles,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { Product, Account, PaymentMethod, Client } from '@/types/database';
import { getProducts, createProduct } from '@/lib/actions/products';
import { getAccounts } from '@/lib/actions/accounts';
import { getClients } from '@/lib/actions/clients';
import { createSale, CreateSaleItemInput } from '@/lib/actions/sales';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { toast } from 'sonner';

export function MobileNewSaleDrawer() {
  const { newSaleOpen } = useMobileNavigation();

  if (!newSaleOpen) return null;

  return <MobileNewSaleDrawerDialog key={newSaleOpen ? 'open' : 'closed'} />;
}

function MobileNewSaleDrawerDialog() {
  const { setNewSaleOpen } = useMobileNavigation();

  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Form State
  const [selectedItems, setSelectedItems] = useState<CreateSaleItemInput[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [notes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prompt para salvar item avulso no catálogo após a venda
  const [promptSaveItem, setPromptSaveItem] = useState<{
    name: string;
    price: number;
  } | null>(null);

  // Carrega produtos, contas e clientes sob demanda
  useEffect(() => {
    let mounted = true;
    Promise.all([getProducts(), getAccounts(), getClients()])
      .then(([prods, accs, cls]) => {
        if (!mounted) return;
        setProducts(prods);
        setAccounts(accs);
        setClients(cls);
        if (accs.length > 0) {
          setAccountId(accs[0].id);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do PDV:', err);
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

  // Clientes filtrados por busca rápida
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 5);
    const searchLower = clientSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(searchLower)).slice(0, 5);
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
      await createSale({
        client_id: selectedClientId,
        client_name: selectedClient ? selectedClient.name : 'Cliente Balcão',
        payment_method: paymentMethod,
        account_id: accountId,
        items: selectedItems,
        notes: notes.trim() || undefined,
        sale_date: getTodayYMD(),
      });

      toast.success('Atendimento concluído com sucesso! 💈✂️');

      // Se teve item avulso, abre prompt para salvar no catálogo
      if (customItems.length > 0) {
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

          {/* 3. Seleção de Cliente */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              2. Cliente
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar cliente cadastrado ou deixar avulso..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    if (selectedClientId) setSelectedClientId(null);
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

            {/* Sugestões de Clientes */}
            {!selectedClientId && clientSearch.trim() && (
              <div className="mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 overflow-hidden">
                {filteredClients.length === 0 ? (
                  <div className="p-2.5 text-[11px] text-zinc-400">
                    Nenhum cliente cadastrado com esse nome. O atendimento será registrado como <strong>{clientSearch}</strong>.
                  </div>
                ) : (
                  filteredClients.map((c) => (
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
                  ))
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
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="pix">Pix</option>
                <option value="cash">Dinheiro</option>
                <option value="debit">Cartão Débito</option>
                <option value="credit">Cartão Crédito</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Conta de Entrada
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
  );
}

