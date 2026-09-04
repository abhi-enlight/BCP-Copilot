# 📘 BCP Assist: Master Architecture & Executive Project Handbook

> **Project Name**: BCP Assist (AI Campaign Expert & Client Success Manager)  
> **Client / Organization**: BigCity Promotions  
> **Tech Stack**: n8n (Orchestration) + Supabase (`pgvector` & PostgreSQL) + Google Gemini (LLM & Embeddings) + Zoho Suite + Google Workspace  
> **Version**: 1.0 (Production Blueprint)

---

## 📑 Table of Contents
1. [What is the Project?](#1-what-is-the-project)
2. [Why Do We Need It? (The Real-World Problem)](#2-why-do-we-need-it-the-real-world-problem)
3. [How Have We Solved It? (The Solution Architecture)](#3-how-have-we-solved-it-the-solution-architecture)
4. [Where Does It Get Its Data From? (Data Sources & Ecosystem)](#4-where-does-it-get-its-data-from-data-sources--ecosystem)
5. [Why is Supabase Needed? (And Why Zoho Alone Isn't Enough)](#5-why-is-supabase-needed-and-why-zoho-alone-isnt-enough)
6. [Why 4 Modular Workflows Instead of 1 Giant Workflow?](#6-why-4-modular-workflows-instead-of-1-giant-workflow)
7. [Where Do Users Chat & Interact? (User Touchpoints)](#7-where-do-users-chat--interact-user-touchpoints)
8. [How is n8n Hosted? (Tunnels Today vs. Production Tomorrow)](#8-how-is-n8n-hosted-tunnels-today-vs-production-tomorrow)
9. [How Does n8n Connect to Zoho CRM, Books, Invoices & Projects?](#9-how-does-n8n-connect-to-zoho-crm-books-invoices--projects)
10. [Handling Years of Historical Zoho Data (The Backfill / ETL Process)](#10-handling-years-of-historical-zoho-data-the-backfill--etl-process)
11. [Speed & Token Efficiency with High-Volume Data (Architecture of Scale)](#11-speed--token-efficiency-with-high-volume-data-architecture-of-scale)
12. [Safety Boundaries & Human-in-the-Loop Policy Guardrails](#12-safety-boundaries--human-in-the-loop-policy-guardrails)

---

## 1. What is the Project?

**BCP Assist** is an enterprise AI execution layer and campaign copilot designed specifically for **BigCity Promotions**. 

It acts as an **always-on Senior Campaign Operations Director and Client Success Manager**. It sits in the middle of your daily business tools—reading campaign briefs, monitoring team chats, tracking milestone deadlines, checking client budgets, and drafting communications. 

It does not replace human managers; instead, it empowers every department (Sales, Client Servicing, Tech, Operations, Legal, Finance) with **instant institutional memory, automated task logging, and proactive risk detection**.

---

## 2. Why Do We Need It? (The Real-World Problem)

Running high-stakes sales promotions (such as *100k on-pack QR code cashbacks, Scratch & Win contests, and Brand Loyalty programs*) is complex and fast-paced. Agencies and promotional marketing teams face 4 systemic bottlenecks:

```mermaid
flowchart LR
    subgraph Traditional["🔴 Without BCP Assist: Reactive Bottlenecks"]
        direction TB
        P1["1. Scattered Data\n(Briefs in CRM, chats in WhatsApp, tasks in Projects)"]
        P2["2. Lost Memory\n(Past outage learnings leave with employees)"]
        P3["3. Firefighting\n(Deadlines & missing T&C caught 24h before launch)"]
        P4["4. Manual Drudgery\n(Hours spent transcribing chats into Zoho)"]
    end

    subgraph Solved["🟢 With BCP Assist: Proactive Execution"]
        direction TB
        S1["1. Single Knowledge Plane\n(Unified across Zoho, Gmail & WhatsApp)"]
        S2["2. Permanent Vector Brain\n(100% past campaign precedents stored)"]
        S3["3. Morning Risk Scanner\n(72h UAT & budget alerts at 9 AM daily)"]
        S4["4. Auto Ingestion & Drafts\n(Instant task logging & Gmail draft QA)"]
    end

    Traditional ==> Solved
```

**BCP Assist shifts the organization from reactive firefighting to proactive, intelligence-led execution.**

---

## 3. How Have We Solved It? (The Solution Architecture)

We built an event-driven AI ecosystem combining **n8n**, **Supabase (`pgvector`)**, **Google Gemini**, and a strict **Human-in-the-Loop Policy Gatekeeper**:

```mermaid
flowchart TD
    subgraph Channels["📡 1. Live Input Channels"]
        C1["💬 WhatsApp / MS Teams Chats"]
        C2["🖥️ Hosted Webchat Interface"]
        C3["⏰ Scheduled 9:00 AM Cron"]
        C4["✉️ Incoming Gmail Inbox"]
    end

    subgraph n8nLayer["⚙️ 2. n8n Intelligent Orchestration Layer"]
        WF1["Workflow 1: Campaign Brain & Copilot\n(Gemini 2.5 Flash + Supabase RAG)"]
        WF2["Workflow 2: Passive Task Extractor\n(JSON Parser + SOW Policy Gatekeeper)"]
        WF3["Workflow 3: Proactive Daily Risk Scanner\n(72h UAT Gate + Budget Drift Check)"]
        WF4["Workflow 4: Smart Client Email Drafter\n(SOP Template Matcher + Gmail Drafts)"]
    end

    subgraph Memory["🧠 3. Supabase Long-Term Memory"]
        DB1[("public.documents\n(BigCity SOPs & Case Studies)")]
        DB2[("public.campaigns\n(Live Projects & Budgets)")]
        DB3[("public.action_items\n(Task Staging & Deadlines)")]
        DB4[("public.agent_audit_logs\n(Guardrail Verifications)")]
    end

    subgraph Execution["🎯 4. Production Task Execution"]
        E1["📝 Zoho Projects API\n(Task Auto-Creation)"]
        E2["🚨 Slack / Teams Alerts\n(Morning Risk Digests)"]
        E3["📬 Gmail Drafts\n(Human Review & Send)"]
    end

    C1 --> WF2
    C2 --> WF1
    C3 --> WF3
    C4 --> WF4

    WF1 <--> DB1
    WF1 <--> DB2

    WF2 --> DB3
    WF2 --> DB4
    WF2 --> E1

    WF3 <--> DB2
    WF3 <--> DB3
    WF3 --> E2

    WF4 <--> DB1
    WF4 --> E3
```

1. **Listen**: Passive listeners ingest communication from WhatsApp, Teams, Gmail, and Zoho.
2. **Remember**: Supabase retrieves matching SOPs, task templates, and historical campaign debriefs using semantic vector search.
3. **Reason**: Google Gemini (`gemini-2.5-flash`) extracts structured entities, evaluates risks, and formulates strategies.
4. **Guard**: An automated policy node checks if actions involve Legal, Financial, or Mechanics changes.
5. **Act**: Creates tasks in Zoho Projects, alerts managers on high-risk bottlenecks, and queues ready-to-send drafts in Gmail.

---

## 4. Where Does It Get Its Data From?

BCP Assist ingests data from 6 connected pillars:

```mermaid
flowchart LR
    subgraph DataPillars["Connected Data Sources"]
        D1["💬 WhatsApp & Teams\n(Read-Only Chatter)"]
        D2["✉️ Gmail Workspace\n(Client Updates & Feedback)"]
        D3["📊 Zoho CRM\n(Deals, Briefs & Timelines)"]
        D4["💰 Zoho Books\n(Budgets, Invoices & Spend)"]
        D5["📌 Zoho Projects\n(Milestones & Task Status)"]
        D6["📄 BigCity Excel SOPs\n(30+ Standard Task Matrices)"]
    end

    subgraph Agent["🤖 BCP Assist Unified Brain"]
        Central["n8n Orchestrator + Supabase pgvector"]
    end

    D1 --> Central
    D2 --> Central
    D3 --> Central
    D4 --> Central
    D5 --> Central
    D6 --> Central
```

---

## 5. Why is Supabase Needed? (And Why Zoho Alone Isn't Enough)

Zoho is an **operational transactional database**—it stores rows of active tasks and contact forms. It **cannot** perform AI semantic search or store unstructured institutional memory.

```mermaid
flowchart TD
    subgraph Query["User Asks: How did we handle OTP delays in FMCG 2024?"]
        Q["Prompt"]
    end

    subgraph ZohoLimitation["❌ Zoho Alone"]
        Z1["Keyword Search in Projects/CRM"]
        Z2["Fails: No semantic understanding\nCannot search historical debriefs"]
    end

    subgraph SupabasePower["✅ Supabase pgvector"]
        S1["Cosine Vector Similarity Search"]
        S2["Finds 2024 FMCG precedent in 15ms\nExtracts dual-gateway solution"]
    end

    Q --> ZohoLimitation
    Q --> SupabasePower
```

**Supabase is the "Long-Term Brain" that connects past experience with live Zoho execution.**

---

## 6. Why 4 Modular Workflows Instead of 1 Giant Workflow?

In production workflow engineering, building a single monolithic workflow is an anti-pattern. We use a **Microservice Workflow Architecture**:

```mermaid
flowchart TD
    subgraph Monolith["❌ Monolithic Single Workflow (Anti-pattern)"]
        M["[Chat + Webhooks + 9 AM Cron + Gmail]\nSingle point of failure: 1 error crashes all features."]
    end

    subgraph Microservices["✅ 4 Modular Microservice Workflows (Production-Grade)"]
        W1["WF 1: Campaign Copilot\n(Runs on-demand for human chat)"]
        W2["WF 2: Task Extractor\n(Runs event-driven on incoming webhooks)"]
        W3["WF 3: Daily Risk Scanner\n(Runs schedule-driven at 9 AM weekdays)"]
        W4["WF 4: Smart Email Drafter\n(Runs inbox-driven on client emails)"]
    end

    Monolith -.->|Replaced By| Microservices
```

---

## 7. Where Do Users Chat & Interact?

```mermaid
flowchart 
    subgraph UserInterface["Where Users Connect"]
        U1["💻 Hosted Webchat UI\n(http://localhost:5678/workflow/...)"]
        U2["🌐 Embedded Intranet Widget\n(1-line script for BigCity Portal)"]
        U3["📱 Slack & MS Teams\n(Automated Daily Digests & Alert Bots)"]
    end

    subgraph Engine["BCP Assist AI"]
        Core["n8n + Gemini 2.5 Flash"]
    end

    U1 <--> Core
    U2 <--> Core
    Core --> U3
```

---

## 8. How is n8n Hosted? (Tunnels Today vs. Production Tomorrow)

```mermaid
flowchart TD
    subgraph Dev["🧪 Phase 1: Local Development (Active Today)"]
        L1["Local Docker Compose (Port 5678)"] <--> L2["Cloudflare Secure Tunnel / ngrok"] <--> L3["Inbound Webhooks (WhatsApp / Teams)"]
    end

    subgraph Prod["🚀 Phase 2: Production Deployment (Tomorrow)"]
        P1["Cloud VPS (AWS EC2 / DigitalOcean)"] <--> P2["Nginx Reverse Proxy (SSL HTTPS)"] <--> P3["Static Domain (n8n.bigcity.in)"]
    end

    Dev -.->|Identical Docker Compose| Prod
```

---

## 9. How Does n8n Connect to Zoho CRM, Books, Invoices & Projects?

n8n communicates with Zoho through the official **Zoho REST APIs** using **OAuth 2.0 (Server-based Application)**:

```mermaid
sequenceDiagram
    autonumber
    participant n8n as n8n Core Engine
    participant ZohoAuth as Zoho Accounts (OAuth2)
    participant ZohoAPI as Zoho Projects / CRM / Books

    n8n->>ZohoAuth: Send Client ID + Secret + Refresh Token
    ZohoAuth-->>n8n: Return fresh Access Token (valid for 1 hour)
    n8n->>ZohoAPI: GET /restapi/projects/ or POST /tasks/ with Bearer Token
    ZohoAPI-->>n8n: Return live Campaign Deals, Invoices & Milestones
```

---

## 10. Handling Years of Historical Zoho Data (The Backfill / ETL Process)

```mermaid
flowchart TD
    subgraph Step1["1. Batch Extraction (ETL)"]
        A["Zoho CRM / Projects API\n(Paged in 100 records/batch)"]
    end

    subgraph Step2["2. Data Structuring"]
        B["Clean JSON noise & extract:\nClient, Industry, Mechanics, Issues, Resolution"]
    end

    subgraph Step3["3. Embedding & Indexing"]
        C["Gemini text-embedding-004\n(500-token chunks)"]
    end

    subgraph Step4["4. Supabase Knowledge Base"]
        D[("public.documents\n& public.campaigns")]
    end

    A --> B --> C --> D
```

---

## 11. Speed & Token Efficiency with High-Volume Data

```mermaid
flowchart TD
    Q["User Prompt: Plan Festive FMCG Cashback campaign"] --> F1

    subgraph Step1["⚡ Step 1: SQL Metadata Pre-Filter (0 Tokens / 10ms)"]
        F1["Filter: industry = 'FMCG' AND category = 'Cashback'\nShrinks 10,000 campaigns down to 20 candidates"]
    end

    subgraph Step2["🎯 Step 2: pgvector Cosine Similarity Ranking"]
        F2["Selects ONLY the Top 3 most relevant precedent chunks"]
    end

    subgraph Step3["💡 Step 3: Minimal Context Injection to Gemini"]
        F3["Passes ~1,200 high-signal tokens instead of 500,000 words\nCuts API costs by 95% and latency to 3 seconds"]
    end

    F1 --> F2 --> F3
```

---

## 12. Safety Boundaries & Human-in-the-Loop Policy Guardrails

Per Section 7 of the SOW, AI is strictly forbidden from making autonomous financial or legal commitments:

```mermaid
flowchart TD
    In["Extracted Task / Communication"] --> Gate{"🛡️ SOW Policy Gatekeeper\n(Requires Human Approval?)"}

    Gate -->|No: Standard Operational Task| Safe["✅ ALLOWED\n- Auto-create Zoho Projects task\n- Log status in action_items"]
    Gate -->|Yes: Legal / Budget / Scope Override| Block["⚠️ PENDING_HUMAN_SIGN_OFF\n- Block automated execution\n- Send escalation alert to Manager\n- Require human click to approve"]
```

* ❌ **AI Never Sends Emails Autonomously**: Only creates Gmail drafts.
* ❌ **AI Never Overrides Budgets**: Flags financial deviations to Finance / Prashant Mittal.
* ❌ **AI Never Signs Off on Legal T&C**: Routes legal clauses to CS Heads / Legal SPOC.

---

### 🏁 Summary

BCP Assist is an **enterprise-grade, memory-backed AI execution engine**. It connects the dots between your team's conversations, historical experience, and Zoho task execution—giving BigCity Promotions an unfair operational advantage in speed, consistency, and client satisfaction.
