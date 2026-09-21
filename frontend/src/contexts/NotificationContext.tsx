import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AdminNotification,
} from '../services/notification.service';
import type { SecurityAlert } from '../services/security.service';
import { useAuth } from './AuthContext';

// Same origin the REST client talks to, minus the /api/v1 suffix — Socket.IO
// connects to the server root and namespaces from there, it doesn't take a path.
const SOCKET_URL = ((import.meta.env.VITE_API_URL as string) ?? '').replace(/\/api\/?.*$/, '');

interface NotificationContextValue {
  notifications: AdminNotification[];
  unreadCount: number;
  connected: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  // Only ever populated for a root admin — the server only emits
  // 'security:alert' into that admin's own socket room (see
  // securityEvent.service.ts's alertRootAdmins), so this stays empty for
  // every other role regardless of this shared socket connection.
  securityAlerts: SecurityAlert[];
  dismissSecurityAlert: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setSecurityAlerts([]);
      return;
    }

    listNotifications()
      .then((res) => {
        setNotifications(res.items);
        setUnreadCount(res.unreadCount);
      })
      .catch(() => {
        // A stale/expired session here just means the bell stays empty — the
        // regular 401→refresh→retry interceptor handles the actual auth failure.
      });

    const socket = io(`${SOCKET_URL}/admin`, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (payload: Omit<AdminNotification, 'isRead'>) => {
      setNotifications((prev) => [{ ...payload, isRead: false }, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    });
    socket.on('security:alert', (payload: SecurityAlert) => {
      setSecurityAlerts((prev) => [payload, ...prev].slice(0, 20));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  }, []);

  const dismissSecurityAlert = useCallback((id: string) => {
    setSecurityAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, connected, markRead, markAllRead, securityAlerts, dismissSecurityAlert }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
