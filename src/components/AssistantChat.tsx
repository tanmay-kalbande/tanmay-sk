import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { assistantSuggestions, assistantWelcomeMessage } from "../data/siteData";
import { renderMarkdown } from "../lib/markdown";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  isTyping?: boolean;
  canRetry?: boolean;
};

type AssistantChatProps = {
  variant: "page" | "modal";
};

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssistantChat({ variant }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: createId(), role: "bot", content: assistantWelcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const effectsRef = useRef<HTMLDivElement | null>(null);

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((message) => !message.isTyping)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const host = effectsRef.current;
    if (!host) {
      return;
    }

    const spawnStar = () => {
      const star = document.createElement("div");
      star.className = "assistant-shooting-star";
      star.style.left = `${Math.random() * 70 + 10}%`;
      star.style.top = `${Math.random() * 40}%`;
      host.appendChild(star);
      window.setTimeout(() => star.remove(), 3000);
    };

    const initial = window.setTimeout(spawnStar, 2000);
    const interval = window.setInterval(spawnStar, 4500);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  async function submitMessage(messageText: string) {
    const cleanMessage = messageText.trim();
    if (!cleanMessage || isProcessing) {
      return;
    }

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: cleanMessage,
    };
    const typingMessage: Message = {
      id: createId(),
      role: "bot",
      content: "",
      isTyping: true,
    };

    setIsProcessing(true);
    setShowSuggestions(false);
    setInput("");
    setMessages((current) => [...current, userMessage, typingMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanMessage,
          history: conversationHistory.slice(-20),
        }),
      });

      const rawResponse = await response.text();
      let payload: { text?: string; error?: string };

      try {
        payload = JSON.parse(rawResponse) as { text?: string; error?: string };
      } catch {
        throw new Error(rawResponse.slice(0, 180) || "The server returned a non-JSON response.");
      }

      if (!response.ok || !payload.text) {
        throw new Error(payload.error ?? "Failed to connect.");
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === typingMessage.id
            ? {
                ...message,
                content: payload.text ?? "",
                isTyping: false,
              }
            : message,
        ),
      );
    } catch (error) {
      const fallback =
        error instanceof Error && error.message
          ? `**Oops, something went wrong!** ${error.message}`
          : "**Oops, something went wrong!** Try again in a moment.";

      setMessages((current) =>
        current.map((message) =>
          message.id === typingMessage.id
            ? {
                ...message,
                content: fallback,
                isTyping: false,
                canRetry: true,
              }
            : message,
        ),
      );
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  return (
    <div className={`assistant-screen assistant-screen--${variant}`}>
      <div className="assistant-effects" ref={effectsRef} aria-hidden="true" />
      <div className="chat-container">
        <div className="header">
          <div className="header-content">
            <div className="avatar-header">T</div>
            <div className="header-text">
              <h1>Tanmay Kalbande</h1>
              <p>AI Assistant</p>
            </div>
          </div>
          {variant === "page" ? (
            <Link to="/" className="assistant-home-link" aria-label="Back to home">
              <i className="fas fa-arrow-left" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div id="chat-messages" className="chat-messages" ref={messagesRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role === "user" ? "user-message" : "bot-message"}`}
            >
              <div className="avatar">{message.role === "user" ? "Y" : "T"}</div>
              <div className="content">
                <div className="message-text">
                  {message.isTyping ? (
                    <span className="typing-indicator" aria-label="Tanmay is typing">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                  )}
                </div>
                <div className="timestamp">{timestamp()}</div>
                {message.canRetry ? (
                  <button
                    type="button"
                    className="retry-btn"
                    onClick={() => {
                      const retrySource = [...messages]
                        .reverse()
                        .find((item) => item.role === "user")?.content;

                      if (retrySource) {
                        void submitMessage(retrySource);
                      }
                    }}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {showSuggestions ? (
          <div className="suggestions">
            {assistantSuggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                className="suggestion"
                onClick={() => void submitMessage(suggestion.query)}
                disabled={isProcessing}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        ) : null}

        <form className="input-area" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about my projects, skills, or experience..."
            autoComplete="off"
            maxLength={300}
            disabled={isProcessing}
          />
          <button type="submit" aria-label="Send Message" disabled={isProcessing}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
