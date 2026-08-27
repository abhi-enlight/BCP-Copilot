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
      content: `Draft AI Project Plan loaded for **${initialPlanContext.campaignData.name}**\n\n**Client**: ${initialPlanContext.campaignData.client}  \n**Budget**: ${initialPlanContext.campaignData.budget}  \n**Volume**: ${initialPlanContext.campaignData.codeVolume}  \n**Estimated TAT**: 12 Working Days  \n\n### 4-Aspect Breakdown (${initialPlanContext.plan.tasks.length} Total Tasks):\n\n* **Legal** (3 Tasks): Terms & conditions drafting, partner consent verification, disclaimer compliance.\n* **Compliance** (3 Tasks): DLT / TRAI header whitelisting, regulatory approvals, 72h staging UAT sign-off.\n* **Accounting** (3 Tasks): Advance escrow receipt verification in Zoho Books, GST mapping.\n* **Tech & Operations** (4 Tasks): Cryptographic QR batch generation, CDN provisioning, gateway failover routing.\n\nYou can modify owners, adjust timelines, or add custom requirements directly in this chat. When ready, click **Approve & Push to Zoho** on the right or reply with **"Approve"**.`,
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
          content: `**Plan Approved and Pushed to Zoho Projects**\n\n* **Zoho Project ID**: \`${created.zohoProjectId || "ZP-881290"}\`\n* **Client**: ${created.client}\n* **Tasks Synchronized**: ${workingPlan.tasks.length} tasks across 4 milestone gates\n* **Sync Status**: Live (REST API sync active, latency: 32ms)\n\nAll assigned SPOCs (Legal, Compliance, Escrow, Tech) have been provisioned in BigCity Portal #81293.`,
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

      // Check if user is asking to modify, add, or adjust specific plan tasks
      const lower = content.toLowerCase();
      const isModificationIntent =
        workingPlan &&
        workingPlan.status !== "live" &&
        (lower.includes("add") ||
          lower.includes("remove") ||
          lower.includes("delete") ||
          lower.includes("change") ||
          lower.includes("update") ||
          lower.includes("reassign") ||
          lower.includes("set") ||
          lower.includes("tat") ||
          lower.includes("deadline") ||
          lower.includes("gateway") ||
          lower.includes("escrow") ||
          lower.includes("uat") ||
          lower.includes("razorpay") ||
          lower.includes("paytm") ||
          lower.includes("nda") ||
          lower.includes("legal") ||
          lower.includes("compliance") ||
          lower.includes("accounting") ||
          lower.includes("tech"));

      if (isModificationIntent && workingPlan) {
        let modifiedAspect: "legal" | "compliance" | "accounting" | "implementation" = "implementation";
        if (lower.includes("legal") || lower.includes("t&c") || lower.includes("consent") || lower.includes("nda") || lower.includes("agreement") || lower.includes("contract")) {
          modifiedAspect = "legal";
        } else if (lower.includes("compliance") || lower.includes("dlt") || lower.includes("trai") || lower.includes("audit") || lower.includes("regulation") || lower.includes("vat")) {
          modifiedAspect = "compliance";
        } else if (lower.includes("budget") || lower.includes("accounting") || lower.includes("finance") || lower.includes("escrow") || lower.includes("invoice") || lower.includes("payment")) {
          modifiedAspect = "accounting";
        }

        const defaultAssignee =
          modifiedAspect === "legal"
            ? "Prashant Mittal (Legal Head)"
            : modifiedAspect === "compliance"
            ? "Compliance SPOC"
            : modifiedAspect === "accounting"
            ? "CS Finance Lead"
            : "Sachin (Tech Team)";

        // Extract a clean title
        let cleanTitle = content
          .replace(/^(please |can you |kindly |add |update |modify |change )+/i, "")
          .trim();
        if (cleanTitle.length > 55) {
          cleanTitle = cleanTitle.slice(0, 55) + "…";
        }
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

        const newTask: AspectTask = {
          id: `task-${Date.now()}`,
          sopCode: `SOP-${modifiedAspect.slice(0, 3).toUpperCase()}-0${workingPlan.tasks.length + 1}`,
          title: cleanTitle,
          aspect: modifiedAspect,
          assignee: defaultAssignee,
          role: modifiedAspect === "legal" ? "Legal Head" : modifiedAspect === "accounting" ? "Finance Lead" : "Tech Lead",
          urgency: lower.includes("urgent") || lower.includes("critical") ? "HIGHEST" : "HIGH",
          tat: lower.includes("24h") || lower.includes("1 day") ? "1 Day" : lower.includes("3 day") ? "3 Days" : "2 Days",
          status: "PENDING_APPROVAL",
          details: content,
          verificationRequirement: "SPOC sign-off before campaign activation",
          mandatoryGate: false,
        };

        setWorkingPlan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: [...prev.tasks, newTask],
            lastUpdatedAspect: modifiedAspect,
          };
        });
      }

      // Format prompt with context if working on a plan
      let promptToSend = content;
      if (workingPlan && workingPlan.status !== "live") {
        promptToSend = `[Active Working Campaign Context]
Campaign: ${workingPlan.campaignData.name}
Client: ${workingPlan.campaignData.client}
Budget: ${workingPlan.campaignData.budget}
Volume: ${workingPlan.campaignData.codeVolume}
Current Tasks (${workingPlan.tasks.length}):
${workingPlan.tasks.map((t, idx) => `${idx + 1}. [${t.aspect.toUpperCase()}] ${t.title} (Owner: ${t.assignee}, TAT: ${t.tat})`).join("\n")}

User Request: ${content}`;
      }

      // Standard Copilot Chat API call to live n8n AI Agent
      setIsLoading(true);
      setIsThinking(true);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptToSend,
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

          let accumulatedContent = "";
          let firstChunkReceived = false;
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") break;

                let token = "";
                try {
                  const parsed = JSON.parse(data);
                  token = parsed.text || parsed.content || parsed.output || "";
                } catch {
                  token = data;
                }

                if (token) {
                  accumulatedContent += token;

                  if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    setIsThinking(false);
                    const initialMsg: Message = {
                      id: `msg-${Date.now()}-assistant`,
                      role: "assistant",
                      content: accumulatedContent,
                      timestamp: new Date(),
                    };
                    setSession((prev) => ({
                      ...prev,
                      messages: [...prev.messages, initialMsg],
                    }));
                  } else {
                    setSession((prev) => {
                      const msgs = [...prev.messages];
                      const lastIdx = msgs.length - 1;
                      if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
                        msgs[lastIdx] = {
                          ...msgs[lastIdx],
                          content: accumulatedContent,
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
          } finally {
            setIsThinking(false);
            setIsLoading(false);
          }
        } else {
          const data = await response.json();
          setIsThinking(false);
          setIsLoading(false);
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: data.text || data.output || data.content || data.error || "No response from BCP Assist.",
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
          <h1 className="text-[15px] font-bold text-stone-900 tracking-tight">
            {workingPlan ? "Plan Copilot Studio" : "AI Copilot"}
          </h1>
          {workingPlan ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkle size={12} weight="fill" className="text-amber-500" />
              Editing: {workingPlan.campaignData.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hidden sm:flex">
              {session.messages.length > 0 ? deriveTitle(session.messages) : "Ready"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {workingPlan && (
            <button
              onClick={() => {
                if (onClearPlanContext) onClearPlanContext();
                setWorkingPlan(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 shadow-xs text-xs font-semibold cursor-pointer"
            >
              <span>Close Plan View</span>
            </button>
          )}

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

      {/* Workspace Area: Split-Pane when working on a plan, Full width for normal chat */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANE: Chat & Modification Prompt Stream */}
        <div
          className={`flex flex-col h-full min-h-0 transition-all duration-300 ${
            workingPlan ? "w-full lg:w-[48%] border-r border-stone-200 bg-[#FAFAF9]" : "w-full"
          }`}
        >
          {/* Scrollable messages */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-5 flex flex-col items-center scroll-smooth space-y-4"
          >
            {messages.length === 0 ? (
              <EmptyState onSelectPrompt={sendMessage} />
            ) : (
              <div className="w-full max-w-2xl space-y-4">
                {/* Chat message stream */}
                {messages.map((msg, index) => (
                  <ChatMessage key={msg.id} message={msg} index={index} />
                ))}

                {/* Live Thinking Stepper */}
                <AnimatePresence>
                  {isThinking && <ThinkingProcess />}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3.5 bg-white border-t border-stone-200/80 flex-shrink-0 shadow-xs">
            <div className="max-w-2xl mx-auto">
              <ChatInput
                onSendMessage={sendMessage}
                isLoading={isLoading || isPushingToZoho}
                onStop={handleStop}
              />
              <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 mt-2">
                <span>
                  {workingPlan && workingPlan.status !== "live" ? (
                    <>Type your edits to update the live plan on the right</>
                  ) : (
                    <>Press <kbd className="px-1.5 py-0.5 rounded bg-stone-50 border border-stone-200 text-[10px] text-stone-600 font-mono shadow-xs">Enter ↵</kbd> to send</>
                  )}
                </span>
                <span className="font-medium text-stone-500">BCP Assist AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Live Full Plan View */}
        {workingPlan && (
          <div className="hidden lg:flex flex-1 flex-col h-full min-h-0 bg-[#FBFBFA] overflow-hidden">
            {/* Header: Clean, airy & focused */}
            <div className="px-6 py-4 border-b border-stone-200/80 bg-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                      workingPlan.status === "live"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    <Kanban size={13} weight="fill" />
                    {workingPlan.status === "live" ? `LIVE · ${workingPlan.zohoProjectId}` : "PLAN PREVIEW"}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    {workingPlan.campaignData.client}
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs font-mono text-stone-500">
                    {workingPlan.campaignData.budget}
                  </span>
                </div>
                <h2 className="text-base font-bold text-stone-900 tracking-tight truncate">
                  {workingPlan.campaignData.name}
                </h2>
              </div>

              {/* Main Approve Action */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {workingPlan.status === "live" ? (
                  <button
                    type="button"
                    onClick={onViewCampaigns}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <Kanban size={14} weight="bold" />
                    <span>View in Campaigns</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApprovePlanToZoho}
                    disabled={isPushingToZoho}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-98"
                  >
                    {isPushingToZoho ? (
                      <>
                        <ArrowsClockwise size={15} className="animate-spin" />
                        <span>Pushing to Zoho…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={15} weight="fill" />
                        <span>Approve & Push to Zoho</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Aspect Navigator Tabs (Subtle & clean) */}
            <div className="px-6 py-3 bg-white border-b border-stone-200/60 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: "all", label: "All Tasks", count: workingPlan.tasks.length, icon: Sparkle },
                    { id: "legal", label: "Legal", count: workingPlan.tasks.filter((t) => t.aspect === "legal").length, icon: Scales },
                    { id: "compliance", label: "Compliance", count: workingPlan.tasks.filter((t) => t.aspect === "compliance").length, icon: ShieldCheck },
                    { id: "accounting", label: "Accounting", count: workingPlan.tasks.filter((t) => t.aspect === "accounting").length, icon: Receipt },
                    { id: "implementation", label: "Tech & Ops", count: workingPlan.tasks.filter((t) => t.aspect === "implementation").length, icon: Cpu },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <div
                      key={tab.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-50 border border-stone-200/70 text-stone-700"
                    >
                      <Icon size={13} weight="bold" className="text-stone-500" />
                      <span>{tab.label}</span>
                      <span className="ml-0.5 text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white border border-stone-200 text-stone-600">
                        {tab.count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <span className="text-[11px] font-mono text-stone-400 whitespace-nowrap hidden xl:inline">
                Est. TAT: 12 Working Days
              </span>
            </div>

            {/* Spacious Scrollable Task Cards */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              <AnimatePresence>
                {workingPlan.tasks.map((task, i) => {
                  const meta = {
                    legal: {
                      icon: Scales,
                      light: "text-violet-700",
                      bg: "bg-violet-50",
                      border: "border-l-violet-500",
                      badge: "bg-violet-50 text-violet-700 border-violet-200",
                      label: "Legal",
                    },
                    compliance: {
                      icon: ShieldCheck,
                      light: "text-amber-700",
                      bg: "bg-amber-50",
                      border: "border-l-amber-500",
                      badge: "bg-amber-50 text-amber-700 border-amber-200",
                      label: "Compliance",
                    },
                    accounting: {
                      icon: Receipt,
                      light: "text-emerald-700",
                      bg: "bg-emerald-50",
                      border: "border-l-emerald-500",
                      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      label: "Accounting",
                    },
                    implementation: {
                      icon: Cpu,
                      light: "text-blue-700",
                      bg: "bg-blue-50",
                      border: "border-l-blue-500",
                      badge: "bg-blue-50 text-blue-700 border-blue-200",
                      label: "Tech & Ops",
                    },
                  }[task.aspect as "legal" | "compliance" | "accounting" | "implementation"] || {
                    icon: Cpu,
                    light: "text-stone-700",
                    bg: "bg-stone-50",
                    border: "border-l-stone-400",
                    badge: "bg-stone-50 text-stone-700 border-stone-200",
                    label: task.aspect,
                  };

                  const Icon = meta.icon;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.025 }}
                      className={`p-4 rounded-xl bg-white border border-stone-200/90 border-l-4 ${meta.border} shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all space-y-2.5`}
                    >
                      {/* Top row: Title + TAT Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                            <Icon size={14} weight="duotone" className={meta.light} />
                          </div>
                          <h4 className="text-[13.5px] font-bold text-stone-900 leading-snug">
                            {task.title}
                          </h4>
                        </div>

                        <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-stone-100/80 text-stone-600 flex items-center gap-1.5 flex-shrink-0">
                          <Clock size={12} className="text-stone-400" />
                          {task.tat}
                        </span>
                      </div>

                      {/* Details text (Readable & spacious) */}
                      {task.details && (
                        <p className="text-xs text-stone-600 leading-relaxed pl-9.5">
                          {task.details}
                        </p>
                      )}

                      {/* Metadata bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 pl-9.5 text-xs text-stone-500">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="flex items-center gap-1.5 text-stone-700 font-medium">
                            <User size={12} className="text-stone-400" />
                            {task.assignee}
                            {task.role ? <span className="text-stone-400 font-normal">({task.role})</span> : ""}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-50 text-stone-500 border border-stone-200/60">
                          {task.urgency}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
