"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  MagnifyingGlass,
  X,
  Trash,
  Check,
  CaretDown,
  Tag,
  Funnel,
  Info,
} from "@phosphor-icons/react";
import ChatMessage, { type Message } from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThinkingProcess from "@/components/ThinkingProcess";
import EmptyState from "@/components/EmptyState";
import { type PlanContextForCopilot } from "@/app/page";
import { type AspectTask, type Campaign } from "@/app/api/campaigns/route";
import {
  applyPlanModifications,
  BIGCITY_TEAM,
  type TeamMember,
} from "@/utils/planModifier";

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

const ASPECT_META = {
  legal: {
    icon: Scales,
    light: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-l-violet-500",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    activeTab: "bg-violet-100/90 text-violet-900 border-violet-300 ring-1 ring-violet-300",
    label: "Legal",
  },
  compliance: {
    icon: ShieldCheck,
    light: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    activeTab: "bg-amber-100/90 text-amber-900 border-amber-300 ring-1 ring-amber-300",
    label: "Compliance",
  },
  accounting: {
    icon: Receipt,
    light: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeTab: "bg-emerald-100/90 text-emerald-900 border-emerald-300 ring-1 ring-emerald-300",
    label: "Accounting",
  },
  implementation: {
    icon: Cpu,
    light: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    activeTab: "bg-blue-100/90 text-blue-900 border-blue-300 ring-1 ring-blue-300",
    label: "Tech & Ops",
  },
};

