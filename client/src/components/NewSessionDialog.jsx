import { useState } from 'react';
import { X, Terminal } from 'lucide-react';

const TERMINALS = [
  { id: 'claude', name: 'Claude Code', icon: 'CC' },
  { id: 'openclaw', name: 'OpenClaw', icon: 'OC' },
];

function defaultLabel(terminal) {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = terminal === 'openclaw' ? 'OC' : 'CC';
  return `${prefix} ${mm}-${dd}`;
}

export default function NewSessionDialog({ onClose }) {
  const [terminal, setTerminal] = useState('claude');
  const [label, setLabel] = useState(defaultLabel('claude'));
  const [workingDir, setWorkingDir] = useState('/Users/yinmeichao.1');
  const [submitting, setSubmitting] = useState(false);

  function handleTerminalChange(id) {
    setTerminal(id);
    setLabel(defaultLabel(id));
  }

  async function handleSubmit() {
    if (!label || !workingDir) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          workingDirectory: workingDir.trim(),
          prompt: '',
          terminal,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
    } catch {
      alert('需要本地运行：此功能仅在本地环境下可用。在终端运行 npm run dev 启动本地 Monitor。');
      setSubmitting(false);
    }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#151515] border border-zinc-700 rounded-xl w-full max-w-lg mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">新建 Session</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          {/* Terminal selector */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">终端</label>
            <div className="flex gap-2">
              {TERMINALS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTerminalChange(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    terminal === t.id
                      ? 'bg-zinc-200 text-zinc-900'
                      : 'bg-[#0a0a0a] border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <Terminal size={14} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">任务名称</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="例如：重构 auth 模块"
              className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">工作目录</label>
            <input
              value={workingDir}
              onChange={e => setWorkingDir(e.target.value)}
              placeholder="工作目录路径"
              className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!label || !workingDir || submitting}
            className="px-4 py-2 bg-zinc-200 hover:bg-white disabled:opacity-40 text-zinc-900 rounded-md text-sm font-medium transition-colors"
          >
            {submitting ? '启动中...' : '启动'}
          </button>
        </div>
      </div>
    </div>
  );
}