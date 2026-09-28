"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/learner/Icon";

export default function AiChat({ role }: { role: "learner" | "specialist" }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: role === "learner" ? "Hello! I am your Learnova AI Assistant. How can I help with your guidance and career journey today?" : "Hello! I am your Learnova AI Assistant. How can I assist you with your specialist practice today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user" as const, text: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await api.chatWithAI(newMessages);
      if (res.success && res.text) {
        setMessages([...newMessages, { role: "assistant", text: res.text }]);
      } else {
        setMessages([...newMessages, { role: "assistant", text: "I'm sorry, I encountered an error." }]);
      }
    } catch (error: any) {
      setMessages([...newMessages, { role: "assistant", text: error.message || "An error occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: "#fff", borderRadius: "12px", border: "1px solid #eaeaea", overflow: "hidden" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid #eaeaea", background: "#fdfcff" }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#6c5ce7", display: "flex", alignItems: "center", gap: "10px" }}>
          <Icon name="sparkles" size={24} /> Learnova AI Assistant
        </h2>
        <p style={{ margin: "5px 0 0", color: "#666", fontSize: "0.9rem" }}>Powered by Gemini</p>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%",
              padding: "12px 16px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? "#6c5ce7" : "#f1f3f5",
              color: m.role === "user" ? "#fff" : "#333",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap"
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "#f1f3f5", color: "#666" }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "20px", borderTop: "1px solid #eaeaea", background: "#fafafa" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for guidance, recommendations, or ideas..."
            style={{
              flex: 1,
              minHeight: "44px",
              maxHeight: "120px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              resize: "none",
              fontFamily: "inherit",
              fontSize: "1rem"
            }}
            rows={input.split("\n").length > 3 ? 3 : input.split("\n").length}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            style={{
              padding: "12px 20px",
              background: input.trim() && !loading ? "#6c5ce7" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              fontWeight: 600,
              height: "44px"
            }}
          >
            Send
          </button>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#999", marginTop: "8px", textAlign: "center" }}>
          Press Enter to send, Shift + Enter for new line. AI can make mistakes.
        </div>
      </div>
    </div>
  );
}
