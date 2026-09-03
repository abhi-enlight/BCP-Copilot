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
    name: "Siddharth Verma",
    role: "Legal & Compliance Associate",
    department: "Compliance & Governance",
    aspects: ["legal", "compliance"],
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
    department: "",
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
  {
    name: "Tanvi Joshi",
    role: "Reward Operations Lead",
    department: "Vendor & Reward Operations",
    aspects: ["implementation", "accounting"],
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
 * Extract target assignee name from natural language query
 */
export function extractRequestedAssigneeName(query: string): string | null {
  const match =
    query.match(/(?:assign|reassign|give|hand\s*over)\s+(?:all\s+)?(?:[\w&/\s]+\s+)?to\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i) ||
    query.match(/(?:make|set)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:the\s+)?(?:owner|assignee|lead)/i) ||
    query.match(/(?:owner|assignee)\s*(?:to|=)\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);

  if (match && match[1]) {
    const raw = match[1].trim();
    const lowerRaw = raw.toLowerCase();
    const blacklist = ["legal", "compliance", "accounting", "tech", "implementation", "all", "the", "me", "him", "her", "them", "task", "tasks", "stream", "workstream"];
    if (!blacklist.includes(lowerRaw)) {
      return raw;
    }
  }
  return null;
}

/**
 * Match a target team member from natural language query
 */
