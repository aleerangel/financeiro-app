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
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { numberToCurrencyInputString, parseCurrencyInputToNumber } from '@/lib/currency-mask';
import { useOptionalMobileNavigation } from '@/context/MobileNavigationContext';

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
  const mobileNav = useOptionalMobileNavigation();
  const currentBalance = Number(account.current_balance) || 0;

  const [mode, setMode] = useState<'yield' | 'adjust'>(defaultMode);
  const [yieldInputType, setYieldInputType] = useState<'by_new_balance' | 'by_yield_amount'>(
    'by_new_balance'
  );
  const [newBankBalance, setNewBankBalance] = useState(() =>
    numberToCurrencyInputString(currentBalance)
  );
  const [directYieldAmount, setDirectYieldAmount] = useState('');
  const [adjustBalance, setAdjustBalance] = useState(() =>
    numberToCurrencyInputString(currentBalance)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCurrencyInput = (val: string): number => {
    return parseCurrencyInputToNumber(val);
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
      if (mobileNav?.notifyMutation) {
        mobileNav.notifyMutation({ type: 'yield' });
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
      <div className="w-full max-w-md bg-[#0D121F] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition"
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
              <h2 className="text-base font-bold text-[#F8FAFC]">{account.name}</h2>
              {account.yield_label && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {account.yield_label}
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8]">
              Saldo atual no sistema: <strong className="text-[#F8FAFC] tabular-nums">{formatCurrency(currentBalance)}</strong>
            </p>
          </div>
        </div>

        {/* Alternador Principal: Contabilizar Rendimento vs Apenas Ajustar Saldo */}
        <div className="grid grid-cols-2 gap-1.5 bg-[#080B11] p-1 rounded-xl border border-[#1E293B] mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('yield');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
              mode === 'yield'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
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
                ? 'bg-[#151D30] text-[#F8FAFC] border border-[#1E293B] shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
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
                      ? 'bg-[#151D30] text-[#F8FAFC] border-[#1E293B]'
                      : 'bg-[#080B11] text-[#94A3B8] border-[#1E293B] hover:text-[#F8FAFC]'
                  }`}
                >
                  Informar Saldo do Banco
                </button>
                <button
                  type="button"
                  onClick={() => setYieldInputType('by_yield_amount')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium border transition ${
                    yieldInputType === 'by_yield_amount'
                      ? 'bg-[#151D30] text-[#F8FAFC] border-[#1E293B]'
                      : 'bg-[#080B11] text-[#94A3B8] border-[#1E293B] hover:text-[#F8FAFC]'
                  }`}
                >
                  Digitar Valor que Rendeu
                </button>
              </div>

              {yieldInputType === 'by_new_balance' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#F8FAFC] mb-1.5">
                    Qual saldo aparece hoje no app do {account.name}? (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#64748B] font-medium">
                      R$
                    </span>
                    <CurrencyInput
                      autoFocus
                      value={newBankBalance}
                      onChangeValue={(_, formatted) => setNewBankBalance(formatted)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-lg font-bold text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
                    />
                  </div>
                  <span className="text-[11px] text-[#94A3B8] mt-1.5 block">
                    O sistema calcula a diferença para <strong className="text-[#F8FAFC]">{formatCurrency(currentBalance)}</strong> e lança como rendimento.
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#F8FAFC]">
                      Valor que rendeu de juros (+R$)
                    </label>
                    {account.estimated_monthly_yield > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDirectYieldAmount(
                            numberToCurrencyInputString(account.estimated_monthly_yield)
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
                    <CurrencyInput
                      autoFocus
                      value={directYieldAmount}
                      onChangeValue={(_, formatted) => setDirectYieldAmount(formatted)}
                      placeholder="0,00"
                      className="w-full pl-14 pr-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-lg font-bold text-emerald-400 placeholder-[#64748B] focus:outline-none focus:border-emerald-500 transition tabular-nums"
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
                  <span className="text-xs text-[#94A3B8] mt-0.5 block">
                    Novo saldo final: <strong className="text-[#F8FAFC] tabular-nums">{formatCurrency(projectedFinalBalance)}</strong>
                  </span>
                </div>
                <span
                  className={`text-lg font-extrabold tabular-nums ${
                    calculatedYield > 0 ? 'text-emerald-400' : 'text-[#64748B]'
                  }`}
                >
                  {calculatedYield > 0 ? `+ ${formatCurrency(calculatedYield)}` : 'R$ 0,00'}
                </span>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1.5">
                Novo Saldo Atual Corrigido (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#64748B] font-medium">
                  R$
                </span>
                <CurrencyInput
                  autoFocus
                  value={adjustBalance}
                  onChangeValue={(_, formatted) => setAdjustBalance(formatted)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-base font-bold text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
                />
              </div>
              <span className="text-[11px] text-[#94A3B8] mt-1.5 block">
                Corrige o saldo base da conta sem criar lançamento de receita de juros.
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'yield' && calculatedYield <= 0)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-xs rounded-xl transition shadow-lg shadow-[#FACC15]/10 disabled:opacity-50"
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