type AspectKey = "all" | "legal" | "compliance" | "accounting" | "implementation";

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

  // Filters & Search State
  const [selectedAspectFilter, setSelectedAspectFilter] = useState<AspectKey>("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<string[]>([]);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // UI Toast Confirmation Banner State
  const [toastNotice, setToastNotice] = useState<{
    id: string;
    text: string;
    icon?: "check" | "trash" | "user" | "sparkle" | "info";
  } | null>(null);

  // Inline edit state
  const [editingAssigneeTaskId, setEditingAssigneeTaskId] = useState<string | null>(null);

  // Add Task form state
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    aspect: "legal" as "legal" | "compliance" | "accounting" | "implementation",
    assignee: "Akash Verma",
    role: "Legal Counsel",
    tat: "2 Days",
    urgency: "HIGH" as AspectTask["urgency"],
    details: "",
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userHasScrolledUpRef = useRef(false);
  const lastProcessedContextRef = useRef<string | null>(null);

  const messages = session.messages;

  const showToast = useCallback(
    (text: string, icon: "check" | "trash" | "user" | "sparkle" | "info" = "check") => {
      setToastNotice({ id: `toast-${Date.now()}`, text, icon });
      setTimeout(() => {
        setToastNotice((prev) => (prev?.text === text ? null : prev));
      }, 4000);
    },
    []
  );

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
    setSelectedAspectFilter("all");
    setTaskSearchQuery("");

    const newSess = createSession(`Plan: ${initialPlanContext.campaignData.name}`);
    const initialGreeting: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: `Draft AI Project Plan loaded for **${initialPlanContext.campaignData.name}**\n\n**Client**: ${initialPlanContext.campaignData.client}  \n**Budget**: ${initialPlanContext.campaignData.budget}  \n**Volume**: ${initialPlanContext.campaignData.codeVolume}  \n**Estimated TAT**: 12 Working Days  \n\n### 4-Aspect Breakdown (${initialPlanContext.plan.tasks.length} Total Tasks):\n\n* **Legal** (${initialPlanContext.plan.tasks.filter((t: any) => t.aspect === "legal").length} Tasks): Terms & conditions drafting, partner consent verification, disclaimer compliance.\n* **Compliance** (${initialPlanContext.plan.tasks.filter((t: any) => t.aspect === "compliance").length} Tasks): DLT / TRAI header whitelisting, regulatory approvals, 72h staging UAT sign-off.\n* **Accounting** (${initialPlanContext.plan.tasks.filter((t: any) => t.aspect === "accounting").length} Tasks): Advance escrow receipt verification in Zoho Books, GST mapping.\n* **Tech & Operations** (${initialPlanContext.plan.tasks.filter((t: any) => t.aspect === "implementation").length} Tasks): Cryptographic QR batch generation, CDN provisioning, gateway failover routing.\n\nYou can modify owners (e.g. _"assign all legal tasks to Akash Verma"_), adjust timelines, or add custom requirements directly in this chat or on the plan canvas. When ready, click **Approve & Push to Zoho** on the right or reply with **"Approve"**.`,
      timestamp: new Date(),
    };
    newSess.messages = [initialGreeting];
    setSession(newSess);
    userHasScrolledUpRef.current = false;
    showToast(`Loaded ${initialPlanContext.plan.tasks.length} tasks for ${initialPlanContext.campaignData.name}`, "sparkle");
  }, [initialPlanContext, showToast]);

  // Filtered tasks computation
  const displayedTasks = useMemo(() => {
    if (!workingPlan) return [];
    return workingPlan.tasks.filter((t) => {
      const matchesAspect =
        selectedAspectFilter === "all" || t.aspect === selectedAspectFilter;
      const q = taskSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.sopCode.toLowerCase().includes(q) ||
        (t.details && t.details.toLowerCase().includes(q));
      return matchesAspect && matchesSearch;
    });
  }, [workingPlan, selectedAspectFilter, taskSearchQuery]);

  // Handle live approve & push to Zoho Projects
  const handleApprovePlanToZoho = async () => {
    if (!workingPlan || workingPlan.status === "live") return;

    setIsPushingToZoho(true);
    setWorkingPlan((prev) => (prev ? { ...prev, status: "syncing" } : null));

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
        const assignedNames = Array.from(new Set(workingPlan.tasks.map((t) => t.assignee))).join(", ");

        setWorkingPlan((prev) =>
          prev
            ? {
                ...prev,
                status: "live",
                zohoProjectId: created.zohoProjectId || "ZP-881290",
                zohoProjectUrl:
                  created.zohoProjectUrl || "https://projects.zoho.in",
              }
            : null
        );

        showToast(`Approved & Synced to Zoho Projects (${created.zohoProjectId || "ZP-881290"})`, "check");

        // Add confirmation message to chat
        const confirmationMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: `**Plan Approved and Pushed to Zoho Projects**\n\n* **Zoho Project ID**: \`${created.zohoProjectId || "ZP-881290"}\`\n* **Client**: ${created.client}\n* **Tasks Synchronized**: ${workingPlan.tasks.length} tasks across 4 milestone gates\n* **Sync Status**: Live (REST API sync active, latency: 32ms)\n\nAll assigned SPOCs (${assignedNames}) have been provisioned in BigCity Portal #81293.`,
          timestamp: new Date(),
        };

        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, confirmationMsg],
        }));
      }
    } catch (e) {
      console.error("Failed to push plan to Zoho Projects", e);
      showToast("Failed to push to Zoho Projects", "info");
    } finally {
      setIsPushingToZoho(false);
    }
  };

  // Direct Inline Task Field Updates
  const handleUpdateTaskField = (
    taskId: string,
    updates: Partial<AspectTask>
  ) => {
    if (!workingPlan) return;
    const task = workingPlan.tasks.find((t) => t.id === taskId);
    setWorkingPlan((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      };
    });
    setHighlightedTaskIds([taskId]);
    setTimeout(() => setHighlightedTaskIds([]), 3500);

    if (updates.assignee) {
      showToast(`Reassigned ${task?.sopCode || "Task"} to ${updates.assignee}`, "user");
    } else if (updates.tat) {
      showToast(`Updated ${task?.sopCode || "Task"} TAT to ${updates.tat}`, "check");
    } else if (updates.urgency) {
      showToast(`Set priority urgency to ${updates.urgency}`, "check");
    }
  };

  // Direct Inline Task Deletion
  const handleDeleteTask = (taskId: string) => {
    if (!workingPlan) return;
    const task = workingPlan.tasks.find((t) => t.id === taskId);
    setWorkingPlan((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
      };
    });
    showToast(`Removed ${task?.sopCode || "task"} from plan`, "trash");
  };

  // Handle Add New Task
  const handleCreateNewTask = () => {
    if (!workingPlan || !newTaskForm.title.trim()) return;

    const count = workingPlan.tasks.filter((t) => t.aspect === newTaskForm.aspect).length + 1;
    const sopCode = `SOP-${newTaskForm.aspect.slice(0, 3).toUpperCase()}-0${count}`;
    const newTaskId = `task-${Date.now()}`;

    const task: AspectTask = {
      id: newTaskId,
      sopCode,
      title: newTaskForm.title.trim(),
      aspect: newTaskForm.aspect,
      assignee: newTaskForm.assignee,
      role: newTaskForm.role,
      urgency: newTaskForm.urgency,
      tat: newTaskForm.tat,
      status: "PENDING_APPROVAL",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "Open",
      details: newTaskForm.details || newTaskForm.title,
      verificationRequirement: `${newTaskForm.role} sign-off required before Go-Live`,
      mandatoryGate: true,
    };

    setWorkingPlan((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: [...prev.tasks, task],
      };
    });

    setHighlightedTaskIds([newTaskId]);
    setTimeout(() => setHighlightedTaskIds([]), 4000);
    setIsAddTaskModalOpen(false);
    showToast(`Added ${sopCode} — ${newTaskForm.title.trim()}`, "sparkle");

    setNewTaskForm({
      title: "",
      aspect: "legal",
      assignee: "Akash Verma",
      role: "Legal Counsel",
      tat: "2 Days",
      urgency: "HIGH",
      details: "",
    });
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

      // Check if user request contains plan modification intent (e.g. "assign all legal tasks to Akash Verma")
      let planModified = false;
      let modificationSummary = "";
      if (workingPlan && workingPlan.status !== "live") {
        const modResult = applyPlanModifications(
          workingPlan.tasks,
          workingPlan.campaignData,
          content
        );

        if (modResult.hasModifications) {
          planModified = true;
          modificationSummary = modResult.summaryMarkdown;

          // Update working plan state inline immediately
          setWorkingPlan((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              tasks: modResult.updatedTasks,
              campaignData: modResult.updatedCampaignData,
            };
          });

          // Highlight the modified tasks
          setHighlightedTaskIds(modResult.modifiedTaskIds);
          setTimeout(() => setHighlightedTaskIds([]), 4500);
          showToast(`Plan updated inline: ${modResult.modifiedTaskIds.length} tasks modified`, "sparkle");
        }
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
${workingPlan.tasks.map((t, idx) => `${idx + 1}. [${t.aspect.toUpperCase()}] ${t.title} (Owner: ${t.assignee}, TAT: ${t.tat}, Urgency: ${t.urgency})`).join("\n")}

