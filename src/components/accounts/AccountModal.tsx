'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AccountType } from '@/types/database';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (accountToEdit) {
        await updateAccount(accountToEdit.id, {
          name,
          type,
          current_balance: parsedBalance,
          color,
        });
      } else {
        await createAccount({
          name,
          type,
          initial_balance: parsedBalance,
          color,
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
