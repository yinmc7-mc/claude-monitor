import { create } from 'zustand';

export const useSessionStore = create((set, get) => ({
  sessions: {},
  connectionStatus: 'connecting',
  activeIntervention: null,
  warnings: {},
  filter: 'all',

  setSessions: (sessions) => set({ sessions }),

  updateSession: (session) =>
    set((state) => {
      const sessions = { ...state.sessions, [session.id]: { ...state.sessions[session.id], ...session } };
      return { sessions };
    }),

  addSession: (session) =>
    set((state) => ({ sessions: { ...state.sessions, [session.id]: session } })),

  removeSession: (id) =>
    set((state) => {
      const sessions = { ...state.sessions };
      delete sessions[id];
      return { sessions };
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setActiveIntervention: (sessionId) => set({ activeIntervention: sessionId }),
  clearActiveIntervention: () => set({ activeIntervention: null }),
  setFilter: (filter) => set({ filter }),

  getFilteredSessions: () => {
    const { sessions, filter } = get();
    const all = Object.values(sessions).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (filter === 'all') return all;
    if (filter === 'running') return all.filter(s => ['RUNNING', 'THINKING', 'STARTING'].includes(s.status));
    if (filter === 'waiting') return all.filter(s => s.status === 'WAITING_INPUT');
    if (filter === 'done') return all.filter(s => s.status === 'DONE');
    if (filter === 'error') return all.filter(s => ['ERROR', 'INTERRUPTED'].includes(s.status));
    return all;
  },

  getStatusCounts: () => {
    const sessions = Object.values(get().sessions);
    return {
      all: sessions.length,
      running: sessions.filter(s => ['RUNNING', 'THINKING', 'STARTING'].includes(s.status)).length,
      waiting: sessions.filter(s => s.status === 'WAITING_INPUT').length,
      done: sessions.filter(s => s.status === 'DONE').length,
      error: sessions.filter(s => ['ERROR', 'INTERRUPTED'].includes(s.status)).length,
    };
  },

  addWarning: (sessionId, message) =>
    set(state => ({
      warnings: { ...state.warnings, [sessionId]: message },
    })),
}));