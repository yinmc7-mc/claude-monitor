import { memo, useState } from 'react';
import { Clock4, FileText, Zap } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { StatusBadge } from './StatusBadge.jsx';
import StepProgress from './StepProgress.jsx';
import clsx from 'clsx';

const STATUS_BORDER = {
  IDLE: 'border-zinc-700',
  STARTING: 'border-blue-500',
  THINKING: 'border-blue-400',
  RUNNING: 'border-green-500',
  WAITING_INPUT: 'border-red-500 animate-border-pulse',
  DONE: 'border-zinc-600',
  ERROR: 'border-orange-500',
  KILLED: 'border-zinc-600',
  INTERRUPTED: 'border-yellow-600',
};

export default memo(function SessionCard({ session, onIntervene, onDetail }) {
  const count = useSessionStore(s => s.getStatusCounts);
  const s = session;
  const statusBorder = STATUS_BORDER[s.status] || 'border-zinc-700';
  const isWaiting = s.status === 'WAITING_INPUT';

  const recentFiles = (s.fileChanges || []).slice(-2).map(f => f.path.split('/').pop());

  const elapsed = s.createdAt ? (Date.now() - s.createdAt) : 0;

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 bg-[#111111] transition-all duration-200',
        statusBorder,
        isWaiting && 'shadow-[0_0_15px_rgba(239,68,68,0.15)]'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusBadge status={s.status} />
          <h3 className="font-medium text-white truncate text-sm">{s.label}</h3>
        </div>
        {isWaiting && (
          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse shrink-0 ml-1">
            !!
          </span>
        )}
      </div>

      <StepProgress steps={s.steps || []} currentStep={s.currentStep} status={s.status} />

      {recentFiles.length > 0 && (
        <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
          <FileText size={12} /> {recentFiles.join(', ')}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <Zap size={12} />
          {((s.tokenUsage?.input || 0) + (s.tokenUsage?.output || 0)).toLocaleString()} tokens
        </div>
        <div className="flex items-center gap-2">
          {isWaiting ? (
            <button
              onClick={() => onIntervene(s)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors animate-pulse"
            >
              立即处理
            </button>
          ) : (
            <button
              onClick={() => onDetail(s)}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-medium transition-colors"
            >
              查看详情
            </button>
          )}
        </div>
      </div>
    </div>
  );
});