import { useState, useRef, useEffect } from 'react';
import { resolveIntent } from '../assistant/intentEngine';
import { handleIntent } from '../assistant/intentHandlers';

const WELCOME_MSG = {
  text: "Hola! Soy tu asistente CUANTY.",
  hint: "Selecciona una opcion o escribe tu pregunta.",
  options: ["Seguimiento", "Vencidos", "Sugerencias", "Estadisticas"],
};

function StructuredMessage({ data }) {
  return (
    <>
      <div className="chat-resp-title">{data.text}</div>
      {data.items?.length > 0 && (
        <div className="chat-resp-items">
          {data.items.map((item, i) => (
            <div key={i} className="chat-resp-item">
              <span className="chat-resp-item-label">{item.label}</span>
              <span className="chat-resp-item-detail">{item.detail}</span>
            </div>
          ))}
        </div>
      )}
      {data.hint && <div className="chat-resp-hint">{data.hint}</div>}
    </>
  );
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: WELCOME_MSG },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    if (!text || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    const { intent, params } = resolveIntent(text);
    const response = await handleIntent(intent, params);

    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setIsLoading(false);
  };

  const handleSend = () => sendMessage(input.trim());

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOptionClick = (option) => {
    sendMessage(option);
  };

  if (!isOpen) {
    return (
      <button className="chat-fab" onClick={() => setIsOpen(true)} title="Asistente CUANTY">
        💬
      </button>
    );
  }

  const lastAssistantIdx = messages.reduce(
    (last, msg, i) => msg.role === 'assistant' ? i : last, -1
  );

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-header-title">Asistente CUANTY</span>
        <button className="chat-header-close" onClick={() => setIsOpen(false)}>✕</button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => {
          const isStructured = msg.role === 'assistant' && typeof msg.text === 'object';
          const showOptions = !isLoading && i === lastAssistantIdx && isStructured && msg.text.options?.length > 0;

          return (
            <div key={i} className="chat-msg-wrapper">
              <div className={`chat-bubble chat-bubble-${msg.role}`}>
                {isStructured ? <StructuredMessage data={msg.text} /> : msg.text}
              </div>
              {showOptions && (
                <div className="chat-options">
                  {msg.text.options.map((opt, j) => (
                    <button key={j} className="chat-option-btn" onClick={() => handleOptionClick(opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="chat-bubble chat-bubble-assistant chat-loading">
            Consultando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Escribe tu pregunta..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={isLoading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
