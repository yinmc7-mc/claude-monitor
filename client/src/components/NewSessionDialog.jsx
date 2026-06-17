import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function NewSessionDialog({ onClose }) {
  const [label, setLabel] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(c => setWorkingDir(c.workingDirectory || ''))
      .catch(() => setWorkingDir(''));
  }, []);

  async function handleSubmit() {
    if (!label || !workingDir || !prompt) return;
    setSubmitting(true);
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          workingDirectory: workingDir.trim(),
          prompt: prompt.trim(),
        }),
      });
      onClose();
    } catch {
      setSubmitting(false);
    }
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

          <div>
            <label className="block text-sm text-zinc-400 mb-1">任务 Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="描述你要 Claude 帮你做什么..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!label || !workingDir || !prompt || submitting}
            className="px-4 py-2 bg-zinc-200 hover:bg-white disabled:opacity-40 text-zinc-900 rounded-md text-sm font-medium transition-colors"
          >
            {submitting ? '启动中...' : '启动'}
          </button>
        </div>
      </div>
    </div>
  );
}