import { type AspectTask, type Campaign } from "@/app/api/campaigns/route";

export interface TeamMember {
  name: string;
  role: string;
  department: string;
  aspects: ("legal" | "compliance" | "accounting" | "implementation")[];
}

export const BIGCITY_TEAM: TeamMember[] = [
  {
    name: "Akash Verma",
    role: "Legal Counsel",
    department: "Legal & Commercial Contracts",
    aspects: ["legal"],
  },
  {
    name: "Prashant Mittal",
    role: "Legal Head",
    department: "Legal & Regulatory Affairs",
    aspects: ["legal"],
  },
  {
    name: "Kavita Rao",
    role: "Legal Associate",
    department: "Legal & Regulatory Affairs",
    aspects: ["legal"],
  },
  {
    name: "Khaleel Ahmed",
    role: "Compliance SPOC / Ops Lead",
    department: "Compliance & Operations",
    aspects: ["compliance", "implementation"],
  },
  {
    name: "Sachin (Tech Team)",
    role: "Tech Lead & Cloud Architect",
    department: "Platforms & OTP Gateways",
    aspects: ["implementation", "compliance"],
  },
  {
    name: "Sneha Nair",
    role: "Finance Lead",
    department: "Finance & Escrow Accounting",
    aspects: ["accounting"],
  },
  {
    name: "Rohit Sharma",
    role: "Admin & Commercial Head",
    department: "Enterprise Architecture & SOW",
    aspects: ["accounting", "implementation"],
  },
  {
    name: "Priya Nair",
    role: "Digital Operations Lead",
    department: "Digital Operations & CRM",
    aspects: ["implementation"],
  },
  {
    name: "Vikram Mehta",
    role: "Campaign Manager",
    department: "FMCG Brand Campaigns",
    aspects: ["implementation"],
  },
  {
    name: "Ananya Deshmukh",
    role: "Campaign Manager",
    department: "Consumer Electronics",
    aspects: ["implementation"],
  },
  {
    name: "Arjun Patel",
    role: "Project Manager",
    department: "Platforms & OTP Gateways",
    aspects: ["implementation"],
  },
];

export interface PlanModificationResult {
  hasModifications: boolean;
  updatedTasks: AspectTask[];
  updatedCampaignData: any;
  modifiedTaskIds: string[];
  summaryMarkdown: string;
  actionType:
    | "reassign"
    | "add_task"
    | "delete_task"
    | "update_tat"
    | "update_urgency"
    | "update_metadata"
    | "improve"
    | "multiple"
    | "none";
}

/**
 * Match a target team member name from natural language query
 */
export function findTeamMember(query: string): TeamMember | null {
  const q = query.toLowerCase();
  if (q.includes("akash") || q.includes("aakash")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("akash")) || {
      name: "Akash Verma",
      role: "Legal Counsel",
      department: "Legal & Commercial Contracts",
      aspects: ["legal"],
    };
  }
  if (q.includes("prashant")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("prashant")) || null;
  }
  if (q.includes("kavita")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("kavita")) || null;
  }
  if (q.includes("khaleel")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("khaleel")) || null;
  }
  if (q.includes("sachin")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("sachin")) || null;
  }
  if (q.includes("sneha")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("sneha")) || null;
  }
  if (q.includes("rohit")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("rohit")) || null;
  }
  if (q.includes("priya")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("priya")) || null;
  }
  if (q.includes("vikram")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("vikram")) || null;
  }
  if (q.includes("ananya")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("ananya")) || null;
  }
  if (q.includes("arjun")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("arjun")) || null;
  }

  // Generic check
  for (const member of BIGCITY_TEAM) {
    const firstName = member.name.split(" ")[0].toLowerCase();
    if (q.includes(firstName)) return member;
  }
  return null;
}

/**
 * Intelligent Plan Modifier: Inspects user prompt and mutates tasks / campaignData
 */
