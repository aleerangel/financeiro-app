'use client';

import React from 'react';

interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 ${className}`}
    >
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

