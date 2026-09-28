"use client";

/**
 * Learnova AI Guidance Chat.
 *
 * General guidance chat shown on the learner dashboard once onboarding is done.
 * - questions are answered by Google Gemini through the Express backend
 *   (POST /api/ai/chat) — the API key never reaches the browser,
 * - recommendations are real specialists / workshops / posts loaded from the
 *   Learnova PostgreSQL database (the AI can only pick from what exists),
 * - the conversation context is kept during the session (and restored from
 *   sessionStorage when the learner navigates away and comes back),
 * - the assistant always states that it provides AI-assisted guidance and
 *   does not replace a qualified specialist.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import RecommendationCards from "./RecommendationCards";
import { api, getToken, setToken } from "@/lib/api";
import {
  AI_DISCLAIMER_TEXT,
  AI_SUGGESTED_QUESTIONS,
  AiChatHistoryEntry,
  AiChatResponse,
  AiRecommendations,
  askLearnovaAi,
} from "@/lib/ai";
import { currentUser, hasCompletedOnboarding, User } from "@/lib/store";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** assistant messages that are only the welcome text (not sent as history) */
  intro?: boolean;
  domain?: string | null;
  recommendations?: AiRecommendations | null;
  followUps?: string[];
  error?: boolean;
  retryText?: string;
  degraded?: boolean;
};

