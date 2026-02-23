import { useState, useRef, useEffect } from 'react';
import { resolveIntent } from '../assistant/intentEngine';
import { handleIntent } from '../assistant/intentHandlers';
import { sendChatMessage } from '../api/clients';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WELCOME_MSG = {
  text: "Hola! Soy tu asistente CUANTY.",
  hint: "Selecciona una opcion o escribe tu pregunta.",
  options: ["Seguimiento", "Vencidos", "Sugerencias", "Estadisticas"],
};

function StructuredMessage({ data }) {
  return (
    <>
      <div className="font-semibold text-sm">{data.text}</div>
      {data.items?.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{item.detail}</span>
            </div>
          ))}
        </div>
      )}
      {data.hint && <div className="mt-2 text-xs text-muted-foreground italic">{data.hint}</div>}
    </>
  );
}

export default function ChatAssistant({ isOpen: externalOpen, onClose, onOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val) => {
    if (val) { onOpen?.(); } else { onClose?.(); }
    setInternalOpen(val);
  };
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
    const updatedMessages = [...messages, { role: 'user', text }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const { intent, params } = resolveIntent(text);
      const response = await handleIntent(intent, params);

      if (response._useAI) {
        const chatHistory = updatedMessages
          .filter(m => typeof m.text === 'string')
          .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));

        try {
          const { reply } = await sendChatMessage(chatHistory);
          setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: "No pude conectar con el asistente de IA. Intenta de nuevo o usa los comandos del CRM.",
          }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Ocurrio un error. Intenta de nuevo.",
      }]);
    }

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
      <button
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#001529] shadow-lg hover:scale-105 transition-transform flex items-center justify-center overflow-hidden"
        onClick={() => setIsOpen(true)}
        title="Asistente CUANTY"
      >
        <img src="/cuanty-bot.png" alt="Asistente CUANTY" className="h-10 w-10 rounded-full object-cover" />
      </button>
    );
  }

  const lastAssistantIdx = messages.reduce(
    (last, msg, i) => msg.role === 'assistant' ? i : last, -1
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[480px] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#001529] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/cuanty-bot.png" alt="CUANTY" className="h-8 w-8 rounded-full object-cover" />
          <span className="font-semibold text-sm">Asistente CUANTY</span>
        </div>
        <button className="text-white/70 hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => {
          const isStructured = msg.role === 'assistant' && typeof msg.text === 'object';
          const showOptions = !isLoading && i === lastAssistantIdx && isStructured && msg.text.options?.length > 0;

          return (
            <div key={i}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  msg.role === 'user'
                    ? 'ml-auto bg-[#001529] text-white rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}
              >
                {isStructured ? <StructuredMessage data={msg.text} /> : msg.text}
              </div>
              {showOptions && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.text.options.map((opt, j) => (
                    <Button
                      key={j}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full"
                      onClick={() => handleOptionClick(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="max-w-[85%] px-3 py-2 rounded-xl bg-muted rounded-bl-sm text-sm text-muted-foreground">
            Consultando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 h-9 px-3 rounded-lg border text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Escribe tu pregunta..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
