'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  X,
  CheckCheck,
  Settings,
  Clock,
  AlertTriangle,
  DollarSign,
  Cake,
  Check,
  ExternalLink,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  syncAndGenerateNotifications,
} from '@/lib/actions/notifications';
import { AppNotification } from '@/types/notifications';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';

interface NotificationBellProps {
  userEmail?: string;
  className?: string;
}

function formatNotificationDate(isoString: string): string {
  try {
    const parts = isoString.split('T');
    if (parts.length >= 2) {
      const timePart = parts[1].slice(0, 5);
      const [y, m, d] = parts[0].split('-');
      void y;
      return `${d}/${m} às ${timePart}`;
    }
    return '';
  } catch {
    return '';
  }
}

export function NotificationBell({ userEmail, className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { profile } = useBusinessProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Busca inicial da contagem e sincronização automática diária
  useEffect(() => {
    let active = true;

    // Sincroniza e gera alertas do dia
    syncAndGenerateNotifications()
      .then(() => getUnreadNotificationsCount())
      .then((count) => {
        if (!active) return;
        setUnreadCount(count);
      })
      .catch((err) => {
        console.error('Erro ao verificar notificações:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Fecha ao clicar fora (no desktop)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Carrega a lista completa ao abrir
  const handleToggleOpen = async () => {
    if (!isOpen) {
      setIsOpen(true);
      setLoading(true);
      try {
        const [list, count] = await Promise.all([
          getNotifications(30),
          getUnreadNotificationsCount(),
        ]);
        setNotifications(list);
        setUnreadCount(count);
      } catch (err) {
        console.error('Erro ao carregar notificações:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Todas as notificações foram marcadas como lidas.');
    } catch {
      toast.error('Erro ao marcar notificações como lidas.');
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignora
      }
    }

    if (n.action_url) {
      setIsOpen(false);
      router.push(n.action_url);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error('Erro ao excluir notificação.');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    return true;
  });

  const getCategoryIcon = (category: AppNotification['category']) => {
    switch (category) {
      case 'bill_due':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'bill_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'credit_overdue':
        return <DollarSign className="w-4 h-4 text-orange-400" />;
      case 'birthday':
        return <Cake className="w-4 h-4 text-pink-400" />;
      case 'client_return':
        return <SegmentIcon segment={profile.segment} className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* Botão do Sino */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 rounded-xl border border-transparent hover:border-zinc-700 transition"
        title="Central de Notificações"
        aria-label="Abrir notificações"
      >
        <Bell className="w-5 h-5 stroke-[2.2]" />

        {/* Badge contador de não lidas */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-md animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Painel Dropdown / Drawer */}
      {isOpen && (
        <>
          {/* Backdrop apenas no mobile */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-2 bottom-2 sm:bottom-auto sm:inset-x-auto sm:absolute sm:right-0 sm:top-12 z-50 w-auto sm:w-96 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[580px] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header do Painel */}
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs text-zinc-100 uppercase tracking-wider">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(true)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                  title="Configurar notificações"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition sm:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Abas de Filtro: Todas vs Não Lidas */}
            <div className="flex items-center border-b border-zinc-800 px-3 bg-zinc-950/20">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 transition ${
                  activeFilter === 'all'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 transition ${
                  activeFilter === 'unread'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Não Lidas ({unreadCount})
              </button>
            </div>

            {/* Lista de Notificações */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-1">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-xs">Buscando alertas...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-1">
                  <Check className="w-8 h-8 mx-auto text-zinc-600 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-zinc-300">Tudo limpo por aqui!</p>
                  <p className="text-[11px] text-zinc-500">
                    Nenhuma notificação {activeFilter === 'unread' ? 'não lida' : 'recente'}.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 rounded-2xl flex items-start gap-3 transition cursor-pointer group ${
                      !n.is_read
                        ? 'bg-zinc-800/40 hover:bg-zinc-800/70 border-l-2 border-emerald-400'
                        : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* Ícone */}
                    <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getCategoryIcon(n.category)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-zinc-100 block truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {formatNotificationDate(n.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      {/* Botão de Ação Rápida */}
                      {n.action_label && (
                        <div className="pt-1 flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold group-hover:underline">
                          <span>{n.action_label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Botão de Excluir */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                      title="Excluir notificação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé do Painel */}
            <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/60 text-center">
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(true)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition font-medium"
              >
                Gerenciar canais (Push & E-mail)
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Preferências */}
      {isPreferencesOpen && (
        <NotificationPreferencesModal
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
