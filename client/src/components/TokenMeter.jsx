import { Zap } from 'lucide-react';

export default function TokenMeter({ usage }) {
  if (!usage) return null;
  const { input = 0, output = 0, estimatedLimit = 200000 } = usage;
  const total = input + output;
  const pct = total / estimatedLimit;
  const isWarning = pct > 0.8;

  return (
    <div className="rounded-lg bg-[#0a0a0a] p-4 border border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Zap size={14} />
          Token 用量
        </div>
        <div className="text-sm text-zinc-300 font-mono">
          {total.toLocaleString()} <span className="text-zinc-600">/ {estimatedLimit.toLocaleString()}</span>
        </div>
      </div>
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isWarning ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>输入: {(input / 1000).toFixed(1)}k</span>
        <span>输出: {(output / 1000).toFixed(1)}k</span>
        <span>剩余: {((estimatedLimit - total) / 1000).toFixed(1)}k</span>
      </div>
    </div>
  );
}