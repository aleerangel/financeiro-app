'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badge?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  className?: string;
}

const VARIANT_BORDER_STYLES = {
  default: 'border-zinc-850 hover:border-zinc-750',
  success: 'border-emerald-500/20 hover:border-emerald-500/40',
  warning: 'border-amber-500/20 hover:border-amber-500/40',
  danger: 'border-rose-500/20 hover:border-rose-500/40',
  info: 'border-blue-500/20 hover:border-blue-500/40',
};

const VARIANT_ICON_STYLES = {
  default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  badge,
  variant = 'default',
  onClick,
  className = '',
}: MetricCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl bg-zinc-900 border transition-all duration-200 flex flex-col justify-between ${
        VARIANT_BORDER_STYLES[variant]
      } ${
        isClickable ? 'cursor-pointer hover:bg-zinc-850 active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge}
            {Icon && (
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                  iconColor || VARIANT_ICON_STYLES[variant]
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight block truncate">
            {value}
          </span>
        </div>
      </div>

      {subtitle && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 flex items-center justify-between gap-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

