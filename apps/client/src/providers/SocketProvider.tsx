'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';

import { getAuthToken, refreshAuthToken } from '@/lib/auth';
import { getSocket, setSocketAuth } from '@/lib/socket';

interface SocketContextValue {
  socket: Socket;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

let refreshSocketAuthPromise: Promise<string | null> | null = null;

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket] = useState(() => getSocket());
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    let isMounted = true;

    const connectWithAuth = async () => {
      const token = getAuthToken() ?? (await getRefreshSocketAuthPromise());

      if (!isMounted || token === null) {
        return;
      }

      setSocketAuth(socket, token);

      if (!socket.connected) {
        socket.connect();
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = async (error: Error) => {
      if (!isSocketAuthError(error)) {
        return;
      }

      const token = await getRefreshSocketAuthPromise();

      if (!isMounted || token === null) {
        return;
      }

      setSocketAuth(socket, token);
      socket.connect();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    void connectWithAuth();

    return () => {
      isMounted = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();
    };
  }, [socket]);

  const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (context === null) {
    throw new Error('SocketProvider 내부에서만 사용해주세요');
  }

  return context;
}

function getRefreshSocketAuthPromise() {
  refreshSocketAuthPromise ??= refreshAuthToken().finally(() => {
    refreshSocketAuthPromise = null;
  });

  return refreshSocketAuthPromise;
}

function isSocketAuthError(error: Error) {
  return ['UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(
    error.message,
  );
}
