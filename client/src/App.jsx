import { useWebSocket } from './hooks/useWebSocket';
import Dashboard from './components/Dashboard.jsx';
import { useSessionStore } from './store/sessionStore';
import { Wifi, WifiOff, AlertTriangle, Monitor } from 'lucide-react';

export default function App() {
  useWebSocket();
  const connectionStatus = useSessionStore(s => s.connectionStatus);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0d0d0d] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-lg font-semibold text-white tracking-tight">Claude Monitor</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          {connectionStatus === 'connected' && <span className="flex items-center gap-1 text-green-600"><Wifi size={14} /> connected</span>}
          {connectionStatus === 'disconnected' && <span className="flex items-center gap-1 text-yellow-600"><WifiOff size={14} /> reconnecting</span>}
          {connectionStatus === 'failed' && <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={14} /> failed</span>}
          {connectionStatus === 'offline' && <span className="flex items-center gap-1 text-zinc-600"><Monitor size={14} /> preview</span>}
        </div>
      </header>
      <Dashboard />
    </div>
  );
}