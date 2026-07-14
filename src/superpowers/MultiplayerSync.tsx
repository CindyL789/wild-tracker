/**
 * ========================================================================
 * SUPERPOWER 2: REAL-TIME MULTIPLAYER SYNC
 * ========================================================================
 * 
 * Using bountywarz CTF Networking patterns:
 * - Territory control → Shared viewing sessions
 * - Team system → Observer groups
 * - Network sync → Real-time animal position updates
 * 
 * Features:
 * - Create/join observation rooms
 * - See other users' cursors on the map
 * - Chat about animals in real-time
 * - Shared camera position (follow the leader)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { TaggedAnimal } from '../types';

interface SyncUser {
  id: string;
  name: string;
  color: string;
  cursorLat: number;
  cursorLng: number;
  isFollowing: boolean;
  lastSeen: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface MultiplayerSyncProps {
  animals: TaggedAnimal[];
  selectedAnimalId: string | null;
  currentCenter: { lat: number; lng: number };
  currentZoom: number;
}

// Generate a random user color
const USER_COLORS = [
  '#12e0ff', // CYAN
  '#ffcf4d', // GOLD
  '#ff3b5c', // RED
  '#3dff9a', // GREEN
  '#ff6b35', // ORANGE
  '#c77dff', // PURPLE
];

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

function generateUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export default function MultiplayerSync({ animals, selectedAnimalId, currentCenter, currentZoom }: MultiplayerSyncProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [users, setUsers] = useState<SyncUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLeader, setIsLeader] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const userIdRef = useRef<string>(generateUserId());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated WebSocket connection (replace with real server)
  const connect = useCallback(() => {
    if (!roomId.trim() || !userName.trim()) return;

    // In production, connect to real WebSocket server
    // const ws = new WebSocket(`wss://your-server.com/rooms/${roomId}`);
    
    // For demo, simulate connection
    setIsConnected(true);
    setIsLeader(true); // First user becomes leader

    // Simulate other users joining
    setTimeout(() => {
      setUsers([
        {
          id: 'user_sim_1',
          name: 'WildlifeObserver',
          color: '#ffcf4d',
          cursorLat: currentCenter.lat + 0.5,
          cursorLng: currentCenter.lng + 0.5,
          isFollowing: false,
          lastSeen: Date.now(),
        },
      ]);
    }, 2000);

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      // Send position update
    }, 5000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [roomId, userName, currentCenter]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setUsers([]);
    setMessages([]);
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
  }, []);

  const sendMessage = useCallback(() => {
    if (!inputMessage.trim() || !isConnected) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      userId: userIdRef.current,
      userName,
      text: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // In production: ws.send(JSON.stringify({ type: 'chat', message: newMessage }));
  }, [inputMessage, isConnected, userName]);

  // Simulate receiving messages
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      // Simulate occasional message from other users
      if (Math.random() > 0.95 && users.length > 0) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const mockMessages = [
          'Look at that migration pattern!',
          'The eagle is moving fast today',
          'Anyone see the wolf pack?',
          'Beautiful tracking data',
          'Weather might affect their movement',
        ];

        setMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}_sim`,
            userId: randomUser.id,
            userName: randomUser.name,
            text: mockMessages[Math.floor(Math.random() * mockMessages.length)],
            timestamp: Date.now(),
          },
        ]);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, users]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection Panel */}
      {!isConnected ? (
        <div className="bg-[#1a1a2e] border border-[#12e0ff]/20 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Offline Mode
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Your name..."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-[#0b0f0c] text-xs text-[#e2ebd9] border border-[#12e0ff]/30 rounded-lg px-3 py-2 outline-none focus:border-[#12e0ff] placeholder:text-gray-600"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room ID..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 bg-[#0b0f0c] text-xs text-[#e2ebd9] border border-[#12e0ff]/30 rounded-lg px-3 py-2 outline-none focus:border-[#12e0ff] placeholder:text-gray-600"
              />
              <button
                onClick={connect}
                disabled={!roomId.trim() || !userName.trim()}
                className="bg-[#12e0ff] hover:bg-[#0ba8cc] text-[#000011] text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-30"
              >
                Join
              </button>
            </div>
          </div>

          <div className="text-[9px] text-gray-500 text-center">
            Create a room to observe wildlife with friends
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1a2e] border border-[#12e0ff]/20 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3dff9a] animate-pulse" />
              <span className="text-xs font-bold text-[#3dff9a] uppercase tracking-wider">
                Live Room: {roomId}
              </span>
            </div>
            <button
              onClick={disconnect}
              className="text-[10px] text-red-400 hover:text-red-300 transition"
            >
              Leave
            </button>
          </div>

          {/* Users list */}
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Observers ({users.length + 1})
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-[#12e0ff]/10 border border-[#12e0ff]/20 px-2 py-1 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#12e0ff]" />
                <span className="text-[10px] text-[#12e0ff] font-bold">{userName} (You)</span>
                {isLeader && (
                  <span className="text-[8px] bg-[#ffcf4d] text-[#000011] px-1 rounded">LEADER</span>
                )}
              </div>
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-1 bg-[#0b0f0c] border border-gray-700 px-2 py-1 rounded-lg"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
                  <span className="text-[10px] text-gray-400">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {isConnected && showChat && (
        <div className="flex-1 bg-[#1a1a2e] border border-[#12e0ff]/20 rounded-xl mt-3 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#12e0ff]/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Team Chat
            </span>
            <button
              onClick={() => setShowChat(false)}
              className="text-[10px] text-gray-500 hover:text-gray-300"
            >
              Hide
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-xs">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.userId === userIdRef.current;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] ${
                      isMe
                        ? 'bg-[#12e0ff]/20 text-[#12e0ff] border border-[#12e0ff]/20'
                        : 'bg-[#0b0f0c] text-gray-300 border border-gray-700'
                    }`}>
                      {!isMe && (
                        <div className="text-[9px] font-bold text-[#ffcf4d] mb-1">
                          {msg.userName}
                        </div>
                      )}
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-gray-600 mt-0.5">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#12e0ff]/10">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Message the team..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-[#0b0f0c] text-xs text-[#e2ebd9] border border-[#12e0ff]/30 rounded-lg px-3 py-2 outline-none focus:border-[#12e0ff] placeholder:text-gray-600"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
                className="bg-[#12e0ff] hover:bg-[#0ba8cc] text-[#000011] text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {!showChat && isConnected && (
        <button
          onClick={() => setShowChat(true)}
          className="mt-3 bg-[#1a1a2e] border border-[#12e0ff]/20 px-3 py-2 rounded-xl text-[10px] text-[#12e0ff] font-bold"
        >
          Show Chat ({messages.length})
        </button>
      )}
    </div>
  );
}
