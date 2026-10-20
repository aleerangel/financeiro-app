'use client';

import { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { AccountType, AccountYieldType } from '@/types/database';
import { AccountWithBalance, createAccount, updateAccount } from '@/lib/actions/accounts';

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
      } else {
        await createAccount({
          name,
          type,
          initial_balance: parsedBalance,
          color,
          yield_type: yieldType,
          yield_rate: parsedYieldRate,
        });
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-zinc-100 mb-1">
          {accountToEdit ? 'Editar Conta' : 'Nova Conta'}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">
          Cadastre uma conta bancária, carteira física ou conta de investimento.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome da Conta
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Carteira, Itaú"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                {accountToEdit ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
              </label>
              <input
                type="text"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0,00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Configuração de Rendimento de Juros (ex: Nubank / CDI) */}
          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Rendimento de Juros (ex: Nubank / Caixinha / CDI)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => handleYieldTypeChange('none')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                  yieldType === 'none'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
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
                    : 'text-zinc-400 hover:text-zinc-200'
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
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                % ao Mês
              </button>
            </div>

            {yieldType !== 'none' && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
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
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-semibold">
                    {yieldType === 'cdi_percent' ? '% do CDI' : '% a.m.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Cor do Marcador
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-80 hover:opacity-100'
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
              className="px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm rounded-xl transition disabled:opacity-50"
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
