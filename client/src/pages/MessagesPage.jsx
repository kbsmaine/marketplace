import { useEffect, useState } from 'react';
import { api } from '../api';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const loadConversations = () => api('/messages/conversations').then((rows) => {
    setConversations(rows);
    if (!activeId && rows[0]) setActiveId(rows[0].id);
  }).catch((err) => setError(err.message));

  const loadMessages = (id) => api(`/messages/conversations/${id}`).then((data) => setMessages(data.messages)).catch((err) => setError(err.message));

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (activeId) loadMessages(activeId); }, [activeId]);

  return (
    <div className="messages-layout">
      <aside className="panel conversation-list">
        <h2>Conversations</h2>
        {conversations.map((c) => (
          <button key={c.id} className={`conversation-item ${activeId === c.id ? 'active' : ''}`} onClick={() => setActiveId(c.id)}>
            <strong>{c.listing_title}</strong>
            <span>{c.last_message || 'No messages yet'}</span>
          </button>
        ))}
      </aside>
      <section className="panel chat-window">
        <h2>Messages</h2>
        {error ? <div className="error">{error}</div> : null}
        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className="chat-bubble">
              <strong>{m.sender_name}</strong>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
        {activeId ? (
          <form className="chat-form" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(`/messages/conversations/${activeId}`, { method: 'POST', body: JSON.stringify({ body }) });
              setBody('');
              loadMessages(activeId);
              loadConversations();
            } catch (err) { setError(err.message); }
          }}>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message" />
            <button>Send</button>
          </form>
        ) : <p className="muted">Pick a conversation.</p>}
      </section>
    </div>
  );
}
