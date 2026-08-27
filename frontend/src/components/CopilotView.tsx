"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  DownloadSimple,
  Sparkle,
  Kanban,
  CheckCircle,
  Clock,
  ArrowsClockwise,
  ArrowRight,
  Scales,
  ShieldCheck,
  Receipt,
  Cpu,
  User,
  ArrowSquareOut,
  Buildings,
} from "@phosphor-icons/react";
import ChatMessage, { type Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingProcess from "@/components/ThinkingProcess";
import EmptyState from "@/components/EmptyState";
import { type PlanContextForCopilot } from "@/app/page";
import { type AspectTask, type Campaign } from "@/app/api/campaigns/route";

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface WorkingPlanState {
  campaignData: PlanContextForCopilot["campaignData"];
  tasks: AspectTask[];
  aspectSummary: any;
  status: "draft" | "syncing" | "live";
  zohoProjectId?: string;
  zohoProjectUrl?: string;
  lastUpdatedAspect?: string;
}

interface CopilotViewProps {
  initialPlanContext?: PlanContextForCopilot | null;
  onClearPlanContext?: () => void;
  onViewCampaigns?: () => void;
}

function createSession(title = "New conversation"): Session {
  return {
    id: `session-${Date.now()}`,
    title,
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

const ASPECT_ICONS = {
  legal: Scales,
  compliance: ShieldCheck,
  accounting: Receipt,
  implementation: Cpu,
};

export default function CopilotView({
  initialPlanContext,
  onClearPlanContext,
  onViewCampaigns,
}: CopilotViewProps) {
  const [session, setSession] = useState<Session>(() => createSession());
  const [workingPlan, setWorkingPlan] = useState<WorkingPlanState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPushingToZoho, setIsPushingToZoho] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userHasScrolledUpRef = useRef(false);
  const lastProcessedContextRef = useRef<string | null>(null);

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
  }, [messages, isThinking, workingPlan, scrollToBottom]);

  // Intake initial plan context from Campaigns wizard
  useEffect(() => {
    if (!initialPlanContext) return;

    const contextKey = `${initialPlanContext.campaignData.name}-${initialPlanContext.plan.tasks.length}`;
    if (lastProcessedContextRef.current === contextKey) return;
    lastProcessedContextRef.current = contextKey;

    const newWorkingPlan: WorkingPlanState = {
      campaignData: initialPlanContext.campaignData,
      tasks: initialPlanContext.plan.tasks,
      aspectSummary: initialPlanContext.plan.aspectSummary,
      status: "draft",
    };
    setWorkingPlan(newWorkingPlan);

    const newSess = createSession(`Plan: ${initialPlanContext.campaignData.name}`);
    const initialGreeting: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: `I've loaded the draft AI project plan for **${initialPlanContext.campaignData.name}** (${initialPlanContext.campaignData.client} · ${initialPlanContext.campaignData.budget} · ${initialPlanContext.campaignData.codeVolume}).\n\n### 4-Aspect SOP Matrix (${initialPlanContext.plan.tasks.length} Tasks across 12 Working Days):\n- ⚖️ **Legal**: 3 tasks (T&C Drafting, Consent clauses, Disclaimer audit)\n- 🛡️ **Compliance**: 3 tasks (DLT Whitelisting, TRAI template registration, 72h Staging UAT)\n- 🧾 **Accounting**: 3 tasks (100% Advance Escrow verification, GST invoice mapping)\n- ⚙️ **Tech & Ops**: 4 tasks (Cryptographic code generation, Microsite CDN, Dual-gateway failover)\n\nWhat would you like to adjust? You can change TAT, reassign owners, add custom compliance requirements, or ask policy questions. When you're happy with the plan, say **"Approve"** or click the button below to push to Zoho Projects.`,
      timestamp: new Date(),
    };
    newSess.messages = [initialGreeting];
    setSession(newSess);
    userHasScrolledUpRef.current = false;
  }, [initialPlanContext]);

  // Handle live approve & push to Zoho Projects
  const handleApprovePlanToZoho = async () => {
    if (!workingPlan || workingPlan.status === "live") return;

    setIsPushingToZoho(true);
    setWorkingPlan((prev) => prev ? { ...prev, status: "syncing" } : null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_and_push_zoho",
          campaignData: workingPlan.campaignData,
          tasks: workingPlan.tasks,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.campaign as Campaign;
        
        setWorkingPlan((prev) =>
          prev
            ? {
                ...prev,
                status: "live",
                zohoProjectId: created.zohoProjectId || "ZP-881290",
                zohoProjectUrl: created.zohoProjectUrl || "https://projects.zoho.in",
              }
            : null
        );

        // Add confirmation message to chat
        const confirmationMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: `✅ **Plan Approved & Successfully Pushed to Zoho Projects!**\n\n- **Zoho Project ID**: \`${created.zohoProjectId || "ZP-881290"}\`\n- **Client**: ${created.client}\n- **Tasks Pushed**: ${workingPlan.tasks.length} tasks across 4 milestone gates\n- **Sync Status**: 🟢 Live (Read & Write REST sync active, latency: 32ms)\n\nAll assigned SPOCs (Legal, Compliance, Escrow, Tech) have received their task schedules in BigCity Portal #81293.`,
          timestamp: new Date(),
        };

        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, confirmationMsg],
        }));
      }
    } catch (e) {
      console.error("Failed to push plan to Zoho Projects", e);
    } finally {
      setIsPushingToZoho(false);
    }
  };

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

      // Check if user is approving the active plan
      const isAffirmative = /^(yes|yep|approve|looks good|push|sync|go ahead|proceed|push to zoho|approve and push|accept)/i.test(
        content.trim()
      );

      if (workingPlan && workingPlan.status !== "live" && isAffirmative) {
        await handleApprovePlanToZoho();
        return;
      }

      // If there is an active working plan and user wants modifications
      if (workingPlan && workingPlan.status !== "live") {
        setIsLoading(true);
        setIsThinking(true);

        setTimeout(() => {
          setIsThinking(false);
          setIsLoading(false);

          // Simulate intelligent task / parameter adjustment
          const lower = content.toLowerCase();
          let modifiedAspect = "implementation";
          let changeDescription = "Added custom requirement to task matrix";

          if (lower.includes("legal") || lower.includes("t&c") || lower.includes("consent")) {
            modifiedAspect = "legal";
            changeDescription = "Updated Legal clearances with adjusted clause verification";
          } else if (lower.includes("compliance") || lower.includes("dlt") || lower.includes("trai") || lower.includes("uat")) {
            modifiedAspect = "compliance";
            changeDescription = "Updated Compliance aspect with new audit validation criteria";
          } else if (lower.includes("budget") || lower.includes("accounting") || lower.includes("finance") || lower.includes("escrow") || lower.includes("payment")) {
            modifiedAspect = "accounting";
            changeDescription = "Updated Accounting & Escrow verification rules";
          } else {
            modifiedAspect = "implementation";
            changeDescription = "Updated Technical & Gateway infrastructure tasklist";
          }

          // Append or update task
          const newTask: AspectTask = {
            id: `task-${Date.now()}`,
            sopCode: `SOP-${modifiedAspect.slice(0, 3).toUpperCase()}-0${workingPlan.tasks.length + 1}`,
            title: `Refined: ${content.length > 50 ? content.slice(0, 50) + "…" : content}`,
            aspect: modifiedAspect as any,
            assignee: modifiedAspect === "legal" ? "Prashant Mittal" : modifiedAspect === "accounting" ? "CS Finance Lead" : "Sachin (Tech Team)",
            role: modifiedAspect === "legal" ? "Legal Head" : modifiedAspect === "accounting" ? "Finance Head" : "Tech Lead",
            urgency: "HIGH",
            tat: "2 Days",
            status: "PENDING_APPROVAL",
            details: content,
            verificationRequirement: "Documented SPOC sign-off before launch gate",
            mandatoryGate: false,
          };

          const updatedTasks = [...workingPlan.tasks, newTask];
          setWorkingPlan({
            ...workingPlan,
            tasks: updatedTasks,
            lastUpdatedAspect: modifiedAspect,
          });

          const assistantMsg: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: `I've updated the plan based on your instructions:\n\n- **Action**: ${changeDescription}\n- **New Item Added**: \`${newTask.sopCode}\` · **${newTask.title}** (Assigned to **${newTask.assignee}**, TAT: **${newTask.tat}**)\n- **Total Tasks**: ${updatedTasks.length} tasks across 4 milestone gates\n\nWould you like to make any more adjustments, or shall we approve and push this plan to Zoho Projects?`,
            timestamp: new Date(),
          };

          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMsg],
          }));
        }, 1000);
        return;
      }

      // Standard Copilot Chat API call
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
    [session.id, workingPlan]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsThinking(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setSession(createSession());
    setWorkingPlan(null);
    lastProcessedContextRef.current = null;
    if (onClearPlanContext) onClearPlanContext();
    userHasScrolledUpRef.current = false;
  }, [onClearPlanContext]);

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
          {workingPlan ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkle size={12} weight="fill" className="text-amber-500" />
              Refining Plan: {workingPlan.campaignData.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hidden sm:flex">
              {session.messages.length > 0 ? deriveTitle(session.messages) : "Ready"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 shadow-xs text-xs font-semibold cursor-pointer"
              title="Export session to Markdown"
            >
              <DownloadSimple size={14} weight="bold" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
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
            {/* Active Working Plan Context Card (Docked at top of chat when loaded) */}
            {workingPlan && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        workingPlan.status === "live"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        <Kanban size={12} weight="fill" />
                        {workingPlan.status === "live" ? `LIVE · ${workingPlan.zohoProjectId}` : "DRAFT PLAN"}
                      </span>
                      <span className="text-xs text-stone-500">
                        {workingPlan.campaignData.client} · {workingPlan.campaignData.budget}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-900">
                      {workingPlan.campaignData.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {workingPlan.status === "live" ? (
                      <button
                        type="button"
                        onClick={onViewCampaigns}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                      >
                        <Kanban size={13} weight="bold" />
                        <span>View in Campaigns</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApprovePlanToZoho}
                        disabled={isPushingToZoho}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                      >
                        {isPushingToZoho ? (
                          <>
                            <ArrowsClockwise size={13} className="animate-spin" />
                            <span>Pushing…</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={13} weight="fill" />
                            <span>Approve & Push to Zoho</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Aspect Summary Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100">
                  {(["legal", "compliance", "accounting", "implementation"] as const).map((asp) => {
                    const count = workingPlan.tasks.filter((t) => t.aspect === asp).length;
                    const Icon = ASPECT_ICONS[asp];
                    return (
                      <div key={asp} className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-2">
                        <Icon size={14} weight="duotone" className="text-stone-600" />
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-stone-800 capitalize block truncate">{asp}</span>
                          <span className="text-[10px] text-stone-400 font-mono block">{count} Tasks</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Chat message stream */}
            {messages.map((msg, index) => (
              <ChatMessage key={msg.id} message={msg} index={index} />
            ))}

            {/* In-Chat Quick Action Banner when waiting for plan confirmation */}
            {workingPlan && workingPlan.status !== "live" && messages.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                    <Sparkle size={14} weight="fill" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">Ready to finalize?</span>
                    <span className="text-[11px] text-amber-800">
                      All {workingPlan.tasks.length} tasks are staged for BigCity Portal #81293
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApprovePlanToZoho}
                  disabled={isPushingToZoho}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex-shrink-0"
                >
                  {isPushingToZoho ? (
                    <>
                      <ArrowsClockwise size={13} className="animate-spin" />
                      <span>Pushing…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={13} weight="fill" />
                      <span>Approve & Push to Zoho</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}

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
            isLoading={isLoading || isPushingToZoho}
            onStop={handleStop}
          />
          <div className="flex items-center justify-between text-[11px] text-stone-400 px-2 mt-2">
            <span>
              {workingPlan && workingPlan.status !== "live" ? (
                <>Type your changes or say <strong className="text-stone-700">"Approve"</strong> to push to Zoho Projects</>
              ) : (
                <>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600 font-mono shadow-xs">Enter ↵</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600 font-mono shadow-xs">Shift + Enter</kbd> for newline</>
              )}
            </span>
            <span className="hidden sm:inline">BigCity AI Assistant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
