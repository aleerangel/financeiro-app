import React from 'react';

export default function Loading() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-zinc-800/80 rounded-xl" />
        <div className="h-4 w-72 bg-zinc-800/50 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-6 w-32 bg-zinc-800/80 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="h-64 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4" />
    </div>
  );
}
