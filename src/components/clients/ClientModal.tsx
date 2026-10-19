'use client';

import { useState } from 'react';
import { X, User, Phone, FileText } from 'lucide-react';
import { Client } from '@/types/database';
import { createClient, updateClient, CreateClientInput } from '@/lib/actions/clients';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  onSuccess?: (createdOrUpdatedClient?: Client) => void;
}

interface DialogProps {
  clientToEdit?: Client | null;
  onClose: () => void;
  onSuccess?: (createdOrUpdatedClient?: Client) => void;
}

function ClientModalDialog({ clientToEdit, onClose, onSuccess }: DialogProps) {
  const [name, setName] = useState(clientToEdit?.name || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [cpf, setCpf] = useState(clientToEdit?.cpf || '');
  const [notes, setNotes] = useState(clientToEdit?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do cliente.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateClientInput = {
        name: name.trim(),
        phone: phone.trim() || null,
        cpf: cpf.trim() || null,
        notes: notes.trim() || null,
      };

      let result: Client;
      if (clientToEdit) {
        result = await updateClient(clientToEdit.id, payload);
      } else {
        result = await createClient(payload);
      }

      onClose();
      if (onSuccess) onSuccess(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <p className="text-xs text-zinc-400">
              {clientToEdit ? 'Atualize as informações do cliente' : 'Cadastre um cliente para sua barbearia'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition font-medium"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                Telefone / WhatsApp (opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                CPF (opcional)
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Observações (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Prefere corte degradê na zero, barba alinhada com navalha..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : clientToEdit ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClientModal({ isOpen, onClose, clientToEdit, onSuccess }: ClientModalProps) {
  if (!isOpen) return null;

  return (
    <ClientModalDialog
      key={clientToEdit ? `${clientToEdit.id}-${clientToEdit.updated_at}` : 'new'}
      clientToEdit={clientToEdit}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

