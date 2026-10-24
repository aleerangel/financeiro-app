'use client';

import { useState } from 'react';
import { X, Crown, Calendar, DollarSign, User, FileText, Check } from 'lucide-react';
import { Client, SubscriptionPlan, ClientSubscription } from '@/types/database';
import { saveClientSubscription } from '@/lib/actions/subscriptions';
import { getTodayYMD } from '@/lib/date-utils';
import { toast } from 'sonner';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  plans: SubscriptionPlan[];
  subscriptionToEdit?: ClientSubscription | null;
  defaultClientId?: string | null;
  onSuccess: () => void;
}

export function SubscriptionModal(props: SubscriptionModalProps) {
  if (!props.isOpen) return null;
  const key = props.subscriptionToEdit ? `edit-${props.subscriptionToEdit.id}` : 'new-subscription';
  return <SubscriptionModalDialog key={key} {...props} />;
}

function SubscriptionModalDialog({
  onClose,
  clients,
  plans,
  subscriptionToEdit,
  defaultClientId,
  onSuccess,
}: SubscriptionModalProps) {
  const initialClientId = subscriptionToEdit
    ? subscriptionToEdit.client_id
    : defaultClientId || (clients[0]?.id || '');

  const initialIsCustom = subscriptionToEdit
    ? !subscriptionToEdit.plan_id
    : plans.length === 0;

  const initialPlanId = subscriptionToEdit
    ? subscriptionToEdit.plan_id || ''
    : plans[0]?.id || '';

  const initialPrice = subscriptionToEdit
    ? String(subscriptionToEdit.price)
    : plans[0]
    ? String(plans[0].price)
    : '80';

  const [clientId, setClientId] = useState(initialClientId);
  const [planId, setPlanId] = useState(initialPlanId);
  const [customPlanName, setCustomPlanName] = useState(
    subscriptionToEdit?.custom_plan_name || (initialIsCustom ? 'Clube do Corte' : '')
  );
  const [price, setPrice] = useState(initialPrice);
  const [dueDay, setDueDay] = useState(
    subscriptionToEdit ? String(subscriptionToEdit.due_day) : '10'
  );
  const [startDate, setStartDate] = useState(
    subscriptionToEdit?.start_date || getTodayYMD()
  );
  const [notes, setNotes] = useState(subscriptionToEdit?.notes || '');
  const [loading, setLoading] = useState(false);
  const [isCustomPlan, setIsCustomPlan] = useState(initialIsCustom);

  const handlePlanChange = (selectedPlanId: string) => {
    if (selectedPlanId === 'custom') {
      setIsCustomPlan(true);
      setPlanId('');
      if (!customPlanName) setCustomPlanName('Assinatura Personalizada');
    } else {
      setIsCustomPlan(false);
      setPlanId(selectedPlanId);
      const selected = plans.find((p) => p.id === selectedPlanId);
      if (selected) {
        setPrice(String(selected.price));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      toast.error('Selecione um cliente');
      return;
    }

    const numPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Informe um valor mensal válido');
      return;
    }

    const numDueDay = parseInt(dueDay, 10);
    if (isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) {
      toast.error('Dia do vencimento deve ser entre 1 e 31');
      return;
    }

    if (isCustomPlan && !customPlanName.trim()) {
      toast.error('Informe o nome do plano personalizado');
      return;
    }

    try {
      setLoading(true);
      await saveClientSubscription({
        id: subscriptionToEdit?.id,
        client_id: clientId,
        plan_id: isCustomPlan ? null : planId,
        custom_plan_name: isCustomPlan ? customPlanName.trim() : null,
        price: numPrice,
        due_day: numDueDay,
        start_date: startDate,
        notes: notes.trim() || null,
      });

      toast.success(
        subscriptionToEdit
          ? 'Assinatura atualizada com sucesso!'
          : 'Assinatura ativada com sucesso!'
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar assinatura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {subscriptionToEdit ? 'Editar Assinatura' : 'Nova Assinatura'}
            </h2>
            <p className="text-xs text-zinc-400">
              Vincule um cliente a um plano recorrente de barbearia
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Cliente *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={Boolean(subscriptionToEdit)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              required
            >
              <option value="" disabled>
                Selecione um cliente
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Plano */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Plano de Assinatura *
            </label>
            <select
              value={isCustomPlan ? 'custom' : planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — R$ {p.price.toFixed(2)}/mês
                </option>
              ))}
              <option value="custom">Outro / Plano Personalizado</option>
            </select>
          </div>

          {/* Nome do Plano Customizado */}
          {isCustomPlan && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nome do Plano Customizado *
              </label>
              <input
                type="text"
                value={customPlanName}
                onChange={(e) => setCustomPlanName(e.target.value)}
                placeholder="Ex: Barba & Cabelo Quinzenal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          )}

          {/* Valor Mensal e Dia de Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Valor Mensal (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="80.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-emerald-400 font-bold placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Dia Vencimento *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-semibold placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Data de Início */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Data de Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              Observações (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Válido de terça a quinta, etc."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Salvando...' : subscriptionToEdit ? 'Atualizar' : 'Ativar Assinatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
