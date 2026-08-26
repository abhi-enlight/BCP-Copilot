"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChatsCircle,
  Plus,
  Trash,
  SidebarSimple,
  Sparkle,
  Database,
  Brain,
  DownloadSimple,
  Tag,
  Target,
  User,
  ShieldCheck,
  QrCode,
  CaretRight,
} from "@phosphor-icons/react";
import ChatMessage, { type Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingProcess from "@/components/ThinkingProcess";
import EmptyState from "@/components/EmptyState";
import IntegrationStatus from "@/components/IntegrationStatus";

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  campaignContext?: string;
}

const CAMPAIGN_SHORTCUTS = [
  {
    name: "Nestle Festive QR",
    type: "200k On-Pack UPI",
    budget: "₹35L",
    color: "text-amber-700 bg-amber-50 border-amber-200/80",
    prompt: "Give me the status, SOP readiness, and historical OTP precautions for Nestle Festive 200k On-Pack QR Cashback.",
  },
  {
    name: "Britannia 50-50 Draw",
    type: "OCR Bill Upload",
    budget: "₹25L",
    color: "text-indigo-700 bg-indigo-50 border-indigo-200/80",
    prompt: "Review the campaign brief and partner voucher dependencies for Britannia 50-50 Bill Upload Lucky Draw.",
  },
  {
    name: "Samsung Diwali Mega",
    type: "Assured OTT EGV",
    budget: "₹75L",
    color: "text-sky-700 bg-sky-50 border-sky-200/80",
    prompt: "What is the commercial budget and 72-hour UAT checklist for Samsung Galaxy Festive OTT Rewards 2026?",
  },
];