export function applyPlanModifications(
  currentTasks: AspectTask[],
  campaignData: any,
  input: string
): PlanModificationResult {
  const lower = input.toLowerCase().trim();
  let tasks = [...currentTasks];
  let updatedCampaign = { ...campaignData };
  const modifiedTaskIds: string[] = [];
  const changesSummary: string[] = [];
  let actionType: PlanModificationResult["actionType"] = "none";

  // 1. IMPROVEMENT / OPTIMIZATION INTENT: E.g., "Suggest improvements", "Optimize plan", "Add failover gates"
  const isImprovementIntent =
    lower.includes("suggest improvement") ||
    lower.includes("improve") ||
    lower.includes("optim") ||
    lower.includes("recommend") ||
    lower.includes("best practice") ||
    lower.includes("enhance") ||
    lower.includes("concurrency") ||
    lower.includes("failover");

  if (isImprovementIntent) {
    const strategicAdditions: Omit<AspectTask, "id" | "sopCode" | "zohoTaskId" | "zohoTaskStatus">[] = [
      {
        title: "Dual-Gateway Karix / Gupshup 30s Auto-Failover Setup",
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead & Cloud Architect",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "IN_PROGRESS",
        details: "Configure primary Karix OTP route with automated 30s fallback to Gupshup to eliminate TV ad spike drop-offs.",
        verificationRequirement: "Automated failover drill log verification.",
        mandatoryGate: true,
      },
      {
        title: "Telecom TPS Pre-Warming (TV Commercial Surge Readiness)",
        aspect: "implementation",
        assignee: "Sachin (Tech Team)",
        role: "Tech Lead & Cloud Architect",
        urgency: "HIGH",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        details: "Coordinate telecom TPS capacity pre-warming 48 hours prior to national TV commercial air dates.",
        verificationRequirement: "Telecom operator pre-warming confirmation ticket.",
        mandatoryGate: true,
      },
      {
        title: "72-Hour Pre-Launch Staging UAT (50-Number Test Matrix across Jio/Airtel/Vi)",
        aspect: "compliance",
        assignee: "Khaleel Ahmed",
        role: "Compliance SPOC / Ops Lead",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        details: "Execute mandatory 50-number test matrix across iOS, Android, and mobile web on all Tier-1 telecom networks.",
        verificationRequirement: "Complete UAT sign-off matrix report with zero critical blockers.",
        mandatoryGate: true,
      },
      {
        title: "Partner Brand Consent Written Sign-Off (3 Days Prior to Print)",
        aspect: "legal",
        assignee: "Akash Verma",
        role: "Legal Counsel",
        urgency: "HIGHEST",
        tat: "2 Days",
        status: "PENDING_APPROVAL",
        details: "Secure formal written email sign-off for brand logo assets on packaging & POSM before releasing print run.",
        verificationRequirement: "Partner Brand Marketing SPOC signed approval email.",
        mandatoryGate: true,
      },
      {
        title: "100% Advance Payment Matching in Zoho Books (Escrow Protection)",
        aspect: "accounting",
        assignee: "Sneha Nair",
        role: "Finance Lead",
        urgency: "HIGHEST",
        tat: "1 Day",
        status: "PENDING_APPROVAL",
        details: "Ensure 100% advance client deposit is reconciled against Zoho Books receipt voucher before voucher PO release.",
        verificationRequirement: "Zoho Books matched receipt voucher #.",
        mandatoryGate: true,
      },
    ];

    let addedCount = 0;
    for (const item of strategicAdditions) {
      const alreadyExists = tasks.some(
        (t) => t.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 20))
      );
      if (!alreadyExists) {
        const count = tasks.filter((t) => t.aspect === item.aspect).length + 1;
        const sopCode = `SOP-${item.aspect.slice(0, 3).toUpperCase()}-0${count}`;
        const newId = `task-opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newTask: AspectTask = {
          ...item,
          id: newId,
          sopCode,
          zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
          zohoTaskStatus: "Open",
        };
        tasks.push(newTask);
        modifiedTaskIds.push(newId);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      changesSummary.push(
        `• Added **${addedCount} Strategic AI Optimization Tasks** across Failover, UAT Staging, Escrow & Compliance gates.`
      );
      actionType = "improve";
    }
  }

  // 2. REASSIGNMENT: E.g., "assign all legal tasks to Akash Verma" or "assign legal to Akash"
  const isReassignIntent =
    lower.includes("assign") ||
    lower.includes("reassign") ||
    lower.includes("make owner") ||
    lower.includes("set owner") ||
    lower.includes("give to") ||
    lower.includes("hand over");

  if (isReassignIntent) {
    const targetMember = findTeamMember(input);
    const targetAssigneeName = targetMember ? targetMember.name : "Akash Verma";
    const targetRole = targetMember ? targetMember.role : "Legal Counsel";

    // Check if target is an aspect (legal, compliance, accounting, tech/implementation)
    let targetAspect: "legal" | "compliance" | "accounting" | "implementation" | null = null;
    if (lower.includes("legal") || lower.includes("t&c") || lower.includes("contract") || lower.includes("nda")) {
      targetAspect = "legal";
    } else if (lower.includes("compliance") || lower.includes("trai") || lower.includes("dlt") || lower.includes("uat")) {
      targetAspect = "compliance";
    } else if (lower.includes("accounting") || lower.includes("finance") || lower.includes("escrow") || lower.includes("invoice")) {
      targetAspect = "accounting";
    } else if (lower.includes("tech") || lower.includes("implementation") || lower.includes("ops") || lower.includes("gateway") || lower.includes("qr")) {
      targetAspect = "implementation";
    }

    // Check if targeting a specific task index (e.g. "task 1", "task #2", "first task")
    const taskIndexMatch = lower.match(/task\s*(?:#|no\.?|number)?\s*(\d+)/i);
    const specificIndex = taskIndexMatch ? parseInt(taskIndexMatch[1], 10) - 1 : null;

    if (specificIndex !== null && specificIndex >= 0 && specificIndex < tasks.length) {
      // Single task reassignment
      const oldAssignee = tasks[specificIndex].assignee;
      tasks[specificIndex] = {
        ...tasks[specificIndex],
        assignee: targetAssigneeName,
        role: targetRole,
      };
      modifiedTaskIds.push(tasks[specificIndex].id);
      changesSummary.push(
        `• **${tasks[specificIndex].sopCode} (${tasks[specificIndex].title})**: Reassigned from _${oldAssignee}_ → **${targetAssigneeName}** (${targetRole})`
      );
      actionType = actionType === "none" ? "reassign" : "multiple";
    } else if (targetAspect) {
      // Bulk aspect reassignment (e.g., "assign all legal tasks to Akash Verma")
      let count = 0;
      tasks = tasks.map((t) => {
        if (t.aspect === targetAspect) {
          count++;
          modifiedTaskIds.push(t.id);
          return {
            ...t,
            assignee: targetAssigneeName,
            role: targetRole,
          };
        }
        return t;
      });

      if (count > 0) {
        changesSummary.push(
          `• Reassigned **all ${count} ${targetAspect.toUpperCase()} tasks** to **${targetAssigneeName}** (${targetRole})`
        );
        actionType = actionType === "none" ? "reassign" : "multiple";
      }
    } else if (targetMember) {
      // General match: reassign tasks matching targetMember's primary aspect or first matching
      let count = 0;
      tasks = tasks.map((t) => {
        if (targetMember.aspects.includes(t.aspect)) {
          count++;
          modifiedTaskIds.push(t.id);
          return {
            ...t,
            assignee: targetMember.name,
            role: targetMember.role,
          };
        }
        return t;
      });
      if (count > 0) {
        changesSummary.push(
          `• Reassigned **${count} matching tasks** to **${targetMember.name}** (${targetMember.role})`
        );
        actionType = actionType === "none" ? "reassign" : "multiple";
      }
    }
  }

  // 3. TAT / DEADLINE MODIFICATIONS: E.g., "change legal tasks TAT to 1 day", "set task 2 TAT to 3 days"
  const isTatIntent =
    lower.includes("tat") ||
    lower.includes("deadline") ||
    lower.includes("timeline") ||
    lower.includes("turnaround") ||
    lower.includes("working days") ||
    lower.includes("working day") ||
    lower.includes("duration");

  if (isTatIntent) {
    const daysMatch = lower.match(/(\d+)\s*(?:working\s*)?(?:day|days|h|hours|hr|hrs)/i);
    let newTat = "2 Days";
    if (daysMatch) {
      const num = parseInt(daysMatch[1], 10);
      if (lower.includes("h") || lower.includes("hour")) {
        newTat = `${num} Hours`;
      } else {
        newTat = num === 1 ? "1 Day" : `${num} Days`;
      }
    }

    let targetAspect: "legal" | "compliance" | "accounting" | "implementation" | null = null;
    if (lower.includes("legal")) targetAspect = "legal";
    else if (lower.includes("compliance")) targetAspect = "compliance";
    else if (lower.includes("accounting") || lower.includes("finance")) targetAspect = "accounting";
    else if (lower.includes("tech") || lower.includes("implementation")) targetAspect = "implementation";

    const taskIndexMatch = lower.match(/task\s*(?:#|no\.?|number)?\s*(\d+)/i);
    const specificIndex = taskIndexMatch ? parseInt(taskIndexMatch[1], 10) - 1 : null;

    if (specificIndex !== null && specificIndex >= 0 && specificIndex < tasks.length) {
      tasks[specificIndex] = {
        ...tasks[specificIndex],
        tat: newTat,
      };
      modifiedTaskIds.push(tasks[specificIndex].id);
      changesSummary.push(
        `• **${tasks[specificIndex].sopCode}**: Updated TAT to **${newTat}**`
      );
      actionType = actionType === "none" ? "update_tat" : "multiple";
    } else if (targetAspect) {
      let count = 0;
      tasks = tasks.map((t) => {
        if (t.aspect === targetAspect) {
          count++;
          modifiedTaskIds.push(t.id);
          return { ...t, tat: newTat };
        }
        return t;
      });
      if (count > 0) {
        changesSummary.push(
          `• Updated TAT for all **${targetAspect.toUpperCase()} tasks** to **${newTat}**`
        );
        actionType = actionType === "none" ? "update_tat" : "multiple";
      }
    }
  }

  // 4. URGENCY MODIFICATIONS: E.g., "set compliance urgency to HIGHEST" or "mark task 3 as NORMAL"
  const isUrgencyIntent =
    lower.includes("urgency") ||
    lower.includes("priority") ||
    lower.includes("highest") ||
    lower.includes("critical") ||
    lower.includes("urgent");

  if (isUrgencyIntent && !isImprovementIntent) {
    let newUrgency: AspectTask["urgency"] = "HIGH";
    if (lower.includes("highest") || lower.includes("critical") || lower.includes("p0")) {
      newUrgency = "HIGHEST";
    } else if (lower.includes("medium") || lower.includes("p2")) {
      newUrgency = "MEDIUM";
    } else if (lower.includes("normal") || lower.includes("low") || lower.includes("p3")) {
      newUrgency = "NORMAL";
    } else if (lower.includes("high") || lower.includes("p1")) {
      newUrgency = "HIGH";
    }

    let targetAspect: "legal" | "compliance" | "accounting" | "implementation" | null = null;
    if (lower.includes("legal")) targetAspect = "legal";
    else if (lower.includes("compliance")) targetAspect = "compliance";
    else if (lower.includes("accounting")) targetAspect = "accounting";
    else if (lower.includes("tech")) targetAspect = "implementation";

    const taskIndexMatch = lower.match(/task\s*(?:#|no\.?|number)?\s*(\d+)/i);
    const specificIndex = taskIndexMatch ? parseInt(taskIndexMatch[1], 10) - 1 : null;

    if (specificIndex !== null && specificIndex >= 0 && specificIndex < tasks.length) {
      tasks[specificIndex] = {
        ...tasks[specificIndex],
        urgency: newUrgency,
      };
      modifiedTaskIds.push(tasks[specificIndex].id);
      changesSummary.push(
        `• **${tasks[specificIndex].sopCode}**: Updated urgency to **${newUrgency}**`
      );
      actionType = actionType === "none" ? "update_urgency" : "multiple";
    } else if (targetAspect) {
      let count = 0;
      tasks = tasks.map((t) => {
        if (t.aspect === targetAspect) {
          count++;
          modifiedTaskIds.push(t.id);
          return { ...t, urgency: newUrgency };
        }
        return t;
      });
      if (count > 0) {
        changesSummary.push(
          `• Set urgency for all **${targetAspect.toUpperCase()} tasks** to **${newUrgency}**`
        );
        actionType = actionType === "none" ? "update_urgency" : "multiple";
      }
    }
  }

  // 5. TASK DELETION: E.g., "delete task 3", "remove task 2"
  const isDeleteIntent =
    lower.startsWith("delete ") ||
    lower.startsWith("remove ") ||
    lower.includes("delete task") ||
    lower.includes("remove task") ||
    lower.includes("drop task");

  if (isDeleteIntent) {
    const taskIndexMatch = lower.match(/task\s*(?:#|no\.?|number)?\s*(\d+)/i);
    const specificIndex = taskIndexMatch ? parseInt(taskIndexMatch[1], 10) - 1 : null;

    if (specificIndex !== null && specificIndex >= 0 && specificIndex < tasks.length) {
      const removed = tasks[specificIndex];
      tasks = tasks.filter((_, idx) => idx !== specificIndex);
      changesSummary.push(
        `• Removed **${removed.sopCode} (${removed.title})** from the plan`
      );
      actionType = actionType === "none" ? "delete_task" : "multiple";
    } else {
      const keywords = lower
        .replace(/^(delete|remove|drop)\s+(task\s+)?/i, "")
        .trim();
      if (keywords.length > 3) {
        const matchingIdx = tasks.findIndex(
          (t) =>
            t.title.toLowerCase().includes(keywords) ||
            t.sopCode.toLowerCase().includes(keywords)
        );
        if (matchingIdx >= 0) {
          const removed = tasks[matchingIdx];
          tasks = tasks.filter((_, idx) => idx !== matchingIdx);
          changesSummary.push(
            `• Removed **${removed.sopCode} (${removed.title})** from the plan`
          );
          actionType = actionType === "none" ? "delete_task" : "multiple";
        }
      }
    }
  }

  // 6. TASK ADDITION: E.g., "add a compliance task for TRAI DLT 48h soak testing"
  const isAddIntent =
    (lower.startsWith("add ") ||
      lower.includes("add a task") ||
      lower.includes("add new task") ||
      lower.includes("create task") ||
      lower.includes("include task") ||
      lower.includes("add task")) &&
    !isReassignIntent &&
    !isImprovementIntent;

  if (isAddIntent) {
    let aspect: "legal" | "compliance" | "accounting" | "implementation" = "implementation";
    if (lower.includes("legal") || lower.includes("t&c") || lower.includes("consent") || lower.includes("nda") || lower.includes("agreement")) {
      aspect = "legal";
    } else if (lower.includes("compliance") || lower.includes("trai") || lower.includes("dlt") || lower.includes("audit") || lower.includes("uat")) {
      aspect = "compliance";
    } else if (lower.includes("accounting") || lower.includes("finance") || lower.includes("escrow") || lower.includes("invoice") || lower.includes("tax")) {
      aspect = "accounting";
    }

    const defaultMember =
      aspect === "legal"
        ? BIGCITY_TEAM.find((m) => m.name.includes("Akash")) || BIGCITY_TEAM[0]
        : aspect === "compliance"
        ? BIGCITY_TEAM.find((m) => m.name.includes("Khaleel")) || BIGCITY_TEAM[3]
        : aspect === "accounting"
        ? BIGCITY_TEAM.find((m) => m.name.includes("Sneha")) || BIGCITY_TEAM[5]
        : BIGCITY_TEAM.find((m) => m.name.includes("Sachin")) || BIGCITY_TEAM[4];

    let title = input
      .replace(/^(please\s+|can\s+you\s+|kindly\s+)?(add|create|include)\s+(a\s+)?(new\s+)?(task\s+)?(for\s+|to\s+)?/i, "")
      .replace(/^(legal|compliance|accounting|tech|implementation)\s+(task\s+)?(for\s+|to\s+)?/i, "")
      .trim();

    if (!title || title.length < 5) {
      title = `Custom ${aspect.toUpperCase()} Requirement`;
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    if (title.length > 60) {
      title = title.slice(0, 60) + "…";
    }

    const aspectTaskCount = tasks.filter((t) => t.aspect === aspect).length + 1;
    const sopCode = `SOP-${aspect.slice(0, 3).toUpperCase()}-0${aspectTaskCount}`;
    const newTaskId = `task-${Date.now()}`;

    const newTask: AspectTask = {
      id: newTaskId,
      sopCode,
      title,
      aspect,
      assignee: defaultMember.name,
      role: defaultMember.role,
      urgency: lower.includes("urgent") || lower.includes("critical") ? "HIGHEST" : "HIGH",
      tat: lower.includes("24h") || lower.includes("1 day") ? "1 Day" : lower.includes("3 day") ? "3 Days" : "2 Days",
      status: "PENDING_APPROVAL",
      zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoTaskStatus: "Open",
      details: input,
      verificationRequirement: `${defaultMember.role} sign-off required prior to Go-Live`,
      mandatoryGate: true,
    };

    tasks.push(newTask);
    modifiedTaskIds.push(newTaskId);
    changesSummary.push(
      `• Added new **[${aspect.toUpperCase()}]** task: **${sopCode} — ${title}** (Owner: **${defaultMember.name}**, TAT: **${newTask.tat}**)`
    );
    actionType = actionType === "none" ? "add_task" : "multiple";
  }

  // 7. CAMPAIGN LEVEL FIELD MODIFICATIONS: Budget, Volume, Client
  const isBudgetChange = lower.includes("budget") && (lower.includes("lakh") || lower.includes("cr") || lower.includes("₹") || lower.includes("inr") || lower.includes("change budget to"));
  if (isBudgetChange) {
    const budgetMatch = input.match(/(?:₹|inr|rs\.?)?\s*([0-9,.]+)\s*(?:lakhs?|lac|cr|crore|k|m)?/i);
    if (budgetMatch) {
      const newBudget = budgetMatch[0].trim();
      updatedCampaign.budget = newBudget.startsWith("₹") ? newBudget : `₹${newBudget}`;
      changesSummary.push(`• Updated Campaign Budget to **${updatedCampaign.budget}**`);
      actionType = actionType === "none" ? "update_metadata" : "multiple";
    }
  }

  const isVolumeChange = lower.includes("volume") || lower.includes("packs") || lower.includes("codes");
  if (isVolumeChange) {
    const volumeMatch = input.match(/([0-9,.]+)\s*(?:packs?|codes?|units?|k|m|million|lakh)?/i);
    if (volumeMatch && (lower.includes("set") || lower.includes("change") || lower.includes("to"))) {
      updatedCampaign.codeVolume = `${volumeMatch[0].trim()} packs`;
      changesSummary.push(`• Updated Code/Pack Volume to **${updatedCampaign.codeVolume}**`);
      actionType = actionType === "none" ? "update_metadata" : "multiple";
    }
  }

  const hasModifications = changesSummary.length > 0;

  let summaryMarkdown = "";
  if (hasModifications) {
    summaryMarkdown = `**Plan Successfully Updated Inline**\n\nI've modified the active project plan for **${updatedCampaign.name || "this campaign"}** based on your instruction:\n\n${changesSummary.join("\n")}\n\n**Current Milestone Breakdown:**\n* **Legal**: ${tasks.filter((t) => t.aspect === "legal").length} Tasks (Owner: ${tasks.find((t) => t.aspect === "legal")?.assignee || "Legal SPOC"})\n* **Compliance**: ${tasks.filter((t) => t.aspect === "compliance").length} Tasks\n* **Accounting**: ${tasks.filter((t) => t.aspect === "accounting").length} Tasks\n* **Tech & Ops**: ${tasks.filter((t) => t.aspect === "implementation").length} Tasks\n\nAll changes are reflected live on the right pane. Ready to push to Zoho Projects when you are!`;
  }

  return {
    hasModifications,
    updatedTasks: tasks,
    updatedCampaignData: updatedCampaign,
    modifiedTaskIds,
    summaryMarkdown,
    actionType,
  };
}

