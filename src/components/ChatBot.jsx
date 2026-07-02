import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { SCREEN_CONTEXT } from '../data/dealers';
import { RAG_KNOWLEDGE } from '../data/ragKnowledge';
import { api } from '../services/api';

const GENERAL_QUESTIONS = [
  'What is a Health Check and what does it assess?',
  'How do I run a PL24 coaching session on-site?',
];

const PRELOADED_QUESTIONS = {
  '/dashboard': [
    'Who should I visit first today?',
    'What are my overdue actions?',
    'Which dealer needs most attention?',
    ...GENERAL_QUESTIONS,
  ],
  '/dealer': [
    "What's the biggest risk at this dealer?",
    'What did we discuss last time?',
    'What should I focus on today?',
    ...GENERAL_QUESTIONS,
  ],
  '/visit': [
    'What questions should I ask about PL24?',
    'How do I address the parts gap?',
    'Flag an issue not on the list',
    ...GENERAL_QUESTIONS,
  ],
};

function getScreenContext(pathname) {
  if (pathname.startsWith('/dealer')) return SCREEN_CONTEXT.dealerBriefing;
  if (pathname.startsWith('/visit')) return SCREEN_CONTEXT.visitCapture;
  return SCREEN_CONTEXT.dashboard;
}

function getPreloaded(pathname) {
  if (pathname.startsWith('/dealer')) return PRELOADED_QUESTIONS['/dealer'];
  if (pathname.startsWith('/visit')) return PRELOADED_QUESTIONS['/visit'];
  return PRELOADED_QUESTIONS['/dashboard'];
}

function buildSystemPrompt(screenContext) {
  return `${screenContext}

--- BMW IAM PROGRAM KNOWLEDGE BASE (RAG) ---
You have access to the following BMW IAM program documentation. When answering questions about Health Checks, PL24, AOS, dealer assessments, KPIs, IR customers, training, or the BMW IAM program structure, prioritise the knowledge below over general training data. If the answer is fully contained in this documentation, cite it directly and concisely.

${RAG_KNOWLEDGE}
--- END OF KNOWLEDGE BASE ---`;
}

export default function ChatBot() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const prevPathRef = useRef(pathname);
  const messagesEndRef = useRef(null);

  // Reset chat on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setMessages([]);
      setIsOpen(false);
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMsg];
      const systemContext = buildSystemPrompt(getScreenContext(pathname));
      const reply = await api.chat(
        history.map((m) => ({ role: m.role, content: m.content })),
        systemContext
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Unable to reach AI service. Error: ${err.message}. Please check your network connection.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const preloaded = getPreloaded(pathname);

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pulse-animation"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#A100FF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(161,0,255,0.4)',
          }}
        >
          <MessageCircle size={22} color="#fff" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="slide-up"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '360px',
            height: '500px',
            background: '#141414',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #2A2A2A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(161,0,255,0.15), transparent)',
              borderRadius: '12px 12px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  background: '#A100FF',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={14} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>
                  Intelligent IAM Copilot AI
                </div>
                <div style={{ fontSize: '11px', color: '#22C55E' }}>● Online</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#A0A0A0',
                padding: '4px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1C1C1C')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Preloaded question chips (only when no messages) */}
            {messages.length === 0 && (
              <div>
                <p style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '10px', margin: '0 0 10px 0' }}>
                  Suggested questions:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {preloaded.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        background: 'rgba(161,0,255,0.08)',
                        border: '1px solid rgba(161,0,255,0.3)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#FFFFFF',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.2s',
                        lineHeight: '1.4',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(161,0,255,0.18)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'rgba(161,0,255,0.08)')
                      }
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      background: '#A100FF',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <MessageCircle size={12} color="#fff" />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '9px 12px',
                    borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    background: msg.role === 'user' ? '#A100FF' : '#1C1C1C',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    background: '#A100FF',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: '4px 12px 12px 12px',
                    background: '#1C1C1C',
                    color: '#A0A0A0',
                    fontSize: '13px',
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid #2A2A2A',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask anything..."
              className="input-field"
              style={{ flex: 1, padding: '9px 12px', fontSize: '13px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={{
                background: input.trim() && !isLoading ? '#A100FF' : '#2A2A2A',
                border: 'none',
                borderRadius: '6px',
                padding: '9px 12px',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={16} color={input.trim() && !isLoading ? '#fff' : '#A0A0A0'} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
