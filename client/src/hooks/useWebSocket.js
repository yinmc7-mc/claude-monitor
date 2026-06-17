import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';

const IS_DEV = window.location.hostname === 'localhost';
const WS_URL = IS_DEV
  ? `ws://${window.location.hostname}:3000/ws`
  : `wss://${window.location.hostname}/ws`;

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

export function useWebSocket() {
  const wsRef = useRef(null);
  const retryCount = useRef(0);
  const mountedRef = useRef(true);
  const { setSessions, updateSession, addSession, setConnectionStatus, setActiveIntervention } = useSessionStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (retryCount.current >= MAX_RETRIES) {
      setConnectionStatus('failed');
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'init':
            if (Array.isArray(msg.sessions)) {
              const map = {};
              msg.sessions.forEach(s => { map[s.id] = s; });
              setSessions(map);
            }
            break;
          case 'session_update':
            updateSession(msg.payload);
            break;
          case 'session_created':
            addSession(msg.payload);
            break;
          case 'session_removed':
            useSessionStore.getState().removeSession(msg.sessionId);
            break;
          case 'intervention_required':
            updateSession({ ...msg.payload, status: 'WAITING_INPUT' });
            setActiveIntervention(msg.payload.sessionId);
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      if (mountedRef.current && retryCount.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount.current);
        retryCount.current++;
        setTimeout(connect, delay);
      } else if (retryCount.current >= MAX_RETRIES) {
        setConnectionStatus('failed');
      }
    };

    ws.onerror = () => ws.close();
  }, [setSessions, updateSession, addSession, setConnectionStatus, setActiveIntervention]);

  useEffect(() => {
    mountedRef.current = true;
    // Only attempt WebSocket on localhost
    if (!IS_DEV) {
      setConnectionStatus('offline');
      return;
    }
    connect();
    return () => { mountedRef.current = false; };
  }, [connect]);

  return useSessionStore.getState;
}