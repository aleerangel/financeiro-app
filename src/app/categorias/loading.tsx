import React from 'react';

export default function CategoriasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-zinc-800 rounded-xl" />
        <div className="h-4 w-64 bg-zinc-800/60 rounded" />
      </div>

      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 shrink-0" />
              <div className="h-4 w-28 bg-zinc-800 rounded" />
            </div>
            <div className="h-4 w-12 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
