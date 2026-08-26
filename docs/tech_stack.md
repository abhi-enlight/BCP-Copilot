# 🏗️ BCP Assist: Technical Stack & Architecture Specification

---

## 🎯 Architecture Diagram

```mermaid
flowchart TD
    subgraph Inputs["📡 Inbound Channels"]
        A1["💬 WhatsApp / MS Teams Webhook"]
        A2["🖥️ Hosted Webchat Interface"]
        A3["⏰ 9:00 AM Scheduled Cron"]
        A4["✉️ Incoming Gmail Trigger"]
    end

    subgraph n8n["⚙️ n8n Workflow Automation Engine (Port 5678)"]
        W1["Workflow 1: Campaign Brain Copilot\n(LangChain Agent + Gemini 2.5 Flash)"]
        W2["Workflow 2: Passive Task Extractor\n(JSON Structure Parser + SOW Policy Guard)"]
        W3["Workflow 3: Proactive Daily Risk Scanner\n(72h UAT & Budget Evaluation)"]
        W4["Workflow 4: Smart Client Email Drafter\n(SOP Template Matcher + Gmail Drafts)"]
    end

    subgraph Storage["🧠 Shared Persistent Memory (Supabase pgvector)"]
        S1[("public.documents\n(BigCity SOPs & Case Studies)")]
        S2[("public.campaigns\n(Live Projects & Budgets)")]
        S3[("public.action_items\n(Task Staging & Status)")]
        S4[("public.agent_audit_logs\n(Guardrail Verifications)")]
    end

    subgraph External["🏢 Production SaaS APIs"]
        Z1["📌 Zoho Projects (Tasks & Milestones)"]
        Z2["📊 Zoho CRM (Deals & Briefs)"]
        Z3["💰 Zoho Books (Invoices & Spend)"]
        Z4["📬 Gmail Drafts (Human Sign-off)"]
    end

    A1 --> W2
    A2 --> W1
    A3 --> W3
    A4 --> W4

    W1 <--> S1
    W1 <--> S2

    W2 --> S3
    W2 --> S4
    W2 --> Z1

    W3 <--> S2
    W3 <--> S3
    W3 --> Z2

    W4 <--> S1
    W4 --> Z4
```

---

## 🔒 Policy Guardrail & SOW Compliance Flow

```mermaid
flowchart TD
    Task["Extracted Campaign Action"] --> Decision{"🛡️ Requires Human Approval?\n(Legal, Budget, or Mechanics Change)"}

    Decision -->|False: Safe Operational Task| Safe["✅ ALLOWED\n- Queue for Zoho Projects\n- Log status as ACTION_QUEUED_FOR_ZOHO"]
    Decision -->|True: High-Risk Exception| Block["⚠️ PENDING_HUMAN_SIGN_OFF\n- Block automated execution\n- Send priority escalation alert\n- Await Human Manager approval"]
```

---

## ⚡ High-Volume Speed & Token Efficiency Pipeline

```mermaid
flowchart TD
    UserQuery["User Prompt: Plan Festive FMCG Cashback Campaign"] --> Step1

    subgraph Step1["1. SQL Metadata Pre-Filtering (0 Tokens / 10ms)"]
        A["Filter: metadata->>'industry' = 'FMCG'\nShrinks 10,000 campaigns down to 20 candidate docs"]
    end

    subgraph Step2["2. Cosine Similarity Vector Ranking"]
        B["pgvector Ranks & Selects Top 3 Most Relevant Precedent Chunks"]
    end

    subgraph Step3["3. High-Signal Context Injection"]
        C["Injects ~1,200 tokens into Gemini 2.5 Flash instead of 500,000 words\nCuts latency to ~3s and token cost by 95%"]
    end

    Step1 --> Step2 --> Step3
```