const MAX_INPUT = 1200;

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e5)}`;
}

function welcomeMessage(user: User | null): ChatMessage {
  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const greeting = firstName ? `Hi ${firstName} 👋` : "Hi there 👋";

  return {
    id: "welcome",
    role: "assistant",
    intro: true,
    content:
      `${greeting} I am the Learnova AI Assistant. I can help you explore career paths, studies, entrepreneurship, agriculture, personal development or wellbeing, and I can point you to verified Learnova specialists, workshops and community posts.\n\n` +
      `Tell me what you need help with — for example "I don't know which career to choose" or "I want to start a small business".\n\n` +
      `I give AI-assisted guidance only and I do not replace a qualified specialist.`,
  };
}

/** Light formatter: paragraphs, "-" bullets and **bold** without innerHTML. */
function FormattedText({ text }: { text: string }) {
  const blocks = String(text || "").split(/\n{2,}/);

  const renderInline = (value: string) =>
    value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={index}>{part}</span>
      )
    );

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        const isList = lines.length > 1 && lines.every((line) => /^\s*[-*•]\s+/.test(line));

        if (isList) {
          return (
            <ul className="aiBubbleList" key={blockIndex}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {renderInline(line.replace(/^\s*[-*•]\s+/, "• "))}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

export default function AiChatBox({ user: userProp }: { user?: User | null }) {
  const [user, setUser] = useState<User | null>(userProp ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [notice, setNotice] = useState("");
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [dynamicFollowUps, setDynamicFollowUps] = useState<string[]>([]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);
  /** Last question that failed because the account was not linked yet. */
  const pendingQuestionRef = useRef<string | null>(null);

  const storageKey = useMemo(
    () => `learnova_ai_chat_${user?.id || "learner"}`,
    [user?.id]
  );

  /* ---------------------------------------------------------------- *
   * Load learner + restore this session's conversation
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const current = userProp ?? currentUser();

    setUser(current);
    setOnboardingDone(hasCompletedOnboarding());
    setConnected(Boolean(getToken()));
  }, [userProp]);

  useEffect(() => {
    if (restoredRef.current) return;

    restoredRef.current = true;

    if (typeof window === "undefined") return;

    try {
      const stored = window.sessionStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];

        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      /* ignore storage errors */
    }

    setMessages([welcomeMessage(userProp ?? currentUser())]);
  }, [storageKey, userProp]);

  useEffect(() => {
    if (typeof window === "undefined" || !messages.length) return;

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      /* ignore storage errors */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /* ---------------------------------------------------------------- *
   * Sending a message
   * ---------------------------------------------------------------- */
  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim().slice(0, MAX_INPUT);

      if (!text || loading) return;

      const userMessage: ChatMessage = {
        id: messageId("user"),
        role: "user",
        content: text,
      };

      // Conversation context for this session.
      const history: AiChatHistoryEntry[] = messages
        .filter((message) => !message.intro && !message.error)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      setMessages((previous) => [...previous, userMessage]);
      setInput("");
      setLoading(true);
      setNotice("");

      try {
        const response: AiChatResponse = await askLearnovaAi({
          message: text,
          history,
          user: userProp ?? currentUser(),
        });

        setConnected(true);

        setMessages((previous) => [
          ...previous,
          {
            id: messageId("ai"),
            role: "assistant",
            content: response.message || "I could not produce an answer for that question.",
            domain: response.domain || null,
            recommendations: response.recommendations || null,
            followUps: response.suggestedQuestions || [],
            degraded: Boolean(response.meta?.degraded),
          },
        ]);

        if (Array.isArray(response.suggestedQuestions) && response.suggestedQuestions.length) {
          setDynamicFollowUps(response.suggestedQuestions.slice(0, 4));
        }

        if (response.profile && response.profile.onboardingCompleted === false) {
          setOnboardingDone(false);
        }
      } catch (error) {
        const status = (error as { status?: number })?.status;
        const message =
          error instanceof Error
            ? error.message
            : "The AI assistant is unavailable right now. Please try again.";

        if (status === 401 || status === 403) {
          setConnected(false);
          pendingQuestionRef.current = text;
        }

        setMessages((previous) => [
          ...previous,
          {
            id: messageId("error"),
            role: "assistant",
            error: true,
            retryText: text,
            content:
              status === 401
                ? "Your Learnova session could not be verified for the AI assistant. Use the button below to link this account, then ask again."
                : `⚠ ${message}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, userProp]
  );

  /* ---------------------------------------------------------------- *
   * Link a browser-only account to the backend (existing /api/auth)
   * ---------------------------------------------------------------- */
  const linkAccount = useCallback(async () => {
    const learner = userProp ?? currentUser();

    if (!learner?.email) {
      setLinkError("Please sign in again so the AI assistant can verify your account.");
      return;
    }

    setLinking(true);
    setLinkError("");

    const role = (learner.role || "learner").toString().toUpperCase();

    try {
      if (role === "LEARNER" && learner.password) {
        try {
          const created: any = await api.register({
            name: learner.name,
            email: learner.email,
            password: learner.password,
            role: "LEARNER",
          });

          if (created?.token) {
            setToken(created.token);
            setConnected(true);
            return;
          }
        } catch {
          // Account already exists on the backend → sign in instead.
        }
      }

      if (learner.password) {
        const loggedIn: any = await api.login({
          email: learner.email,
          password: learner.password,
          role,
        });

        if (loggedIn?.token) {
          setToken(loggedIn.token);
          setConnected(true);
          return;
        }
      }

      setLinkError(
        "We could not link this account automatically. Please sign out and sign in again to refresh your Learnova session."
      );
    } catch (error) {
      setLinkError(
        error instanceof Error
          ? error.message
          : "Unable to reach the Learnova server. Is the backend running?"
      );
    } finally {
      setLinking(false);
    }
  }, [userProp]);

  // Once the account is linked, re-send the question that was rejected with a 401.
  useEffect(() => {
    if (connected !== true) return;

    const pending = pendingQuestionRef.current;

    if (!pending) return;

    pendingQuestionRef.current = null;
    setNotice("Account linked. Asking your question again…");
    void send(pending);
  }, [connected, send]);

  const startNewChat = () => {
    setMessages([welcomeMessage(userProp ?? currentUser())]);
    setDynamicFollowUps([]);
    setNotice("Started a new conversation.");
  };

  const suggestions = useMemo(() => {
    const all = [...dynamicFollowUps, ...AI_SUGGESTED_QUESTIONS];

    return Array.from(new Set(all)).slice(0, 4);
  }, [dynamicFollowUps]);

  return (
    <section className="aiChat" id="ai-assistant" aria-label="Learnova AI Assistant">
      {/* Header */}
      <header className="aiChatHeader">
        <div className="aiChatAvatar">✦</div>

        <div className="aiChatHeaderText">
          <h2>Learnova AI Assistant</h2>
          <p>Get personalized guidance and discover the right resources.</p>
        </div>

        <div className="aiChatHeaderActions">
          <span className={connected ? "aiStatusChip on" : "aiStatusChip off"}>
            {connected === null ? "Checking…" : connected ? "Connected" : "Not linked"}
          </span>
          <button type="button" className="ghostButton" onClick={startNewChat}>
            New chat
          </button>
        </div>
      </header>

      {/* Account / onboarding notices */}
      {connected === false && (
        <div className="aiAuthBanner">
          <p>
            <strong>Personalised guidance needs your Learnova account.</strong> The AI assistant
            reads your onboarding information to personalise its answers.
          </p>
          <button
            type="button"
            className="primaryButton"
            onClick={linkAccount}
            disabled={linking}
          >
            {linking ? "Linking…" : "Activate AI guidance"}
          </button>
        </div>
      )}

      {linkError && <p className="aiInlineError">⚠ {linkError}</p>}

      {!onboardingDone && connected !== false && (
        <div className="aiHintBanner">
          <span>
            💡 Complete your <Link href="/onboarding">onboarding</Link> (domains, interests, goals)
            to get sharper recommendations.
          </span>
        </div>
      )}

      {notice && <p className="aiNotice">{notice}</p>}

      {/* Messages */}
      <div className="aiChatMessages" ref={listRef} role="log" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "aiRow user" : "aiRow assistant"}
          >
            {message.role === "assistant" && <div className="aiMiniAvatar">✦</div>}

            <div className="aiBubbleGroup">
              <div
                className={
                  message.role === "user"
                    ? "aiBubble user"
                    : message.error
                      ? "aiBubble assistant error"
                      : "aiBubble assistant"
                }
              >
                {message.role === "assistant" && message.domain && !message.error && (
                  <span className="aiDomainChip">Domain: {message.domain}</span>
                )}

                <FormattedText text={message.content} />

                {message.error && message.retryText && (
                  <button
                    type="button"
                    className="secondaryButton small"
                    onClick={() => send(message.retryText as string)}
                    disabled={loading}
                  >
                    ↻ Try again
                  </button>
                )}
              </div>

              {message.recommendations && (
                <RecommendationCards recommendations={message.recommendations} />
              )}

              {message.followUps && message.followUps.length > 0 && !message.error && (
                <div className="aiFollowUps">
                  {message.followUps.slice(0, 3).map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="aiChip small"
                      onClick={() => send(question)}
                      disabled={loading}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="aiRow assistant">
            <div className="aiMiniAvatar">✦</div>
            <div className="aiBubble assistant loading">
              <span className="aiTyping" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <small>Analysing your question and searching Learnova…</small>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="aiChatInput">
        <textarea
          className="aiInput"
          value={input}
          maxLength={MAX_INPUT}
          rows={1}
          placeholder="Ask anything about your studies, career, business, projects or wellbeing…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          aria-label="Message the Learnova AI Assistant"
        />

        <button
          type="button"
          className="primaryButton aiSendButton"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>

      {/* Suggested questions */}
      <div className="aiSuggestions">
        <span className="aiSuggestionsLabel">Try asking:</span>
        {suggestions.map((question) => (
          <button
            key={question}
            type="button"
            className="aiChip"
            onClick={() => send(question)}
            disabled={loading}
          >
            {question}
          </button>
        ))}
      </div>

      <p className="aiDisclaimer">
        ⓘ {AI_DISCLAIMER_TEXT} For sensitive, medical, legal or financial matters, book an
        appointment with an appropriate qualified specialist on Learnova.
      </p>
    </section>
  );
}