function createSession(title = "New conversation", campaignContext?: string): Session {
  return {
    id: `session-${Date.now()}`,
    title,
    messages: [],
    createdAt: new Date(),
    campaignContext,
  };
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  return (
    firstUser.content.slice(0, 36) +
    (firstUser.content.length > 36 ? "..." : "")
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>(() => [createSession()]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession.messages;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isThinking, scrollToBottom]);

  const updateSession = useCallback(
    (sessionId: string, updater: (session: Session) => Session) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updater(s) : s))
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      updateSession(activeSessionId, (s) => ({
        ...s,
        messages: [...s.messages, userMessage],
        title:
          s.messages.length === 0
            ? deriveTitle([...s.messages, userMessage])
            : s.title,
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
            sessionId: activeSessionId,
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

        if (contentType.includes("text/event-stream")) {
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
                      updateSession(activeSessionId, (s) => ({
                        ...s,
                        messages: [...s.messages, assistantMessage],
                      }));
                    }

                    updateSession(activeSessionId, (s) => {
                      const msgs = [...s.messages];
                      const last = msgs[msgs.length - 1];
                      if (last && last.role === "assistant") {
                        msgs[msgs.length - 1] = {
                          ...last,
                          content: last.content + text,
                        };
                      }
                      return { ...s, messages: msgs };
                    });
                  }
                } catch {
                  if (data.trim()) {
                    if (!firstChunkReceived) {
                      firstChunkReceived = true;
                      setIsThinking(false);
                      updateSession(activeSessionId, (s) => ({
                        ...s,
                        messages: [...s.messages, assistantMessage],
                      }));
                    }
                    updateSession(activeSessionId, (s) => {
                      const msgs = [...s.messages];
                      const last = msgs[msgs.length - 1];
                      if (last && last.role === "assistant") {
                        msgs[msgs.length - 1] = {
                          ...last,
                          content: last.content + data,
                        };
                      }
                      return { ...s, messages: msgs };
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
            content:
              data.text || data.error || "No response from BCP Assist.",
            timestamp: new Date(),
          };

          updateSession(activeSessionId, (s) => ({
            ...s,
            messages: [...s.messages, assistantMessage],
          }));
        }
      } catch (err: unknown) {
        setIsThinking(false);
        if (err instanceof DOMException && err.name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);

        const errMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: `**Connection Alert:** ${errorMessage}\n\nPlease check that n8n is running on \`localhost:5678\` and the chat webhook is active.`,
          timestamp: new Date(),
        };

        updateSession(activeSessionId, (s) => ({
          ...s,
          messages: [...s.messages, errMessage],
        }));
      } finally {
        setIsLoading(false);
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [activeSessionId, updateSession]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsThinking(false);
  }, []);

  const handleNewChat = useCallback(() => {
    const newSession = createSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setError(null);
  }, []);

  const handleSelectCampaign = useCallback(
    (campaign: (typeof CAMPAIGN_SHORTCUTS)[0]) => {
      const newSession = createSession(campaign.name, campaign.name);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setError(null);
      // Automatically send the starter inquiry
      setTimeout(() => {
        sendMessage(campaign.prompt);
      }, 50);
    },
    [sendMessage]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== sessionId);
        if (remaining.length === 0) {
          const fresh = createSession();
          setActiveSessionId(fresh.id);
          return [fresh];
        }
        if (sessionId === activeSessionId) {
          setActiveSessionId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeSessionId]
  );

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
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans antialiased">
      {/* Premium Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 300 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-shrink-0 border-r border-slate-200/90 bg-white flex flex-col overflow-hidden z-20 shadow-xs"
      >
        {/* Brand & Workspace Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-indigo-500 flex items-center justify-center shadow-sm text-white ring-2 ring-indigo-50">
              <Sparkle size={17} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight text-slate-900">
                  BCP Assist
                </h1>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                BigCity Campaign Copilot
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
            title="Collapse sidebar"
          >
            <SidebarSimple size={16} />
          </button>
        </div>

        {/* Primary "+ New Brief" Action Button */}
        <div className="p-3 pb-2 bg-white">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus size={15} weight="bold" className="text-indigo-300 group-hover:rotate-90 transition-transform duration-200" />
              <span>New Campaign Brief</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              +
            </kbd>
          </button>
        </div>

        {/* Live Connected Services Widget */}
        <IntegrationStatus />

        {/* Quick Campaign Shortcuts */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Target size={12} weight="bold" />
              Active Campaigns
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Zoho CRM</span>
          </div>

          <div className="space-y-1">
            {CAMPAIGN_SHORTCUTS.map((camp) => (
              <button
                key={camp.name}
                type="button"
                onClick={() => handleSelectCampaign(camp)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-50 border border-transparent hover:border-slate-200/90 transition-all duration-150 cursor-pointer group"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[12px] font-semibold text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                    {camp.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {camp.type}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${camp.color} flex-shrink-0`}>
                  {camp.budget}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2 block flex items-center justify-between">
            <span>Sessions History</span>
            <span className="text-[9.5px] font-mono text-slate-400 font-normal">
              {sessions.length} TOTAL
            </span>
          </span>

          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setError(null);
                }}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${
                  isActive
                    ? "bg-indigo-50/90 text-indigo-950 font-bold border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50/90 border-transparent hover:border-slate-200/80"
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-600" />
                )}

                <div className="flex items-center gap-2 truncate min-w-0">
                  <ChatsCircle
                    size={14}
                    weight={isActive ? "fill" : "regular"}
                    className={isActive ? "text-indigo-600 flex-shrink-0" : "text-slate-400 flex-shrink-0"}
                  />
                  <span className="truncate text-[12.5px]">{s.title}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {s.messages.length > 0 && !isActive && (
                    <span className="text-[10px] font-mono text-slate-400 group-hover:hidden">
                      {s.messages.length}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity rounded"
                    title="Delete session"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* User Profile & Footer Bar */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              AR
            </div>
            <div className="truncate">
              <span className="text-[12px] font-bold text-slate-900 block leading-tight truncate">
                Abhinav Rai
              </span>
              <span className="text-[10px] text-slate-500 font-medium block leading-tight">
                Campaign Lead SPOC
              </span>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs text-[11px] font-medium cursor-pointer"
              title="Export session to Markdown"
            >
              <DownloadSimple size={13} weight="bold" />
              <span>Export</span>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC] to-[#F1F5F9]/60">
        {/* Header Bar */}
        <header className="h-14 border-b border-slate-200/90 flex items-center justify-between px-4 z-10 bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                title="Open Sidebar"
              >
                <SidebarSimple size={16} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {activeSession.title}
              </span>
              <span className="hidden sm:inline text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Gemini 2.5 Flash + Zoho Tools
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>New Session</span>
            </button>
          </div>
        </header>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 flex flex-col items-center">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={sendMessage} />
          ) : (
            <div className="w-full max-w-3xl space-y-4">
              {messages.map((msg, index) => (
                <ChatMessage key={msg.id} message={msg} index={index} />
              ))}

              {/* Dynamic Live Thinking Stepper */}
              <AnimatePresence>
                {isThinking && <ThinkingProcess />}
              </AnimatePresence>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
              onStop={handleStop}
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 mt-2">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 font-mono shadow-2xs">Enter ↵</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 font-mono shadow-2xs">Shift + Enter</kbd> for newline</span>
              <span className="hidden sm:inline">Protected by SOW Policy Guard</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
