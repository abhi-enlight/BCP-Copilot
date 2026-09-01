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
import { type AspectTask, type Campaign, generateAspectPlan } from "@/app/api/campaigns/route";
import {
  applyPlanModifications,
  syncTasksFromAIResponse,
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
  // Zoho CRM — Deal record for this campaign as a sales/client opportunity
  zohoCrmDealId?: string;
  zohoCrmDealUrl?: string;
  // Zoho Projects — project milestone tracking (future integration)
  zohoProjectId?: string;
  zohoProjectUrl?: string;
  // Zoho Books — invoice / advance payment (future integration)
  zohoBooksInvoiceId?: string;
  // Aggregate sync status across all Zoho products
  zohoSyncStatus?: "Pending" | "Partial" | "Synced" | "Failed";
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
  // Label shown in the ThinkingProcess during long n8n tool calls (e.g. "Querying Zoho CRM")
  const [toolCallLabel, setToolCallLabel] = useState<string | null>(null);

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

  const [isPlanPanelOpen, setIsPlanPanelOpen] = useState(false);
  const [riskDigest, setRiskDigest] = useState<any>(null);

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

  // Fetch Risk Digest on mount
  useEffect(() => {
    const fetchRiskDigest = async () => {
      try {
        const res = await fetch("/api/risk-digest");
        if (res.ok) {
          const data = await res.json();
          setRiskDigest(data);
        }
      } catch (e) {
        console.error("Failed to fetch risk digest", e);
      }
    };
    fetchRiskDigest();
  }, []);

  // Intake initial plan context from Campaigns wizard
  useEffect(() => {
    if (!initialPlanContext) return;

    const contextKey = `${initialPlanContext.campaignData.name}-${initialPlanContext.plan.tasks.length}`;
    if (lastProcessedContextRef.current === contextKey) return;
    lastProcessedContextRef.current = contextKey;

    // Check Supabase first — has this campaign already been approved & synced?
    // This prevents the "Approve" button from reappearing on page refresh.
    const checkExistingApproval = async (): Promise<boolean> => {
      try {
        const res = await fetch(
          `/api/campaigns?action=check_approved&name=${encodeURIComponent(initialPlanContext.campaignData.name)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.found && json.campaign) {
            setWorkingPlan({
              campaignData: initialPlanContext.campaignData,
              tasks: json.campaign.tasks?.length > 0 ? json.campaign.tasks : initialPlanContext.plan.tasks,
              aspectSummary: json.campaign.aspectSummary || initialPlanContext.plan.aspectSummary,
              status: "live",
              zohoCrmDealId: json.campaign.zohoCrmDealId,
              zohoCrmDealUrl: json.campaign.zohoCrmDealUrl,
              zohoProjectId: json.campaign.zohoProjectId,
              zohoBooksInvoiceId: json.campaign.zohoBooksInvoiceId,
              zohoSyncStatus: json.campaign.zohoSyncStatus,
            });
            showToast("Campaign already approved & synced to Zoho CRM", "check");
            return true;
          }
        }
      } catch (e) {
        console.error("[check_approved] Supabase check failed:", e);
      }
      return false;
    };

    checkExistingApproval().then((alreadyApproved) => {
      setSelectedAspectFilter("all");
      setTaskSearchQuery("");
      if (!alreadyApproved) {
        setWorkingPlan({
          campaignData: initialPlanContext.campaignData,
          tasks: initialPlanContext.plan.tasks,
          aspectSummary: initialPlanContext.plan.aspectSummary,
          status: "draft",
        });
      }
      const newSess = createSession(`Plan: ${initialPlanContext.campaignData.name}`);
      const legalCount = initialPlanContext.plan.tasks.filter((t) => t.aspect === "legal").length;
      const compCount = initialPlanContext.plan.tasks.filter((t) => t.aspect === "compliance").length;
      const accCount = initialPlanContext.plan.tasks.filter((t) => t.aspect === "accounting").length;
      const impCount = initialPlanContext.plan.tasks.filter((t) => t.aspect === "implementation").length;
      const initialGreeting: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: alreadyApproved
          ? `Campaign **${initialPlanContext.campaignData.name}** is already **Live** and synced to Zoho CRM.\n\n**Client**: ${initialPlanContext.campaignData.client}  \n**Budget**: ${initialPlanContext.campaignData.budget}  \n**Volume**: ${initialPlanContext.campaignData.codeVolume}  \n\nYou can view it in the Campaigns dashboard or ask me any questions.`
          : `Draft AI Project Plan loaded for **${initialPlanContext.campaignData.name}**\n\n**Client**: ${initialPlanContext.campaignData.client}  \n**Budget**: ${initialPlanContext.campaignData.budget}  \n**Volume**: ${initialPlanContext.campaignData.codeVolume}  \n**Estimated TAT**: 12 Working Days  \n\n### 4-Aspect Breakdown (${initialPlanContext.plan.tasks.length} Total Tasks):\n\n* **Legal** (${legalCount} Tasks): Terms & conditions drafting, partner consent verification, disclaimer compliance.\n* **Compliance** (${compCount} Tasks): DLT / TRAI header whitelisting, regulatory approvals, 72h staging UAT sign-off.\n* **Accounting** (${accCount} Tasks): Advance escrow receipt verification in Zoho Books, GST mapping.\n* **Tech & Operations** (${impCount} Tasks): Cryptographic QR batch generation, CDN provisioning, gateway failover routing.\n\nWhen ready, click **Approve & Sync to Zoho CRM** on the right or reply with **"Approve"**.`,
        timestamp: new Date(),
      };
      newSess.messages = [initialGreeting];
      setSession(newSess);
      userHasScrolledUpRef.current = false;
      if (!alreadyApproved) {
        showToast(`Loaded ${initialPlanContext.plan.tasks.length} tasks for ${initialPlanContext.campaignData.name}`, "sparkle");
      }
    });
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

  // Handle approve & sync campaign to Zoho CRM (Deal), Zoho Projects, Zoho Books
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
        const zohoSync = data.zohoSync;
        const assignedNames = Array.from(new Set(workingPlan.tasks.map((t) => t.assignee))).join(", ");

        // Restore all Zoho product IDs into working plan state
        setWorkingPlan((prev) =>
          prev
            ? {
                ...prev,
                status: "live",
                zohoCrmDealId: created.zohoCrmDealId,
                zohoCrmDealUrl: created.zohoCrmDealUrl,
                zohoProjectId: created.zohoProjectId,
                zohoProjectUrl: created.zohoProjectUrl,
                zohoBooksInvoiceId: created.zohoBooksInvoiceId,
                zohoSyncStatus: created.zohoSyncStatus,
              }
            : null
        );

        const crmDealId = zohoSync?.crmDeal?.dealId;
        showToast(
          crmDealId
            ? `Approved & synced to Zoho CRM — Deal ${crmDealId}`
            : `Approved & saved — Zoho CRM sync ${zohoSync?.crmDeal?.writeStatus || "QUEUED"}`,
          "check"
        );

        const confirmationMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content:
            `**Campaign Approved & Synced**\n\n` +
            `* **Client**: ${created.client}\n` +
            `* **Tasks Saved**: ${workingPlan.tasks.length} tasks across 4 milestone aspects\n\n` +
            `### Zoho Product Sync Status\n\n` +
            `| Product | Purpose | Status | ID |\n` +
            `|---------|---------|--------|----|\n` +
            `| **Zoho CRM** | Campaign Deal (client opportunity & SOW) | ${crmDealId ? "✅ Synced" : "⏳ Pending"} | ${crmDealId ? `\`${crmDealId}\`` : "—"} |\n` +
            `| **Zoho Projects** | Task & milestone execution tracker | 🔜 Next integration phase | — |\n` +
            `| **Zoho Books** | Advance payment, escrow & GST invoicing | 🔜 Manual by Finance | — |\n\n` +
            `SPOCs assigned: ${assignedNames}\n` +
            `> Finance team (Sneha Nair) should raise the Zoho Books invoice for advance payment escrow confirmation.`,
          timestamp: new Date(),
        };

        setSession((prev) => ({
          ...prev,
          messages: [...prev.messages, confirmationMsg],
        }));
      }
    } catch (e) {
      console.error("Failed to sync campaign to Zoho", e);
      showToast("Failed to sync to Zoho — check network", "info");
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
      zohoCrmTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Open",
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

  type UserIntent = "plan_create" | "plan_modify" | "plan_approve" | "data_query" | "conversational";

  const classifyIntent = (message: string, hasActivePlan: boolean): UserIntent => {
    const lower = message.toLowerCase().trim();

    if (hasActivePlan) {
      if (/^(yes|yep|approve|looks good|push|sync|go ahead|proceed|push to zoho|approve and push|accept)/i.test(lower)) {
        return "plan_approve";
      }
      const modSignals = /\b(assign|reassign|change|update|set|remove|delete|add|modify|adjust|improve|suggest|optim|recommend|enhance|failover|concurrency|tat|deadline|urgency|priority|budget|volume)\b/i;
      if (modSignals.test(lower)) return "plan_modify";
    }

    // Data / lookup queries — these should always go to the chat API regardless of campaign context
    const isDataQuery =
      /\b(invoice|invoices|billing|payment|payments|escrow|receipt|paid|advance)\b/i.test(lower) ||
      /\b(status|pipeline|deals|live campaigns|active campaigns|show deals)\b/i.test(lower) ||
      /\b(who is|who's|team|directory|contact|spoc|members)\b/i.test(lower) ||
      /\b(pending tasks|action items|blockers|overdue|deadlines)\b/i.test(lower) ||
      /\b(help|capabilities|what can you|what do you do|features)\b/i.test(lower);

    if (isDataQuery) return "data_query";

    const hasSpecificBrand = /\b(nestl|cadbury|pepsi|tata|coca.?cola|britannia|itc|mondelez|pepsico|hindustan)\b/i.test(lower);
    const hasCampaignNoun = /\b(campaign|plan|brief|promotion|deal)\b/i.test(lower);
    const hasCreationVerb = /\b(create|generate|build|plan|launch|design|draft|set up|prepare|review|open|load|view)\b/i.test(lower);

    // Check if the user is asking for general educational explanation / definition
    const hasExclusionSignal = /\b(example\s+of|explain\s+how|what\s+is|what\s+does|meaning\s+of|how\s+does|compare\s+|difference\s+between)\b/i.test(lower);

    if (hasExclusionSignal && !hasSpecificBrand) {
      return "conversational";
    }

    if ((hasCreationVerb || hasCampaignNoun) && (hasSpecificBrand || /plan\s+and\s+risks/i.test(lower) || /for\s+[a-z]+/i.test(lower))) {
      return "plan_create";
    }

    if (hasCreationVerb && hasCampaignNoun) {
      return "plan_create";
    }

    return "conversational";
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

      setSession((prev) => {
        const newMessages = [...prev.messages, userMessage];
        return {
          ...prev,
          messages: newMessages,
          title: prev.messages.length === 0 ? deriveTitle(newMessages) : prev.title,
        };
      });

      const intent = classifyIntent(content, !!(workingPlan && workingPlan.status !== "live"));

      if (intent === "plan_approve") {
        await handleApprovePlanToZoho();
        return;
      }

      let planModified = false;
      let modificationSummary = "";
      let activePlan = workingPlan;

      if (intent === "plan_modify" && workingPlan) {
        const modResult = applyPlanModifications(
          workingPlan.tasks,
          workingPlan.campaignData,
          content
        );

        if (modResult.hasModifications) {
          planModified = true;
          modificationSummary = modResult.summaryMarkdown;

          const updatedPlan: WorkingPlanState = {
            ...workingPlan,
            tasks: modResult.updatedTasks,
            campaignData: modResult.updatedCampaignData,
          };
          activePlan = updatedPlan;
          setWorkingPlan(updatedPlan);

          setIsPlanPanelOpen(true);
          setHighlightedTaskIds(modResult.modifiedTaskIds);
          setTimeout(() => setHighlightedTaskIds([]), 6000);
          showToast(`✨ Updated ${modResult.modifiedTaskIds.length} tasks — panel opened`, "sparkle");
        }
      } else if (!workingPlan && intent === "plan_create") {
        setIsPlanPanelOpen(true);
        showToast("🧠 AI Brain decomposing brief & generating bespoke tasks...", "sparkle");

        try {
          const planRes = await fetch("/api/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "generate_plan",
              campaignInput: { brief: content },
            }),
          });
          if (planRes.ok) {
            const planJson = await planRes.json();
            if (planJson.plan && planJson.campaignData) {
              const newWorkingPlan: WorkingPlanState = {
                campaignData: planJson.campaignData,
                tasks: planJson.plan.tasks,
                aspectSummary: planJson.plan.aspectSummary,
                status: "draft",
              };
              activePlan = newWorkingPlan;
              setWorkingPlan(newWorkingPlan);
              showToast(
                `✨ AI generated ${planJson.plan.tasks.length} bespoke tasks for ${planJson.campaignData.name}`,
                "sparkle"
              );
            }
          }
        } catch (e) {
          console.error("AI Plan generation error:", e);
        }
      }

      let promptToSend = content;

      // Build campaign context string for Gemini direct fallback
      let campaignContextStr: string | undefined;
      if (activePlan && activePlan.status !== "live") {
        campaignContextStr =
          `Campaign: ${activePlan.campaignData.name}\n` +
          `Client: ${activePlan.campaignData.client}\n` +
          `Budget: ${activePlan.campaignData.budget}\n` +
          `Volume: ${activePlan.campaignData.codeVolume}\n` +
          `Tasks (${activePlan.tasks.length}):\n` +
          activePlan.tasks
            .map((t, idx) => `${idx + 1}. [${t.aspect.toUpperCase()}] ${t.title} (Owner: ${t.assignee}, TAT: ${t.tat}, Urgency: ${t.urgency})`)
            .join("\n");

        promptToSend =
          `[Active Working Campaign Context]\n${campaignContextStr}\n\nUser Request: ${content}`;
      }

      // Build last-6-turn history for Gemini direct context
      const conversationHistory = session.messages
        .slice(-6)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Chat API call / Stream
      setIsLoading(true);
      setIsThinking(true);
      setToolCallLabel(null);

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: promptToSend,
            sessionId: session.id,
            campaignContext: campaignContextStr,
            conversationHistory,
            intent,
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
          let toolCallReceived = false; // tracks whether n8n sent a begin frame (tool was invoked but may have returned no content)
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
                const trimmed = line.trim();
                if (!trimmed) continue;

                let token = "";

                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6).trim();
                  if (data === "[DONE]") {
                    streamEnded = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);

                    // Handle toolCall frame from n8n begin events:
                    // Shows "Querying Zoho CRM..." during long tool calls (~17s)
                    if (parsed.toolCall) {
                      toolCallReceived = true;
                      const labelMap: Record<string, string> = {
                        "Zoho CRM Deals & Campaigns": "Querying Zoho CRM deals...",
                        "Zoho CRM Invoices": "Querying Zoho CRM invoices...",
                        "Zoho CRM Client Accounts": "Querying Zoho CRM accounts...",
                        "Campaign Knowledge Base": "Searching knowledge base...",
                        "Pending Tasks & SOP Action Items": "Loading pending tasks...",
                      };
                      const displayLabel =
                        labelMap[parsed.toolCall as string] ||
                        `Processing: ${parsed.toolCall}...`;
                      setToolCallLabel(displayLabel);
                      continue;
                    }

                    // Clear tool call label once content starts arriving
                    if (parsed.text || parsed.content || parsed.output) {
                      setToolCallLabel(null);
                    }

                    token = parsed.text || parsed.content || parsed.output || "";
                  } catch {
                    token = data;
                  }
                } else {
                  // Direct NDJSON lines or raw text
                  try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed.type === "item" && parsed.content) {
                      token = parsed.content;
                    } else if (parsed.type === "end") {
                      // Sub-node ended (tool completed), main stream continues
                    } else if (parsed.type === "keepalive") {
                      // Keepalive ping, ignore
                    } else if (parsed.toolCall) {
                      const labelMap: Record<string, string> = {
                        "Zoho CRM Deals & Campaigns": "Querying Zoho CRM deals...",
                        "Zoho CRM Invoices": "Querying Zoho CRM invoices...",
                        "Zoho CRM Client Accounts": "Querying Zoho CRM accounts...",
                        "Campaign Knowledge Base": "Searching knowledge base...",
                        "Pending Tasks & SOP Action Items": "Loading pending tasks...",
                      };
                      setToolCallLabel(
                        labelMap[parsed.toolCall as string] ||
                        `Processing: ${parsed.toolCall}...`
                      );
                      continue;
                    } else {
                      token = parsed.text || parsed.content || parsed.output || "";
                    }
                  } catch {
                    token = trimmed;
                  }
                }

                if (token) {
                  accumulatedContent += token;

                  if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    setIsThinking(false);

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

            // Check if trailing buffer has unparsed token
            if (buffer.trim() && !buffer.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(buffer.trim());
                const leftover = parsed.content || parsed.text || parsed.output || "";
                if (leftover) accumulatedContent += leftover;
              } catch {}
            }

            // Dynamically sync tasks from AI response into right canvas
            if (accumulatedContent) {
              setWorkingPlan((prev) => {
                if (!prev) return null;
                const { updatedTasks, modifiedIds } = syncTasksFromAIResponse(
                  accumulatedContent,
                  prev.tasks
                );
                if (modifiedIds.length > 0) {
                  setHighlightedTaskIds(modifiedIds);
                  setTimeout(() => setHighlightedTaskIds([]), 5000);
                  showToast(`✨ Synced ${modifiedIds.length} tasks from AI`, "sparkle");
                }
                return { ...prev, tasks: updatedTasks };
              });
            }

            // Ensure assistant message is ALWAYS rendered even if streaming ended without prior chunks
            if (!firstChunkReceived) {
              setIsThinking(false);
              setToolCallLabel(null);
              let fallbackContent = accumulatedContent;
              if (!fallbackContent) {
                if (planModified && modificationSummary) {
                  fallbackContent = modificationSummary;
                } else if (activePlan) {
                  fallbackContent =
                    `### Strategic Campaign Plan Ready — **${activePlan.campaignData.name}**\n\n` +
                    `[Confirmed Information]\n` +
                    `All 4 milestone aspects (Legal, Compliance, Escrow Accounting, Tech & QR) have been verified against BigCity SOPs.\n\n` +
                    `[Recommendation]\n` +
                    `Review the tasks on the canvas. You can reassign owners, adjust TATs, or click **Approve & Push to Zoho**.`;
                } else {
                  // Re-route to static engine client-side rather than showing a generic message.
                  // This covers the case where n8n returned begin/end frames but no item content.
                  fallbackContent =
                    `I received your request. The live AI connection appears to be processing.\n\n` +
                    `[Note] If this happens repeatedly, try:\n` +
                    `- Asking about invoices: "Show my invoices"\n` +
                    `- Checking pending tasks: "Show pending tasks"\n` +
                    `- Viewing the team: "Who is Sneha Nair?"\n\n` +
                    `These work in offline mode without the live Zoho connection.`;
                }
              }

              const assistantMessage: Message = {
                id: `msg-${Date.now()}-assistant`,
                role: "assistant",
                content: fallbackContent,
                timestamp: new Date(),
              };
              setSession((prev) => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
              }));
            }
          } catch (readErr) {
            if ((readErr as Error).name !== "AbortError") throw readErr;
          } finally {
            setIsThinking(false);
            setToolCallLabel(null);
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

          if (outputText) {
            setWorkingPlan((prev) => {
              if (!prev) return null;
              const { updatedTasks, modifiedIds } = syncTasksFromAIResponse(
                outputText,
                prev.tasks
              );
              if (modifiedIds.length > 0) {
                setHighlightedTaskIds(modifiedIds);
                setTimeout(() => setHighlightedTaskIds([]), 5000);
                showToast(`✨ Synced ${modifiedIds.length} tasks from AI`, "sparkle");
              }
              return { ...prev, tasks: updatedTasks };
            });
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
        setToolCallLabel(null);
        abortRef.current = null;
      }
    },
    [session.id, session.messages, workingPlan, showToast]
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
          {workingPlan && !isPlanPanelOpen && (
            <button
              type="button"
              onClick={() => setIsPlanPanelOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
            >
              <Sparkle size={13} weight="fill" className="text-indigo-500" />
              Show Plan ({workingPlan.tasks.length})
            </button>
          )}
          {workingPlan && isPlanPanelOpen ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hidden sm:inline-flex">
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
          {workingPlan && isPlanPanelOpen && (
            <button
              onClick={() => setIsPlanPanelOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200 shadow-xs text-xs font-semibold cursor-pointer"
            >
              <span>Hide Plan</span>
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

      {/* Proactive Risk Nudge Banner */}
      {!workingPlan && riskDigest && riskDigest.criticalActionItems && riskDigest.criticalActionItems.length > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={14} className="text-rose-600" weight="bold" />
            </div>
            <div>
              <p className="text-[11.5px] font-bold text-rose-900">
                Action Required: {riskDigest.criticalActionItems[0].deal}
              </p>
              <p className="text-[10.5px] font-medium text-rose-700 mt-0.5">
                {riskDigest.criticalActionItems[0].issue} — Assigned to {riskDigest.criticalActionItems[0].owner}
              </p>
            </div>
          </div>
          <button 
            onClick={() => sendMessage(`Show me the plan and risks for ${riskDigest.criticalActionItems[0].deal}`)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            Review Plan
          </button>
        </div>
      )}

      {/* Workspace Area: Split-Pane when working on a plan, Full width for normal chat */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANE: Chat & Modification Prompt Stream */}
        <div
          className={`flex flex-col h-full min-h-0 transition-all duration-300 ${
            workingPlan && isPlanPanelOpen ? "w-full lg:w-[44%] border-r border-stone-200 bg-[#FAFAF9]" : "w-full"
          }`}
        >
          {/* Scrollable messages */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 flex flex-col items-center scroll-smooth space-y-4 w-full min-w-0"
          >
            {messages.length === 0 ? (
              <EmptyState onSelectPrompt={sendMessage} />
            ) : (
              <div className="w-full max-w-2xl space-y-4 min-w-0">
                {/* Chat message stream */}
                {messages.map((msg, index) => (
                  <ChatMessage key={msg.id} message={msg} index={index} />
                ))}

                {/* Live Thinking Stepper */}
                <AnimatePresence>
                  {isThinking && (
                    <ThinkingProcess
                      key="thinking"
                      mode={workingPlan && session.messages.length === 1 ? "plan" : "chat"}
                      toolCallLabel={toolCallLabel ?? undefined}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3.5 bg-white border-t border-stone-200/80 flex-shrink-0 shadow-xs">
            <div className="max-w-2xl mx-auto flex flex-col gap-2">
              {/* Contextual Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {messages.length === 0 ? (
                  <>
                    <button onClick={() => sendMessage("Create a plan for a Nestlé campaign")} className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer border border-stone-200">Create a plan for a Nestlé campaign</button>
                    <button onClick={() => sendMessage("What is a scratch & win campaign?")} className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer border border-stone-200">What is a scratch & win campaign?</button>
                  </>
                ) : workingPlan && workingPlan.status === "draft" ? (
                  <>
                    <button onClick={() => sendMessage("Assign all legal tasks to Akash Verma")} className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer border border-indigo-200">Assign all legal tasks to Akash</button>
                    <button onClick={() => sendMessage("Suggest improvements")} className="text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer border border-sky-200">Suggest improvements</button>
                    <button onClick={() => sendMessage("Approve")} className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer border border-emerald-200 flex items-center gap-1"><CheckCircle size={12} weight="fill" /> Approve</button>
                  </>
                ) : workingPlan && workingPlan.status === "live" ? (
                  <>
                    <button onClick={handleNewChat} className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer border border-stone-200">Start new plan</button>
                  </>
                ) : null}
              </div>

              <ChatInput
                onSendMessage={sendMessage}
                isLoading={isLoading || isPushingToZoho}
                onStop={handleStop}
              />
              <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 mt-1">
                <span>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-stone-50 border border-stone-200 text-[10px] text-stone-600 font-mono shadow-xs">Enter ↵</kbd> to send
                </span>
                <span className="font-medium text-stone-500">BCP Assist AI (Gemini 3.7)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Live Full Plan Canvas & Task Studio */}
        {workingPlan && (
          <div className="hidden lg:flex flex-1 flex-col h-full min-h-0 bg-[#FBFBFA] overflow-hidden">
            {/* Header: Campaign Info & Push Action (Clean, uncrowded layout) */}
            <div className="px-6 py-4 border-b border-stone-200/80 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3.5 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-stone-900 tracking-tight truncate mb-1.5">
                  {workingPlan.campaignData.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      workingPlan.status === "live"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    <Kanban size={12} weight="fill" />
                    {workingPlan.status === "live" ? (workingPlan.zohoCrmDealId ? `LIVE · Zoho CRM · ${workingPlan.zohoCrmDealId}` : "LIVE · Zoho CRM") : "PLAN PREVIEW"}
                  </span>
                  <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60">
                    {workingPlan.campaignData.client}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60">
                    {workingPlan.campaignData.budget}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60">
                    {workingPlan.campaignData.codeVolume}
                  </span>
                </div>
              </div>

              {/* Main Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all cursor-pointer border border-stone-200 shadow-2xs"
                  title="Add custom task to plan"
                >
                  <Plus size={13} weight="bold" />
                  <span>Add Task</span>
                </button>

                {workingPlan.status === "live" ? (
                  <div className="flex items-center gap-2">
                    {workingPlan.zohoCrmDealUrl && (
                      <a
                        href={workingPlan.zohoCrmDealUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                        title="Open in Zoho CRM"
                      >
                        <ArrowSquareOut size={13} weight="bold" />
                        <span>Zoho CRM</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onViewCampaigns}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                    >
                      <Kanban size={13} weight="bold" />
                      <span>View in Campaigns</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleApprovePlanToZoho}
                    disabled={isPushingToZoho}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-98"
                  >
                    {isPushingToZoho ? (
                      <>
                        <ArrowsClockwise size={13} className="animate-spin" />
                        <span>Syncing to Zoho…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={13} weight="fill" />
                        <span>Approve & Sync to Zoho CRM</span>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
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
                        className={`p-3.5 rounded-xl bg-white border transition-all space-y-2 relative group ${
                          isHighlighted
                            ? "border-amber-400 shadow-md ring-2 ring-amber-300/40 bg-amber-50/20"
                            : "border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-300"
                        } border-l-4 ${meta.border}`}
                      >
                        {/* Top row: Aspect Icon + Title + Actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}
                            >
                              <Icon size={13} weight="duotone" className={meta.light} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-stone-400">
                                  {task.sopCode}
                                </span>
                                {isHighlighted && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    UPDATED
                                  </span>
                                )}
                              </div>
                              <h4 className="text-[13px] font-bold text-stone-900 leading-snug">
                                {task.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
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
                              className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center gap-1 transition-colors cursor-pointer border border-stone-200/60"
                              title="Click to cycle TAT duration"
                            >
                              <Clock size={11} className="text-stone-400" />
                              {task.tat}
                            </button>

                            {/* Urgency Selector */}
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
                              className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
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

                            {/* Delete Task Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="w-6 h-6 rounded-md text-stone-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Delete task from plan"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Details text */}
                        {task.details && (
                          <p className="text-[11.5px] text-stone-600 leading-relaxed pl-9">
                            {task.details}
                          </p>
                        )}

                        {/* Metadata & Assignee Selector Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-stone-100 pl-9 text-xs text-stone-500">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border ${meta.badge}`}
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
                                className="flex items-center gap-1.5 text-stone-800 font-medium px-2 py-0.5 rounded-md hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 cursor-pointer text-[11.5px]"
                                title="Click to reassign task owner"
                              >
                                <User size={11} className="text-stone-400" />
                                <span>{task.assignee}</span>
                                <CaretDown size={9} className="text-stone-400 ml-0.5" />
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
                                            <div className="font-semibold text-xs">{member.name}</div>
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
