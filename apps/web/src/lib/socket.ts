import { io, type Socket } from 'socket.io-client';
import { API_URL, getAccessToken } from './api-client';

// The Socket.IO server lives at the API origin (without the /api prefix).
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket'],
      // Re-read the (in-memory) access token on every (re)connect.
      auth: (cb) => cb({ token: getAccessToken() ?? '' }),
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
