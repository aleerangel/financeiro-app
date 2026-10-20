'use client';

import { useState, createContext, useContext } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  };

  const handleClose = (value: boolean) => {
    if (dialogState) {
      dialogState.resolve(value);
      setDialogState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  dialogState.options.variant === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : dialogState.options.variant === 'primary'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {dialogState.options.variant === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : dialogState.options.variant === 'primary' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-100">
                  {dialogState.options.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {dialogState.options.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
              >
                {dialogState.options.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  dialogState.options.variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    : dialogState.options.variant === 'primary'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {dialogState.options.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm deve ser usado dentro de um ConfirmProvider');
  }
  return ctx;
}

