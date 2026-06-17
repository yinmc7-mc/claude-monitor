import { Circle, CheckCircle2 } from 'lucide-react';

export default function TimelineView({ steps, currentStep }) {
  if (!steps || steps.length === 0) {
    return <p className="text-zinc-500 text-sm py-8 text-center">暂无步骤记录</p>;
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isActive = step.id === currentStep;
        const isDone = !!step.completedAt;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                isDone ? 'bg-green-500/20 text-green-400' :
                isActive ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {isDone ? <CheckCircle2 size={14} /> :
                 isActive ? <Circle size={14} className="animate-bounce" /> :
                 <Circle size={14} />}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-zinc-800 my-0.5" />}
            </div>
            <div className={`pb-6 ${isActive ? 'text-white' : 'text-zinc-400'} text-sm`}>
              <div className="font-medium">{step.description || step.type}</div>
              {step.detail && (
                <div className="text-xs text-zinc-500 mt-0.5">{step.detail}</div>
              )}
              {step.startedAt && (
                <div className="text-xs text-zinc-600 mt-1">
                  {new Date(step.startedAt).toLocaleTimeString()}
                  {step.completedAt && ` → ${new Date(step.completedAt).toLocaleTimeString()}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}