export function findTeamMember(query: string): TeamMember | null {
  const q = query.toLowerCase();

  // Explicit name matches
  if (q.includes("akash") || q.includes("aakash")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("akash")) || null;
  }
  if (q.includes("prashant")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("prashant")) || null;
  }
  if (q.includes("kavita")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("kavita")) || null;
  }
  if (q.includes("siddharth")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("siddharth")) || null;
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
  if (q.includes("tanvi")) {
    return BIGCITY_TEAM.find((m) => m.name.toLowerCase().includes("tanvi")) || null;
  }

  // Generic check across team directory
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
    const strategicAdditions: Omit<AspectTask, "id" | "sopCode" | "zohoCrmTaskId" | "zohoTaskStatus">[] = [
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
          zohoCrmTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
          zohoCrmTaskStatus: "Open",
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

  // 2. TASK ADDITION INTENT CHECK: E.g., "add a legal task...", "we need a task to...", "create compliance milestone..."
  const isAddIntent =
    !isImprovementIntent &&
    ((/\b(add|create|include|insert|need|set\s+up|make|put)\b/i.test(lower) &&
      /\b(task|requirement|item|action|milestone|gate|check|audit|review)\b/i.test(lower)) ||
      /^(?:please\s+|can\s+you\s+|kindly\s+|hey\s+|copilot\s+)?(?:add|create|include|insert|set\s+up)\s+/i.test(lower));

  // 3. REASSIGNMENT: E.g., "assign all legal tasks to Akash Verma" or "assign legal to Akash"
  const isReassignIntent =
    !isAddIntent &&
    (lower.includes("assign") ||
      lower.includes("reassign") ||
      lower.includes("make owner") ||
      lower.includes("set owner") ||
      lower.includes("give to") ||
      lower.includes("hand over"));

  if (isReassignIntent) {
    const requestedName = extractRequestedAssigneeName(input);
    const targetMember = findTeamMember(input);

    // If a specific person's name was requested but that person does NOT exist in the directory:
    if (requestedName && !targetMember) {
      const availableList = BIGCITY_TEAM.map((m) => `**${m.name}** (${m.role})`).join("\n* ");
      return {
        hasModifications: false,
        updatedTasks: tasks,
        updatedCampaignData: updatedCampaign,
        modifiedTaskIds: [],
        summaryMarkdown: `⚠️ **User Not Found in Team Directory**\n\nNo team member named **"${requestedName}"** was found in the BigCity organization directory. Task assignments were not modified.\n\n**Available Team Members:**\n* ${availableList}\n\n*To assign tasks to ${requestedName}, please invite them via the **Users & Roles** tab first.*`,
        actionType: "none",
      };
    }

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

    // If no target member found and no requested name either, check if assigning to default aspect lead
    let finalTarget = targetMember;
    if (!finalTarget && targetAspect) {
      finalTarget =
        targetAspect === "legal"
          ? BIGCITY_TEAM[0]
          : targetAspect === "compliance"
          ? BIGCITY_TEAM[4]
          : targetAspect === "accounting"
          ? BIGCITY_TEAM[6]
          : BIGCITY_TEAM[5];
    }

    if (finalTarget) {
      const targetAssigneeName = finalTarget.name;
      const targetRole = finalTarget.role;

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
        // Bulk aspect reassignment
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
      } else {
        // General match: reassign tasks matching targetMember's primary aspects
        let count = 0;
        tasks = tasks.map((t) => {
          if (finalTarget!.aspects.includes(t.aspect)) {
            count++;
            modifiedTaskIds.push(t.id);
            return {
              ...t,
              assignee: finalTarget!.name,
              role: finalTarget!.role,
            };
          }
          return t;
        });
        if (count > 0) {
          changesSummary.push(
            `• Reassigned **${count} matching tasks** to **${finalTarget.name}** (${finalTarget.role})`
          );
          actionType = actionType === "none" ? "reassign" : "multiple";
        }
      }
    }
  }

  // 2.5 TASK RENAMING / TITLE EDITING: E.g., "rename task 1 to XYZ", "change task 2 name to...", "update title of task 3 to..."
  const isRenameIntent =
    lower.includes("rename") ||
    lower.includes("change name") ||
    lower.includes("change title") ||
    lower.includes("update name") ||
    lower.includes("update title") ||
    lower.includes("set name of task") ||
    lower.includes("set title of task");

  if (isRenameIntent) {
    const taskIndexMatch = lower.match(/task\s*(?:#|no\.?|number)?\s*(\d+)/i);
    const specificIndex = taskIndexMatch ? parseInt(taskIndexMatch[1], 10) - 1 : null;

    const titleMatch =
      input.match(/(?:to|as|=)\s*["']?([^"'\n]+?)["']?$/i) ||
      input.match(/(?:rename|title|name)\s*(?:task\s*\d+\s*)?(?:to|as|=)\s*["']?([^"'\n]+?)["']?$/i);

    if (specificIndex !== null && specificIndex >= 0 && specificIndex < tasks.length && titleMatch && titleMatch[1]) {
      const cleanNewTitle = titleMatch[1].trim().replace(/^["']|["']$/g, "");
      if (cleanNewTitle.length > 2) {
        tasks[specificIndex] = {
          ...tasks[specificIndex],
          title: cleanNewTitle,
        };
        modifiedTaskIds.push(tasks[specificIndex].id);
        changesSummary.push(
          `• **${tasks[specificIndex].sopCode}**: Renamed task to **"${cleanNewTitle}"**`
        );
        actionType = actionType === "none" ? "update_metadata" : "multiple";
      }
    }
  }

  // 3. TAT / DEADLINE MODIFICATIONS: E.g., "change legal tasks TAT to 1 day", "set task 2 TAT to 3 days", "change duration to 4 days"
  const isTatIntent =
    lower.includes("tat") ||
    lower.includes("deadline") ||
    lower.includes("timeline") ||
    lower.includes("turnaround") ||
    lower.includes("working days") ||
    lower.includes("working day") ||
    lower.includes("duration") ||
    lower.includes("days") ||
    lower.includes("day");

  if (isTatIntent && !isRenameIntent) {
    const daysMatch =
      lower.match(/(?:to|=|\s)\s*(\d+)\s*(?:working\s*)?(?:day|days|d\b|h|hours|hr|hrs)/i) ||
      lower.match(/(\d+)\s*(?:working\s*)?(?:day|days|d\b|h|hours|hr|hrs)/i);
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
  if (isAddIntent) {
    let aspect: "legal" | "compliance" | "accounting" | "implementation" = "implementation";
    if (/legal|t&c|terms|nda|consent|lawyer|advocate|contract|trademark|ipr|agreement/i.test(lower)) {
      aspect = "legal";
    } else if (/compliance|trai|dlt|audit|uat|staging|soak|telecom|regulatory|kyc|pan/i.test(lower)) {
      aspect = "compliance";
    } else if (/accounting|finance|escrow|invoice|deposit|payment|reconciliation|tax|gst|voucher|po\b/i.test(lower)) {
      aspect = "accounting";
    } else if (/tech|implementation|ops|gateway|otp|server|cloud|api|webhook|database|sms|karix|gupshup|qr/i.test(lower)) {
      aspect = "implementation";
    }

    const defaultMember =
      aspect === "legal"
        ? BIGCITY_TEAM[0]
        : aspect === "compliance"
        ? BIGCITY_TEAM[4]
        : aspect === "accounting"
        ? BIGCITY_TEAM[6]
        : BIGCITY_TEAM[5];

    const specifiedMember = findTeamMember(input);
    const assignedMember = specifiedMember || defaultMember;

    // Extract title cleanly
    let title = "";
    const quoteMatch = input.match(/["'`]([^"'`\n]+)["'`]/);
    if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length > 1) {
      title = quoteMatch[1].trim();
    } else {
      title = input
        .replace(/^(?:please\s+|can\s+you\s+|kindly\s+|hey\s+|copilot\s+)?(?:i\s+need|we\s+need|need|add|create|include|insert|set\s+up|make|put)\s+(?:a\s+|an\s+|the\s+|new\s+)*(?:legal|compliance|accounting|tech|implementation|operations|ops)?\s*(?:task|requirement|item|action|milestone|gate|check)?\s*(?:called|named|titled|with\s+title|with\s+name|for|to|of|as|saying|:)?\s*/i, "")
        .trim();
    }

    // Clean up any stray quotes, leading/trailing punctuation, TAT phrases, and assignment clauses iteratively
    let prev = "";
    while (prev !== title) {
      prev = title;
      title = title
        .replace(/\s+with\s+\d+\s*(?:day|days|working\s*days?|hours?|hrs?|h)\s*(?:tat|deadline|turnaround)?$/i, "")
        .replace(/\s+(?:tat|deadline|turnaround)\s*(?:of|is|:)?\s*\d+\s*(?:day|days|working\s*days?|hours?|hrs?|h)$/i, "")
        .replace(/\s+assigned\s+to\s+[A-Za-z\s]+$/i, "")
        .replace(/^["'`:\-\s]+|["'`.\-\s]+$/g, "")
        .replace(/^(called|named|titled|with title|with name)\s+/i, "")
        .trim();
    }

    const genericWords = ["task", "legal", "compliance", "accounting", "tech", "new task", "requirement"];
    if (!title || title.length < 3 || genericWords.includes(title.toLowerCase())) {
      title = `Custom ${aspect.toUpperCase()} Requirement`;
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    if (title.length > 80) {
      title = title.slice(0, 80) + "…";
    }

    const aspectTaskCount = tasks.filter((t) => t.aspect === aspect).length + 1;
    const sopCode = `SOP-${aspect.slice(0, 3).toUpperCase()}-0${aspectTaskCount}`;
    const newTaskId = `task-${Date.now()}`;

    const newTask: AspectTask = {
      id: newTaskId,
      sopCode,
      title,
      aspect,
      assignee: assignedMember.name,
      role: assignedMember.role,
      urgency: lower.includes("urgent") || lower.includes("critical") ? "HIGHEST" : "HIGH",
      tat: lower.includes("24h") || lower.includes("1 day") ? "1 Day" : lower.includes("3 day") ? "3 Days" : "2 Days",
      status: "PENDING_APPROVAL",
      zohoCrmTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
      zohoCrmTaskStatus: "Open",
      details: input,
      verificationRequirement: `${assignedMember.role} sign-off required prior to Go-Live`,
      mandatoryGate: true,
    };

    tasks.push(newTask);
    modifiedTaskIds.push(newTaskId);
    changesSummary.push(
      `• Added new **[${aspect.toUpperCase()}]** task: **${sopCode} — ${title}** (Owner: **${assignedMember.name}**, TAT: **${newTask.tat}**)`
    );
    actionType = actionType === "none" ? "add_task" : "multiple";
  }

  // 7. CAMPAIGN LEVEL FIELD MODIFICATIONS: Name, Budget, Invoice Amount, Volume, Client
  const isNameChange =
    (lower.includes("rename") ||
     lower.includes("change name") ||
     lower.includes("change campaign name") ||
     lower.includes("set name") ||
     lower.includes("update name")) &&
    (lower.includes("to") || lower.includes("as") || lower.includes("="));

  if (isNameChange) {
    const nameMatch =
      input.match(/(?:rename(?:\s+campaign)?(?:\s+name)?|change(?:\s+the)?(?:\s+campaign)?\s+name|set(?:\s+the)?(?:\s+campaign)?\s+name|update(?:\s+the)?(?:\s+campaign)?\s+name)\s+(?:of\s+[\w\s\u20b9₹-]+\s+)?(?:to|as|=|is)\s+["']?([^"'\n.]+?)["']?$/i) ||
      input.match(/(?:rename|change\s+name|update\s+name)\s+(?:to|as)\s+["']?([^"'\n]+?)["']?$/i);
    if (nameMatch && nameMatch[1]) {
      const oldName = updatedCampaign.name;
      const newName = nameMatch[1].trim();
      if (newName && newName.length >= 3) {
        updatedCampaign.name = newName;
        changesSummary.push(`• Renamed Campaign from **"${oldName}"** to **"${newName}"**`);
        actionType = actionType === "none" ? "update_metadata" : "multiple";

        // Update task descriptions/titles if they reference old name
        tasks.forEach((t) => {
          if (oldName && t.title.includes(oldName)) {
            t.title = t.title.replace(oldName, newName);
          }
          if (oldName && t.details && t.details.includes(oldName)) {
            t.details = t.details.replace(oldName, newName);
          }
        });
      }
    }
  }

  const isBudgetOrInvoiceChange =
    (lower.includes("budget") || lower.includes("invoice") || lower.includes("amount") || lower.includes("escrow")) &&
    (lower.includes("change") ||
     lower.includes("set") ||
     lower.includes("update") ||
     lower.includes("to") ||
     lower.includes("make") ||
     lower.includes("increase") ||
     lower.includes("decrease") ||
     lower.includes("lakh") ||
     lower.includes("cr") ||
     lower.includes("₹") ||
     lower.includes("inr"));

  if (isBudgetOrInvoiceChange) {
    const budgetMatch = input.match(/(?:to|as|=|is|\b)\s*(?:₹|inr|rs\.?)?\s*([0-9,.]+)\s*(lakhs?|lac|cr|crore|k|m)?/i);
    if (budgetMatch) {
      const numRaw = budgetMatch[1].replace(/,/g, "");
      const unit = (budgetMatch[2] || "").toLowerCase();
      let numericVal = parseFloat(numRaw);
      if (!isNaN(numericVal)) {
        if (unit.startsWith("lakh") || unit.startsWith("lac")) {
          numericVal = numericVal * 100000;
        } else if (unit.startsWith("cr")) {
          numericVal = numericVal * 10000000;
        } else if (unit === "k") {
          numericVal = numericVal * 1000;
        } else if (unit === "m") {
          numericVal = numericVal * 1000000;
        }

        updatedCampaign.budget = `₹${numericVal.toLocaleString("en-IN")}`;
        updatedCampaign.amount = numericVal;
        changesSummary.push(`• Updated Campaign Budget & Invoice Amount to **${updatedCampaign.budget}**`);
        actionType = actionType === "none" ? "update_metadata" : "multiple";
      }
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
    summaryMarkdown = `I've updated the campaign plan for **${updatedCampaign.name || "this campaign"}**:\n\n${changesSummary.join("\n")}\n\n*All changes are reflected live on the right canvas.*`;
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

        const member = findTeamMember(trimmed);

        if (existingIdx >= 0) {
          if (member && member.name !== tasks[existingIdx].assignee && trimmed.includes(member.name.split(" ")[0])) {
            tasks[existingIdx] = {
              ...tasks[existingIdx],
              assignee: member.name,
              role: member.role,
            };
            modifiedIds.push(tasks[existingIdx].id);
          }
        } else {
          const fallbackMember = member || (
            aspect === "legal"
              ? BIGCITY_TEAM[0]
              : aspect === "compliance"
              ? BIGCITY_TEAM[4]
              : aspect === "accounting"
              ? BIGCITY_TEAM[6]
              : BIGCITY_TEAM[5]
          );
          const sopCode = sopMatch ? sopMatch[0].toUpperCase() : `SOP-${aspect.slice(0, 3).toUpperCase()}-0${tasks.filter((t) => t.aspect === aspect).length + 1}`;
          const newId = `task-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const newTask: AspectTask = {
            id: newId,
            sopCode,
            title: title.slice(0, 65),
            aspect,
            assignee: fallbackMember.name,
            role: fallbackMember.role,
            urgency: /highest|critical|urgent/i.test(trimmed) ? "HIGHEST" : /medium/i.test(trimmed) ? "MEDIUM" : "HIGH",
            tat: /1\s*day|24h/i.test(trimmed) ? "1 Day" : /3\s*day/i.test(trimmed) ? "3 Days" : "2 Days",
            status: "PENDING_APPROVAL",
            zohoCrmTaskId: `ZP-T-${Math.floor(100000 + Math.random() * 900000)}`,
            zohoCrmTaskStatus: "Open",
            details: trimmed,
            verificationRequirement: `${fallbackMember.role} sign-off required prior to Go-Live`,
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
