"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkle,
  Plus,
  DownloadSimple,
  Database,
  Brain,
  Cpu,
  Lightning,
  CheckCircle,
  CaretDown,
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

const SERVICES_HEALTH = [
  {
    name: "n8n Orchestrator",
    desc: "Workflow Engine & Active Webhooks",
    metric: "4 Workflows Live",
    icon: Lightning,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    name: "Zoho CRM Suite",
    desc: "Deals, Invoices, Accounts & Tasks",
    metric: "OAuth 2.0 (IN)",
    icon: Database,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    name: "Supabase pgvector",
    desc: "34 BigCity SOP Tasks & Precedents",
    metric: "HNSW Indexed",
    icon: Brain,
    color: "text-sky-600 bg-sky-50 border-sky-200",
  },
  {
    name: "Google Gemini 2.5",
    desc: "Low-Latency Campaign Reasoning",
    metric: "0.3 Temp",
    icon: Cpu,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
];

function createSession(): Session {
  return {
    id: `session-${Date.now()}`,
    title: "New campaign brief",
    messages: [],
    createdAt: new Date(),
  };
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New campaign brief";
  return (
    firstUser.content.slice(0, 42) +
    (firstUser.content.length > 42 ? "..." : "")
  );
}

export default function ChatPage() {
  const [session, setSession] = useState<Session>(() => createSession());
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userHasScrolledUpRef = useRef(false);

  const messages = session.messages;

  // Smooth throttled auto-scroll that respects user scrolling
  const scrollToBottom = useCallback((force = false) => {
    if (force || !userHasScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user is within 120px of bottom, stick to bottom
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
          content: `**Connection Alert:** ${errorMessage}\n\nPlease verify that your n8n server and active webhook are running.`,
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
    let md = `# BCP Assist — Campaign Intelligence Session\n*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((m) => {
      md += `### ${m.role.toUpperCase()} (${m.timestamp.toLocaleTimeString()}):\n\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BCP_Assist_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans antialiased selection:bg-indigo-100 selection:text-indigo-950">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 flex-shrink-0 shadow-2xs">
        {/* Brand & Infrastructure Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-indigo-500 flex items-center justify-center shadow-sm text-white ring-2 ring-indigo-50">
              <Sparkle size={17} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-bold tracking-tight text-slate-900">
                  BCP Assist
                </span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block leading-tight hidden sm:block">
                Campaign Copilot & Intelligence
              </span>
            </div>
          </div>

          {/* Infrastructure Health Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline font-mono text-[10.5px]">4/4 Connected</span>
              <CaretDown size={11} className="text-slate-400" />
            </button>

            {/* Infrastructure Health Popover Dropdown */}
            <AnimatePresence>
              {statusMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setStatusMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 p-3 shadow-xl z-50 space-y-2"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
                        Live Infrastructure
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        100% OPERATIONAL
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {SERVICES_HEALTH.map((item) => {
                        const IconComp = item.icon;
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1.5 rounded-lg border ${item.color}`}>
                                <IconComp size={13} weight="duotone" />
                              </div>
                              <div className="truncate">
                                <span className="text-[11.5px] font-semibold text-slate-800 block truncate">
                                  {item.name}
                                </span>
                                <span className="text-[9.5px] text-slate-400 block truncate">
                                  {item.desc}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9.5px] font-mono font-medium text-slate-500 px-1.5 py-0.5 rounded bg-white border border-slate-200 flex-shrink-0">
                              {item.metric}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Active Brief Title */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 max-w-sm truncate text-xs text-slate-600 font-medium">
          <span className="truncate">{session.title}</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs text-xs font-semibold cursor-pointer"
              title="Export session to Markdown"
            >
              <DownloadSimple size={14} weight="bold" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>New Brief</span>
          </button>
        </div>
      </header>

      {/* Main Full-Width Chat Scroll Feed */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 sm:py-8 flex flex-col items-center scroll-smooth"
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
      <div className="p-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSendMessage={sendMessage}
            isLoading={isLoading}
            onStop={handleStop}
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 mt-2">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 font-mono shadow-2xs">Enter ↵</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 font-mono shadow-2xs">Shift + Enter</kbd> for newline
            </span>
            <span className="hidden sm:inline">Protected by SOW Policy Guard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
