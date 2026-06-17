import { Clock4 } from 'lucide-react';

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function StepProgress({ steps, currentStep, status }) {
  if (!steps || steps.length === 0) return null;

  const completed = steps.filter(s => s.type !== 'tool_use' ? s.completedAt : false).length;
  const total = steps.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  const lastStart = steps[steps.length - 1]?.startedAt;
  const duration = Date.now() - (lastStart || Date.now());

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{completed}/{total} 步完成</span>
        <span className="flex items-center gap-1"><Clock4 size={10} /> {formatDuration(duration)}</span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === 'STARTING' ? 'animate-pulse bg-blue-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.max(pct, 5)}%` }}
        />
      </div>
    </div>
  );
}