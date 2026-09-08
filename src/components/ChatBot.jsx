import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Plus } from 'lucide-react';
import { api } from '../services/api';

// Suggested prompts for "Parts and Dealer Transactions" — verified against the
// current dataset (see CHATBOT_QUERY_TESTS_AND_SUPPORTED_QUERIES.md).
const PARTS_SUGGESTED_QUESTIONS = [
  'Show the top 10 part families by sales for dealer 28965 in Poland in 2026',
  'Show total sales for dealer 28965 in 2026',
  'Show the top 5 dealer groups by sales in Poland in 2026',
  'Compare dealer 28965 with the Poland country average in 2026',
  'Compare sales for dealer 28965 between 2025 and 2026',
  'Show total sales for Poland in 2026',
];

// ── IDs ──────────────────────────────────────────────────────────────────────
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateSessionId() {
  const KEY = 'iam-chat-session-id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

// ── Payload helpers ──────────────────────────────────────────────────────────
function buildUserPayload() {
  const user = api.getUser();
  const isManager = user?.isManager === true;
  return {
    user_id: user?.email || 'user-123',
    role: isManager ? 'Manager' : 'Sales Executive',
    groups: isManager ? ['sales_team', 'europe_region'] : ['sales_team'],
    permissions: ['view_sales_data'],
    language: (navigator.language || 'en').slice(0, 2) || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw',
  };
}

// ── Response formatting ──────────────────────────────────────────────────────
function formatReply(data) {
  const rows = data?.result?.data;
  if (Array.isArray(rows)) {
    return { content: '', resultData: rows };
  }
  const text = data?.reply || data?.response || data?.answer || data?.message || data?.content;
  if (typeof text === 'string' && text.trim()) return { content: text };
  return { content: JSON.stringify(data, null, 2) };
}

function ResultTable({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <span style={{ color: '#A0A0A0', fontSize: '12px' }}>No results found.</span>;
  }
  const columns = Object.keys(data[0]);
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c}
              style={{
                borderBottom: '1px solid #2A2A2A',
                padding: '4px 6px',
                textAlign: 'left',
                color: '#A0A0A0',
                fontWeight: '600',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {c.replace(/_/g, ' ')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(42,42,42,0.5)' }}>
            {columns.map((c) => (
              <td key={c} style={{ padding: '4px 6px', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ChatBot() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null); // 'parts' | 'campaign'
  const [chats, setChats] = useState({ parts: [], campaign: [] });
  const [conversationIds, setConversationIds] = useState(() => ({
    parts: generateId(),
    campaign: generateId(),
  }));
  const [resetNext, setResetNext] = useState({ parts: false, campaign: false });
  const [sessionId] = useState(() => getOrCreateSessionId());
  const prevPathRef = useRef(pathname);
  const messagesEndRef = useRef(null);

  const messages = selectedMode ? chats[selectedMode] : [];

  // Reset chat on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setChats({ parts: [], campaign: [] });
      setConversationIds({ parts: generateId(), campaign: generateId() });
      setResetNext({ parts: false, campaign: false });
      setInput('');
      setIsOpen(false);
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, selectedMode]);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading || !selectedMode) return;
    const userMsg = { role: 'user', content: text };
    setChats((prev) => ({ ...prev, [selectedMode]: [...prev[selectedMode], userMsg] }));
    setInput('');
    setIsLoading(true);

    try {
      // Promotion & Campaign — placeholder until endpoint is ready
      if (selectedMode === 'campaign') {
        setChats((prev) => ({
          ...prev,
          campaign: [
            ...prev.campaign,
            {
              role: 'assistant',
              content: '🚧 Promotion & Campaign is coming soon — this feature is under development.',
            },
          ],
        }));
        return;
      }

      const payload = {
        user: buildUserPayload(),
        prompt: text,
        prompt_type: 'Parts and Dealer Transactions',
        conversation_id: conversationIds[selectedMode],
        session_id: sessionId,
        reset: resetNext[selectedMode],
      };

      const data = await api.chatTyped(payload);
      setChats((prev) => ({
        ...prev,
        [selectedMode]: [...prev[selectedMode], { role: 'assistant', ...formatReply(data) }],
      }));

      if (resetNext[selectedMode]) {
        setResetNext((prev) => ({ ...prev, [selectedMode]: false }));
      }
    } catch (err) {
      setChats((prev) => ({
        ...prev,
        [selectedMode]: [
          ...prev[selectedMode],
          {
            role: 'assistant',
            content: `⚠️ Unable to reach AI service. Error: ${err.message}. Please check your network connection.`,
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    if (!selectedMode) return;
    setChats((prev) => ({ ...prev, [selectedMode]: [] }));
    setConversationIds((prev) => ({ ...prev, [selectedMode]: generateId() }));
    setResetNext((prev) => ({ ...prev, [selectedMode]: true }));
    setInput('');
  };

  const inputDisabled = !selectedMode || selectedMode === 'campaign';
  const inputPlaceholder = !selectedMode
    ? 'Select a topic above to start chatting...'
    : selectedMode === 'campaign'
      ? 'Promotion & Campaign coming soon...'
      : 'Ask anything...';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={startNewChat}
                title="New chat"
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
                <Plus size={16} />
              </button>
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
          </div>

          {/* Mode selector */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #2A2A2A',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: 'parts', label: 'Parts and Dealer Transactions' },
                { key: 'campaign', label: 'Promotion & Campaign' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMode(m.key)}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    fontSize: '10.5px',
                    lineHeight: '1.3',
                    borderRadius: '8px',
                    border: selectedMode === m.key ? '1px solid #A100FF' : '1px solid #2A2A2A',
                    background: selectedMode === m.key ? 'rgba(161,0,255,0.18)' : 'transparent',
                    color: selectedMode === m.key ? '#FFFFFF' : '#A0A0A0',
                    cursor: 'pointer',
                    fontWeight: selectedMode === m.key ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {!selectedMode && (
              <span style={{ fontSize: '10.5px', color: '#A0A0A0' }}>
                Select a topic to start chatting
              </span>
            )}
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
            {/* Promo placeholder note */}
            {messages.length === 0 && selectedMode === 'campaign' && (
              <div
                style={{
                  background: 'rgba(161,0,255,0.06)',
                  border: '1px solid rgba(161,0,255,0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#A0A0A0',
                  fontSize: '11.5px',
                  lineHeight: '1.5',
                }}
              >
                🚧 Promotion {'&'} Campaign is under development — coming soon.
              </div>
            )}

            {/* Preloaded question chips (only when no messages and a mode is selected) */}
            {messages.length === 0 && selectedMode === 'parts' && (
              <div>
                <p style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '10px', margin: '0 0 10px 0' }}>
                  Suggested questions:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {PARTS_SUGGESTED_QUESTIONS.map((q) => (
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
                  {msg.resultData ? <ResultTable data={msg.resultData} /> : msg.content}
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
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !inputDisabled && sendMessage(input)}
              placeholder={inputPlaceholder}
              disabled={inputDisabled}
              className="input-field"
              style={{
                flex: 1,
                padding: '9px 12px',
                fontSize: '13px',
                opacity: inputDisabled ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={inputDisabled || !input.trim() || isLoading}
              style={{
                background: !inputDisabled && input.trim() && !isLoading ? '#A100FF' : '#2A2A2A',
                border: 'none',
                borderRadius: '6px',
                padding: '9px 12px',
                cursor: !inputDisabled && input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={16} color={!inputDisabled && input.trim() && !isLoading ? '#fff' : '#A0A0A0'} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
