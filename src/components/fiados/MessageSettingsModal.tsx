'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  QrCode,
  FileText,
  Save,
  RotateCcw,
  HelpCircle,
  Receipt,
  HandCoins,
  Clock,
  Cake,
  Crown,
} from 'lucide-react';
import {
  BusinessMessageSettings,
  PixKeyType,
  getTemplatesForSegment,
  PIX_KEY_LABELS,
} from '@/lib/whatsapp-templates';
import { saveMessageSettings } from '@/lib/actions/message-settings';
import { getSubscriptionPlans } from '@/lib/actions/subscriptions';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { getSegmentConfig } from '@/lib/business-presets';
import { toast } from 'sonner';

interface MessageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: BusinessMessageSettings;
  onSaved?: (settings: BusinessMessageSettings) => void;
  hasSubscriptions?: boolean;
}

type MessageCategory =
  | 'sale_receipt'
  | 'collection'
  | 'return_window'
  | 'inactive'
  | 'birthday'
  | 'subscription';

export function MessageSettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSaved,
  hasSubscriptions: hasSubscriptionsProp,
}: MessageSettingsModalProps) {
  const { profile, businessName } = useBusinessProfile();
  const segmentConfig = getSegmentConfig(profile.segment);
  const segmentTemplates = getTemplatesForSegment(profile.segment);

  const [activeTab, setActiveTab] = useState<'pix' | 'templates'>('templates');
  const [hasSubscriptions, setHasSubscriptions] = useState(hasSubscriptionsProp ?? false);

  // Chave Pix
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(
    initialSettings.pix_key_type || 'phone'
  );
  const [pixKey, setPixKey] = useState(initialSettings.pix_key || '');
  const [pixHolderName, setPixHolderName] = useState(
    initialSettings.pix_holder_name || ''
  );
  const [includePixDefault, setIncludePixDefault] = useState(
    initialSettings.include_pix_default ?? true
  );

  // 1. Recibo de Venda
  const [receiptFriendly, setReceiptFriendly] = useState(
    initialSettings.template_sale_receipt_friendly || segmentTemplates.receiptFriendly
  );
  const [receiptDetailed, setReceiptDetailed] = useState(
    initialSettings.template_sale_credit_receipt || segmentTemplates.creditReceipt
  );

  // 2. Cobrança
  const [collectionFriendly, setCollectionFriendly] = useState(
    initialSettings.template_friendly || segmentTemplates.friendly
  );
  const [collectionDefault, setCollectionDefault] = useState(
    initialSettings.template_default || segmentTemplates.default
  );
  const [collectionFirm, setCollectionFirm] = useState(
    initialSettings.template_firm || segmentTemplates.firm
  );

  // 3. Retorno
  const [returnCasual, setReturnCasual] = useState(
    initialSettings.template_return_window || segmentTemplates.returnWindowCasual
  );
  const [returnVip, setReturnVip] = useState(
    initialSettings.template_return_window_vip || segmentTemplates.returnWindowVip
  );

  // 4. Inativos
  const [inactiveCasual, setInactiveCasual] = useState(
    initialSettings.template_inactive_recovery || segmentTemplates.inactiveRecoveryCasual
  );
  const [inactivePromo, setInactivePromo] = useState(
    initialSettings.template_inactive_recovery_promo || segmentTemplates.inactiveRecoveryPromo
  );

  // 5. Aniversário
  const [birthdayCasual, setBirthdayCasual] = useState(
    initialSettings.template_birthday || segmentTemplates.birthdayCasual
  );
  const [birthdayGift, setBirthdayGift] = useState(
    initialSettings.template_birthday_gift || segmentTemplates.birthdayGift
  );

  // 6. Mensalidades / Planos
  const [subInvoice, setSubInvoice] = useState(
    initialSettings.template_subscription_invoice || segmentTemplates.subscriptionInvoice
  );
  const [subReceipt, setSubReceipt] = useState(
    initialSettings.template_subscription_receipt || segmentTemplates.subscriptionReceipt
  );

  // 1º Nível: Categoria Ativa
  const [activeCategory, setActiveCategory] = useState<MessageCategory>('sale_receipt');

  // 2º Nível: Tom Selecionado por categoria
  const [toneReceipt, setToneReceipt] = useState<'friendly' | 'detailed'>('friendly');
  const [toneCollection, setToneCollection] = useState<'friendly' | 'default' | 'firm'>('friendly');
  const [toneReturn, setToneReturn] = useState<'casual' | 'vip'>('casual');
  const [toneInactive, setToneInactive] = useState<'casual' | 'promo'>('casual');
  const [toneBirthday, setToneBirthday] = useState<'casual' | 'gift'>('casual');
  const [toneSubscription, setToneSubscription] = useState<'invoice' | 'receipt'>('invoice');

  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Busca planos apenas se não foi definido via prop
  useEffect(() => {
    if (hasSubscriptionsProp !== undefined) return;

    let isMounted = true;
    getSubscriptionPlans()
      .then((plans) => {
        if (isMounted) setHasSubscriptions(plans.length > 0);
      })
      .catch(() => {
        if (isMounted) setHasSubscriptions(false);
      });
    return () => {
      isMounted = false;
    };
  }, [hasSubscriptionsProp]);

  if (!isOpen) return null;

  // Restaurar padrões do segmento para todas as categorias
  const handleResetDefaults = () => {
    setReceiptFriendly(segmentTemplates.receiptFriendly);
    setReceiptDetailed(segmentTemplates.creditReceipt);
    setCollectionFriendly(segmentTemplates.friendly);
    setCollectionDefault(segmentTemplates.default);
    setCollectionFirm(segmentTemplates.firm);
    setReturnCasual(segmentTemplates.returnWindowCasual);
    setReturnVip(segmentTemplates.returnWindowVip);
    setInactiveCasual(segmentTemplates.inactiveRecoveryCasual);
    setInactivePromo(segmentTemplates.inactiveRecoveryPromo);
    setBirthdayCasual(segmentTemplates.birthdayCasual);
    setBirthdayGift(segmentTemplates.birthdayGift);
    setSubInvoice(segmentTemplates.subscriptionInvoice);
    setSubReceipt(segmentTemplates.subscriptionReceipt);

    toast.info(`Modelos restaurados para o padrão de ${segmentConfig.label}.`);
  };

  // Inserção rápida de tag na posição do cursor
  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = getCurrentTemplateValue();
    const nextVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setCurrentTemplateValue(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Obtém o valor do template atualmente em edição
  const getCurrentTemplateValue = (): string => {
    switch (activeCategory) {
      case 'sale_receipt':
        return toneReceipt === 'friendly' ? receiptFriendly : receiptDetailed;
      case 'collection':
        if (toneCollection === 'friendly') return collectionFriendly;
        if (toneCollection === 'default') return collectionDefault;
        return collectionFirm;
      case 'return_window':
        return toneReturn === 'casual' ? returnCasual : returnVip;
      case 'inactive':
        return toneInactive === 'casual' ? inactiveCasual : inactivePromo;
      case 'birthday':
        return toneBirthday === 'casual' ? birthdayCasual : birthdayGift;
      case 'subscription':
        return toneSubscription === 'invoice' ? subInvoice : subReceipt;
      default:
        return '';
    }
  };

  // Define o valor do template atualmente em edição
  const setCurrentTemplateValue = (val: string) => {
    switch (activeCategory) {
      case 'sale_receipt':
        if (toneReceipt === 'friendly') setReceiptFriendly(val);
        else setReceiptDetailed(val);
        break;
      case 'collection':
        if (toneCollection === 'friendly') setCollectionFriendly(val);
        else if (toneCollection === 'default') setCollectionDefault(val);
        else setCollectionFirm(val);
        break;
      case 'return_window':
        if (toneReturn === 'casual') setReturnCasual(val);
        else setReturnVip(val);
        break;
      case 'inactive':
        if (toneInactive === 'casual') setInactiveCasual(val);
        else setInactivePromo(val);
        break;
      case 'birthday':
        if (toneBirthday === 'casual') setBirthdayCasual(val);
        else setBirthdayGift(val);
        break;
      case 'subscription':
        if (toneSubscription === 'invoice') setSubInvoice(val);
        else setSubReceipt(val);
        break;
    }
  };

  // Tags disponíveis por categoria
  const getAvailableTagsForCategory = (cat: MessageCategory): string[] => {
    switch (cat) {
      case 'sale_receipt':
        return [
          '{primeiro_nome}',
          '{nome}',
          '{valor}',
          '{itens}',
          '{metodo_pagamento}',
          '{bloco_pix}',
          '{assinatura}',
        ];
      case 'collection':
        return [
          '{primeiro_nome}',
          '{nome}',
          '{valor}',
          '{vencimento}',
          '{vencimento_texto}',
          '{dias_atraso}',
          '{atraso_texto}',
          '{itens}',
          '{bloco_pix}',
          '{assinatura}',
        ];
      case 'return_window':
      case 'inactive':
        return [
          '{primeiro_nome}',
          '{nome}',
          '{dias_ultima_visita}',
          '{assinatura}',
        ];
      case 'birthday':
        return ['{primeiro_nome}', '{nome}', '{assinatura}'];
      case 'subscription':
        return [
          '{primeiro_nome}',
          '{nome}',
          '{plano}',
          '{valor}',
          '{vencimento}',
          '{metodo_pagamento}',
          '{bloco_pix}',
          '{assinatura}',
        ];
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveMessageSettings({
        pix_key_type: pixKeyType,
        pix_key: pixKey.trim() || null,
        pix_holder_name: pixHolderName.trim() || null,
        include_pix_default: includePixDefault,
        // Cobrança
        template_friendly: collectionFriendly,
        template_default: collectionDefault,
        template_firm: collectionFirm,
        // Recibo
        template_sale_receipt_friendly: receiptFriendly,
        template_sale_credit_receipt: receiptDetailed,
        // Retorno
        template_return_window: returnCasual,
        template_return_window_vip: returnVip,
        // Inativos
        template_inactive_recovery: inactiveCasual,
        template_inactive_recovery_promo: inactivePromo,
        // Aniversário
        template_birthday: birthdayCasual,
        template_birthday_gift: birthdayGift,
        // Clube
        template_subscription_invoice: subInvoice,
        template_subscription_receipt: subReceipt,
      });

      toast.success('Modelos e configurações salvos com sucesso!');
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao salvar configurações.'
      );
    } finally {
      setSaving(false);
    }
  };

  const availableTags = getAvailableTagsForCategory(activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header Superior */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Configurações de WhatsApp & Pix
              </h2>
              <p className="text-xs text-slate-400">
                Chave de recebimento e modelos automáticos de mensagens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Principais: Chave Pix vs Modelos de Mensagens */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Modelos de Mensagens</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pix')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'pix'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Chave Pix</span>
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ABA CHAVE PIX */}
          {activeTab === 'pix' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Esta chave Pix será adicionada automaticamente ao final das mensagens de cobrança e recibos no WhatsApp, facilitando a cópia pelo cliente.
                </span>
              </div>

              {/* Tipo de Chave */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tipo da Chave Pix
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['phone', 'cpf', 'cnpj', 'email', 'random'] as PixKeyType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPixKeyType(type)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          pixKeyType === type
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {PIX_KEY_LABELS[type]}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Chave Pix */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixKeyType === 'phone'
                      ? 'Ex: (11) 99999-8888'
                      : pixKeyType === 'cpf'
                      ? 'Ex: 123.456.789-00'
                      : pixKeyType === 'email'
                      ? 'Ex: contato@seunegocio.com'
                      : 'Digite a chave Pix'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Nome do Favorecido */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nome do Favorecido / {businessName || 'Negócio'} (Opcional)
                </label>
                <input
                  type="text"
                  value={pixHolderName}
                  onChange={(e) => setPixHolderName(e.target.value)}
                  placeholder={`Ex: ${businessName || 'Meu Negócio'} ou Alexandre Rangel`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Toggle de inclusão padrão */}
              <label className="flex items-center gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePixDefault}
                  onChange={(e) => setIncludePixDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    Incluir Chave Pix por padrão
                  </span>
                  <span className="text-slate-400">
                    Marca automaticamente o envio de Pix ao abrir os modais de cobrança e recibos
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* ABA MODELOS DE MENSAGENS HIERÁRQUICA */}
          {activeTab === 'templates' && (
            <div className="space-y-3.5">
              {/* Barra de Segmento & Restaurar */}
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-400 shrink-0">Modelos para:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 truncate">
                    {segmentConfig.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors shrink-0"
                  title="Restaurar textos para o padrão do segmento"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar padrões</span>
                </button>
              </div>

              {/* 1º NÍVEL: PÍLULAS DE CATEGORIAS DE MENSAGEM */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                  1. Selecione a Finalidade da Mensagem:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {/* Recibo de Venda */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('sale_receipt')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      activeCategory === 'sale_receipt'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Recibo Venda</span>
                  </button>

                  {/* Cobrança */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('collection')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      activeCategory === 'collection'
                        ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>Cobrança</span>
                  </button>

                  {/* Retorno (Pós-Venda) */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('return_window')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      activeCategory === 'return_window'
                        ? 'bg-blue-500 text-zinc-950 shadow-md shadow-blue-500/20'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retorno</span>
                  </button>

                  {/* Inativos */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('inactive')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      activeCategory === 'inactive'
                        ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Inativos</span>
                  </button>

                  {/* Aniversário */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('birthday')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      activeCategory === 'birthday'
                        ? 'bg-pink-500 text-zinc-950 shadow-md shadow-pink-500/20'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Cake className="w-3.5 h-3.5" />
                    <span>Aniversário</span>
                  </button>

                  {/* Clube / Assinaturas (Condicional) */}
                  {hasSubscriptions && (
                    <button
                      type="button"
                      onClick={() => setActiveCategory('subscription')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                        activeCategory === 'subscription'
                          ? 'bg-purple-500 text-zinc-950 shadow-md shadow-purple-500/20'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Mensalidades</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2º NÍVEL: SELETOR DE TOM DA CATEGORIA SELECIONADA */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    2. Escolha o Tom de Voz:
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Tons de Recibo de Venda */}
                  {activeCategory === 'sale_receipt' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setToneReceipt('friendly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneReceipt === 'friendly'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        😊 Amigável / Caloroso
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneReceipt('detailed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneReceipt === 'detailed'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        📋 Padrão / Detalhado
                      </button>
                    </>
                  )}

                  {/* Tons de Cobrança */}
                  {activeCategory === 'collection' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setToneCollection('friendly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneCollection === 'friendly'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        😊 Amigável (Lembrete leve)
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneCollection('default')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneCollection === 'default'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        🤝 Padrão (Educado)
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneCollection('firm')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneCollection === 'firm'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        ⚡ Firme (Aviso de pendência)
                      </button>
                    </>
                  )}

                  {/* Tons de Retorno */}
                  {activeCategory === 'return_window' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setToneReturn('casual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneReturn === 'casual'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        ✨ Amigável / Descontraído
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneReturn('vip')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneReturn === 'vip'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        ⭐ Padrão / Prioritário
                      </button>
                    </>
                  )}

                  {/* Tons de Inativos */}
                  {activeCategory === 'inactive' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setToneInactive('casual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneInactive === 'casual'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        💬 Amigável (Sentimos sua falta)
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneInactive('promo')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneInactive === 'promo'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        🎁 Promocional (Com Oferta Especial)
                      </button>
                    </>
                  )}

                  {/* Tons de Aniversário */}
                  {activeCategory === 'birthday' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setToneBirthday('casual')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneBirthday === 'casual'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        🎂 Amigável (Felicitações)
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneBirthday('gift')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneBirthday === 'gift'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        🎁 Com Presente / Desconto
                      </button>
                    </>
                  )}

                  {/* Tons de Mensalidades */}
                  {activeCategory === 'subscription' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setToneSubscription('invoice')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneSubscription === 'invoice'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        💳 Lembrete de Cobrança
                      </button>
                      <button
                        type="button"
                        onClick={() => setToneSubscription('receipt')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          toneSubscription === 'receipt'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
                        }`}
                      >
                        🧾 Recibo de Quitação
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* EDITOR DE TEXTO DO MODELO ATIVO */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Mensagem que será enviada:
                  </span>
                  <span>{getCurrentTemplateValue().length} caracteres</span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={getCurrentTemplateValue()}
                  onChange={(e) => setCurrentTemplateValue(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed resize-y min-h-[140px]"
                />
              </div>

              {/* TAGS CONTEXTUAIS CLICÁVEIS */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block">
                  Tags disponíveis (toque para inserir na mensagem):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="bg-slate-900 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 px-2 py-0.5 rounded text-amber-400 text-xs font-mono transition-all active:scale-95"
                      title={`Inserir ${tag}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
