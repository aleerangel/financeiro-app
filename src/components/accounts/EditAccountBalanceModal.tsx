'use client';

import { useState } from 'react';
import { X, Check, Wallet, TrendingUp, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  AccountWithBalance,
  updateAccountBalance,
  recordAccountYield,
} from '@/lib/actions/accounts';
import { formatCurrency } from '@/lib/utils';

interface EditAccountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountWithBalance | null;
  defaultMode?: 'yield' | 'adjust';
  onSuccess?: () => void;
}

interface DialogProps {
  account: AccountWithBalance;
  defaultMode: 'yield' | 'adjust';
  onClose: () => void;
  onSuccess?: () => void;
}

function EditAccountBalanceDialog({
  account,
  defaultMode,
  onClose,
  onSuccess,
}: DialogProps) {
  const currentBalance = Number(account.current_balance) || 0;

  const [mode, setMode] = useState<'yield' | 'adjust'>(defaultMode);
  const [yieldInputType, setYieldInputType] = useState<'by_new_balance' | 'by_yield_amount'>(
    'by_new_balance'
  );
  const [newBankBalance, setNewBankBalance] = useState(
    String(currentBalance.toFixed(2)).replace('.', ',')
  );
  const [directYieldAmount, setDirectYieldAmount] = useState('');
  const [adjustBalance, setAdjustBalance] = useState(
    String(currentBalance.toFixed(2)).replace('.', ',')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCurrencyInput = (val: string): number => {
    if (!val.trim()) return 0;
    const normalized = val.includes(',')
      ? val.replace(/\./g, '').replace(',', '.')
      : val;
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculatedYield =
    yieldInputType === 'by_new_balance'
      ? Math.round((parseCurrencyInput(newBankBalance) - currentBalance) * 100) / 100
      : Math.round(parseCurrencyInput(directYieldAmount) * 100) / 100;

  const projectedFinalBalance =
    yieldInputType === 'by_new_balance'
      ? parseCurrencyInput(newBankBalance)
      : Math.round((currentBalance + calculatedYield) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (mode === 'yield') {
        if (calculatedYield <= 0) {
          setError(
            yieldInputType === 'by_new_balance'
              ? 'Para contabilizar rendimento, o novo saldo no banco deve ser maior que o saldo atual no app. Caso o saldo tenha diminuído, use a aba "Ajustar Saldo".'
              : 'Informe um valor de rendimento maior que zero.'
          );
          return;
        }

        await recordAccountYield(account.id, calculatedYield);
      } else {
        const parsedBalance = parseCurrencyInput(adjustBalance);
        await updateAccountBalance(account.id, parsedBalance);
      }

      if (onSuccess) {
        onSuccess();
      }
      toast.success(
        mode === 'yield'
          ? 'Rendimento registrado com sucesso!'
          : 'Saldo da conta atualizado com sucesso!'
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho da Conta */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: account.color || '#3b82f6' }}
          >
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">{account.name}</h2>
              {account.yield_label && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {account.yield_label}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Saldo atual no sistema: <strong className="text-zinc-200">{formatCurrency(currentBalance)}</strong>
            </p>
          </div>
        </div>

        {/* Alternador Principal: Contabilizar Rendimento vs Apenas Ajustar Saldo */}
        <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('yield');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
              mode === 'yield'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Rendimento (Juros)
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('adjust');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
              mode === 'adjust'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Ajustar Saldo
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'yield' ? (
            <>
              {/* Sub-modo de entrada do rendimento */}
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setYieldInputType('by_new_balance')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium border transition ${
                    yieldInputType === 'by_new_balance'
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  Informar Saldo do Banco
                </button>
                <button
                  type="button"
                  onClick={() => setYieldInputType('by_yield_amount')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium border transition ${
                    yieldInputType === 'by_yield_amount'
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  Digitar Valor que Rendeu
                </button>
              </div>

              {yieldInputType === 'by_new_balance' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Qual saldo aparece hoje no app do {account.name}? (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-medium">
                      R$
                    </span>
                    <input
                      type="text"
                      autoFocus
                      value={newBankBalance}
                      onChange={(e) => setNewBankBalance(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-lg font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1.5 block">
                    O sistema calcula a diferença para {formatCurrency(currentBalance)} e lança como rendimento.
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Valor que rendeu de juros (+R$)
                    </label>
                    {account.estimated_monthly_yield > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDirectYieldAmount(
                            String(account.estimated_monthly_yield.toFixed(2)).replace('.', ',')
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        Usar est. mês ({formatCurrency(account.estimated_monthly_yield)})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-emerald-400 font-bold">
                      + R$
                    </span>
                    <input
                      type="text"
                      autoFocus
                      value={directYieldAmount}
                      onChange={(e) => setDirectYieldAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-14 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-lg font-bold text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Card de Resumo do Rendimento a Contabilizar */}
              <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400/90 block">
                    Rendimento a Contabilizar
                  </span>
                  <span className="text-xs text-zinc-400 mt-0.5 block">
                    Novo saldo final: <strong className="text-zinc-200">{formatCurrency(projectedFinalBalance)}</strong>
                  </span>
                </div>
                <span
                  className={`text-lg font-extrabold ${
                    calculatedYield > 0 ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  {calculatedYield > 0 ? `+ ${formatCurrency(calculatedYield)}` : 'R$ 0,00'}
                </span>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Novo Saldo Atual Corrigido (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-medium">
                  R$
                </span>
                <input
                  type="text"
                  autoFocus
                  value={adjustBalance}
                  onChange={(e) => setAdjustBalance(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1.5 block">
                Corrige o saldo base da conta sem criar lançamento de receita de juros.
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'yield' && calculatedYield <= 0)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              {loading
                ? 'Salvando...'
                : mode === 'yield'
                ? `Lançar Rendimento (+${formatCurrency(Math.max(0, calculatedYield))})`
                : 'Atualizar Saldo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditAccountBalanceModal({
  isOpen,
  onClose,
  account,
  defaultMode = 'yield',
  onSuccess,
}: EditAccountBalanceModalProps) {
  if (!isOpen || !account) return null;

  return (
    <EditAccountBalanceDialog
      key={`${account.id}-${account.current_balance}-${defaultMode}`}
      account={account}
      defaultMode={defaultMode}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
