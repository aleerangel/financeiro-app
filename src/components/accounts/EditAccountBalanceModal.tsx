'use client';

import { useState } from 'react';
import { X, Check, Wallet } from 'lucide-react';
import { AccountWithBalance, updateAccountBalance } from '@/lib/actions/accounts';

interface EditAccountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountWithBalance | null;
  onSuccess?: () => void;
}

interface DialogProps {
  account: AccountWithBalance;
  onClose: () => void;
  onSuccess?: () => void;
}

function EditAccountBalanceDialog({ account, onClose, onSuccess }: DialogProps) {
  const [balance, setBalance] = useState(String(account.current_balance ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const cleaned = balance.replace(/\./g, '').replace(',', '.');
      const parsedBalance = parseFloat(cleaned);

      if (isNaN(parsedBalance)) {
        setError('Informe um valor de saldo válido.');
        return;
      }

      await updateAccountBalance(account.id, parsedBalance);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar saldo da conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: account.color || '#3b82f6' }}
          >
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Editar Saldo</h2>
            <p className="text-xs text-zinc-400">{account.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Novo Saldo Atual (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-medium">
                R$
              </span>
              <input
                type="text"
                autoFocus
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <span className="text-[11px] text-zinc-500 mt-1.5 block">
              O saldo será ajustado mantendo o histórico de transações existente.
            </span>
          </div>

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
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              {loading ? 'Salvando...' : 'Atualizar Saldo'}
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
  onSuccess,
}: EditAccountBalanceModalProps) {
  if (!isOpen || !account) return null;

  return (
    <EditAccountBalanceDialog
      key={`${account.id}-${account.current_balance}`}
      account={account}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
