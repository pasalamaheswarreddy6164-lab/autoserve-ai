import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import api from '../../api/axios';
import { BOT_CONFIG } from '../../utils/helpers';

export default function ChatWidget({ caseId, portal = 'customer', caseTitle = '' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBot, setCurrentBot] = useState('DiagnosticBot');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && caseId) {
      loadHistory();
      // Auto-analyze when agent opens copilot for first time
      if (portal === 'agent') triggerAutoAnalyze();
    }
  }, [open, caseId]);

  const triggerAutoAnalyze = async () => {
    try {
      const res = await api.get(`/chat/${caseId}/analyze`);
      if (res.data.analysis) {
        setMessages(prev => [...prev, {
          sender_role: 'ai',
          ai_bot: 'DiagnosticBot',
          content: res.data.analysis,
          id: Date.now(),
        }]);
      }
    } catch {}
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/chat/${caseId}?portal=${portal}`);
      setMessages(res.data);
    } catch {}
  };

  const send = async () => {
    if (!input.trim() || !caseId || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender_role: portal === 'agent' ? 'agent' : 'customer', content: msg, id: Date.now() }]);
    setLoading(true);
    try {
      const res = await api.post('/chat', { caseId, message: msg, portal });
      setCurrentBot(res.data.botName);
      setMessages(prev => [...prev, {
        sender_role: 'ai',
        ai_bot: res.data.botName,
        content: res.data.reply,
        id: Date.now() + 1,
      }]);
    } catch {
      setMessages(prev => [...prev, { sender_role: 'ai', ai_bot: 'System', content: 'Sorry, I encountered an error. Please try again.', id: Date.now() + 1 }]);
    } finally {
      setLoading(false);
    }
  };

  const bot = BOT_CONFIG[currentBot] || BOT_CONFIG.DiagnosticBot;

  if (!caseId) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-lg">
                {bot.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{portal === 'agent' ? 'AI Copilot' : 'AI Assistant'}</p>
                <p className={`text-xs ${bot.color}`}>{bot.label} active</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Case context */}
          {caseTitle && (
            <div className="px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/20">
              <p className="text-xs text-blue-400 truncate">Case: {caseTitle}</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-2xl">🤖</div>
                <div>
                  <p className="text-sm font-medium text-white">AI Assistant Ready</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {portal === 'agent'
                      ? 'Ask for repair procedures, diagnostics, or documentation'
                      : 'Describe your vehicle issue and I\'ll help diagnose it'}
                  </p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m.id || i} className={`flex ${m.sender_role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                {m.sender_role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs mr-1.5 flex-shrink-0 mt-1">
                    {(BOT_CONFIG[m.ai_bot] || bot).icon}
                  </div>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                  m.sender_role === 'ai'
                    ? 'bg-slate-700 text-slate-100 rounded-bl-sm'
                    : 'bg-blue-600 text-white rounded-br-sm'
                }`}>
                  {m.sender_role === 'ai' && m.ai_bot && (
                    <p className={`text-xs font-medium mb-1 ${(BOT_CONFIG[m.ai_bot] || bot).color}`}>
                      {(BOT_CONFIG[m.ai_bot] || bot).label}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={portal === 'agent' ? 'Ask for repair help...' : 'Describe your issue...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
