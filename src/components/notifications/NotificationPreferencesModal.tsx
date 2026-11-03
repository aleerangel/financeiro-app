'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Smartphone,
  Calendar,
  DollarSign,
  Users,
  Cake,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  savePushSubscription,
  removePushSubscription,
} from '@/lib/actions/notifications';
import { UserNotificationPreferences, PushSubscriptionJSON } from '@/types/notifications';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { toast } from 'sonner';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const AVAILABLE_DAYS_BEFORE = [
  { days: 0, label: 'No dia do vencimento' },
  { days: 1, label: '1 dia antes' },
  { days: 2, label: '2 dias antes' },
  { days: 3, label: '3 dias antes' },
  { days: 5, label: '5 dias antes' },
];

export function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const { hasBusiness } = useBusinessProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [isDeviceSubscribed, setIsDeviceSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Checa se este navegador/aparelho específico já possui uma PushSubscription ativa
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setIsDeviceSubscribed(Boolean(sub));
        })
        .catch(() => {
          setIsDeviceSubscribed(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    getNotificationPreferences()
      .then((data) => {
        if (!active) return;
        setPrefs(data);
      })
      .catch((err) => {
        console.error('Erro ao buscar preferências de notificação:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePush = async (enable: boolean) => {
    if (!prefs) return;

    if (!enable) {
      // Desativar Push neste dispositivo
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await removePushSubscription(sub.endpoint);
            await sub.unsubscribe();
          }
        }
        setIsDeviceSubscribed(false);
        setPrefs({ ...prefs, push_notifications_enabled: false });
        toast.info('Notificações Push desativadas neste aparelho.');
      } catch (err) {
        console.error('Erro ao desativar push:', err);
      }
      return;
    }

    // Ativar Push
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('Este navegador não suporta notificações Web Push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        toast.error('Permissão de notificações não concedida no navegador.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BCXW6RXG8oJqugvGFiwBMuTlao59blJtkwPrEGonTjYNYTvAPRl2pJCLg8V2lTqkYcjCaNWTTpOcQdM8eQOa8SA';

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      }

      if (sub) {
        const rawJson = sub.toJSON();
        const subJSON: PushSubscriptionJSON = {
          endpoint: rawJson.endpoint || '',
          keys: {
            p256dh: rawJson.keys?.p256dh || '',
            auth: rawJson.keys?.auth || '',
          },
        };
        const res = await savePushSubscription(subJSON, navigator.userAgent);

        if (res.success) {
          setIsDeviceSubscribed(true);
          setPrefs({ ...prefs, push_notifications_enabled: true });
          toast.success('Este aparelho foi cadastrado para receber notificações!');
        } else {
          toast.error(res.error || 'Erro ao registrar aparelho no servidor.');
        }
      }
    } catch (err: unknown) {
      console.error('Erro ao autorizar Web Push:', err);
      toast.error('Falha ao registrar para notificações Push.');
    }
  };

  const handleToggleDayBefore = (day: number) => {
    if (!prefs) return;
    const currentDays = prefs.notify_days_before || [0, 1, 3];
    const exists = currentDays.includes(day);

    let updated: number[];
    if (exists) {
      // Impede remover todos os dias para não ficar sem nenhum alerta
      if (currentDays.length <= 1) {
        toast.info('Selecione pelo menos um momento para receber os alertas.');
        return;
      }
      updated = currentDays.filter((d) => d !== day);
    } else {
      updated = [...currentDays, day].sort((a, b) => a - b);
    }

    setPrefs({ ...prefs, notify_days_before: updated });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs) return;

    try {
      setSaving(true);
      await saveNotificationPreferences({
        push_notifications_enabled: prefs.push_notifications_enabled,
        notify_bills: prefs.notify_bills,
        notify_credits: prefs.notify_credits,
        notify_client_returns: prefs.notify_client_returns,
        notify_birthdays: prefs.notify_birthdays,
        notify_days_before: prefs.notify_days_before,
      });

      toast.success('Preferências de notificação salvas com sucesso!');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Botão fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bell className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Configurações de Notificações
            </h2>
            <p className="text-xs text-zinc-400">
              Personalize canais e prazos de antecedência dos seus alertas
            </p>
          </div>
        </div>

        {loading || !prefs ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">Carregando preferências...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Seção 1: Canais de Notificação */}
            <div className="space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block px-1">
                Canais de Entrega
              </span>

              {/* Canal 1: Central In-App (Fixa/Obrigatória) */}
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Bell className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-zinc-200 block">
                      Central no App (Sino)
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Alertas no topo do painel e extrato (Sempre ativo)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Ativo
                </span>
              </div>

              {/* Canal 2: Web Push (Celular PWA e Navegadores) */}
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-zinc-200 block">
                        Notificações Web Push (Celular e PC)
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Receba avisos na tela mesmo com o aplicativo fechado
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.push_notifications_enabled}
                      onChange={(e) => handleTogglePush(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Status do Dispositivo Atual */}
                {prefs.push_notifications_enabled && (
                  <div className="pt-1">
                    {isDeviceSubscribed ? (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Este aparelho está conectado para receber notificações.</span>
                      </div>
                    ) : pushPermission === 'granted' ? (
                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-[11px]">
                        <span className="text-blue-300">Conectar este aparelho ao Push</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePush(true)}
                          className="px-2.5 py-1 bg-blue-500 text-white font-bold text-[10px] rounded-lg shadow-sm"
                        >
                          Conectar
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-amber-300 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Autorização necessária no navegador</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePush(true)}
                          className="px-2.5 py-1 bg-amber-500 text-zinc-950 font-bold text-[10px] rounded-lg shadow-sm"
                        >
                          Autorizar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Seção 2: Antecedência dos Avisos (Chips Multi-Seleção) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Antecedência dos Avisos de Vencimento</span>
                </span>
              </div>

              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
                <p className="text-[11px] text-zinc-400">
                  Escolha em quais momentos deseja ser alertado sobre contas a pagar e cobranças:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_DAYS_BEFORE.map(({ days, label }) => {
                    const isSelected = (prefs.notify_days_before || [0, 1, 3]).includes(days);
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleToggleDayBefore(days)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Seção 3: Eventos Monitorados */}
            <div className="space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block px-1">
                Eventos e Alertas Ativos
              </span>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
                {/* 1. Contas a Pagar */}
                <label className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">
                        Contas a Pagar & Despesas
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Avisos de contas a vencer e boletos em atraso
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.notify_bills}
                    onChange={(e) => setPrefs({ ...prefs, notify_bills: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
                  />
                </label>

                {/* Seção Comercial (Apenas se hasBusiness for true) */}
                {hasBusiness && (
                  <>
                    {/* 2. Fiados / Contas a Receber */}
                    <label className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition">
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">
                            Fiados & Vendas a Prazo
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Alertas de fiados vencidos prontos para cobrança
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.notify_credits}
                        onChange={(e) => setPrefs({ ...prefs, notify_credits: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
                      />
                    </label>

                    {/* 3. Retorno de Clientes (CRM) */}
                    <label className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition">
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-blue-400" />
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">
                            Radar de Retorno de Clientes (CRM)
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Clientes que atingiram o período ideal para novo atendimento
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.notify_client_returns}
                        onChange={(e) =>
                          setPrefs({ ...prefs, notify_client_returns: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
                      />
                    </label>

                    {/* 4. Aniversariantes do Dia */}
                    <label className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition">
                      <div className="flex items-center gap-2.5">
                        <Cake className="w-4 h-4 text-pink-400" />
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">
                            Aniversariantes do Dia
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Lembretes matinais para enviar mensagens de felicitações
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.notify_birthdays}
                        onChange={(e) =>
                          setPrefs({ ...prefs, notify_birthdays: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Salvando...' : 'Salvar Preferências'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