/**
 * Parses markdown tables, task bullet points, or structured SOP items from AI response text
 * and merges any newly generated/updated tasks into the current task list.
 */
export function syncTasksFromAIResponse(
  responseText: string,
  currentTasks: AspectTask[]
): { updatedTasks: AspectTask[]; modifiedIds: string[] } {
  if (!responseText || responseText.length < 50) {
    return { updatedTasks: currentTasks, modifiedIds: [] };
  }

  let tasks = [...currentTasks];
  const modifiedIds: string[] = [];

  // Match Markdown table rows: | SOP-LEG-01 | Title | Aspect | Assignee | TAT | Urgency |
  const lines = responseText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes("---") || trimmed.toLowerCase().includes("sop code")) {
      continue;
    }

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cells.length >= 3) {
      const codeOrTitle = cells[0];
      const titleOrAspect = cells[1];
      const aspectOrAssignee = cells[2];
      const assigneeOrTat = cells[3] || "";
      const tatOrUrgency = cells[4] || "";

      // Check if row contains a recognizable SOP or task
      const sopMatch = (codeOrTitle + " " + titleOrAspect).match(/SOP-([A-Z]{3})-\d+/i);
      const isLegal = /legal|t&c|consent/i.test(trimmed);
      const isComp = /comp|dlt|trai|uat/i.test(trimmed);
      const isAcc = /acc|finance|escrow|invoice/i.test(trimmed);
      const aspect: AspectTask["aspect"] = isLegal ? "legal" : isComp ? "compliance" : isAcc ? "accounting" : "implementation";

      const title = titleOrAspect.replace(/[*_`]/g, "").trim() || codeOrTitle.replace(/[*_`]/g, "").trim();
      if (title.length > 5 && !title.toLowerCase().includes("task name") && !title.toLowerCase().includes("header")) {
        const existingIdx = tasks.findIndex(
          (t) => t.title.toLowerCase().includes(title.toLowerCase().slice(0, 15)) ||
                 (sopMatch && t.sopCode.toLowerCase() === sopMatch[0].toLowerCase())
        );

        const member = findTeamMember(trimmed) || (
          aspect === "legal"
            ? BIGCITY_TEAM[0]
            : aspect === "compliance"
            ? BIGCITY_TEAM[3]
            : aspect === "accounting"
            ? BIGCITY_TEAM[5]
            : BIGCITY_TEAM[4]
        );

        if (existingIdx >= 0) {
          // Update existing task if assignee or TAT is specified
          const current = tasks[existingIdx];
          const hasNewAssignee = member && member.name !== current.assignee && trimmed.includes(member.name.split(" ")[0]);
          if (hasNewAssignee) {
            tasks[existingIdx] = {
              ...current,
              assignee: member.name,
              role: member.role,
            };
            modifiedIds.push(current.id);
          }
        } else {
          // Insert newly generated task
          const sopCode = sopMatch ? sopMatch[0].toUpperCase() : `SOP-${aspect.slice(0, 3).toUpperCase()}-0${tasks.filter((t) => t.aspect === aspect).length + 1}`;
          const newId = `task-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const newTask: AspectTask = {
            id: newId,
            sopCode,
            title: title.slice(0, 65),
            aspect,
            assignee: member.name,
            role: member.role,
            urgency: /highest|critical|urgent/i.test(trimmed) ? "HIGHEST" : /medium/i.test(trimmed) ? "MEDIUM" : "HIGH",
            tat: /1\s*day|24h/i.test(trimmed) ? "1 Day" : /3\s*day/i.test(trimmed) ? "3 Days" : "2 Days",
            status: "PENDING_APPROVAL",
            zohoTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
            zohoTaskStatus: "Open",
            details: trimmed,
            verificationRequirement: `${member.role} sign-off required prior to Go-Live`,
            mandatoryGate: true,
          };
          tasks.push(newTask);
          modifiedIds.push(newId);
        }
      }
    }
  }

  return { updatedTasks: tasks, modifiedIds };
}
