import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';

export default function DiffPanel({ fileChanges, sessionId }) {
  const [expanded, setExpanded] = useState(null);

  if (!fileChanges || fileChanges.length === 0) {
    return <p className="text-zinc-500 text-sm py-8 text-center">暂无文件变更</p>;
  }

  return (
    <div className="space-y-2">
      {fileChanges.map((fc, i) => (
        <div key={i} className="bg-[#0a0a0a] rounded-lg overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-zinc-500" />
              <span className="text-zinc-300 font-mono text-xs">{fc.path}</span>
              <span className={`text-xs ${
                fc.type === 'created' ? 'text-green-500' :
                fc.type === 'deleted' ? 'text-red-500' : 'text-yellow-500'
              }`}>{fc.type}</span>
            </div>
            {(fc.before || fc.after) ?
              (expanded === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />)
              : null}
          </button>

          {expanded === i && (fc.before || fc.after) && (
            <div className="border-t border-zinc-800">
              {fc.before && (
                <div className="p-3">
                  <div className="text-xs text-zinc-500 mb-1">Before:</div>
                  <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto bg-red-500/5 p-2 rounded">
                    {fc.before.slice(0, 2000)}
                  </pre>
                </div>
              )}
              {fc.after && (
                <div className="p-3">
                  <div className="text-xs text-zinc-500 mb-1">After:</div>
                  <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto bg-green-500/5 p-2 rounded">
                    {fc.after.slice(0, 2000)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}