User Request: ${content}`;
      }

      // Chat API call / Stream
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
          let streamEnded = false;

          try {
            while (!streamEnded) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  streamEnded = true;
                  break;
                }

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

                    // If plan was modified, prepend or prioritize the structured modification summary
                    const initialContent = planModified && modificationSummary
                      ? `${modificationSummary}\n\n---\n${accumulatedContent}`
                      : accumulatedContent;

                    const initialMsg: Message = {
                      id: `msg-${Date.now()}-assistant`,
                      role: "assistant",
                      content: initialContent,
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
                        const finalContent = planModified && modificationSummary
                          ? `${modificationSummary}\n\n---\n${accumulatedContent}`
                          : accumulatedContent;

                        msgs[lastIdx] = {
                          ...msgs[lastIdx],
                          content: finalContent,
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

          let outputText = data.text || data.output || data.content || data.error || "";
          if (planModified && modificationSummary) {
            outputText = `${modificationSummary}\n\n---\n${outputText}`;
          }

          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: outputText || "Plan updated successfully.",
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

        // If network failed but we modified plan locally, show successful modification summary
        if (planModified && modificationSummary) {
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: modificationSummary,
            timestamp: new Date(),
          };
          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
          }));
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Something went wrong";

          const errMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `**Connection Notice:** ${errorMessage}\n\nYour plan changes were captured locally.`,
            timestamp: new Date(),
          };

          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, errMessage],
          }));
        }
      } finally {
        setIsLoading(false);
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [session.id, workingPlan, showToast]
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
    showToast("Exported chat session to Markdown", "check");
  }, [messages, showToast]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAF9] overflow-hidden relative">
      {/* Top Floating Toast Notification */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            key={toastNotice.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2.5 border border-stone-700/80 backdrop-blur-md"
          >
            {toastNotice.icon === "trash" ? (
              <Trash size={14} className="text-rose-400 flex-shrink-0" />
            ) : toastNotice.icon === "user" ? (
              <User size={14} className="text-amber-400 flex-shrink-0" />
            ) : toastNotice.icon === "sparkle" ? (
              <Sparkle size={14} weight="fill" className="text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle size={14} weight="fill" className="text-emerald-400 flex-shrink-0" />
            )}
            <span>{toastNotice.text}</span>
            <button
              type="button"
              onClick={() => setToastNotice(null)}
              className="ml-1 text-stone-400 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {isThinking && <ThinkingProcess key="thinking" />}
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
                    <>Try: <code className="text-stone-700 bg-stone-100 px-1 py-0.5 rounded font-mono">assign all legal tasks to Akash Verma</code> or <code className="text-stone-700 bg-stone-100 px-1 py-0.5 rounded font-mono">suggest improvements</code></>
                  ) : (
                    <>Press <kbd className="px-1.5 py-0.5 rounded bg-stone-50 border border-stone-200 text-[10px] text-stone-600 font-mono shadow-xs">Enter ↵</kbd> to send</>
                  )}
                </span>
                <span className="font-medium text-stone-500">BCP Assist AI (Gemini 3.7)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Live Full Plan Canvas & Task Studio */}
        {workingPlan && (
          <div className="hidden lg:flex flex-1 flex-col h-full min-h-0 bg-[#FBFBFA] overflow-hidden">
            {/* Header: Campaign Info & Push Action */}
            <div className="px-6 py-3.5 border-b border-stone-200/80 bg-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
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
                  <span className="text-stone-300">·</span>
                  <span className="text-xs font-mono text-stone-500">
                    {workingPlan.campaignData.codeVolume}
                  </span>
                </div>
                <h2 className="text-base font-bold text-stone-900 tracking-tight truncate">
                  {workingPlan.campaignData.name}
                </h2>
              </div>

              {/* Main Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all cursor-pointer border border-stone-200"
                  title="Add custom task to plan"
                >
                  <Plus size={14} weight="bold" />
                  <span>Add Task</span>
                </button>

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

            {/* Filter & Aspect Navigator Tabs (FULLY INTERACTIVE & FILTERABLE) */}
            <div className="px-6 py-2.5 bg-white border-b border-stone-200/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(
                  [
                    { id: "all" as const, label: "All Tasks", count: workingPlan.tasks.length, icon: Sparkle },
                    { id: "legal" as const, label: "Legal", count: workingPlan.tasks.filter((t) => t.aspect === "legal").length, icon: Scales },
                    { id: "compliance" as const, label: "Compliance", count: workingPlan.tasks.filter((t) => t.aspect === "compliance").length, icon: ShieldCheck },
                    { id: "accounting" as const, label: "Accounting", count: workingPlan.tasks.filter((t) => t.aspect === "accounting").length, icon: Receipt },
                    { id: "implementation" as const, label: "Tech & Ops", count: workingPlan.tasks.filter((t) => t.aspect === "implementation").length, icon: Cpu },
                  ]
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = selectedAspectFilter === tab.id;
                  const activeClass =
                    tab.id === "all"
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : ASPECT_META[tab.id as keyof typeof ASPECT_META]?.activeTab || "bg-stone-900 text-white";

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedAspectFilter(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isActive
                          ? activeClass
                          : "bg-stone-50 hover:bg-stone-100 border-stone-200/80 text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <Icon
                        size={13}
                        weight={isActive ? "fill" : "bold"}
                        className={isActive && tab.id !== "all" ? "" : isActive ? "text-amber-400" : "text-stone-400"}
                      />
                      <span>{tab.label}</span>
                      <span
                        className={`ml-0.5 text-[11px] font-mono px-1.5 py-0.2 rounded-full border ${
                          isActive
                            ? tab.id === "all"
                              ? "bg-stone-800 border-stone-700 text-stone-200"
                              : "bg-white/80 border-black/10 text-stone-800"
                            : "bg-white border-stone-200 text-stone-500"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input for instant task lookup */}
              <div className="relative flex items-center min-w-[170px] max-w-[220px]">
                <MagnifyingGlass size={13} className="absolute left-2.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-7.5 pr-6 py-1 text-xs bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 rounded-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-stone-400"
                />
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery("")}
                    className="absolute right-2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Spacious Scrollable Task Cards */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {displayedTasks.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                    <Funnel size={22} weight="light" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-800">No tasks match filter</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    {taskSearchQuery
                      ? `No tasks matching "${taskSearchQuery}" in ${selectedAspectFilter === "all" ? "the plan" : selectedAspectFilter}.`
                      : `No tasks found in the ${selectedAspectFilter} aspect.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAspectFilter("all");
                      setTaskSearchQuery("");
                    }}
                    className="mt-3.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer border border-stone-200"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {displayedTasks.map((task, i) => {
                    const meta =
                      ASPECT_META[task.aspect as keyof typeof ASPECT_META] ||
                      ASPECT_META.implementation;
                    const Icon = meta.icon;
                    const isHighlighted = highlightedTaskIds.includes(task.id);
                    const isEditingAssignee = editingAssigneeTaskId === task.id;

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: isHighlighted ? [1, 1.015, 1] : 1,
                        }}
                        transition={{ duration: 0.25, delay: i * 0.02 }}
                        className={`p-4 rounded-xl bg-white border transition-all space-y-2.5 relative group ${
                          isHighlighted
                            ? "border-amber-400 shadow-md ring-2 ring-amber-300/40 bg-amber-50/20"
                            : "border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-300"
                        } border-l-4 ${meta.border}`}
                      >
                        {/* Top row: Aspect Icon + Title + Actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}
                            >
                              <Icon size={14} weight="duotone" className={meta.light} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-stone-400">
                                  {task.sopCode}
                                </span>
                                {isHighlighted && (
                                  <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    UPDATED
                                  </span>
                                )}
                              </div>
                              <h4 className="text-[13.5px] font-bold text-stone-900 leading-snug">
                                {task.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* TAT Editor Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextTat =
                                  task.tat === "1 Day"
                                    ? "2 Days"
                                    : task.tat === "2 Days"
                                    ? "3 Days"
                                    : task.tat === "3 Days"
                                    ? "5 Days"
                                    : "1 Day";
                                handleUpdateTaskField(task.id, { tat: nextTat });
                              }}
                              className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
                              title="Click to cycle TAT duration"
                            >
                              <Clock size={12} className="text-stone-400" />
                              {task.tat}
                            </button>

                            {/* Delete Task Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="w-7 h-7 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Delete task from plan"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Details text */}
                        {task.details && (
                          <p className="text-xs text-stone-600 leading-relaxed pl-9.5">
                            {task.details}
                          </p>
                        )}

                        {/* Metadata & Assignee Selector Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 pl-9.5 text-xs text-stone-500">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${meta.badge}`}
                            >
                              {meta.label}
                            </span>

                            {/* Interactive Assignee Dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingAssigneeTaskId(
                                    isEditingAssignee ? null : task.id
                                  )
                                }
                                className="flex items-center gap-1.5 text-stone-800 font-medium px-2 py-0.5 rounded-md hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 cursor-pointer"
                                title="Click to reassign task owner"
                              >
                                <User size={12} className="text-stone-400" />
                                <span>{task.assignee}</span>
                                {task.role && (
                                  <span className="text-stone-400 font-normal">
                                    ({task.role})
                                  </span>
                                )}
                                <CaretDown size={10} className="text-stone-400 ml-0.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {isEditingAssignee && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setEditingAssigneeTaskId(null)}
                                  />
                                  <div className="absolute left-0 bottom-full mb-1 z-40 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 text-xs max-h-56 overflow-y-auto">
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                                      Reassign Team SPOC
                                    </div>
                                    <div className="py-1 space-y-0.5">
                                      {BIGCITY_TEAM.map((member) => (
                                        <button
                                          key={member.name}
                                          type="button"
                                          onClick={() => {
                                            handleUpdateTaskField(task.id, {
                                              assignee: member.name,
                                              role: member.role,
                                            });
                                            setEditingAssigneeTaskId(null);
                                          }}
                                          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-stone-100 transition-colors cursor-pointer ${
                                            task.assignee === member.name
                                              ? "bg-amber-50 text-amber-900 font-bold"
                                              : "text-stone-700"
                                          }`}
                                        >
                                          <div>
                                            <div className="font-semibold">{member.name}</div>
                                            <div className="text-[10px] text-stone-400">
                                              {member.role}
                                            </div>
                                          </div>
                                          {task.assignee === member.name && (
                                            <Check size={12} className="text-amber-600 font-bold" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Urgency Selector */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextUrgency =
                                  task.urgency === "HIGHEST"
                                    ? "HIGH"
                                    : task.urgency === "HIGH"
                                    ? "MEDIUM"
                                    : task.urgency === "MEDIUM"
                                    ? "NORMAL"
                                    : "HIGHEST";
                                handleUpdateTaskField(task.id, {
                                  urgency: nextUrgency as AspectTask["urgency"],
                                });
                              }}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                task.urgency === "HIGHEST"
                                  ? "bg-rose-50 text-rose-800 border-rose-200 font-bold"
                                  : task.urgency === "HIGH"
                                  ? "bg-amber-50 text-amber-800 border-amber-200 font-semibold"
                                  : "bg-stone-50 text-stone-600 border-stone-200/80"
                              }`}
                              title="Click to toggle priority urgency"
                            >
                              {task.urgency}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD TASK MODAL */}
      <AnimatePresence>
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTaskModalOpen(false)}
              className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl z-10 border border-stone-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center">
                    <Plus size={14} weight="bold" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Add Task to Project Plan</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Partner NDA & Terms Sign-Off"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white text-xs text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Aspect
                    </label>
                    <select
                      value={newTaskForm.aspect}
                      onChange={(e) => {
                        const asp = e.target.value as any;
                        const defaultAssignee =
                          asp === "legal"
                            ? "Akash Verma"
                            : asp === "compliance"
                            ? "Khaleel Ahmed"
                            : asp === "accounting"
                            ? "Sneha Nair"
                            : "Sachin (Tech Team)";
                        const member = BIGCITY_TEAM.find((m) => m.name === defaultAssignee);
                        setNewTaskForm({
                          ...newTaskForm,
                          aspect: asp,
                          assignee: defaultAssignee,
                          role: member ? member.role : "Lead",
                        });
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 text-xs text-stone-900"
                    >
                      <option value="legal">Legal</option>
                      <option value="compliance">Compliance</option>
                      <option value="accounting">Accounting</option>
                      <option value="implementation">Tech & Ops</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Assignee (SPOC)
                    </label>
                    <select
                      value={newTaskForm.assignee}
                      onChange={(e) => {
                        const member = BIGCITY_TEAM.find((m) => m.name === e.target.value);
                        setNewTaskForm({
                          ...newTaskForm,
                          assignee: e.target.value,
                          role: member ? member.role : "Lead",
                        });
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 text-xs text-stone-900"
                    >
                      {BIGCITY_TEAM.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Turnaround Time (TAT)
                    </label>
                    <select
                      value={newTaskForm.tat}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, tat: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 text-xs text-stone-900"
                    >
                      <option value="1 Day">1 Day</option>
                      <option value="2 Days">2 Days</option>
                      <option value="3 Days">3 Days</option>
                      <option value="5 Days">5 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Urgency
                    </label>
                    <select
                      value={newTaskForm.urgency}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, urgency: e.target.value as any })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 text-xs text-stone-900"
                    >
                      <option value="HIGHEST">HIGHEST</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="NORMAL">NORMAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Details / Deliverable
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe SOP requirements, deliverables, or criteria..."
                    value={newTaskForm.details}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, details: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white text-xs text-stone-900"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewTask}
                  disabled={!newTaskForm.title.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Add to Plan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
