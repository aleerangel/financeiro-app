import React from 'react';

export default function CartoesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-zinc-800 rounded-xl" />
        <div className="h-4 w-64 bg-zinc-800/60 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-44 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="h-5 w-32 bg-zinc-800 rounded" />
            <div className="h-8 w-44 bg-zinc-800 rounded" />
            <div className="h-3 w-full bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
