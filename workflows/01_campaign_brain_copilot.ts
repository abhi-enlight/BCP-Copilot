import { workflow, trigger, node, languageModel, memory, tool, embeddings, newCredential } from '@n8n/workflow-sdk';

const chatTrigger = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.4,
  config: {
    name: 'Chat Trigger',
    parameters: {
      public: true,
      mode: 'hostedChat',
      options: {
        title: 'BCP Assist: Campaign Brain',
        subtitle: 'AI Campaign Expert & Client Success Manager (Powered by Google Gemini & Full Zoho Suite)',
        inputPlaceholder: 'Ask about a campaign brief, historical precedent, live Zoho deals, invoices, or pending tasks...',
        responseMode: 'streaming'
      }
    }
  }
});

const geminiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.1,
  config: {
    name: 'Google Gemini Model',
    parameters: {
      modelName: 'models/gemini-2.5-flash',
      options: {
        temperature: 0.3
      }
    },
    credentials: {
      googlePalmApi: newCredential('Google Gemini(PaLM) Api')
    }
  }
});

const memoryBuffer = memory({
  type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
  version: 1.4,
  config: {
    name: 'Memory Buffer',
    parameters: {
      sessionIdType: 'fromInput',
      contextWindowLength: 10
    }
  }
});

const geminiEmbeddings = embeddings({
  type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
  version: 1,
  config: {
    name: 'Gemini Embeddings',
    parameters: {
      modelName: 'models/gemini-embedding-001'
    },
    credentials: {
      googlePalmApi: newCredential('Google Gemini(PaLM) Api')
    }
  }
});

const supabaseKnowledgeBase = tool({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: {
    name: 'Campaign Knowledge Base',
    parameters: {
      mode: 'retrieve-as-tool',
      toolDescription: 'Search BigCity historical campaign case studies, past UAT issues, client learnings, and campaign execution SOPs from Supabase.',
      tableName: {
        __rl: true,
        mode: 'id',
        value: 'documents'
      },
      topK: 5,
      options: {
        queryName: 'match_documents'
      }
    },
    credentials: {
      supabaseApi: newCredential('Supabase')
    },
    subnodes: {
      embedding: geminiEmbeddings
    }
  }
});

const zohoCrmDealsTool = tool({
  type: 'n8n-nodes-base.zohoCrmTool',
  version: 1,
  config: {
    name: 'Zoho CRM Deals & Campaigns',
    parameters: {
      resource: 'deal',
      operation: 'getAll',
      limit: 3
    },
    credentials: {
      zohoOAuth2Api: newCredential('Zoho account')
    }
  }
});

const zohoCrmInvoicesTool = tool({
  type: 'n8n-nodes-base.zohoCrmTool',
  version: 1,
  config: {
    name: 'Zoho CRM Invoices',
    parameters: {
      resource: 'invoice',
      operation: 'getAll',
      limit: 3
    },
    credentials: {
      zohoOAuth2Api: newCredential('Zoho account')
    }
  }
});

const zohoCrmAccountsTool = tool({
  type: 'n8n-nodes-base.zohoCrmTool',
  version: 1,
  config: {
    name: 'Zoho CRM Client Accounts',
    parameters: {
      resource: 'account',
      operation: 'getAll',
      limit: 3
    },
    credentials: {
      zohoOAuth2Api: newCredential('Zoho account')
    }
  }
});

const pendingTasksTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolCode',
  version: 1.3,
  config: {
    name: 'Pending Tasks & SOP Action Items',
    parameters: {
      name: 'get_pending_tasks',
      description: 'Retrieve pending campaign execution tasks, SOP milestones, SPOC assignees (Sachin, Khaleel, CS Heads, Prashant), urgency levels, and Zoho task IDs.',
      language: 'javaScript',
      jsCode: `
return JSON.stringify([
  {
    "task_id": "1418411000000553001",
    "task_name": "[SOP Task 01] Dual-Gateway Karix / Gupshup Failover Setup",
    "assignee": "Sachin (Tech Team)",
    "urgency": "HIGHEST",
    "status": "PENDING / IN_PROGRESS",
    "due_date": "2026-08-28",
    "details": "Configure secondary SMS/WhatsApp gateway routes for high-traffic TV ad spikes before launch."
  },
  {
    "task_id": "1418411000000553002",
    "task_name": "[SOP Task 02] 200k Cryptographic QR Code Batch Export",
    "assignee": "Khaleel (Ops)",
    "urgency": "HIGH",
    "status": "PENDING_INPUT",
    "due_date": "2026-08-27",
    "details": "Generate 200,000 unique cryptographic alphanumeric codes and verify packaging printer bleed margin."
  },
  {
    "task_id": "1418411000000553003",
    "task_name": "[SOP Task 03] Swiggy / Zomato Brand Logo Written Approvals",
    "assignee": "Prashant Mittal",
    "urgency": "HIGHEST",
    "status": "PENDING_APPROVAL",
    "due_date": "2026-08-29",
    "details": "Obtain formal partner consent email before on-pack sticker printing run. Mandatory compliance gate."
  },
  {
    "task_id": "1418411000000553004",
    "task_name": "[SOP Task 04] 100% Advance Payment Verification for EGV Pool",
    "assignee": "CS Heads",
    "urgency": "NORMAL",
    "status": "COMPLETED",
    "due_date": "2026-08-28",
    "details": "Ensure 100% advance client payment confirmation in Zoho Books before issuing PO to Amazon EGV team."
  },
  {
    "task_id": "1418411000000553005",
    "task_name": "[SOP Task 05] 72-Hour Pre-Launch Staging UAT Sign-Off",
    "assignee": "Sachin (Tech Team)",
    "urgency": "HIGH",
    "status": "PENDING_SIGN_OFF",
    "due_date": "2026-08-29",
    "details": "Run end-to-end 50-number test batch across iOS, Android, and mobile web. Sign off 72h prior to Go-Live."
  }
]);
`
    }
  }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'BCP Assist AI Agent',
    parameters: {
      promptType: 'auto',
      options: {
        systemMessage: `You are BCP Assist, the Senior AI Campaign Expert & Client Success Manager for BigCity Promotions.
Your mission is to help campaign managers plan, execute, monitor, and audit marketing campaigns (Cashbacks, Scratch & Win, Contests, Loyalty, Vouchers).

Core Responsibilities:
1. Understand campaign requirements from connected systems, Zoho CRM (Deals, Invoices, Client Accounts), Pending Tasks & Action Items, and the Knowledge Base.
2. Query live commercial Deals, Invoices, Client Accounts, and Pending Tasks using the available tools.
3. Search historical campaigns using the Campaign Knowledge Base tool.
4. Proactively identify pending tasks, missing information, invoice payment bottlenecks, open dependencies, and potential risks (e.g. OTP bottlenecks, UAT lead time, vendor delays).
5. Provide structured, actionable recommendations.

Decision & Recommendation Format:
- Context: Brief campaign, invoice, or task background.
- Evidence: Historical precedents, live task/invoice details, or SOP rules found.
- Risk: Potential delays, failure points, or compliance concerns.
- Recommendation: Concrete, actionable next steps.
- Action -> Owner -> Timeline: Clear accountability.

Explicitly label segments with:
[Confirmed Information] | [Historical Precedent] | [Recommendation] | [Assumption] | [Pending Confirmation] | [Risk]

SAFETY BOUNDARIES (Human Sign-Off Required):
You must NEVER autonomously approve legal terms, invoice payment waivers, or changes in campaign mechanics. Explicitly flag these with [PENDING_HUMAN_SIGN_OFF].`
      }
    },
    subnodes: {
      model: geminiModel,
      memory: memoryBuffer,
      tools: [supabaseKnowledgeBase, zohoCrmDealsTool, zohoCrmInvoicesTool, zohoCrmAccountsTool, pendingTasksTool]
    }
  }
});

export default workflow('bcp-assist-copilot', 'BCP Assist - Campaign Brain & Copilot (Gemini & Full Zoho Suite)')
  .add(chatTrigger)
  .to(aiAgent);
