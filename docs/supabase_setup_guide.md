# 🗄️ Supabase Setup & Vector Database Guide

This guide walks you step-by-step through setting up **Supabase** as the persistent memory and vector database (`pgvector`) for BCP Assist.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **"New Project"**.
3. Fill in the project details:
   * **Name**: `bcp-assist-knowledge-base`
   * **Database Password**: Choose a strong password and save it securely.
   * **Region**: Choose a region close to your team (e.g. `ap-south-1` for Mumbai / India).
4. Click **"Create new project"** (takes ~1-2 minutes to provision).

---

## 2. Execute the Database Schema

1. In your Supabase Dashboard, click on the **"SQL Editor"** icon on the left navigation bar.
2. Click **"New Query"**.
3. Open the file **[`/Users/abhi/Desktop/n8n/supabase_schema.sql`](file:///Users/abhi/Desktop/n8n/supabase_schema.sql)** in your editor.
4. Copy the entire SQL script and paste it into the Supabase SQL Editor.
5. Click **"Run"** (or press `Cmd + Enter`).
6. You should see a success message: `Success. No rows returned`.

### What was created:
* `vector` extension enabled for AI embeddings.
* `documents` table with HNSW vector index for high-speed similarity search.
* `match_documents()` RPC function for n8n's Supabase Vector Store node.
* `campaigns` table for tracking active and historical campaigns.
* `campaign_learnings` table for institutional memory (post-mortems, UAT lessons).
* `action_items` table for extracted tasks from WhatsApp, Teams, and Gmail.
* `agent_audit_logs` table for tracking AI decisions and human approval gates.

---

## 3. Retrieve Your API Credentials

1. In your Supabase Dashboard, go to **Project Settings** (gear icon at the bottom left) → **API**.
2. Copy the following keys:
   * **Project URL**: `https://xxxxxxxxxxxxxxxx.supabase.co`
   * **`anon` `public` key**: Used for standard queries.
   * **`service_role` `secret` key**: Used by n8n backend for vector operations.
3. Open **[`/Users/abhi/Desktop/n8n/.env`](file:///Users/abhi/Desktop/n8n/.env)** and paste your keys:
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh......
   SUPABASE_ANON_KEY=eyJh......
   ```

---

## 4. Connecting Supabase in n8n

### Option A: Using the Native Supabase Vector Store Node
1. In n8n (`http://localhost:5678`), open your workflow canvas.
2. Add the **Supabase Vector Store** node.
3. Click **Credential to connect with** → **Create New Credential**.
4. Set:
   * **Host**: `db.xxxxxxxxxxxx.supabase.co` (Found under Supabase Settings → Database)
   * **Database**: `postgres`
   * **User**: `postgres`
   * **Password**: Your Supabase database password
   * **Port**: `5432` (or `6543` for connection pooling)
   * **Table Name**: `documents`
   * **Query Name**: `match_documents`
5. Connect an **Embeddings OpenAI** or **Embeddings Google Gemini** node to it.

---

## 5. Seeding Initial Knowledge & SOPs

To upload your existing campaign SOPs, delivery templates, and case studies:
1. You can upload documents directly using an n8n ingestion workflow (Read File → Text Splitter → Embeddings → Supabase Vector Store).
2. Or insert rows directly into `public.documents` with their corresponding embeddings.
