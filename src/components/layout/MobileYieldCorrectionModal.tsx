'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Wallet,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { getCachedAccounts, invalidateClientCache } from '@/lib/client-cache';
import { EditAccountBalanceModal } from '@/components/accounts/EditAccountBalanceModal';
import { formatCurrency } from '@/lib/utils';

export function MobileYieldCorrectionModal() {
  const { yieldModalOpen, setYieldModalOpen } = useMobileNavigation();

  if (!yieldModalOpen) return null;

  return <MobileYieldCorrectionContent onClose={() => setYieldModalOpen(false)} />;
}

function MobileYieldCorrectionContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithBalance | null>(null);

  useEffect(() => {
    let mounted = true;

    getCachedAccounts()
      .then((accs) => {
        if (!mounted) return;
        // Prioriza contas que possuem rendimento configurado ou saldo
        const sorted = [...accs].sort((a, b) => {
          const aHasYield = Boolean(a.yield_label || (a.yield_rate && a.yield_rate > 0));
          const bHasYield = Boolean(b.yield_label || (b.yield_rate && b.yield_rate > 0));
          if (aHasYield && !bHasYield) return -1;
          if (!aHasYield && bHasYield) return 1;
          return (Number(b.current_balance) || 0) - (Number(a.current_balance) || 0);
        });

        setAccounts(sorted);

        // Se houver apenas 1 conta, seleciona direto
        if (sorted.length === 1) {
          setSelectedAccount(sorted[0]);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar contas para rendimento:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSuccess = () => {
    invalidateClientCache(['accounts']);
    router.refresh();
    onClose();
  };

  // Se já tiver uma conta selecionada (seja por clique ou se houver só 1), abre o modal de rendimento
  if (selectedAccount) {
    return (
      <EditAccountBalanceModal
        isOpen={true}
        onClose={onClose}
        account={selectedAccount}
        defaultMode="yield"
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Card */}
      <div className="relative w-full sm:max-w-md bg-[#0D121F] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 space-y-4 max-h-[85vh] flex flex-col">
        {/* Barra superior touch */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto sm:hidden" />

        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/20 text-[#A5B4FC] border border-[#6366F1]/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-1.5">
                Correção de Rendimentos
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Selecione a conta que rendeu juros
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] bg-[#151D30] rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo / Lista de Contas */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#94A3B8] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#6366F1]" />
              <span className="text-xs">Carregando suas contas...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-10 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#151D30] border border-[#1E293B] flex items-center justify-center mx-auto text-[#94A3B8]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  Nenhuma conta encontrada
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Cadastre uma conta corrente ou de investimentos para registrar rendimentos.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-[#151D30] hover:bg-[#1E293B] text-[#F8FAFC] font-semibold text-xs rounded-xl transition border border-[#1E293B]"
              >
                Entendido
              </button>
            </div>
          ) : (
            accounts.map((acc) => {
              const balance = Number(acc.current_balance) || 0;
              const hasYield = Boolean(acc.yield_label || (acc.yield_rate && acc.yield_rate > 0));

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccount(acc)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#080B11] hover:bg-[#151D30] border border-[#1E293B] hover:border-[#FACC15]/40 text-left transition group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: acc.color || '#6366f1' }}
                    >
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-[#F8FAFC] truncate">
                          {acc.name}
                        </span>
                        {acc.yield_label && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            {acc.yield_label}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                        {hasYield ? (
                          <>
                            <TrendingUp className="w-3 h-3 text-[#A5B4FC]" />
                            Rendimento ativo
                          </>
                        ) : (
                          'Conta com saldo'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#F8FAFC] block tabular-nums">
                        {formatCurrency(balance)}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">
                        saldo atual
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#F8FAFC] transition" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
