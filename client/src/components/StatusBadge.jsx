const STATUS_COLORS = {
  IDLE: { border: 'border-zinc-700', bg: 'bg-zinc-900', dot: 'bg-zinc-500', label: '待启动' },
  STARTING: { border: 'border-blue-500', bg: 'bg-blue-950', dot: 'bg-blue-400', label: '启动中', pulse: true },
  THINKING: { border: 'border-blue-400', bg: 'bg-blue-950', dot: 'bg-blue-300', label: '思考中' },
  RUNNING: { border: 'border-green-500', bg: 'bg-green-950', dot: 'bg-green-400', label: '执行中' },
  WAITING_INPUT: { border: 'border-red-500 animate-pulse', bg: 'bg-red-950', dot: 'bg-red-400', label: '需要介入' },
  DONE: { border: 'border-zinc-600', bg: 'bg-zinc-900', dot: 'bg-green-500', label: '已完成' },
  ERROR: { border: 'border-orange-500', bg: 'bg-orange-950', dot: 'bg-orange-400', label: '出错' },
  KILLED: { border: 'border-zinc-600', bg: 'bg-zinc-900', dot: 'bg-zinc-500', label: '已终止' },
  INTERRUPTED: { border: 'border-yellow-600', bg: 'bg-yellow-950', dot: 'bg-yellow-400', label: '已中断' },
};

function getStatusStyle(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.IDLE;
}

export function StatusBadge({ status }) {
  const style = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${style.bg} ${style.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === 'THINKING' ? 'animate-bounce' : ''} ${status === 'STARTING' || status === 'WAITING_INPUT' ? 'animate-pulse' : ''}`} />
      {style.label}
    </span>
  );
}

export default STATUS_COLORS;