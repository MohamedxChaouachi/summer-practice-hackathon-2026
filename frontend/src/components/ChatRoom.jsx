import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ChatRoom({ match, onClose, accentColor = '#0085C7' }) {
  const socket = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (socket && match) {
      console.log('ChatRoom: emitting joinEventRoom', match._id);
      socket.emit('joinEventRoom', match._id);
      
      socket.on('messageHistory', (history) => {
        console.log('ChatRoom: received messageHistory', history);
        setMessages(history.map(m => ({
          eventId: m.event,
          sender: { id: m.sender._id, name: m.sender.name },
          content: m.content,
          timestamp: m.createdAt
        })));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      });

      socket.on('newMessage', (message) => {
        console.log('ChatRoom: received newMessage', message);
        setMessages((prev) => [...prev, message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      });

      return () => { 
        socket.off('messageHistory');
        socket.off('newMessage'); 
      };
    }
  }, [socket, match]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && socket) {
      const msgData = {
        eventId: match._id,
        sender: { id: user._id, name: user.name, avatar: user.avatar },
        content: input,
        timestamp: new Date(),
      };
      console.log('ChatRoom: emitting sendMessage', msgData);
      socket.emit('sendMessage', msgData);
      setInput('');
    } else {
      console.log('ChatRoom: cannot send message. input empty or socket null.', { input: input.trim(), socket: !!socket });
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '380px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: `${accentColor}10` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
          <span className="font-semibold text-sm capitalize" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--foreground)' }}>
            {match.sport?.name || match.sport} Group Chat
          </span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-white/10"
          style={{ color: 'var(--muted-foreground)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs py-8" style={{ color: 'var(--muted-foreground)' }}>
            No messages yet. Say hello! 👋
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isMe = msg.sender.id === user._id;
              const initials = msg.sender.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={idx} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <Avatar className="w-6 h-6 shrink-0" style={{ background: accentColor }}>
                      {msg.sender.avatar && (
                        <AvatarImage src={`http://localhost:5000${msg.sender.avatar}`} alt={msg.sender.name} />
                      )}
                      <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: 'transparent' }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {!isMe && (
                      <span className="text-[11px] font-medium px-1" style={{ color: 'var(--muted-foreground)' }}>
                        {msg.sender.name}
                      </span>
                    )}
                    <div className="px-3 py-2 rounded-2xl text-sm"
                      style={{
                        background: isMe ? accentColor : '#f1f5f9',
                        color: isMe ? 'white' : '#1e293b',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      }}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] px-1" style={{ color: 'var(--muted-foreground)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
        <Input
          type="text"
          placeholder="Type a message..."
          className="flex-1 h-9 text-sm"
          style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '0.5rem' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" size="icon" className="w-9 h-9 shrink-0"
          style={{ background: accentColor, border: 'none', borderRadius: '0.5rem' }}>
          <Send size={15} className="text-white" />
        </Button>
      </form>
    </div>
  );
}
