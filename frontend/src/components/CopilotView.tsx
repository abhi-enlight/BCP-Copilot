"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import {
  Plus,
  DownloadSimple,
  Sparkle,
} from "@phosphor-icons/react";
import ChatMessage, { type Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingProcess from "@/components/ThinkingProcess";
import EmptyState from "@/components/EmptyState";

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

function createSession(): Session {
  return {
    id: `session-${Date.now()}`,
    title: "New conversation",
    messages: [],
    createdAt: new Date(),
  };
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  return (
    firstUser.content.slice(0, 42) +
    (firstUser.content.length > 42 ? "..." : "")
  );
}

export default function CopilotView() {
  const [session, setSession] = useState<Session>(() => createSession());
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userHasScrolledUpRef = useRef(false);

  const messages = session.messages;

  const scrollToBottom = useCallback((force = false) => {
    if (force || !userHasScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    userHasScrolledUpRef.current = !isAtBottom;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string) => {
      userHasScrolledUpRef.current = false;
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        title:
          prev.messages.length === 0
            ? deriveTitle([...prev.messages, userMessage])
            : prev.title,
      }));

      setIsLoading(true);
      setIsThinking(true);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            sessionId: session.id,
          }),
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const err = await response
            .json()
            .catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        if (contentType.includes("text/event-stream") || response.body) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No stream available");

          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          };

          const decoder = new TextDecoder();
          let buffer = "";
          let firstChunkReceived = false;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") break;

                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.text || "";
                  if (text) {
                    if (!firstChunkReceived) {
                      firstChunkReceived = true;
                      setIsThinking(false);
                      setSession((prev) => ({
                        ...prev,
                        messages: [...prev.messages, assistantMessage],
                      }));
                    }

                    setSession((prev) => {
                      const msgs = [...prev.messages];
                      const last = msgs[msgs.length - 1];
                      if (last && last.role === "assistant") {
                        msgs[msgs.length - 1] = {
                          ...last,
                          content: last.content + text,
                        };
                      }
                      return { ...prev, messages: msgs };
                    });
                  }
                } catch {
                  if (data.trim()) {
                    if (!firstChunkReceived) {
                      firstChunkReceived = true;
                      setIsThinking(false);
                      setSession((prev) => ({
                        ...prev,
                        messages: [...prev.messages, assistantMessage],
                      }));
                    }
                    setSession((prev) => {
                      const msgs = [...prev.messages];
                      const last = msgs[msgs.length - 1];
                      if (last && last.role === "assistant") {
                        msgs[msgs.length - 1] = {
                          ...last,
                          content: last.content + data,
                        };
                      }
                      return { ...prev, messages: msgs };
                    });
                  }
                }
              }
            }
          } catch (readErr) {
            if ((readErr as Error).name !== "AbortError") throw readErr;
          }
        } else {
          const data = await response.json();
          setIsThinking(false);
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: data.text || data.error || "No response from BCP Assist.",
            timestamp: new Date(),
          };

          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
          }));
        }
      } catch (err: unknown) {
        setIsThinking(false);
        if (err instanceof DOMException && err.name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";

        const errMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: `**Connection Alert:** ${errorMessage}\n\nPlease verify that your server is running.`,
          timestamp: new Date(),
        };

        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, errMessage],
        }));
      } finally {
        setIsLoading(false);
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [session.id]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsThinking(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setSession(createSession());
    userHasScrolledUpRef.current = false;
  }, []);

  const handleExport = useCallback(() => {
    if (messages.length === 0) return;
    let md = `# BCP Assist — Copilot Session\n*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((m) => {
      md += `### ${m.role.toUpperCase()} (${m.timestamp.toLocaleTimeString()}):\n\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BCP_Assist_Copilot_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAF9] overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-stone-200/70 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold text-stone-900 tracking-tight">AI Copilot</h1>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hidden sm:flex">
            {session.messages.length > 0 ? deriveTitle(session.messages) : "Ready"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 shadow-sm text-xs font-semibold cursor-pointer"
              title="Export session to Markdown"
            >
              <DownloadSimple size={14} weight="bold" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Full-Width Chat Scroll Feed */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center scroll-smooth"
      >
        {messages.length === 0 ? (
          <EmptyState onSelectPrompt={sendMessage} />
        ) : (
          <div className="w-full max-w-3xl space-y-5">
            {messages.map((msg, index) => (
              <ChatMessage key={msg.id} message={msg} index={index} />
            ))}

            {/* Live Thinking Stepper */}
            <AnimatePresence>
              {isThinking && <ThinkingProcess />}
            </AnimatePresence>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-4 bg-gradient-to-t from-[#FAFAF9] via-[#FAFAF9]/95 to-transparent flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSendMessage={sendMessage}
            isLoading={isLoading}
            onStop={handleStop}
          />
          <div className="flex items-center justify-between text-[11px] text-stone-400 px-2 mt-2">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600 font-mono shadow-sm">Enter ↵</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600 font-mono shadow-sm">Shift + Enter</kbd> for newline
            </span>
            <span className="hidden sm:inline">Gemini 3.7 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
