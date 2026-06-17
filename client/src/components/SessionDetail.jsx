import { useState } from 'react';
import { X, Clock4, FileText, Terminal, Info } from 'lucide-react';
import TimelineView from './TimelineView.jsx';
import DiffPanel from './DiffPanel.jsx';
import TokenMeter from './TokenMeter.jsx';

const TABS = [
  { key: 'timeline', label: '执行路径', Icon: Clock4 },
  { key: 'files', label: '文件变更', Icon: FileText },
  { key: 'logs', label: '原始日志', Icon: Terminal },
  { key: 'info', label: 'Session 信息', Icon: Info },
];

export default function SessionDetail({ session, onClose }) {
  const [activeTab, setActiveTab] = useState('timeline');
  const s = session;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#111] border-l border-zinc-800 z-50 overflow-y-auto">
        <div className="sticky top-0 bg-[#111] border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">{s.label}</h2>
            <p className="text-xs text-zinc-500">{s.command?.slice(0, 60)}...</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-zinc-300 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.Icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'timeline' && <TimelineView steps={s.steps || []} currentStep={s.currentStep} />}
          {activeTab === 'files' && <DiffPanel fileChanges={s.fileChanges || []} sessionId={s.id} />}
          {activeTab === 'logs' && <RawLogPanel events={s.events || []} />}
          {activeTab === 'info' && <InfoPanel session={s} />}
        </div>
      </div>
    </>
  );
}

function RawLogPanel({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-zinc-500 text-sm">暂无日志</p>;
  }
  return (
    <div className="bg-[#0a0a0a] rounded-lg p-3 font-mono text-xs leading-relaxed max-h-[70vh] overflow-y-auto space-y-0.5">
      {events.map((e, i) => {
        const color = e.type === 'error' ? 'text-red-400' :
          e.type === 'assistant' ? 'text-blue-300' :
          e.type === 'system' ? 'text-zinc-500' : 'text-zinc-400';
        return (
          <div key={i} className={color}>
            <span className="text-zinc-600 mr-2">{new Date(e.timestamp || Date.now()).toLocaleTimeString()}</span>
            {e.type === 'error' ? `[ERROR] ${e.text}` : e.text || JSON.stringify(e)}
          </div>
        );
      })}
    </div>
  );
}

function InfoPanel({ session }) {
  const s = session;
  const details = [
    ['Session ID', s.id],
    ['启动时间', new Date(s.createdAt).toLocaleString()],
    ['工作目录', s.workingDirectory || '-'],
    ['模型', s.model || 'claude-opus-4-5'],
    ['状态', s.status],
    ['Token 用量', `${(s.tokenUsage?.input || 0) + (s.tokenUsage?.output || 0)} / ${(s.tokenUsage?.estimatedLimit || 200000)}`],
    ['PID', s.pid || '-'],
    ['退出码', s.exitCode ?? '-'],
  ];

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {details.map(([label, value]) => (
            <tr key={label} className="border-b border-zinc-800">
              <td className="py-2 text-zinc-500 pr-4 whitespace-nowrap">{label}</td>
              <td className="py-2 text-zinc-300 break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TokenMeter usage={s.tokenUsage} />
    </div>
  );
}