import React from 'react';

export default function ContasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-zinc-800 rounded-xl" />
        <div className="h-4 w-64 bg-zinc-800/60 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="h-4 w-28 bg-zinc-800 rounded" />
            <div className="h-7 w-36 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

