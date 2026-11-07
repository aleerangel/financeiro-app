'use client';

import { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { AccountType, AccountYieldType } from '@/types/database';
import { AccountWithBalance, createAccount, updateAccount } from '@/lib/actions/accounts';
import { toast } from 'sonner';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: AccountWithBalance | null;
}

interface DialogProps {
  accountToEdit?: AccountWithBalance | null;
  onClose: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'wallet', label: 'Dinheiro / Carteira' },
  { value: 'savings', label: 'Poupança' },
  { value: 'investment', label: 'Investimento' },
];

const PRESET_COLORS = [
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#8b5cf6', // Roxo
  '#f59e0b', // Laranja
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#64748b', // Cinza
];

function AccountModalDialog({ accountToEdit, onClose }: DialogProps) {
  const [name, setName] = useState(accountToEdit?.name || '');
  const [type, setType] = useState<AccountType>(accountToEdit?.type || 'checking');
  const [balance, setBalance] = useState(
    String(accountToEdit?.current_balance ?? accountToEdit?.initial_balance ?? 0)
  );
  const [color, setColor] = useState(accountToEdit?.color || '#3b82f6');
  const [yieldType, setYieldType] = useState<AccountYieldType>(
    accountToEdit?.yield_type || 'none'
  );
  const [yieldRate, setYieldRate] = useState<string>(
    accountToEdit?.yield_rate ? String(accountToEdit.yield_rate) : '100'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleYieldTypeChange = (nextType: AccountYieldType) => {
    setYieldType(nextType);
    if (nextType === 'cdi_percent' && (!yieldRate || parseFloat(yieldRate) < 10)) {
      setYieldRate('100');
    } else if (nextType === 'monthly_percent' && (!yieldRate || parseFloat(yieldRate) > 10)) {
      setYieldRate('0.85');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome da conta.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const parsedBalance = parseFloat(balance.replace(/\./g, '').replace(',', '.')) || 0;
      const parsedYieldRate =
        yieldType === 'none'
          ? 0
          : parseFloat(yieldRate.replace(',', '.')) || 0;

      if (accountToEdit) {
        await updateAccount(accountToEdit.id, {
          name,
          type,
          current_balance: parsedBalance,
          color,
          yield_type: yieldType,
          yield_rate: parsedYieldRate,
        });
        toast.success('Conta atualizada com sucesso!');
      } else {
        await createAccount({
          name,
          type,
          initial_balance: parsedBalance,
          color,
          yield_type: yieldType,
          yield_rate: parsedYieldRate,
        });
        toast.success('Conta criada com sucesso!');
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar conta.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-[#F8FAFC] mb-1">
          {accountToEdit ? 'Editar Conta' : 'Nova Conta'}
        </h2>
        <p className="text-xs text-[#94A3B8] mb-5">
          Cadastre uma conta bancária, carteira física ou conta de investimento.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Nome da Conta
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Carteira, Itaú"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FACC15]/50 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                {accountToEdit ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
              </label>
              <input
                type="text"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0,00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
              />
            </div>
          </div>

          {/* Configuração de Rendimento de Juros (ex: Nubank / CDI) */}
          <div className="p-3.5 bg-[#080B11]/70 border border-[#1E293B] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-[#F8FAFC]">
                Rendimento de Juros (ex: Nubank / Caixinha / CDI)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-[#0D121F] p-1 rounded-xl border border-[#1E293B]">
              <button
                type="button"
                onClick={() => handleYieldTypeChange('none')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                  yieldType === 'none'
                    ? 'bg-[#151D30] text-[#F8FAFC] border border-[#1E293B]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Sem juros
              </button>
              <button
                type="button"
                onClick={() => handleYieldTypeChange('cdi_percent')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                  yieldType === 'cdi_percent'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                % do CDI
              </button>
              <button
                type="button"
                onClick={() => handleYieldTypeChange('monthly_percent')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                  yieldType === 'monthly_percent'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                % ao Mês
              </button>
            </div>

            {yieldType !== 'none' && (
              <div>
                <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                  {yieldType === 'cdi_percent'
                    ? 'Percentual do CDI (ex: 100 para 100% do CDI no Nubank)'
                    : 'Taxa Mensal Líquida % (ex: 0,85 para 0,85% a.m.)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={yieldRate}
                    onChange={(e) => setYieldRate(e.target.value)}
                    placeholder={yieldType === 'cdi_percent' ? '100' : '0,85'}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#080B11] border border-[#1E293B] text-xs font-bold text-emerald-400 focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B] font-semibold">
                    {yieldType === 'cdi_percent' ? '% do CDI' : '% a.m.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-2">
              Cor do Marcador
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0D121F]' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/10 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : accountToEdit ? 'Atualizar' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccountModal({ isOpen, onClose, accountToEdit }: AccountModalProps) {
  if (!isOpen) return null;

  return (
    <AccountModalDialog
      key={accountToEdit ? `${accountToEdit.id}-${accountToEdit.current_balance}` : 'new'}
      accountToEdit={accountToEdit}
      onClose={onClose}
    />
  );
}
