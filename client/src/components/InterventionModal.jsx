import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';

export default function InterventionModal({ session, onClose }) {
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef(null);
  const setActiveIntervention = useSessionStore(s => s.setActiveIntervention);
  const clearActiveIntervention = useSessionStore(s => s.clearActiveIntervention);

  const intervention = session?.pendingIntervention;
  const options = intervention?.options || [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(text) {
    onClose();
    clearActiveIntervention();
    try {
      await fetch(`/api/sessions/${session.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type: options.length > 0 ? 'choice' : 'freetext' }),
      });
    } catch {}
  }

  async function handleIgnore() {
    onClose();
    clearActiveIntervention();
    try {
      await fetch(`/api/sessions/${session.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '\n', type: 'confirmation' }),
      });
    } catch {}
  }

  if (!intervention) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#151515] border border-zinc-700 rounded-t-2xl w-full max-w-2xl mx-4 p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            需要你的输入 — "{session.label}"
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-700 rounded-lg p-4 mb-4 text-sm text-zinc-300 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
          {intervention.question}
        </div>

        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSend(`${i + 1}. ${opt}`)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 rounded-md text-sm transition-colors"
              >
                {i + 1}. {opt}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customInput.trim()) {
                handleSend(customInput.trim());
              }
            }}
            placeholder="输入你的回复..."
            className="flex-1 bg-[#0a0a0a] border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={() => customInput.trim() && handleSend(customInput.trim())}
            disabled={!customInput.trim()}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
          >
            <Send size={14} /> 发送
          </button>
        </div>

        <button
          onClick={handleIgnore}
          className="mt-3 w-full text-center text-xs text-zinc-500 hover:text-zinc-400 transition-colors py-1"
        >
          忽略并继续
        </button>
      </div>
    </div>
  );
}