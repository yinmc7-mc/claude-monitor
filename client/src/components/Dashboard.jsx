import { useState, useCallback } from 'react';
import { Plus, Activity, AlertCircle, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import SessionCard from './SessionCard.jsx';
import InterventionModal from './InterventionModal.jsx';
import SessionDetail from './SessionDetail.jsx';
import NewSessionDialog from './NewSessionDialog.jsx';

const FILTERS = [
  { key: 'all', label: '全部', Icon: Layers },
  { key: 'running', label: '运行中', Icon: Activity },
  { key: 'waiting', label: '需要介入', Icon: AlertCircle },
  { key: 'done', label: '已完成', Icon: CheckCircle2 },
  { key: 'error', label: '错误', Icon: XCircle },
];

export default function Dashboard() {
  const filter = useSessionStore(s => s.filter);
  const setFilter = useSessionStore(s => s.setFilter);
  const filteredSessions = useSessionStore(s => s.getFilteredSessions());
  const counts = useSessionStore(s => s.getStatusCounts());
  const connectionStatus = useSessionStore(s => s.connectionStatus);

  const [detailSession, setDetailSession] = useState(null);
  const [interveneSession, setInterveneSession] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleDetail = useCallback((s) => setDetailSession(s), []);
  const handleIntervene = useCallback((s) => setInterveneSession(s), []);

  return (
    <main className="px-6 py-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> 新建 Session
          </button>
        </div>
        <div className="flex items-center gap-1">
          {FILTERS.map(f => {
            const count = f.key === 'all' ? counts.all :
              f.key === 'running' ? counts.running :
              f.key === 'waiting' ? counts.waiting :
              f.key === 'done' ? counts.done :
              f.key === 'error' ? counts.error : 0;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <f.Icon size={12} />
                {f.label}
                {count > 0 && <span className="text-zinc-400 ml-0.5">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session Grid */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-24 text-zinc-600">
          <p className="text-lg">暂无活跃 Session</p>
          <p className="text-sm mt-2">点击"新建 Session"启动一个 Claude Code 任务</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredSessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onDetail={() => handleDetail(s)}
              onIntervene={() => handleIntervene(s)}
            />
          ))}
        </div>
      )}

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-zinc-800 px-6 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">
            <span className="text-zinc-400 font-medium">{counts.all}</span> 全部
          </span>
          <span className="text-zinc-500">
            <span className="text-green-500 font-medium">{counts.running}</span> 运行中
          </span>
          <span className={`${counts.waiting > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
            <span className={`font-medium ${counts.waiting > 0 ? 'animate-pulse' : ''}`}>{counts.waiting}</span> 需要介入
          </span>
          <span className="text-zinc-500">
            <span className="text-zinc-400 font-medium">{counts.done}</span> 已完成
          </span>
          <span className="text-zinc-500">
            <span className="text-orange-400 font-medium">{counts.error}</span> 错误
          </span>
        </div>
        <div>
          {counts.waiting > 0 && (
            <button
              onClick={() => {
                const waiting = Object.values(useSessionStore.getState().sessions)
                  .find(s => s.status === 'WAITING_INPUT');
                if (waiting) setInterveneSession(waiting);
              }}
              className="text-red-400 hover:text-red-300"
            >
              {counts.waiting} 个任务需要你介入
            </button>
          )}
        </div>
      </footer>

      {/* Dialogs */}
      {showNewDialog && <NewSessionDialog onClose={() => setShowNewDialog(false)} />}
      {detailSession && <SessionDetail session={detailSession} onClose={() => setDetailSession(null)} />}
      {interveneSession && (
        <InterventionModal
          session={interveneSession}
          onClose={() => setInterveneSession(null)}
        />
      )}
    </main>
  );
}