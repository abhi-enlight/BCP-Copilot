# ⚙️ n8n Workflow Blueprints & Node Specifications

This guide details the **4 Core n8n Workflows** required to implement **BCP Assist**. Each blueprint includes trigger types, nodes, and tool connections.

---

## 🌟 Workflow 1: The "Campaign Brain" & Ideation Copilot

### Objective
Provide campaign managers with instant campaign briefs, historical precedents, and creative/mechanic ideation via chat.

### Node Architecture
```
[Chat Trigger Node]
       │
       ▼
[AI Agent Node (LangChain)] ◄─── [Claude 3.7 Sonnet / Gemini Model Node]
       │                    ◄─── [Window Buffer Memory Node]
       ├──► [Tool 1: Supabase Vector Retriever (Historical SOPs & Post-Mortems)]
       ├──► [Tool 2: Zoho CRM Node (Fetch Client & Deal Context)]
       └──► [Tool 3: Zoho Books Node (Fetch Budget & Financial Caps)]
       │
       ▼
[Structured Response Formatter Node]
```

### System Prompt for AI Agent Node
```markdown
You are BCP Assist, the Senior AI Campaign Expert & Client Success Manager.
Your role is to help campaign managers plan, execute, monitor, and ideate on campaigns.

Always structure your responses using the SOW Decision Framework:
- Context: Brief campaign background.
- Evidence: Supporting facts from the Knowledge Base, Zoho CRM, or Books.
- Risk: Potential bottlenecks, past UAT issues, or compliance risks.
- Recommendation: Concrete, actionable next steps.
- Action, Owner & Timeline: Clear ownership.

Explicitly tag items with:
[Confirmed Information] | [Historical Precedent] | [Recommendation] | [Assumption] | [Pending Confirmation] | [Risk]

STRICT SAFETY RULE: Never approve legal terms, finance budgets, or mechanical changes autonomously.
```

---

## 🌟 Workflow 2: Passive Task Ingestion (WhatsApp, Teams, Gmail)

### Objective
Listen to read-only communication channels, extract actionable items, and automatically create tasks in **Zoho Projects**.

### Node Architecture
```
[Webhook Trigger (WhatsApp / Teams)] OR [Gmail Trigger (New Email)]
       │
       ▼
[AI Information Extractor Node (Gemini 2.0 Flash)]
  - Schema: { task_title, description, assignee, priority, due_date, project_name }
       │
       ▼
[Policy Guard Node (If / Switch)]
  - Checks if task requires human approval (e.g. Legal / Financial sign-off)
       │
       ├──[Safe Task]────► [Zoho Projects Node: POST /tasks] ──► [Log in Supabase: action_items]
       │
       └──[High Risk]────► [Set status: PENDING_HUMAN_SIGN_OFF] ──► [Alert Manager via Email/Chat]
```

---

## 🌟 Workflow 3: Proactive Daily Risk & Deadline Nudge Engine

### Objective
Proactively scan ongoing campaigns every morning, detect pending milestones or budget deviations, and nudge team members.

### Node Architecture
```
[Schedule Trigger Node (Cron: 0 9 * * 1-5)] -- Runs at 9:00 AM on weekdays
       │
       ▼
[Zoho Projects Node: Fetch Active Projects & Tasks due in next 48h]
       │
       ▼
[Zoho Books Node: Fetch Current Invoices & Spent Amounts]
       │
       ▼
[AI Analysis Node (Claude 3.7 Sonnet)]
  - Identifies: overdue tasks, pending client approvals, unassigned dependencies
       │
       ▼
[Filter: Are there any critical risks?]
       │
       ├──[Yes]──► [Generate Daily Risk Digest] ──► [Send Email / Slack / Teams Notification]
       └──[No]───► [Log "All Clear" in agent_audit_logs]
```

---

## 🌟 Workflow 4: Smart Client Email Drafter

### Objective
Read incoming client requests in Gmail, search SOPs for approved answers, and create ready-to-send drafts in Gmail.

### Node Architecture
```
[Gmail Trigger (New Incoming Email with Label/Subject)]
       │
       ▼
[Supabase Vector Store: Search Approved Communication SOP & Templates]
       │
       ▼
[AI Drafter Node (Claude 3.7 Sonnet)]
  - Drafts a professional, context-rich response matching BigCity communication tone
       │
       ▼
[Gmail Node: 'Create Draft'] (DOES NOT SEND)
       │
       ▼
[Notification Node: Ping Account Manager that Draft is ready for review]
```
