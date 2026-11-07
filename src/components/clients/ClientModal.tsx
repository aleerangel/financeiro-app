'use client';

import { useState } from 'react';
import { X, User, Phone, FileText, Cake } from 'lucide-react';
import { Client } from '@/types/database';
import { createClient, updateClient, CreateClientInput } from '@/lib/actions/clients';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  initialName?: string;
  onSuccess?: (createdOrUpdatedClient?: Client) => void;
}

interface DialogProps {
  clientToEdit?: Client | null;
  initialName?: string;
  onClose: () => void;
  onSuccess?: (createdOrUpdatedClient?: Client) => void;
}

function ClientModalDialog({ clientToEdit, initialName, onClose, onSuccess }: DialogProps) {
  const isEditing = Boolean(clientToEdit?.id && clientToEdit.id.trim().length > 0);
  const [name, setName] = useState(clientToEdit?.name || initialName || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [cpf, setCpf] = useState(clientToEdit?.cpf || '');
  const [birthDate, setBirthDate] = useState(clientToEdit?.birth_date || '');
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
        birth_date: birthDate || null,
        notes: notes.trim() || null,
      };

      let result: Client;
      if (isEditing && clientToEdit) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0D121F] border border-[#1E293B] rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F8FAFC]">
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {isEditing ? 'Atualize as informações do cliente' : 'Cadastre um cliente para sua base'}
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
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 transition font-medium"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                Telefone / WhatsApp (opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 transition"
              />
              <span className="text-[10px] text-[#64748B] mt-1 block">
                Cadastre o número para mensagens automáticas
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                CPF (opcional)
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5 text-[#64748B]" />
              Data de Nascimento (opcional)
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#64748B]" />
              Observações (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Prefere corte degradê na zero, barba alinhada com navalha..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 transition resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#FACC15] hover:bg-[#FDE047] active:bg-[#EAB308] text-[#080B11] font-bold text-xs rounded-xl transition shadow-lg shadow-[#FACC15]/20 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClientModal({
  isOpen,
  onClose,
  clientToEdit,
  initialName,
  onSuccess,
}: ClientModalProps) {
  if (!isOpen) return null;

  const modalKey = clientToEdit?.id
    ? `${clientToEdit.id}-${clientToEdit.updated_at}`
    : `new-${initialName || 'empty'}`;

  return (
    <ClientModalDialog
      key={modalKey}
      clientToEdit={clientToEdit}
      initialName={initialName}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

