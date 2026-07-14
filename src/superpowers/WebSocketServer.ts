/**
 * ========================================================================
 * SUPERPOWER 6: WEBSOCKET SERVER — Live Multiplayer Backend
 * ========================================================================
 * 
 * Production-ready Node.js WebSocket server for real-time collaboration.
 * Deploy this separately or integrate into the existing server.ts.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';

interface Room {
  id: string;
  name: string;
  users: Map<string, User>;
  messages: ChatMessage[];
  leaderId: string | null;
  createdAt: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  ws: WebSocket;
  cursorLat: number;
  cursorLng: number;
  isFollowing: boolean;
  lastPing: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface ServerMessage {
  type: 'join' | 'leave' | 'chat' | 'cursor' | 'follow' | 'state' | 'ping' | 'pong' | 'error';
  payload: any;
}

const USER_COLORS = [
  '#12e0ff', '#ffcf4d', '#ff3b5c', '#3dff9a',
  '#ff6b35', '#c77dff', '#00ff88', '#ff00ff',
];

export class WildlifeSyncServer {
  private wss: WebSocketServer;
  private rooms = new Map<string, Room>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(port: number = 8080) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      const { query } = parse(req.url || '', true);
      const roomId = query.room as string;
      const userName = query.name as string;

      if (!roomId || !userName) {
        ws.close(1008, 'Missing room or name');
        return;
      }

      this.handleConnection(ws, roomId, userName);
    });

    server.listen(port, () => {
      console.log(`🌐 WildlifeSync Server running on port ${port}`);
    });

    // Heartbeat to detect disconnected users
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30000);
  }

  private handleConnection(ws: WebSocket, roomId: string, userName: string) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        users: new Map(),
        messages: [],
        leaderId: null,
        createdAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }

    // First user becomes leader
    if (!room.leaderId) {
      room.leaderId = userId;
    }

    const user: User = {
      id: userId,
      name: userName,
      color,
      ws,
      cursorLat: 0,
      cursorLng: 0,
      isFollowing: false,
      lastPing: Date.now(),
    };

    room.users.set(userId, user);

    // Send welcome with current state
    this.send(ws, {
      type: 'state',
      payload: {
        userId,
        roomId,
        isLeader: room.leaderId === userId,
        users: Array.from(room.users.values()).map(u => ({
          id: u.id,
          name: u.name,
          color: u.color,
          cursorLat: u.cursorLat,
          cursorLng: u.cursorLng,
        })),
        messages: room.messages.slice(-50),
      },
    });

    // Notify others
    this.broadcast(room, userId, {
      type: 'join',
      payload: {
        user: { id: userId, name: userName, color, cursorLat: 0, cursorLng: 0 },
        userCount: room.users.size,
      },
    });

    // Handle messages
    ws.on('message', (data) => {
      try {
        const msg: ServerMessage = JSON.parse(data.toString());
        this.handleMessage(room!, user, msg);
      } catch (err) {
        this.send(ws, { type: 'error', payload: { message: 'Invalid message format' } });
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(room!, user);
    });

    ws.on('pong', () => {
      user.lastPing = Date.now();
    });
  }

  private handleMessage(room: Room, user: User, msg: ServerMessage) {
    switch (msg.type) {
      case 'chat':
        this.handleChat(room, user, msg.payload);
        break;
      case 'cursor':
        this.handleCursor(room, user, msg.payload);
        break;
      case 'follow':
        this.handleFollow(room, user, msg.payload);
        break;
      case 'ping':
        this.send(user.ws, { type: 'pong', payload: { timestamp: Date.now() } });
        break;
    }
  }

  private handleChat(room: Room, user: User, payload: { text: string }) {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      userName: user.name,
      text: payload.text,
      timestamp: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    this.broadcast(room, null, {
      type: 'chat',
      payload: { message },
    });
  }

  private handleCursor(room: Room, user: User, payload: { lat: number; lng: number }) {
    user.cursorLat = payload.lat;
    user.cursorLng = payload.lng;

    this.broadcast(room, user.id, {
      type: 'cursor',
      payload: {
        userId: user.id,
        lat: payload.lat,
        lng: payload.lng,
      },
    });
  }

  private handleFollow(room: Room, user: User, payload: { targetId: string | null }) {
    user.isFollowing = !!payload.targetId;

    this.broadcast(room, null, {
      type: 'follow',
      payload: {
        userId: user.id,
        following: payload.targetId,
      },
    });
  }

  private handleDisconnect(room: Room, user: User) {
    room.users.delete(user.id);

    // Transfer leadership if leader leaves
    if (room.leaderId === user.id && room.users.size > 0) {
      const newLeader = room.users.values().next().value;
      room.leaderId = newLeader.id;
      this.send(newLeader.ws, {
        type: 'state',
        payload: { isLeader: true },
      });
    }

    this.broadcast(room, null, {
      type: 'leave',
      payload: {
        userId: user.id,
        userCount: room.users.size,
      },
    });

    // Clean up empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(room.id);
    }
  }

  private checkHeartbeats() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      for (const user of room.users.values()) {
        if (now - user.lastPing > 60000) {
          user.ws.terminate();
          this.handleDisconnect(room, user);
        } else {
          user.ws.ping();
        }
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(room: Room, excludeUserId: string | null, message: ServerMessage) {
    for (const [id, user] of room.users) {
      if (id !== excludeUserId) {
        this.send(user.ws, message);
      }
    }
  }

  getStats() {
    return {
      rooms: this.rooms.size,
      totalUsers: Array.from(this.rooms.values()).reduce((sum, r) => sum + r.users.size, 0),
    };
  }

  destroy() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

// Standalone server startup
if (require.main === module) {
  const port = parseInt(process.env.WS_PORT || '8080');
  const server = new WildlifeSyncServer(port);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down WildlifeSync Server...');
    server.destroy();
    process.exit(0);
  });
}

export default WildlifeSyncServer;
